import { useState, useEffect, useCallback } from 'react';
import { getRestaurantById, getBestSellerItems, getReviewsByRestaurant } from '../config/supabase';

const useRestaurantDetail = (restaurantId) => {
  const [restaurant, setRestaurant] = useState(null);
  const [bestSellers, setBestSellers] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notFound, setNotFound] = useState(false);

  const loadRestaurantDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setNotFound(false);

      if (!restaurantId) {
        throw new Error('Không có restaurant ID');
      }

      const restaurantResult = await getRestaurantById(restaurantId);

      const bestSellerResult = await getBestSellerItems(restaurantId);
      const reviewsResult = await getReviewsByRestaurant(restaurantId, 3);

      if (restaurantResult.success && restaurantResult.data) {
        const restaurantData = restaurantResult.data;

        if (bestSellerResult.success && bestSellerResult.data.length > 0) {
          const bestSellerNames = bestSellerResult.data.map(item => item.name);
          restaurantData.popularItems = bestSellerNames;
          setBestSellers(bestSellerResult.data.slice(0, 3)); 
        } else {
          restaurantData.popularItems = [];
          setBestSellers([]);
        }

        setRestaurant(restaurantData);
        if (reviewsResult && reviewsResult.success) {
          setReviews(reviewsResult.data || []);
        } else {
          setReviews([]);
        }
      } else {
        setError(restaurantResult.error || 'Không tìm thấy nhà hàng');
        setNotFound(true);
        setRestaurant(null);
        setBestSellers([]);
        setReviews([]);
      }
    } catch (error) {
      console.error('❌ Lỗi load chi tiết:', error);
      setError(error.message || 'Có lỗi xảy ra khi tải thông tin nhà hàng');
      setNotFound(true);
      setRestaurant(null);
      setBestSellers([]);
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    if (restaurantId) {
      loadRestaurantDetails();
    } else {
      setError('Không có ID nhà hàng');
      setLoading(false);
    }
  }, [restaurantId, loadRestaurantDetails]);

  const refetch = useCallback(() => {
    loadRestaurantDetails();
  }, [loadRestaurantDetails]);

  return {
    restaurant,
    bestSellers,
    reviews,
    loading,
    error,
    notFound,
    refetch
  };
};

export default useRestaurantDetail;
