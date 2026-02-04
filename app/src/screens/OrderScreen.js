import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useBooking } from '../context/BookingContext';
import { useCart } from '../context/CartContext';
import { getInvoiceByBookingId, supabase } from '../config/supabase';
import useOrders from '../hooks/useOrders';

const OrderScreen = ({ navigation, route }) => {
  const { user } = useAuth();
  const { clearActiveBooking } = useBooking();
  const { clearCart } = useCart();

  const [invoice, setInvoice] = useState(null);
  const [loadingInvoice, setLoadingInvoice] = useState(false);

  const {
    orders,
    pendingOrders,
    pendingTotal,
    activeBooking,
    refreshing,
    loading: ordersLoading,
    stats,

    handleRefresh,
    handleEndBooking,
    handleCancelOrder,

    getOrderStatusColor,
    getOrderStatusText,
    getOrderById,
    reloadOrders
  } = useOrders();

  useEffect(() => {
    if (activeBooking) {
      loadInvoice();
    } else {
      setInvoice(null);
    }
  }, [activeBooking]);

  const loadInvoice = async () => {
    if (!activeBooking) return;

    setLoadingInvoice(true);
    try {
      const result = await getInvoiceByBookingId(activeBooking.id);
      if (result.success) {
        setInvoice(result.data);
        console.log('✅ Invoice loaded:', result.data?.invoice_number);
      } else {
        setInvoice(null);
      }
    } catch (error) {
      console.error('❌ Lỗi load invoice:', error);
      setInvoice(null);
    } finally {
      setLoadingInvoice(false);
    }
  };

  const reloadOrderItems = async () => {
    if (!activeBooking) return;

    try {
      const { data: orderItems, error } = await supabase
        .from('order_items')
        .select(`
          menus:food_id (
            id,
            food_name,
            price,
            category,
            description
          )
        `)
        .eq('booking_id', activeBooking.id);

      if (error) {
        console.error('❌ Lỗi reload order items:', error);
        return;
      }

      console.log(`✅ Reload được ${orderItems?.length || 0} order items`);

      if (orderItems && activeBooking) {
        await reloadOrders();
        await loadInvoice();
      }
    } catch (error) {
      console.error('❌ Lỗi trong reloadOrderItems:', error);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('🔄 OrderScreen focused, reloading data...');
      if (activeBooking) {
        reloadOrderItems();
      }
    });

    return unsubscribe;
  }, [navigation, activeBooking]);

  const onEndBooking = () => {
    if (!activeBooking) return;

    Alert.alert(
      'Kết thúc booking',
      'Bạn có chắc muốn kết thúc booking này? Tất cả đơn hàng sẽ được lưu vào lịch sử.',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Kết thúc',
          style: 'destructive',
          onPress: async () => {
            const result = await handleEndBooking();
            if (result.success) {
              clearCart();
              clearActiveBooking();
              Alert.alert('Thành công', 'Đã kết thúc booking');
              navigation.goBack();
            } else {
              Alert.alert('Lỗi', result.error || 'Không thể kết thúc booking');
            }
          }
        }
      ]
    );
  };

  const onCancelOrder = (order) => {
    Alert.alert(
      'Hủy món đã đặt',
      'Bạn có chắc chắn muốn xóa món này khỏi đơn hàng?',
      [
        { text: 'Không', style: 'cancel' },
        {
          text: 'Có, xóa món',
          style: 'destructive',
          onPress: async () => {
            const result = await handleCancelOrder(order.id);
            if (result.success) {
              Alert.alert('Thành công', 'Đã xóa món khỏi đơn hàng');
              await reloadOrderItems();
            } else {
              Alert.alert('Lỗi', result.error || 'Không thể xóa món');
            }
          }
        }
      ]
    );
  };

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

  const getRestaurantName = () => {
    if (!activeBooking) return 'Nhà hàng';
    return activeBooking.restaurantName ||
           activeBooking.restaurants?.name ||
           activeBooking.restaurant_name ||
           'Nhà hàng';
  };

  const getTableNumber = () => {
    if (!activeBooking) return 'N/A';
    return activeBooking.tableNumber ||
           activeBooking.tables?.table_name ||
           activeBooking.table_name ||
           'N/A';
  };

  const renderOrderItem = ({ item }) => {
    if (item.source === 'booking' || item.isBookingOrder) {
      const orderDate = formatDate(item.date);
      const formattedDate = orderDate.toLocaleDateString('vi-VN');
      const formattedTime = orderDate.toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit'
      });

      return (
        <View style={styles.orderCard}>
          <View style={styles.orderHeader}>
            <View>
              <Text style={styles.orderId}>
                Món #{item.id?.substring(0, 8) || 'N/A'}
              </Text>
              <Text style={styles.orderTime}>{formattedDate} • {formattedTime}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: '#ffc107' }]}>
              <Text style={styles.statusText}>Chờ thanh toán</Text>
            </View>
          </View>

          <View style={styles.orderInfo}>
            <Text style={styles.restaurantName} numberOfLines={1}>
              🍽️ {getRestaurantName()}
            </Text>
            <Text style={styles.orderTotal}>💰 {(item.total || 0).toLocaleString()} đ</Text>
          </View>

          {activeBooking && (
            <View style={styles.bookingInfo}>
              <Text style={styles.bookingText}>
                Bàn: {getTableNumber()}
              </Text>
            </View>
          )}

          <View style={styles.orderItems}>
            <Text style={styles.itemsTitle}>Danh sách món:</Text>
            {item.items && Array.isArray(item.items) && item.items.length > 0 ? (
              <View style={styles.itemsList}>
                {item.items.map((orderItem, index) => (
                  <View key={`${orderItem.id}-${index}`} style={styles.itemRow}>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName}>
                        • {orderItem.name || 'Món không tên'}
                      </Text>
                      <Text style={styles.itemPrice}>
                        {orderItem.price?.toLocaleString()} đ x {orderItem.quantity || 1}
                      </Text>
                    </View>
                    <Text style={styles.itemTotal}>
                      {(orderItem.price * (orderItem.quantity || 1)).toLocaleString()} đ
                    </Text>
                    <TouchableOpacity
                      style={styles.removeItemButton}
                      onPress={() => onCancelOrder({ id: orderItem.id })}
                    >
                      <Ionicons name="trash-outline" size={16} color="#dc3545" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.itemsText}>Không có thông tin món</Text>
            )}
          </View>

          <View style={styles.orderFooter}>
            <View style={styles.orderActions}>
              <TouchableOpacity
                style={styles.detailButton}
                onPress={() => {
                  if (item.items && item.items.length > 0) {
                    const itemsText = item.items.map((orderItem, idx) =>
                      `${orderItem.name} x${orderItem.quantity}: ${(orderItem.price * orderItem.quantity).toLocaleString()} đ`
                    ).join('\n');

                    Alert.alert('Chi tiết đơn hàng',
                      `Mã đơn: ${item.orderNumber}\n` +
                      `Nhà hàng: ${getRestaurantName()}\n` +
                      `Bàn: ${getTableNumber()}\n` +
                      `Thời gian: ${formattedDate} ${formattedTime}\n\n` +
                      `Danh sách món:\n${itemsText}\n\n` +
                      `Tổng tiền: ${(item.total || 0).toLocaleString()} đ`
                    );
                  }
                }}
              >
                <Text style={styles.detailButtonText}>Xem chi tiết</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      );
    }

    const statusColor = getOrderStatusColor(item);
    const statusText = getOrderStatusText(item);
    const canCancel = item.paymentStatus === 'pending' && item.status !== 'cancelled';

    const orderDate = formatDate(item.date);
    const formattedDate = orderDate.toLocaleDateString('vi-VN');
    const formattedTime = orderDate.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit'
    });

    return (
      <View style={styles.orderCard}>
        <View style={styles.orderHeader}>
          <View>
            <Text style={styles.orderId}>
              Đơn #{item.orderNumber || item.id?.substring(0, 8) || 'N/A'}
            </Text>
            <Text style={styles.orderTime}>{formattedDate} • {formattedTime}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{statusText}</Text>
          </View>
        </View>

        <View style={styles.orderInfo}>
          <Text style={styles.restaurantName} numberOfLines={1}>
            🍽️ {item.restaurantName || getRestaurantName()}
          </Text>
          <Text style={styles.orderTotal}>💰 {(item.total || 0).toLocaleString()} đ</Text>
        </View>

        <View style={styles.orderItems}>
          <Text style={styles.itemsTitle}>Món đã đặt:</Text>
          {item.items && Array.isArray(item.items) && item.items.length > 0 ? (
            <Text style={styles.itemsText} numberOfLines={2}>
              {item.items.slice(0, 2).map((orderItem, index) =>
                `${orderItem.name || 'Món'} x${orderItem.quantity || 1}`
              ).join(', ')}
              {item.items.length > 2 ? `, ...(+${item.items.length - 2} món)` : ''}
            </Text>
          ) : (
            <Text style={styles.itemsText}>Không có thông tin món</Text>
          )}
        </View>

        <View style={styles.orderFooter}>
          {canCancel && (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => onCancelOrder(item)}
            >
              <Text style={styles.cancelButtonText}>Hủy đơn</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.detailButton}
            onPress={() => {
              Alert.alert('Thông tin đơn hàng',
                `Mã đơn: ${item.orderNumber}\n` +
                `Nhà hàng: ${item.restaurantName || getRestaurantName()}\n` +
                `Tổng tiền: ${(item.total || 0).toLocaleString()} đ\n` +
                `Trạng thái: ${statusText}`
              );
            }}
          >
            <Text style={styles.detailButtonText}>Chi tiết →</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderBookingInfo = () => {
    if (!activeBooking) return null;

    const formatBookingTime = (timeString) => {
      try {
        const date = formatDate(timeString);
        return `${date.toLocaleDateString('vi-VN')} • ${date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
      } catch {
        return 'Đang cập nhật';
      }
    };

    const hasPendingOrders = pendingOrders.length > 0;
    const remainingAmount = invoice ? (invoice.final_amount || 0) - (invoice.paid_amount || 0) : 0;

    return (
      <View style={styles.bookingInfoCard}>
        <View style={styles.bookingHeader}>
          <View style={styles.bookingTitleRow}>
            <Ionicons name="restaurant" size={24} color="#FF6B35" />
            <Text style={styles.bookingTitle}>Thông tin booking</Text>
          </View>
          <TouchableOpacity onPress={onEndBooking}>
            <Ionicons name="close-circle" size={24} color="#dc3545" />
          </TouchableOpacity>
        </View>

        <View style={styles.bookingDetails}>
          <View style={styles.bookingDetailRow}>
            <Text style={styles.bookingDetailLabel}>Nhà hàng:</Text>
            <Text style={styles.bookingDetailValue}>{getRestaurantName()}</Text>
          </View>

          <View style={styles.bookingDetailRow}>
            <Text style={styles.bookingDetailLabel}>Bàn:</Text>
            <Text style={styles.bookingDetailValue}>{getTableNumber()}</Text>
          </View>

          <View style={styles.bookingDetailRow}>
            <Text style={styles.bookingDetailLabel}>Thời gian:</Text>
            <Text style={styles.bookingDetailValue}>
              {formatBookingTime(activeBooking.booking_time || activeBooking.reservationTime)}
            </Text>
          </View>

          {activeBooking.people_count && (
            <View style={styles.bookingDetailRow}>
              <Text style={styles.bookingDetailLabel}>Số người:</Text>
              <Text style={styles.bookingDetailValue}>{activeBooking.people_count}</Text>
            </View>
          )}

          {/* Thông tin invoice */}
          <View style={styles.invoiceSection}>
            <TouchableOpacity
              style={styles.invoiceButton}
              onPress={() => {
                if (activeBooking.id) {
                  navigation.navigate('Invoice', {
                    bookingId: activeBooking.id,
                    shouldClearActiveBooking: false,
                    afterPaymentAction: 'goBack'
                  });
                }
              }}
            >
              <View style={styles.invoiceButtonContent}>
                <Ionicons name="receipt" size={20} color="#FF6B35" />
                <Text style={styles.invoiceButtonText}>
                  {invoice
                    ? `Hóa đơn: ${invoice.invoice_number}`
                    : 'Xem hóa đơn và thanh toán'}
                </Text>
              </View>
              <Ionicons name="arrow-forward" size={20} color="#FF6B35" />
            </TouchableOpacity>

            {loadingInvoice ? (
              <View style={styles.loadingInvoice}>
                <ActivityIndicator size="small" color="#FF6B35" />
                <Text style={styles.loadingInvoiceText}>Đang tải hóa đơn...</Text>
              </View>
            ) : invoice ? (
              <View style={styles.invoiceSummary}>
                <View style={styles.invoiceSummaryRow}>
                  <Text style={styles.invoiceSummaryLabel}>Tổng tiền:</Text>
                  <Text style={styles.invoiceSummaryValue}>
                    {(invoice.final_amount || 0).toLocaleString()} đ
                  </Text>
                </View>
                <View style={styles.invoiceSummaryRow}>
                  <Text style={styles.invoiceSummaryLabel}>Đã thanh toán:</Text>
                  <Text style={styles.invoiceSummaryValue}>
                    {(invoice.paid_amount || 0).toLocaleString()} đ
                  </Text>
                </View>
                <View style={styles.invoiceSummaryRow}>
                  <Text style={styles.invoiceSummaryLabel}>Còn lại:</Text>
                  <Text style={styles.remainingAmount}>
                    {remainingAmount.toLocaleString()} đ
                  </Text>
                </View>
                {invoice.rank_discount_amount > 0 && (
                  <View style={styles.invoiceSummaryRow}>
                    <Text style={styles.invoiceSummaryLabel}>Giảm giá hạng:</Text>
                    <Text style={styles.discountAmount}>
                      -{invoice.rank_discount_amount.toLocaleString()} đ
                      {invoice.rank_discount_percentage ? ` (${invoice.rank_discount_percentage}%)` : ''}
                    </Text>
                  </View>
                )}
                <View style={[styles.paymentStatusBadge,
                  invoice.payment_status === 'paid' ? styles.statusPaid :
                  invoice.payment_status === 'partial' ? styles.statusPartial :
                  styles.statusUnpaid]}>
                  <Text style={styles.paymentStatusText}>
                    {invoice.payment_status === 'paid' ? '✅ Đã thanh toán' :
                     invoice.payment_status === 'partial' ? '⚠️ Thanh toán một phần' :
                     '⏳ Chưa thanh toán'}
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.noInvoice}>
                <Text style={styles.noInvoiceText}>
                  Chưa có hóa đơn. Tạo hóa đơn để thanh toán
                </Text>
              </View>
            )}
          </View>

          {/* Thống kê đơn hàng */}
          <View style={styles.bookingStats}>
            <View style={styles.statItem}>
              <Ionicons name="fast-food-outline" size={16} color="#666" />
              <Text style={styles.statText}>
                {orders.reduce((count, order) => count + (order.items?.length || 0), 0)} món đã đặt
              </Text>
            </View>

            {hasPendingOrders && (
              <View style={styles.pendingTotalContainer}>
                <Text style={styles.pendingTotalLabel}>Tổng tiền chờ:</Text>
                <Text style={styles.pendingTotalAmount}>{pendingTotal.toLocaleString()} đ</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  const renderQuickActions = () => {
    if (!activeBooking) {
      return (
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.newBookingButton}
            onPress={() => navigation.navigate('MainTabs', { screen: 'RestaurantTab' })}
          >
            <Ionicons name="restaurant" size={24} color="white" />
            <Text style={styles.newBookingText}>Đặt bàn mới</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={styles.newOrderButton}
          onPress={() => {
            const restaurant = {
              id: activeBooking.restaurant_id || activeBooking.restaurantId,
              name: getRestaurantName(),
              category: activeBooking.restaurants?.cuisine_type || activeBooking.restaurantCategory,
              type: activeBooking.restaurants?.cuisine_type || activeBooking.restaurantType || 'Nhà hàng'
            };

            if (restaurant.id) {
              navigation.navigate('Menu', { restaurant });
            } else {
              Alert.alert('Lỗi', 'Không có thông tin nhà hàng');
            }
          }}
        >
          <Ionicons name="add" size={24} color="white" />
          <Text style={styles.newOrderText}>Đặt thêm món</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Đơn hàng</Text>
          {user && (
            <View style={styles.userBadge}>
              <Ionicons name="person-circle" size={16} color="white" />
              <Text style={styles.userBadgeText}>
                {user.name || user.full_name || 'Khách hàng'}
              </Text>
            </View>
          )}
        </View>

        {/* Thông tin booking */}
        {renderBookingInfo()}

        {/* Danh sách đơn hàng */}
        <FlatList
          data={orders}
          renderItem={renderOrderItem}
          keyExtractor={item => item.id?.toString() || Math.random().toString()}
          contentContainerStyle={[
            styles.listContent,
            !activeBooking && { paddingTop: 20 }
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => {
                await handleRefresh();
                await reloadOrderItems();
              }}
            />
          }
          ListHeaderComponent={
            orders.length > 0 ? (
              <Text style={styles.sectionTitle}>
                Đơn hàng trong booking
              </Text>
            ) : null
          }
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Ionicons name="receipt-outline" size={80} color="#ccc" />
              <Text style={styles.emptyTitle}>
                {activeBooking
                  ? 'Chưa có đơn hàng trong booking này'
                  : 'Chưa có booking active'}
              </Text>
              <Text style={styles.emptyText}>
                {activeBooking
                  ? 'Hãy đặt món từ menu nhà hàng'
                  : 'Vui lòng đặt bàn để bắt đầu đặt món'}
              </Text>
              {activeBooking && (
                <TouchableOpacity
                  style={styles.addItemButton}
                  onPress={() => {
                    const restaurant = {
                      id: activeBooking.restaurant_id || activeBooking.restaurantId,
                      name: getRestaurantName(),
                      category: activeBooking.restaurants?.cuisine_type || activeBooking.restaurantCategory,
                      type: activeBooking.restaurants?.cuisine_type || activeBooking.restaurantType || 'Nhà hàng'
                    };

                    if (restaurant.id) {
                      navigation.navigate('Menu', { restaurant });
                    }
                  }}
                >
                  <Ionicons name="add-circle" size={20} color="#FF6B35" />
                  <Text style={styles.addItemText}>Đặt món ngay</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        />
      </View>

      {/* Quick Actions */}
      {renderQuickActions()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
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
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  userBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B35',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  userBadgeText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 5,
  },
  bookingInfoCard: {
    backgroundColor: '#FFF0EC',
    marginHorizontal: 20,
    marginTop: 15,
    marginBottom: 10,
    padding: 20,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#FF6B35',
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  bookingTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bookingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6B35',
    marginLeft: 10,
  },
  bookingDetails: {
    marginBottom: 15,
  },
  bookingDetailRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  bookingDetailLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
    width: 100,
  },
  bookingDetailValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  invoiceSection: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginTop: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  invoiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  invoiceButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  invoiceButtonText: {
    color: '#FF6B35',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  loadingInvoice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  loadingInvoiceText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 10,
  },
  invoiceSummary: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  invoiceSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  invoiceSummaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  invoiceSummaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  remainingAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  discountAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#28a745',
  },
  paymentStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 10,
  },
  statusPaid: {
    backgroundColor: '#d4edda',
  },
  statusPartial: {
    backgroundColor: '#fff3cd',
  },
  statusUnpaid: {
    backgroundColor: '#f8d7da',
  },
  paymentStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  noInvoice: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  noInvoiceText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  bookingStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    padding: 10,
    borderRadius: 8,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
    marginBottom: 5,
  },
  statText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 5,
  },
  pendingTotalContainer: {
    flex: 1,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#FF6B35',
    marginTop: 5,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pendingTotalLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  pendingTotalAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  listContent: {
    paddingHorizontal: 15,
    paddingBottom: 100,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    marginTop: 10,
    marginLeft: 5,
  },
  orderCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  orderId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  orderTime: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  orderInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  restaurantName: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    flex: 1,
  },
  orderTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B35',
    marginLeft: 10,
  },
  bookingInfo: {
    marginBottom: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  bookingText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  orderItems: {
    marginBottom: 10,
  },
  itemsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  itemsText: {
    fontSize: 14,
    color: '#666',
  },
  itemsList: {
    marginTop: 5,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    color: '#333',
    marginBottom: 2,
  },
  itemPrice: {
    fontSize: 12,
    color: '#666',
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginHorizontal: 10,
  },
  removeItemButton: {
    padding: 5,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  orderActions: {
    flexDirection: 'row',
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dc3545',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 8,
  },
  cancelButtonText: {
    color: '#dc3545',
    fontSize: 14,
    fontWeight: '600',
  },
  detailButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  detailButtonText: {
    color: '#FF6B35',
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    minHeight: 300,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
    textAlign: 'center',
    lineHeight: 22,
  },
  addItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#FFF0EC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FF6B35',
  },
  addItemText: {
    color: '#FF6B35',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  quickActions: {
    padding: 20,
    paddingTop: 10,
    paddingBottom: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  newOrderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B35',
    padding: 16,
    borderRadius: 12,
    flex: 1,
  },
  newOrderText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  newBookingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B35',
    padding: 16,
    borderRadius: 12,
    flex: 1,
  },
  newBookingText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
});

export default OrderScreen;
