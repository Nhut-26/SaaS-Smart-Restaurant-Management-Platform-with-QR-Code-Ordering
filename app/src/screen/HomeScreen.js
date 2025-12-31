import React, { useState, useEffect } from 'react'; 
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  FlatList,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const HomeScreen = ({ navigation }) => {
  const [refreshing, setRefreshing] = useState(false);
  const [featuredItems, setFeaturedItems] = useState([
    { id: 1, name: 'Phở Bò', price: 65000, image: 'https://via.placeholder.com/300x200', category: 'Món chính' },
    { id: 2, name: 'Bún Chả', price: 55000, image: 'https://via.placeholder.com/300x200', category: 'Món chính' },
    { id: 3, name: 'Gỏi Cuốn', price: 35000, image: 'https://via.placeholder.com/300x200', category: 'Khai vị' },
  ]);
  const [promotions, setPromotions] = useState([
    { id: 1, title: 'Giảm 20% đơn đầu', description: 'Áp dụng cho lần đặt đầu tiên' },
    { id: 2, title: 'Mua 1 tặng 1', description: 'Thứ 3 hàng tuần' },
    { id: 3, title: 'Free ship', description: 'Đơn từ 200k' },
  ]);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1500);
  };

  const renderPromotion = ({ item }) => (
    <TouchableOpacity style={styles.promotionCard}>
      <View style={styles.promotionIcon}>
        <Ionicons name="pricetag" size={24} color="#FF6B35" />
      </View>
      <View style={styles.promotionContent}>
        <Text style={styles.promotionTitle}>{item.title}</Text>
        <Text style={styles.promotionDesc}>{item.description}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderMenuItem = ({ item }) => (
    <TouchableOpacity style={styles.menuItemCard}>
      <Image source={{ uri: item.image }} style={styles.menuItemImage} />
      <View style={styles.menuItemInfo}>
        <Text style={styles.menuItemName}>{item.name}</Text>
        <Text style={styles.menuItemCategory}>{item.category}</Text>
        <Text style={styles.menuItemPrice}>{item.price.toLocaleString()} đ</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <ScrollView 
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.welcome}>Chào mừng trở lại!</Text>
            <Text style={styles.userName}>Khách hàng</Text>
          </View>
          <TouchableOpacity 
            style={styles.notificationBtn}
            onPress={() => alert('Thông báo')}
          >
            <Ionicons name="notifications-outline" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => navigation.navigate('ReservationTab')}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#FF6B35' }]}>
              <Ionicons name="calendar" size={24} color="white" />
            </View>
            <Text style={styles.actionText}>Đặt bàn</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => navigation.navigate('MenuTab')}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#4ECDC4' }]}>
              <Ionicons name="restaurant" size={24} color="white" />
            </View>
            <Text style={styles.actionText}>Thực đơn</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => navigation.navigate('OrderTab')}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#45B7D1' }]}>
              <Ionicons name="cart" size={24} color="white" />
            </View>
            <Text style={styles.actionText}>Đặt món</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => navigation.navigate('ProfileTab')}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#96CEB4' }]}>
              <Ionicons name="person" size={24} color="white" />
            </View>
            <Text style={styles.actionText}>Tài khoản</Text>
          </TouchableOpacity>
        </View>

        {/* Featured Items */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Món đặc biệt</Text>
            <TouchableOpacity onPress={() => navigation.navigate('MenuTab')}>
              <Text style={styles.seeAll}>Xem tất cả</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            horizontal
            data={featuredItems}
            renderItem={renderMenuItem}
            keyExtractor={item => item.id.toString()}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.featuredList}
          />
        </View>

        {/* Promotions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Khuyến mãi</Text>
          </View>
          <FlatList
            data={promotions}
            renderItem={renderPromotion}
            keyExtractor={item => item.id.toString()}
            scrollEnabled={false}
          />
        </View>

        {/* Restaurant Info */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Thông tin nhà hàng</Text>
          
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={20} color="#FF6B35" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Giờ mở cửa</Text>
              <Text style={styles.infoValue}>08:00 - 22:00 hàng ngày</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={20} color="#FF6B35" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Địa chỉ</Text>
              <Text style={styles.infoValue}>123 Đường ABC, Quận XYZ</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="call-outline" size={20} color="#FF6B35" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Điện thoại</Text>
              <Text style={styles.infoValue}>(024) 1234 5678</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
    backgroundColor: 'white',
  },
  welcome: {
    fontSize: 14,
    color: '#666',
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  notificationBtn: {
    padding: 8,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 15,
    backgroundColor: 'white',
    margin: 15,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionCard: {
    alignItems: 'center',
  },
  actionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionText: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
  },
  section: {
    backgroundColor: 'white',
    margin: 15,
    padding: 15,
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  seeAll: {
    fontSize: 14,
    color: '#FF6B35',
    fontWeight: '500',
  },
  featuredList: {
    paddingRight: 10,
  },
  menuItemCard: {
    width: 180,
    marginRight: 15,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  menuItemImage: {
    width: '100%',
    height: 120,
    backgroundColor: '#f0f0f0',
  },
  menuItemInfo: {
    padding: 12,
  },
  menuItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  menuItemCategory: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  menuItemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  promotionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8F6',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#FFE5E0',
  },
  promotionIcon: {
    marginRight: 15,
  },
  promotionContent: {
    flex: 1,
  },
  promotionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  promotionDesc: {
    fontSize: 14,
    color: '#666',
  },
  infoCard: {
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
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 15,
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
});

export default HomeScreen;