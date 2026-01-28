# Dùng Nginx siêu nhẹ
FROM nginx:alpine

# Copy toàn bộ thư mục (css, js, pages) vào server ảo
COPY . /usr/share/nginx/html

# Cấu hình để khi vào trang chủ nó tự chuyển hướng vào manager.html (Tuỳ chọn, cho tiện)
# Nếu không cần thì bạn cứ truy cập /pages/manager.html là được