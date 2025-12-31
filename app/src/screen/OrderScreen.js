import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

const OrderScreen = ({ navigation }) => {
  const { guestOrders, user, isGuest } = useAuth();
  const [orders, setOrders] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadOrders();
  }, [guestOrders, user]);

  const loadOrders = () => {
    if (isGuest) {
      // Guest: lấy từ local storage
      setOrders(guestOrders);
    } else {
      // Customer: giả lập dữ liệu
      const customerOrders = [
        { 
          id: 1, 
          items: ['Phở Bò', 'Trà Đào'], 
          total: 90000, 
          date: '20/12/2024', 
          status: 'Hoàn thành',
          itemsDetails: [
            { name: 'Phở Bò', quantity: 1, price: 65000 },
            { name: 'Trà Đào', quantity: 1, price: 25000 }
          ]
        },
        { 
          id: 2, 
          items: ['Bún Chả', 'Cà Phê'], 
          total: 75000, 
          date: '18/12/2024', 
          status: 'Đang chế biến',
          itemsDetails: [
            { name: 'Bún Chả', quantity: 1, price: 55000 },
            { name: 'Cà Phê', quantity: 1, price: 20000 }
          ]
        },
      ];
      setOrders(customerOrders);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      loadOrders();
      setRefreshing(false);
    }, 1000);
  };

  const renderOrderItem = ({ item }) => {
    const getStatusColor = (status) => {
      switch (status) {
        case 'Hoàn thành': return '#28a745';
        case 'Đang chế biến': return '#ffc107';
        case 'Đã hủy': return '#dc3545';
        default: return '#6c757d';
      }
    };

    return (
      <TouchableOpacity 
        style={styles.orderCard}
        onPress={() => navigation.navigate('OrderTracking', { 
          orderId: item.id,
          isGuest: isGuest 
        })}
      >
        <View style={styles.orderHeader}>
          <Text style={styles.orderId}>Đơn hàng #{item.id}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        </View>
        
        <View style={styles.orderInfo}>
          <Text style={styles.orderDate}>📅 {item.date}</Text>
          <Text style={styles.orderTotal}>💰 {item.total.toLocaleString()} đ</Text>
        </View>
        
        <View style={styles.orderItems}>
          {item.items && Array.isArray(item.items) ? (
            <Text style={styles.itemsText} numberOfLines={1}>
              {item.items.join(', ')}
            </Text>
          ) : (
            <Text style={styles.itemsText}>Không có thông tin món</Text>
          )}
        </View>
        
        <View style={styles.orderFooter}>
          <Text style={styles.trackText}>Xem chi tiết →</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Đơn hàng</Text>
        {isGuest && (
          <View style={styles.guestBadge}>
            <Ionicons name="person-outline" size={16} color="white" />
            <Text style={styles.guestBadgeText}>Khách</Text>
          </View>
        )}
      </View>

      <FlatList
        data={orders}
        renderItem={renderOrderItem}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={80} color="#ccc" />
            <Text style={styles.emptyTitle}>Chưa có đơn hàng</Text>
            <Text style={styles.emptyText}>
              {isGuest 
                ? 'Bạn chưa đặt món nào trong phiên này' 
                : 'Bạn chưa đặt món nào'}
            </Text>
          </View>
        )}
      />

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        {isGuest ? (
          <TouchableOpacity 
            style={styles.scanButton}
            onPress={() => navigation.navigate('QrScanner')}
          >
            <Ionicons name="qr-code" size={24} color="white" />
            <Text style={styles.scanButtonText}>Quét lại QR</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={styles.newOrderButton}
            onPress={() => navigation.navigate('MenuTab')}
          >
            <Ionicons name="add" size={24} color="white" />
            <Text style={styles.newOrderText}>Đặt món mới</Text>
          </TouchableOpacity>
        )}
      </View>
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
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  guestBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B35',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  guestBadgeText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 5,
  },
  listContent: {
    padding: 15,
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
  orderDate: {
    fontSize: 14,
    color: '#666',
  },
  orderTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  orderItems: {
    marginBottom: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemsText: {
    fontSize: 14,
    color: '#666',
  },
  orderFooter: {
    alignItems: 'flex-end',
  },
  trackText: {
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
  quickActions: {
    padding: 20,
    paddingTop: 10,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4ECDC4',
    padding: 16,
    borderRadius: 12,
  },
  scanButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  newOrderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B35',
    padding: 16,
    borderRadius: 12,
  },
  newOrderText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
});

export default OrderScreen;