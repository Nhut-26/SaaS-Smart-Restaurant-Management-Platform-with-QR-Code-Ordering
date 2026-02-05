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
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { getRestaurants, getBestSellerItems, getCustomerRanks, WHITE_IMAGE } from '../config/supabase';

const HomeScreen = ({ navigation }) => {
  const { user, membershipLevel, customerRanks: authCustomerRanks, loadCustomerRanks } = useAuth();

  const [refreshing, setRefreshing] = useState(false);
  const [loadingRestaurants, setLoadingRestaurants] = useState(true);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [loadingRanks, setLoadingRanks] = useState(false);

  const [favoriteRestaurants, setFavoriteRestaurants] = useState([]);
  const [nearbyRestaurants, setNearbyRestaurants] = useState([]);
  const [bestSellers, setBestSellers] = useState([]);
  const [loadingBestSellers, setLoadingBestSellers] = useState(false);

  useEffect(() => {
    loadRestaurants();
    const initRanks = async () => {
      setLoadingRanks(true);
      try {
        await loadCustomerRanks();
      } finally {
        setLoadingRanks(false);
      }
    };

    initRanks();
  }, []);

  const loadRestaurants = async () => {
    try {
      setLoadingRestaurants(true);

      const result = await getRestaurants();

      if (result.success) {
        const restaurants = result.data;
        const favorites = restaurants
          .sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0))
          .slice(0, 3);

        setFavoriteRestaurants(favorites);
        setNearbyRestaurants(restaurants);

        if (restaurants.length > 0) {
          loadBestSellers(restaurants[0].id);
        }

        console.log('✅ Đã tải', restaurants.length, 'nhà hàng từ Supabase');
      } else {
        console.log('⚠️ Dùng fallback do lỗi:', result.error);
        setFavoriteRestaurants([]);
        setNearbyRestaurants([]);
      }
    } catch (err) {
      console.log('⚠️ Dùng fallback do exception:', err.message);
      setFavoriteRestaurants([]);
      setNearbyRestaurants([]);
    } finally {
      setLoadingRestaurants(false);
      setRefreshing(false);
    }
  };

  const customerRanks = authCustomerRanks || [];

  const loadBestSellers = async (restaurantId) => {
    try {
      setLoadingBestSellers(true);
      const result = await getBestSellerItems(restaurantId);

      if (result.success && Array.isArray(result.data)) {
        setBestSellers(result.data.slice(0, 3));
      } else {
        setBestSellers([]);
      }
    } catch (error) {
      console.error('Lỗi khi lấy món bán chạy:', error);
      setBestSellers([]);
    } finally {
      setLoadingBestSellers(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadRestaurants();
  };

  const handleQRScan = () => {
    navigation.navigate('QrScanner');
  };

  const renderRestaurant = ({ item, isFavorite = false }) => (
    <TouchableOpacity
      style={styles.restaurantCard}
      onPress={() => navigation.navigate('RestaurantDetail', {
        restaurant: {
          id: item.id,
          name: item.name,
          rating: item.average_rating || item.rating,
          address: item.address,
          type: item.cuisine_type || item.type,
          category: item.cuisine_type || item.category,
          image: item.image_url || item.image || WHITE_IMAGE,
          price_range: item.price_range,
          openingHours: item.openingHours || '08:00 - 22:00',
          phone: item.phone || '(028) 1234 5678',
          description: item.description,
          features: item.features,
          signatureDish: item.signatureDish,
          popularItems: item.popularItems,
        }
      })}
    >
      <Image
        source={{ uri: item.image_url || item.image || WHITE_IMAGE }}
        style={styles.restaurantImage}
      />
      {isFavorite && (
        <View style={styles.favoriteBadge}>
          <Ionicons name="heart" size={14} color="white" />
        </View>
      )}
      <View style={styles.restaurantInfo}>
        <Text style={styles.restaurantName}>{item.name}</Text>
        <View style={styles.ratingContainer}>
          <Ionicons name="star" size={14} color="#FFD700" />
          <Text style={styles.ratingText}>{item.average_rating || item.rating || 4.0}</Text>
          <Text style={styles.restaurantCategory}>• {item.cuisine_type || item.type || 'Nhà hàng'}</Text>
        </View>
        <Text style={styles.restaurantAddress}>{item.address || 'Địa chỉ đang cập nhật'}</Text>
      </View>
    </TouchableOpacity>
  );



  const renderMembershipInfo = () => {
    const getMembershipColor = () => {
      switch (membershipLevel) {
        case 'Kim Cương': return '#e0e0e0';
        case 'Vàng': return '#FFD700';
        case 'Bạc': return '#C0C0C0';
        case 'Sắt': return '#8B4513';
        default: return '#FF6B35';
      }
    };

    const getMembershipIcon = () => {
      switch (membershipLevel) {
        case 'Kim Cương': return '💎';
        case 'Vàng': return '🥇';
        case 'Bạc': return '🥈';
        case 'Sắt': return '🔩';
        default: return '👑';
      }
    };

    return (
      <View style={styles.membershipCard}>
        <View style={styles.membershipHeader}>
          <Text style={styles.membershipIcon}>{getMembershipIcon()}</Text>
          <View>
            <Text style={styles.membershipTitle}>Hạng thành viên</Text>
            <Text style={[styles.membershipLevel, { color: getMembershipColor() }]}>
              {membershipLevel}
            </Text>
          </View>
        </View>
        <Text style={styles.membershipDesc}>
          Ưu đãi đặc biệt dành cho thành viên {membershipLevel}
        </Text>
        <TouchableOpacity
          style={styles.viewBenefitsButton}
          onPress={() => navigation.navigate('ProfileTab')}
        >
          <Text style={styles.viewBenefitsText}>Xem ưu đãi →</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderBestSellers = () => {
    if (loadingBestSellers) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#FF6B35" />
          <Text style={styles.loadingText}>Đang tải món bán chạy...</Text>
        </View>
      );
    }

    if (bestSellers.length === 0) return null;

    return (
      <View style={styles.bestSellersSection}>
        <Text style={styles.bestSellersTitle}>🔥 Món bán chạy hôm nay</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {bestSellers.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.bestSellerCard}
              onPress={() => {
                if (nearbyRestaurants.length > 0) {
                  navigation.navigate('Menu', {
                    restaurant: nearbyRestaurants[0]
                  });
                }
              }}
            >
              <Image
                source={{ uri: item.image_url || WHITE_IMAGE }}
                style={styles.bestSellerImage}
              />
              <View style={styles.bestSellerInfo}>
                <Text style={styles.bestSellerName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.bestSellerPrice}>{parseInt(item.price).toLocaleString()} đ</Text>
                <Text style={styles.bestSellerCategory}>{item.category}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderAboutModal = () => {
    const sortedRanks = [...customerRanks].sort((a, b) => a.rank_order - b.rank_order);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.welcome}>Xin chào!</Text>
            <Text style={styles.userName}>
              {user?.name || 'Khách hàng thân thiết'}
            </Text>
            <Text style={styles.membershipBadge}>
              Hạng: {membershipLevel}
            </Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.aboutUsButton}
              onPress={() => setShowAboutModal(true)}
            >
              <Ionicons name="information-circle-outline" size={24} color="#FF6B35" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.qrScanButtonLarge}
              onPress={handleQRScan}
            >
              <Ionicons name="qr-code" size={32} color="#FF6B35" />
              <Text style={styles.qrScanText}>Quét QR</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Loading indicator */}
        {loadingRestaurants && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FF6B35" />
            <Text style={styles.loadingText}>Đang tải dữ liệu nhà hàng...</Text>
          </View>
        )}

        {/* Hiển thị thông tin hạng thành viên */}
        {renderMembershipInfo()}

        {/* Active booking removed */}

        {/* Hiển thị món bán chạy */}
        {renderBestSellers()}

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('RestaurantTab')}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#FF6B35' }]}> 
              <Ionicons name="restaurant" size={24} color="white" />
            </View>
            <Text style={styles.actionText}>Nhà hàng</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('QrScanner')}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#45B7D1' }]}> 
              <Ionicons name="qr-code" size={24} color="white" />
            </View>
            <Text style={styles.actionText}>Quét QR</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('ProfileTab')}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#FFB347' }]}> 
              <Ionicons name="person" size={24} color="white" />
            </View>
            <Text style={styles.actionText}>Tài khoản</Text>
          </TouchableOpacity>
        </View>

        {/* Favorite Restaurants */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Nhà hàng yêu thích</Text>
            <TouchableOpacity onPress={() => navigation.navigate('RestaurantTab')}>
              <Text style={styles.seeAll}>Xem tất cả</Text>
            </TouchableOpacity>
          </View>
          {favoriteRestaurants.length > 0 ? (
            <FlatList
              horizontal
              data={favoriteRestaurants}
              renderItem={({ item }) => renderRestaurant({ item, isFavorite: true })}
              keyExtractor={item => item.id.toString()}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.restaurantList}
            />
          ) : (
            <Text style={styles.noDataText}>Chưa có nhà hàng yêu thích</Text>
          )}
        </View>

        {/* Nearby Restaurants */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Nhà hàng gần bạn</Text>
            <TouchableOpacity onPress={() => navigation.navigate('RestaurantTab')}>
              <Text style={styles.seeAll}>Xem tất cả</Text>
            </TouchableOpacity>
          </View>
          {nearbyRestaurants.length > 0 ? (
            <FlatList
              horizontal
              data={nearbyRestaurants.slice(0, 6)}
              renderItem={({ item }) => renderRestaurant({ item })}
              keyExtractor={item => item.id.toString()}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.restaurantList}
            />
          ) : (
            <Text style={styles.noDataText}>Không tìm thấy nhà hàng gần bạn</Text>
          )}
        </View>

        {/* Đề xuất đặc biệt */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Dành riêng cho bạn</Text>
          </View>
          <View style={styles.specialOffer}>
            <Ionicons name="gift" size={30} color="#FF6B35" />
            <View style={styles.specialOfferContent}>
              <Text style={styles.specialOfferTitle}>Ưu đãi thành viên {membershipLevel}</Text>
              <Text style={styles.specialOfferDesc}>
                Giảm giá đặc biệt và ưu đãi chỉ dành cho hạng {membershipLevel}
              </Text>
              <TouchableOpacity
                style={styles.learnMoreButton}
                onPress={() => setShowAboutModal(true)}
              >
                <Text style={styles.learnMoreText}>Tìm hiểu thêm về hệ thống tích điểm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

      </ScrollView>

      {/* Modal Giới thiệu */}
      {renderAboutModal()}
    </SafeAreaView>
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  aboutUsButton: {
    marginRight: 15,
    padding: 8,
  },
  welcome: {
    fontSize: 14,
    color: '#666',
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  membershipBadge: {
    fontSize: 12,
    color: '#FF6B35',
    backgroundColor: '#FFF0EC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    marginTop: 5,
    alignSelf: 'flex-start',
  },
  qrScanButtonLarge: {
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#FFF0EC',
    borderRadius: 15,
    width: 80,
  },
  qrScanText: {
    fontSize: 12,
    color: '#FF6B35',
    marginTop: 5,
    textAlign: 'center',
  },
  membershipCard: {
    backgroundColor: 'white',
    margin: 15,
    marginTop: 10,
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
    alignItems: 'center',
    marginBottom: 10,
  },
  membershipIcon: {
    fontSize: 30,
    marginRight: 15,
  },
  membershipTitle: {
    fontSize: 14,
    color: '#666',
  },
  membershipLevel: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  membershipDesc: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  viewBenefitsButton: {
    alignSelf: 'flex-start',
  },
  viewBenefitsText: {
    color: '#FF6B35',
    fontSize: 14,
    fontWeight: '600',
  },
  
  bestSellersSection: {
    backgroundColor: 'white',
    margin: 15,
    marginTop: 0,
    padding: 15,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bestSellersTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  bestSellerCard: {
    width: 150,
    marginRight: 15,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  bestSellerImage: {
    width: '100%',
    height: 100,
    backgroundColor: '#f0f0f0',
  },
  bestSellerInfo: {
    padding: 10,
  },
  bestSellerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  bestSellerPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF6B35',
    marginBottom: 4,
  },
  bestSellerCategory: {
    fontSize: 12,
    color: '#666',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 15,
    backgroundColor: 'white',
    margin: 15,
    marginTop: 10,
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
    marginTop: 0,
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
  restaurantList: {
    paddingRight: 10,
  },
  restaurantCard: {
    width: 200,
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
  restaurantImage: {
    width: '100%',
    height: 120,
    backgroundColor: '#f0f0f0',
  },
  favoriteBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#FF6B35',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  restaurantInfo: {
    padding: 12,
  },
  restaurantName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  ratingText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
    marginRight: 8,
  },
  restaurantCategory: {
    fontSize: 12,
    color: '#666',
  },
  restaurantAddress: {
    fontSize: 12,
    color: '#666',
  },
  specialOffer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF0EC',
    padding: 15,
    borderRadius: 10,
  },
  specialOfferContent: {
    flex: 1,
    marginLeft: 15,
  },
  specialOfferTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  specialOfferDesc: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 10,
  },
  learnMoreButton: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    borderRadius: 6,
  },
  learnMoreText: {
    color: '#FF6B35',
    fontSize: 12,
    fontWeight: '600',
  },
  aboutUsLargeButton: {
    flexDirection: 'row',
    alignItems: 'center',
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
  aboutUsIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFF0EC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  aboutUsContent: {
    flex: 1,
  },
  aboutUsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  aboutUsDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
  },
  noDataText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    paddingVertical: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    width: '90%',
    maxHeight: '85%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  closeButton: {
    padding: 5,
  },
  modalBody: {
    flex: 1,
    maxHeight: '85%',
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  paragraph: {
    fontSize: 14,
    color: '#333',
    lineHeight: 22,
    marginBottom: 10,
  },
  bulletPoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  bulletIcon: {
    marginTop: 2,
    marginRight: 10,
  },
  bulletText: {
    flex: 1,
    fontSize: 13,
    color: '#333',
    lineHeight: 18,
  },
  pointsInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF0EC',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  pointsInfoContent: {
    flex: 1,
    marginLeft: 15,
  },
  pointsInfoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  pointsInfoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  highlight: {
    color: '#FF6B35',
    fontWeight: 'bold',
  },
  ranksTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 15,
    marginBottom: 10,
  },
  rankCard: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  rankHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  rankName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  discountBadge: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  discountText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  rankDetails: {
    marginBottom: 8,
  },
  rankPoints: {
    fontSize: 13,
    color: '#666',
    marginBottom: 5,
  },
  rankDescription: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  rankBenefit: {
    fontSize: 13,
    color: '#28a745',
    backgroundColor: 'rgba(40, 167, 69, 0.1)',
    padding: 8,
    borderRadius: 6,
    marginTop: 5,
  },
  loadingIndicator: {
    marginVertical: 20,
  },
  benefitsSection: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
  },
  benefitsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  benefitText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 12,
    flex: 1,
  },
  conclusionSection: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#FFF0EC',
    borderRadius: 10,
  },
  conclusionText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 22,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  modalCloseButton: {
    backgroundColor: '#FF6B35',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  modalCloseButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default HomeScreen;
