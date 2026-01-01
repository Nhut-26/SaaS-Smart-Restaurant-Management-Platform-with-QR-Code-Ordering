import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useCart } from '../context/CartContext'; 
import { useAuth } from '../context/AuthContext';

const { width } = Dimensions.get('window');

const GuestMenuScreen = ({ navigation }) => {
  const { sessionId, getSessionTimeout, clearGuestSession, isGuest } = useAuth();
  const { cart, addToCart, removeFromCart, totalItems, clearCart } = useCart();
  const [timeLeft, setTimeLeft] = useState(getSessionTimeout());
  const [menuItems] = useState([
    { id: '1', name: 'Phở Bò', price: 65000, category: 'Món chính', description: 'Phở bò truyền thống', image: 'https://via.placeholder.com/300x200' },
    { id: '2', name: 'Bún Chả', price: 55000, category: 'Món chính', description: 'Bún chả Hà Nội', image: 'https://via.placeholder.com/300x200' },
    { id: '3', name: 'Gỏi Cuốn', price: 35000, category: 'Khai vị', description: 'Gỏi cuốn tôm thịt', image: 'https://via.placeholder.com/300x200' },
    { id: '4', name: 'Nem Rán', price: 40000, category: 'Khai vị', description: 'Nem rán giòn', image: 'https://via.placeholder.com/300x200' },
    { id: '5', name: 'Cơm Rang', price: 45000, category: 'Ăn nhanh', description: 'Cơm rang thập cẩm', image: 'https://via.placeholder.com/300x200' },
    { id: '6', name: 'Bánh Mì', price: 30000, category: 'Ăn nhanh', description: 'Bánh mì pate', image: 'https://via.placeholder.com/300x200' },
    { id: '7', name: 'Trà Đào', price: 25000, category: 'Nước uống', description: 'Trà đào cam sả', image: 'https://via.placeholder.com/300x200' },
    { id: '8', name: 'Cà Phê', price: 20000, category: 'Nước uống', description: 'Cà phê đen', image: 'https://via.placeholder.com/300x200' },
  ]);
  
  const [categories] = useState(['Tất cả', 'Món chính', 'Khai vị', 'Ăn nhanh', 'Nước uống']);
  const [selectedCategory, setSelectedCategory] = useState('Tất cả');
  const [searchQuery, setSearchQuery] = useState('');

  // Session timeout countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1000) {
          clearInterval(timer);
          Alert.alert(
            'Phiên hết hạn',
            'Phiên làm việc của bạn đã hết. Vui lòng quét lại QR code.',
            [{ text: 'OK', onPress: () => handleLogout() }]
          );
          return 0;
        }
        return prev - 1000;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (ms) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const filteredItems = menuItems.filter(item => {
    const matchesCategory = selectedCategory === 'Tất cả' || item.category === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const renderMenuItem = ({ item }) => {
    const cartItem = cart[item.id];
    const quantity = cartItem?.quantity || 0;

    return (
      <View style={styles.menuItemCard}>
        <Image source={{ uri: item.image }} style={styles.itemImage} />
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.itemDescription} numberOfLines={2}>
            {item.description}
          </Text>
          <View style={styles.itemFooter}>
            <Text style={styles.itemPrice}>{item.price.toLocaleString()} đ</Text>
            <View style={styles.quantityControls}>
              {quantity > 0 ? (
                <>
                  <TouchableOpacity 
                    style={styles.quantityButton}
                    onPress={() => removeFromCart(item)}
                  >
                    <Ionicons name="remove" size={18} color="#FF6B35" />
                  </TouchableOpacity>
                  <Text style={styles.quantityText}>{quantity}</Text>
                </>
              ) : null}
              <TouchableOpacity 
                style={styles.addButton}
                onPress={() => addToCart(item)}
              >
                <Ionicons name="add-circle" size={24} color="#FF6B35" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const goToCart = () => {
    if (totalItems === 0) {
      Alert.alert('Giỏ hàng trống', 'Vui lòng chọn món ăn trước khi xem giỏ hàng');
      return;
    }
    navigation.navigate('GuestCart');
  };

  const calculateCartTotal = () => {
    return Object.values(cart).reduce((sum, cartItem) => 
      sum + (cartItem.item.price * cartItem.quantity), 0
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Kết thúc phiên khách',
      'Bạn có chắc muốn kết thúc phiên làm việc này?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Đồng ý',
          onPress: () => {
            clearCart();
            clearGuestSession();
            navigation.navigate('QrScanner');
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Guest Session Header */}
      <View style={styles.guestHeader}>
        <View style={styles.sessionInfo}>
          <Ionicons name="qr-code" size={20} color="#FF6B35" />
          <Text style={styles.sessionText}>Khách - Phiên #{sessionId?.substring(0, 8)}</Text>
        </View>
        <View style={styles.timerContainer}>
          <Ionicons name="time-outline" size={16} color="#FF6B35" />
          <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Ionicons name="exit-outline" size={20} color="#FF6B35" />
        </TouchableOpacity>
      </View>

      {/* Menu Content */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Thực đơn</Text>
        <TouchableOpacity style={styles.cartButton} onPress={goToCart}>
          <Ionicons name="cart-outline" size={24} color="#333" />
          {totalItems > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{totalItems}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm món ăn..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={styles.categoryContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {categories.map((category) => (
            <TouchableOpacity
              key={category}
              style={[
                styles.categoryButton,
                selectedCategory === category && styles.categoryButtonActive
              ]}
              onPress={() => setSelectedCategory(category)}
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

      <FlatList
        data={filteredItems}
        renderItem={renderMenuItem}
        keyExtractor={item => item.id}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {totalItems > 0 && (
        <TouchableOpacity style={styles.floatingCartButton} onPress={goToCart}>
          <View style={styles.floatingCartContent}>
            <Ionicons name="cart" size={24} color="white" />
            <View style={styles.floatingCartInfo}>
              <Text style={styles.floatingCartText}>{totalItems} món</Text>
              <Text style={styles.floatingCartPrice}>
                {calculateCartTotal().toLocaleString()} đ
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  guestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF0EC',
    padding: 15,
    paddingTop: 40,
    borderBottomWidth: 1,
    borderBottomColor: '#FFD9CC',
  },
  sessionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sessionText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#FF6B35',
    fontWeight: '600',
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#FF6B35',
  },
  timerText: {
    marginLeft: 5,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  logoutButton: {
    padding: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  cartButton: {
    position: 'relative',
    padding: 8,
  },
  cartBadge: {
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
  cartBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 25,
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
    backgroundColor: 'white',
    paddingVertical: 10,
  },
  categoryButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginHorizontal: 5,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
  },
  categoryButtonActive: {
    backgroundColor: '#FF6B35',
  },
  categoryText: {
    fontSize: 14,
    color: '#666',
  },
  categoryTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  columnWrapper: {
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  listContent: {
    paddingBottom: 100,
  },
  menuItemCard: {
    width: (width - 40) / 2,
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 15,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    marginBottom: 10,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
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
    marginHorizontal: 10,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  addButton: {
    padding: 5,
  },
  floatingCartButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#FF6B35',
    borderRadius: 25,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  floatingCartContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingCartInfo: {
    marginLeft: 15,
  },
  floatingCartText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  floatingCartPrice: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default GuestMenuScreen;