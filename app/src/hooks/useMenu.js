import { useState, useEffect, useCallback, useMemo } from 'react';
import { getMenuItemsByRestaurant } from '../config/supabase';

const useMenu = (restaurantId, restaurantCategory = 'default') => {
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState(['Tất cả']);
  const [selectedCategory, setSelectedCategory] = useState('Tất cả');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEmpty, setIsEmpty] = useState(false);

  const loadMenuItems = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setIsEmpty(false);

      console.log(`📡 Đang tải menu cho nhà hàng: ${restaurantId}`);

      let result;
      if (restaurantId && restaurantId !== 'unknown') {
        result = await getMenuItemsByRestaurant(restaurantId);
        console.log('📊 Kết quả từ Supabase:', result);
      } else {
        console.log('⚠️ Không có restaurantId hợp lệ:', restaurantId);
        result = {
          success: false,
          error: 'ID nhà hàng không hợp lệ',
          data: []
        };
      }

      if (result.success) {
        if (result.data && result.data.length > 0) {
          setMenuItems(result.data);

          const uniqueCategories = ['Tất cả', ...new Set(result.data.map(item => item.category).filter(Boolean))];
          setCategories(uniqueCategories);
          setIsEmpty(false);

          console.log('✅ Đã tải', result.data.length, 'món ăn từ Supabase');
          console.log('📋 Categories:', uniqueCategories);
        } else {
          setMenuItems([]);
          setCategories(['Tất cả']);
          setIsEmpty(true);
          console.log('⚠️ Nhà hàng không có món ăn nào');
        }
      } else {
        console.log('❌ Lỗi khi tải menu:', result.error);
        setError(result.error || 'Không thể tải menu từ server');
        setMenuItems([]);
        setCategories(['Tất cả']);
        setIsEmpty(true);
      }
    } catch (error) {
      console.error('🚨 Lỗi trong loadMenuItems:', error);
      setError(error.message || 'Có lỗi xảy ra khi tải menu');
      setMenuItems([]);
      setCategories(['Tất cả']);
      setIsEmpty(true);
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  const filteredItems = useMemo(() => {
    return menuItems.filter(item => {
      const matchesCategory = selectedCategory === 'Tất cả' || item.category === selectedCategory;
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [menuItems, selectedCategory, searchQuery]);

  const handleCategoryChange = useCallback((category) => {
    setSelectedCategory(category);
  }, []);

  const handleSearchChange = useCallback((query) => {
    setSearchQuery(query);
  }, []);

  const resetFilters = useCallback(() => {
    setSelectedCategory('Tất cả');
    setSearchQuery('');
  }, []);

  const reloadMenu = useCallback(async () => {
    await loadMenuItems();
  }, [loadMenuItems]);

  useEffect(() => {
    if (restaurantId) {
      loadMenuItems();
    }
  }, [restaurantId, loadMenuItems]);

  return {
    menuItems,
    filteredItems,
    categories,
    selectedCategory,
    searchQuery,

    loading,
    error,
    isEmpty,

    handleCategoryChange,
    handleSearchChange,
    resetFilters,
    reloadMenu,

    getMenuItemById: useCallback((id) => {
      return menuItems.find(item => item.id === id);
    }, [menuItems]),

    getMenuItemsByCategory: useCallback((category) => {
      return menuItems.filter(item => item.category === category);
    }, [menuItems]),

    getBestSellers: useCallback(() => {
      return menuItems.filter(item => item.is_best_seller);
    }, [menuItems]),

    getOutOfStockItems: useCallback(() => {
      return menuItems.filter(item => item.stock_count !== undefined && item.stock_count <= 0);
    }, [menuItems]),

    getAvailableItems: useCallback(() => {
      return menuItems.filter(item =>
        item.stock_count === undefined || item.stock_count > 0
      );
    }, [menuItems])
  };
};

export default useMenu;
