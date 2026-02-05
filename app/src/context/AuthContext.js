import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  supabase,
  registerUser,
  loginUser,
  forgotPassword,
  getFullUserProfile,
  updateCustomerPointsAndRank,
  getCustomerRanks,
  getCustomerInvoices,
  calculatePointsFromInvoice,
} from '../config/supabase';

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
  const [membershipLevel, setMembershipLevel] = useState('Sắt');
  const [isLoading, setIsLoading] = useState(true);
  const [tempQrData, setTempQrData] = useState(null);
  const [authError, setAuthError] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [customerRanks, setCustomerRanks] = useState([]);

  const loadCustomerRanks = useCallback(async () => {
    try {
      const result = await getCustomerRanks();
      if (result.success) {
        setCustomerRanks(result.data || []);
      }
    } catch (error) {
      console.error('Error loading customer ranks:', error);
    }
  }, []);

  const calculateMembershipLevel = useCallback((points, ranks) => {
    const accumulatedPoints = points || 0;
    const sortedRanks = [...(ranks || [])].sort((a, b) => a.rank_order - b.rank_order);

    let currentRank = sortedRanks.find(rank => rank.rank_order === 1) || { rank_name: 'Sắt' }; 
    for (const rank of sortedRanks) {
      if (accumulatedPoints >= rank.min_points_required) {
        currentRank = rank;
      } else {
        break;
      }
    }

    return currentRank.rank_name;
  }, []);

  const calculateMembershipFromPoints = useCallback((points, ranks = customerRanks) => {
    return calculateMembershipLevel(points, ranks);
  }, [calculateMembershipLevel, customerRanks]);

  const getRankDetails = useCallback((rankName) => {
    if (!customerRanks.length) return null;
    return customerRanks.find(rank => rank.rank_name === rankName) || customerRanks[0];
  }, [customerRanks]);

  const getNextRankDetails = useCallback((currentRankName) => {
    if (!customerRanks.length) return null;

    const sortedRanks = [...customerRanks].sort((a, b) => a.rank_order - b.rank_order);
    const currentRank = sortedRanks.find(rank => rank.rank_name === currentRankName);

    if (!currentRank) return null;

    return sortedRanks.find(rank => rank.rank_order === currentRank.rank_order + 1);
  }, [customerRanks]);

  const formatUserData = useCallback((profileData) => {
    const accumulatedPoints = profileData.accumulated_points || profileData.loyalty_points || 0;
    const currentRank = profileData.customer_ranks || getRankDetails(profileData.current_rank_id);
    const rankName = currentRank?.rank_name || calculateMembershipFromPoints(accumulatedPoints);

    return {
      id: profileData.id,
      profile_id: profileData.id,
      name: profileData.full_name,
      email: profileData.email,
      phone: profileData.phone,
      loyalty_points: accumulatedPoints,
      accumulated_points: accumulatedPoints,
      membership_level: rankName,
      user_type: profileData.global_role || 'customer',
      total_visits: 0,
      join_date: profileData.created_at,
      created_at: profileData.created_at,
      restaurant_visits: [],
      favorite_restaurants: [],
      favorite_cuisines: [],
      current_rank_id: profileData.current_rank_id,
      rank_info: currentRank,
      discount_percentage: currentRank?.discount_percentage || 0,
      rank_description: currentRank?.description || `Hạng ${rankName} - chưa có giảm giá`,
    };
  }, [calculateMembershipFromPoints, getRankDetails]);

  const initializeAuth = useCallback(async () => {
    try {
      setIsLoading(true);
      setAuthError(null);

      await loadCustomerRanks();

      const storedUser = await AsyncStorage.getItem('customer_data');

      if (storedUser) {
        const userData = JSON.parse(storedUser);

        try {
          const result = await getFullUserProfile(userData.id);

          if (result.success) {
            const updatedUserData = formatUserData(result.data);

            await AsyncStorage.setItem('customer_data', JSON.stringify(updatedUserData));

            setUser(updatedUserData);
            setUserType(result.data.global_role || 'customer');
            setMembershipLevel(updatedUserData.membership_level);
          } else {
            await AsyncStorage.removeItem('customer_data');
          }
        } catch (error) {
          console.error('Error verifying user:', error);
        }
      }
    } catch (error) {
      console.error('Initialize auth error:', error);
      setAuthError('Không thể khởi tạo phiên đăng nhập');
    } finally {
      setIsLoading(false);
      setIsInitialized(true);
    }
  }, [formatUserData, loadCustomerRanks]);

  const login = useCallback(async (credentials) => {
    try {
      setIsLoading(true);
      setAuthError(null);

      const { username, password } = credentials;

      const usernameClean = String(username || '').trim().toLowerCase();
      const passwordClean = String(password || '').trim();

      if (!usernameClean || !passwordClean) {
        throw new Error('Vui lòng nhập đầy đủ thông tin');
      }

      console.log('🔐 Đang đăng nhập với:', usernameClean);

      const result = await loginUser(usernameClean, passwordClean);

      if (!result.success) {
        throw new Error(result.error || 'Email hoặc mật khẩu không đúng');
      }

      const profileResult = await getFullUserProfile(result.data.profile.id);

      if (!profileResult.success) {
        throw new Error('Không thể lấy thông tin người dùng');
      }

      const userData = formatUserData(profileResult.data);

      await AsyncStorage.setItem('customer_data', JSON.stringify(userData));

      setUser(userData);
      setUserType(profileResult.data.global_role || 'customer');
      setMembershipLevel(userData.membership_level);

      if (tempQrData) {
        const qrResult = await processQrData(tempQrData);
        setTempQrData(null);
        return {
          success: true,
          user: userData,
          pendingQrResult: qrResult
        };
      }

      return { success: true, user: userData };
    } catch (error) {
      console.error('Login error:', error);
      setAuthError(error.message);
      return {
        success: false,
        error: error.message || 'Có lỗi xảy ra khi đăng nhập'
      };
    } finally {
      setIsLoading(false);
    }
  }, [formatUserData, tempQrData]);

  const register = useCallback(async (userData) => {
    try {
      setIsLoading(true);
      setAuthError(null);

      const { email, password, phone, fullName } = userData;

      if (!email || !password || !phone) {
        throw new Error('Vui lòng nhập đầy đủ thông tin bắt buộc');
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error('Email không hợp lệ');
      }

      if (password.length < 6) {
        throw new Error('Mật khẩu phải có ít nhất 6 ký tự');
      }

      console.log('📝 Đang đăng ký tài khoản với email:', email);

      const result = await registerUser({
        email: email,
        password: password,
        phone: phone,
        fullName: fullName || email.split('@')[0]
      });

      if (!result.success) {
        throw new Error(result.error || 'Đăng ký thất bại');
      }

      console.log('✅ Đăng ký thành công với email:', email);

      const profileResult = await getFullUserProfile(result.data.profile.id);

      if (!profileResult.success) {
        throw new Error('Không thể lấy thông tin người dùng');
      }

      const userDataObj = formatUserData(profileResult.data);

      await AsyncStorage.setItem('customer_data', JSON.stringify(userDataObj));

      setUser(userDataObj);
      setUserType(profileResult.data.global_role || 'customer');
      setMembershipLevel(userDataObj.membership_level);

      console.log('✅ Đăng ký thành công:', userDataObj.name);
      return { success: true, user: userDataObj };
    } catch (error) {
      console.error('Register error:', error);
      setAuthError(error.message);
      return {
        success: false,
        error: error.message || 'Có lỗi xảy ra khi đăng ký'
      };
    } finally {
      setIsLoading(false);
    }
  }, [formatUserData]);

  const updateProfile = useCallback(async (updates) => {
    if (!user) {
      throw new Error('Không có thông tin người dùng');
    }

    try {
      setIsLoading(true);
      setAuthError(null);

      console.log('🔄 Đang cập nhật thông tin người dùng');

      const validUpdates = {};
      const allowedFields = ['full_name', 'phone', 'password', 'accumulated_points', 'loyalty_points', 'global_role', 'current_rank_id'];

      Object.keys(updates).forEach(key => {
        if (allowedFields.includes(key)) {
          validUpdates[key] = updates[key];
        }
      });

      if (Object.keys(validUpdates).length === 0) {
        throw new Error('Không có trường hợp lệ để cập nhật');
      }

      if (validUpdates.phone && validUpdates.phone !== user.phone) {
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('phone', validUpdates.phone)
          .neq('id', user.id)
          .single();

        if (existingProfile) {
          throw new Error('Số điện thoại đã được sử dụng');
        }
      }

      const { data, error } = await supabase
        .from('profiles')
        .update(validUpdates)
        .eq('id', user.id)
        .select()
        .single();

      if (error) {
        throw new Error(error.message || 'Cập nhật thất bại');
      }

      const profileResult = await getFullUserProfile(user.id);

      if (!profileResult.success) {
        throw new Error('Không thể cập nhật thông tin người dùng');
      }

      const updatedUserData = formatUserData(profileResult.data);

      await AsyncStorage.setItem('customer_data', JSON.stringify(updatedUserData));

      setUser(updatedUserData);
      setMembershipLevel(updatedUserData.membership_level);

      console.log('✅ Cập nhật thành công');

      return {
        success: true,
        user: updatedUserData,
        message: 'Cập nhật thông tin thành công'
      };
    } catch (error) {
      console.error('Update profile error:', error);
      setAuthError(error.message);
      return {
        success: false,
        error: error.message || 'Có lỗi xảy ra khi cập nhật'
      };
    } finally {
      setIsLoading(false);
    }
  }, [user, formatUserData]);

  const logout = useCallback(async () => {
    try {
      setIsLoading(true);

      await AsyncStorage.removeItem('customer_data');

      setUser(null);
      setUserType(null);
      setMembershipLevel('Sắt');
      setTempQrData(null);
      setAuthError(null);

      console.log('✅ Đã đăng xuất');

      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      setAuthError(error.message);
      return {
        success: false,
        error: error.message || 'Có lỗi xảy ra khi đăng xuất'
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateUserPoints = useCallback(async (pointsToAdd, reason = '') => {
    if (!user) {
      return { success: false, error: 'Không có thông tin người dùng' };
    }

    try {
      setIsLoading(true);
      let points = pointsToAdd;
      if (points === undefined || points === null) {
        const invoicesResult = await getCustomerInvoices(user.id, 20);
        if (!invoicesResult.success) {
          throw new Error(invoicesResult.error || 'Không thể lấy invoices');
        }
        const invoices = invoicesResult.data || [];
        points = invoices.reduce((sum, inv) => sum + (calculatePointsFromInvoice(inv) || 0), 0);
        reason = reason || 'từ invoices';
      }

      const result = await updateCustomerPointsAndRank(user.id, points);

      if (result.success) {
        const profileResult = await getFullUserProfile(user.id);

        if (profileResult.success) {
          const updatedUserData = formatUserData(profileResult.data);

          await AsyncStorage.setItem('customer_data', JSON.stringify(updatedUserData));

          setUser(updatedUserData);
          setMembershipLevel(updatedUserData.membership_level);

          return {
            success: true,
            newPoints: updatedUserData.accumulated_points,
            rank: updatedUserData.rank_info,
            rankChanged: result.data?.rankChanged || false,
            message: `Bạn nhận được ${points} điểm${reason ? ` (${reason})` : ''}. Tổng điểm: ${updatedUserData.accumulated_points}`
          };
        } else {
          throw new Error('Không thể cập nhật thông tin người dùng');
        }
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Update user points error:', error);
      return {
        success: false,
        error: error.message || 'Có lỗi xảy ra khi cập nhật điểm'
      };
    } finally {
      setIsLoading(false);
    }
  }, [user, formatUserData]);

  const getCurrentRank = useCallback(() => {
    if (!user) return null;

    return user.rank_info || getRankDetails(user.membership_level);
  }, [user, getRankDetails]);

  const getNextRank = useCallback(() => {
    if (!user) return null;

    return getNextRankDetails(user.membership_level);
  }, [user, getNextRankDetails]);

  const getRankProgress = useCallback(() => {
    if (!user) return { percentage: 0, pointsNeeded: 0, currentPoints: 0 };

    const currentRank = getCurrentRank();
    const nextRank = getNextRank();
    const currentPoints = user.accumulated_points || 0;

    if (!currentRank || !nextRank) {
      return { percentage: 100, pointsNeeded: 0, currentPoints };
    }

    const currentMinPoints = currentRank.min_points_required || 0;
    const nextMinPoints = nextRank.min_points_required || currentMinPoints + 1;

    if (nextMinPoints <= currentMinPoints) {
      return { percentage: 100, pointsNeeded: 0, currentPoints };
    }

    const progress = ((currentPoints - currentMinPoints) / (nextMinPoints - currentMinPoints)) * 100;
    const pointsNeeded = nextMinPoints - currentPoints;

    return {
      percentage: Math.min(Math.max(progress, 0), 100),
      pointsNeeded: Math.max(pointsNeeded, 0),
      currentPoints
    };
  }, [user, getCurrentRank, getNextRank]);

  const processQrData = useCallback(async (qrData) => {
    try {
      console.log('📱 Xử lý mã QR:', qrData);

      if (!user) {
        setTempQrData(qrData);
        return {
          success: false,
          requiresLogin: true,
          message: 'Vui lòng đăng nhập để tiếp tục',
          qrData: qrData
        };
      }

      const restaurantData = {
        id: qrData.restaurantId || 'unknown',
        name: qrData.restaurantName || 'Nhà hàng',
        table_id: qrData.tableId || '1',
        scanned_at: new Date().toISOString(),
        tableId: qrData.tableId || '1'
      };

      const result = await updateUserPoints(10, 'quét mã QR');

      if (result.success) {
        return {
          success: true,
          message: 'Quét mã thành công! Bạn nhận được 10 điểm tích lũy',
          restaurant: restaurantData,
          pointsAdded: 10,
          navigationData: {
            screen: 'Menu',
            params: {
              restaurant: {
                id: qrData.restaurantId,
                name: qrData.restaurantName,
                category: qrData.category || 'default',
                type: qrData.restaurantType || 'Nhà hàng',
                tableId: qrData.tableId
              }
            }
          }
        };
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Process QR data error:', error);
      return {
        success: false,
        error: error.message || 'Lỗi xử lý mã QR'
      };
    }
  }, [user, updateUserPoints]);

  const addRestaurantVisit = useCallback(async (restaurantData) => {
    if (!user) {
      return { success: false, error: 'Không có thông tin người dùng' };
    }

    try {
      const currentVisits = user.restaurant_visits || [];

      const existingVisitIndex = currentVisits.findIndex(
        visit => visit.id === restaurantData.id
      );

      let updatedVisits;

      if (existingVisitIndex >= 0) {
        updatedVisits = [...currentVisits];
        updatedVisits[existingVisitIndex] = {
          ...restaurantData,
          last_visit: new Date().toISOString(),
          visit_count: (currentVisits[existingVisitIndex].visit_count || 1) + 1
        };
      } else {
        updatedVisits = [
          ...currentVisits,
          {
            ...restaurantData,
            first_visit: new Date().toISOString(),
            last_visit: new Date().toISOString(),
            visit_count: 1
          }
        ];
      }

      const updatedUserData = {
        ...user,
        restaurant_visits: updatedVisits,
        total_visits: (user.total_visits || 0) + 1,
      };

      await AsyncStorage.setItem('customer_data', JSON.stringify(updatedUserData));

      setUser(updatedUserData);

      return {
        success: true,
        message: 'Đã thêm vào lịch sử ghé thăm'
      };
    } catch (error) {
      console.error('Add restaurant visit error:', error);
      return {
        success: false,
        error: error.message || 'Có lỗi xảy ra'
      };
    }
  }, [user]);

  const toggleFavoriteRestaurant = useCallback(async (restaurantId) => {
    if (!user) {
      return { success: false, error: 'Không có thông tin người dùng' };
    }

    try {
      const favorites = user.favorite_restaurants || [];
      const isFavorite = favorites.includes(restaurantId);

      let newFavorites;
      if (isFavorite) {
        newFavorites = favorites.filter(id => id !== restaurantId);
      } else {
        newFavorites = [...favorites, restaurantId];
      }

      const updatedUserData = {
        ...user,
        favorite_restaurants: newFavorites
      };

      await AsyncStorage.setItem('customer_data', JSON.stringify(updatedUserData));

      setUser(updatedUserData);

      return {
        success: true,
        isFavorite: !isFavorite,
        message: isFavorite ? 'Đã xóa khỏi danh sách yêu thích' : 'Đã thêm vào danh sách yêu thích'
      };
    } catch (error) {
      console.error('Toggle favorite error:', error);
      return {
        success: false,
        error: error.message || 'Có lỗi xảy ra'
      };
    }
  }, [user]);

  const checkAndProcessPendingQr = useCallback(async () => {
    if (tempQrData && user) {
      console.log('🔄 Xử lý mã QR đang chờ...');
      const result = await processQrData(tempQrData);
      setTempQrData(null);
      return result;
    }
    return null;
  }, [tempQrData, user, processQrData]);

  const getUserStats = useCallback(() => {
    if (!user) return null;

    const currentRank = getCurrentRank();
    const rankProgress = getRankProgress();

    return {
      orders: 0,
      restaurants: user.restaurant_visits?.length || 0,
      reviews: 0,
      points: user.accumulated_points || user.loyalty_points || 0,
      membership: user.membership_level || 'Sắt',
      joinDate: user.join_date ? new Date(user.join_date).toLocaleDateString('vi-VN') : 'Chưa xác định',
      discount: currentRank?.discount_percentage || 0,
      rankDescription: currentRank?.description || `Hạng ${user.membership_level} - chưa có giảm giá`,
      rankProgress: rankProgress.percentage,
      pointsNeeded: rankProgress.pointsNeeded,
    };
  }, [user, getCurrentRank, getRankProgress]);

  const getAllCustomerRanks = useCallback(() => {
    return customerRanks.sort((a, b) => a.rank_order - b.rank_order);
  }, [customerRanks]);

  const clearAuthError = useCallback(() => {
    setAuthError(null);
  }, []);

  const resetPassword = useCallback(async (email) => {
    try {
      setIsLoading(true);

      const result = await forgotPassword(email);

      if (!result.success) {
        throw new Error(result.error || 'Không thể yêu cầu đặt lại mật khẩu');
      }

      return {
        success: true,
        data: result.data,
        message: 'Mật khẩu đã được gửi về email của bạn'
      };
    } catch (error) {
      console.error('Reset password error:', error);
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshUserData = useCallback(async () => {
    if (!user) return { success: false, error: 'Không có thông tin người dùng' };

    try {
      setIsLoading(true);

      const result = await getFullUserProfile(user.id);

      if (result.success) {
        const updatedUserData = formatUserData(result.data);

        await AsyncStorage.setItem('customer_data', JSON.stringify(updatedUserData));

        setUser(updatedUserData);
        setMembershipLevel(updatedUserData.membership_level);

        return { success: true, user: updatedUserData };
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Refresh user data error:', error);
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  }, [user, formatUserData]);

  const getMembershipBenefits = useCallback(() => {
    const level = membershipLevel;
    const currentRank = getCurrentRank();

    if (currentRank && currentRank.description) {
      return [currentRank.description];
    }

    const benefits = {
      'Kim Cương': [
        'Giảm 15-20% tất cả hóa đơn',
        'Ưu tiên đặt bàn',
        'Tích điểm x3',
        'Quà tặng sinh nhật đặc biệt',
        'Miễn phí giao hàng',
      ],
      'Vàng': [
        'Giảm 10-15% tất cả hóa đơn',
        'Ưu tiên đặt bàn',
        'Tích điểm x2',
        'Quà tặng sinh nhật',
      ],
      'Bạc': [
        'Giảm 5-10% tất cả hóa đơn',
        'Tích điểm x1.5',
        'Quà tặng sinh nhật',
      ],
      'Đồng': [
        'Giảm 5% tất cả hóa đơn',
        'Tích điểm x1.2',
      ],
      'Sắt': [
        'Giảm 5% tại một số nhà hàng',
        'Tích điểm theo giá trị',
      ],
    };
    return benefits[level] || benefits['Sắt'];
  }, [membershipLevel, getCurrentRank]);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  const value = {
    customerRanks,
    loadCustomerRanks,
    user,
    userType,
    membershipLevel,
    isLoading,
    authError,
    isInitialized,
    tempQrData,

    login,
    register,
    logout,
    updateProfile,
    resetPassword,
    refreshUserData,

    addRestaurantVisit,
    toggleFavoriteRestaurant,
    updateUserPoints,
    getUserStats,

    processQrData,
    checkAndProcessPendingQr,

    getCurrentRank,
    getNextRank,
    getRankProgress,
    getAllCustomerRanks,
    getMembershipBenefits,

    clearAuthError,

    isCustomer: userType === 'customer',
    isAdmin: userType === 'admin' || userType === 'manager',
    isAuthenticated: !!user,

    getMembershipBenefits,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
