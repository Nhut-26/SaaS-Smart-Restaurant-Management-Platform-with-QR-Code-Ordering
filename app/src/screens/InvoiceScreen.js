import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useBooking } from '../context/BookingContext';
import {
  supabase,
  getInvoiceByBookingId,
  getInvoiceDetails,
  payInvoicePartial,
  payInvoiceComplete,
  createInvoiceFromBooking
} from '../config/supabase';

const InvoiceScreen = ({ navigation, route }) => {
  const { bookingId } = route.params || {};
  const { user } = useAuth();
  const { activeBooking, clearActiveBooking } = useBooking();

  const [invoice, setInvoice] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [paymentType, setPaymentType] = useState('partial'); 
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [subtotal, setSubtotal] = useState(0);

  useEffect(() => {
    loadInvoice();
  }, [bookingId]);

  // Trong InvoiceScreen.js, sửa hàm loadInvoice
const loadInvoice = async () => {
  try {
    setLoading(true);
    const targetBookingId = bookingId || activeBooking?.id;
    
    if (!targetBookingId) {
      Alert.alert('Lỗi', 'Không tìm thấy thông tin booking');
      navigation.goBack();
      return;
    }
    
    console.log('📋 Đang tải hóa đơn cho booking:', targetBookingId);

    // Lấy invoice hiện có
    const existingInvoice = await getInvoiceByBookingId(targetBookingId);

    if (existingInvoice.error) {
      console.error('❌ Lỗi khi lấy invoice:', existingInvoice.error);
      Alert.alert('Lỗi', 'Không thể tải hóa đơn');
      return;
    }

    let invoiceData;
    let shouldCreateNewInvoice = false;

    // Kiểm tra nếu có invoice tồn tại
    if (existingInvoice.success && existingInvoice.data) {
      console.log('✅ Đã có invoice:', existingInvoice.data.invoice_number);
      invoiceData = existingInvoice.data;
    } else {
      console.log('➕ Không có invoice, tạo mới từ booking');
      shouldCreateNewInvoice = true;
    }

    // Nếu cần tạo invoice mới
    if (shouldCreateNewInvoice) {
      const createResult = await createInvoiceFromBooking(targetBookingId, {
        customer_name: user?.full_name || user?.name || 'Khách hàng',
        customer_phone: user?.phone || '',
        customer_email: user?.email || '',
        notes: 'Tạo tự động từ hệ thống'
      });

      if (!createResult.success) {
        Alert.alert('Lỗi', createResult.error || 'Không thể tạo hóa đơn');
        navigation.goBack();
        return;
      }

      invoiceData = createResult.data;
    }

    // Lấy chi tiết invoice
    if (invoiceData && invoiceData.id) {
      console.log('🔍 Lấy chi tiết invoice:', invoiceData.id);
      const detailResult = await getInvoiceDetails(invoiceData.id);

      if (detailResult.success) {
        const fullInvoice = detailResult.data;
        setInvoice(fullInvoice);

        // Xử lý order items
        const bookingItems = fullInvoice.bookings?.order_items || [];
        const formattedItems = bookingItems.map(item => ({
          id: item.id,
          name: item.menus?.food_name || item.name || 'Món không tên',
          price: item.price_at_time || item.menus?.price || 0,
          quantity: item.quantity || 1,
        }));

        setItems(formattedItems);
        setSubtotal(fullInvoice.sub_total || 0);

        const remainingAmount = (fullInvoice.final_amount || 0) - (fullInvoice.paid_amount || 0);
        if (remainingAmount > 0) {
          setPaymentAmount(Math.floor(remainingAmount / 2).toString());
        }

        console.log(`✅ Đã tải ${formattedItems.length} món ăn cho invoice`);
      } else {
        console.error('❌ Lỗi lấy chi tiết invoice:', detailResult.error);
        // Fallback: sử dụng dữ liệu invoice cơ bản
        setInvoice(invoiceData);
        setSubtotal(invoiceData.sub_total || 0);
      }
    } else {
      // Nếu không có invoiceData.id
      console.error('❌ Invoice không có ID');
      Alert.alert('Lỗi', 'Không thể tạo hóa đơn');
    }
  } catch (error) {
    console.error('❌ Lỗi load invoice:', error);
    Alert.alert('Lỗi', 'Không thể tải hóa đơn');
  } finally {
    setLoading(false);
  }
};

  // Thêm hàm kiểm tra UUID
  const isValidUUID = (uuid) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuid && uuidRegex.test(uuid);
  };

  const handlePayment = async () => {
    if (!invoice) return;

    const amount = parseFloat(paymentAmount);
    const remainingAmount = (invoice.final_amount || 0) - (invoice.paid_amount || 0);

    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Lỗi', 'Vui lòng nhập số tiền hợp lệ');
      return;
    }

    if (amount > remainingAmount) {
      Alert.alert('Lỗi', `Số tiền thanh toán không được vượt quá ${remainingAmount.toLocaleString()} đ`);
      return;
    }

    Alert.alert(
      'Xác nhận thanh toán',
      `Bạn có chắc chắn muốn thanh toán ${amount.toLocaleString()} đ bằng ${paymentMethod === 'cash' ? 'tiền mặt' : paymentMethod}?\n\n` +
      `Loại thanh toán: ${paymentType === 'partial' ? 'Thanh toán một phần (không kết thúc booking)' : 'Thanh toán toàn bộ (kết thúc booking)'}`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Thanh toán',
          onPress: async () => {
            setLoading(true);
            try {
              const paymentData = {
                amount_actual: amount,
                reference_id: `PAY-${Date.now()}`,
              };

              let result;

              if (paymentType === 'partial') {
                result = await payInvoicePartial(invoice.id, paymentData);
              } else {
                result = await payInvoiceComplete(invoice.id, paymentData);
              }

              if (result.success) {
                await loadInvoice();

                Alert.alert(
                  'Thanh toán thành công!',
                  result.message,
                  [
                    {
                      text: 'OK',
                      onPress: () => {
                        setPaymentModalVisible(false);

                        if (paymentType === 'full') {
                          clearActiveBooking();
                          navigation.navigate('MainTabs');
                        }
                      }
                    }
                  ]
                );
              } else {
                Alert.alert('Lỗi', result.error || 'Thanh toán thất bại');
              }
            } catch (error) {
              Alert.alert('Lỗi', error.message || 'Thanh toán thất bại');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const printInvoice = () => {
    if (!invoice) return;

    const remainingAmount = (invoice.final_amount || 0) - (invoice.paid_amount || 0);

    const invoiceText = `
╔══════════════════════════════════════╗
║            HÓA ĐƠN THANH TOÁN        ║
╠══════════════════════════════════════╣
║ Mã hóa đơn: ${invoice.invoice_number || 'N/A'}
║ Ngày: ${new Date(invoice.issued_at || invoice.created_at).toLocaleDateString('vi-VN')}
║ Giờ: ${new Date(invoice.issued_at || invoice.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
╠══════════════════════════════════════╣
║ KHÁCH HÀNG
║ ${invoice.customer_name || user?.full_name || 'Khách hàng'}
║ ${invoice.customer_phone || user?.phone || ''}
╠══════════════════════════════════════╣
║ DANH SÁCH MÓN ĂN
${items.map(item => `║ ${item.name} x${item.quantity}: ${(item.price * item.quantity).toLocaleString()} đ`).join('\n')}
╠══════════════════════════════════════╣
║ TỔNG HỢP THANH TOÁN
║ Tổng tiền hàng: ${(invoice.sub_total || 0).toLocaleString()} đ
${invoice.tax_amount > 0 ? `║ Thuế (VAT): +${invoice.tax_amount.toLocaleString()} đ\n` : ''}
${invoice.service_fee > 0 ? `║ Phí dịch vụ: +${invoice.service_fee.toLocaleString()} đ\n` : ''}
${invoice.discount_amount > 0 ? `║ Giảm giá khuyến mãi: -${invoice.discount_amount.toLocaleString()} đ\n` : ''}
${invoice.rank_discount_amount > 0 ? `║ Giảm giá hạng thành viên (${invoice.rank_discount_percentage}%): -${invoice.rank_discount_amount.toLocaleString()} đ\n` : ''}
║ ------------------------------------
║ TỔNG CỘNG: ${(invoice.final_amount || 0).toLocaleString()} đ
║ Đã thanh toán: ${(invoice.paid_amount || 0).toLocaleString()} đ
║ CÒN LẠI: ${remainingAmount.toLocaleString()} đ
╠══════════════════════════════════════╣
║ Điểm tích lũy: ${invoice.points_earned || 0} điểm
║ Trạng thái: ${invoice.payment_status === 'paid' ? '✅ Đã thanh toán' :
                 invoice.payment_status === 'partial' ? '⚠️ Thanh toán một phần' :
                 '⏳ Chưa thanh toán'}
╚══════════════════════════════════════╝
`;

    Alert.alert('Hóa đơn', invoiceText, [
      { text: 'Đóng', style: 'cancel' },
      { text: 'Sao chép', onPress: () => {
        console.log('Đã sao chép hóa đơn');
      }}
    ]);
  };

  const calculateRemainingAmount = () => {
    if (!invoice) return 0;
    return (invoice.final_amount || 0) - (invoice.paid_amount || 0);
  };

  const remainingAmount = calculateRemainingAmount();
  const isFullyPaid = remainingAmount <= 0;

  if (loading && !invoice) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.loadingText}>Đang tải hóa đơn...</Text>
      </View>
    );
  }

  if (!invoice) {
    return (
      <View style={styles.container}>
        <Ionicons name="receipt-outline" size={80} color="#ccc" />
        <Text style={styles.noInvoiceText}>Không có hóa đơn</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadInvoice}>
          <Text style={styles.retryButtonText}>Thử lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Hóa đơn</Text>
          <TouchableOpacity onPress={printInvoice}>
            <Ionicons name="print-outline" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        {/* Invoice Info */}
        <View style={styles.invoiceCard}>
          <View style={styles.invoiceHeader}>
            <Text style={styles.invoiceNumber}>{invoice.invoice_number}</Text>
            <View style={[
              styles.statusBadge,
              invoice.payment_status === 'paid' ? styles.statusPaid :
              invoice.payment_status === 'partial' ? styles.statusPartial : styles.statusUnpaid
            ]}>
              <Text style={styles.statusText}>
                {invoice.payment_status === 'paid' ? 'Đã thanh toán' :
                 invoice.payment_status === 'partial' ? 'Thanh toán một phần' : 'Chưa thanh toán'}
              </Text>
            </View>
          </View>

          <Text style={styles.invoiceDate}>
            {new Date(invoice.issued_at || invoice.created_at).toLocaleDateString('vi-VN')} •
            {new Date(invoice.issued_at || invoice.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>

        {/* Customer Info */}
        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>Thông tin khách hàng</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Họ tên:</Text>
            <Text style={styles.infoValue}>{invoice.customer_name || user?.full_name}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Số điện thoại:</Text>
            <Text style={styles.infoValue}>{invoice.customer_phone || user?.phone}</Text>
          </View>
        </View>

        {/* Order Items */}
        {items.length > 0 && (
          <View style={styles.itemsCard}>
            <Text style={styles.sectionTitle}>Danh sách món ăn đã đặt</Text>
            {items.map((item, index) => (
              <View key={`item-${index}`} style={styles.itemRow}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemPrice}>{item.price.toLocaleString()} đ</Text>
                </View>
                <View style={styles.itemQuantityTotal}>
                  <Text style={styles.itemQuantity}>x{item.quantity}</Text>
                  <Text style={styles.itemTotal}>{(item.price * item.quantity).toLocaleString()} đ</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Summary với công thức tính toán */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Tổng hợp thanh toán</Text>

          {/* Subtotal từ order_items */}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tổng tiền hàng:</Text>
            <Text style={styles.summaryValue}>{(invoice.sub_total || 0).toLocaleString()} đ</Text>
          </View>

          {/* Tax */}
          {invoice.tax_amount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Thuế (VAT):</Text>
              <Text style={styles.summaryValue}>+{invoice.tax_amount.toLocaleString()} đ</Text>
            </View>
          )}

          {/* Service Fee */}
          {invoice.service_fee > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Phí dịch vụ:</Text>
              <Text style={styles.summaryValue}>+{invoice.service_fee.toLocaleString()} đ</Text>
            </View>
          )}

          {/* Discount */}
          {invoice.discount_amount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Giảm giá khuyến mãi:</Text>
              <Text style={styles.discountValue}>-{invoice.discount_amount.toLocaleString()} đ</Text>
            </View>
          )}

          {/* Rank Discount */}
          {invoice.rank_discount_amount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>
                Giảm giá hạng thành viên ({invoice.rank_discount_percentage}%):
              </Text>
              <Text style={styles.rankDiscountValue}>-{invoice.rank_discount_amount.toLocaleString()} đ</Text>
            </View>
          )}

          {/* Hiển thị công thức tính toán */}
          <View style={styles.calculationContainer}>
            <Text style={styles.calculationTitle}>Công thức tính:</Text>
            <Text style={styles.calculationFormula}>
              = {invoice.sub_total?.toLocaleString() || '0'} đ (tổng tiền hàng)
              {invoice.tax_amount > 0 ? ` + ${invoice.tax_amount.toLocaleString()} đ (thuế)` : ''}
              {invoice.service_fee > 0 ? ` + ${invoice.service_fee.toLocaleString()} đ (phí DV)` : ''}
              {invoice.discount_amount > 0 ? ` - ${invoice.discount_amount.toLocaleString()} đ (KM)` : ''}
              {invoice.rank_discount_amount > 0 ? ` - ${invoice.rank_discount_amount.toLocaleString()} đ (hạng)` : ''}
            </Text>
          </View>

          <View style={styles.divider} />

          {/* Final Amount */}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Thành tiền:</Text>
            <Text style={styles.totalAmount}>{(invoice.final_amount || 0).toLocaleString()} đ</Text>
          </View>

          {/* Đã thanh toán */}
          <View style={styles.paidRow}>
            <Text style={styles.paidLabel}>Đã thanh toán:</Text>
            <Text style={styles.paidAmount}>{invoice.paid_amount?.toLocaleString() || '0'} đ</Text>
          </View>

          {/* Còn lại */}
          <View style={styles.remainingRow}>
            <Text style={styles.remainingLabel}>Còn lại:</Text>
            <Text style={styles.remainingAmount}>{remainingAmount.toLocaleString()} đ</Text>
          </View>

          {/* Điểm tích lũy */}
          {invoice.points_earned > 0 && (
            <View style={styles.pointsRow}>
              <Ionicons name="trophy-outline" size={16} color="#FF6B35" />
              <Text style={styles.pointsText}>
                Bạn sẽ nhận được {invoice.points_earned || 0} điểm tích lũy
              </Text>
            </View>
          )}
        </View>

        {/* Payment Actions */}
        {!isFullyPaid && (
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={styles.payButton}
              onPress={() => {
                setPaymentType('partial');
                setPaymentModalVisible(true);
              }}
            >
              <Ionicons name="time-outline" size={24} color="white" />
              <Text style={styles.payButtonText}>Thanh toán một phần</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.payButton, styles.fullPaymentButton]}
              onPress={() => {
                setPaymentType('full');
                setPaymentAmount(remainingAmount.toString());
                setPaymentModalVisible(true);
              }}
            >
              <Ionicons name="checkmark-circle-outline" size={24} color="white" />
              <Text style={styles.payButtonText}>Thanh toán toàn bộ</Text>
            </TouchableOpacity>

            <View style={styles.paymentNoteContainer}>
              <Text style={styles.paymentNoteTitle}>Lưu ý:</Text>
              <Text style={styles.paymentNote}>
                • <Text style={styles.noteBold}>Thanh toán một phần</Text>: Chỉ cập nhật số tiền đã trả, không kết thúc booking
              </Text>
              <Text style={styles.paymentNote}>
                • <Text style={styles.noteBold}>Thanh toán toàn bộ</Text>: Kết thúc booking, cộng điểm và xóa món đã đặt
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Payment Modal */}
      <Modal
        visible={paymentModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setPaymentModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {paymentType === 'partial' ? 'Thanh toán một phần' : 'Thanh toán toàn bộ'}
            </Text>

            <View style={styles.amountContainer}>
              <Text style={styles.amountLabel}>Số tiền còn lại:</Text>
              <Text style={styles.remainingAmountDisplay}>{remainingAmount.toLocaleString()} đ</Text>
            </View>

            <Text style={styles.inputLabel}>Số tiền thanh toán:</Text>
            <View style={styles.amountInputContainer}>
              <TextInput
                style={styles.amountInput}
                value={paymentAmount}
                onChangeText={setPaymentAmount}
                placeholder="Nhập số tiền"
                keyboardType="numeric"
                editable={paymentType === 'partial'}
              />
              <Text style={styles.currencyText}>đ</Text>
            </View>

            {paymentType === 'partial' && (
              <View style={styles.quickAmounts}>
                {[remainingAmount * 0.25, remainingAmount * 0.5, remainingAmount * 0.75].map((amount, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.quickAmountButton}
                    onPress={() => setPaymentAmount(Math.floor(amount).toString())}
                  >
                    <Text style={styles.quickAmountText}>{Math.floor(amount).toLocaleString()} đ</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={styles.methodLabel}>Phương thức thanh toán:</Text>
            <View style={styles.methodContainer}>
              {['cash', 'momo', 'bank'].map(method => (
                <TouchableOpacity
                  key={method}
                  style={[
                    styles.methodButton,
                    paymentMethod === method && styles.methodButtonSelected
                  ]}
                  onPress={() => setPaymentMethod(method)}
                >
                  <Text style={styles.methodButtonText}>
                    {method === 'cash' ? '💵 Tiền mặt' :
                     method === 'momo' ? '📱 MoMo' :
                     '🏦 Chuyển khoản'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setPaymentModalVisible(false)}
                disabled={loading}
              >
                <Text style={styles.cancelButtonText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handlePayment}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text style={styles.confirmButtonText}>
                    {paymentType === 'partial' ? 'Thanh toán một phần' : 'Thanh toán toàn bộ'}
                  </Text>
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
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#666',
  },
  noInvoiceText: {
    fontSize: 18,
    color: '#666',
    marginTop: 20,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
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
  invoiceCard: {
    backgroundColor: 'white',
    margin: 20,
    marginTop: 10,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  invoiceNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  statusPaid: {
    backgroundColor: '#D4EDDA',
  },
  statusPartial: {
    backgroundColor: '#FFF3CD',
  },
  statusUnpaid: {
    backgroundColor: '#F8D7DA',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  invoiceDate: {
    fontSize: 14,
    color: '#666',
  },
  infoCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 10,
    padding: 20,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    width: 120,
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  itemsCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 10,
    padding: 20,
    borderRadius: 12,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    color: '#333',
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 14,
    color: '#666',
  },
  itemQuantityTotal: {
    alignItems: 'flex-end',
  },
  itemQuantity: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  itemTotal: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  summaryCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 12,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 16,
    color: '#333',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  discountValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#28a745',
  },
  rankDiscountValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#dc3545',
  },
  calculationContainer: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    marginTop: 10,
    marginBottom: 15,
  },
  calculationTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  calculationFormula: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 15,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  paidRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  paidLabel: {
    fontSize: 14,
    color: '#666',
  },
  paidAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#28a745',
  },
  remainingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  remainingLabel: {
    fontSize: 16,
    color: '#333',
    fontWeight: 'bold',
  },
  remainingAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  pointsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  pointsText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  actionsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B35',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
  },
  fullPaymentButton: {
    backgroundColor: '#28a745',
  },
  payButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  paymentNoteContainer: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    marginTop: 15,
  },
  paymentNoteTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  paymentNote: {
    fontSize: 13,
    color: '#666',
    marginBottom: 5,
    lineHeight: 18,
  },
  noteBold: {
    fontWeight: 'bold',
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
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  amountContainer: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    alignItems: 'center',
  },
  amountLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  remainingAmountDisplay: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 15,
  },
  amountInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 18,
    color: '#333',
  },
  currencyText: {
    fontSize: 18,
    color: '#666',
    marginLeft: 10,
  },
  quickAmounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  quickAmountButton: {
    backgroundColor: '#e9ecef',
    padding: 10,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  quickAmountText: {
    fontSize: 14,
    color: '#333',
  },
  methodLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  methodContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  methodButton: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 10,
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  methodButtonSelected: {
    borderColor: '#FF6B35',
    backgroundColor: '#FFF0EC',
  },
  methodButtonText: {
    fontSize: 14,
    color: '#333',
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
});

export default InvoiceScreen;
