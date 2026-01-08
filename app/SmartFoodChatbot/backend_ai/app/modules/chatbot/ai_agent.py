import os
import json
from datetime import datetime
from google.generativeai import GenerativeModel
from app.modules.recommendation.engine import get_smart_recommendations
from app.utils.memory import ChatMemory

class FoodChatAgent:
    def __init__(self, gemini_model: GenerativeModel, supabase_client):
        self.model = gemini_model
        self.supabase = supabase_client

    async def get_restaurant_context(self, restaurant_id=None):
        """
        Truy vấn Supabase để lấy danh sách món ăn bán chạy.
        Nếu có restaurant_id: Lấy của quán đó.
        Nếu không: Lấy đa nhà hàng để gợi ý HomeScreen.
        """
        query = self.supabase.table("menus").select("food_name, price, description, restaurant_id")
    
        # Ưu tiên món bán chạy
        query = query.eq("is_best_seller", True)
    
        if restaurant_id:
            query = query.eq("restaurant_id", restaurant_id)
    
        result = query.limit(5).execute()
    
        if not result.data:
            return "Hiện chưa có món ăn nổi bật."
    
        context = "Danh sách món bán chạy (Best Seller):\n"
        for item in result.data:
            context += f"- {item['food_name']}: {item['price']}đ ({item['description']})\n"
    
        return context

    # Hàm check trạng thái của bàn 
    async def check_available_table(self, restaurant_id, people_count):
        # Truy vấn bảng 'tables' theo hình ảnh bạn gửi
        try:

            today = datetime.now().date().isoformat()
            result = self.supabase.table("tables") \
                .select("id, table_name") \
                .eq("restaurant_id", restaurant_id) \
                .eq("status", "available") \
                .gte("capacity", people_count) \
                .limit(1) \
                .execute()
    
            # Tổng số bàn đã đặt
            current_booked_count = sum([int(b['people_count']) for b in result.data])

            # 3. Lấy sức chứa của nhà hàng (Giả định bảng restaurants có cột capacity)
            res_info = self.supabase.table("restaurants") \
                    .select("capacity") \
                    .eq("id", restaurant_id) \
                    .single().execute()
        
            capacity = res_info.data.get('capacity', 50) # Mặc định 50 nếu không có data
        
                # 4. Kiểm tra: Nếu tổng số cũ + người mới > sức chứa thì báo hết bàn
            if current_booked_count + int(people_count) > capacity:
                      return False
            return True
        except Exception as e:
            print(f"Lỗi check bàn: {e}")
            return False # Không cho phép đặt nếu lỗi hệ thống 
    
    
   

    async def handle_message(self, user_id, intent, message, lat, lng, current_screen, current_restaurant_id=None):

        # 0. Lich sử chat (Memory)
        history = ChatMemory.get_context(user_id)
        # Xây dựng ngữ cảnh hội thoại liên tục
        # Chúng ta đưa chat_history vào System Prompt để AI biết mình đang nói dở chuyện gì
        prompt_with_history = f"""
        LỊCH SỬ TRÒ CHUYỆN (1 GIỜ QUA):
        {history}
    
        TÌNH HUỐNG HIỆN TẠI:
        - Khách đang ở: {current_screen}
        - Tin nhắn mới nhất: "{message}"
    
        NHIỆM VỤ:
        - Nếu trong lịch sử khách đang muốn đặt bàn nhưng thiếu SĐT hoặc Số người, hãy tiếp tục hỏi thông tin còn thiếu.
        - Không lặp lại những gì đã hỏi.
        - Trả về JSON với intent tương ứng để hệ thống xử lý.
        """
    
        # AI xử lý và phân luồng
        ai_raw = self.model.generate_content(prompt_with_history)
        ai_data = json.loads(ai_raw.text.replace('```json', '').replace('```', '').strip())

        # CẬP NHẬT BỘ NHỚ: Lưu cả câu hỏi và câu trả lời để bước sau AI còn nhớ
        ChatMemory.add(user_id, f"Khách: {message}")
        ChatMemory.add(user_id, f"AI: {ai_data['reply']}")

        return ai_data['reply']

        # 1. Lấy context gợi ý (thời tiết, giá...)
        recommender_data = await get_smart_recommendations(user_id, lat, lng, self.supabase)
    
        # 2. Truy vấn Menu thông minh dựa trên màn hình (Context-Aware)
        menu_context = ""
        if current_screen == "RestaurantDetails" and current_restaurant_id:
            # Chỉ lấy món của nhà hàng hiện tại
            data = self.supabase.table("menus") \
                .select("food_name, price, description, is_best_seller") \
                .eq("restaurant_id", current_restaurant_id) \
                .execute()
            menu_context = f"Khách đang xem nhà hàng ID {current_restaurant_id}. Menu: " + str(data.data)
        else:
            # Đang ở HomeScreen: Lấy món bán chạy từ nhiều nhà hàng
            data = self.supabase.table("menus") \
                .select("food_name, price, restaurant_id") \
                .eq("is_best_seller", True) \
                .limit(10).execute()
            menu_context = "Khách ở trang chủ. Các món bán chạy đa nhà hàng: " + str(data.data)
        if intent == "BOOKING":
            # Ưu tiên lấy restaurant_id từ màn hình hiện tại nếu khách không nói tên quán khác
            res_id = current_restaurant_id if current_screen == "RestaurantDetails" else ai_data['entities'].get("restaurant_id")
            people = ai_data['entities'].get("people_count", 2)
        
            # Kiểm tra bàn trống
            available = await self.check_available_table(res_id, people)
            if not available:
                return "Hết bàn rồi bạn ơi, đổi giờ khác hoặc quán khác nhé? 🧊"

            # Tiến hành Insert vào Supabase (Sử dụng dữ liệu từ ai_data)
            self.supabase.table("bookings").insert({
                "restaurant_id": res_id,
                "user_id": user_id,
                "phone": ai_data['entities'].get("phone"),
                "people_count": str(people),
                "status": "pending"
            }).execute()


        # 3. Prompt hướng dẫn AI nhận diện cửa sổ (Screen Detection)
        system_prompt = f"""
        Bạn là trợ lý ảo nhà hàng. 
        Lịch sử chat: {history}
        Ngữ cảnh: {current_screen}
        Dữ liệu Menu khả dụng: {menu_context}
    
        QUY TẮC:
        1. Nếu current_screen là 'HomeScreen': Phải gợi ý ít nhất 2 món ngon của các nhà hàng khác nhau.
        2. Nếu current_screen là 'RestaurantDetails': Chỉ được trả lời món và thông tin của NHÀ HÀNG NÀY. Nếu khách hỏi đặt bàn, dùng restaurant_id: {current_restaurant_id}.
        3. Luôn ưu tiên món có 'is_best_seller': true.
        4. Hiểu tiếng Việt Gen Z (ko, j, shao...).
        YÊU CẦU: Trả về duy nhất định dạng JSON sau:
        {{
          "intent": "BOOKING" | "RECOMMEND" | "SUPPORT",
          "entities": {{"restaurant_id": "...", "phone": "...", "people_count": "...", "time": "..."}},
          "reply": "Câu trả lời thân thiện kiểu Gen Z"
        }}
        """
        
    
        # Gọi Gemini xử lý
        ai_raw = self.model.generate_content(f"{system_prompt}\nKhách: {message}")
    
        # SỬA LỖI TẠI ĐÂY: Định nghĩa ai_data bằng cách parse JSON từ AI
        try:
            # Xóa các ký tự thừa nếu AI trả về kèm markdown ```json
            clean_json = ai_raw.text.replace('```json', '').replace('```', '').strip()
            ai_data = json.loads(clean_json)
        except:
            # Fallback nếu AI không trả về đúng JSON
            return "Xin lỗi, mình hơi 'lag' chút, bạn nói rõ hơn được ko?"

        #4. Lưu vào Memory
        ChatMemory.add(user_id, f"Khách: {message} | AI: {ai_data['reply']}")

        return ai_data.get("reply")