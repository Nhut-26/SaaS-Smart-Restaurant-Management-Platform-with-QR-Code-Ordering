import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import useRestaurantDetail from '../hooks/useRestaurantDetail';
import { useAuth } from '../context/AuthContext';
import { getNavigationUrl, deleteReviewById, WHITE_IMAGE } from '../config/supabase';

const RestaurantDetailScreen = ({ navigation, route }) => {
  const restaurantId = route.params?.restaurant?.id;
  const {
    restaurant,
    bestSellers,
    loading,
    error,
    notFound,
    reviews,
    refetch
  } = useRestaurantDetail(restaurantId);
  const { user } = useAuth();

  useEffect(() => {
    const unsub = navigation.addListener('focus', () => {
      refetch();
    });
    return unsub;
  }, [navigation, refetch]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <TouchableOpacity onPress={refetch}>
            <Ionicons name="refresh" size={24} color="#FF6B35" />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B35" />
          <Text style={styles.loadingText}>Đang tải thông tin nhà hàng...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || notFound || !restaurant) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <TouchableOpacity onPress={refetch}>
            <Ionicons name="refresh" size={24} color="#FF6B35" />
          </TouchableOpacity>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="restaurant-outline" size={80} color="#ccc" />
          <Text style={styles.errorTitle}>
            {notFound ? 'Không tìm thấy nhà hàng' : 'Có lỗi xảy ra'}
          </Text>
          <Text style={styles.errorText}>
            {notFound
              ? 'Nhà hàng này hiện không tồn tại hoặc đã bị xóa.'
              : error || 'Không thể tải thông tin nhà hàng.'}
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={refetch}
          >
            <Ionicons name="refresh" size={20} color="#FF6B35" />
            <Text style={styles.retryButtonText}>Thử lại</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Quay lại danh sách</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <View style={styles.headerRight}>
            <TouchableOpacity onPress={refetch} style={styles.refreshButton}>
              <Ionicons name="refresh" size={20} color="#FF6B35" />
            </TouchableOpacity>
            <TouchableOpacity>
              <Ionicons name="heart-outline" size={24} color="#FF6B35" />
            </TouchableOpacity>
          </View>
        </View>

        <Image
          source={{
            uri: restaurant.image_url || restaurant.image || WHITE_IMAGE
          }}
          style={styles.image}
        />

        <View style={styles.infoCard}>
          <Text style={styles.restaurantName}>{restaurant.name}</Text>

          <View style={styles.ratingRow}>
            <Text style={styles.categoryText}>{restaurant.type || 'Nhà hàng'}</Text>
          </View>

          {restaurant.description && (
            <Text style={styles.description}>{restaurant.description}</Text>
          )}

          {restaurant.signatureDish && (
            <View style={styles.specialtyContainer}>
              <Ionicons name="restaurant" size={18} color="#FF6B35" />
              <Text style={styles.specialtyText}>
                Món đặc trưng: {restaurant.signatureDish}
              </Text>
            </View>
          )}

          {restaurant.popularItems && restaurant.popularItems.length > 0 && (
            <View style={styles.popularContainer}>
              <Text style={styles.popularTitle}>Món phổ biến:</Text>
              <View style={styles.popularItems}>
                {restaurant.popularItems.slice(0, 3).map((item, index) => (
                  <View key={index} style={styles.popularItem}>
                    <Text style={styles.popularItemText}>• {item}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={20} color="#666" />
            <Text style={styles.infoText}>
              {restaurant.address || 'Địa chỉ đang cập nhật'}
            </Text>
          </View>

          {restaurant.open_time && restaurant.close_time && (
            <View style={styles.infoRow}>
              <Ionicons name="time-outline" size={20} color="#666" />
              <View>
                <Text style={styles.infoText}>
                  Mở cửa: {restaurant.open_time} - {restaurant.close_time}
                </Text>
                {/* Hoặc hiển thị theo format cũ nếu muốn */}
                {/* {restaurant.openingHours && (
                  <Text style={styles.infoText}>{restaurant.openingHours}</Text>
                )} */}
              </View>
            </View>
          )}

          {restaurant.openingHours && ! (restaurant.open_time && restaurant.close_time) && (
            <View style={styles.infoRow}>
              <Ionicons name="time-outline" size={20} color="#666" />
              <Text style={styles.infoText}>{restaurant.openingHours}</Text>
            </View>
          )}

          {restaurant.phone && (
            <View style={styles.infoRow}>
              <Ionicons name="call-outline" size={20} color="#666" />
              <Text style={styles.infoText}>{restaurant.phone}</Text>
            </View>
          )}

          {restaurant.price_range && (
            <View style={styles.infoRow}>
              <Ionicons name="cash-outline" size={20} color="#666" />
              <Text style={styles.infoText}>Mức giá: {restaurant.price_range}</Text>
            </View>
          )}
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.menuButton]}
            onPress={() => {
              if (restaurantId) {
                navigation.navigate('Menu', { restaurant });
              } else {
                Alert.alert('Lỗi', 'Không thể truy cập menu');
              }
            }}
          >
            <Ionicons name="restaurant" size={24} color="white" />
            <Text style={styles.actionButtonText}>Xem Menu</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.reservationButton]}
            onPress={() => {
              if (restaurantId) {
                navigation.navigate('Reservation', { restaurant });
              } else {
                Alert.alert('Lỗi', 'Không thể đặt bàn');
              }
            }}
          >
            <Ionicons name="calendar" size={24} color="white" />
            <Text style={styles.actionButtonText}>Đặt bàn</Text>
          </TouchableOpacity>
        </View>

        {restaurant.features && restaurant.features.length > 0 && (
          <View style={styles.featuresCard}>
            <Text style={styles.sectionTitle}>Tiện ích & Dịch vụ</Text>
            <View style={styles.featuresGrid}>
              {restaurant.features.map((feature, index) => (
                <View key={index} style={styles.featureItem}>
                  <Ionicons name="checkmark-circle" size={20} color="#28a745" />
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {bestSellers.length > 0 && (
          <View style={styles.menuPreviewCard}>
            <Text style={styles.sectionTitle}>Món bán chạy</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {bestSellers.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.menuItemPreview}
                  onPress={() => navigation.navigate('Menu', { restaurant })}
                >
                  <Image
                    source={{
                      uri: item.image_url || item.image || WHITE_IMAGE
                    }}
                    style={styles.previewImage}
                  />
                  <Text style={styles.previewText} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.previewPrice}>
                    {item.price ? parseInt(item.price).toLocaleString() : '0'} đ
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.mapCard}>
          <Text style={styles.sectionTitle}>Vị trí</Text>
          <View style={styles.mapPlaceholder}>
            <Ionicons name="map" size={40} color="#ccc" />
            <Text style={styles.mapText}>
              {restaurant.address || 'Địa chỉ đang cập nhật'}
            </Text>
            {restaurant.address && (
              <TouchableOpacity
                style={styles.directionButton}
                onPress={() => {
                  const originLat = null; 
                  const originLon = null;
                  const destLat = restaurant.latitude;
                  const destLon = restaurant.longitude;
                  const url = getNavigationUrl(originLat, originLon, destLat, destLon, 'driving');
                  if (url) {
                    Linking.openURL(url).catch(err => {
                      Alert.alert('Lỗi', 'Không thể mở ứng dụng chỉ đường');
                      console.error('Open navigation error', err);
                    });
                  } else {
                    Alert.alert('Không có tọa độ', 'Nhà hàng chưa có thông tin tọa độ');
                  }
                }}
              >
                <Ionicons name="navigate" size={16} color="white" />
                <Text style={styles.directionButtonText}>Chỉ đường</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {reviews && (
          <View style={styles.reviewsCard}>
            <View style={styles.reviewsHeaderRow}>
              <Text style={styles.sectionTitle}>Đánh giá</Text>
              <TouchableOpacity
                style={styles.addReviewButton}
                onPress={() => navigation.navigate('Review', { restaurant })}
              >
                <Text style={styles.addReviewText}>Đánh giá</Text>
              </TouchableOpacity>
            </View>
            {reviews.slice(0, 3).map((r) => (
              <View key={r.id} style={styles.reviewItem}>
                <View style={styles.reviewHeaderSmall}>
                  <View style={styles.userInfoSmall}>
                    <Ionicons name="person-circle" size={36} color="#666" />
                    <View style={{ marginLeft: 10 }}>
                      <Text style={styles.reviewUser}>
                        {r.customer?.full_name || 'Người dùng'}
                      </Text>

                    </View>
                  </View>
                </View>
                {/* HIỂN THỊ TRƯỜNG 'review' */}
                <Text style={styles.reviewComment}>{r.review}</Text>
                <View style={styles.reviewActions}>
                  <TouchableOpacity
                    style={styles.smallButton}
                    onPress={() => navigation.navigate('Review', { restaurant })}
                  >
                    <Text style={styles.smallButtonText}>Xem</Text>
                  </TouchableOpacity>
                  {user && user.id === r.id_customer && (
                    <>
                      <TouchableOpacity
                        style={styles.smallButton}
                        onPress={() => navigation.navigate('Review', { restaurant, review: r })}
                      >
                        <Text style={styles.smallButtonText}>Sửa</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.smallButton}
                        onPress={() => {
                          Alert.alert(
                            'Xóa đánh giá',
                            'Bạn có chắc muốn xóa đánh giá này?',
                            [
                              { text: 'Hủy', style: 'cancel' },
                              { text: 'Xóa', style: 'destructive', onPress: async () => {
                                try {
                                  const res = await deleteReviewById(r.id);
                                  if (res.success) {
                                    Alert.alert('Đã xóa', 'Đã xóa đánh giá thành công');
                                    refetch();
                                  } else {
                                    Alert.alert('Lỗi', res.error || 'Không thể xóa đánh giá');
                                  }
                                } catch (err) {
                                  console.error('Delete review error', err);
                                  Alert.alert('Lỗi', 'Có lỗi khi xóa đánh giá');
                                }
                              }}
                            ]
                          );
                        }}
                      >
                        <Text style={styles.smallButtonText}>Xóa</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            ))}
            {reviews.length > 3 && (
              <TouchableOpacity
                style={styles.viewAllButton}
                onPress={() => navigation.navigate('Review', { restaurant })}
              >
                <Text style={styles.viewAllText}>Xem tất cả đánh giá</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
    backgroundColor: 'transparent'
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  refreshButton: {
    marginRight: 15,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#666'
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF0EC',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF6B35',
    marginBottom: 15,
  },
  retryButtonText: {
    color: '#FF6B35',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  backButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  image: {
    width: '100%',
    height: 250,
    backgroundColor: '#f0f0f0'
  },
  infoCard: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    marginTop: -30,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  restaurantName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15
  },
  ratingText: {
    marginLeft: 5,
    marginRight: 10,
    fontSize: 16,
    fontWeight: '600',
    color: '#333'
  },
  categoryText: {
    fontSize: 16,
    color: '#666'
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#666',
    marginBottom: 20
  },
  specialtyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF0EC',
    padding: 10,
    borderRadius: 8,
    marginBottom: 15
  },
  specialtyText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#FF6B35',
    fontWeight: '600'
  },
  popularContainer: {
    marginBottom: 15
  },
  popularTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8
  },
  popularItems: {
    marginLeft: 10
  },
  popularItem: {
    marginBottom: 4
  },
  popularItemText: {
    fontSize: 14,
    color: '#666'
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10
  },
  infoText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#333',
    flex: 1
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 10,
    marginHorizontal: 5
  },
  menuButton: {
    backgroundColor: '#4ECDC4'
  },
  reservationButton: {
    backgroundColor: '#FF6B35'
  },
  actionButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 10
  },
  featuresCard: {
    backgroundColor: 'white',
    margin: 20,
    marginTop: 0,
    padding: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap'
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '50%',
    marginBottom: 10
  },
  featureText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#333'
  },
  menuPreviewCard: {
    backgroundColor: 'white',
    margin: 20,
    marginTop: 0,
    padding: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  menuItemPreview: {
    alignItems: 'center',
    marginRight: 15
  },
  previewImage: {
    width: 100,
    height: 80,
    borderRadius: 10,
    backgroundColor: '#f0f0f0'
  },
  previewText: {
    marginTop: 5,
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
    maxWidth: 100,
  },
  previewPrice: {
    fontSize: 11,
    color: '#FF6B35',
    fontWeight: '600'
  },
  mapCard: {
    backgroundColor: 'white',
    margin: 20,
    marginTop: 0,
    padding: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 30
  },
  mapPlaceholder: {
    height: 150,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  mapText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 15
  },
  directionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B35',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20
  },
  directionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 5
  },
  reviewsCard: {
    backgroundColor: 'white',
    margin: 20,
    marginTop: 0,
    padding: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 30,
    minHeight: 300,
  },
  reviewsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  addReviewButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addReviewText: {
    color: 'white',
    fontWeight: '600',
  },
  reviewItem: {
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 12,
  },
  reviewHeaderSmall: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  userInfoSmall: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewUser: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  reviewDateSmall: {
    fontSize: 12,
    color: '#666',
  },
  ratingSmall: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewComment: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
  },
  reviewActions: {
    flexDirection: 'row',
  },
  smallButton: {
    backgroundColor: '#FFF0EC',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
  },
  smallButtonText: {
    color: '#FF6B35',
    fontWeight: '600',
  },
  viewAllButton: {
    marginTop: 8,
    alignSelf: 'center',
    backgroundColor: '#FF6B35',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  viewAllText: {
    color: 'white',
    fontWeight: '600',
  },
});

export default RestaurantDetailScreen;
