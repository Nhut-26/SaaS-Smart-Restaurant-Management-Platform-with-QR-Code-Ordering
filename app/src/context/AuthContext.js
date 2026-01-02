import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userType, setUserType] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [guestOrders, setGuestOrders] = useState([]);
  const [membershipLevel, setMembershipLevel] = useState('Sắt');
  const [sessionInfo, setSessionInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [navigationReset, setNavigationReset] = useState(null);

  // Hàm tính hạng thành viên
  const calculateMembershipLevel = useCallback((totalSpent) => {
    if (totalSpent >= 10000000) {
      setMembershipLevel('Kim Cương');
    } else if (totalSpent >= 5000000) {
      setMembershipLevel('Vàng');
    } else if (totalSpent >= 2000000) {
      setMembershipLevel('Bạc');
    } else {
      setMembershipLevel('Sắt');
    }
  }, []);

  // Hàm xóa guest session
  const clearGuestSession = useCallback(async () => {
    try {
      await AsyncStorage.removeItem('guest_session_id');
      await AsyncStorage.removeItem('guest_session_info');
      if (sessionId) {
        await AsyncStorage.removeItem(`guest_orders_${sessionId}`);
      }
      setSessionId(null);
      setSessionInfo(null);
      setGuestOrders([]);
      if (userType === 'guest') {
        setUserType(null);
      }
    } catch (error) {
      console.error('Lỗi khi xóa guest session:', error);
    }
  }, [sessionId, userType]);

  // Khởi tạo session khi app start
  useEffect(() => {
    let isMounted = true;

    const initializeSession = async () => {
      setIsLoading(true);
      try {
        // Kiểm tra xem có user đã đăng nhập không
        const storedUser = await AsyncStorage.getItem('user_data');
        if (storedUser) {
          const userData = JSON.parse(storedUser);
          if (isMounted) {
            setUser(userData);
            setUserType('customer');
            calculateMembershipLevel(userData.totalSpent || 0);
          }
          setIsLoading(false);
          return;
        }

        // Kiểm tra xem có guest session không
        const storedSessionId = await AsyncStorage.getItem('guest_session_id');
        const storedSessionInfo = await AsyncStorage.getItem('guest_session_info');
        
        if (storedSessionId && storedSessionInfo) {
          const parsedSessionInfo = JSON.parse(storedSessionInfo);
          // Kiểm tra session hết hạn
          if (parsedSessionInfo.expiresAt && Date.now() > parsedSessionInfo.expiresAt) {
            await clearGuestSession();
            if (isMounted) {
              setUserType(null);
            }
          } else if (isMounted) {
            setSessionId(storedSessionId);
            setSessionInfo(parsedSessionInfo);
            setUserType('guest');
            
            // Load guest orders
            const storedGuestOrders = await AsyncStorage.getItem(`guest_orders_${storedSessionId}`);
            if (storedGuestOrders) {
              setGuestOrders(JSON.parse(storedGuestOrders));
            }
          }
        } else if (isMounted) {
          setUserType(null);
        }
      } catch (error) {
        console.error('Khởi tạo session thất bại:', error);
        if (isMounted) {
          setUserType(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initializeSession();

    return () => {
      isMounted = false;
    };
  }, [calculateMembershipLevel, clearGuestSession]);

  // Tự động kiểm tra session hết hạn
  useEffect(() => {
    const checkSessionExpiry = () => {
      if (sessionInfo?.expiresAt && Date.now() > sessionInfo.expiresAt && userType === 'guest') {
        clearGuestSession();
      }
    };

    const interval = setInterval(checkSessionExpiry, 60000); // Kiểm tra mỗi phút
    return () => clearInterval(interval);
  }, [sessionInfo, userType, clearGuestSession]);

  // Tạo guest session mới
  const createGuestSession = useCallback(async () => {
    try {
      const newSessionId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const sessionData = {
        id: newSessionId,
        createdAt: Date.now(),
        expiresAt: Date.now() + (2 * 60 * 60 * 1000) // 2 giờ
      };
      
      await AsyncStorage.setItem('guest_session_id', newSessionId);
      await AsyncStorage.setItem('guest_session_info', JSON.stringify(sessionData));
      
      setSessionId(newSessionId);
      setSessionInfo(sessionData);
      setUserType('guest');
      setUser(null);
      setGuestOrders([]);
      
      return newSessionId;
    } catch (error) {
      console.error('Lỗi khi tạo guest session:', error);
      return null;
    }
  }, []);

  // Thiết lập guest session từ QR scanner
  const setGuestSession = useCallback(async (sessionId, restaurantId, tableId, restaurantName = 'Nhà hàng Mẫu') => {
    try {
      const sessionData = {
        id: sessionId,
        restaurantId,
        tableId,
        restaurantName,
        createdAt: Date.now(),
        expiresAt: Date.now() + (30 * 60 * 1000) // 30 phút
      };
      
      await AsyncStorage.setItem('guest_session_id', sessionId);
      await AsyncStorage.setItem('guest_session_info', JSON.stringify(sessionData));
      
      setSessionId(sessionId);
      setSessionInfo(sessionData);
      setUserType('guest');
      setUser(null);
      setGuestOrders([]);
      
      return sessionData;
    } catch (error) {
      console.error('Lỗi khi thiết lập guest session:', error);
      return null;
    }
  }, []);

  // Đăng nhập
  const login = useCallback(async (userData) => {
    try {
      console.log('AuthContext: Đang login với', userData);
      
      await AsyncStorage.setItem('user_data', JSON.stringify(userData));
      
      setUser(userData);
      setUserType('customer');
      calculateMembershipLevel(userData.totalSpent || 0);
      
      await clearGuestSession();
      
      // Thêm thông tin để trigger navigation reset
      setNavigationReset({
        type: 'customer',
        timestamp: Date.now()
      });
      
      return { success: true, user: userData };
    } catch (error) {
      console.error('AuthContext Login error:', error);
      return { success: false, error: error.message };
    }
  }, [calculateMembershipLevel, clearGuestSession]);

  // Đăng ký
  const register = useCallback(async (userData) => {
    try {
      const newUserData = {
        ...userData,
        totalSpent: 0,
        joinDate: new Date().toISOString()
      };
      
      await AsyncStorage.setItem('user_data', JSON.stringify(newUserData));
      
      setUser(newUserData);
      setUserType('customer');
      setMembershipLevel('Sắt');
      
      // Thêm thông tin để trigger navigation reset
      setNavigationReset({
        type: 'customer',
        timestamp: Date.now()
      });
      
      return { success: true, user: newUserData };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, []);

  // Đăng xuất
  const logout = useCallback(async () => {
    try {
      console.log('AuthContext: Đang logout');
      await AsyncStorage.removeItem('user_data');
      setUser(null);
      setUserType(null);
      setMembershipLevel('Sắt');
      await clearGuestSession();
      
      // Thêm thông tin để trigger navigation reset
      setNavigationReset({
        type: 'auth',
        timestamp: Date.now()
      });
      
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false, error: error.message };
    }
  }, [clearGuestSession]);

  // Thêm order cho guest
  const addGuestOrder = useCallback((order) => {
    const newOrder = {
      ...order,
      id: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sessionId: sessionId,
      date: new Date().toISOString(),
      status: 'Đang chế biến'
    };
    
    setGuestOrders(prev => {
      const updatedOrders = [newOrder, ...prev];
      if (sessionId) {
        AsyncStorage.setItem(`guest_orders_${sessionId}`, JSON.stringify(updatedOrders))
          .catch(error => console.error('Lỗi khi lưu guest orders:', error));
      }
      return updatedOrders;
    });
    
    return newOrder;
  }, [sessionId]);

  // Cập nhật trạng thái order
  const updateOrderStatus = useCallback((orderId, status) => {
    if (userType === 'guest') {
      setGuestOrders(prev => {
        const updatedOrders = prev.map(order => 
          order.id === orderId ? { ...order, status } : order
        );
        
        if (sessionId) {
          AsyncStorage.setItem(`guest_orders_${sessionId}`, JSON.stringify(updatedOrders))
            .catch(error => console.error('Lỗi khi cập nhật order status:', error));
        }
        return updatedOrders;
      });
    }
  }, [sessionId, userType]);

  // Đăng nhập bằng QR
  const loginWithQR = useCallback(async (qrData) => {
    try {
      const sessionData = {
        id: `qr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        tableNumber: qrData.table || 'Bàn 1',
        restaurantId: qrData.restaurantId,
        restaurantName: qrData.restaurantName || 'Nhà hàng Mẫu',
        createdAt: Date.now(),
        expiresAt: Date.now() + (30 * 60 * 1000)
      };
      
      await AsyncStorage.setItem('guest_session_id', sessionData.id);
      await AsyncStorage.setItem('guest_session_info', JSON.stringify(sessionData));
      
      setSessionId(sessionData.id);
      setUserType('guest');
      setSessionInfo(sessionData);
      setUser(null);
      setGuestOrders([]);
      
      // Thêm thông tin để trigger navigation reset
      setNavigationReset({
        type: 'guest',
        timestamp: Date.now()
      });
      
      return { success: true, sessionInfo: sessionData };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, []);

  // Lấy thời gian còn lại của session
  const getSessionTimeout = useCallback(() => {
    if (sessionInfo && sessionInfo.expiresAt) {
      const remaining = sessionInfo.expiresAt - Date.now();
      return remaining > 0 ? remaining : 0;
    }
    return 30 * 60 * 1000;
  }, [sessionInfo]);

  // Làm mới guest session
  const refreshGuestSession = useCallback(async () => {
    if (sessionInfo && userType === 'guest') {
      try {
        const updatedSessionInfo = {
          ...sessionInfo,
          expiresAt: Date.now() + (30 * 60 * 1000)
        };
        
        await AsyncStorage.setItem('guest_session_info', JSON.stringify(updatedSessionInfo));
        setSessionInfo(updatedSessionInfo);
        
        return { success: true, expiresAt: updatedSessionInfo.expiresAt };
      } catch (error) {
        console.error('Lỗi khi refresh session:', error);
        return { success: false, error: error.message };
      }
    }
    return { success: false, error: 'Không có session để refresh' };
  }, [sessionInfo, userType]);

  // Cập nhật thông tin user
  const updateUserData = useCallback(async (updatedData) => {
    if (!user) return { success: false, error: 'Không có user' };
    
    try {
      const newUserData = { ...user, ...updatedData };
      await AsyncStorage.setItem('user_data', JSON.stringify(newUserData));
      setUser(newUserData);
      
      if (updatedData.totalSpent !== undefined) {
        calculateMembershipLevel(updatedData.totalSpent);
      }
      
      return { success: true, user: newUserData };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, [user, calculateMembershipLevel]);

  // Xóa guest orders
  const clearGuestOrders = useCallback(async () => {
    if (sessionId) {
      try {
        await AsyncStorage.removeItem(`guest_orders_${sessionId}`);
        setGuestOrders([]);
      } catch (error) {
        console.error('Lỗi khi xóa guest orders:', error);
      }
    }
  }, [sessionId]);

  const value = {
    user,
    userType,
    sessionId,
    sessionInfo,
    guestOrders,
    membershipLevel,
    isLoading,
    navigationReset,
    login,
    register,
    logout,
    addGuestOrder,
    updateOrderStatus,
    loginWithQR,
    setGuestSession,
    createGuestSession,
    clearGuestSession,
    refreshGuestSession,
    getSessionTimeout,
    updateUserData,
    clearGuestOrders,
    isGuest: userType === 'guest',
    isCustomer: userType === 'customer',
    isAuthenticated: !!userType,
    hasActiveSession: !!sessionId || !!user
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};