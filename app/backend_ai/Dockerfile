# Sử dụng Python 3.9 (hoặc phiên bản bạn đang dùng)
FROM python:3.9-slim

# Thiết lập thư mục làm việc BÊN TRONG container
WORKDIR /app

# --- SỬA LỖI Ở ĐÂY ---
# Vì Root Directory là backend_ai, nên chỉ cần copy file ngay tại đó
COPY requirements.txt .

# Cài đặt thư viện
RUN pip install --no-cache-dir -r requirements.txt

# Copy toàn bộ code còn lại vào container
COPY . .

# Mở cổng 8000
EXPOSE 8000

# Lệnh chạy server (dùng uvicorn)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]