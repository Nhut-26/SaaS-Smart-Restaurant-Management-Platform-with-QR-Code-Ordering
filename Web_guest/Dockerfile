# Web_guest/Dockerfile
FROM python:3.9-slim

WORKDIR /app

COPY Web_guest/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy code của Web_guest
COPY Web_guest/ .

# Tạo thư mục static để tránh lỗi
RUN mkdir -p static

EXPOSE 5000

# Chạy FastAPI
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "5000"]