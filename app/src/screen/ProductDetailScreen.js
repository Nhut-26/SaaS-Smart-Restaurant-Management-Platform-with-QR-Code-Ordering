import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getProductById } from '../api/client';

const ProductDetailScreen = ({ route, navigation }) => {
  const { productId } = route.params;
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchProductDetails();
  }, [productId]);

  const fetchProductDetails = async () => {
    try {
      setLoading(true);
      const data = await getProductById(productId);
      setProduct(data);
      setError(null);
    } catch (err) {
      setError('Không thể tải thông tin sản phẩm');
      console.error('Product detail error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (error || !product) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error || 'Sản phẩm không tồn tại'}</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Image
          source={{ uri: product.image || 'https://via.placeholder.com/300' }}
          style={styles.productImage}
        />
        
        <View style={styles.content}>
          <Text style={styles.productName}>{product.name}</Text>
          
          <View style={styles.priceContainer}>
            <Text style={styles.productPrice}>${product.price}</Text>
            {product.originalPrice && (
              <Text style={styles.originalPrice}>${product.originalPrice}</Text>
            )}
            {product.discount && (
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>-{product.discount}%</Text>
              </View>
            )}
          </View>
          
          <View style={styles.categoryContainer}>
            <Text style={styles.categoryLabel}>Danh mục:</Text>
            <Text style={styles.categoryValue}>{product.category}</Text>
          </View>
          
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Mô tả</Text>
            <Text style={styles.description}>{product.description}</Text>
          </View>
          
          {product.specifications && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Thông số kỹ thuật</Text>
              {Object.entries(product.specifications).map(([key, value]) => (
                <View key={key} style={styles.specRow}>
                  <Text style={styles.specKey}>{key}:</Text>
                  <Text style={styles.specValue}>{value}</Text>
                </View>
              ))}
            </View>
          )}
          
          <View style={styles.infoSection}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Trạng thái</Text>
              <View style={[styles.statusBadge, 
                { backgroundColor: product.inStock ? '#40c057' : '#fa5252' }]}>
                <Text style={styles.statusText}>
                  {product.inStock ? 'Còn hàng' : 'Hết hàng'}
                </Text>
              </View>
            </View>
            
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Đánh giá</Text>
              <Text style={styles.infoValue}>{product.rating || '4.5'} ⭐</Text>
            </View>
            
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Đã bán</Text>
              <Text style={styles.infoValue}>{product.sold || '100'}+</Text>
            </View>
          </View>
        </View>
      </ScrollView>
      
      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.buyButton, !product.inStock && styles.disabledButton]}
          disabled={!product.inStock}
        >
          <Text style={styles.buyButtonText}>
            {product.inStock ? 'Thêm vào giỏ hàng' : 'Hết hàng'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  productImage: {
    width: '100%',
    height: 300,
    backgroundColor: '#f8f9fa',
    resizeMode: 'contain',
  },
  content: {
    padding: 20,
  },
  productName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 12,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  productPrice: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2b8a3e',
    marginRight: 12,
  },
  originalPrice: {
    fontSize: 18,
    color: '#868e96',
    textDecorationLine: 'line-through',
    marginRight: 12,
  },
  discountBadge: {
    backgroundColor: '#ff6b6b',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  discountText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 12,
  },
  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  categoryLabel: {
    fontSize: 14,
    color: '#868e96',
    marginRight: 8,
  },
  categoryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#495057',
    backgroundColor: '#e9ecef',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#343a40',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#495057',
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  specKey: {
    fontSize: 14,
    color: '#868e96',
  },
  specValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#495057',
  },
  infoSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  infoItem: {
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 12,
    color: '#868e96',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#495057',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 12,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    backgroundColor: 'white',
  },
  buyButton: {
    backgroundColor: '#228be6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#adb5bd',
  },
  buyButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  backButton: {
    backgroundColor: '#495057',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  backButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#e03131',
    textAlign: 'center',
    marginBottom: 16,
  },
});

export default ProductDetailScreen;