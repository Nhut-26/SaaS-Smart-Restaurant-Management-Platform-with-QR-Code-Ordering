import json
import re
import asyncio
import time
import uuid
import ast
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor

class FoodChatAgent:
    def __init__(self, groq_client, supabase_client):
        self.client = groq_client 
        self.supabase = supabase_client
        self.executor = ThreadPoolExecutor(max_workers=20) 

        # --- NLU PROMPT CHUẨN ĐỒNG BỘ VỚI FRONTEND ---
        self.nlu_system_prompt = """
        ROLE: Bạn là AI NLU xử lý đặt bàn nhà hàng.
        NHIỆM VỤ: Phân tích input và trả về JSON.
        
        QUY TẮC QUAN TRỌNG:
        - Nếu user nói "Xem quán [Tên]", intent là "SELECT_RESTAURANT".
        - Nếu user nói "Tôi chọn [Tên bàn]", intent là "SELECT_TABLE".
        - Nếu user cung cấp thông tin (ngày, giờ, sđt...), intent là "BOOKING".
        
        OUTPUT JSON:
        {
            "intent": "BOOKING" | "RECOMMEND" | "SUPPORT" | "CONFIRM_BOOKING" | "SELECT_RESTAURANT" | "SELECT_TABLE",
            "entities": {
                "time": "HH:MM", "date": "YYYY-MM-DD", "people": int,
                "phone": string, "name": string, 
                "restaurant_name": string,
                "selected_table": string
            }
        }
        """
    
    # --- HELPER: TÌM TABLE_ID TỪ TÊN BÀN ---
    def _find_table_id(self, restaurant_id, table_name_input):
        try:
            # Tìm trong bảng tables xem có bàn nào tên giống vậy thuộc quán này không
            response = self.supabase.table("tables")\
                .select("id, name")\
                .eq("restaurant_id", restaurant_id)\
                .ilike("name", table_name_input.strip())\
                .execute()
            
            if response.data:
                return response.data[0]['id'] # Trả về UUID thật (vd: "abc-123-...")
            return None
        except Exception as e:
            print(f"Error finding table ID: {e}")
            return None

    # --- HELPER 1: TÌM QUÁN TRONG DB (REAL DATA) ---
    def _search_restaurant(self, text):
        try:
            # Query Supabase: Lấy id, name, address, image_url, price_range
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
            # Lấy 5 quán đầu tiên để hiển thị lên List
            response = self.supabase.table("restaurants").select("*").limit(5).execute()
            return response.data if response.data else []
        except: return []

    # --- HELPER 3: LẤY BÀN THẬT TỪ DB (REAL DATA - QUAN TRỌNG) ---
    def _get_real_tables(self, restaurant_id):
        try:
            # Chỉ lấy những bàn thuộc về quán này và đang available
            response = self.supabase.table("tables")\
                .select("id, table_name ")\
                .eq("restaurant_id", restaurant_id)\
                .eq("status", "available")\
                .execute()
            
            return response.data if response.data else [] 
        except Exception as e:
            print(f"🔥 Error Fetching Tables: {e}")
            return []

   # --- 4. LƯU ĐƠN VÀO DB (Đã gộp ngày giờ) ---
    def _save_booking_to_db(self, user_id, rest_id, table_name_text, info):
        try:
            real_table_id = self._find_table_id(rest_id, table_name_text)

            # 1. Xử lý giờ: Đảm bảo format HH:MM:00
            clean_time = info['time']
            if len(clean_time) == 5: # Nếu là "19:30"
                clean_time += ":00"  # Thành "19:30:00"

            # 2. Xử lý ngày: Đảm bảo format YYYY-MM-DD
            clean_date = info['date'] 

            # 3. Gộp thành chuỗi Timestamp ISO 8601 có múi giờ Việt Nam (+07:00)
            # Kết quả sẽ là: "2023-10-30T19:30:00+07:00"
            final_timestamp = f"{clean_date}T{clean_time}+07:00"

            data = {
                "user_id": str(user_id),
                "restaurant_id": str(rest_id),
                "table_id": real_table_id,
                "booking_time": final_timestamp, # Cột mới gộp
                "people_count": int(info['people']) if info['people'] else 2,
                "customer_name": info['name'],
                "phone": info['phone']
            }
            
            print(f"📝 Lưu dữ liệu đặt bàn đến DB: {data}")
            
            self.supabase.table("bookings").insert(data).execute()
            print(f"🔄 Đang cập nhật trạng thái bàn {real_table_id} thành 'đã đặt'...")
            self.supabase.table("tables")\
                .update({"status": "occupied"})\
                .eq("id", real_table_id)\
                .execute()

            return True
            return True
        except Exception as e:
            print(f"🔥 Error Saving Booking: {e}")
            return False

    # ---------------------------------------------------------
    # 🚀 LOGIC LUỒNG ĐẶT BÀN (STATE MACHINE)
    # ---------------------------------------------------------
    def _execute_booking_flow(self, user_id, intent_data, memory, current_rest_id):
        entities = intent_data.get("entities", {})
        
        # 1. CẬP NHẬT MEMORY TỪ INPUT MỚI NHẤT
        if entities.get("date"): memory.update_state(user_id, "booking_date", entities["date"])
        if entities.get("time"): memory.update_state(user_id, "booking_time", entities["time"])
        if entities.get("people"): memory.update_state(user_id, "people_count", entities["people"])
        if entities.get("phone"): memory.update_state(user_id, "phone", entities["phone"])
        if entities.get("name"): memory.update_state(user_id, "customer_name", entities["name"])
        
        # 2. BẮT BUỘC PHẢI CÓ QUÁN TRƯỚC
        active_rest_id = current_rest_id or memory.get_state(user_id, "booking_restaurant_id")
        
        if not active_rest_id:
            # Chưa có quán -> Trả về List gợi ý
            return {
                "intent": "RECOMMEND",
                "reply": "Bạn chưa chọn quán. Hãy xem danh sách quán ngon dưới đây:",
                "custom_type": "restaurant_suggest", # Frontend sẽ vẽ List ngang
                "data": self._get_suggestions()
            }
        
        # Lưu quán vào bộ nhớ
        memory.update_state(user_id, "booking_restaurant_id", active_rest_id)

        # 3. KIỂM TRA FORM THÔNG TIN (Ngày, Giờ, SĐT)
        info = {
            "date": memory.get_state(user_id, "booking_date"),
            "time": memory.get_state(user_id, "booking_time"),
            "people": memory.get_state(user_id, "people_count"),
            "phone": memory.get_state(user_id, "phone"),
            "name": memory.get_state(user_id, "customer_name")
        }

        # Nếu thiếu 1 trong 3 cái chính -> Hiện Form điền
        if not (info["date"] and info["time"] and info["phone"]):
            return {
                "intent": "BOOKING_FORM",
                "reply": "Mình đã ghi nhận quán. Vui lòng điền nốt thông tin đặt bàn:",
                "custom_type": "booking_form", # Frontend sẽ vẽ Form
                "pre_fill": info
            }

        # 4. CHỌN BÀN (Lấy từ DB thật)
        selected_table_name = entities.get("selected_table") or memory.get_state(user_id, "selected_table")
        
        if not selected_table_name :
            # Lấy danh sách bàn từ bảng 'tables'
            real_tables_data = self._get_real_tables(active_rest_id)
            
            if not real_tables_data:
                return {
                    "intent": "SUPPORT",
                    "reply": "Quán này hiện chưa cập nhật danh sách bàn trống. Liên hệ hotline nhé!",
                    "custom_type": None,
                    "data": []
                }
            table_names_only = [t['table_name'] for t in real_tables_data]
            return {
                "intent": "SELECT_TABLE",
                "reply": "Thông tin ok. Mời bạn chọn vị trí bàn:",
                "custom_type": "table_selection", # Frontend sẽ vẽ Grid chọn bàn
                "data": table_names_only
            }
        
        # Lưu bàn đã chọn
        memory.update_state(user_id, "selected_table", selected_table_name)

        # 5. LƯU ĐƠN VÀO DB (CHỐT)
        is_saved = self._save_booking_to_db(user_id, active_rest_id,selected_table_name, info)
        
        if is_saved:
            memory.clear_state(user_id) # Xóa nhớ sau khi xong
            return {
                "intent": "CONFIRM_BOOKING",
                "reply": f"✅ Đặt bàn THÀNH CÔNG!\nQuán: {active_rest_id}\nBàn: {selected_table_name}\nThời gian: {info['time']} - {info['date']}",
                "custom_type": None,
                "data": None
            }
        else:
            return {"intent": "SUPPORT", "reply": "Lỗi hệ thống khi lưu đơn. Vui lòng thử lại sau."}

    # ---------------------------------------------------------
    # 🚀 MAIN HANDLER (ĐIỀU PHỐI)
    # ---------------------------------------------------------
    async def handle_message(self, user_id, message, lat, lng, current_screen, restaurant_id, memory):
        print(f"📩 User: {message}")

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
            table_id = message.replace("Tôi chọn", "").strip()
            # Gọi lại flow với entity bàn đã chọn -> Tự động nhảy xuống bước Lưu DB
            return self._execute_booking_flow(user_id, {"entities": {"selected_table": table_id}}, memory, restaurant_id)

        # --- GỌI AI NLU (NẾU KHÔNG PHẢI LỆNH CỨNG) ---
        try:
            chat_completion = self.client.chat.completions.create(
                messages=[
                    {"role": "system", "content": self.nlu_system_prompt},
                    {"role": "user", "content": message}
                ],
                model="llama-3.3-70b-versatile",
                response_format={"type": "json_object"},
                temperature=0
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
        
        elif intent == "RECOMMEND":
            return {
                "intent": "RECOMMEND",
                "reply": "Dưới đây là một số quán ngon đề xuất cho bạn:",
                "custom_type": "restaurant_suggest",
                "data": self._get_suggestions()
            }
        
        else:
            # SUPPORT / CHITCHAT
            try:
                chat = self.client.chat.completions.create(
                    messages=[{"role": "system", "content": "Bạn là trợ lý ảo vui vẻ."}, {"role": "user", "content": message}],
                    model="llama-3.3-70b-versatile"
                )
                return {"reply": chat.choices[0].message.content, "intent": "SUPPORT"}
            except:
                return {"reply": "Mình chưa hiểu ý bạn lắm.", "intent": "SUPPORT"}