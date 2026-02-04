# app/backend_ai/Dockerfile
FROM python:3.9-slim

# Đặt thư mục làm việc là /workspace để chứa folder 'app' bên trong
WORKDIR /workspace

# Cài đặt thư viện
COPY app/backend_ai/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy TOÀN BỘ thư mục 'app' vào trong Docker
# (Để main.py có thể import app.modules...)
COPY app/ ./app/

# Thiết lập biến môi trường để Python nhận diện module
ENV PYTHONPATH=/workspace

# Mở port 8000
EXPOSE 8000

# Chạy server từ thư mục gốc
CMD ["python", "app/backend_ai/main.py"]