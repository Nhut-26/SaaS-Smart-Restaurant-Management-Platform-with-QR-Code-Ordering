import axios from 'axios';

// Thay địa chỉ IP này bằng IP máy tính của bạn (Dùng lệnh ipconfig/ifconfig)
const BASE_URL = 'http://192.168.1.14:8000';

const apiClient = axios.create({
    baseURL: BASE_URL,
    timeout: 10000, // 10 giây nếu AI không phản hồi sẽ báo lỗi
});

export const chatWithAI = async (message, context) => {
    /**
     * message: Nội dung khách chat
     * context: Object chứa { currentScreen, restaurantId, location }
     */
    try {
        const response = await apiClient.post('/chat', {
            user_id: context.userId,
            message: message,
            current_screen: context.currentScreen,
            current_restaurant_id: context.restaurantId || null,
            lat: context.location?.lat || 0,
            lng: context.location?.lng || 0
        });

        return response.data.reply;
    } catch (error) {
        console.error("API Error:", error);
        // Trả về câu trả lời dự phòng nếu Backend chưa bật
        return "Hệ thống đang bận một chút, bạn thử lại sau giây lát nhé!";
    }
};