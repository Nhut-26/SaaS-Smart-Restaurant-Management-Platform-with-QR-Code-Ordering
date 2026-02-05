FROM python:3.9-slim

# 1. Đổi tên thư mục làm việc thành /src (hoặc /code) 
# để KHÔNG BỊ TRÙNG với thư mục 'app' trong source code của bạn
WORKDIR /code

# 2. Copy file requirements
COPY requirements.txt .

# 3. Cài đặt thư viện
RUN pip install --no-cache-dir -r requirements.txt

# 4. Copy toàn bộ code vào thư mục /code
COPY . .

# 5. Mở cổng 8000
EXPOSE 8000

# 6. Sửa lệnh chạy: Dùng "python -m uvicorn" để đảm bảo chạy đúng môi trường
CMD ["python", "-m", "uvicorn", "main:asgi_app", "--host", "0.0.0.0", "--port", "8000"]