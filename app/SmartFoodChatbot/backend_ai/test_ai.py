import asyncio
import json
from app.modules.chatbot.ai_agent import FoodChatAgent
# Giả sử bạn đã khởi tạo model và supabase trong môi trường test

async def run_stress_test(agent):
    test_cases = [
        {
            "msg": "đặt bàn 2 ng lúc 7h tối nay tại quán này, sđt 0901234567 nha",
            "desc": "Tiếng Việt có dấu + SĐT chuẩn"
        },
        {
            "msg": "cho t 1 slot 4 ng vào 8h, sdt: 0388.222.111",
            "desc": "Ngôn ngữ ngắn gọn + SĐT có dấu chấm"
        },
        {
            "msg": "có món j ngon ko shao ko thấy ai trl v, mấy h đóng cửa?",
            "desc": "Teencode Gen Z nặng (j, ko, shao, trl, v, mấy h, đc)"
        },
        {
            "msg": "tầm 500k thì ăn đc j ở đây ko shop?",
            "desc": "Hỏi dựa trên tầm giá (Price matching)"
        }
    ]
    
    print("=== BẮT ĐẦU KIỂM THỬ ĐỘ NHẬN DIỆN AI ===")
    for case in test_cases:
        print(f"\n[Test]: {case['desc']}")
        print(f"Khách: {case['msg']}")
        
        # Giả lập đang ở màn hình chi tiết nhà hàng
        response = await agent.handle_message(
            user_id="test_user_01",
            message=case['msg'],
            lat=10.762622,
            lng=106.660172,
            current_screen="RestaurantDetails",
            current_restaurant_id="uuid-nha-hang-mau"
        )
        print(f"AI: {response}")
    print("\n=== KẾT THÚC KIỂM THỬ ===")

# Chạy test độc lập
if __name__ == "__main__":
    # Khởi tạo các biến môi trường và chạy hàm test
    asyncio.run(run_stress_test())