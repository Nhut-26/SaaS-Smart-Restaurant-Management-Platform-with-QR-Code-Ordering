import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const OrderSummaryCard = ({ order, onViewDetails, onPayNow }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'paid': return '#28a745';
      case 'pending': return '#ffc107';
      case 'cancelled': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'paid': return 'Đã thanh toán';
      case 'pending': return 'Chờ thanh toán';
      case 'cancelled': return 'Đã hủy';
      default: return status;
    }
  };

  const orderDate = new Date(order.date);
  const formattedTime = orderDate.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit'
  });
  const formattedDate = orderDate.toLocaleDateString('vi-VN');

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.orderNumber}>Đơn #{order.orderNumber || order.id.substring(0, 8)}</Text>
          <Text style={styles.orderTime}>{formattedDate} • {formattedTime}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.paymentStatus || order.status) }]}>
          <Text style={styles.statusText}>{getStatusText(order.paymentStatus || order.status)}</Text>
        </View>
      </View>

      <View style={styles.restaurantInfo}>
        <Ionicons name="restaurant" size={16} color="#666" />
        <Text style={styles.restaurantName} numberOfLines={1}>
          {order.restaurantName}
        </Text>
      </View>

      <View style={styles.itemsSummary}>
        <Text style={styles.itemsTitle}>Món đã đặt:</Text>
        {order.items && order.items.slice(0, 2).map((item, index) => (
          <Text key={index} style={styles.itemText} numberOfLines={1}>
            • {item.name} x{item.quantity}
          </Text>
        ))}
        {order.items && order.items.length > 2 && (
          <Text style={styles.moreItems}>...và {order.items.length - 2} món khác</Text>
        )}
      </View>

      <View style={styles.footer}>
        <Text style={styles.totalAmount}>{order.total.toLocaleString()} đ</Text>
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.viewButton}
            onPress={() => onViewDetails && onViewDetails(order)}
          >
            <Text style={styles.viewButtonText}>Chi tiết</Text>
          </TouchableOpacity>

          {(order.paymentStatus === 'pending' || order.status === 'pending') && (
            <TouchableOpacity
              style={styles.payButton}
              onPress={() => onPayNow && onPayNow(order)}
            >
              <Text style={styles.payButtonText}>Thanh toán</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 10,
  },
  orderNumber: {
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
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  restaurantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  restaurantName: {
    fontSize: 14,
    color: '#333',
    marginLeft: 5,
    flex: 1,
  },
  itemsSummary: {
    marginBottom: 10,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  itemText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 5,
  },
  moreItems: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 5,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 5,
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  actions: {
    flexDirection: 'row',
  },
  viewButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    marginRight: 8,
  },
  viewButtonText: {
    color: '#333',
    fontSize: 14,
    fontWeight: '500',
  },
  payButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FF6B35',
    borderRadius: 6,
  },
  payButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default OrderSummaryCard;
