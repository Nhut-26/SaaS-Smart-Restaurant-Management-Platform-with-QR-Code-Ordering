import React, { useEffect } from 'react';

import { View, Text, ActivityIndicator, LogBox } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

// Import screens
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import HomeScreen from './src/screens/HomeScreen';
import RestaurantListScreen from './src/screens/RestaurantListScreen';
import RestaurantDetailScreen from './src/screens/RestaurantDetailScreen';
import MenuScreen from './src/screens/MenuScreen';
import ReservationScreen from './src/screens/ReservationScreen';
import TableBookingScreen from './src/screens/TableBookingScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import OrderScreen from './src/screens/OrderScreen';
import QrScannerScreen from './src/screens/QrScannerScreen';
import OrderTrackingScreen from './src/screens/OrderTrackingScreen';
import ReviewScreen from './src/screens/ReviewScreen';

// Import ChatBotWidget
import ChatBotWidget from './src/components/ChatBotWidget';

// Import Contexts
import { CartProvider } from './src/context/CartContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { BookingProvider } from './src/context/BookingContext';
import { ChatBotProvider } from './src/context/ChatBotContext';

// Import Supabase config
import { testConnection } from './src/config/supabase';

// Import Thông báo đặt bàn
import { supabase } from './supabaseClient'; // File cấu hình Supabase của bạn


//Khai báo hàm subscribe để lắng nghe sự kiện đặt bàn mới
const subscribeToBookings = () => {
    const channels = supabase.channel('custom-insert-channel')
        .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'bookings' },
            (payload) => {
                console.log('Có khách đặt bàn mới!', payload.new);
                // Bạn có thể dùng thư viện thông báo (như Alert hoặc Toast) ở đây
                alert(`Khách ${payload.new.customer_name} vừa đặt bàn cho ${payload.new.people_count} người!`);
            }
        )
        .subscribe();

    return channels;
};

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
// Khai báo state để theo dõi màn hình hiện tại
const [currentScreen, setCurrentScreen] = useState('HomeScreen'); // Hoặc 'RestaurantDetails'
const [selectedRestaurantId, setSelectedRestaurantId] = useState(null); // Lưu ID khi vào trang chi tiết

// Hàm giả lập khi khách bấm vào xem một nhà hàng cụ thể
const handleViewRestaurant = (id) => {
    setSelectedRestaurantId(id);
    setCurrentScreen('RestaurantDetails');
};

// Gửi dữ liệu đến ChatBotWidget
const sendMessageToAI = async (userMessage) => {
    try {
        const response = await fetch('http://localhost:8000/chat', { // Thay localhost bằng IP máy nếu chạy trên thiết bị thật
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: "uuid_cua_khach_hang", // Lấy từ Supabase Auth
                message: userMessage,
                current_screen: currentScreen,
                current_restaurant_id: selectedRestaurantId,
                lat: userLocation.lat, // Lấy từ Expo Location
                lng: userLocation.lng
            }),
        });

        const data = await response.json();
        return data.reply; // Đây là câu trả lời đã được Gemini xử lý xong
    } catch (error) {
        console.error("Lỗi kết nối AI:", error);
        return "Xin lỗi, mình đang bận một chút, bạn thử lại sau nhé!";
    }
};

// Đóng gói thông tin vị trí truy cập cửa sổ hiện tại
const reply = await chatWithAI("Món nào bán chạy?", {
    userId: user.id,
    currentScreen: "RestaurantDetails",
    restaurantId: "id-nha-hang-dang-xem",
    location: currentCoords
});

// nhận diện kí tự đặc biệt
const validateBookingInMessage = (text) => {
    const phoneRegex = /(0[3|5|7|8|9][0-9]{8})\b/;
    if (text.includes("đặt bàn") && !phoneRegex.test(text)) {
        // Bạn có thể hiển thị một thông báo nhỏ trên bong bóng chat
        console.log("Gợi ý khách để lại số điện thoại");
    }
};

// Tab Navigator cho Customer
function CustomerTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'HomeTab') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'RestaurantTab') {
            iconName = focused ? 'restaurant' : 'restaurant-outline';
          } else if (route.name === 'OrderTab') {
            iconName = focused ? 'list' : 'list-outline';
          } else if (route.name === 'ProfileTab') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#FF6B35',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="HomeTab" 
        component={HomeScreen}
        options={{ title: 'Trang chủ' }}
      />
      <Tab.Screen 
        name="RestaurantTab" 
        component={RestaurantListScreen}
        options={{ title: 'Nhà hàng' }}
      />
      <Tab.Screen 
        name="OrderTab" 
        component={OrderScreen}
        options={{ title: 'Đơn hàng' }}
      />
      <Tab.Screen 
        name="ProfileTab" 
        component={ProfileScreen}
        options={{ title: 'Tài khoản' }}
      />
    </Tab.Navigator>
  );
}

// Auth Navigator cho người chưa đăng nhập
function AuthNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="Login" 
        component={LoginScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="Register" 
        component={RegisterScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

// Customer Navigator
function CustomerNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="MainTabs" 
        component={CustomerTabs}
        options={{ headerShown: false }}
      />
          <Stack.Screen 
        name="QrScanner" 
        component={QrScannerScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="RestaurantDetail" 
        component={RestaurantDetailScreen}
        options={{ 
          headerShown: true,
          title: 'Chi tiết nhà hàng',
          headerStyle: {
            backgroundColor: '#FF6B35',
          },
          headerTintColor: '#fff',
        }}
      />
      <Stack.Screen 
        name="Menu" 
        component={MenuScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="Reservation" 
        component={ReservationScreen}
        options={{ 
          headerShown: true,
          title: 'Đặt bàn',
          headerStyle: {
            backgroundColor: '#FF6B35',
          },
          headerTintColor: '#fff',
        }}
      />
      <Stack.Screen 
        name="TableBooking" 
        component={TableBookingScreen}
        options={{ 
          headerShown: true,
          title: 'Chọn bàn',
          headerStyle: {
            backgroundColor: '#FF6B35',
          },
          headerTintColor: '#fff',
        }}
      />
      <Stack.Screen 
        name="OrderTracking" 
        component={OrderTrackingScreen}
        options={{ 
          headerShown: true,
          title: 'Theo dõi đơn hàng',
          headerStyle: {
            backgroundColor: '#FF6B35',
          },
          headerTintColor: '#fff',
        }}
      />
      <Stack.Screen 
        name="Review" 
        component={ReviewScreen}
        options={{ 
          headerShown: true,
          title: 'Đánh giá',
          headerStyle: {
            backgroundColor: '#FF6B35',
          },
          headerTintColor: '#fff',
        }}
      />
    </Stack.Navigator>
  );
}

// Main App Navigator
function MainNavigator() {
  const { user, isLoading: authLoading } = useAuth();
  const [appLoading, setAppLoading] = React.useState(true);
  const [supabaseConnected, setSupabaseConnected] = React.useState(false);

  useEffect(() => {
    const initApp = async () => {
      // Kiểm tra kết nối Supabase
      const connected = await testConnection();
      setSupabaseConnected(connected);
      
      const timer = setTimeout(() => {
        setAppLoading(false);
      }, 1000);
      return () => clearTimeout(timer);
    };

    initApp();
  }, []);

  if (appLoading || authLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F9FA' }}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={{ marginTop: 20, fontSize: 16, color: '#666' }}>Đang khởi động...</Text>
        {!supabaseConnected && (
          <Text style={{ marginTop: 10, fontSize: 14, color: '#FF6B35' }}>
            Đang kết nối đến cơ sở dữ liệu...
          </Text>
        )}
      </View>
    );
  }

  return (
    <NavigationContainer>
      {/* Widget sẽ hiển thị ở tất cả màn hình khi đã đăng nhập */}
      {user && <ChatBotWidget />}
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        {/* Nếu đã đăng nhập: hiển thị CustomerNavigator */}
        {user ? (
          <Stack.Screen 
            name="CustomerMain" 
            component={CustomerNavigator}
          />
        ) : (
          /* Nếu chưa đăng nhập: hiển thị AuthNavigator */
          <Stack.Screen 
            name="AuthMain" 
            component={AuthNavigator}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// Main App component
export default function App() {
  useEffect(() => {
    LogBox.ignoreLogs([
      'The action \'RESET\' was not handled',
      'The action \'NAVIGATE\' was not handled',
      'The action \'REPLACE\' was not handled'
    ]);
    
    // Kiểm tra kết nối Supabase khi app khởi động
    testConnection();
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <BookingProvider>
          <CartProvider>
            <ChatBotProvider>
              <MainNavigator />
            </ChatBotProvider>
          </CartProvider>
        </BookingProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}