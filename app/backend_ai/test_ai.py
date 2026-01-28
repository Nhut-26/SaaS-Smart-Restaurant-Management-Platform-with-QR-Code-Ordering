import requests

def test_bot(message):
    url = "http://127.0.0.1:8000/chat"
    payload = {
        "user_id": "c73d5269-80e2-491c-99d7-8490a07e15e6", 
        "message": message,
        "lat": 10.7, 
        "lng": 106.6
    }
    try:
        # Thêm timeout=10 giây để tránh treo máy nếu server không phản hồi
        response = requests.post(url, json=payload, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Bot: {data.get('reply')}")
        else:
            # Nếu server lỗi, in ra lỗi thô thay vì cố parse JSON
            print(f"❌ Server Error {response.status_code}: {response.text}")
            
    except requests.exceptions.Timeout:
        print("⏰ Lỗi: Server phản hồi quá lâu (Timeout)!")
    except Exception as e:
        print(f"💥 Lỗi không xác định: {e}")

test_bot("Alo bot ơi")