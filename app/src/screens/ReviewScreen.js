import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  FlatList,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { upsertReview, getReviewsByRestaurant } from '../config/supabase';
import { useAuth } from '../context/AuthContext';

const ReviewScreen = ({ navigation, route }) => {
  const { restaurant, review: editingReview } = route.params || {
    restaurant: {
      id: 1,
      name: 'Nhà Hàng Mẫu'
    }
  };

  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();

  const [userReview, setUserReview] = useState('');
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    if (editingReview) {
      setEditingId(editingReview.id || null);
      setUserReview(editingReview.review || '');
    }
  }, [editingReview]);

  const fetchReviews = async () => {
    if (!restaurant || !restaurant.id) return;
    setLoading(true);
    try {
      const res = await getReviewsByRestaurant(restaurant.id, 50);
      if (res && res.success) {
        setReviews(res.data || []);
      } else {
        Alert.alert('Lỗi', res?.error || 'Không thể tải đánh giá');
      }
    } catch (err) {
      console.error('Fetch reviews error', err);
      Alert.alert('Lỗi', 'Có lỗi khi tải đánh giá');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [restaurant]);

  const renderReview = ({ item }) => {
    return (
      <View style={styles.reviewCard}>
        <View style={styles.reviewHeader}>
          <View style={styles.userInfo}>
            <Ionicons name="person-circle" size={40} color="#666" />
            <View style={styles.userDetails}>
              {/* Hiển thị tên từ customer.full_name */}
              <Text style={styles.userName}>
                {item.customer?.full_name || 'Người dùng'}
              </Text>
            </View>
          </View>
        </View>
        {/* Chỉ hiển thị item.review */}
        <Text style={styles.comment}>{item.review}</Text>
        {item.images && item.images.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {item.images.map((image, index) => (
              <Image
                key={index}
                source={{ uri: image }}
                style={styles.reviewImage}
              />
            ))}
          </ScrollView>
        )}
      </View>
    );
  };

 const handleSubmit = async () => {
  if (!user) {
    Alert.alert('Yêu cầu đăng nhập', 'Vui lòng đăng nhập để gửi đánh giá');
    return;
  }

  if (userReview.trim().length === 0) {
    Alert.alert('Thiếu thông tin', 'Vui lòng nhập nhận xét');
    return;
  }

  const payload = {
    id: editingId,
    review: userReview,
    restaurant_id: restaurant.id, 
    id_customer: user.id,
  };

  try {
    const res = await upsertReview(payload);
    if (res && res.success) {
      Alert.alert('Thành công', 'Đã gửi đánh giá');
      fetchReviews();
      navigation.goBack();
    } else {
      Alert.alert('Lỗi', res.error || 'Không thể gửi đánh giá');
    }
  } catch (err) {
    console.error('Submit review error', err);
    Alert.alert('Lỗi', 'Có lỗi khi gửi đánh giá');
  }
};

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Đánh giá</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Thông tin nhà hàng */}
        <View style={styles.restaurantInfo}>
          <Text style={styles.restaurantName}>{restaurant.name}</Text>
          <View style={styles.overallRating}>
            <Text style={styles.reviewCount}>({reviews.length} đánh giá)</Text>
          </View>
        </View>

        {/* Đánh giá của bạn */}
        <View style={styles.yourReviewCard}>
          <Text style={styles.sectionTitle}>
            {editingId ? 'Sửa đánh giá của bạn' : 'Đánh giá của bạn'}
          </Text>
          <TextInput
            style={styles.commentInput}
            placeholder="Chia sẻ trải nghiệm của bạn..."
            value={userReview}
            onChangeText={setUserReview}
            multiline
            numberOfLines={4}
            editable={!submitting}
          />
          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.submitButtonText}>
                {editingId ? 'Cập nhật đánh giá' : 'Gửi đánh giá'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Tất cả đánh giá */}
        <View style={styles.allReviews}>
          <Text style={styles.sectionTitle}>Tất cả đánh giá</Text>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#FF6B35" />
              <Text style={styles.loadingText}>Đang tải đánh giá...</Text>
            </View>
          ) : reviews.length > 0 ? (
            <FlatList
              data={reviews}
              renderItem={renderReview}
              keyExtractor={item => (item.id ? item.id.toString() : Math.random().toString())}
              scrollEnabled={false}
              ListFooterComponent={<View style={{ height: 20 }} />}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubble-outline" size={60} color="#ddd" />
              <Text style={styles.emptyText}>Chưa có đánh giá nào</Text>
              <Text style={styles.emptySubtext}>Hãy là người đầu tiên đánh giá nhà hàng này</Text>
            </View>
          )}
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
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  restaurantInfo: {
    backgroundColor: 'white',
    padding: 20,
    alignItems: 'center',
    margin: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  restaurantName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  overallRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewCount: {
    fontSize: 14,
    color: '#666',
  },
  yourReviewCard: {
    backgroundColor: 'white',
    margin: 15,
    marginTop: 0,
    padding: 20,
    borderRadius: 12,
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
  commentInput: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    textAlignVertical: 'top',
    minHeight: 100,
    marginBottom: 15,
  },
  submitButton: {
    backgroundColor: '#FF6B35',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#FF9D7C',
    opacity: 0.7,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  allReviews: {
    backgroundColor: 'white',
    margin: 15,
    marginTop: 0,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 30,
    minHeight: 200,
  },
  reviewCard: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userDetails: {
    marginLeft: 10,
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  reviewDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  comment: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginBottom: 10,
  },
  reviewImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 10,
    backgroundColor: '#f0f0f0',
    marginTop: 5,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  emptySubtext: {
    marginTop: 5,
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});

export default ReviewScreen;
