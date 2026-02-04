import { useState, useEffect, useCallback, useMemo } from 'react';
import { useBooking } from '../context/BookingContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../config/supabase';

const useOrders = (activeBookingId) => {
  const { user } = useAuth();
  const {
    activeBooking,
    completeBooking,
    clearActiveBooking,
    removeOrderItem,
    getBookingById,
    loadBookings,
    calculatePendingTotal
  } = useBooking();

  const [orders, setOrders] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);

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

  const loadOrders = useCallback(async () => {
    if (!activeBooking) {
      setOrders([]);
      return;
    }

    try {
      console.log('🔄 Đang load orders cho booking:', activeBooking.id);

      let allOrders = [];

      try {
        if (activeBooking.order_items && activeBooking.order_items.length > 0) {
          console.log(`📦 Booking có ${activeBooking.order_items.length} order_items`);

          const ordersFromItems = activeBooking.order_items.map(item => {
            const itemName = item.menus?.food_name || item.food_name || 'Món không tên';
            const itemPrice = item.price_at_time || item.menus?.price || 0;
            const itemQuantity = item.quantity || 1;
            const orderTotal = itemPrice * itemQuantity;

            const itemDate = item.created_at || activeBooking.booking_time || activeBooking.created_at;

            return {
              id: item.id,
              orderNumber: `ITEM${String(item.id).substring(0, 8)}`,
              total: orderTotal,
              restaurantName: activeBooking.restaurantName ||
                             activeBooking.restaurants?.name ||
                             activeBooking.restaurants?.restaurant_name ||
                             'Nhà hàng',
              items: [{
                id: item.id,
                food_id: item.food_id,
                name: itemName,
                quantity: itemQuantity,
                price: itemPrice,
                category: item.menus?.category,
                description: item.menus?.description,
              }],
              tableNumber: activeBooking.tableNumber ||
                          activeBooking.tables?.table_name ||
                          activeBooking.table_name ||
                          'Bàn 1',
              restaurantId: activeBooking.restaurant_id,
              bookingId: activeBooking.id,
              isBookingOrder: true,
              source: 'booking',
              date: itemDate,
              paymentStatus: 'pending',
              status: 'Chờ thanh toán',
              type: 'order_item',
              canCancel: true,
            };
          });

          allOrders = [...allOrders, ...ordersFromItems];
          console.log(`✅ Đã tạo ${ordersFromItems.length} orders từ order_items`);
        } else {
          console.log('ℹ️ Booking không có order_items');
        }
      } catch (err) {
        console.warn('⚠️ Lỗi khi build orders từ booking:', err.message || err);
      }

      try {
        if (activeBooking.completed_orders && activeBooking.completed_orders.length > 0) {
          const completedOrders = activeBooking.completed_orders.map(comp => ({
            id: comp.id || `completed_${Date.now()}`,
            orderNumber: comp.order_number || `ORDER${String(comp.id).substring(0, 8)}`,
            total: comp.total || 0,
            restaurantName: activeBooking.restaurantName ||
                           activeBooking.restaurants?.name ||
                           'Nhà hàng',
            items: comp.items || [],
            tableNumber: activeBooking.tableNumber ||
                        activeBooking.tables?.table_name ||
                        'Bàn 1',
            restaurantId: activeBooking.restaurant_id,
            bookingId: activeBooking.id,
            isBookingOrder: true,
            source: 'completed',
            date: comp.date || comp.created_at || new Date().toISOString(),
            paymentStatus: 'paid',
            status: 'Đã thanh toán',
            type: 'completed_order',
            canCancel: false,
          }));

          allOrders = [...allOrders, ...completedOrders];
          console.log(`✅ Đã thêm ${completedOrders.length} orders đã hoàn thành`);
        }
      } catch (err) {
        console.warn('⚠️ Lỗi khi thêm completed orders:', err.message || err);
      }

      const ordersWithDetails = allOrders.map(order => {
        if (!order.id) {
          order.id = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }

        return {
          ...order,
          restaurantName: order.restaurantName ||
                         activeBooking?.restaurantName ||
                         activeBooking?.restaurants?.name ||
                         'Nhà hàng',
          orderNumber: order.orderNumber ||
                      order.id?.substring(0, 8) ||
                      `ORDER${Date.now().toString().slice(-6)}`,
          total: order.total || 0,
          date: order.date || new Date().toISOString(),
          items: order.items || [],
          paymentStatus: order.paymentStatus ||
                        (order.status === 'Đã thanh toán' ? 'paid' : 'pending'),
          status: order.status || 'Chờ xác nhận',
          userName: user?.name || user?.full_name || 'Khách hàng',
          userId: user?.id,
          tableNumber: order.tableNumber ||
                      activeBooking?.tableNumber ||
                      activeBooking?.tables?.table_name ||
                      'N/A',
          restaurantId: order.restaurantId || activeBooking?.restaurant_id,
        };
      });

      const sortedOrders = ordersWithDetails.sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      setOrders(sortedOrders);
      console.log(`✅ Đã load ${sortedOrders.length} orders từ booking`);

    } catch (error) {
      console.error('❌ Lỗi khi load orders:', error);
      setOrders([]);
    }
  }, [activeBooking, user]);

  const pendingOrders = useMemo(() => {
    return orders.filter(order =>
      (order.paymentStatus === 'pending' ||
       order.status === 'pending' ||
       order.status === 'Chờ xác nhận') &&
      order.status !== 'cancelled' &&
      order.status !== 'Đã hủy' &&
      order.canCancel !== false
    );
  }, [orders]);

  const completedOrders = useMemo(() => {
    return orders.filter(order =>
      order.paymentStatus === 'paid' ||
      order.status === 'paid' ||
      order.status === 'Đã thanh toán'
    );
  }, [orders]);

  const cancelledOrders = useMemo(() => {
    return orders.filter(order =>
      order.status === 'cancelled' ||
      order.status === 'Đã hủy' ||
      order.paymentStatus === 'cancelled'
    );
  }, [orders]);

  const pendingTotal = useMemo(() => {
    return pendingOrders.reduce((sum, order) => sum + (order.total || 0), 0);
  }, [pendingOrders]);

  const completedTotal = useMemo(() => {
    return completedOrders.reduce((sum, order) => sum + (order.total || 0), 0);
  }, [completedOrders]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      loadOrders();
      setRefreshing(false);
    }, 1000);
  }, [loadOrders]);

  const handleEndBooking = useCallback(async () => {
    if (!activeBooking) return { success: false, error: 'Không có booking active' };

    setLoading(true);
    try {
      const result = await completeBooking(activeBooking.id);
      if (result.success) {
        clearActiveBooking();
        return { success: true, message: 'Đã kết thúc booking' };
      } else {
        return { success: false, error: 'Không thể kết thúc booking: ' + result.error };
      }
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  }, [activeBooking, completeBooking, clearActiveBooking]);

  const handleCancelOrder = useCallback(async (orderId) => {
    if (!activeBooking) return { success: false, error: 'Không có booking active' };

    setLoading(true);
    try {
      const order = orders.find(o => o.id === orderId);

      if (!order) return { success: false, error: 'Không tìm thấy đơn hàng' };

      if (order.source === 'booking' || order.isBookingOrder) {
        const result = await removeOrderItem(orderId);

        if (!result.success) {
          return { success: false, error: result.error || 'Không thể hủy món ăn' };
        }
      }

      await loadOrders();
      return {
        success: true,
        message: 'Đã hủy món ăn thành công',
        removedItemId: orderId
      };
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  }, [activeBooking, orders, removeOrderItem, loadOrders]);

  const getOrderById = useCallback((orderId) => {
    return orders.find(order => order.id === orderId);
  }, [orders]);

  const getOrderStatusColor = useCallback((order) => {
    if (!order) return '#6c757d';

    const status = order.paymentStatus || order.status;
    switch (status) {
      case 'paid':
      case 'Đã thanh toán':
        return '#28a745';
      case 'pending':
      case 'Chờ xác nhận':
        return '#ffc107';
      case 'cancelled':
      case 'Đã hủy':
        return '#dc3545';
      case 'Đang chế biến':
        return '#17a2b8';
      case 'Đã giao hàng':
        return '#007bff';
      default:
        return '#6c757d';
    }
  }, []);

  const getOrderStatusText = useCallback((order) => {
    if (!order) return 'Không xác định';

    const status = order.paymentStatus || order.status;
    switch (status) {
      case 'paid':
        return 'Đã thanh toán';
      case 'pending':
        return 'Chờ thanh toán';
      case 'cancelled':
        return 'Đã hủy';
      case 'Đã thanh toán':
        return 'Đã thanh toán';
      case 'Chờ xác nhận':
        return 'Chờ xác nhận';
      case 'Đang chế biến':
        return 'Đang chế biến';
      case 'Đã hủy':
        return 'Đã hủy';
      case 'Đã giao hàng':
        return 'Đã giao hàng';
      default:
        return status || 'Không xác định';
    }
  }, []);

  const generateInvoiceText = useCallback((order) => {
    if (!order) return '';

    return `HÓA ĐƠN MÓN ĂN\n` +
           `Mã đơn: ${order.orderNumber || 'N/A'}\n` +
           `Món: ${order.items?.map(item => `${item.name} x${item.quantity}`).join(', ') || 'Không có'}\n` +
           `Tổng tiền: ${(order.total || 0).toLocaleString()} đ\n` +
           `Trạng thái: ${getOrderStatusText(order)}`;
  }, [getOrderStatusText]);

  useEffect(() => {
    if (activeBookingId) {
      const booking = getBookingById(activeBookingId) || activeBooking;
      if (booking) {
        console.log('📥 Loading orders for booking from ID:', activeBookingId);
        loadOrders();
      }
    } else if (activeBooking) {
      console.log('📥 Loading orders for active booking:', activeBooking.id);
      loadOrders();
    }
  }, [activeBooking, activeBookingId, getBookingById, loadOrders]);

  const stats = useMemo(() => ({
    totalOrders: orders.length,
    pendingCount: pendingOrders.length,
    completedCount: completedOrders.length,
    cancelledCount: cancelledOrders.length,
    pendingTotal: pendingTotal,
    completedTotal: completedTotal,
  }), [orders, pendingOrders, completedOrders, cancelledOrders, pendingTotal, completedTotal]);

  return {
    supabase,
    orders,
    pendingOrders,
    completedOrders,
    cancelledOrders,
    activeBooking,

    pendingTotal,
    completedTotal,

    refreshing,
    loading,

    handleRefresh,
    handleEndBooking,
    handleCancelOrder,
    reloadOrders: loadOrders,

    getOrderById,
    getOrderStatusColor,
    getOrderStatusText,
    generateInvoiceText,
    formatDate,

    stats,
  };
};

export default useOrders;
