
import React, { useState } from 'react'; 
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  TextInput, 
  Modal, 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useCart } from '../context/CartContext';

const CartScreen = ({ navigation }) => {
  const { 
    cart, 
    addToCart, 
    removeFromCart, 
    clearCart, 
    removeItem, 
    totalItems, 
    totalPrice,
    itemNotes,
    updateItemNote
  } = useCart();
  
  const [editingNoteItemId, setEditingNoteItemId] = useState(null); 
  const [tempNote, setTempNote] = useState(''); 

  const calculateTotal = () => {
    return Object.values(cart).reduce((total, cartItem) => {
      return total + (cartItem.item.price * cartItem.quantity);
    }, 0);
  };

  const confirmOrder = () => {
    if (totalItems === 0) {
      Alert.alert('Giỏ hàng trống', 'Vui lòng chọn món ăn trước khi đặt');
      return;
    }
    navigation.navigate('Payment', { 
      cart, 
      totalAmount: totalPrice || calculateTotal(),
      itemNotes
    });
  };

  const openNoteEditor = (itemId, currentNote) => {
    setEditingNoteItemId(itemId);
    setTempNote(currentNote || '');
  };

  const saveNote = () => {
    if (editingNoteItemId) {
      updateItemNote(editingNoteItemId, tempNote);
      setEditingNoteItemId(null);
      setTempNote('');
    }
  };

  const renderCartItem = ({ item: cartItem }) => {
    const item = cartItem.item;
    const quantity = cartItem.quantity;
    const itemTotal = item.price * quantity;
    const note = itemNotes[item.id] || ''; 

    return (
      <View style={styles.cartItem}>
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.itemDescription} numberOfLines={2}>
            {item.description}
          </Text>
          <Text style={styles.itemPrice}>{item.price.toLocaleString()} đ</Text>
        </View>
        
        {/* NEW: Note display and edit button */}
        <TouchableOpacity 
          style={styles.noteContainer}
          onPress={() => openNoteEditor(item.id, note)}
        >
          <Ionicons name="pencil" size={16} color="#666" />
          <Text style={styles.noteText} numberOfLines={1}>
            {note || 'Thêm ghi chú...'}
          </Text>
        </TouchableOpacity>
        
        <View style={styles.itemControls}>
          <View style={styles.quantityControls}>
            <TouchableOpacity 
              style={styles.quantityButton}
              onPress={() => removeFromCart(item)}
            >
              <Ionicons name="remove" size={18} color="#FF6B35" />
            </TouchableOpacity>
            
            <Text style={styles.quantityText}>{quantity}</Text>
            
            <TouchableOpacity 
              style={styles.quantityButton}
              onPress={() => addToCart(item)}
            >
              <Ionicons name="add" size={18} color="#FF6B35" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.itemTotal}>
            <Text style={styles.totalPrice}>{itemTotal.toLocaleString()} đ</Text>
            <TouchableOpacity 
              style={styles.deleteButton}
              onPress={() => removeItem(item.id)}
            >
              <Ionicons name="trash-outline" size={18} color="#dc3545" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const cartItems = Object.values(cart);
  const finalTotalPrice = totalPrice || calculateTotal();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Giỏ hàng</Text>
        <View style={{ width: 24 }} />
      </View>

      {cartItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="cart-outline" size={80} color="#ccc" />
          <Text style={styles.emptyTitle}>Giỏ hàng trống</Text>
          <Text style={styles.emptyText}>Hãy chọn món ăn yêu thích của bạn</Text>
          <TouchableOpacity 
            style={styles.browseButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.browseButtonText}>Xem thực đơn</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <FlatList
            data={cartItems}
            renderItem={renderCartItem}
            keyExtractor={(item) => item.item.id.toString()}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
          
          {/* Order Summary */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Tóm tắt đơn hàng</Text>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Số món:</Text>
              <Text style={styles.summaryValue}>{totalItems} món</Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Tạm tính:</Text>
              <Text style={styles.summaryValue}>{finalTotalPrice.toLocaleString()} đ</Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Phí dịch vụ:</Text>
              <Text style={styles.summaryValue}>0 đ</Text>
            </View>
            
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Tổng cộng:</Text>
              <Text style={styles.totalValue}>{finalTotalPrice.toLocaleString()} đ</Text>
            </View>
          </View>
          
          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.clearButton]}
              onPress={() => {
                Alert.alert(
                  'Xóa giỏ hàng',
                  'Bạn có chắc chắn muốn xóa tất cả món trong giỏ hàng?',
                  [
                    { text: 'Hủy', style: 'cancel' },
                    {
                      text: 'Xóa tất cả',
                      onPress: () => clearCart(),
                      style: 'destructive'
                    }
                  ]
                );
              }}
            >
              <Ionicons name="trash-outline" size={20} color="#dc3545" />
              <Text style={styles.clearButtonText}>Xóa giỏ hàng</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, styles.orderButton]}
              onPress={confirmOrder}
            >
              <Ionicons name="checkmark-circle" size={20} color="white" />
              <Text style={styles.orderButtonText}>
                Đặt món ({finalTotalPrice.toLocaleString()} đ)
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Note Editor Modal */}
      <Modal
        visible={!!editingNoteItemId}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditingNoteItemId(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ghi chú món ăn</Text>
              <TouchableOpacity onPress={() => setEditingNoteItemId(null)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <TextInput
              style={styles.noteInputModal}
              placeholder="Nhập ghi chú cho món này (ví dụ: ít cay, không hành...)"
              value={tempNote}
              onChangeText={setTempNote}
              multiline
              numberOfLines={4}
              autoFocus
            />
            
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setEditingNoteItemId(null)}
              >
                <Text style={styles.cancelButtonText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.saveButton]}
                onPress={saveNote}
              >
                <Text style={styles.saveButtonText}>Lưu ghi chú</Text>
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
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  listContent: {
    padding: 20,
  },
  cartItem: {
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
  itemInfo: {
    marginBottom: 10,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  itemDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  itemPrice: {
    fontSize: 14,
    color: '#FF6B35',
    fontWeight: '600',
  },
  // NEW: Note styles
  noteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  noteText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  itemControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 10,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFF0EC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '600',
    marginHorizontal: 15,
    color: '#333',
  },
  itemTotal: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  totalPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B35',
    marginRight: 15,
  },
  deleteButton: {
    padding: 5,
  },
  summaryCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 10,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 10,
    marginTop: 5,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 10,
    marginHorizontal: 5,
  },
  clearButton: {
    backgroundColor: '#FFF0EC',
    borderWidth: 1,
    borderColor: '#dc3545',
  },
  clearButtonText: {
    color: '#dc3545',
    fontWeight: '600',
    marginLeft: 10,
  },
  orderButton: {
    backgroundColor: '#FF6B35',
  },
  orderButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 10,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
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
    marginTop: 5,
    marginBottom: 30,
    textAlign: 'center',
  },
  browseButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
  },
  browseButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  // NEW: Modal styles
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
  noteInputModal: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlignVertical: 'top',
    minHeight: 100,
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
  saveButton: {
    backgroundColor: '#FF6B35',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CartScreen;
