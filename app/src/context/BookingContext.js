import React, { createContext, useState, useContext, useCallback, useEffect } from 'react';
import {
  supabase,
  createBooking,
  updateBooking,
  getActiveUserBooking,
  getOrCreateTableId,
  createInvoiceFromBooking,
  payInvoice,
  createAndPayInvoiceForBooking,
  getInvoiceByBookingId,
  upsertInvoiceSubTotal,
  setTableStatusSafe,
} from '../config/supabase';
import { useAuth } from './AuthContext';
import { useCart } from './CartContext';

const BookingContext = createContext();

export const useBooking = () => {
  const context = useContext(BookingContext);
  if (!context) {
    throw new Error('useBooking must be used within a BookingProvider');
  }
  return context;
};

export const BookingProvider = ({ children }) => {
  const { user } = useAuth();
  const cartContext = useCart();
  const clearCart = cartContext?.clearCart;
  const [activeBooking, setActiveBooking] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeInvoice, setActiveInvoice] = useState(null);

  useEffect(() => {
    if (user?.id) {
      loadBookings();
    } else {
      setBookings([]);
      setActiveBooking(null);
      setActiveInvoice(null);
    }
  }, [user?.id]);

  const loadBookings = useCallback(async () => {
    if (!user?.id) {
      console.log('❌ Không có user, không thể load bookings');
      return;
    }

    try {
      console.log('🔄 Đang load bookings cho user:', user.id);
      setIsLoading(true);
      setError(null);

      const { data: userBookings, error } = await supabase
        .from('bookings')
        .select(`
          *,
          tables:table_id (
            id,
            table_name,
            capacity,
            status
          ),
          restaurants:restaurant_id (
            id,
            name,
            cuisine_type,
            image_url
          ),
          order_items (
            id,
            food_id,
            quantity,
            price_at_time,
            menus:food_id (
              id,
              food_name,
              price,
              category,
              description
            )
          )
        `)
        .eq('user_id', user.id)
        .in('status', ['confirmed', 'pending'])
        .order('booking_time', { ascending: false });

      if (error) {
        console.error('❌ Lỗi load bookings từ Supabase:', error);
        setError(error.message);
        return;
      }

      console.log(`✅ Load được ${userBookings?.length || 0} bookings`);

      if (userBookings) {
        setBookings(userBookings);

        const active = userBookings.find(b => 
          b.status === 'confirmed' || b.status === 'pending'
        );
        
        if (active) {
          console.log('🔍 Tìm thấy active booking:', active.id, 'status:', active.status);
          setActiveBooking(active);
          
          await loadInvoiceForBooking(active.id);
        } else {
          console.log('ℹ️ Không tìm thấy active booking');
          setActiveBooking(null);
          setActiveInvoice(null);
        }
      }
    } catch (error) {
      console.error('❌ Lỗi khi load bookings:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const loadInvoiceForBooking = async (bookingId) => {
    if (!bookingId) {
      console.warn('⚠️ loadInvoiceForBooking: bookingId không hợp lệ');
      setActiveInvoice(null);
      return;
    }

    try {
      console.log(`📋 Đang tải invoice cho booking: ${bookingId}`);

      const result = await getInvoiceByBookingId(bookingId);

      if (result.success && result.data && result.data.id) {
        console.log('✅ Đã tải invoice:', result.data.id, 'invoice_number:', result.data.invoice_number || 'N/A');
        setActiveInvoice(result.data);
      } else if (result.error) {
        console.error('❌ Lỗi tải invoice:', result.error);
        setActiveInvoice(null);
      } else {
        console.log('ℹ️ Chưa có invoice cho booking này');
        setActiveInvoice(null);
      }
    } catch (error) {
      console.error('❌ Lỗi tải invoice:', error);
      setActiveInvoice(null);
    }
  };

  const loadOrderItemsForBooking = async (booking) => {
    if (!booking?.id) {
      console.warn('⚠️ loadOrderItemsForBooking: Booking không hợp lệ');
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('order_items')
        .select(`
          id,
          food_id,
          quantity,
          price_at_time,
          menus:food_id (
            id,
            food_name,
            price,
            category,
            description
          )
        `)
        .eq('booking_id', booking.id);

      if (error) {
        console.error('❌ Lỗi khi tải order items:', error);
        return [];
      }

      const items = data || [];
      console.log(`✅ Load được ${items.length} order items cho booking ${booking.id}`);

      setBookings(prev => prev.map(b => 
        b.id === booking.id ? { ...b, order_items: items } : b
      ));

      if (activeBooking?.id === booking.id) {
        setActiveBooking(prev => ({ ...prev, order_items: items }));
      }

      try {
        const subTotal = items.reduce((sum, item) => {
          const price = item.price_at_time || item.menus?.price || 0;
          const qty = item.quantity || 1;
          return sum + price * qty;
        }, 0);

        if (booking.id) {
          await upsertInvoiceSubTotal(booking.id, subTotal);
        }
      } catch (syncErr) {
        console.warn('⚠️ Không thể sync sub_total lên Supabase:', syncErr.message || syncErr);
      }

      return items;
    } catch (error) {
      console.error('❌ Lỗi trong loadOrderItemsForBooking:', error);
      return [];
    }
  };

  const calculateOrderTotal = (orderItems) => {
    if (!orderItems || orderItems.length === 0) return 0;
    return orderItems.reduce((total, item) => {
      const price = item.price_at_time || item.menus?.price || 0;
      const quantity = item.quantity || 1;
      return total + (price * quantity);
    }, 0);
  };

  const createNewBooking = useCallback(async (bookingData) => {
    try {
      console.log('🔄 Bắt đầu tạo booking với dữ liệu:', bookingData);
      setIsLoading(true);
      setError(null);

      if (bookingData && bookingData.id) {
        console.log('📥 Đã có booking từ server, đăng ký vào context');

        try {
          const { data: fetched, error: fetchErr } = await supabase
            .from('bookings')
            .select(`
              *,
              restaurants:restaurant_id (id, name, cuisine_type, image_url),
              tables:table_id (id, table_name, capacity, status),
              order_items (id, food_id, quantity, price_at_time)
            `)
            .eq('id', bookingData.id)
            .single();

          if (fetchErr || !fetched) {
            const serverBooking = {
              ...bookingData,
              user_id: user?.id || bookingData.user_id,
              restaurant_id: bookingData.restaurant_id || bookingData.restaurantId,
              restaurantName: bookingData.restaurants?.name || bookingData.restaurantName || 'Nhà hàng',
              table_id: bookingData.table_id || bookingData.tableId || null,
              tableNumber: bookingData.tables?.table_name || bookingData.tableNumber || 'Bàn không tên',
              status: 'confirmed',
              order_items: bookingData.order_items || []
            };

            setBookings(prev => {
              const filtered = prev.filter(b => b.id !== serverBooking.id);
              return [serverBooking, ...filtered];
            });

            setActiveBooking(serverBooking);

            try {
              await loadBookings();
            } catch (e) {
              console.warn('⚠️ Không thể reload bookings:', e.message || e);
            }

            setActiveInvoice(null);
            console.log('✅ Đã đăng ký booking từ server vào context:', serverBooking.id);
            return { success: true, booking: serverBooking };
          }

          fetched.order_items = fetched.order_items || [];
          fetched.status = 'confirmed';
          setBookings(prev => {
            const filtered = prev.filter(b => b.id !== fetched.id);
            return [fetched, ...filtered];
          });
          setActiveBooking(fetched);
          
          try {
            await loadBookings();
          } catch (e) {
            console.warn('⚠️ Không thể reload bookings:', e.message || e);
          }
          
          setActiveInvoice(null);
          console.log('✅ Đã đăng ký booking từ server:', fetched.id);
          return { success: true, booking: fetched };
        } catch (err) {
          console.warn('⚠️ Lỗi khi xử lý booking server:', err.message || err);
        }
      }

      if (!user) {
        console.error('❌ Chưa đăng nhập');
        return { success: false, error: 'Chưa đăng nhập' };
      }

      if (!bookingData.restaurant_id && !bookingData.restaurantId) {
        console.error('❌ Thiếu restaurant_id');
        return { success: false, error: 'Thiếu thông tin nhà hàng' };
      }

      const restaurantId = bookingData.restaurant_id || bookingData.restaurantId;

      let tableIdToUse = null;
      const tableInfo = {
        tableId: bookingData.table_id || bookingData.tableId,
        tableName: bookingData.table_number || bookingData.tableNumber || 'Bàn 1',
        capacity: bookingData.people_count || 2
      };

      if (tableInfo.tableId && isValidUUID(tableInfo.tableId)) {
        tableIdToUse = tableInfo.tableId;
      } else {
        const tableResult = await getOrCreateTableId(
          restaurantId,
          tableInfo.tableId || tableInfo.tableName,
          tableInfo.capacity
        );

        if (tableResult.success) {
          tableIdToUse = tableResult.tableId;
        } else {
          return { success: false, error: tableResult.error };
        }
      }

      if (!tableIdToUse) {
        return { success: false, error: 'Không thể xác định bàn' };
      }

      console.log('✅ Sử dụng table_id:', tableIdToUse);

      const bookingPayload = {
        user_id: user.id,
        restaurant_id: restaurantId,
        table_id: tableIdToUse,
        customer_name: bookingData.customer_name || user.full_name || 'Khách hàng',
        phone: bookingData.phone || user.phone || '',
        people_count: bookingData.people_count || 2,
        booking_time: bookingData.booking_time || new Date().toISOString(),
        status: 'confirmed',
      };

      console.log('📤 Gửi booking lên Supabase:', bookingPayload);

      const bookingResult = await createBooking(bookingPayload);

      if (bookingResult.success) {
        const savedBooking = bookingResult.data;
        savedBooking.order_items = [];

        setBookings(prev => [savedBooking, ...prev]);
        setActiveBooking(savedBooking);

        try {
          await loadBookings();
        } catch (e) {
          console.warn('⚠️ Không thể reload bookings sau khi tạo booking:', e.message || e);
        }
        
        setActiveInvoice(null);

        console.log('✅ Tạo booking thành công:', savedBooking.id);
        return { success: true, booking: savedBooking };
      } else {
        return { success: false, error: bookingResult.error };
      }

    } catch (error) {
      console.error('❌ Lỗi trong createNewBooking:', error);
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  }, [user, loadBookings]);

  const addOrderItemToBooking = useCallback(async (orderItemData) => {
    if (!activeBooking || !activeBooking.id) {
      console.error('❌ Không có booking active hoặc booking không có id');
      return { success: false, error: 'Không có booking active' };
    }

    try {
      console.log('🔄 Thêm order item vào booking:', orderItemData);
      setIsLoading(true);
      setError(null);

      const { data: orderItemResult, error: orderItemError } = await supabase
        .from('order_items')
        .insert([{
          booking_id: activeBooking.id,
          food_id: orderItemData.food_id || orderItemData.id,
          quantity: orderItemData.quantity || 1,
          price_at_time: orderItemData.price_at_time || orderItemData.price || 0,
        }])
        .select()
        .single();

      if (orderItemError) {
        console.error('❌ Không thể thêm order item:', orderItemError);
        return { success: false, error: orderItemError.message };
      }

      console.log('✅ Đã thêm order item:', orderItemResult.id);

      const items = await loadOrderItemsForBooking(activeBooking) || [];

      try {
        const { total } = await calculateBookingOrderTotal(activeBooking.id);
        await upsertInvoiceSubTotal(activeBooking.id, total);
      } catch (syncErr) {
        console.warn('⚠️ Lỗi khi gửi sub_total sau khi thêm item:', syncErr.message || syncErr);
      }

      await loadInvoiceForBooking(activeBooking.id);

      return {
        success: true,
        orderItem: orderItemResult,
        source: 'booking'
      };

    } catch (error) {
      console.error('❌ Lỗi khi thêm order item:', error);
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  }, [activeBooking]);

  const addMultipleOrderItemsToBooking = useCallback(async (items) => {
    if (!activeBooking || !activeBooking.id) {
      console.error('❌ Không có booking active hoặc booking không có id');
      return { success: false, error: 'Không có booking active' };
    }

    if (!items || items.length === 0) {
      console.error('❌ Không có món ăn để thêm');
      return { success: false, error: 'Không có món ăn để thêm' };
    }

    try {
      console.log(`🔄 Thêm ${items.length} order items vào booking`);
      setIsLoading(true);
      setError(null);

      const insertData = items.map(item => ({
        booking_id: activeBooking.id,
        food_id: item.food_id || item.id,
        quantity: item.quantity || 1,
        price_at_time: item.price_at_time || item.price || 0,
      }));

      const { data: addedItems, error: insertError } = await supabase
        .from('order_items')
        .insert(insertData)
        .select();

      if (insertError) {
        console.error('❌ Không thể thêm order items:', insertError);
        return { success: false, error: insertError.message };
      }

      console.log(`✅ Đã thêm ${(addedItems || []).length} order items`);

      const loadedItems = await loadOrderItemsForBooking(activeBooking) || [];

      try {
        const { total } = await calculateBookingOrderTotal(activeBooking.id);
        await upsertInvoiceSubTotal(activeBooking.id, total);
      } catch (syncErr) {
        console.warn('⚠️ Lỗi khi gửi sub_total sau khi thêm nhiều item:', syncErr.message || syncErr);
      }

      await loadInvoiceForBooking(activeBooking.id);

      return {
        success: true,
        addedItems,
        source: 'booking'
      };

    } catch (error) {
      console.error('❌ Lỗi khi thêm nhiều order items:', error);
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  }, [activeBooking]);

  const calculateBookingOrderTotal = useCallback(async (bookingId) => {
    if (!bookingId) {
      console.warn('⚠️ calculateBookingOrderTotal: bookingId không hợp lệ');
      return { total: 0, items: [] };
    }

    try {
      const { data, error } = await supabase
        .from('order_items')
        .select(`
          quantity,
          price_at_time,
          menus:food_id (
            id,
            price
          )
        `)
        .eq('booking_id', bookingId);

      if (error) {
        console.error('❌ Lỗi khi tải order items cho tổng tiền:', error);
        return { total: 0, items: [] };
      }

      const items = data || [];
      const total = items.reduce((sum, item) => {
        const price = item.price_at_time || item.menus?.price || 0;
        const qty = item.quantity || 1;
        return sum + price * qty;
      }, 0);

      return { total, items };
    } catch (err) {
      console.error('❌ Lỗi trong calculateBookingOrderTotal:', err);
      return { total: 0, items: [] };
    }
  }, []);

  const createInvoiceForBooking = useCallback(async () => {
    if (!activeBooking || !activeBooking.id || !user) {
      return { success: false, error: 'Không có booking active hoặc chưa đăng nhập' };
    }

    try {
      console.log('🧾 Tạo invoice cho booking:', activeBooking.id);
      setIsLoading(true);
      setError(null);

      const orderTotal = await calculateBookingOrderTotal(activeBooking.id);

      if (orderTotal.total <= 0) {
        return { success: false, error: 'Không có món ăn để tạo hóa đơn' };
      }

      const invoiceData = {
        customer_name: user.full_name || 'Khách hàng',
        customer_phone: user.phone || '',
        customer_email: user.email || '',
        notes: 'Hóa đơn được tạo tự động từ hệ thống',
      };

      const result = await createInvoiceFromBooking(activeBooking.id, invoiceData);

      if (result.success) {
        // KIỂM TRA result.data CÓ ID KHÔNG
        if (result.data && result.data.id) {
          setActiveInvoice(result.data);
          console.log('✅ Tạo invoice thành công:', result.data.invoice_number);

          return {
            success: true,
            invoice: result.data,
            message: `Đã tạo hóa đơn ${result.data.invoice_number}`
          };
        } else {
          console.error('❌ Invoice được tạo nhưng không có id:', result.data);
          return { 
            success: false, 
            error: 'Invoice được tạo nhưng không hợp lệ (thiếu ID)' 
          };
        }
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('❌ Lỗi tạo invoice:', error);
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  }, [activeBooking, user, calculateBookingOrderTotal]);

  const payOrder = useCallback(async (paymentData, options = {}) => {
    console.log('💰 payOrder được gọi với:', { paymentData, options });
    
    if (!activeBooking || !activeBooking.id || !user) {
      console.error('❌ Không có booking active hoặc chưa đăng nhập');
      return { success: false, error: 'Không có booking active hoặc chưa đăng nhập' };
    }

    const {
      completeBooking = true,
      clearOrderItems = true, 
    } = options;

    try {
      console.log('💰 Thanh toán order với options:', { completeBooking, clearOrderItems });
      setIsLoading(true);
      setError(null);

      let currentInvoice = activeInvoice;
      
      // KIỂM TRA invoice CÓ ID HỢP LỆ KHÔNG
      if (!currentInvoice || !currentInvoice.id) {
        console.log('ℹ️ Chưa có invoice hoặc invoice không hợp lệ, tạo invoice mới');
        const invoiceResult = await createInvoiceForBooking();
        
        if (!invoiceResult.success) {
          console.error('❌ Lỗi tạo invoice:', invoiceResult.error);
          return { success: false, error: invoiceResult.error };
        }
        
        currentInvoice = invoiceResult.invoice;
        console.log('✅ Đã tạo invoice mới:', currentInvoice?.id);
      }

      // KIỂM TRA LẠI invoice SAU KHI TẠO
      if (!currentInvoice || !currentInvoice.id) {
        console.error('❌ Không có invoice hợp lệ để thanh toán:', currentInvoice);
        return { success: false, error: 'Không có hóa đơn hợp lệ để thanh toán' };
      }

      console.log('📄 Invoice sẽ thanh toán:', {
        id: currentInvoice.id,
        invoice_number: currentInvoice.invoice_number,
        final_amount: currentInvoice.final_amount
      });

      const amountToPay = paymentData.amount_actual || currentInvoice.final_amount || 0;

      if (amountToPay <= 0) {
        console.error('❌ Số tiền thanh toán không hợp lệ:', amountToPay);
        return { success: false, error: 'Số tiền thanh toán không hợp lệ' };
      }

      const paymentPayload = {
        amount_actual: amountToPay,
        reference_id: paymentData.reference_id || `PAY${Date.now()}`,
        clear_order_items: clearOrderItems,
      };

      let result;
      console.log('🔄 Bắt đầu quá trình thanh toán...');

      if (completeBooking) {
        console.log('💳 Thanh toán và kết thúc booking');
        result = await createAndPayInvoiceForBooking(activeBooking.id, paymentPayload);
      } else {
        console.log('💳 Chỉ thanh toán invoice, không kết thúc booking');
        result = await payInvoice(currentInvoice.id, paymentPayload);
      }

      console.log('📊 Kết quả thanh toán:', result);

      if (result.success) {
        // Cập nhật invoice mới
        if (result.data && result.data.invoice) {
          setActiveInvoice(result.data.invoice);
          console.log('✅ Cập nhật active invoice sau thanh toán');
        }

        // Xóa cart nếu cần
        if (typeof clearCart === 'function' && completeBooking) {
          console.log('🧹 Xóa giỏ hàng sau khi thanh toán');
          clearCart();
        }

        // Load lại dữ liệu
        if (completeBooking) {
          console.log('🔄 Load lại bookings sau khi hoàn thành');
          await loadBookings();
        } else {
          console.log('🔄 Load lại order items và invoice');
          await loadOrderItemsForBooking(activeBooking);
          await loadInvoiceForBooking(activeBooking.id);
        }

        return {
          success: true,
          invoice: result.data?.invoice,
          payment: result.data?.payment,
          points: result.data?.points_added || 0,
          message: result.message || 'Thanh toán thành công',
        };
      } else {
        console.error('❌ Thanh toán thất bại:', result.error);
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('❌ Lỗi trong payOrder:', error);
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  }, [activeBooking, user, activeInvoice, createInvoiceForBooking, loadBookings, clearCart]);

  const payPartial = useCallback(async (paymentData) => {
    console.log('💰 payPartial được gọi');
    return payOrder(paymentData, { 
      completeBooking: false, 
      clearOrderItems: false 
    });
  }, [payOrder]);

  const completeBooking = useCallback(async (bookingId) => {
    if (!bookingId) {
      return { success: false, error: 'Thiếu bookingId' };
    }

    try {
      console.log('🔄 Kết thúc booking:', bookingId);
      setIsLoading(true);
      setError(null);

      const updateData = {
        status: 'completed',
      };

      const result = await updateBooking(bookingId, updateData);
      if (result.success) {
        setBookings(prev => prev.filter(b => b.id !== bookingId));
        
        try { 
          await loadBookings(); 
        } catch (e) { 
          console.warn('⚠️ Không thể reload bookings:', e.message || e);
        }
        
        if (activeBooking?.id === bookingId) {
          console.log('✅ Đã kết thúc active booking');
          setActiveBooking(null);
          setActiveInvoice(null);
        }
      } else {
        console.error('❌ Lỗi cập nhật booking:', result.error);
        throw new Error(result.error);
      }

      console.log('✅ Kết thúc booking thành công');
      return { success: true };
    } catch (error) {
      console.error('❌ Lỗi khi kết thúc booking:', error);
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  }, [loadBookings, activeBooking]);

  const cancelBooking = useCallback(async (bookingId) => {
    if (!bookingId) {
      return { success: false, error: 'Thiếu bookingId' };
    }

    try {
      console.log('🔄 Hủy booking (xóa dữ liệu):', bookingId);
      setIsLoading(true);
      setError(null);

      const { data: bookingRow, error: bookingRowErr } = await supabase
        .from('bookings')
        .select('table_id')
        .eq('id', bookingId)
        .single();

      if (bookingRowErr) {
        console.warn('⚠️ Không tìm thấy booking trước khi xóa:', bookingRowErr.message || bookingRowErr);
      }

      try {
        const { error: delItemsErr } = await supabase
          .from('order_items')
          .delete()
          .eq('booking_id', bookingId);
        if (delItemsErr) console.warn('⚠️ Không thể xóa order_items:', delItemsErr.message || delItemsErr);
      } catch (e) {
        console.warn('⚠️ Lỗi khi xóa order_items:', e.message || e);
      }

      try {
        const invoiceRes = await getInvoiceByBookingId(bookingId);
        if (invoiceRes.success && invoiceRes.data && invoiceRes.data.id) {
          const { error: invDelErr } = await supabase
            .from('invoices')
            .delete()
            .eq('id', invoiceRes.data.id);
          if (invDelErr) console.warn('⚠️ Không thể xóa invoice:', invDelErr.message || invDelErr);
        }
      } catch (e) {
        console.warn('⚠️ Lỗi khi xóa invoice:', e.message || e);
      }

      const { error: bkDelErr } = await supabase
        .from('bookings')
        .delete()
        .eq('id', bookingId);

      if (bkDelErr) {
        console.error('❌ Lỗi xóa booking:', bkDelErr);
        throw new Error(bkDelErr.message || String(bkDelErr));
      }

      if (!bookingRowErr && bookingRow && bookingRow.table_id) {
        const res = await setTableStatusSafe(bookingRow.table_id, 'available');
        if (!res.success) console.warn('⚠️ Không thể cập nhật trạng thái bàn sau khi xóa booking:', res.error);
      }

      setBookings(prev => prev.filter(b => b.id !== bookingId));
      if (activeBooking?.id === bookingId) {
        setActiveBooking(null);
        setActiveInvoice(null);
      }

      try { 
        await loadBookings(); 
      } catch (e) { 
        console.warn('⚠️ Không thể reload bookings:', e.message || e);
      }

      console.log('✅ Đã xóa booking và khôi phục trạng thái bàn');
      return { success: true };
    } catch (error) {
      console.error('❌ Lỗi khi hủy booking:', error);
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  }, [loadBookings, activeBooking]);

  const removeOrderItem = useCallback(async (orderItemId) => {
    if (!activeBooking || !activeBooking.id) {
      console.error('❌ Không có booking active hoặc booking không có id');
      return { success: false, error: 'Không có booking active' };
    }

    try {
      console.log('🔄 Xóa order item:', orderItemId);
      setIsLoading(true);
      setError(null);

      const { error: deleteError } = await supabase
        .from('order_items')
        .delete()
        .eq('id', orderItemId);

      if (deleteError) {
        console.error('❌ Lỗi xóa order item:', deleteError);
        throw deleteError;
      }

      await loadOrderItemsForBooking(activeBooking);

      try {
        const { total } = await calculateBookingOrderTotal(activeBooking.id);
        await upsertInvoiceSubTotal(activeBooking.id, total);
      } catch (syncErr) {
        console.warn('⚠️ Lỗi khi gửi sub_total sau khi xóa item:', syncErr.message || syncErr);
      }

      await loadInvoiceForBooking(activeBooking.id);

      console.log('✅ Đã xóa order item thành công');

      return {
        success: true,
        removedItemId: orderItemId,
      };
    } catch (error) {
      console.error('❌ Lỗi khi xóa order item:', error);
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  }, [activeBooking]);

  const getActiveBookingForRestaurant = useCallback(async (restaurantId) => {
    if (!user || !user.id) {
      console.error('❌ Không có user');
      return null;
    }

    console.log('🔄 Tìm active booking cho restaurant:', restaurantId);

    const result = await getActiveUserBooking(user.id, restaurantId);
    if (result.success && result.data) {
      await loadOrderItemsForBooking(result.data);
      await loadInvoiceForBooking(result.data.id);
      console.log('✅ Tìm thấy active booking cho restaurant');
      return result.data;
    }

    const booking = bookings.find(b => 
      b.restaurant_id === restaurantId && b.status === 'confirmed'
    );
    if (booking) {
      console.log('✅ Tìm thấy active booking trong cache');
      return booking;
    }

    console.log('ℹ️ Không tìm thấy active booking');
    return null;
  }, [user, bookings]);

  const hasActiveBooking = useCallback((restaurantId = null) => {
    if (restaurantId) {
      return bookings.some(b => 
        b.restaurant_id === restaurantId && b.status === 'confirmed'
      );
    }

    return bookings.some(b => b.status === 'confirmed');
  }, [bookings]);

  const calculatePendingTotal = useCallback(() => {
    if (!activeBooking) return 0;
    return calculateOrderTotal(activeBooking.order_items || []);
  }, [activeBooking]);

  const clearActiveBooking = useCallback(() => {
    console.log('🔄 Xóa active booking');
    setActiveBooking(null);
    setActiveInvoice(null);
  }, []);

  const getBookingById = useCallback((bookingId) => {
    return bookings.find(b => b.id === bookingId);
  }, [bookings]);

  const getInvoiceTotal = useCallback(() => {
    if (!activeInvoice) return 0;
    return activeInvoice.final_amount || activeInvoice.sub_total || 0;
  }, [activeInvoice]);

  const getPaidAmount = useCallback(() => {
    if (!activeInvoice) return 0;
    return activeInvoice.paid_amount || 0;
  }, [activeInvoice]);

  const getRemainingAmount = useCallback(() => {
    if (!activeInvoice) return 0;
    return getInvoiceTotal() - getPaidAmount();
  }, [activeInvoice, getInvoiceTotal, getPaidAmount]);

  const isInvoicePaid = useCallback(() => {
    if (!activeInvoice) return false;
    return activeInvoice.payment_status === 'paid';
  }, [activeInvoice]);

  const isValidUUID = (uuid) => {
    if (!uuid) return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  };

  const value = {
    activeBooking,
    bookings,
    activeInvoice,
    isLoading,
    error,

    createBooking: createNewBooking,
    addOrderItemToBooking,
    addMultipleOrderItemsToBooking,
    payOrder,
    payPartial,
    createInvoiceForBooking,
    completeBooking,
    cancelBooking,
    removeOrderItem,
    loadOrderItemsForBooking,
    loadInvoiceForBooking,

    getActiveBookingForRestaurant,
    hasActiveBooking,
    loadBookings,
    calculatePendingTotal,
    getBookingById,
    calculateBookingOrderTotal,

    getInvoiceTotal,
    getPaidAmount,
    getRemainingAmount,
    isInvoicePaid,

    clearActiveBooking,
  };

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>;
};