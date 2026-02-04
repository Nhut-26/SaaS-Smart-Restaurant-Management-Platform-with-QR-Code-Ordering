import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { supabase, getCustomerRanks } from '../config/supabase';

const ProfileScreen = ({ navigation }) => {
  const { user, logout, updateProfile, membershipLevel, getUserStats } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editField, setEditField] = useState('');
  const [editValue, setEditValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [allRanks, setAllRanks] = useState([]);
  const [stats, setStats] = useState({
    orders: 0,
    restaurants: 0,
    reviews: 0,
    points: 0,
  });
  const [orders, setOrders] = useState([]);
  const [orderHistoryTab, setOrderHistoryTab] = useState('all');
  const [paymentHistory, setPaymentHistory] = useState([]);

  useEffect(() => {
    if (user) {
      loadUserProfile();
      fetchUserStats();
      fetchCustomerRanks();
    }
  }, [user]);

  const loadUserProfile = () => {
    setUserProfile({
      name: user.name || user.full_name || 'Người dùng',
      email: user.email || 'Chưa có email',
      phone: user.phone || 'Chưa có số điện thoại',
      membershipLevel: user.rank_info?.rank_name || membershipLevel || 'Thành viên',
      points: user.accumulated_points || user.loyalty_points || 0,
      joinDate: user.join_date ? new Date(user.join_date).toLocaleDateString('vi-VN') : 'Chưa xác định',
      rankInfo: user.rank_info,
      currentRankId: user.current_rank_id,
      discountPercentage: user.rank_info?.discount_percentage || 0,
      rankDescription: user.rank_info?.description || `Hạng ${user.rank_info?.rank_name || membershipLevel} - chưa có giảm giá`,
    });
  };

  const fetchCustomerRanks = async () => {
    try {
      const result = await getCustomerRanks();
      if (result.success) {
        setAllRanks(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching customer ranks:', error);
    }
  };

  const fetchUserStats = async () => {
    if (!user) return;

    try {
      setLoading(true);

      const { count: ordersCount } = await supabase
        .from('payments')
        .select('*', { count: 'exact', head: true })
        .eq('customer_id', user.id)
        .eq('direction', 'in')
        .eq('status', 'completed');

      const restaurantVisits = user.restaurant_visits || [];

      const { count: reviewsCount } = await supabase
        .from('reviews')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      setStats({
        orders: ordersCount || 0,
        restaurants: restaurantVisits.length || 0,
        reviews: reviewsCount || 0,
        points: user.accumulated_points || user.loyalty_points || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      setStats({
        orders: 0,
        restaurants: 0,
        reviews: 0,
        points: user.accumulated_points || user.loyalty_points || 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Đăng xuất',
      'Bạn có chắc chắn muốn đăng xuất?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Đăng xuất',
          style: 'destructive',
          onPress: () => logout()
        }
      ]
    );
  };

  const handleEdit = (field, value) => {
    setEditField(field);
    setEditValue(value);
    setEditModalVisible(true);
  };

  const saveEdit = async () => {
    if (!editValue.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập thông tin');
      return;
    }

    try {
      setLoading(true);

      const fieldMap = {
        'name': 'full_name',
        'phone': 'phone',
      };

      const dbField = fieldMap[editField];
      if (!dbField) {
        throw new Error('Field không hợp lệ');
      }

      const result = await updateProfile({ [dbField]: editValue });

      if (result.success) {
        setUserProfile(prev => ({
          ...prev,
          [editField]: editValue
        }));

        setEditModalVisible(false);
        Alert.alert('Thành công', 'Đã cập nhật thông tin');
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Save edit error:', error);
      Alert.alert('Lỗi', error.message || 'Có lỗi xảy ra khi cập nhật');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentAndNextRank = () => {
    if (!allRanks.length || !userProfile) return { currentRank: null, nextRank: null };

    const currentRank = allRanks.find(rank => rank.id === userProfile.currentRankId) ||
                       allRanks.find(rank => rank.rank_name === userProfile.membershipLevel) ||
                       null;

    let nextRank = null;
    if (currentRank) {
      nextRank = allRanks.find(rank => rank.rank_order > currentRank.rank_order);
    } else {
      nextRank = allRanks.find(rank => rank.rank_order === 1);
    }

    return { currentRank, nextRank };
  };

  const getProgressPercentage = () => {
    const { currentRank, nextRank } = getCurrentAndNextRank();
    const currentPoints = userProfile?.points || 0;

    if (!currentRank || !nextRank) return 0;

    const currentMinPoints = currentRank.min_points_required;
    const nextMinPoints = nextRank.min_points_required;

    if (nextMinPoints <= currentMinPoints) return 100;

    const progress = ((currentPoints - currentMinPoints) / (nextMinPoints - currentMinPoints)) * 100;
    return Math.min(Math.max(progress, 0), 100);
  };

  const getMembershipColor = () => {
    const level = userProfile?.membershipLevel;
    if (!level) return '#FF6B35';

    const levelLower = level.toLowerCase();
    if (levelLower.includes('kim cương') || levelLower.includes('diamond')) return '#e0e0e0';
    if (levelLower.includes('vàng') || levelLower.includes('gold')) return '#FFD700';
    if (levelLower.includes('bạc') || levelLower.includes('silver')) return '#C0C0C0';
    if (levelLower.includes('đồng') || levelLower.includes('bronze')) return '#CD7F32';
    if (levelLower.includes('sắt') || levelLower.includes('iron')) return '#8B4513';
    return '#FF6B35';
  };

  const getMembershipIcon = () => {
    const level = userProfile?.membershipLevel;
    if (!level) return '👑';

    const levelLower = level.toLowerCase();
    if (levelLower.includes('kim cương') || levelLower.includes('diamond')) return '💎';
    if (levelLower.includes('vàng') || levelLower.includes('gold')) return '🥇';
    if (levelLower.includes('bạc') || levelLower.includes('silver')) return '🥈';
    if (levelLower.includes('đồng') || levelLower.includes('bronze')) return '🥉';
    if (levelLower.includes('sắt') || levelLower.includes('iron')) return '🔩';
    return '👑';
  };

  const renderProfile = () => {
    if (!userProfile) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B35" />
          <Text style={styles.loadingText}>Đang tải thông tin...</Text>
        </View>
      );
    }

    const { currentRank, nextRank } = getCurrentAndNextRank();
    const progressPercentage = getProgressPercentage();

    return (
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* User Info Card */}
        <View style={styles.userCard}>
          <View style={styles.userHeader}>
            <Image
              source={{ uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile.name)}&background=FF6B35&color=fff&size=100` }}
              style={styles.userAvatar}
            />
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{userProfile.name}</Text>
              <View style={[styles.membershipBadge, { backgroundColor: getMembershipColor() + '20' }]}>
                <Text style={styles.membershipText}>
                  {getMembershipIcon()} {userProfile.membershipLevel}
                </Text>
              </View>
              <Text style={styles.userPoints}>{userProfile.points.toLocaleString()} điểm tích lũy</Text>
            </View>
          </View>

          <View style={styles.userStats}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.orders}</Text>
              <Text style={styles.statLabel}>Đơn hàng</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.restaurants}</Text>
              <Text style={styles.statLabel}>Nhà hàng</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.reviews}</Text>
              <Text style={styles.statLabel}>Đánh giá</Text>
            </View>
          </View>
        </View>

        {/* Rank Information */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Thông tin hạng thành viên</Text>

          <View style={styles.rankInfoContainer}>
            <View style={styles.rankBadgeLarge}>
              <Text style={styles.rankIconLarge}>{getMembershipIcon()}</Text>
              <Text style={styles.rankNameLarge}>{userProfile.membershipLevel}</Text>
            </View>

            <View style={styles.rankDescriptionCard}>
              <Text style={styles.rankDescriptionTitle}>🎯 Thông báo thành viên</Text>
              <Text style={styles.rankDescriptionText}>
                Bạn đang là thành viên <Text style={styles.highlight}>{userProfile.membershipLevel}</Text> với số điểm hiện tại của bạn là <Text style={styles.highlight}>{userProfile.points.toLocaleString()} điểm</Text>.
              </Text>
              <Text style={styles.rankDescriptionText}>
                {userProfile.rankDescription}
              </Text>
            </View>

            {currentRank && (
              <View style={styles.rankDetails}>
                {currentRank.discount_percentage > 0 && (
                  <View style={styles.rankDetailItem}>
                    <Ionicons name="pricetag" size={20} color="#28a745" />
                    <Text style={styles.rankDetailText}>
                      Giảm giá: {currentRank.discount_percentage}% tất cả hóa đơn
                    </Text>
                  </View>
                )}
                <View style={styles.rankDetailItem}>
                  <Ionicons name="cash" size={20} color="#28a745" />
                  <Text style={styles.rankDetailText}>
                    Điểm yêu cầu: {currentRank.min_points_required?.toLocaleString() || 0} điểm
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Rank Progress */}
        {nextRank && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Tiến độ lên hạng</Text>

            <View style={styles.rankProgressContainer}>
              <View style={styles.rankProgressHeader}>
                <Text style={styles.currentRankText}>Hạng hiện tại: {userProfile.membershipLevel}</Text>
                <Text style={styles.nextRankText}>Hạng tiếp theo: {nextRank.rank_name}</Text>
              </View>

              <View style={styles.progressBarContainer}>
                <View
                  style={[
                    styles.progressBar,
                    { width: `${progressPercentage}%`, backgroundColor: getMembershipColor() }
                  ]}
                />
              </View>

              <View style={styles.pointsInfo}>
                <Text style={styles.pointsCurrent}>
                  {userProfile.points.toLocaleString()} điểm
                </Text>
                <Text style={styles.pointsNeeded}>
                  Cần thêm {(nextRank.min_points_required - userProfile.points).toLocaleString()} điểm
                </Text>
                <Text style={styles.pointsNext}>
                  {nextRank.min_points_required.toLocaleString()} điểm
                </Text>
              </View>

              <View style={styles.nextRankBenefits}>
                <Text style={styles.nextRankTitle}>Ưu đãi khi lên hạng {nextRank.rank_name}:</Text>
                {nextRank.description && (
                  <Text style={styles.nextRankDescription}>{nextRank.description}</Text>
                )}
                {nextRank.discount_percentage > 0 && (
                  <Text style={styles.nextRankBenefit}>
                    ✓ Giảm {nextRank.discount_percentage}% tất cả hóa đơn
                  </Text>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Personal Info */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Thông tin cá nhân</Text>
          <View style={styles.infoList}>
            <View style={styles.infoItem}>
              <Ionicons name="person" size={20} color="#666" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Tên đăng nhập</Text>
                <Text style={styles.infoValue}>{user?.email || user?.username || 'N/A'}</Text>
              </View>
            </View>

            <View style={styles.infoItem}>
              <Ionicons name="mail" size={20} color="#666" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>{userProfile.email}</Text>
              </View>
            </View>

            <View style={styles.infoItem}>
              <Ionicons name="call" size={20} color="#666" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Số điện thoại</Text>
                <Text style={styles.infoValue}>{userProfile.phone}</Text>
              </View>
              <TouchableOpacity onPress={() => handleEdit('phone', userProfile.phone)}>
                <Ionicons name="create-outline" size={20} color="#FF6B35" />
              </TouchableOpacity>
            </View>

            <View style={styles.infoItem}>
              <Ionicons name="calendar" size={20} color="#666" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Tham gia từ</Text>
                <Text style={styles.infoValue}>{userProfile.joinDate}</Text>
              </View>
            </View>

            <View style={styles.infoItem}>
              <Ionicons name="trophy" size={20} color="#666" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Hạng thành viên</Text>
                <Text style={styles.infoValue}>{userProfile.membershipLevel}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Points History */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Lịch sử tích điểm</Text>
          <View style={styles.pointsHistory}>
            {paymentHistory.length > 0 ? (
              paymentHistory.slice(0, 5).map((payment, index) => (
                <View key={payment.id} style={styles.pointItem}>
                  <View style={styles.pointIconContainer}>
                    <Ionicons name="restaurant" size={24} color="#FF6B35" />
                  </View>
                  <View style={styles.pointDetails}>
                    <Text style={styles.pointTitle}>
                      {payment.bookings?.restaurants?.name || 'Nhà hàng'}
                      {payment.bookings?.tables && ` - ${payment.bookings.tables.table_name}`}
                    </Text>
                    <Text style={styles.pointDate}>
                      {new Date(payment.created_at).toLocaleDateString('vi-VN')}
                    </Text>
                  </View>
                  <View style={styles.pointAmountContainer}>
                    <Text style={styles.pointAmount}>+{Math.floor(payment.amount_actual / 10000)} điểm</Text>
                    <Text style={styles.pointMoney}>{payment.amount_actual.toLocaleString()} ₫</Text>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyPoints}>
                <Ionicons name="cash-outline" size={40} color="#ccc" />
                <Text style={styles.emptyPointsText}>Chưa có lịch sử tích điểm</Text>
                <Text style={styles.emptyPointsSubtext}>Mỗi 10,000₫ thanh toán = 1 điểm</Text>
              </View>
            )}
          </View>

          {paymentHistory.length > 5 && (
            <TouchableOpacity
              style={styles.viewAllButton}
              onPress={() => navigation.navigate('PointsHistory')}
            >
              <Text style={styles.viewAllButtonText}>Xem tất cả lịch sử tích điểm</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Actions */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Tài khoản</Text>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="notifications" size={20} color="#666" />
            <Text style={styles.actionText}>Thông báo</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="lock-closed" size={20} color="#666" />
            <Text style={styles.actionText}>Đổi mật khẩu</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('OrderTracking')}
          >
            <Ionicons name="receipt" size={20} color="#666" />
            <Text style={styles.actionText}>Theo dõi đơn hàng</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="help-circle" size={20} color="#666" />
            <Text style={styles.actionText}>Trợ giúp & Hỗ trợ</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handleLogout}>
            <Ionicons name="log-out" size={20} color="#FF6B35" />
            <Text style={[styles.actionText, { color: '#FF6B35' }]}>Đăng xuất</Text>
          </TouchableOpacity>
        </View>

        {/* App Info */}
        <View style={styles.appInfoCard}>
          <Text style={styles.appInfoText}>Phiên bản 1.0.0</Text>
          <Text style={styles.appInfoText}>© 2024 Nhà Hàng Thông Minh</Text>
        </View>
      </ScrollView>
    );
  };

  const renderOrderHistory = () => {
    const filteredOrders = orders.filter(order => {
      if (orderHistoryTab === 'pending') return order.status === 'pending';
      if (orderHistoryTab === 'completed') return order.status === 'completed';
      return true;
    });

    return (
      <View style={styles.orderHistoryContainer}>
        {/* Order Tabs */}
        <View style={styles.orderTabs}>
          <TouchableOpacity
            style={[styles.orderTab, orderHistoryTab === 'all' && styles.activeOrderTab]}
            onPress={() => setOrderHistoryTab('all')}
          >
            <Text style={[styles.orderTabText, orderHistoryTab === 'all' && styles.activeOrderTabText]}>Tất cả</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.orderTab, orderHistoryTab === 'pending' && styles.activeOrderTab]}
            onPress={() => setOrderHistoryTab('pending')}
          >
            <Text style={[styles.orderTabText, orderHistoryTab === 'pending' && styles.activeOrderTabText]}>Đang xử lý</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.orderTab, orderHistoryTab === 'completed' && styles.activeOrderTab]}
            onPress={() => setOrderHistoryTab('completed')}
          >
            <Text style={[styles.orderTabText, orderHistoryTab === 'completed' && styles.activeOrderTabText]}>Hoàn thành</Text>
          </TouchableOpacity>
        </View>

        {/* Orders List */}
        <ScrollView style={styles.ordersList}>
          {filteredOrders.length > 0 ? (
            filteredOrders.map(order => (
              <View key={order.id} style={styles.orderCard}>
                <View style={styles.orderHeader}>
                  <Text style={styles.orderId}>Đơn hàng #{order.id.substring(0, 8)}</Text>
                  <View style={[
                    styles.orderStatus,
                    order.status === 'completed' ? styles.statusCompleted :
                    order.status === 'pending' ? styles.statusPending :
                    styles.statusCancelled
                  ]}>
                    <Text style={styles.orderStatusText}>
                      {order.status === 'completed' ? 'Hoàn thành' :
                       order.status === 'pending' ? 'Đang xử lý' :
                       'Đã hủy'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.orderDate}>
                  {new Date(order.created_at).toLocaleDateString('vi-VN')}
                </Text>
                <Text style={styles.orderTotal}>
                  Tổng tiền: {order.total_amount ? order.total_amount.toLocaleString('vi-VN') : '0'} ₫
                </Text>
                <TouchableOpacity style={styles.orderDetailButton}>
                  <Text style={styles.orderDetailText}>Xem chi tiết</Text>
                </TouchableOpacity>
              </View>
            ))
          ) : (
            <View style={styles.emptyOrders}>
              <Ionicons name="receipt-outline" size={60} color="#ccc" />
              <Text style={styles.emptyOrdersText}>Chưa có đơn hàng nào</Text>
              <TouchableOpacity
                style={styles.browseRestaurantsButton}
                onPress={() => navigation.navigate('MainTabs', { screen: 'RestaurantTab' })}
              >
                <Text style={styles.browseRestaurantsText}>Khám phá nhà hàng</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Tài khoản</Text>
        <TouchableOpacity onPress={() => handleEdit('name', userProfile?.name || '')}>
          <Ionicons name="create-outline" size={24} color="#FF6B35" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'profile' && styles.activeTab]}
          onPress={() => setActiveTab('profile')}
        >
          <Text style={[styles.tabText, activeTab === 'profile' && styles.activeTabText]}>Thông tin</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'orders' && styles.activeTab]}
          onPress={() => setActiveTab('orders')}
        >
          <Text style={[styles.tabText, activeTab === 'orders' && styles.activeTabText]}>Đơn hàng</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'profile' ? renderProfile() : renderOrderHistory()}

      {/* Edit Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Chỉnh sửa {editField === 'name' ? 'họ tên' : 'số điện thoại'}
              </Text>
              <TouchableOpacity
                onPress={() => setEditModalVisible(false)}
                disabled={loading}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.editInput}
              value={editValue}
              onChangeText={setEditValue}
              placeholder={`Nhập ${editField === 'name' ? 'họ tên mới' : 'số điện thoại mới'}`}
              autoFocus
              editable={!loading}
              keyboardType={editField === 'phone' ? 'phone-pad' : 'default'}
              maxLength={editField === 'phone' ? 11 : undefined}
            />

            {editField === 'phone' && (
              <Text style={styles.noteText}>
              </Text>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setEditModalVisible(false)}
                disabled={loading}
              >
                <Text style={styles.cancelButtonText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton, loading && styles.buttonDisabled]}
                onPress={saveEdit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Lưu</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingTop: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginRight: 10,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#FF6B35',
  },
  tabText: {
    fontSize: 16,
    color: '#666',
  },
  activeTabText: {
    color: '#FF6B35',
    fontWeight: '600',
  },
  userCard: {
    backgroundColor: 'white',
    margin: 15,
    padding: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  userAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f0f0f0',
  },
  userInfo: {
    flex: 1,
    marginLeft: 15,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  membershipBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 8,
  },
  membershipText: {
    color: '#FF6B35',
    fontSize: 14,
    fontWeight: '600',
  },
  userPoints: {
    fontSize: 14,
    color: '#666',
  },
  userStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#f0f0f0',
  },
  sectionCard: {
    backgroundColor: 'white',
    margin: 15,
    marginTop: 0,
    padding: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  rankInfoContainer: {
    marginTop: 5,
  },
  rankBadgeLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF0EC',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
  },
  rankIconLarge: {
    fontSize: 28,
    marginRight: 10,
  },
  rankNameLarge: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  rankDescriptionCard: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  rankDescriptionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  rankDescriptionText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginBottom: 8,
  },
  highlight: {
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  rankDetails: {
    marginTop: 10,
  },
  rankDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  rankDetailText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 10,
  },
  rankProgressContainer: {
    marginTop: 5,
  },
  rankProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  currentRankText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  nextRankText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF6B35',
  },
  progressBarContainer: {
    height: 10,
    backgroundColor: '#e0e0e0',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressBar: {
    height: '100%',
    borderRadius: 5,
  },
  pointsInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  pointsCurrent: {
    fontSize: 12,
    color: '#666',
  },
  pointsNeeded: {
    fontSize: 12,
    color: '#FF6B35',
    fontWeight: '600',
  },
  pointsNext: {
    fontSize: 12,
    color: '#666',
  },
  nextRankBenefits: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 10,
  },
  nextRankTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  nextRankDescription: {
    fontSize: 13,
    color: '#666',
    marginBottom: 10,
    lineHeight: 18,
  },
  nextRankBenefit: {
    fontSize: 13,
    color: '#28a745',
    marginLeft: 5,
  },
  infoList: {
    gap: 15,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoContent: {
    flex: 1,
    marginLeft: 15,
  },
  infoLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  pointsHistory: {
    gap: 15,
  },
  pointItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
  },
  pointIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF0EC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  pointDetails: {
    flex: 1,
  },
  pointTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  pointDate: {
    fontSize: 12,
    color: '#999',
  },
  pointAmountContainer: {
    alignItems: 'flex-end',
  },
  pointAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#28a745',
  },
  pointMoney: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  emptyPoints: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  emptyPointsText: {
    fontSize: 16,
    color: '#999',
    marginTop: 15,
    marginBottom: 5,
  },
  emptyPointsSubtext: {
    fontSize: 14,
    color: '#ccc',
    textAlign: 'center',
  },
  viewAllButton: {
    marginTop: 15,
    paddingVertical: 10,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  viewAllButtonText: {
    color: '#FF6B35',
    fontSize: 14,
    fontWeight: '600',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  actionText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 15,
  },
  appInfoCard: {
    backgroundColor: 'white',
    margin: 15,
    marginTop: 0,
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  appInfoText: {
    fontSize: 12,
    color: '#999',
    marginBottom: 5,
  },
  orderHistoryContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  orderTabs: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingHorizontal: 15,
    paddingTop: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  orderTab: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 10,
  },
  activeOrderTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#FF6B35',
  },
  orderTabText: {
    fontSize: 14,
    color: '#666',
  },
  activeOrderTabText: {
    color: '#FF6B35',
    fontWeight: '600',
  },
  ordersList: {
    flex: 1,
    padding: 15,
  },
  orderCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderId: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  orderStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusCompleted: {
    backgroundColor: '#d4edda',
  },
  statusPending: {
    backgroundColor: '#fff3cd',
  },
  statusCancelled: {
    backgroundColor: '#f8d7da',
  },
  orderStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  orderDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  orderTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B35',
    marginBottom: 12,
  },
  orderDetailButton: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
  },
  orderDetailText: {
    fontSize: 14,
    color: '#666',
  },
  emptyOrders: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyOrdersText: {
    fontSize: 16,
    color: '#999',
    marginTop: 15,
    marginBottom: 25,
  },
  browseRestaurantsButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  browseRestaurantsText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    width: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 10,
  },
  editInput: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 10,
  },
  noteText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 20,
    fontStyle: 'italic',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  saveButton: {
    backgroundColor: '#FF6B35',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ProfileScreen;
