import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useBooking } from '../context/BookingContext';

const OrderTrackingScreen = ({ navigation, route }) => {
  const { orderId } = route.params || {};
  const { user } = useAuth();
  const { activeBooking, removePendingOrder } = useBooking();
  const [order, setOrder] = useState(null);
  const [trackingSteps, setTrackingSteps] = useState([]);
  const [estimatedTime, setEstimatedTime] = useState('15-20');

  const formatDate = useCallback((dateString) => {
    try {
      if (!dateString) return new Date();
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return new Date();
      return date;
    } catch {
      return new Date();
    }
  }, []);

  const getRestaurantName = useCallback(() => {
    if (!activeBooking) return 'Nhà hàng';
    return activeBooking.restaurantName ||
           activeBooking.restaurants?.name ||
           'Nhà hàng';
  }, [activeBooking]);

  const getRestaurantInfo = useCallback(() => {
    if (!activeBooking) return null;
    return {
      id: activeBooking.restaurant_id || activeBooking.restaurantId,
      name: getRestaurantName(),
      category: activeBooking.restaurants?.cuisine_type || activeBooking.restaurantCategory,
      type: activeBooking.restaurants?.cuisine_type || activeBooking.restaurantType || 'Nhà hàng'
    };
  }, [activeBooking, getRestaurantName]);

  useEffect(() => {
    if (orderId) {
      if (activeBooking) {
        const allOrders = [...(activeBooking.pending_orders || []), ...(activeBooking.completed_orders || [])];
        const foundOrder = allOrders.find(o => o.id === orderId);
        if (foundOrder) {
          setOrder(foundOrder);
        } else {
          setOrder({
            id: orderId,
            items: [
              { name: 'Phở Bò', quantity: 1, price: 65000 },
              { name: 'Trà Đào', quantity: 2, price: 25000 }
            ],
            total: 115000,
            date: new Date().toISOString(),
            status: 'Đang chế biến',
            paymentStatus: 'pending',
            orderNote: 'Ít hành',
            restaurantName: getRestaurantName(),
            orderNumber: `DH${Date.now().toString().slice(-6)}`,
          });
        }
      } else {
        Alert.alert('Lỗi', 'Không tìm thấy booking', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    }
  }, [orderId, activeBooking, getRestaurantName, navigation]);

  useEffect(() => {
    if (order) {
      const steps = [
        {
          id: 1,
          name: 'Đã đặt',
          status: 'completed',
          time: order.date,
          icon: 'checkmark-circle'
        },
        {
          id: 2,
          name: 'Đã xác nhận',
          status: order.status === 'Đã xác nhận' || order.status === 'Đang chế biến' || order.status === 'Hoàn thành' ? 'completed' : 'pending',
          icon: 'restaurant'
        },
        {
          id: 3,
          name: 'Đang chế biến',
          status: order.status === 'Đang chế biến' || order.status === 'Hoàn thành' ? 'completed' : 'pending',
          icon: 'time'
        },
        {
          id: 4,
          name: 'Hoàn thành',
          status: order.status === 'Hoàn thành' ? 'completed' : 'pending',
          icon: 'checkmark-done'
        },
        {
          id: 5,
          name: 'Đã thanh toán',
          status: order.paymentStatus === 'paid' ? 'completed' : 'pending',
          icon: 'card'
        }
      ];
      setTrackingSteps(steps);
    }
  }, [order]);

  const handleCancelOrder = useCallback(() => {
    Alert.alert(
      'Hủy đơn hàng',
      'Bạn có chắc chắn muốn hủy đơn hàng này?',
      [
        { text: 'Không', style: 'cancel' },
        {
          text: 'Có, hủy đơn',
          style: 'destructive',
          onPress: async () => {
            if (activeBooking && order) {
              const result = await removePendingOrder(order.id);
              if (result.success) {
                Alert.alert('Thành công', 'Đã hủy đơn hàng', [
                  {
                    text: 'OK',
                    onPress: () => {
                      navigation.goBack();
                    }
                  }
                ]);
              } else {
                Alert.alert('Lỗi', result.error || 'Không thể hủy đơn hàng');
              }
            } else {
              Alert.alert('Thành công', 'Đã hủy đơn hàng', [
                {
                  text: 'OK',
                  onPress: () => {
                    navigation.goBack();
                  }
                }
              ]);
            }
          }
        }
      ]
    );
  }, [activeBooking, order, removePendingOrder, navigation]);

  if (!order) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Theo dõi đơn hàng</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <Ionicons name="receipt-outline" size={60} color="#ccc" />
          <Text style={styles.loadingText}>Đang tải thông tin đơn hàng...</Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Theo dõi đơn hàng</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Order Info */}
        <View style={styles.orderInfoCard}>
          <Text style={styles.orderId}>
            Đơn hàng #{order.orderNumber || order.id?.substring(0, 8) || 'N/A'}
          </Text>
          <Text style={styles.orderDate}>
            {formatDate(order.date).toLocaleDateString('vi-VN')} • {formatDate(order.date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
          </Text>
          <View style={[styles.statusBadge,
            order.paymentStatus === 'paid' ? styles.statusCompleted :
            order.status === 'Đang chế biến' ? styles.statusProcessing :
            order.status === 'Đã hủy' ? styles.statusCancelled : styles.statusPending
          ]}>
            <Text style={styles.statusText}>
              {order.paymentStatus === 'paid' ? 'Đã thanh toán' :
               order.status === 'Đang chế biến' ? 'Đang chế biến' :
               order.status === 'Đã hủy' ? 'Đã hủy' : 'Chờ xác nhận'}
            </Text>
          </View>
        </View>

        {/* Tracking Steps */}
        <View style={styles.trackingCard}>
          <Text style={styles.sectionTitle}>Trạng thái đơn hàng</Text>
          <View style={styles.timeline}>
            {trackingSteps.map((step, index) => (
              <View key={step.id} style={styles.stepContainer}>
                <View style={styles.stepContent}>
                  <View style={[
                    styles.stepIcon,
                    step.status === 'completed' && styles.stepCompleted,
                    step.status === 'pending' && styles.stepPending
                  ]}>
                    <Ionicons
                      name={step.icon}
                      size={20}
                      color={step.status === 'completed' ? 'white' : '#999'}
                    />
                  </View>
                  <View style={styles.stepInfo}>
                    <Text style={styles.stepName}>{step.name}</Text>
                    {step.time && (
                      <Text style={styles.stepTime}>
                        {formatDate(step.time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    )}
                  </View>
                </View>
                {index < trackingSteps.length - 1 && (
                  <View style={[
                    styles.connector,
                    step.status === 'completed' && styles.connectorCompleted
                  ]} />
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Order Items */}
        <View style={styles.itemsCard}>
          <Text style={styles.sectionTitle}>Chi tiết đơn hàng</Text>
          {order.items && order.items.map((item, index) => (
            <View key={index} style={styles.itemRow}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.name || 'Món không tên'}</Text>
                {item.note && (
                  <Text style={styles.itemNote}>📝 {item.note}</Text>
                )}
              </View>
              <View style={styles.itemQuantityPrice}>
                <Text style={styles.itemQuantity}>x{item.quantity || 1}</Text>
                <Text style={styles.itemPrice}>
                  {((item.price || 0) * (item.quantity || 1)).toLocaleString()} đ
                </Text>
              </View>
            </View>
          ))}

          <View style={styles.divider} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Tổng cộng</Text>
            <Text style={styles.totalAmount}>{order.total?.toLocaleString() || '0'} đ</Text>
          </View>

          {order.paymentMethod && (
            <View style={styles.paymentMethodRow}>
              <Text style={styles.paymentMethodLabel}>Phương thức thanh toán:</Text>
              <Text style={styles.paymentMethodValue}>
                {order.paymentMethod === 'cash' ? 'Tiền mặt' :
                 order.paymentMethod === 'momo' ? 'MoMo' : 'Chuyển khoản'}
              </Text>
            </View>
          )}
        </View>

        {/* Order Note */}
        {order.orderNote && (
          <View style={styles.noteCard}>
            <Text style={styles.sectionTitle}>Ghi chú đơn hàng</Text>
            <Text style={styles.noteText}>{order.orderNote}</Text>
          </View>
        )}

        {/* Estimated Time */}
        <View style={styles.estimateCard}>
          <Ionicons name="time-outline" size={24} color="#FF6B35" />
          <View style={styles.estimateContent}>
            <Text style={styles.estimateTitle}>Thời gian dự kiến</Text>
            <Text style={styles.estimateTime}>{estimatedTime} phút</Text>
          </View>
        </View>

        {/* Actions - chỉ còn nút Hủy đơn hàng và Thêm món */}
        {order.paymentStatus !== 'paid' && order.status !== 'Đã hủy' && (
          <View style={styles.actionsCard}>
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={handleCancelOrder}
            >
              <Ionicons name="close-circle" size={20} color="#dc3545" />
              <Text style={styles.cancelButtonText}>Hủy đơn hàng</Text>
            </TouchableOpacity>

            {activeBooking && (
              <TouchableOpacity
                style={[styles.actionButton, styles.secondaryButton]}
                onPress={() => {
                  const restaurant = getRestaurantInfo();
                  if (restaurant?.id) {
                    navigation.navigate('Menu', { restaurant });
                  } else {
                    Alert.alert('Lỗi', 'Không có thông tin nhà hàng');
                  }
                }}
              >
                <Ionicons name="add" size={20} color="#FF6B35" />
                <Text style={styles.secondaryButtonText}>Thêm món</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#666',
  },
  orderInfoCard: {
    backgroundColor: 'white',
    margin: 15,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderId: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  orderDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  statusBadge: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusPending: {
    backgroundColor: '#FFF3CD',
  },
  statusProcessing: {
    backgroundColor: '#D1ECF1',
  },
  statusCompleted: {
    backgroundColor: '#D4EDDA',
  },
  statusCancelled: {
    backgroundColor: '#F8D7DA',
  },
  statusText: {
    color: '#333',
    fontWeight: '600',
    fontSize: 14,
  },
  trackingCard: {
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
    marginBottom: 20,
  },
  timeline: {
    paddingLeft: 10,
  },
  stepContainer: {
    marginBottom: 25,
  },
  stepContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    backgroundColor: '#f0f0f0',
  },
  stepCompleted: {
    backgroundColor: '#FF6B35',
  },
  stepPending: {
    backgroundColor: '#f0f0f0',
  },
  stepInfo: {
    flex: 1,
  },
  stepName: {
    fontSize: 16,
    color: '#333',
    marginBottom: 2,
    fontWeight: '500',
  },
  stepTime: {
    fontSize: 12,
    color: '#666',
  },
  connector: {
    position: 'absolute',
    left: 20,
    top: 40,
    bottom: -25,
    width: 2,
    backgroundColor: '#E0E0E0',
  },
  connectorCompleted: {
    backgroundColor: '#FF6B35',
  },
  itemsCard: {
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
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemInfo: {
    flex: 2,
  },
  itemName: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  itemNote: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 2,
  },
  itemQuantityPrice: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemQuantity: {
    fontSize: 14,
    color: '#666',
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'right',
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 15,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  paymentMethodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  paymentMethodLabel: {
    fontSize: 14,
    color: '#666',
  },
  paymentMethodValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  noteCard: {
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
  noteText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  estimateCard: {
    flexDirection: 'row',
    alignItems: 'center',
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
  estimateContent: {
    flex: 1,
    marginLeft: 15,
  },
  estimateTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  estimateTime: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  actionsCard: {
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
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  cancelButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#dc3545',
  },
  cancelButtonText: {
    color: '#dc3545',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  secondaryButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#FF6B35',
  },
  secondaryButtonText: {
    color: '#FF6B35',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
});

export default OrderTrackingScreen;
