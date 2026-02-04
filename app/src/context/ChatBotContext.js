import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Dimensions } from 'react-native';
import { AuthProvider, useAuth } from './AuthContext'; // Đảm bảo đường dẫn đúng

const { width, height } = Dimensions.get('window');

const ChatBotContext = createContext();

// =================================================================
// ⚠️ CẤU HÌNH ĐỊA CHỈ SERVER (QUAN TRỌNG NHẤT)
// =================================================================
// Cách lấy IP: Mở CMD trên máy tính -> gõ ipconfig -> lấy dòng IPv4 Address
// Ví dụ: 192.168.1.16 (Số của bạn sẽ khác)
// Lưu ý: Đuôi :8000/chat là bắt buộc.


const API_URL = 'http://192.168.1.14:8000/chat';//----------------------------------------------------------------------------------------------------------------------------------------

export const useChatBot = () => {
    const context = useContext(ChatBotContext);
    if (!context) {
        throw new Error('useChatBot must be used within ChatBotProvider');
    }
    return context;
};

export const ChatBotProvider = ({ children }) => {
    // --- KHAI BÁO STATE ---
    const [userLocation, setUserLocation] = useState({ lat: null, lng: null });
    const [modalVisible, setModalVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(false); // Trạng thái đang tải
    const { user } = useAuth(); // Lấy thông tin user từ AuthContext
    const [messages, setMessages] = useState([
        {
            id: 'user_id',
            text: 'Xin chào! Tôi là trợ lý ảo SmartFood. Tôi có thể giúp bạn tìm quán ăn, đặt bàn nhanh chóng!',
            sender: 'bot',
            time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
        },
    ]);
    const [inputText, setInputText] = useState('');
    // Lấy vị trí ngay khi mở App
    useEffect(() => {
        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                console.log('Không cấp quyền vị trí -> Dùng mặc định HCM');
                setUserLocation({ lat: 10.7769, lng: 106.7009 });
                return;
            }

            let location = await Location.getCurrentPositionAsync({});
            setUserLocation({
                lat: location.coords.latitude,
                lng: location.coords.longitude
            });
            console.log("📍 User Location:", location.coords);
        })();
    }, []);
    // Vị trí nút Chat (Mặc định góc dưới phải)
    const [position, setPosition] = useState({ x: width - 80, y: height - 200 });
    const [initialized, setInitialized] = useState(false);

    // --- LOGIC LƯU VỊ TRÍ WIDGET (Giữ nguyên) ---
    useEffect(() => { loadPosition(); }, []);
    useEffect(() => { if (initialized) savePosition(); }, [position]);

    const loadPosition = async () => {
        try {
            const savedPosition = await AsyncStorage.getItem('chatbot_position');
            if (savedPosition) {
                const { x, y } = JSON.parse(savedPosition);
                // Đảm bảo nút không bị trôi ra khỏi màn hình
                const boundedX = Math.max(20, Math.min(width - 80, x));
                const boundedY = Math.max(50, Math.min(height - 150, y));
                setPosition({ x: boundedX, y: boundedY });
            }
        } catch (error) { console.error('Failed to load pos:', error); }
        finally { setInitialized(true); }
    };

    const savePosition = async () => {
        try { await AsyncStorage.setItem('chatbot_position', JSON.stringify(position)); }
        catch (error) { console.error('Failed to save pos:', error); }
    };

    const updatePosition = (newPosition) => {
        const boundedX = Math.max(20, Math.min(width - 80, newPosition.x));
        const boundedY = Math.max(50, Math.min(height - 150, newPosition.y));
        setPosition({ x: boundedX, y: boundedY });
    };

    // --- HÀM GỬI TIN NHẮN (LOGIC CHÍNH) ---
    const handleSendMessage = async (text) => {
        if (!text.trim()) return;

        // 1. Hiển thị tin nhắn User ngay lập tức
        const newUserMessage = {
            id: Date.now().toString(),
            text: text,
            sender: 'user',
            time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages(prev => [...prev, newUserMessage]);
        setInputText(''); // Xóa ô nhập
        setIsLoading(true); // Bắt đầu quay

        try {
            console.log("🚀 Đang gửi yêu cầu tới:", API_URL);

            // 2. Gọi API Python
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: user?.id, // ID định danh người dùng
                    message: text,
                    lat: userLocation.lat,
                    lng: userLocation.lng,
                    current_screen: "Home",
                    restaurant_id: null
                }),
            });

            // 3. Xử lý kết quả trả về
            if (!response.ok) {
                throw new Error(`Server lỗi: ${response.status}`);
            }

            const data = await response.json();
            console.log("📦 Dữ liệu nhận được:", data);

            // Python trả về: { reply, intent, data }
            // App cần map vào: { text, sender, intent, data }
            const botResponse = {
                id: (Date.now() + 1).toString(),
                text: data.reply || "Xin lỗi, tôi không hiểu ý bạn.",
                sender: 'bot',
                // --- KEY MAPPING QUAN TRỌNG ---
                custom_type: data.custom_type || null, // (booking_form, restaurant_suggest...)
                data: data.data || [],                 // List quán hoặc list bàn
                pre_fill: data.pre_fill || null,       // Data điền sẵn form
                // ------------------------------
                time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
            };
            setMessages(prev => [...prev, botResponse]);

        } catch (error) {
            console.error("❌ LỖI KẾT NỐI:", error);

            // Thông báo lỗi cho người dùng biết
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                text: `⚠️ Mất kết nối tới Server AI. Vui lòng kiểm tra IP hoặc Wifi.\n(Chi tiết: ${error.message})`,
                sender: 'bot',
                time: ""
            }]);
        } finally {
            setIsLoading(false); // Tắt quay dù thành công hay thất bại
        }
    };

    return (
        <ChatBotContext.Provider
            value={{
                modalVisible, setModalVisible,
                messages, setMessages,
                inputText, setInputText,
                position, updatePosition,
                handleSendMessage,
                initialized,
                isLoading // Export biến này để ChatBotWidget sử dụng
            }}
        >
            {children}
        </ChatBotContext.Provider>
    );
};
