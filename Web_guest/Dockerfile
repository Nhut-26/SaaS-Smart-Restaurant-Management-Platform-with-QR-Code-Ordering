FROM python:3.9-slim

WORKDIR /app

# CHÚ Ý: Không dùng Web_guest/ ở đây vì Root Directory đã là Web_guest rồi
COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

# Copy toàn bộ file đang có trong thư mục Web_guest vào container
COPY . .

# Chạy ứng dụng bằng uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "5000"]