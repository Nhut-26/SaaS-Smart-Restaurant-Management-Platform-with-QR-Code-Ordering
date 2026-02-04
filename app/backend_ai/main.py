import os
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from supabase import create_client, Client
from groq import Groq 

# Import module AI Agent cũ của bạn
from app.modules.chatbot.ai_agent import FoodChatAgent
from app.utils.memory import ChatMemory

load_dotenv()

# --- KHỞI TẠO APP FASTAPI (Thay vì Flask) ---
app = FastAPI()

# Cấu hình CORS (Để Web App bên ngoài gọi được vào)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- CẤU HÌNH LOGIC (Giữ nguyên của bạn) ---
WEATHER_API_KEY = os.getenv("WEATHER_API_KEY")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ LỖI: Thiếu cấu hình SUPABASE trong .env")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

if not GROQ_API_KEY:
    print("❌ LỖI: Thiếu GROQ_API_KEY trong .env")
groq_client = Groq(api_key=GROQ_API_KEY)

# Khởi tạo Agent
chatbot = FoodChatAgent(groq_client, supabase)
chat_memory = ChatMemory()

# --- ĐỊNH NGHĨA DỮ LIỆU ĐẦU VÀO ---
class ChatRequest(BaseModel):
    user_id: str = None
    message: str
    lat: float = None
    lng: float = None
    current_screen: str = "Home"
    restaurant_id: str = None

# --- CÁC ROUTE (API) ---

@app.get("/")
def home():
    return {"message": "Food AI Backend is Running (FastAPI + Groq) 🚀"}

@app.post("/chat")
async def chat_endpoint(request: ChatRequest):
    # Kiểm tra tin nhắn rỗng
    if not request.message:
        raise HTTPException(status_code=400, detail="Empty message")

    try:
        # Gọi Agent (Giữ nguyên logic của bạn)
        response = await chatbot.handle_message(
            request.user_id, 
            request.message, 
            request.lat, 
            request.lng, 
            request.current_screen, 
            request.restaurant_id, 
            chat_memory
        )
        # FastAPI tự động chuyển Dict thành JSON, không cần jsonify
        return response

    except Exception as e:
        print(f"🔥 SYSTEM ERROR: {str(e)}")
        # Trả về lỗi dạng JSON
        return {
            "intent": "SUPPORT",
            "reply": "Hệ thống đang bận xíu, bạn thử lại nha! 🥺"
        }

# --- CHẠY SERVER ---
if __name__ == '__main__':
    port = int(os.getenv("PORT", 8000))
    print(f"🚀 Server is starting on port {port}...")
    uvicorn.run(app, host="0.0.0.0", port=port)