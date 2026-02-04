import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import useRestaurantList from '../hooks/useRestaurantList';
import { WHITE_IMAGE } from '../config/supabase';

const RestaurantListScreen = ({ navigation }) => {
  const {
    restaurants,
    loading,
    refreshing,
    error,
    isEmpty,
    onRefresh,
    reload
  } = useRestaurantList();
  const [filter, setFilter] = useState('all');

  const renderRestaurant = ({ item }) => (
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
          image: item.image_url,
          price_range: item.price_range,
          open_time: item.open_time,
          close_time: item.close_time,
          openingHours: item.openingHours,
          phone: item.phone,
          description: item.description,
          features: item.features,
          signatureDish: item.signatureDish,
          popularItems: item.popularItems,
        }
      })}
    >
      <Image
        source={{
          uri: item.image_url || item.image || WHITE_IMAGE
        }}
        style={styles.restaurantImage}
      />
      <View style={styles.restaurantInfo}>
        <Text style={styles.restaurantName}>{item.name}</Text>
        <View style={styles.ratingContainer}>
          <Ionicons name="star" size={14} color="#FFD700" />
          <Text style={styles.ratingText}>
            {item.average_rating || item.rating || 'Chưa có đánh giá'}
          </Text>
          <Text style={styles.restaurantCategory}>
            • {item.cuisine_type || item.type || 'Nhà hàng'}
          </Text>
          {item.price_range && (
            <Text style={styles.priceRange}>• {item.price_range}</Text>
          )}
        </View>
        <Text style={styles.restaurantAddress}>
          {item.address || 'Địa chỉ đang cập nhật'}
        </Text>
        {item.environment_tags && (
          <Text style={styles.tags}>
            {item.environment_tags.split(',').slice(0, 3).map(tag => `#${tag.trim()}`).join(' ')}
          </Text>
        )}
        {item.description && (
          <Text style={styles.description} numberOfLines={2}>
            {item.description}
          </Text>
        )}
        {/* Hiển thị giờ mở cửa nếu có */}
        {(item.open_time && item.close_time) && (
          <View style={styles.openingHoursContainer}>
            <Ionicons name="time-outline" size={12} color="#666" />
            <Text style={styles.openingHoursText}>
              {item.open_time} - {item.close_time}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Nhà hàng</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B35" />
          <Text style={styles.loadingText}>Đang tải danh sách nhà hàng...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const shouldShowEmptyState = (!loading && restaurants.length === 0) || isEmpty;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Nhà hàng</Text>
        <TouchableOpacity onPress={reload} style={styles.refreshButton}>
          <Ionicons name="refresh" size={24} color="#FF6B35" />
        </TouchableOpacity>
      </View>

      {/* Thông báo lỗi */}
      {error && !loading && (
        <View style={styles.errorContainer}>
          <Ionicons name="warning" size={24} color="#dc3545" />
          <View style={styles.errorContent}>
            <Text style={styles.errorText}>
              {error.includes('network') || error.includes('connection')
                ? 'Không thể kết nối đến server'
                : 'Không thể tải danh sách nhà hàng'}
            </Text>
            <TouchableOpacity onPress={reload} style={styles.retryButton}>
              <Text style={styles.retryText}>Thử lại</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Trạng thái rỗng */}
      {shouldShowEmptyState && !loading && !error ? (
        <View style={styles.emptyStateContainer}>
          <ScrollView
            contentContainerStyle={styles.emptyScrollContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            <View style={styles.emptyContent}>
              <Ionicons name="restaurant-outline" size={100} color="#ccc" />
              <Text style={styles.emptyTitle}>
                {isEmpty ? 'Xin lỗi' : 'Không tìm thấy nhà hàng'}
              </Text>
              <Text style={styles.emptyText}>
                {isEmpty
                  ? 'Hiện không có nhà hàng nào trong hệ thống.\nVui lòng quay lại sau.'
                  : 'Không có nhà hàng nào phù hợp với tiêu chí tìm kiếm.'
                }
              </Text>
              <TouchableOpacity
                style={styles.emptyActionButton}
                onPress={reload}
              >
                <Ionicons name="refresh" size={20} color="#FF6B35" />
                <Text style={styles.emptyActionText}>Tải lại</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      ) : (
        <FlatList
          data={restaurants}
          renderItem={renderRestaurant}
          keyExtractor={item => item.id ? item.id.toString() : Math.random().toString()}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#FF6B35']}
            />
          }
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            restaurants.length > 0 && (
              <View style={styles.listHeader}>
                <Text style={styles.listHeaderText}>
                  Hiển thị {restaurants.length} nhà hàng
                </Text>
              </View>
            )
          }
          ListEmptyComponent={null} 
        />
      )}
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
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333'
  },
  refreshButton: {
    padding: 5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666'
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8d7da',
    margin: 15,
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#f5c6cb'
  },
  errorContent: {
    flex: 1,
    marginLeft: 10,
  },
  errorText: {
    color: '#721c24',
    fontSize: 14,
    flex: 1,
  },
  retryButton: {
    marginTop: 5,
    alignSelf: 'flex-start',
  },
  retryText: {
    color: '#dc3545',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyStateContainer: {
    flex: 1,
  },
  emptyScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContent: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  emptyActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF0EC',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF6B35',
  },
  emptyActionText: {
    color: '#FF6B35',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  listContent: {
    padding: 15
  },
  listHeader: {
    marginBottom: 15,
    paddingHorizontal: 5,
  },
  listHeaderText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  restaurantCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 15,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  restaurantImage: {
    width: '100%',
    height: 150,
    backgroundColor: '#f0f0f0'
  },
  restaurantInfo: {
    padding: 15
  },
  restaurantName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  ratingText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
    marginRight: 8
  },
  restaurantCategory: {
    fontSize: 14,
    color: '#666'
  },
  priceRange: {
    fontSize: 14,
    color: '#28a745',
    fontWeight: '600',
    marginLeft: 8
  },
  restaurantAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5
  },
  tags: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  description: {
    fontSize: 13,
    color: '#888',
    lineHeight: 18,
  },
  openingHoursContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  openingHoursText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
});

export default RestaurantListScreen;
