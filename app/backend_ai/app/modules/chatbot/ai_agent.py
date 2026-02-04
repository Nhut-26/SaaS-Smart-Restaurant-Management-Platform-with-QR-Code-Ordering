import json
import re
import asyncio
import time
import uuid
import ast
import requests
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor
from app.modules.recommendation.engine import RecommendationEngine

class FoodChatAgent:
    def __init__(self, groq_client, supabase_client):
        self.client = groq_client 
        self.supabase = supabase_client
        self.executor = ThreadPoolExecutor(max_workers=20) 
        self.weather_api_key = "a5bcf56a395da987b94e87d54c98017b"
        self.engine = RecommendationEngine(supabase_client)

        # --- NLU PROMPT CHUẨN ĐỒNG BỘ VỚI FRONTEND ---
        self.nlu_system_prompt = """
        ROLE: Bạn là AI NLU xử lý đặt bàn nhà hàng.
        NHIỆM VỤ: Phân tích input tiếng Việt và trả về JSON thuần (Raw JSON).
        
        QUY TẮC PHÂN LOẠI INTENT:
        1. "RECOMMEND": Khi user hỏi về món ăn, tìm quán, hỏi "ăn gì", "ở đâu ngon", "gợi ý", "thèm...", "hot", "trend", "view đẹp", hoặc than thở (đói, buồn, mưa...).
        2. "SELECT_RESTAURANT": Khi user nói "Xem quán [Tên]", "Chọn quán [Tên]".
        3. "BOOKING": Khi user đưa thông tin đặt bàn (giờ, ngày, số người, tên, sđt).
        4. "SUPPORT": Các câu hỏi khác hoặc chào hỏi xã giao.

        QUY TẮC TRÍCH XUẤT (ENTITIES):
        - food_name: Tên món ăn hoặc loại hình (lẩu, nướng, sushi, cafe).
        - time, date, people, phone, name: Thông tin đặt bàn.
        - criteria: Tiêu chí tìm kiếm (VD: "hot", "rẻ", "view đẹp", "yên tĩnh", "gần đây", "mới mở").
        - mood_reply: Một câu trả lời ngắn (dưới 15 từ), giọng điệu thân thiện, empathy (đồng cảm) với khách, phù hợp ngữ cảnh thời tiết hoặc cảm xúc khách.
        
        VÍ DỤ MẪU (BẮT BUỘC HỌC THEO):
        - User: "Hôm nay ăn gì ngon?" -> {"intent": "RECOMMEND", "entities": {"food_name": "món ngon"}}
        - User: "Thèm lẩu quá" -> {"intent": "RECOMMEND", "entities": {"food_name": "Lẩu"}}
        - User: "Tìm quán sushi gần đây" -> {"intent": "RECOMMEND", "entities": {"food_name": "Sushi"}}
        - User: "Đặt bàn 2 người lúc 7h tối" -> {"intent": "BOOKING", "entities": {"people": 2, "time": "19:00"}}
        - User: "Tìm quán nào đang hot rần rần đi" -> {"intent": "RECOMMEND", "entities": {"food_name": null, "criteria": "hot trend", "mood_reply": "Bắt trend ngay! Đây là mấy quán đang cực hot trên mạng xã hội:"}}
        
        - User: "Thèm lẩu thái chua cay quá" -> {"intent": "RECOMMEND", "entities": {"food_name": "Lẩu thái", "criteria": "chua cay", "mood_reply": "Nghe là thèm rồi! Làm nồi lẩu thái chua cay là chuẩn bài."}}
        OUTPUT FORMAT: Chỉ trả về JSON, không kèm Markdown, không kèm giải thích.
        """

    def _get_weather(self, lat, lng):
        try:
            if not lat or not lng: return "Bình thường", 28
            url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lng}&appid={self.weather_api_key}&units=metric&lang=vi"
            res = requests.get(url, timeout=2).json()
            return res['weather'][0]['description'], res['main']['temp']
        except: return "Mát mẻ", 27


    # --- HELPER: LẤY GÓI AI PLAN CỦA NHÀ HÀNG ---
    def _get_ai_config(self, restaurant_id):
        default_config = {"plan": "basic", "delay": 5, "model": "llama-3.3-70b-versatile"}
        
        if not restaurant_id:
            return default_config

        try:
            # 1. Từ Restaurant ID -> Lấy Tenant -> Lấy ai_plan
            # Lưu ý: Cú pháp select nested của Supabase
            response = self.supabase.table("restaurants")\
                .select("tenants(ai_plan)")\
                .eq("id", restaurant_id)\
                .single()\
                .execute()
            
            # 2. Parse dữ liệu
            if response.data and response.data.get('tenants'):
                plan = response.data['tenants'].get('ai_plan', 'basic') # Mặc định basic nếu null
                
                # 3. Cấu hình theo yêu cầu của bạn
                if plan == 'pro': # GPT 3 - Nhanh nhất
                    return {"plan": "pro", "delay": 0, "model": "llama-3.3-70b-versatile"}
                
                elif plan == 'plus': # GPT 2 - Nhanh (2.5s)
                    return {"plan": "plus", "delay": 2.5, "model": "llama-3.3-70b-versatile"}
                
                else: # basic hoặc free - GPT 1 - Chậm (5s)
                    return {"plan": "basic", "delay": 5, "model": "llama-3.3-70b-versatile"} 
                    # Mẹo: Gói thấp dùng model 8b (nhẹ hơn/kém thông minh hơn xíu) để phân cấp rõ hơn
            
            return default_config
            
        except Exception as e:
            print(f"⚠️ Lỗi lấy AI Plan: {e}")
            return default_config

    # --- HELPER: LẤY MÓN BESTSELLER TỪ TABLE MENUS ---
    def _get_bestseller_menus(self):
        try:
            # Truy vấn bảng menus, lọc các món là bestseller
            # Nếu DB chưa có cột 'is_bestseller', bạn có thể bỏ .eq() và chỉ dùng .limit(5)
            response = self.supabase.table("menus")\
                .select("*, restaurants(name)")\
                .eq("is_best_seller", True)\
                .limit(10)\
                .execute()
            
            if response.data:
                return response.data
            return []
        except Exception as e:
            print(f"❌ [ERR] Lỗi lấy menu:: {e}")
            return []
    
    # --- HELPER: TÌM TABLE_ID TỪ TÊN BÀN ---
    def _find_table_id(self, restaurant_id, table_arg):
        # table_arg: Là cái tên bàn dạng chữ (VD: "Bàn 1", "VIP 2")
        try:
            # Lấy tất cả bàn trống của quán
            response = self.supabase.table("tables")\
                .select("*")\
                .eq("restaurant_id", restaurant_id)\
                .eq("status", "available")\
                .execute()
            
            tables = response.data if response.data else []
            target_name = str(table_arg).lower().strip()
            
            for t in tables:
                # Lấy tên bàn từ DB (Kiểm tra cả 2 trường hợp tên cột)
                t_name =  t.get('table_name') 
                
                # So sánh: Nếu tên khách nhập nằm trong tên bàn DB
                if target_name in str(t_name).lower():
                    return t['id'] # ✅ Trả về UUID
            
            return None # ❌ Không tìm thấy
        except Exception as e:
            print(f"Error finding table ID: {e}")
            return None

    # --- HELPER 1: TÌM QUÁN TRONG DB (REAL DATA) ---
    def _search_restaurant(self, text):
        try:
            response = self.supabase.table("restaurants")\
                .select("id, name, address, image_url, price_range")\
                .ilike("name", f"%{text}%")\
                .execute()
            if response.data and len(response.data) > 0:
                return response.data[0]
            return None
        except Exception as e:
            print(f"🔥 Error Searching Restaurant: {e}")
            return None

    # --- HELPER 2: LẤY LIST GỢI Ý (REAL DATA) ---
    def _get_suggestions(self):
        try:
            response = self.supabase.table("restaurants").select("*").execute()
            if response.data:
                return response.data
            else:
                return []
        except Exception as e:
            print(f"❌ [ERR] Lỗi khi lấy gợi ý: {e}")
            return []

    # --- HELPER 3: LẤY BÀN THẬT TỪ DB (REAL DATA - QUAN TRỌNG) ---
    def _get_real_tables(self, restaurant_id):
        try:
            # Chỉ lấy những bàn thuộc về quán này và đang available
            # Lưu ý: Cột tên bàn trong DB của bạn có thể là 'name' hoặc 'table_name', hãy kiểm tra
            # Dưới đây giả sử cột tên là 'name' dựa trên ảnh DB, nếu là 'table_name' hãy sửa lại
            response = self.supabase.table("tables")\
                .select("id, table_name")\
                .eq("restaurant_id", restaurant_id)\
                .eq("status", "available")\
                .execute()
            
            return response.data if response.data else [] 
        except Exception as e:
            print(f"🔥 Error Fetching Tables: {e}")
            return []

   # --- 4. LƯU ĐƠN VÀO DB (Đã gộp ngày giờ & CHECK TABLE_ID) ---
    def _save_booking_to_db(self, user_id, rest_id, table_name_text, info):
        try:

            print(f"DEBUG SAVE: Rest={rest_id}, TableName={table_name_text}")

            # 1. KIỂM TRA ID RỖNG
            if not user_id or str(user_id) == "None":
                print("❌ Lỗi: User ID thiếu.")
                return False
            if not rest_id or str(rest_id) == "None":
                print("❌ Lỗi: Restaurant ID thiếu.")
                return False

            # [QUAN TRỌNG] Tìm ID bàn thật trước khi lưu
            real_table_id = self._find_table_id(rest_id, table_name_text)

            # [FIX] Nếu không có ID bàn -> Báo lỗi ngay, không cố lưu
            if not real_table_id:
                print(f"❌ Không tìm thấy table_id cho tên bàn: {table_name_text}")
                return False

            # 1. Xử lý giờ
            # Giả sử time_part từ AI là "12:00"
            time_clean = info['time'].strip()

            # Kiểm tra nếu chỉ có Giờ:Phút thì thêm :00 giây, nếu đã có giây thì giữ nguyên
            if len(time_clean.split(':')) == 2:
                time_with_seconds = f"{time_clean}:00"
            elif len(time_clean.split(':')) == 3:
                time_with_seconds = time_clean
            else:
                # Trường hợp format lạ (như 12:00:00:00) thì chỉ lấy 3 phần đầu
                parts = time_clean.split(':')
                time_with_seconds = f"{parts[0]}:{parts[1]}:{parts[2]}"

            # 2. Xử lý ngày
            date_part  = info['date']
            d, m, y = date_part.split('/')
            standard_date = f"{y}-{m.zfill(2)}-{d.zfill(2)}"
            clean_date = standard_date

            # 3. Gộp timestamp
            final_timestamp = f"{clean_date}T{time_clean}:00+07"

            data = {
                "user_id": str(user_id),
                "restaurant_id": str(rest_id),
                "table_id": str(real_table_id),
                "status": "pending",
                "booking_time": final_timestamp,
                "people_count": int(info['people']) if info['people'] else 2,
                "customer_name": info['name'],
                "phone": info['phone']
            }
            
            print(f"📝 Lưu dữ liệu đặt bàn đến DB: {data}")
            
            self.supabase.table("bookings").insert(data).execute()
            
            # Update trạng thái bàn
            self.supabase.table("tables")\
                .update({"status": "occupied"})\
                .eq("id", real_table_id)\
                .execute()

            return True
            
        except Exception as e:
            print(f"🔥 Error Saving Booking: {e}")
            return False

    # ---------------------------------------------------------
    # 🚀 LOGIC LUỒNG ĐẶT BÀN (STATE MACHINE)
    # ---------------------------------------------------------
    def _execute_booking_flow(self, user_id, intent_data, memory, current_rest_id):
        entities = intent_data.get("entities", {})
        
        # 1. CẬP NHẬT MEMORY
        if entities.get("date"): memory.update_state(user_id, "booking_date", entities["date"])
        if entities.get("time"): memory.update_state(user_id, "booking_time", entities["time"])
        if entities.get("people"): memory.update_state(user_id, "people_count", entities["people"])
        if entities.get("phone"): memory.update_state(user_id, "phone", entities["phone"])
        if entities.get("name"): memory.update_state(user_id, "customer_name", entities["name"])
        
        # 2. BẮT BUỘC PHẢI CÓ QUÁN TRƯỚC
        active_rest_id = current_rest_id or memory.get_state(user_id, "booking_restaurant_id")
        # Lấy Restaurant ID hiện tại từ bộ nhớ/intent
        restaurant_id = active_rest_id 

        # TRUY VẤN TÊN NHÀ HÀNG TỪ ID
        restaurant_name = "Nhà hàng" # Mặc định
        try:
            res_info = self.supabase.table("restaurants")\
                .select("name")\
                .eq("id", restaurant_id)\
                .single()\
                .execute()
            if res_info.data:
                restaurant_name = res_info.data['name']
        except Exception as e:
            print(f"⚠️ Không lấy được tên nhà hàng: {e}")
        
        if not active_rest_id:
            list_quan_goi_y = self._get_suggestions()
            return {
                "intent": "RECOMMEND",
                "reply": "Bạn chưa chọn quán. Hãy xem danh sách quán ngon dưới đây:",
                "custom_type": "restaurant_suggest",
                "data": list_quan_goi_y
            }
        
        memory.update_state(user_id, "booking_restaurant_id", active_rest_id)

        # 3. KIỂM TRA FORM THÔNG TIN
        info = {
            "date": memory.get_state(user_id, "booking_date"),
            "time": memory.get_state(user_id, "booking_time"),
            "people": memory.get_state(user_id, "people_count"),
            "phone": memory.get_state(user_id, "phone"),
            "name": memory.get_state(user_id, "customer_name")
        }

        if not (info["date"] and info["time"] and info["phone"]):
            return {
                "intent": "BOOKING_FORM",
                "reply": "Mình đã ghi nhận quán. Vui lòng điền nốt thông tin đặt bàn:",
                "custom_type": "booking_form",
                "pre_fill": info
            }

        # 4. CHỌN BÀN (Logic bắt buộc)
        selected_table_name = entities.get("selected_table") or memory.get_state(user_id, "selected_table")
        
        # Nếu chưa có tên bàn, bắt buộc hiện danh sách chọn
        if not selected_table_name:
            real_tables_data = self._get_real_tables(active_rest_id)
            
            if not real_tables_data:
                return {
                    "intent": "SUPPORT",
                    "reply": "Tiếc quá, quán này hiện không còn bàn trống vào giờ này.",
                    "custom_type": None,
                    "data": []
                }
            # Lấy list tên bàn để hiển thị
            table_names_only = [t['table_name'] for t in real_tables_data] if real_tables_data else []
            return {
                "intent": "SELECT_TABLE",
                "reply": "Thông tin ok. Mời bạn chọn vị trí bàn:",
                "custom_type": "table_selection",
                "data": table_names_only
            }
        
        # 5. LƯU ĐƠN VÀO DB (CHỐT)
        # Tại đây selected_table_name đã có, ta gọi hàm save
        # Hàm save sẽ tự tìm ID, nếu không thấy ID nó sẽ trả về False
        is_saved = self._save_booking_to_db(user_id, active_rest_id, selected_table_name, info)
        
        if is_saved:
            memory.clear_state(user_id) # Xóa nhớ sau khi xong
            return {
                "intent": "CONFIRM_BOOKING",
                "reply": f"✅ Đặt bàn THÀNH CÔNG!\nQuán: {restaurant_name}\nBàn: {selected_table_name}\nThời gian: {info['time']} - {info['date']}",
                "custom_type": None,
                "data": None
            }
        else:
            # [FIX] Nếu lưu thất bại (thường do tên bàn sai hoặc không khớp ID)
            # Ta xóa trạng thái bàn đã chọn để bắt user chọn lại đúng cái có trong DB
            memory.update_state(user_id, "selected_table", None) 
            
            # Load lại danh sách bàn
            real_tables_data = self._get_real_tables(active_rest_id)
            table_names_only = [t['table_name'] for t in real_tables_data] if real_tables_data else []
            
            return {
                "intent": "SELECT_TABLE", 
                "reply": "Có lỗi khi xác định bàn hoặc bàn đã bị đặt. Vui lòng chọn lại bàn trong danh sách:",
                "custom_type": "table_selection",
                "data": table_names_only
            }

    # ---------------------------------------------------------
    # 🚀 MAIN HANDLER (ĐIỀU PHỐI)
    # ---------------------------------------------------------
    async def handle_message(self, user_id, message, lat, lng, current_screen, restaurant_id, memory):
        # 1. LẤY CẤU HÌNH GÓI CƯỚC & ÁP DỤNG DELAY
        ai_config = self._get_ai_config(restaurant_id)
        
        print(f"📩 User: {message} | 🏢 RestID: {restaurant_id} | 💎 Plan: {ai_config['plan']} (Delay: {ai_config['delay']}s)")

        # --- ÁP DỤNG ĐỘ TRỄ (Mô phỏng tốc độ đường truyền) ---
        if ai_config['delay'] > 0:
            time.sleep(ai_config['delay'])

        weather_desc, temp = self._get_weather(lat, lng)

        # --- XỬ LÝ LỆNH TỪ FRONTEND (MAPPING TRỰC TIẾP) ---
        
        # 1. Khi user bấm vào thẻ quán -> Gửi "Xem quán [Tên]"
        if message.startswith("Xem quán"):
            rest_name = message.replace("Xem quán", "").strip()
            found_rest = self._search_restaurant(rest_name)
            if found_rest:
                # Lưu ID quán và chuyển ngay sang bước điền Form
                memory.update_state(user_id, "booking_restaurant_id", str(found_rest['id']))
                return {
                    "intent": "BOOKING",
                    "reply": f"Bạn đã chọn {found_rest['name']}. Vui lòng nhập thông tin:",
                    "custom_type": "booking_form",
                    "pre_fill": {}
                }

        # 2. Khi user bấm chọn bàn -> Gửi "Tôi chọn [Tên bàn]"
        if message.startswith("Tôi chọn"):
            table_name = message.replace("Tôi chọn", "").strip()
            # Gọi lại flow với entity bàn đã chọn
            return self._execute_booking_flow(user_id, {"entities": {"selected_table": table_name}}, memory, restaurant_id)

        # --- GỌI AI NLU (NẾU KHÔNG PHẢI LỆNH CỨNG) ---
        try:
            # Context phong phú hơn
            context_prompt = f"""
            THÔNG TIN NGỮ CẢNH:
            - Gói AI đang dùng: {ai_config['plan']} (Hãy trả lời tương xứng với gói này).
            - Thời tiết hiện tại: {weather_desc}, nhiệt độ {temp} độ C.
            - Nếu trời mưa/lạnh: Ưu tiên gợi ý món ấm nóng (lẩu, nướng) trong 'mood_reply'.
            - Nếu trời nóng: Ưu tiên món mát (bia, kem, sushi).
            - Nếu khách hỏi 'hot/trend': Hiểu là các món đang nổi trên TikTok/Review.
            """
            
            chat_completion = self.client.chat.completions.create(
                messages=[
                    {"role": "system", "content": self.nlu_system_prompt + "\n" + context_prompt},
                    {"role": "user", "content": message}
                ],
                model=ai_config['model'], # Model này tốt, giữ nguyên
                response_format={"type": "json_object"},
                temperature=0.1 # Tăng nhẹ temperature để câu trả lời (mood_reply) tự nhiên hơn, bớt robot
            )
            intent_data = json.loads(chat_completion.choices[0].message.content)

            print(f"🤖 AI Intent: {intent_data}")
        except Exception as e:
            print(f"🔥 Error AI: {e}")
            return {"reply": "Hệ thống đang bận, thử lại sau nhé.", "intent": "SUPPORT"}

        intent = intent_data.get("intent", "SUPPORT")
        
        # --- ĐIỀU HƯỚNG ---
        if intent in ["BOOKING", "SELECT_RESTAURANT", "SELECT_TABLE"]:
            return self._execute_booking_flow(user_id, intent_data, memory, restaurant_id)
        
        # ---------------------------------------------------------
        # XỬ LÝ INTENT: RECOMMEND (Gợi ý món/quán)
        # ---------------------------------------------------------
        elif intent == "RECOMMEND":
            entities = intent_data.get("entities", {})
            food_name = entities.get("food_name")
            criteria = str(entities.get("criteria", "")).lower()
            
            # --- 1. BỘ LỌC TỪ KHÓA (ROUTER) ---
            # Từ khóa tìm món HOT/TREND -> Gọi hàm lấy Best Seller
            hot_keywords = ["hot", "trend", "bestseller", "bán chạy", "phổ biến", "ngon nhất", "gợi ý"]
            is_hot_request = any(word in criteria for word in hot_keywords) or \
                             (food_name and any(word in food_name.lower() for word in hot_keywords))

            # Từ khóa tìm QUÁN (Không gian, view, địa điểm) -> Gọi hàm Search Restaurant
            restaurant_keywords = ["quán", "nhà hàng", "chỗ ngồi", "view", "không gian", "địa điểm", "ở đâu"]
            is_restaurant_request = any(word in criteria for word in restaurant_keywords)

            # Khởi tạo biến kết quả
            results = []
            custom_type = "restaurant_suggest" # Mặc định
            reply_msg = ""

            # --- 2. LOGIC ĐIỀU HƯỚNG ---
            
            # CASE A: Khách hỏi món HOT (và không nhắc chữ "quán")
            if is_hot_request and not is_restaurant_request:
                print(f"🔥 [SMART] Routing -> Lấy Menu BestSeller")
                raw_results = self._get_bestseller_menus()
                
                if raw_results:
                    custom_type = "menu_suggest" # 🟢 Frontend sẽ hiện Card Món (Dọc)
                    reply_msg = entities.get("mood_reply") or "Dạ, đây là các món đang 'cháy hàng' bên em ạ:"
                    
                    # Chuẩn hóa dữ liệu từ bảng MENUS
                    for item in raw_results:
                        # Xử lý ảnh an toàn
                        raw_img = item.get("image")
                        final_img = str(raw_img).strip().replace(" ", "%20")
                        
                        results.append({
                            "id": item.get("id"),
                            "name": item.get("food_name"),       # Map 'food_name' -> 'name' cho Frontend
                            "image_url": final_img,              # Key quan trọng nhất
                            "price_range": f"{int(item.get('price', 0)):,}đ",
                            "restaurant_name": item.get("restaurants", {}).get("name") if item.get("restaurants") else "Hệ thống",
                            "restaurant_id": item.get("restaurant_id"),
                            "custom_type": "menu_suggest",
                            "is_dish": True
                        })
                else:
                    # Fallback nếu không có dữ liệu hot
                    reply_msg = "Hiện chưa có dữ liệu món hot, bạn xem thử các quán này nhé:"
                    results = await self.engine.search_restaurants("ngon", lat, lng)

            # CASE B: Khách hỏi MÓN CỤ THỂ (VD: "Bún chả", "Sushi")
            elif food_name and not is_restaurant_request:
                print(f"🍜 [SMART] Routing -> Tìm Món: {food_name}")
                custom_type = "menu_suggest" # 🟢 Frontend sẽ hiện Card Món (Dọc)
                
                search_query = f"{food_name} {criteria}".strip()
                # Gọi engine search_food (Lưu ý: engine cũng cần trả về key 'image_url' đúng)
                results = await self.engine.search_food(search_query, lat, lng)
                
                reply_msg = entities.get("mood_reply") or f"Mình tìm thấy vài chỗ có món {food_name} ngon đây ạ:"

            # CASE C: Khách hỏi QUÁN (VD: "Quán view đẹp", "Chỗ nào yên tĩnh", "Quán ngon")
            else:
                print(f"🏪 [SMART] Routing -> Tìm Quán theo tiêu chí: {criteria}")
                custom_type = "restaurant_suggest" # 🔵 Frontend sẽ hiện Card Quán (Ngang)
                
                # Loại bỏ chữ "quán" để search chính xác hơn
                search_key = (food_name or criteria).replace("quán", "").replace("ăn", "").strip()
                
                # Gọi engine tìm quán
                results = await self.engine.search_restaurants(search_key, lat, lng)
                
                # --- [FIX LOGIC] NẾU TÌM KHÔNG THẤY -> LẤY DANH SÁCH GỢI Ý MẶC ĐỊNH ---
                if not results or len(results) == 0:
                    print("⚠️ Không tìm thấy quán theo tên -> Fallback về gợi ý chung")
                    # Gọi lại search_restaurants với từ khóa rỗng để lấy list quán mặc định
                    results = await self.engine.search_restaurants("ngon", lat, lng)
                    reply_msg = "Hiện mình chưa tìm thấy quán nào tên như vậy, nhưng bạn thử xem mấy quán 'đỉnh' này nhé:"
                else:
                    reply_msg = entities.get("mood_reply") or f"Dưới đây là các quán phù hợp với '{search_key}':"
            # --- 3. FORMAT DỮ LIỆU CUỐI CÙNG (FINAL SYNC) ---
            final_data = []
            if results:
                for item in results:
                    # Copy để không sửa trực tiếp biến gốc
                    new_item = item.copy()
                    
                    # Đồng bộ Key ảnh (Phòng trường hợp engine trả về key khác)
                    if "image" in new_item and "image_url" not in new_item:
                         new_item["image_url"] = new_item["image"]
                    
                    # Đảm bảo ảnh không bao giờ null
                    if not new_item.get("image_url"):
                         new_item["image_url"] = "https://via.placeholder.com/150"
                    
                    # Fix lỗi URL lần cuối
                    if isinstance(new_item["image_url"], str):
                        new_item["image_url"] = new_item["image_url"].replace(" ", "%20")

                    # Xử lý hiển thị khoảng cách (Chỉ cho quán)
                    if custom_type == "restaurant_suggest":
                        raw_dist = new_item.get('dist_km', 0)
                        try: dist = float(raw_dist)
                        except: dist = 0.0
                        
                        # Chỉ cộng chuỗi km nếu chưa có
                        if "(" not in new_item.get('name', ''):
                            new_item['name'] = f"{new_item.get('name')} ({round(dist, 1)}km)"
                    
                    final_data.append(new_item)

            return {
                "intent": "RECOMMEND",
                "reply": reply_msg,
                "custom_type": custom_type,
                "data": final_data
            }
        
        else:
            try:
                chat = self.client.chat.completions.create(
                    messages=[{"role": "system", "content": "Bạn là trợ lý ảo vui vẻ."}, {"role": "user", "content": message}],
                    model="llama-3.3-70b-versatile"
                )
                return {"reply": chat.choices[0].message.content, "intent": "SUPPORT"}
            except:
                return {"reply": "Mình chưa hiểu ý bạn lắm.", "intent": "SUPPORT"}

