# FILE: backend_ai/main.py
import os
import asyncio
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from supabase import create_client, Client
from groq import Groq # Import Groq
from asgiref.wsgi import WsgiToAsgi


# Import module AI Agent
from app.modules.chatbot.ai_agent import FoodChatAgent
from app.utils.memory import ChatMemory

load_dotenv()

app = Flask(__name__)
CORS(app)
asgi_app = WsgiToAsgi(app)

# 0. Cấu hình Weather API
WEATHER_API_KEY = os.getenv("WEATHER_API_KEY")


# 1. Cấu hình Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ LỖI: Thiếu cấu hình SUPABASE trong .env")
    
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# 2. Cấu hình Groq AI
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

# --- THÊM ĐOẠN NÀY ĐỂ DEBUG ---
if GROQ_API_KEY:
    print(f"✅ Đã nhận GROQ_API_KEY: {GROQ_API_KEY[:5]}******")
else:
    print("❌ CHƯA NHẬN ĐƯỢC GROQ_API_KEY (Kiểm tra lại Environment trên Render)")
# ------------------------------

if not GROQ_API_KEY:
    print("❌ LỖI: Thiếu GROQ_API_KEY trong .env")

# Khởi tạo Groq Client
groq_client = Groq(
    api_key=GROQ_API_KEY,
)

# 3. Khởi tạo Agent với Groq & Supabase
chatbot = FoodChatAgent(groq_client, supabase)
chat_memory = ChatMemory()

@app.route('/', methods=['GET'])
def home():
    return "Food AI Backend is Running (Groq Llama 3.3) 🚀"

@app.route('/chat', methods=['POST'])
async def chat_endpoint():
    data = request.json
    
    # Lấy dữ liệu từ App
    user_id = data.get('user_id')
    message = data.get('message')
    lat = data.get('lat')
    lng = data.get('lng')
    current_screen = data.get('current_screen', 'Home')
    restaurant_id = data.get('restaurant_id')

    if not message:
        return jsonify({"error": "Empty message"}), 400

    try:
        # Gọi Agent
        response = await chatbot.handle_message(
            user_id, message, lat, lng, current_screen, restaurant_id, chat_memory
        )
        # response bây giờ đã có format chuẩn: { "reply": "...", "intent": "...", "data": [...] }
        return jsonify(response)

    except Exception as e:
        print(f"🔥 SYSTEM ERROR: {str(e)}")
        return jsonify({
            "intent": "SUPPORT",
            "reply": "Hệ thống đang bận xíu, bạn thử lại nha! 🥺"
        })

if __name__ == '__main__':
    port = int(os.getenv("PORT", 8000))
    print(f"🚀 Server is starting on port {port} using Groq Llama 3.3...")
    app.run(host='0.0.0.0', port=port, debug=True)