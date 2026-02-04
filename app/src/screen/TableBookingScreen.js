import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBooking } from '../context/BookingContext';
import { useAuth } from '../context/AuthContext';
import { getTablesByRestaurant, createBooking, checkTableAvailability } from '../config/supabase';

const TableBookingScreen = ({ route, navigation }) => {
  console.log('📊 TableBookingScreen - route.params:', JSON.stringify(route.params, null, 2));

  const { date, time, people, restaurant } = route.params || {};

  console.log('🏨 Restaurant object từ route:', restaurant);
  console.log('🔍 Restaurant ID (id):', restaurant?.id);
  console.log('🔍 Restaurant Name:', restaurant?.name);
  console.log('🔍 Toàn bộ restaurant object keys:', Object.keys(restaurant || {}));

  const { createBooking: createBookingContext, addOrderToBooking } = useBooking();
  const { user } = useAuth();

  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isCreatingBooking, setIsCreatingBooking] = useState(false);

  const getRestaurantId = () => {
    if (!restaurant) {
      console.log('❌ Không có restaurant object');
      return null;
    }

    if (restaurant.id) {
      console.log(`✅ Lấy restaurant ID từ trường 'id': ${restaurant.id}`);
      return restaurant.id;
    }

    if (restaurant.restaurant_id) {
      console.log(`✅ Lấy restaurant ID từ trường 'restaurant_id': ${restaurant.restaurant_id}`);
      return restaurant.restaurant_id;
    }

    console.log('❌ Không tìm thấy ID trong restaurant object');
    return null;
  };

  const restaurantId = getRestaurantId();
  const restaurantName = restaurant?.name || 'Nhà hàng';
  const isValidRestaurant = restaurantId !== null && restaurantId !== undefined;

  console.log(`🎯 Restaurant ID để sử dụng: ${restaurantId}`);
  console.log(`🎯 Restaurant Name: ${restaurantName}`);
  console.log(`🎯 Is valid restaurant: ${isValidRestaurant}`);

  const parseInitialDate = () => {
    if (date) {
      const d = new Date(date);
      if (!isNaN(d.getTime())) return d;
    }
    return new Date();
  };

  const [selectedDate, setSelectedDate] = useState(parseInitialDate());
  const [showDateModal, setShowDateModal] = useState(false);

  const getNextDays = (count = 14) => {
    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < count; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      days.push(d);
    }
    return days;
  };

  const isDateIn14DayRange = (dateToCheck) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const maxDate = new Date(today);
    maxDate.setDate(today.getDate() + 13);

    dateToCheck.setHours(0, 0, 0, 0);

    return dateToCheck >= today && dateToCheck <= maxDate;
  };

  useEffect(() => {
    console.log(`🔄 useEffect: restaurantId = ${restaurantId}, isValidRestaurant = ${isValidRestaurant}`);

    if (isValidRestaurant) {
      loadTablesFromSupabase();
    } else {
      console.log('⚠️ Không có thông tin nhà hàng hợp lệ');
      setTables([]);
      setLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    if (!isDateIn14DayRange(selectedDate)) {
      setSelectedDate(new Date());
    }
  }, []);

  const loadTablesFromSupabase = async () => {
    try {
      setLoading(true);

      console.log(`🔄 Loading tables for restaurant ID: ${restaurantId}`);

      if (restaurantId) {
        const result = await getTablesByRestaurant(restaurantId);

        if (result.success && result.data && result.data.length > 0) {
          console.log(`✅ Lấy được ${result.data.length} bàn từ Supabase`);
          setTables(result.data);
        } else {
          console.log('⚠️ Không có dữ liệu bàn từ Supabase');
          setTables([]);
        }
      } else {
        console.log('⚠️ Không có restaurant ID');
        setTables([]);
      }
    } catch (error) {
      console.error('❌ Lỗi khi load bàn từ Supabase:', error);
      setTables([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTablesFromSupabase();
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'available':
        return '#28a745';
      case 'reserved':
        return '#ffc107';
      case 'occupied':
        return '#dc3545';
      case 'maintenance':
        return '#6c757d';
      default:
        return '#6c757d';
    }
  };

  const getStatusText = (status) => {
    switch (status?.toLowerCase()) {
      case 'available':
        return 'Trống';
      case 'reserved':
        return 'Đã đặt trước';
      case 'occupied':
        return 'Đang sử dụng';
      case 'maintenance':
        return 'Bảo trì';
      default:
        return 'Không xác định';
    }
  };

  const isTableBookable = (table) => {
    if (table.status?.toLowerCase() !== 'available') {
      return false;
    }

    const tableCapacity = table.capacity || 2;
    const numberOfPeople = parseInt(people) || 2;

    return numberOfPeople <= tableCapacity;
  };

  const handleTablePress = (table) => {
    if (!isValidRestaurant) {
      Alert.alert('Lỗi', 'Không có thông tin nhà hàng. Vui lòng quay lại và thử lại.');
      return;
    }

    if (!isTableBookable(table)) {
      let message = '';

      switch (table.status?.toLowerCase()) {
        case 'reserved':
          message = `Bàn ${table.name} đã được đặt trước. Vui lòng chọn bàn khác.`;
          break;
        case 'occupied':
          message = `Bàn ${table.name} đang có khách sử dụng. Vui lòng chọn bàn khác.`;
          break;
        case 'maintenance':
          message = `Bàn ${table.name} đang bảo trì. Vui lòng chọn bàn khác.`;
          break;
        default:
          const tableCapacity = table.capacity || 2;
          const numberOfPeople = parseInt(people) || 2;
          if (numberOfPeople > tableCapacity) {
            message = `Bàn ${table.name} chỉ có sức chứa ${tableCapacity} người.\n\nBạn đang đặt cho ${numberOfPeople} người. Vui lòng chọn bàn lớn hơn.`;
          } else {
            message = `Bàn ${table.name} hiện không thể đặt.`;
          }
      }

      Alert.alert('Thông báo', message);
      return;
    }

    if (!isDateIn14DayRange(selectedDate)) {
      Alert.alert(
        'Thông báo',
        'Ngày đã chọn không nằm trong khoảng cho phép (14 ngày). Vui lòng chọn ngày khác.',
        [{ text: 'OK', onPress: () => setShowDateModal(true) }]
      );
      return;
    }

    setSelectedTable(table);
    setShowModal(true);
  };

  const confirmBooking = async () => {
    if (!isValidRestaurant) {
      Alert.alert('Lỗi', 'Không có thông tin nhà hàng. Vui lòng quay lại và thử lại.');
      return;
    }

    if (!customerName.trim() || !phone.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ thông tin');
      return;
    }

    if (!selectedTable) {
      Alert.alert('Lỗi', 'Vui lòng chọn bàn');
      return;
    }

    if (!isDateIn14DayRange(selectedDate)) {
      Alert.alert(
        'Thông báo',
        'Ngày đã chọn không nằm trong khoảng cho phép (14 ngày). Vui lòng chọn ngày khác.',
        [{ text: 'OK', onPress: () => setShowDateModal(true) }]
      );
      return;
    }

    if (!isTableBookable(selectedTable)) {
      Alert.alert(
        'Thông báo',
        `Bàn ${selectedTable.name} vừa được đặt bởi người khác. Vui lòng chọn bàn khác.`
      );
      setShowModal(false);
      return;
    }

    setIsCreatingBooking(true);

    try {
      const bookingTime = new Date(selectedDate);
      if (time) {
        const [hours, minutes] = time.split(':');
        bookingTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      } else {
        bookingTime.setHours(18, 0, 0, 0);
      }

      const checkResult = await checkTableAvailability(selectedTable.id, bookingTime.toISOString());

      if (!checkResult.success) {
        console.log('⚠️ Không thể kiểm tra trạng thái bàn, vẫn tiếp tục đặt bàn');
      } else if (!checkResult.data.isAvailable) {
        Alert.alert(
          'Thông báo',
          `Bàn ${selectedTable.name} đã được đặt trong khoảng thời gian này. Vui lòng chọn bàn khác hoặc thời gian khác.`
        );
        setShowModal(false);
        setIsCreatingBooking(false);
        return;
      }

      const bookingData = {
        restaurant_id: restaurantId, 
        user_id: user?.id || null,
        customer_name: customerName,
        booking_time: bookingTime.toISOString(),
        phone: phone,
        people_count: parseInt(people) || 2,
        table_id: selectedTable.id,
        status: 'confirmed',
      };

      console.log('📝 Đang tạo booking với dữ liệu:', bookingData);
      console.log('🔗 Liên kết: restaurant.id -> bookings.restaurant_id');

      const result = await createBooking(bookingData);

      if (result.success) {
        const contextBookingData = {
          id: result.data.id,
          restaurantId: restaurantId,
          restaurantName: restaurantName,
          tableNumber: selectedTable.name,
          reservationTime: bookingTime.toISOString(),
          reservationDate: bookingTime.toISOString(),
          numberOfPeople: parseInt(people) || 2,
          customerName: customerName,
          customerPhone: phone,
          tableCapacity: selectedTable.capacity,
          status: 'confirmed',
        };

        await createBookingContext(contextBookingData);

        Alert.alert(
          'Thành công',
          `Đã đặt bàn ${selectedTable.name} thành công!\n\n` +
            `📅 Ngày: ${bookingTime.toLocaleDateString('vi-VN')}\n` +
            `⏰ Giờ: ${bookingTime.getHours().toString().padStart(2, '0')}:${bookingTime.getMinutes().toString().padStart(2, '0')}\n` +
            `👥 Số người: ${people || 2}\n` +
            `🍽️ Bàn: ${selectedTable.name} (${selectedTable.capacity} người)\n` +
            `📞 Liên hệ: ${phone}`,
          [
            {
              text: 'Xem menu',
              onPress: () => {
                navigation.navigate('Menu', {
                  restaurant: {
                    id: restaurantId,
                    name: restaurantName,
                    ...restaurant
                  }
                });
              }
            },
            {
              text: 'Về trang chủ',
              onPress: () => {
                navigation.navigate('MainTabs');
              }
            }
          ]
        );
        setShowModal(false);
        setCustomerName('');
        setPhone('');
        await loadTablesFromSupabase();
      } else {
        Alert.alert('Lỗi', 'Không thể đặt bàn: ' + result.error);
      }
    } catch (error) {
      console.error('❌ Lỗi khi tạo booking:', error);
      Alert.alert('Lỗi', 'Có lỗi xảy ra khi đặt bàn: ' + error.message);
    } finally {
      setIsCreatingBooking(false);
    }
  };

  const handleDateSelect = (date) => {
    if (isDateIn14DayRange(date)) {
      setSelectedDate(date);
      setShowDateModal(false);
    } else {
      Alert.alert(
        'Thông báo',
        'Chỉ có thể đặt bàn trong vòng 14 ngày kể từ hôm nay.',
        [{ text: 'OK' }]
      );
    }
  };

  const renderDateItem = (date) => {
    const isSelected = selectedDate &&
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear();

    const isToday = date.getDate() === new Date().getDate() &&
      date.getMonth() === new Date().getMonth() &&
      date.getFullYear() === new Date().getFullYear();

    return (
      <TouchableOpacity
        key={date.toISOString()}
        style={[
          styles.dateItem,
          isSelected && styles.dateItemSelected,
          isToday && styles.dateItemToday
        ]}
        onPress={() => handleDateSelect(date)}
      >
        <Text style={[
          styles.dateText,
          isSelected && styles.dateTextSelected,
          isToday && styles.dateTextToday
        ]}>
          {date.getDate()}
        </Text>
        <Text style={[
          styles.dayText,
          isSelected && styles.dayTextSelected
        ]}>
          {date.toLocaleDateString('vi-VN', { weekday: 'short' })}
        </Text>
        {isToday && (
          <Text style={styles.todayLabel}>Hôm nay</Text>
        )}
      </TouchableOpacity>
    );
  };

  const renderTableCard = (table) => {
    const statusColor = getStatusColor(table.status);
    const statusText = getStatusText(table.status);
    const isBookable = isTableBookable(table);

    const tableCapacity = table.capacity || 2;
    const numberOfPeople = parseInt(people) || 2;
    const hasEnoughCapacity = numberOfPeople <= tableCapacity;

    return (
      <TouchableOpacity
        key={table.id}
        style={[
          styles.tableCard,
          { borderColor: statusColor },
          !isBookable && styles.tableDisabled,
          !hasEnoughCapacity && styles.tableCapacityWarning
        ]}
        onPress={() => isBookable ? handleTablePress(table) : null}
        disabled={!isBookable}
      >
        <View style={styles.tableHeader}>
          <Text style={styles.tableName}>{table.name}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{statusText}</Text>
          </View>
        </View>
        <View style={styles.tableInfo}>
          <View style={styles.tableDetail}>
            <Ionicons name="people" size={14} color="#666" />
            <Text style={[
              styles.detailText,
              !hasEnoughCapacity && styles.capacityWarningText
            ]}>
              {table.capacity} người
              {!hasEnoughCapacity && ` (Tối đa)`}
            </Text>
          </View>

          {!isBookable ? (
            <View style={[
              styles.bookingInfoContainer,
              table.status?.toLowerCase() === 'reserved' && styles.bookingReserved,
              table.status?.toLowerCase() === 'occupied' && styles.bookingOccupied,
              table.status?.toLowerCase() === 'maintenance' && styles.bookingMaintenance,
            ]}>
              {table.status?.toLowerCase() === 'reserved' && (
                <Ionicons name="time" size={12} color="#856404" />
              )}
              {table.status?.toLowerCase() === 'occupied' && (
                <Ionicons name="person" size={12} color="#721c24" />
              )}
              {table.status?.toLowerCase() === 'maintenance' && (
                <Ionicons name="construct" size={12} color="#383d41" />
              )}
              <Text style={styles.bookingStatusText}>
                {statusText}
              </Text>
            </View>
          ) : (
            <View style={styles.availableIndicator}>
              {hasEnoughCapacity ? (
                <>
                  <Ionicons name="checkmark-circle" size={16} color="#28a745" />
                  <Text style={styles.availableText}>Có thể đặt</Text>
                </>
              ) : (
                <>
                  <Ionicons name="warning" size={16} color="#ffc107" />
                  <Text style={styles.capacityWarningText}>Quá nhỏ cho {people} người</Text>
                </>
              )}
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (!isValidRestaurant) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chọn bàn</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={60} color="#dc3545" />
          <Text style={styles.errorTitle}>Không có thông tin nhà hàng</Text>
          <Text style={styles.errorText}>
            Không thể tìm thấy ID nhà hàng để đặt bàn.
          </Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Quay lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chọn bàn</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B35" />
          <Text style={styles.loadingText}>Đang tải danh sách bàn...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const availableTables = tables.filter(table =>
    table.status?.toLowerCase() === 'available'
  ).length;

  const reservedTables = tables.filter(table =>
    table.status?.toLowerCase() === 'reserved'
  ).length;

  const occupiedTables = tables.filter(table =>
    table.status?.toLowerCase() === 'occupied'
  ).length;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chọn bàn</Text>
        <TouchableOpacity onPress={onRefresh}>
          <Ionicons name="refresh" size={24} color="#FF6B35" />
        </TouchableOpacity>
      </View>

      <View style={styles.infoBar}>
        <View style={styles.infoItem}>
          <Ionicons name="restaurant" size={16} color="#666" />
          <Text style={styles.infoText} numberOfLines={1}>
            {restaurantName}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.infoItem}
          onPress={() => setShowDateModal(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="calendar" size={16} color="#666" />
          <Text style={styles.infoText}>
            {selectedDate ? selectedDate.toLocaleDateString('vi-VN') : 'Hôm nay'}
          </Text>
          <Ionicons name="chevron-down" size={14} color="#999" style={{ marginLeft: 6 }} />
        </TouchableOpacity>
        <View style={styles.infoItem}>
          <Ionicons name="time" size={16} color="#666" />
          <Text style={styles.infoText}>{time || '18:00'}</Text>
        </View>
        <View style={styles.infoItem}>
          <Ionicons name="people" size={16} color="#666" />
          <Text style={styles.infoText}>{people || '2'} người</Text>
        </View>
      </View>

      <View style={styles.dateRangeInfo}>
        <Ionicons name="information-circle" size={16} color="#FF6B35" />
        <Text style={styles.dateRangeText}>
          Có thể đặt bàn trong vòng 14 ngày kể từ hôm nay
        </Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <View style={[styles.statDot, { backgroundColor: '#28a745' }]} />
          <Text style={styles.statText}>{availableTables} trống</Text>
        </View>
        <View style={styles.statItem}>
          <View style={[styles.statDot, { backgroundColor: '#ffc107' }]} />
          <Text style={styles.statText}>{reservedTables} đã đặt</Text>
        </View>
        <View style={styles.statItem}>
          <View style={[styles.statDot, { backgroundColor: '#dc3545' }]} />
          <Text style={styles.statText}>{occupiedTables} đang dùng</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.tableGrid}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#FF6B35']}
            tintColor="#FF6B35"
          />
        }
      >
        {tables.length > 0 ? (
          tables.map(renderTableCard)
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="restaurant-outline" size={60} color="#ccc" />
            <Text style={styles.emptyTitle}>Hiện tại không có bàn nào</Text>
            <Text style={styles.emptyText}>
              Hiện tại không có bàn nào cả, hãy đợi nhà hàng cấp hoặc reload.
            </Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={loadTablesFromSupabase}
            >
              <Text style={styles.retryButtonText}>Reload</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Modal chọn ngày (14 ngày) */}
      <Modal
        visible={showDateModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '70%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn ngày đặt bàn</Text>
              <TouchableOpacity onPress={() => setShowDateModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Chọn ngày trong vòng 14 ngày kể từ hôm nay
            </Text>

            <ScrollView
              contentContainerStyle={styles.dateContainer}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.dateGrid}>
                {getNextDays(14).map(renderDateItem)}
              </View>

              <View style={styles.selectedDateInfo}>
                <Text style={styles.selectedDateLabel}>Ngày đã chọn:</Text>
                <Text style={styles.selectedDateValue}>
                  {selectedDate ? selectedDate.toLocaleDateString('vi-VN', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  }) : 'Chưa chọn'}
                </Text>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.confirmDateButton}
              onPress={() => setShowDateModal(false)}
            >
              <Text style={styles.confirmDateButtonText}>Xác nhận</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Xác nhận đặt bàn</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={styles.tableInfoModal}>
              <View style={styles.tableHeaderModal}>
                <Text style={styles.selectedTableName}>Bàn {selectedTable?.name}</Text>
                <View style={[
                  styles.statusBadgeModal,
                  { backgroundColor: getStatusColor(selectedTable?.status) }
                ]}>
                  <Text style={styles.statusTextModal}>
                    {getStatusText(selectedTable?.status)}
                  </Text>
                </View>
              </View>
              <Text style={styles.selectedTableInfo}>
                Sức chứa: {selectedTable?.capacity} người • Ngày: {selectedDate ? selectedDate.toLocaleDateString('vi-VN') : 'Hôm nay'} • Giờ: {time || '18:00'}
              </Text>
            </View>

            <Text style={styles.inputLabel}>Thông tin người đặt</Text>
            <TextInput
              style={styles.input}
              placeholder="Họ tên *"
              value={customerName}
              onChangeText={setCustomerName}
              autoCapitalize="words"
              editable={!isCreatingBooking}
            />
            <TextInput
              style={styles.input}
              placeholder="Số điện thoại *"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              editable={!isCreatingBooking}
            />

            {!user && (
              <View style={styles.noticeContainer}>
                <Ionicons name="information-circle-outline" size={18} color="#FF6B35" />
                <Text style={styles.noticeText}>
                  Bạn đang đặt bàn mà chưa đăng nhập. Đăng nhập để quản lý đặt bàn dễ dàng hơn.
                </Text>
              </View>
            )}

            <View style={styles.bookingSummary}>
              <Text style={styles.summaryTitle}>Tóm tắt đặt bàn:</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Nhà hàng:</Text>
                <Text style={styles.summaryValue}>{restaurantName}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Bàn:</Text>
                <Text style={styles.summaryValue}>{selectedTable?.name} ({selectedTable?.capacity} người)</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Thời gian:</Text>
                <Text style={styles.summaryValue}>
                  {selectedDate ? selectedDate.toLocaleDateString('vi-VN') : 'Hôm nay'} • {time || '18:00'}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Số người:</Text>
                <Text style={styles.summaryValue}>{people || 2} người</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Trạng thái:</Text>
                <Text style={styles.summaryValue}>
                  <Text style={{ color: getStatusColor(selectedTable?.status) }}>
                    {getStatusText(selectedTable?.status)}
                  </Text>
                </Text>
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowModal(false)}
                disabled={isCreatingBooking}
              >
                <Text style={styles.cancelButtonText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={confirmBooking}
                disabled={isCreatingBooking}
              >
                {isCreatingBooking ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.confirmButtonText}>Xác nhận đặt</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#dc3545',
    marginTop: 20,
    marginBottom: 10,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 30,
  },
  backButton: {
    paddingHorizontal: 30,
    paddingVertical: 12,
    backgroundColor: '#FF6B35',
    borderRadius: 8,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  infoBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    padding: 15,
    marginHorizontal: 15,
    marginTop: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  infoText: {
    marginLeft: 5,
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
  },
  dateRangeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF0EC',
    padding: 10,
    marginHorizontal: 15,
    marginTop: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFD1C4',
  },
  dateRangeText: {
    marginLeft: 8,
    fontSize: 12,
    color: '#FF6B35',
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginHorizontal: 15,
    marginTop: 15,
    marginBottom: 10,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 5,
  },
  statText: {
    fontSize: 12,
    color: '#666',
  },
  tableGrid: {
    padding: 15,
    paddingBottom: 30,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  tableCard: {
    width: '48%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tableDisabled: {
    opacity: 0.7,
    backgroundColor: '#f8f9fa',
  },
  tableCapacityWarning: {
    borderColor: '#ffc107',
    backgroundColor: '#FFF3CD',
  },
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  tableName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 70,
    alignItems: 'center',
  },
  statusText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  tableInfo: {
    marginTop: 5,
  },
  tableDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  detailText: {
    marginLeft: 5,
    fontSize: 14,
    color: '#666',
  },
  capacityWarningText: {
    color: '#856404',
    fontWeight: '500',
  },
  bookingInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    padding: 8,
    borderRadius: 6,
    borderLeftWidth: 3,
  },
  bookingReserved: {
    backgroundColor: '#FFF3CD',
    borderLeftColor: '#FFC107',
  },
  bookingOccupied: {
    backgroundColor: '#F8D7DA',
    borderLeftColor: '#DC3545',
  },
  bookingMaintenance: {
    backgroundColor: '#E2E3E5',
    borderLeftColor: '#6C757D',
  },
  bookingStatusText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 5,
  },
  availableIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  availableText: {
    marginLeft: 5,
    fontSize: 12,
    color: '#28a745',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    width: '100%',
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
  retryButton: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#FF6B35',
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  dateContainer: {
    paddingBottom: 20,
  },
  dateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  dateItem: {
    width: '14%',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: '#f8f9fa',
  },
  dateItemSelected: {
    backgroundColor: '#FF6B35',
  },
  dateItemToday: {
    borderWidth: 2,
    borderColor: '#FF6B35',
  },
  dateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  dateTextSelected: {
    color: 'white',
  },
  dateTextToday: {
    color: '#FF6B35',
  },
  dayText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  dayTextSelected: {
    color: 'white',
  },
  todayLabel: {
    fontSize: 10,
    color: '#FF6B35',
    marginTop: 2,
    fontWeight: '500',
  },
  selectedDateInfo: {
    backgroundColor: '#FFF0EC',
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
    alignItems: 'center',
  },
  selectedDateLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  selectedDateValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  confirmDateButton: {
    backgroundColor: '#FF6B35',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  confirmDateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  tableInfoModal: {
    backgroundColor: '#FFF0EC',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  tableHeaderModal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  selectedTableName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  statusBadgeModal: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusTextModal: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  selectedTableInfo: {
    fontSize: 14,
    color: '#666',
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  input: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
  },
  noticeContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF0EC',
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#FFD1C4',
  },
  noticeText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 12,
    color: '#FF6B35',
    lineHeight: 16,
  },
  bookingSummary: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    flex: 1,
    textAlign: 'right',
    marginLeft: 10,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  confirmButton: {
    backgroundColor: '#FF6B35',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default TableBookingScreen;
