import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Rating } from 'react-native-ratings';

const RestaurantDetailScreen = ({ navigation }) => {
  const [restaurant] = useState({
    name: 'Nhà Hàng Việt Nam',
    address: '123 Đường ABC, Quận XYZ, TP.HCM',
    phone: '(028) 1234 5678',
    rating: 4.5,
    totalReviews: 128,
    openingHours: '08:00 - 22:00',
    images: [
      'https://via.placeholder.com/400x300',
      'https://via.placeholder.com/400x300',
      'https://via.placeholder.com/400x300',
    ],
    featuredItems: [
      { id: 1, name: 'Phở Bò', price: 65000 },
      { id: 2, name: 'Bún Chả', price: 55000 },
      { id: 3, name: 'Gỏi Cuốn', price: 35000 },
    ],
    reviews: [
      { id: 1, user: 'Nguyễn Văn A', rating: 5, comment: 'Rất ngon, phục vụ tốt', date: '20/12/2024' },
      { id: 2, user: 'Trần Thị B', rating: 4, comment: 'Không gian đẹp', date: '15/12/2024' },
    ],
  });

  const renderReview = ({ item }) => (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <Text style={styles.reviewUser}>{item.user}</Text>
        <View style={styles.ratingContainer}>
          <Ionicons name="star" size={16} color="#FFD700" />
          <Text style={styles.reviewRating}>{item.rating}</Text>
        </View>
      </View>
      <Text style={styles.reviewComment}>{item.comment}</Text>
      <Text style={styles.reviewDate}>{item.date}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* Header với back button */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <TouchableOpacity>
            <Ionicons name="heart-outline" size={24} color="#FF6B35" />
          </TouchableOpacity>
        </View>

        {/* Carousel Images */}
        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
          {restaurant.images.map((image, index) => (
            <Image key={index} source={{ uri: image }} style={styles.image} />
          ))}
        </ScrollView>

        {/* Restaurant Info */}
        <View style={styles.infoCard}>
          <Text style={styles.restaurantName}>{restaurant.name}</Text>
          
          <View style={styles.ratingRow}>
            <Rating
              type="star"
              ratingCount={5}
              imageSize={20}
              readonly
              startingValue={restaurant.rating}
            />
            <Text style={styles.ratingText}>({restaurant.totalReviews} đánh giá)</Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={20} color="#666" />
            <Text style={styles.infoText}>{restaurant.address}</Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={20} color="#666" />
            <Text style={styles.infoText}>{restaurant.openingHours}</Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="call-outline" size={20} color="#666" />
            <Text style={styles.infoText}>{restaurant.phone}</Text>
          </View>
        </View>

        {/* Featured Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Món nổi bật</Text>
          <View style={styles.featuredContainer}>
            {restaurant.featuredItems.map(item => (
              <TouchableOpacity key={item.id} style={styles.featuredItem}>
                <Text style={styles.featuredName}>{item.name}</Text>
                <Text style={styles.featuredPrice}>{item.price.toLocaleString()} đ</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Reviews */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Đánh giá</Text>
            <TouchableOpacity>
              <Text style={styles.seeAll}>Xem tất cả</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={restaurant.reviews}
            renderItem={renderReview}
            keyExtractor={item => item.id.toString()}
            scrollEnabled={false}
          />
          <TouchableOpacity style={styles.addReviewButton}>
            <Ionicons name="create-outline" size={20} color="#FF6B35" />
            <Text style={styles.addReviewText}>Viết đánh giá</Text>
          </TouchableOpacity>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.directionButton]}
            onPress={() => navigation.navigate('Direction')}
          >
            <Ionicons name="navigate" size={20} color="white" />
            <Text style={styles.actionButtonText}>Chỉ đường</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.reservationButton]}
            onPress={() => navigation.navigate('Reservation')}
          >
            <Ionicons name="calendar" size={20} color="white" />
            <Text style={styles.actionButtonText}>Đặt bàn</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    padding: 20,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
    backgroundColor: 'transparent',
  },
  image: {
    width: 400,
    height: 300,
  },
  infoCard: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  restaurantName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  ratingText: {
    marginLeft: 10,
    color: '#666',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  section: {
    backgroundColor: 'white',
    margin: 20,
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  seeAll: {
    color: '#FF6B35',
    fontWeight: '500',
  },
  featuredContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  featuredItem: {
    backgroundColor: '#FFF0EC',
    padding: 15,
    borderRadius: 10,
    width: '30%',
    alignItems: 'center',
  },
  featuredName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  featuredPrice: {
    fontSize: 14,
    color: '#FF6B35',
    fontWeight: 'bold',
  },
  reviewCard: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  reviewUser: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  reviewRating: {
    marginLeft: 5,
    fontWeight: '600',
  },
  reviewComment: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  reviewDate: {
    fontSize: 12,
    color: '#999',
  },
  addReviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderWidth: 1,
    borderColor: '#FF6B35',
    borderRadius: 10,
    marginTop: 10,
  },
  addReviewText: {
    marginLeft: 10,
    color: '#FF6B35',
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 20,
    paddingTop: 0,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 10,
    marginHorizontal: 5,
  },
  directionButton: {
    backgroundColor: '#4ECDC4',
  },
  reservationButton: {
    backgroundColor: '#FF6B35',
  },
  actionButtonText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 10,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default RestaurantDetailScreen;