import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional
import google.generativeai as genai
from supabase import create_client, Client
import re

# 1. Cấu hình môi trường (Lấy từ file .env qua Docker)
SUPABASE_URL = os.getenv("https://vhjxxgajenkzuykkqloi.supabase.co")
SUPABASE_KEY = os.getenv("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZoanh4Z2FqZW5renV5a2txbG9pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0OTgyMjIsImV4cCI6MjA4MzA3NDIyMn0.l04T4IY-2mdFTvVhksDBmL5buErB1Pfa97GQOgRVtCg")
GEMINI_API_KEY = os.getenv("AIzaSyBpaUdBO0VAuOL1JdMnkpBnQuIaG9y3H4w")

# Khởi tạo các kết nối
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel('gemini-1.5-flash')

app = FastAPI(title="Smart Food Chatbot AI")

# 2. Định dạng dữ liệu đầu vào từ App Expo
class ChatRequest(BaseModel):
    user_id: str
    message: str
    lat: Optional[float] = None
    lng: Optional[float] = None

# 3. Prompt "Kỹ sư ngôn ngữ" để xử lý Gen Z và Teencode
SYSTEM_PROMPT = """
Bạn là một nhân viên hỗ trợ thông minh của nhà hàng. 
Nhiệm vụ:
1. Hiểu mọi ngôn ngữ: Tiếng Việt (có dấu/không dấu), Tiếng Anh, và đặc biệt là Gen Z teencode (vd: 'ko'='không', 'j'='gì', 'shao'='sao', 'mấy h'='mấy giờ').
2. Phân loại ý định khách hàng (Intent Classification) thành 3 loại:
   - 'BOOKING': Nếu khách muốn đặt chỗ, đặt bàn.
   - 'RECOMMEND': Nếu khách muốn tìm món ăn, hỏi gợi ý món ngon, tìm nhà hàng gần đây.
   - 'SUPPORT': Nếu khách hỏi thông tin nhà hàng, giờ mở cửa, menu chung chung.
3. Trích xuất thông tin đặt bàn nếu có: Số điện thoại, Số người, Giờ.

PHẢI TRẢ VỀ DƯỚI DẠNG JSON NGHIÊM NGẶT:
{
  "intent": "BOOKING" | "RECOMMEND" | "SUPPORT",
  "clean_message": "Nội dung tin nhắn sau khi đã chuẩn hóa",
  "entities": {"phone": "...", "people": "...", "time": "..."},
  "reply": "Câu trả lời thân thiện ban đầu"
}
"""

# 4. Hàm xử lý trích xuất số điện thoại (Regex chuyên dụng)
def extract_phone(text):
    phone_pattern = r"(0[3|5|7|8|9][0-9]{8})\b"
    match = re.search(phone_pattern, text)
    return match.group(0) if match else None

# 5. API Chính: Xử lý Chat và Phân luồng
@app.post("/chat")
async def chat_endpoint(request: ChatRequest):
    try:
        # A. AI nhận diện ý định và chuẩn hóa văn bản
        prompt = f"{SYSTEM_PROMPT}\nKhách hàng nói: {request.message}"
        ai_raw_response = model.generate_content(prompt)
        
        # Giả định AI trả về JSON (Cần bóc tách chuỗi JSON từ AI)
        import json
        ai_data = json.loads(ai_raw_response.text.replace('```json', '').replace('```', ''))
        
        intent = ai_data.get("intent")
        user_msg = ai_data.get("clean_message")
        
        # B. Xử lý phân luồng (Logic của bạn)
        
        # LUỒNG 1: ĐẶT BÀN (BOOKING)
       
        if intent == "BOOKING":
            # Trích xuất dữ liệu từ thực thể AI trả về
            phone = extract_phone(request.message) or ai_data['entities'].get("phone")
            customer_name = ai_data['entities'].get("customer_name") or "Khách hàng"
            people_count = ai_data['entities'].get("people_count") or "2" # Mặc định 2 người
    
            # Chuẩn bị dữ liệu khớp với bảng Supabase của bạn
            booking_data = {
                "restaurant_id": ai_data['entities'].get("restaurant_id"), # AI sẽ tìm ID nhà hàng từ tên khách nói
                "user_id": request.user_id,
                "customer_name": customer_name,
                "phone": phone,
                "people_count": str(people_count),
                "status": "pending",
                # 'booking_time' và 'time' sẽ được AI định dạng theo ISO (YYYY-MM-DD và HH:MM:SS)
                "booking_time": datetime.now().isoformat(), 
                "time": ai_data['entities'].get("time") 
            }
    
            # Insert vào Supabase
            result = supabase.table("bookings").insert(booking_data).execute()
    
            return {
                "reply": f"Ok luôn! Em đã đặt bàn cho {customer_name} ({people_count} người). SĐT: {phone}. Nhà hàng sẽ check sớm nhé!",
                "intent": "BOOKING"
            }
        # LUỒNG 2: GỢI Ý (RECOMMEND)
        elif intent == "RECOMMEND":
            # Tại đây sẽ gọi logic tính toán thời tiết, vị trí và lịch sử đơn hàng
            # Tạm thời trả về câu chào thông minh
            return {"reply": f"Để em xem hôm nay có gì ngon cho bạn nhé... (Đang phân tích thời tiết và sở thích)", "intent": "RECOMMEND"}

        # LUỒNG 3: HỖ TRỢ (SUPPORT)
        else:
            return {"reply": ai_data.get("reply"), "intent": "SUPPORT"}

    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail="Có lỗi xảy ra khi AI xử lý.")

# 6. Kiểm tra trạng thái server
@app.get("/")
def read_root():
    return {"status": "AI Server is running", "model": "Gemini 1.5 Flash"}