import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext'; 

const PaymentScreen = ({ navigation, route }) => {
  const { cart, totalAmount, itemNotes } = route.params || { cart: {}, totalAmount: 0, itemNotes: {} };
  const { clearCart } = useCart();
  const { isGuest, addGuestOrder, user } = useAuth(); 
  
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [orderNote, setOrderNote] = useState('');
  
  const calculateTotal = () => {
    return Object.values(cart).reduce((total, cartItem) => {
      return total + (cartItem.item.price * cartItem.quantity);
    }, 0);
  };
  
  const finalTotal = totalAmount || calculateTotal();

  const handlePayment = () => {
    Alert.alert(
      'Xác nhận thanh toán',
      `Bạn muốn thanh toán ${finalTotal.toLocaleString()} đ bằng ${paymentMethod === 'cash' ? 'tiền mặt' : paymentMethod === 'momo' ? 'MoMo' : 'chuyển khoản'}?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xác nhận',
          onPress: () => {
            const newOrder = {
              id: Math.floor(Math.random() * 1000) + 1000,
              items: Object.values(cart).map(cartItem => {
                const item = cartItem.item;
                return {
                  id: item.id,
                  name: item.name,
                  quantity: cartItem.quantity,
                  price: item.price,
                  note: itemNotes[item.id] || '',
                };
              }),
              total: finalTotal,
              date: new Date().toISOString(),
              status: 'Đang xử lý',
              paymentMethod: paymentMethod,
              orderNote: orderNote,
            };

            // Phân biệt Guest và Customer
            if (isGuest) {
              // Guest: lưu order vào guestOrders trong AuthContext
              addGuestOrder(newOrder);
              Alert.alert(
                'Thành công',
                'Thanh toán thành công! Đơn hàng của bạn đang được chuẩn bị.',
                [
                  { 
                    text: 'Theo dõi đơn hàng',
                    onPress: () => {
                      clearCart();
                      navigation.navigate('GuestOrderTracking', { 
                        orderId: newOrder.id,
                        isGuest: true
                      });
                    }
                  },
                  { 
                    text: 'Về menu', 
                    onPress: () => {
                      clearCart();
                      navigation.navigate('GuestMenu');
                    }
                  }
                ]
              );
            } else {
              // Customer: gửi order lên server
              console.log('Customer order:', newOrder);
              Alert.alert(
                'Thành công',
                'Thanh toán thành công! Đơn hàng của bạn đang được chuẩn bị.',
                [
                  { 
                    text: 'Theo dõi đơn hàng',
                    onPress: () => {
                      clearCart();
                      navigation.navigate('OrderTracking', { 
                        orderId: newOrder.id,
                        isGuest: false
                      });
                    }
                  },
                  { 
                    text: 'Về trang chủ', 
                    onPress: () => {
                      clearCart();
                      navigation.navigate('CustomerFlow');
                    }
                  }
                ]
              );
            }
          }
        }
      ]
    );
  };

  const renderCartSummary = () => {
    return Object.values(cart).map((cartItem, index) => {
      const item = cartItem.item;
      const totalPrice = item.price * cartItem.quantity;
      const itemNote = itemNotes[item.id] || '';
      
      return (
        <View key={index} style={styles.cartItem}>
          <View style={styles.cartItemInfo}>
            <Text style={styles.cartItemName}>{item.name}</Text>
            <Text style={styles.cartItemQuantity}>x{cartItem.quantity}</Text>
          </View>
          {itemNote ? (
            <Text style={styles.cartItemNote} numberOfLines={1}>
              📝 {itemNote}
            </Text>
          ) : null}
          <Text style={styles.cartItemPrice}>{totalPrice.toLocaleString()} đ</Text>
        </View>
      );
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thanh toán</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Order Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Chi tiết đơn hàng</Text>
          {renderCartSummary()}
          
          <View style={styles.divider} />
          
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Tổng cộng</Text>
            <Text style={styles.totalAmount}>{finalTotal.toLocaleString()} đ</Text>
          </View>
        </View>

        {/* Payment Method */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Phương thức thanh toán</Text>
          
          <TouchableOpacity 
            style={[styles.paymentOption, paymentMethod === 'cash' && styles.paymentOptionSelected]}
            onPress={() => setPaymentMethod('cash')}
          >
            <View style={styles.paymentOptionContent}>
              <Ionicons name="cash" size={24} color="#FF6B35" />
              <View style={styles.paymentOptionInfo}>
                <Text style={styles.paymentOptionTitle}>Tiền mặt</Text>
                <Text style={styles.paymentOptionDesc}>Thanh toán khi nhận hàng</Text>
              </View>
            </View>
            {paymentMethod === 'cash' && (
              <Ionicons name="checkmark-circle" size={24} color="#FF6B35" />
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.paymentOption, paymentMethod === 'momo' && styles.paymentOptionSelected]}
            onPress={() => setPaymentMethod('momo')}
          >
            <View style={styles.paymentOptionContent}>
              <Image 
                source={{ uri: 'https://play-lh.googleusercontent.com/Ui_-OW6UJI147ySDX9guWWDiCPSq1vtxoC-xG17BU2FpU0Fi6qkWwuLdpddmT9fqrA' }}
                style={styles.paymentIcon}
              />
              <View style={styles.paymentOptionInfo}>
                <Text style={styles.paymentOptionTitle}>Ví MoMo</Text>
                <Text style={styles.paymentOptionDesc}>Thanh toán qua ứng dụng MoMo</Text>
              </View>
            </View>
            {paymentMethod === 'momo' && (
              <Ionicons name="checkmark-circle" size={24} color="#FF6B35" />
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.paymentOption, paymentMethod === 'bank' && styles.paymentOptionSelected]}
            onPress={() => setPaymentMethod('bank')}
          >
            <View style={styles.paymentOptionContent}>
              <Ionicons name="card" size={24} color="#FF6B35" />
              <View style={styles.paymentOptionInfo}>
                <Text style={styles.paymentOptionTitle}>Chuyển khoản ngân hàng</Text>
                <Text style={styles.paymentOptionDesc}>Chuyển khoản qua Internet Banking</Text>
              </View>
            </View>
            {paymentMethod === 'bank' && (
              <Ionicons name="checkmark-circle" size={24} color="#FF6B35" />
            )}
          </TouchableOpacity>
        </View>

        {/* Order Note */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ghi chú đơn hàng (tùy chọn)</Text>
          <TextInput
            style={styles.noteInput}
            placeholder="Ghi chú chung cho toàn bộ đơn hàng"
            value={orderNote}
            onChangeText={setOrderNote}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* User Info (chỉ hiển thị cho Customer) */}
        {!isGuest && user && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Thông tin người đặt</Text>
            <View style={styles.userInfo}>
              <Text style={styles.userInfoText}>👤 {user.name}</Text>
              <Text style={styles.userInfoText}>📞 {user.phone || 'Chưa cập nhật'}</Text>
            </View>
          </View>
        )}

        {/* Guest Info (chỉ hiển thị cho Guest) */}
        {isGuest && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Thông tin khách</Text>
            <View style={styles.guestInfo}>
              <Ionicons name="information-circle" size={20} color="#FF6B35" />
              <Text style={styles.guestInfoText}>
                Bạn đang sử dụng chế độ khách. Đơn hàng sẽ không được lưu vào lịch sử.
              </Text>
            </View>
          </View>
        )}

        {/* Terms */}
        <View style={styles.termsContainer}>
          <Text style={styles.termsText}>
            Bằng cách nhấn "Xác nhận thanh toán", bạn đồng ý với điều khoản và điều kiện của chúng tôi.
          </Text>
        </View>
      </ScrollView>

      {/* Payment Button */}
      <View style={styles.footer}>
        <View style={styles.footerSummary}>
          <Text style={styles.footerLabel}>Tổng thanh toán</Text>
          <Text style={styles.footerTotal}>{finalTotal.toLocaleString()} đ</Text>
        </View>
        <TouchableOpacity 
          style={styles.paymentButton}
          onPress={handlePayment}
        >
          <Ionicons name="lock-closed" size={20} color="white" />
          <Text style={styles.paymentButtonText}>Xác nhận thanh toán</Text>
        </TouchableOpacity>
      </View>
    </View>
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
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  section: {
    backgroundColor: 'white',
    margin: 15,
    marginBottom: 10,
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
  cartItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  cartItemInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cartItemName: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  cartItemQuantity: {
    marginLeft: 10,
    fontSize: 14,
    color: '#666',
  },
  cartItemNote: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 2,
    flex: 1,
    marginRight: 10,
  },
  cartItemPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6B35',
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
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  paymentOptionSelected: {
    borderColor: '#FF6B35',
    backgroundColor: '#FFF0EC',
  },
  paymentOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  paymentIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  paymentOptionInfo: {
    marginLeft: 15,
    flex: 1,
  },
  paymentOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  paymentOptionDesc: {
    fontSize: 12,
    color: '#666',
  },
  noteInput: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    textAlignVertical: 'top',
    minHeight: 80,
  },
  userInfo: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
  },
  userInfoText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 5,
  },
  guestInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF0EC',
    padding: 15,
    borderRadius: 8,
  },
  guestInfoText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: '#FF6B35',
  },
  termsContainer: {
    padding: 20,
    paddingTop: 10,
  },
  termsText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    lineHeight: 18,
  },
  footer: {
    backgroundColor: 'white',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  footerSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  footerLabel: {
    fontSize: 16,
    color: '#333',
  },
  footerTotal: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  paymentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B35',
    padding: 16,
    borderRadius: 10,
  },
  paymentButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
});

export default PaymentScreen;