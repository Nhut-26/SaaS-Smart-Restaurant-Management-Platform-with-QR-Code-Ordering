import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Dimensions,
  Alert,
  Modal,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useBooking } from '../context/BookingContext';
import useMenu from '../hooks/useMenu';
import useCartOperations from '../hooks/useCartOperations';
import { WHITE_IMAGE } from '../config/supabase';

const { width } = Dimensions.get('window');

const MenuScreen = ({ navigation, route }) => {
  const { user } = useAuth();
  const { activeBooking, addMultipleOrderItemsToBooking } = useBooking();

  const routeRestaurant = route.params?.restaurant || route.params;

  const getRestaurantInfo = useCallback(() => {
    if (routeRestaurant && routeRestaurant.name) {
      return routeRestaurant;
    }

    if (activeBooking) {
      return {
        id: activeBooking.restaurant_id || activeBooking.restaurantId,
        name: activeBooking.restaurantName || activeBooking.restaurants?.name || 'Nhà Hàng',
        category: activeBooking.restaurantCategory || activeBooking.restaurants?.cuisine_type || 'default',
        type: activeBooking.restaurantType || activeBooking.restaurants?.cuisine_type || 'Nhà Hàng'
      };
    }

    return {
      id: routeRestaurant?.id || 'unknown',
      name: routeRestaurant?.name || 'Nhà Hàng',
      category: routeRestaurant?.category || 'default',
      type: routeRestaurant?.type || 'Nhà Hàng'
    };
  }, [activeBooking, routeRestaurant]);

  const restaurant = getRestaurantInfo();

  const {
    filteredItems: menuItems,
    categories,
    selectedCategory,
    searchQuery,
    loading,
    error,
    isEmpty,
    handleCategoryChange,
    handleSearchChange,
    reloadMenu,
    resetFilters,
    getBestSellers
  } = useMenu(restaurant.id, restaurant.category);

  const {
    cart,
    cartItemsArray,
    addItemToCart,
    removeItemFromCart,
    totalItems,
    cartTotal,
    itemNotes,
    handleAddNote,
    saveNote,
    cancelNote,
    setShowNoteModal,
    setTempNote,
    showNoteModal,
    selectedItemForNote,
    tempNote,
    getItemQuantity,
    getItemNote,
    clearCart,
    getOrderItems,
    canAddMoreItems,
    getRemainingStock,
    isItemInCart
  } = useCartOperations();

  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showReviewButton] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isOrdering, setIsOrdering] = useState(false);

  const canOrder = activeBooking &&
                  (activeBooking.restaurant_id === restaurant.id ||
                   activeBooking.restaurantId === restaurant.id ||
                   activeBooking.restaurantId === restaurant.id?.toString());

  const confirmOrder = async () => {
    if (totalItems === 0) {
      Alert.alert('Giỏ hàng trống', 'Vui lòng chọn món ăn trước khi đặt');
      return;
    }

    const orderItems = getOrderItems() || [];

    if (!Array.isArray(orderItems) || orderItems.length === 0) {
      Alert.alert('Lỗi', 'Không có món ăn trong đơn hàng');
      return;
    }

    setIsOrdering(true);
    setShowOrderModal(false);

    const newOrder = {
      id: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      items: orderItems,
      total: cartTotal,
      date: new Date().toISOString(),
      status: 'pending',
      paymentStatus: 'pending',
      orderNumber: `DH${Date.now().toString().slice(-6)}`,
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
      restaurantCategory: restaurant.category,
      notes: itemNotes, 
    };

    if (activeBooking) {
      try {
        console.log('🔄 Gửi order items đến BookingContext:', orderItems);
        const mappedItems = orderItems.map(it => ({
          id: it.id,
          food_id: it.id,
          quantity: it.quantity || 1,
          price_at_time: it.price || it.price_at_time || 0,
          note: it.note || ''
        }));

        const result = await addMultipleOrderItemsToBooking(mappedItems);

        if (!result.success) {
          throw new Error(result.error || 'Không thể thêm món vào booking');
        }

        clearCart();

        Alert.alert(
          'Thành công',
          'Đã thêm đơn hàng vào bàn của bạn.',
          [
            { text: 'Tiếp tục đặt món' },
            {
              text: 'Xem đơn hàng',
              onPress: () => navigation.navigate('MainTabs', { screen: 'OrderTab', params: { refresh: Date.now() } })
            }
          ]
        );

      } catch (error) {
        console.error('❌ Lỗi khi lưu đơn hàng:', error, error.stack);
        Alert.alert('Lỗi', 'Có lỗi xảy ra khi lưu đơn hàng: ' + (error.message || error));
      } finally {
        setIsOrdering(false);
      }
    } else {
      Alert.alert(
        'Chưa đặt bàn',
        'Vui lòng đặt bàn trước khi đặt món',
        [
          { text: 'Hủy', style: 'cancel' },
          {
            text: 'Đặt bàn',
            onPress: () => navigation.navigate('MainTabs', { screen: 'RestaurantTab' })
          }
        ]
      );
      setIsOrdering(false);
    }
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await reloadMenu();
    setRefreshing(false);
  }, [reloadMenu]);

  const renderMenuItem = ({ item }) => {
    const quantity = getItemQuantity(item.id);
    const note = getItemNote(item.id);
    const canAddMore = canAddMoreItems(item);
    const remainingStock = getRemainingStock(item);
    const isInCart = isItemInCart(item.id);

    return (
      <View style={styles.menuItemCard}>
        <Image
          source={{ uri: item.image_url || item.image || WHITE_IMAGE }}
          style={styles.itemImage}
        />

        {/* Badge cho món bán chạy */}
        {item.is_best_seller && (
          <View style={styles.bestSellerBadge}>
            <Ionicons name="flame" size={12} color="white" />
            <Text style={styles.bestSellerText}>Bán chạy</Text>
          </View>
        )}

        {/* Hiển thị số lượng tồn kho */}
        {item.stock_count !== undefined && item.stock_count > 0 && item.stock_count < 10 && (
          <View style={styles.stockBadge}>
            <Text style={styles.stockText}>Còn {item.stock_count} phần</Text>
          </View>
        )}

        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.itemDescription} numberOfLines={2}>
            {item.description || 'Món ăn ngon'}
          </Text>
          <View style={styles.priceCategoryRow}>
            <Text style={styles.itemPrice}>
              {item.price ? parseInt(item.price).toLocaleString() : '0'} đ
            </Text>
            <Text style={styles.itemCategory}>{item.category || 'Món ăn'}</Text>
          </View>

          {/* Hiển thị ghi chú nếu có */}
          {note ? (
            <View style={styles.noteContainer}>
              <Text style={styles.noteText} numberOfLines={1}>📝 {note}</Text>
            </View>
          ) : null}

          {/* Hiển thị trạng thái hết hàng */}
          {item.stock_count !== undefined && item.stock_count <= 0 && (
            <View style={styles.outOfStockContainer}>
              <Text style={styles.outOfStockText}>Hết hàng</Text>
            </View>
          )}

          {/* Kiểm tra xem có thể đặt món không */}
          {canOrder ? (
            <View style={styles.itemFooter}>
              <View style={styles.quantityControls}>
                {quantity > 0 ? (
                  <>
                    <TouchableOpacity
                      style={styles.quantityButton}
                      onPress={() => removeItemFromCart(item)}
                    >
                      <Ionicons name="remove" size={18} color="#FF6B35" />
                    </TouchableOpacity>
                    <Text style={styles.quantityText}>{quantity}</Text>
                  </>
                ) : null}
                <TouchableOpacity
                  style={[
                    styles.addButton,
                    (!canAddMore || (item.stock_count !== undefined && item.stock_count <= 0)) && styles.addButtonDisabled
                  ]}
                  onPress={() => {
                    if (canAddMore) {
                      addItemToCart(item);
                    }
                  }}
                  disabled={!canAddMore || (item.stock_count !== undefined && item.stock_count <= 0)}
                >
                  <Ionicons
                    name="add-circle"
                    size={24}
                    color={
                      (!canAddMore || (item.stock_count !== undefined && item.stock_count <= 0))
                        ? "#ccc"
                        : "#FF6B35"
                    }
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.noteButton}
                  onPress={() => handleAddNote(item)}
                >
                  <Ionicons name="pencil" size={18} color="#666" />
                </TouchableOpacity>
              </View>
              {remainingStock !== Infinity && remainingStock < 5 && remainingStock > 0 && (
                <Text style={styles.stockWarning}>
                  Chỉ còn {remainingStock} phần
                </Text>
              )}
            </View>
          ) : (
            <View style={styles.viewOnlyMessage}>
              <Ionicons name="information-circle" size={16} color="#FF6B35" />
              <Text style={styles.viewOnlyText}>Đặt bàn để có thể gọi món</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderBookingInfo = () => {
    if (!activeBooking) return null;

    return (
      <TouchableOpacity
        style={styles.bookingInfoCard}
        onPress={() => {
          Alert.alert(
            'Thông tin đặt bàn',
            `Nhà hàng: ${activeBooking.restaurantName}\nBàn: ${activeBooking.tableNumber}\nThời gian: ${new Date(activeBooking.reservationTime).toLocaleString('vi-VN')}\nSố người: ${activeBooking.numberOfPeople}`,
            [
              { text: 'OK' }
            ]
          );
        }}
      >
        <View style={styles.bookingInfoHeader}>
          <Ionicons name="restaurant" size={20} color="#FF6B35" />
          <Text style={styles.bookingInfoTitle}>Bàn đang active</Text>
          <View style={styles.bookingBadge}>
            <Text style={styles.bookingBadgeText}>Đặt bàn</Text>
          </View>
        </View>
        <View style={styles.bookingInfoContent}>
          <Text style={styles.bookingInfoText}>
            {activeBooking.restaurantName} - {activeBooking.tableNumber}
          </Text>
          <Text style={styles.bookingInfoTime}>
            {activeBooking.numberOfPeople} người • {new Date(activeBooking.reservationTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
          </Text>
          {activeBooking.pending_orders && activeBooking.pending_orders.length > 0 && (
            <Text style={styles.bookingOrdersText}>
              Đang chờ thanh toán: {activeBooking.pending_orders.length} đơn
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const goToReviews = () => {
    navigation.navigate('Review', { restaurant });
  };

  const goToReservation = () => {
    navigation.navigate('Reservation', { restaurant });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>{restaurant.name}</Text>
            <Text style={styles.restaurantType}>{restaurant.type}</Text>
          </View>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B35" />
          <Text style={styles.loadingText}>Đang tải menu...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const shouldShowEmptyState = !loading && (menuItems.length === 0 || isEmpty);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>{restaurant.name}</Text>
          <Text style={styles.restaurantType}>{restaurant.type}</Text>
          {activeBooking && (
            <Text style={styles.bookingText}>Bàn: {activeBooking.tableNumber}</Text>
          )}
        </View>
        {canOrder && totalItems > 0 && (
          <TouchableOpacity style={styles.orderButton} onPress={() => setShowOrderModal(true)}>
            <Ionicons name="restaurant" size={24} color="#333" />
            <View style={styles.orderBadge}>
              <Text style={styles.orderBadgeText}>{totalItems}</Text>
            </View>
          </TouchableOpacity>
        )}
      </View>

      {/* Thông báo lỗi */}
      {error && (
        <View style={styles.warningContainer}>
          <Ionicons name="alert-circle" size={20} color="#FF6B35" />
          <View style={{ flex: 1 }}>
            <Text style={styles.warningText}>
              {error.includes('network') ? 'Không thể kết nối đến server' : 'Có lỗi xảy ra khi tải menu'}
            </Text>
            <TouchableOpacity onPress={reloadMenu}>
              <Text style={styles.retryText}>Thử lại</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Thông tin booking */}
      {renderBookingInfo()}

      {/* Prompt đặt bàn nếu chưa có */}
      {!canOrder && (
        <TouchableOpacity
          style={styles.bookingPrompt}
          onPress={goToReservation}
        >
          <Ionicons name="restaurant" size={20} color="white" />
          <Text style={styles.bookingPromptText}>
            Đặt bàn để có thể gọi món tại nhà hàng này
          </Text>
          <Ionicons name="arrow-forward" size={20} color="white" />
        </TouchableOpacity>
      )}

      {/* Search bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm món ăn..."
          value={searchQuery}
          onChangeText={handleSearchChange}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => handleSearchChange('')}>
            <Ionicons name="close-circle" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      {/* Categories */}
      <View style={styles.categoryContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {categories.map((category) => (
            <TouchableOpacity
              key={category}
              style={[
                styles.categoryButton,
                selectedCategory === category && styles.categoryButtonActive
              ]}
              onPress={() => handleCategoryChange(category)}
            >
              <Text style={[
                styles.categoryText,
                selectedCategory === category && styles.categoryTextActive
              ]}>
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Hiển thị trạng thái rỗng */}
      {shouldShowEmptyState ? (
        <ScrollView
          contentContainerStyle={styles.emptyStateContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#FF6B35']}
            />
          }
        >
          <View style={styles.emptyContent}>
            <Ionicons name="restaurant-outline" size={100} color="#ccc" />
            <Text style={styles.emptyTitle}>
              {isEmpty ? 'Xin lỗi' : 'Không tìm thấy món ăn'}
            </Text>
            <Text style={styles.emptyText}>
              {isEmpty
                ? 'Quán này hiện không có món ăn trong thực đơn.\nVui lòng quay lại sau.'
                : 'Không có món ăn nào phù hợp với tìm kiếm hoặc danh mục đã chọn.'
              }
            </Text>

            {isEmpty ? (
              <TouchableOpacity
                style={styles.emptyActionButton}
                onPress={reloadMenu}
              >
                <Ionicons name="refresh" size={20} color="#FF6B35" />
                <Text style={styles.emptyActionText}>Tải lại</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.emptyActionButton}
                onPress={resetFilters}
              >
                <Ionicons name="close-circle" size={20} color="#FF6B35" />
                <Text style={styles.emptyActionText}>Xóa bộ lọc</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      ) : (
        <FlatList
          data={menuItems}
          renderItem={renderMenuItem}
          keyExtractor={(item, index) => `${item.id}_${index}`}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#FF6B35']}
            />
          }
          ListFooterComponent={
            menuItems.length === 0 ? null : (
              <View style={styles.listFooter}>
                <Text style={styles.listFooterText}>
                  Hiển thị {menuItems.length} món ăn
                </Text>
              </View>
            )
          }
        />
      )}

      {/* Nút đặt món (hiển thị khi có món trong giỏ) */}
      {canOrder && totalItems > 0 && (
        <TouchableOpacity
          style={styles.orderActionButton}
          onPress={() => setShowOrderModal(true)}
          disabled={isOrdering}
        >
          <View style={styles.orderActionContent}>
            {isOrdering ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Ionicons name="checkmark-circle" size={24} color="white" />
            )}
            <View style={styles.orderActionInfo}>
              <Text style={styles.orderActionText}>
                {isOrdering ? 'Đang xử lý...' : `Đặt ${totalItems} món`}
              </Text>
              <Text style={styles.orderActionPrice}>
                {cartTotal.toLocaleString()} đ
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      )}

      {/* Nút xem đánh giá */}
      {showReviewButton && (
        <TouchableOpacity style={styles.reviewButton} onPress={goToReviews}>
          <Ionicons name="star" size={20} color="#FFD700" />
          <Text style={styles.reviewButtonText}>Xem đánh giá</Text>
        </TouchableOpacity>
      )}

      {/* Modal xác nhận đặt món */}
      <Modal
        visible={showOrderModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowOrderModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Xác nhận đặt món</Text>
              <TouchableOpacity onPress={() => setShowOrderModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.orderSummary}>
              <Text style={styles.summaryTitle}>Món đã chọn:</Text>
              {cartItemsArray.map((cartItem, index) => (
                <View key={index} style={styles.summaryItem}>
                  <View style={styles.summaryItemInfo}>
                    <Text style={styles.summaryItemName}>
                      {cartItem.item.name} x{cartItem.quantity}
                    </Text>
                    {itemNotes[cartItem.item.id] && (
                      <Text style={styles.summaryItemNote}>
                        📝 {itemNotes[cartItem.item.id]}
                      </Text>
                    )}
                  </View>
                  <Text style={styles.summaryItemPrice}>
                    {(cartItem.item.price * cartItem.quantity).toLocaleString()} đ
                  </Text>
                </View>
              ))}

              <View style={styles.divider} />

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Tổng cộng:</Text>
                <Text style={styles.totalAmount}>
                  {cartTotal.toLocaleString()} đ
                </Text>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowOrderModal(false)}
                disabled={isOrdering}
              >
                <Text style={styles.cancelButtonText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={confirmOrder}
                disabled={isOrdering}
              >
                {isOrdering ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.confirmButtonText}>Xác nhận đặt</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal ghi chú món ăn */}
      <Modal
        visible={showNoteModal}
        animationType="slide"
        transparent={true}
        onRequestClose={cancelNote}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ghi chú cho {selectedItemForNote?.name}</Text>
              <TouchableOpacity onPress={cancelNote}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.noteInput}
              placeholder="Nhập ghi chú (ví dụ: ít cay, không hành...)"
              value={tempNote}
              onChangeText={setTempNote}
              multiline
              numberOfLines={3}
              autoFocus
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={cancelNote}
              >
                <Text style={styles.cancelButtonText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={saveNote}
              >
                <Text style={styles.confirmButtonText}>Lưu ghi chú</Text>
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
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  restaurantType: {
    fontSize: 14,
    color: '#FF6B35',
    fontWeight: '600',
    marginTop: 2,
  },
  bookingText: {
    fontSize: 12,
    color: '#FF6B35',
    marginTop: 2,
    fontWeight: '600',
  },
  orderButton: {
    position: 'relative',
    padding: 8,
  },
  orderBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#FF6B35',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  orderBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF0EC',
    marginHorizontal: 20,
    marginTop: 10,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF6B35',
  },
  warningText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
  },
  retryText: {
    fontSize: 14,
    color: '#FF6B35',
    fontWeight: '600',
    marginLeft: 8,
    marginTop: 4,
  },
  bookingInfoCard: {
    backgroundColor: '#FFF0EC',
    marginHorizontal: 20,
    marginTop: 10,
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF6B35',
  },
  bookingInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  bookingInfoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B35',
    marginLeft: 10,
    flex: 1,
  },
  bookingBadge: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  bookingBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  bookingInfoContent: {
    marginLeft: 30,
  },
  bookingInfoText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  bookingInfoTime: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  bookingOrdersText: {
    fontSize: 12,
    color: '#FF6B35',
    fontWeight: '600',
  },
  bookingPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FF6B35',
    marginHorizontal: 20,
    marginTop: 10,
    padding: 12,
    borderRadius: 10,
  },
  bookingPromptText: {
    flex: 1,
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginHorizontal: 10,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    margin: 20,
    marginTop: 10,
    paddingHorizontal: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
  categoryContainer: {
    height: 50,
    marginHorizontal: 20,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  categoryButtonActive: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },
  categoryText: {
    fontSize: 14,
    color: '#666',
  },
  categoryTextActive: {
    color: 'white',
  },
  emptyStateContainer: {
    flex: 1,
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
  },
  emptyActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF0EC',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 30,
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
    padding: 20,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  menuItemCard: {
    backgroundColor: 'white',
    width: (width - 60) / 2,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
    position: 'relative',
  },
  itemImage: {
    width: '100%',
    height: 120,
    backgroundColor: '#f0f0f0',
  },
  itemInfo: {
    padding: 12,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  itemDescription: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  priceCategoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  itemCategory: {
    fontSize: 11,
    color: '#666',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  noteContainer: {
    backgroundColor: '#f8f9fa',
    padding: 4,
    borderRadius: 4,
    marginBottom: 8,
  },
  noteText: {
    fontSize: 11,
    color: '#666',
    fontStyle: 'italic',
  },
  itemFooter: {
    marginTop: 5,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quantityButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFF0EC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginHorizontal: 10,
  },
  addButton: {
    padding: 4,
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  noteButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 5,
  },
  stockWarning: {
    fontSize: 10,
    color: '#ff6b35',
    marginTop: 4,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  viewOnlyMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF0EC',
    padding: 6,
    borderRadius: 8,
    marginTop: 5,
  },
  viewOnlyText: {
    fontSize: 12,
    color: '#FF6B35',
    marginLeft: 5,
  },
  orderActionButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#FF6B35',
    borderRadius: 15,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  orderActionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderActionInfo: {
    flex: 1,
    marginLeft: 15,
  },
  orderActionText: {
    color: 'white',
    fontSize: 14,
  },
  orderActionPrice: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  reviewButton: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  reviewButtonText: {
    marginLeft: 5,
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
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
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  orderSummary: {
    maxHeight: 300,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  summaryItemInfo: {
    flex: 1,
  },
  summaryItemName: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  summaryItemNote: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  summaryItemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginLeft: 10,
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 10,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  noteInput: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlignVertical: 'top',
    minHeight: 80,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
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
  bestSellerBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B35',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 1,
  },
  bestSellerText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  stockBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(40, 167, 69, 0.9)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    zIndex: 1,
  },
  stockText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  outOfStockContainer: {
    backgroundColor: '#f8d7da',
    padding: 4,
    borderRadius: 4,
    marginBottom: 8,
  },
  outOfStockText: {
    fontSize: 12,
    color: '#721c24',
    textAlign: 'center',
    fontWeight: '600',
  },
  listFooter: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  listFooterText: {
    fontSize: 14,
    color: '#666',
  },
});

export default MenuScreen;
