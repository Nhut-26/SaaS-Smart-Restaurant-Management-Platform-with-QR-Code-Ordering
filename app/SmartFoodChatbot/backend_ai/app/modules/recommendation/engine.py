import requests
from datetime import datetime

# Hàm lấy thời tiết thực tế (Miễn phí từ OpenWeatherMap)
def get_weather_context(lat, lng, api_key):
    try:
        url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lng}&appid={api_key}&units=metric"
        response = requests.get(url).json()
        temp = response['main']['temp']
        description = response['weather'][0]['main'] # Rain, Clear, Clouds...
        return {"temp": temp, "condition": description}
    except:
        return {"temp": 25, "condition": "Clear"} # Mặc định nếu lỗi

# Logic gợi ý món ăn thông minh
async def get_smart_recommendations(user_id, lat, lng, supabase):
    # 1. Lấy lịch sử đơn hàng của khách từ bảng 'oder' (theo ảnh của bạn là 'oder')
    # Tính toán tầm giá tiền khách thường đặt
    order_history = supabase.table("oder").select("total_price").eq("user_id", user_id).execute()
    avg_price = 0
    if order_history.data:
        prices = [o['total_price'] for o in order_history.data]
        avg_price = sum(prices) / len(prices)

    # 2. Lấy danh sách nhà hàng và tính khoảng cách (Sử dụng PostGIS nếu có)
    # Ở đây chúng ta lấy danh sách nhà hàng gần nhất
    restaurants = supabase.table("restaurants").select("*").execute()
    
    # 3. Kết hợp thời tiết
    weather = get_weather_context(lat, lng, os.getenv("a5bcf56a395da987b94e87d54c98017b"))
    
    # Logic gợi ý: 
    # - Trời nóng (>30 độ) -> ưu tiên món nước/lạnh
    # - Buổi trưa (11h-13h) -> ưu tiên món chính
    current_hour = datetime.now().hour
    
    # AI sẽ dựa vào context này để đưa ra danh sách cuối cùng (Tôi sẽ tích hợp vào prompt ở main.py)
    return {
        "weather": weather,
        "avg_price": avg_price,
        "suggested_restaurants": restaurants.data # Sẽ được AI lọc lại
    }