import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

const ProfileScreen = ({ navigation }) => {
  const [user, setUser] = useState({
    name: 'Nguyễn Văn A',
    email: 'a@gmail.com',
    phone: '0981xxx',
    membership: 'VIP',
    membershipLevel: 'Kim Cương',
    points: 1500,
    nextLevelPoints: 2000,
    totalSpent: 12500000,
    favoriteRestaurants: 3,
    totalVisits: 15,
  });

  const [reservations, setReservations] = useState([
    { id: 1, date: '20/12/2024', time: '18:00', table: 'Bàn 2', status: 'Hoàn thành' },
    { id: 2, date: '25/12/2024', time: '19:30', table: 'Bàn 5', status: 'Đang chờ' },
  ]);

  const { logout: authLogout } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      'Đăng xuất',
      'Bạn có chắc chắn muốn đăng xuất?',
      [
        { text: 'Hủy', style: 'cancel' },
        { 
          text: 'Đăng xuất', 
          onPress: async () => {
            // Gọi hàm logout từ AuthContext
            await authLogout();
            // Reset navigation về Login
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
          }
        },
      ]
    );
  };

  // Tính phần trăm tiến độ
  const progressPercentage = (user.points / user.nextLevelPoints) * 100;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <Image
              source={{ uri: 'https://via.placeholder.com/100' }}
              style={styles.avatar}
            />
            <View style={styles.membershipBadge}>
              <Text style={styles.membershipText}>{user.membership}</Text>
            </View>
          </View>
          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>
          
          <View style={styles.pointsContainer}>
            <Ionicons name="star" size={20} color="#FFD700" />
            <Text style={styles.pointsText}>{user.points} điểm</Text>
          </View>
        </View>

        {/* Membership Progress */}
        <View style={styles.membershipCard}>
          <View style={styles.membershipHeader}>
            <Text style={styles.sectionTitle}>Hạng thành viên</Text>
            <View style={[styles.levelBadge, getLevelStyle(user.membershipLevel)]}>
              <Text style={styles.levelBadgeText}>{user.membershipLevel}</Text>
            </View>
          </View>
          
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View 
                style={[styles.progressFill, { width: `${Math.min(progressPercentage, 100)}%` }]} 
              />
            </View>
            <View style={styles.progressLabels}>
              <Text style={styles.progressText}>{user.points} điểm</Text>
              <Text style={styles.progressText}>{user.nextLevelPoints} điểm</Text>
            </View>
            <Text style={styles.levelText}>Cần thêm {user.nextLevelPoints - user.points} điểm để lên hạng tiếp theo</Text>
          </View>

          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Ionicons name="cash-outline" size={24} color="#FF6B35" />
              <Text style={styles.statValue}>{user.totalSpent.toLocaleString()} đ</Text>
              <Text style={styles.statLabel}>Tổng chi tiêu</Text>
            </View>
            
            <View style={styles.statDivider} />
            
            <View style={styles.statItem}>
              <Ionicons name="restaurant-outline" size={24} color="#FF6B35" />
              <Text style={styles.statValue}>{user.totalVisits}</Text>
              <Text style={styles.statLabel}>Lần ghé thăm</Text>
            </View>
            
            <View style={styles.statDivider} />
            
            <View style={styles.statItem}>
              <Ionicons name="heart-outline" size={24} color="#FF6B35" />
              <Text style={styles.statValue}>{user.favoriteRestaurants}</Text>
              <Text style={styles.statLabel}>Yêu thích</Text>
            </View>
          </View>
        </View>

        {/* Profile Info */}
        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>Thông tin cá nhân</Text>
          
          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={20} color="#666" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Họ tên</Text>
              <Text style={styles.infoValue}>{user.name}</Text>
            </View>
            <TouchableOpacity>
              <Ionicons name="pencil" size={20} color="#FF6B35" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.infoRow}>
            <Ionicons name="mail-outline" size={20} color="#666" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{user.email}</Text>
            </View>
          </View>
          
          <View style={styles.infoRow}>
            <Ionicons name="call-outline" size={20} color="#666" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Số điện thoại</Text>
              <Text style={styles.infoValue}>{user.phone}</Text>
            </View>
            <TouchableOpacity>
              <Ionicons name="pencil" size={20} color="#FF6B35" />
            </TouchableOpacity>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="medkit-outline" size={20} color="#666" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Dị ứng</Text>
              <Text style={styles.infoValue}>Đậu phộng, Hành lá</Text>
            </View>
            <TouchableOpacity>
              <Ionicons name="pencil" size={20} color="#FF6B35" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Reservations */}
        <View style={styles.reservationsCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Lịch sử đặt bàn</Text>
            <TouchableOpacity>
              <Text style={styles.seeAll}>Xem tất cả</Text>
            </TouchableOpacity>
          </View>
          
          {reservations.map((reservation) => (
            <View key={reservation.id} style={styles.reservationItem}>
              <View style={styles.reservationInfo}>
                <Text style={styles.reservationDate}>{reservation.date} • {reservation.time}</Text>
                <Text style={styles.reservationTable}>{reservation.table}</Text>
              </View>
              <View style={[
                styles.statusBadge,
                { backgroundColor: reservation.status === 'Hoàn thành' ? '#d4edda' : '#fff3cd' }
              ]}>
                <Text style={[
                  styles.statusText,
                  { color: reservation.status === 'Hoàn thành' ? '#155724' : '#856404' }
                ]}>
                  {reservation.status}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Settings */}
        <View style={styles.settingsCard}>
          <Text style={styles.sectionTitle}>Cài đặt</Text>
          
          <TouchableOpacity style={styles.settingItem}>
            <Ionicons name="notifications-outline" size={20} color="#333" />
            <Text style={styles.settingText}>Thông báo</Text>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.settingItem}>
            <Ionicons name="shield-checkmark-outline" size={20} color="#333" />
            <Text style={styles.settingText}>Bảo mật</Text>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.settingItem}>
            <Ionicons name="help-circle-outline" size={20} color="#333" />
            <Text style={styles.settingText}>Trợ giúp</Text>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#dc3545" />
          <Text style={styles.logoutText}>Đăng xuất</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

// Hàm trả về style cho từng cấp độ
const getLevelStyle = (level) => {
  switch(level) {
    case 'Sắt':
      return { backgroundColor: '#C0C0C0' };
    case 'Bạc':
      return { backgroundColor: '#A8A8A8' };
    case 'Vàng':
      return { backgroundColor: '#FFD700' };
    case 'Kim Cương':
      return { backgroundColor: '#B9F2FF' };
    default:
      return { backgroundColor: '#FF6B35' };
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  profileHeader: {
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 30,
    paddingBottom: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 15,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f0f0f0',
  },
  membershipBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#FF6B35',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  membershipText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  userEmail: {
    fontSize: 16,
    color: '#666',
    marginBottom: 15,
  },
  pointsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF0EC',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  pointsText: {
    marginLeft: 5,
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6B35',
  },
  // Membership Card Styles
  membershipCard: {
    backgroundColor: 'white',
    margin: 20,
    marginBottom: 10,
    padding: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  membershipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  levelBadge: {
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 20,
  },
  levelBadgeText: {
    color: '#333',
    fontSize: 14,
    fontWeight: 'bold',
  },
  progressContainer: {
    marginBottom: 20,
  },
  progressBar: {
    height: 10,
    backgroundColor: '#E9ECEF',
    borderRadius: 5,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FF6B35',
    borderRadius: 5,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  progressText: {
    fontSize: 12,
    color: '#666',
  },
  levelText: {
    fontSize: 14,
    color: '#FF6B35',
    textAlign: 'center',
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 15,
    borderRadius: 10,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 5,
    marginBottom: 3,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#DEE2E6',
  },
  // Existing styles
  infoCard: {
    backgroundColor: 'white',
    margin: 20,
    marginBottom: 10,
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
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoContent: {
    flex: 1,
    marginLeft: 15,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  reservationsCard: {
    backgroundColor: 'white',
    margin: 20,
    marginBottom: 10,
    padding: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  seeAll: {
    fontSize: 14,
    color: '#FF6B35',
    fontWeight: '500',
  },
  reservationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  reservationInfo: {
    flex: 1,
  },
  reservationDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  reservationTable: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  settingsCard: {
    backgroundColor: 'white',
    margin: 20,
    marginBottom: 10,
    padding: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingText: {
    flex: 1,
    marginLeft: 15,
    fontSize: 16,
    color: '#333',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    margin: 20,
    marginTop: 10,
    padding: 15,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#dc3545',
  },
  logoutText: {
    marginLeft: 10,
    fontSize: 16,
    fontWeight: '600',
    color: '#dc3545',
  },
});

export default ProfileScreen;