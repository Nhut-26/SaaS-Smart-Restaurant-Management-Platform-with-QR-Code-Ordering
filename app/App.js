import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

// Import screens
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import HomeScreen from './src/screens/HomeScreen';
import MenuScreen from './src/screens/MenuScreen';
import GuestMenuScreen from './src/screens/GuestMenuScreen';
import ReservationScreen from './src/screens/ReservationScreen';
import TableBookingScreen from './src/screens/TableBookingScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import OrderScreen from './src/screens/OrderScreen';
import CartScreen from './src/screens/CartScreen';
import PaymentScreen from './src/screens/PaymentScreen';
import QrScannerScreen from './src/screens/QrScannerScreen';
import OrderTrackingScreen from './src/screens/OrderTrackingScreen';
import RestaurantDetailScreen from './src/screens/RestaurantDetailScreen';

// Import Contexts
import { CartProvider } from './src/context/CartContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Tab Navigator cho Customer
function CustomerTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'HomeTab') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'MenuTab') {
            iconName = focused ? 'restaurant' : 'restaurant-outline';
          } else if (route.name === 'ReservationTab') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'OrderTab') {
            iconName = focused ? 'cart' : 'cart-outline';
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
        name="MenuTab" 
        component={MenuScreen}
        options={{ title: 'Thực đơn' }}
      />
      <Tab.Screen 
        name="ReservationTab" 
        component={ReservationScreen}
        options={{ title: 'Đặt bàn' }}
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

// Stack Navigator cho Guest
function GuestStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="GuestMenu" 
        component={GuestMenuScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="GuestCart" 
        component={CartScreen}
        options={{ title: 'Giỏ hàng' }}
      />
      <Stack.Screen 
        name="GuestPayment" 
        component={PaymentScreen}
        options={{ title: 'Thanh toán' }}
      />
      <Stack.Screen 
        name="GuestOrderTracking" 
        component={OrderTrackingScreen}
        options={{ title: 'Theo dõi đơn hàng' }}
      />
    </Stack.Navigator>
  );
}

// Stack Navigator cho Customer
function CustomerStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="MainTabs" 
        component={CustomerTabs}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="TableBooking" 
        component={TableBookingScreen}
        options={{ title: 'Chọn bàn' }}
      />
      <Stack.Screen 
        name="OrderTracking" 
        component={OrderTrackingScreen}
        options={{ title: 'Theo dõi đơn hàng' }}
      />
      <Stack.Screen 
        name="RestaurantDetail" 
        component={RestaurantDetailScreen}
        options={{ title: 'Chi tiết nhà hàng' }}
      />
      <Stack.Screen 
        name="Cart" 
        component={CartScreen}
        options={{ title: 'Giỏ hàng' }}
      />
      <Stack.Screen 
        name="Payment" 
        component={PaymentScreen}
        options={{ title: 'Thanh toán' }}
      />
    </Stack.Navigator>
  );
}

// Component WelcomeScreen - ĐÃ ĐỔI THÀNH MÀN HÌNH CHỨC NĂNG PHỤ
function WelcomeScreen({ navigation }) {
  return (
    <View style={welcomeStyles.container}>
      <View style={welcomeStyles.header}>
        <Text style={welcomeStyles.logo}>🍽️</Text>
        <Text style={welcomeStyles.title}>Chào mừng</Text>
        <Text style={welcomeStyles.subtitle}>Chọn cách sử dụng</Text>
      </View>
      
      <View style={welcomeStyles.content}>
        <TouchableOpacity 
          style={welcomeStyles.guestButton}
          onPress={() => {
            // Tạo session guest ngẫu nhiên
            const sessionId = `guest_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
            navigation.navigate('GuestFlow');
          }}
        >
          <Ionicons name="restaurant" size={30} color="white" />
          <Text style={welcomeStyles.guestButtonText}>Vào với tư cách khách</Text>
          <Text style={welcomeStyles.guestButtonSubtext}>Không cần đăng nhập</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={welcomeStyles.loginButton}
          onPress={() => navigation.navigate('Login')}
        >
          <Ionicons name="log-in" size={30} color="#FF6B35" />
          <Text style={welcomeStyles.loginButtonText}>Đăng nhập tài khoản</Text>
          <Text style={welcomeStyles.loginButtonSubtext}>Để sử dụng đầy đủ tính năng</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={welcomeStyles.qrButton}
          onPress={() => navigation.navigate('QrScanner')}
        >
          <Ionicons name="qr-code" size={24} color="#666" />
          <Text style={welcomeStyles.qrButtonText}>Quét mã QR trên bàn</Text>
        </TouchableOpacity>
      </View>
      
      <View style={welcomeStyles.footer}>
        <Text style={welcomeStyles.footerText}>
          Bằng cách tiếp tục, bạn đồng ý với Điều khoản dịch vụ của chúng tôi
        </Text>
      </View>
    </View>
  );
}

const welcomeStyles = {
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  logo: {
    fontSize: 80,
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 30,
    justifyContent: 'center',
  },
  guestButton: {
    backgroundColor: '#FF6B35',
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  guestButtonText: {
    color: 'white',
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 5,
  },
  guestButtonSubtext: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
  },
  loginButton: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#FF6B35',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  loginButtonText: {
    color: '#333',
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 5,
  },
  loginButtonSubtext: {
    color: '#666',
    fontSize: 14,
  },
  qrButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
  },
  qrButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  footer: {
    padding: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    lineHeight: 18,
  },
};

// AppNavigator với Login là màn hình đầu tiên
function AppNavigator() {
  const { user, isGuest } = useAuth();
  const [isLoading, setIsLoading] = useState(true);

  // Check initial auth state
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F9FA' }}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={{ marginTop: 20, fontSize: 16, color: '#666' }}>Đang khởi động...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {/* Nếu chưa đăng nhập: Login là màn hình đầu tiên */}
        {!user ? (
          <>
            <Stack.Screen 
              name="Login" 
              component={LoginScreen}
              options={{ 
                headerShown: false,
                animationEnabled: true
              }}
            />
            <Stack.Screen 
              name="Register" 
              component={RegisterScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="Welcome" 
              component={WelcomeScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="QrScanner" 
              component={QrScannerScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="GuestFlow" 
              component={GuestStack}
              options={{ headerShown: false }}
            />
          </>
        ) : (
          // Đã đăng nhập: vào CustomerFlow
          <Stack.Screen 
            name="CustomerFlow" 
            component={CustomerStack}
            options={{ headerShown: false }}
          />
        )}

        {/* Shared screens */}
        <Stack.Screen 
          name="TableBooking" 
          component={TableBookingScreen}
          options={{ title: 'Chọn bàn' }}
        />
        <Stack.Screen 
          name="OrderTracking" 
          component={OrderTrackingScreen}
          options={{ title: 'Theo dõi đơn hàng' }}
        />
        <Stack.Screen 
          name="RestaurantDetail" 
          component={RestaurantDetailScreen}
          options={{ title: 'Chi tiết nhà hàng' }}
        />
        <Stack.Screen 
          name="Cart" 
          component={CartScreen}
          options={{ title: 'Giỏ hàng' }}
        />
        <Stack.Screen 
          name="Payment" 
          component={PaymentScreen}
          options={{ title: 'Thanh toán' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// Main App component
export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <SafeAreaProvider>
          <AppNavigator />
        </SafeAreaProvider>
      </CartProvider>
    </AuthProvider>
  );
}