# Sử dụng Node 18 (Bản ổn định nhất cho Expo hiện tại)
FROM node:18-alpine

# Cài đặt git (cần thiết cho một số thư viện)
RUN apk add --no-cache git

WORKDIR /app

# Copy file cấu hình trước
COPY package.json ./

# Cài đặt dependencies
# Dùng --legacy-peer-deps để bỏ qua các lỗi xung đột version không nghiêm trọng
RUN npm install --legacy-peer-deps

# Cài thêm Expo CLI global
RUN npm install -g expo-cli

# Copy toàn bộ code nguồn vào
COPY . .

# Thiết lập biến môi trường cho Web
ENV CI=1
ENV NODE_ENV=development
ENV EXPO_DEVTOOLS_LISTEN_ADDRESS=0.0.0.0
ENV WEB_PORT=8081

# Mở cổng 8081 (Web) và 19000-19006 (Metro Bundler)
EXPOSE 8081 19000 19001 19002

# Chạy Expo ở chế độ Web
CMD ["npx", "expo", "start", "--web", "--port", "8081", "--host", "0.0.0.0"]