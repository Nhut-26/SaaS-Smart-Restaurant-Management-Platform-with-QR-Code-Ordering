# 1. Sử dụng Python 3.10 bản gọn nhẹ (Slim) để tiết kiệm dung lượng
FROM python:3.10-slim

# 2. Thiết lập thư mục làm việc bên trong Docker
WORKDIR /app

# 3. Tránh tạo file .pyc rác và ép Python in log ngay lập tức (dễ debug)
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# 4. Copy file thư viện vào trước để tận dụng Cache của Docker
COPY requirements.txt .

# 5. Cài đặt các thư viện (AI, Database, API)
# --no-cache-dir giúp giảm dung lượng image
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# 6. Copy toàn bộ code hiện tại vào trong Docker
COPY . .

# 7. Mở cổng 8000 để App Expo bên ngoài có thể gọi vào
EXPOSE 8000

# 8. Lệnh chạy server: host 0.0.0.0 để chấp nhận kết nối từ bên ngoài container
# --reload: Tính năng quan trọng, sửa code là server tự cập nhật
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]