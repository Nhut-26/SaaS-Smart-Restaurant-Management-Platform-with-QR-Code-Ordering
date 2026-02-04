import { useState, useEffect, useCallback } from 'react';
import { getRestaurants } from '../config/supabase';

const useRestaurantList = () => {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [isEmpty, setIsEmpty] = useState(false);

  const loadRestaurants = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setIsEmpty(false);

      const result = await getRestaurants();

      if (result.success) {
        if (result.data && result.data.length > 0) {
          setRestaurants(result.data);
          console.log('✅ Đã tải', result.data.length, 'nhà hàng từ Supabase');
        } else {
          setRestaurants([]);
          setIsEmpty(true);
          console.log('⚠️ Không có nhà hàng nào');
        }
      } else {
        setError(result.error || 'Không thể tải danh sách nhà hàng');
        console.error('❌ Lỗi khi tải nhà hàng:', result.error);
        setRestaurants([]);
        setIsEmpty(true);
      }
    } catch (err) {
      setError(err.message || 'Có lỗi xảy ra khi tải nhà hàng');
      console.error('❌ Lỗi trong loadRestaurants:', err.message);
      setRestaurants([]);
      setIsEmpty(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadRestaurants();
  }, [loadRestaurants]);

  useEffect(() => {
    loadRestaurants();
  }, [loadRestaurants]);

  return {
    restaurants,
    loading,
    refreshing,
    error,
    isEmpty,
    onRefresh,
    reload: loadRestaurants
  };
};

export default useRestaurantList;
