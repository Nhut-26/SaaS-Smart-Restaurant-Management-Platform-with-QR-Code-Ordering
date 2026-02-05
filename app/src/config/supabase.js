import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

export const WHITE_IMAGE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVQIW2NgYAAAAAMAAWgmWQ0AAAAASUVORK5CYII=';

const supabaseUrl = 'https://vhjxxgajenkzuykkqloi.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZoanh4Z2FqZW5renV5a2txbG9pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0OTgyMjIsImV4cCI6MjA4MzA3NDIyMn0.l04T4IY-2mdFTvVhksDBmL5buErB1Pfa97GQOgRVtCg';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const testConnection = async () => {
  try {
    const { data, error } = await supabase.from('profiles').select('count');
    if (error) throw error;
    console.log('✅ Supabase connected successfully');
    return true;
  } catch (error) {
    console.error('❌ Supabase connection failed:', error);
    return false;
  }
};

// Hàm kiểm tra UUID hợp lệ
const isValidUUID = (uuid) => {
  if (!uuid) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

const getRestaurantImage = (cuisineType) => {
  return WHITE_IMAGE;
};

const getFoodImage = (category, foodName) => {
  return WHITE_IMAGE;
};

const getMenuItemImage = async (menuId) => {
  try {
    if (!menuId) return WHITE_IMAGE;

    const { data, error } = await supabase
      .from('menus')
      .select('image')
      .eq('id', menuId)
      .single();

    if (error || !data) return WHITE_IMAGE;

    return data.image || WHITE_IMAGE;
  } catch (error) {
    console.error('❌ Lỗi khi lấy ảnh món ăn:', error);
    return getFoodImage('default', 'food');
  }
};

const getSignatureDish = (cuisineType) => {
  const map = {
    'Việt Nam': 'Phở Bò',
    'Hải sản': 'Tôm Hùm Nướng',
    'Lẩu': 'Lẩu Thái',
    'BBQ': 'Sườn Nướng',
    'Ý': 'Pizza',
    'Nhật': 'Sushi',
    'Hàn Quốc': 'Bibimbap',
  };
  return map[cuisineType] || 'Món đặc trưng';
};

const getPopularItemsFromTags = (popularItems, cuisineType) => {
  if (Array.isArray(popularItems) && popularItems.length > 0) return popularItems;
  return [getSignatureDish(cuisineType)];
};

const getFeatures = (environmentTags) => {
  if (!environmentTags) return [];
  if (Array.isArray(environmentTags)) return environmentTags;
  return String(environmentTags).split(',').map(t => t.trim()).filter(Boolean);
};

let customerRanksCache = null;
let fetchingCustomerRanksPromise = null;

export const clearCustomerRanksCache = () => {
  customerRanksCache = null;
  fetchingCustomerRanksPromise = null;
};
const formatOpeningHours = (openTime, closeTime) => {
  const o = openTime || '08:00';
  const c = closeTime || '22:00';
  return `${o} - ${c}`;
};

export const getOrCreateTableId = async (restaurantId, tableNameOrId, capacity = 2) => {
  try {
    console.log(`🔍 Tìm/ tạo bàn: ${tableNameOrId} cho nhà hàng ${restaurantId}`);

    if (isValidUUID(tableNameOrId)) {
      console.log(`✅ Đã có UUID hợp lệ: ${tableNameOrId}`);
      return { success: true, tableId: tableNameOrId };
    }

    const tableName = tableNameOrId;

    const { data: existingTable, error: findError } = await supabase
      .from('tables')
      .select('id, table_name')
      .eq('restaurant_id', restaurantId)
      .eq('table_name', tableName)
      .single();

    if (existingTable && !findError) {
      console.log(`✅ Tìm thấy bàn "${tableName}" với ID: ${existingTable.id}`);
      return { success: true, tableId: existingTable.id };
    }

    console.log(`➕ Tạo bàn mới: ${tableName} cho nhà hàng ${restaurantId}`);

    const { data: newTable, error: createError } = await supabase
      .from('tables')
      .insert([{
        restaurant_id: restaurantId,
        table_name: tableName,
        capacity: capacity,
        status: 'available'
      }])
      .select('id')
      .single();

    if (createError) {
      console.error('❌ Lỗi tạo bàn mới:', createError);
      return {
        success: false,
        error: `Không thể tạo bàn ${tableName}: ${createError.message}`
      };
    }

    console.log(`✅ Đã tạo bàn mới với ID: ${newTable.id}`);
    return { success: true, tableId: newTable.id };

  } catch (error) {
    console.error('❌ Lỗi trong getOrCreateTableId:', error);
    return {
      success: false,
      error: `Lỗi xử lý bàn: ${error.message}`
    };
  }
};

export const setTableStatusSafe = async (tableId, status) => {
  try {
    if (!tableId) return { success: false, error: 'Missing tableId' };
    const payload = { status };
    console.log(`🔄 setTableStatusSafe: updating table ${tableId} -> ${status}`);
    const { data, error } = await supabase
      .from('tables')
      .update(payload)
      .eq('id', tableId)
      .select()
      .single();

    if (error) {
      console.error(`❌ setTableStatusSafe failed for table ${tableId}:`, error);
      return { success: false, error: error.message || String(error) };
    }

    console.log(`✅ Table ${tableId} updated to ${status}`);
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message || String(err) };
  }
};

export const getCustomerRanks = async () => {
  if (customerRanksCache) {
    return { success: true, data: customerRanksCache };
  }

  if (fetchingCustomerRanksPromise) {
    return fetchingCustomerRanksPromise;
  }

  fetchingCustomerRanksPromise = (async () => {
    try {
      console.log('📡 Lấy danh sách hạng thành viên...');

      const { data, error } = await supabase
        .from('customer_ranks')
        .select('*')
        .order('min_points_required', { ascending: true });

      if (error) {
        console.error('❌ Lỗi khi lấy danh sách hạng:', error);
        return { success: false, error: error.message, data: [] };
      }

      customerRanksCache = data || [];
      console.log(`✅ Lấy được ${customerRanksCache.length || 0} hạng thành viên`);
      return { success: true, data: customerRanksCache };
    } catch (error) {
      console.error('❌ Lỗi trong getCustomerRanks:', error);
      return { success: false, error: error.message, data: [] };
    } finally {
      fetchingCustomerRanksPromise = null;
    }
  })();

  return fetchingCustomerRanksPromise;
};

export const getCustomerRankById = async (rankId) => {
  try {
    const { data, error } = await supabase
      .from('customer_ranks')
      .select('*')
      .eq('id', rankId)
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('❌ Lỗi khi lấy hạng theo ID:', error);
    return { success: false, error: error.message };
  }
};

export const findRankByPoints = async (points) => {
  try {
    console.log(`🔍 Tìm hạng phù hợp cho ${points} điểm`);

    const { data, error } = await supabase
      .from('customer_ranks')
      .select('*')
      .lte('min_points_required', points)
      .order('min_points_required', { ascending: false })
      .limit(1);

    if (error) {
      console.error('❌ Lỗi khi tìm hạng theo điểm:', error);
      const { data: defaultRanks } = await supabase
        .from('customer_ranks')
        .select('*')
        .order('min_points_required', { ascending: true })
        .limit(1);

      return { success: true, data: defaultRanks?.[0] || null };
    }

    return { success: true, data: data?.[0] || null };
  } catch (error) {
    console.error('❌ Lỗi trong findRankByPoints:', error);
    return { success: false, error: error.message };
  }
};

export const updateCustomerPointsAndRank = async (customerId, pointsToAdd) => {
  try {
    console.log(`💰 Cập nhật điểm cho khách hàng ${customerId}: +${pointsToAdd} điểm`);

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('accumulated_points, current_rank_id')
      .eq('id', customerId)
      .single();

    if (profileError || !profile) {
      console.error('❌ Không tìm thấy profile:', profileError);
      return { success: false, error: 'Không tìm thấy thông tin khách hàng' };
    }

    const previousPoints = profile.accumulated_points || 0;
    const newPoints = previousPoints + (pointsToAdd || 0);

    const { success: rankSuccess, data: newRank } = await findRankByPoints(newPoints);

    const updates = {
      accumulated_points: newPoints,
    };

    if (rankSuccess && newRank && newRank.id && newRank.id !== profile.current_rank_id) {
      updates.current_rank_id = newRank.id;
    }

    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', customerId)
      .select('*')
      .single();

    if (updateError) {
      console.error('❌ Lỗi khi cập nhật điểm/hạng:', updateError);
      return { success: false, error: updateError.message };
    }

    return { success: true, data: { previousPoints, newPoints, updatedProfile } };
  } catch (error) {
    console.error('❌ Lỗi trong updateCustomerPointsAndRank:', error);
    return { success: false, error: error.message };
  }
};

export const registerUser = async (userData) => {
  try {
    const { email, password, phone, fullName } = userData;

    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanPassword = String(password || '').trim();
    const cleanPhone = String(phone || '').trim();

    console.log('📝 Đang đăng ký người dùng với email:', cleanEmail);

    const { data: existingEmail, error: emailError } = await supabase
      .from('profiles')
      .select('email')
      .eq('email', cleanEmail)
      .single();

    if (existingEmail && !emailError) {
      return {
        success: false,
        error: 'Email đã được sử dụng'
      };
    }

    const { data: existingPhone, error: phoneError } = await supabase
      .from('profiles')
      .select('phone')
      .eq('phone', cleanPhone)
      .single();

    if (existingPhone && !phoneError) {
      return {
        success: false,
        error: 'Số điện thoại đã được sử dụng'
      };
    }

    const { data: defaultRanks } = await supabase
      .from('customer_ranks')
      .select('id')
      .order('min_points_required', { ascending: true })
      .limit(1);

    const defaultRankId = defaultRanks?.[0]?.id || null;

    console.log('🔐 Đang tạo user trong bảng profiles...');

    const createdAt = new Date().toISOString();

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .insert([{
        full_name: fullName || cleanEmail.split('@')[0],
        phone: cleanPhone,
        email: cleanEmail,
        password: cleanPassword,
        loyalty_points: 0,
        accumulated_points: 0,
        current_rank_id: defaultRankId,
        global_role: 'customer',
        created_at: createdAt,
      }])
      .select('*, customer_ranks (*)')
      .single();

    if (profileError) {
      console.error('❌ Lỗi tạo profile:', profileError);
      return {
        success: false,
        error: `Lỗi tạo hồ sơ: ${profileError.message}`
      };
    }

    console.log('✅ Đăng ký thành công với email:', email);

    return {
      success: true,
      data: {
        user: {
          id: profileData.id,
          email: email,
          created_at: createdAt
        },
        profile: profileData,
      }
    };

  } catch (error) {
    console.error('❌ Lỗi trong registerUser:', error);
    return {
      success: false,
      error: error.message || 'Có lỗi xảy ra khi đăng ký'
    };
  }
};

export const loginUser = async (email, password) => {
  try {
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanPassword = String(password || '').trim();

    console.log('🔐 Đang đăng nhập với email:', cleanEmail);

    let profileData = null;
    let profileError = null;

    const tryExact = await supabase
      .from('profiles')
      .select('*, customer_ranks (*)')
      .eq('email', cleanEmail)
      .single();

    if (tryExact && tryExact.data) {
      profileData = tryExact.data;
      profileError = tryExact.error;
      console.log('✅ Tìm thấy profile (exact match) for:', cleanEmail);
    } else {
      console.log('🔎 Exact match không tìm thấy, thử tìm case-insensitive (ILike)');
      const tryILike = await supabase
        .from('profiles')
        .select('*, customer_ranks (*)')
        .ilike('email', cleanEmail)
        .single();

      if (tryILike && tryILike.data) {
        profileData = tryILike.data;
        profileError = tryILike.error;
        console.log('✅ Tìm thấy profile (ilike) for:', cleanEmail, '->', profileData.email);
      } else {
        console.log('❌ Không tìm thấy tài khoản với email (even ilike):', cleanEmail);
        return {
          success: false,
          error: 'Email hoặc mật khẩu không đúng'
        };
      }
    }

    console.log('✅ Tìm thấy profile, kiểm tra mật khẩu...');

    const storedPassword = String(profileData.password || '').normalize('NFKC').trim();
    const providedPassword = String(cleanPassword || '').normalize('NFKC');

    if (storedPassword !== providedPassword) {
      console.log('❌ Mật khẩu không đúng (mismatch). Stored len:', storedPassword.length, 'Provided len:', providedPassword.length);
      const preview = (s) => (s ? `${s.slice(0,1)}...${s.slice(-1)}` : '');
      console.log('Stored preview:', preview(storedPassword), 'Provided preview:', preview(providedPassword));
      return {
        success: false,
        error: 'Email hoặc mật khẩu không đúng'
      };
    }

    console.log('✅ Đăng nhập thành công:', profileData.full_name);
    console.log(`🏆 Hạng hiện tại: ${profileData.customer_ranks?.rank_name || 'Không có'}`);
    console.log(`💰 Điểm tích lũy: ${profileData.accumulated_points || 0}`);

    return {
      success: true,
      data: {
        profile: profileData,
      }
    };

  } catch (error) {
    console.error('❌ Lỗi trong loginUser:', error);
    return {
      success: false,
      error: error.message || 'Có lỗi xảy ra khi đăng nhập'
    };
  }
};

export const getUserProfile = async (profileId) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*, customer_ranks (*)')
      .eq('id', profileId)
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('❌ Lỗi lấy profile:', error);
    return { success: false, error: error.message };
  }
};

export const getFullUserProfile = async (profileId) => {
  return await getUserProfile(profileId);
};

export const checkEmailExists = async (email) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('email')
      .eq('email', email)
      .single();

    return { exists: !!data };
  } catch (error) {
    if (error.code === 'PGRST116') {
      return { exists: false };
    }
    console.error('❌ Lỗi kiểm tra email:', error);
    return { exists: false, error: error.message };
  }
};

export const checkPhoneExists = async (phone) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('phone')
      .eq('phone', phone)
      .single();

    return { exists: !!data };
  } catch (error) {
    if (error.code === 'PGRST116') {
      return { exists: false };
    }
    console.error('❌ Lỗi kiểm tra phone:', error);
    return { exists: false, error: error.message };
  }
};

export const changePassword = async (profileId, currentPassword, newPassword) => {
  try {
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', profileId)
      .single();

    if (profileError) throw new Error('Không tìm thấy tài khoản');

    if (profileData.password !== currentPassword) {
      return {
        success: false,
        error: 'Mật khẩu hiện tại không đúng'
      };
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        password: newPassword,
        updated_at: new Date().toISOString()
      })
      .eq('id', profileId);

    if (updateError) throw updateError;

    return { success: true };
  } catch (error) {
    console.error('❌ Lỗi đổi mật khẩu:', error);
    return { success: false, error: error.message };
  }
};

export const forgotPassword = async (email) => {
  try {
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .single();

    if (profileError || !profileData) {
      return {
        success: false,
        error: 'Không tìm thấy tài khoản với email này'
      };
    }

    return {
      success: true,
      data: {
        email: profileData.email,
        full_name: profileData.full_name || ''
      }
    };
  } catch (error) {
    console.error('❌ Lỗi quên mật khẩu:', error);
    return { success: false, error: error.message };
  }
};

export const getRestaurants = async () => {
  try {
    console.log('📡 Lấy dữ liệu nhà hàng từ Supabase...');

    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('❌ Lỗi khi lấy nhà hàng:', error);
      return {
        success: false,
        error: error.message,
        data: [],
        message: 'Không thể tải danh sách nhà hàng. Vui lòng thử lại sau.'
      };
    }

    console.log(`✅ Lấy được ${data?.length || 0} nhà hàng`);

    if (!data || data.length === 0) {
      console.log('⚠️ Không có nhà hàng nào');
      return {
        success: true,
        data: [],
        message: 'Hiện tại không có nhà hàng nào trong hệ thống.'
      };
    }

    const formattedData = data.map(restaurant => ({
      id: restaurant.id,
      name: restaurant.name || 'Nhà hàng chưa có tên',
      address: restaurant.address || 'Đang cập nhật địa chỉ',
      rating: restaurant.average_rating || 0,
      type: restaurant.cuisine_type || 'Nhà hàng',
      category: restaurant.cuisine_type || 'default',
      image_url: restaurant.image_url || WHITE_IMAGE,
      image: restaurant.image_url || WHITE_IMAGE,
      latitude: restaurant.latitude,
      longitude: restaurant.longitude,
      price_range: restaurant.price_range || 'Chưa cập nhật',
      cuisine_type: restaurant.cuisine_type,
      average_rating: restaurant.average_rating,
      is_active: restaurant.is_active,
      environment_tags: restaurant.environment_tags,
      description: restaurant.description || 'Mô tả đang được cập nhật',
      phone: restaurant.phone || 'Chưa có số điện thoại',
      open_time: restaurant.open_time || null,
      close_time: restaurant.close_time || null,
      openingHours: restaurant.open_time && restaurant.close_time
        ? `${restaurant.open_time} - ${restaurant.close_time}`
        : 'Chưa cập nhật giờ mở cửa',
      signature_dish: restaurant.signature_dish || null,
      popular_items: restaurant.popular_items || [],
      features: restaurant.environment_tags
        ? restaurant.environment_tags.split(',').map(t => t.trim()).filter(Boolean)
        : []
    }));

    return { success: true, data: formattedData };

  } catch (error) {
    console.error('❌ Lỗi trong getRestaurants:', error.message);
    return {
      success: false,
      error: error.message,
      data: [],
      message: 'Có lỗi xảy ra khi tải danh sách nhà hàng.'
    };
  }
};

export const getRestaurantById = async (restaurantId) => {
  try {
    console.log(`📡 Lấy chi tiết nhà hàng ID: ${restaurantId}`);

    if (!restaurantId) {
      return {
        success: false,
        error: 'Thiếu ID nhà hàng',
        message: 'Không tìm thấy thông tin nhà hàng.'
      };
    }

    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .eq('id', restaurantId)
      .single();

    if (error) {
      console.error('❌ Lỗi khi lấy chi tiết nhà hàng:', error);
      return {
        success: false,
        error: error.message,
        message: 'Không thể tải thông tin nhà hàng.'
      };
    }

    if (!data) {
      return {
        success: false,
        error: 'Không tìm thấy nhà hàng',
        message: 'Nhà hàng không tồn tại hoặc đã bị xóa.'
      };
    }

    const formattedRestaurant = {
      id: data.id,
      name: data.name || 'Nhà hàng chưa có tên',
      address: data.address || 'Đang cập nhật địa chỉ',
      rating: data.average_rating || 0,
      type: data.cuisine_type || 'Nhà hàng',
      category: data.cuisine_type || 'default',
      image: data.image_url || WHITE_IMAGE,
      image_url: data.image_url || WHITE_IMAGE,
      description: data.description || 'Mô tả đang được cập nhật',
      open_time: data.open_time || null,
      close_time: data.close_time || null,
      openingHours: data.open_time && data.close_time
        ? `${data.open_time} - ${data.close_time}`
        : 'Chưa cập nhật giờ mở cửa',
      phone: data.phone || 'Chưa có số điện thoại',
      signatureDish: data.signature_dish || 'Đang cập nhật món đặc trưng',
      popularItems: data.popular_items ? data.popular_items.split(',').map(item => item.trim()) : [],
      features: data.environment_tags
        ? data.environment_tags.split(',').map(t => t.trim()).filter(Boolean)
        : [],
      price_range: data.price_range || 'Chưa cập nhật',
      cuisine_type: data.cuisine_type,
      latitude: data.latitude,
      longitude: data.longitude,
      average_rating: data.average_rating,
      is_active: data.is_active,
      environment_tags: data.environment_tags,
    };

    return { success: true, data: formattedRestaurant };

  } catch (error) {
    console.error('❌ Lỗi trong getRestaurantById:', error.message);
    return {
      success: false,
      error: error.message,
      message: 'Có lỗi xảy ra khi tải thông tin nhà hàng.'
    };
  }
};

export const getMenuItemsByRestaurant = async (restaurantId) => {
  try {
    console.log(`📡 Lấy menu cho nhà hàng ID: ${restaurantId}`);

    if (!restaurantId) {
      return {
        success: false,
        error: 'Thiếu ID nhà hàng',
        data: [],
        message: 'Không thể tải menu.'
      };
    }

    const { data, error } = await supabase
      .from('menus')
      .select(`*
      `)
      .eq('restaurant_id', restaurantId)
      .eq('is_available', true)
      .order('category')
      .order('food_name');

    if (error) {
      console.error('❌ Lỗi khi lấy menu:', error);
      return {
        success: false,
        error: error.message,
        data: [],
        message: 'Không thể tải danh sách món ăn.'
      };
    }

    if (data && data.length > 0) {
      console.log(`✅ Lấy được ${data.length} món ăn từ Supabase`);

      const formattedMenu = data.map((item) => {
        let imageUrl = item.image || WHITE_IMAGE;

        return {
          id: item.id.toString(),
          name: item.food_name || 'Món chưa có tên',
          price: item.price || 0,
          category: item.category || 'Món chính',
          description: item.description || 'Mô tả đang được cập nhật',
          image_url: imageUrl,
          restaurant_id: item.restaurant_id,
          is_available: item.is_available,
          is_best_seller: item.is_best_seller || false,
          stock_count: item.stock_count || 0,
        };
      });

      return { success: true, data: formattedMenu };
    } else {
      console.log('⚠️ Nhà hàng này không có món ăn nào');
      return {
        success: true,
        data: [],
        message: 'Nhà hàng này hiện chưa có món ăn nào.'
      };
    }

  } catch (error) {
    console.error('❌ Lỗi trong getMenuItemsByRestaurant:', error.message);
    return {
      success: false,
      error: error.message,
      data: [],
      message: 'Có lỗi xảy ra khi tải menu.'
    };
  }
};

export const getBestSellerItems = async (restaurantId) => {
  try {
    if (!restaurantId) {
      return {
        success: false,
        error: 'Thiếu ID nhà hàng',
        data: [],
        message: 'Không thể tải món bán chạy.'
      };
    }

    const { data, error } = await supabase
      .from('menus')
      .select(`*
      `)
      .eq('restaurant_id', restaurantId)
      .eq('is_available', true)
      .eq('is_best_seller', true)
      .order('food_name');

    if (error) {
      console.error('❌ Lỗi khi lấy món bán chạy:', error);
      return {
        success: false,
        error: error.message,
        data: [],
        message: 'Không thể tải món bán chạy.'
      };
    }

    if (data && data.length > 0) {
      const formattedItems = data.map((item) => {
        let imageUrl = item.image || WHITE_IMAGE;

        return {
          id: item.id.toString(),
          name: item.food_name || 'Món chưa có tên',
          price: item.price || 0,
          category: item.category || 'Món chính',
          description: item.description || 'Mô tả đang được cập nhật',
          image_url: imageUrl,
          is_best_seller: true,
          stock_count: item.stock_count || 0,
        };
      });

      return { success: true, data: formattedItems };
    }

    return {
      success: true,
      data: [],
      message: 'Nhà hàng này chưa có món bán chạy nào.'
    };

  } catch (error) {
    console.error('❌ Lỗi khi lấy món bán chạy:', error);
    return {
      success: false,
      error: error.message,
      data: [],
      message: 'Có lỗi xảy ra khi tải món bán chạy.'
    };
  }
};

export const getMenuItemWithImage = async (menuId) => {
  try {
    console.log(`🔍 Lấy chi tiết món ăn ID: ${menuId}`);

    if (!menuId) {
      return {
        success: false,
        error: 'Thiếu ID món ăn',
        message: 'Không thể tải thông tin món ăn.'
      };
    }

    const { data, error } = await supabase
      .from('menus')
      .select(`*
      `)
      .eq('id', menuId)
      .single();

    if (error) {
      console.error('❌ Lỗi khi lấy chi tiết món ăn:', error);
      return {
        success: false,
        error: error.message,
        message: 'Không thể tải thông tin món ăn.'
      };
    }

    if (!data) {
      return {
        success: false,
        error: 'Không tìm thấy món ăn',
        message: 'Món ăn không tồn tại hoặc đã bị xóa.'
      };
    }

    let imageUrl = data.image || WHITE_IMAGE;

    const formattedItem = {
      id: data.id.toString(),
      name: data.food_name || 'Món chưa có tên',
      price: data.price || 0,
      category: data.category || 'Món chính',
      description: data.description || 'Mô tả đang được cập nhật',
      image_url: imageUrl,
      restaurant_id: data.restaurant_id,
      is_available: data.is_available,
      is_best_seller: data.is_best_seller || false,
      stock_count: data.stock_count || 0,
    };

    return { success: true, data: formattedItem };
  } catch (error) {
    console.error('❌ Lỗi trong getMenuItemWithImage:', error);
    return {
      success: false,
      error: error.message,
      message: 'Có lỗi xảy ra khi tải thông tin món ăn.'
    };
  }
};

export const getReviewsByRestaurant = async (restaurantId, limit = 10) => {
  try {
    console.log(`📡 Lấy đánh giá cho nhà hàng ID: ${restaurantId}`);

    if (!restaurantId) {
      return {
        success: false,
        error: 'Thiếu ID nhà hàng',
        data: [],
        message: 'Không thể tải đánh giá.'
      };
    }

    const { data: rows, error } = await supabase
      .from('reviews')
      .select(`
        profiles: customer_id (
          id,
          full_name,
          avatar_url
        )
      `)
      .eq('restaurant_id', restaurantId)
      .order('id', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('❌ Lỗi khi lấy reviews:', error);
      return {
        success: false,
        error: error.message,
        data: [],
        message: 'Không thể tải đánh giá.'
      };
    }

    console.log(`✅ Lấy được ${rows?.length || 0} đánh giá từ bảng Reviews`);

    const formatted = (rows || []).map((r) => {
      return {
        id: r.id,
        rating: r.rating || 0,
        review: r.review || '',
        restaurant_id: r.id_restaurants,
        id_customer: r.id_customers,
        images: r.images || [],
        customer: r.profiles || {
          id: r.id_customers || null,
          full_name: 'Người dùng',
          avatar_url: null
        }
      };
    });

    if (formatted.length === 0) {
      return {
        success: true,
        data: [],
        message: 'Nhà hàng này chưa có đánh giá nào.'
      };
    }

    return { success: true, data: formatted };

  } catch (error) {
    console.error('❌ Lỗi trong getReviewsByRestaurant:', error);
    return {
      success: false,
      error: error.message,
      data: [],
      message: 'Có lỗi xảy ra khi tải đánh giá.'
    };
  }
};

export const getTablesByRestaurant = async (restaurantId) => {
  try {
    console.log(`📡 Lấy danh sách bàn cho nhà hàng ID: ${restaurantId}`);

    if (!restaurantId) {
      return {
        success: false,
        error: 'Thiếu ID nhà hàng',
        data: [],
        message: 'Không thể tải danh sách bàn.'
      };
    }

    const { data, error } = await supabase
      .from('tables')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('table_name');

    if (error) {
      console.error('❌ Lỗi khi lấy danh sách bàn:', error);
      return {
        success: false,
        error: error.message,
        data: [],
        message: 'Không thể tải danh sách bàn.'
      };
    }

    console.log(`✅ Lấy được ${data?.length || 0} bàn từ Supabase`);

    if (!data || data.length === 0) {
      return {
        success: true,
        data: [],
        message: 'Xin lỗi, hiện tại nhà hàng này không có bàn nào, đợi chúng tôi upload bàn mới.'
      };
    }

    const formattedTables = data.map(table => ({
      id: table.id,
      name: table.table_name || 'Bàn chưa có tên',
      capacity: table.capacity || 2,
      status: table.status || 'available',
      restaurant_id: table.restaurant_id,
    }));

    return { success: true, data: formattedTables };

  } catch (error) {
    console.error('❌ Lỗi trong getTablesByRestaurant:', error.message);
    return {
      success: false,
      error: error.message,
      data: [],
      message: 'Có lỗi xảy ra khi tải danh sách bàn.'
    };
  }
};

export const searchRestaurants = async (searchTerm, filters = {}) => {
  try {
    console.log(`🔍 Tìm kiếm nhà hàng: ${searchTerm}`);

    let query = supabase
      .from('restaurants')
      .select('*')
      .eq('is_active', true);

    if (searchTerm && searchTerm.trim() !== '') {
      query = query.or(`name.ilike.%${searchTerm}%,address.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
    }

    if (filters.cuisine_type) {
      query = query.eq('cuisine_type', filters.cuisine_type);
    }

    if (filters.price_range) {
      query = query.eq('price_range', filters.price_range);
    }

    if (filters.min_rating) {
      query = query.gte('average_rating', filters.min_rating);
    }

    query = query.order('name');

    const { data, error } = await query;

    if (error) {
      console.error('❌ Lỗi khi tìm kiếm nhà hàng:', error);
      return {
        success: false,
        error: error.message,
        data: [],
        message: 'Không thể thực hiện tìm kiếm.'
      };
    }

    if (!data || data.length === 0) {
      return {
        success: true,
        data: [],
        message: 'Không tìm thấy nhà hàng nào phù hợp với từ khóa tìm kiếm.'
      };
    }

    const formattedData = data.map(restaurant => ({
      id: restaurant.id,
      name: restaurant.name || 'Nhà hàng chưa có tên',
      address: restaurant.address || 'Đang cập nhật địa chỉ',
      rating: restaurant.average_rating || 0,
      type: restaurant.cuisine_type || 'Nhà hàng',
      category: restaurant.cuisine_type || 'default',
      image_url: restaurant.image_url || WHITE_IMAGE,
      image: restaurant.image_url || WHITE_IMAGE,
      latitude: restaurant.latitude,
      longitude: restaurant.longitude,
      price_range: restaurant.price_range || 'Chưa cập nhật',
      cuisine_type: restaurant.cuisine_type,
      average_rating: restaurant.average_rating,
      is_active: restaurant.is_active,
      environment_tags: restaurant.environment_tags,
      description: restaurant.description || 'Mô tả đang được cập nhật',
      phone: restaurant.phone || 'Chưa có số điện thoại',
      open_time: restaurant.open_time || null,
      close_time: restaurant.close_time || null,
      openingHours: restaurant.open_time && restaurant.close_time
        ? `${restaurant.open_time} - ${restaurant.close_time}`
        : 'Chưa cập nhật giờ mở cửa',
      signature_dish: restaurant.signature_dish || null,
      popular_items: restaurant.popular_items || [],
      features: restaurant.environment_tags
        ? restaurant.environment_tags.split(',').map(t => t.trim()).filter(Boolean)
        : []
    }));

    return { success: true, data: formattedData };

  } catch (error) {
    console.error('❌ Lỗi trong searchRestaurants:', error);
    return {
      success: false,
      error: error.message,
      data: [],
      message: 'Có lỗi xảy ra khi tìm kiếm.'
    };
  }
};

export const getRestaurantsByCategory = async (category) => {
  try {
    console.log(`📡 Lấy nhà hàng theo loại: ${category}`);

    if (!category) {
      return {
        success: false,
        error: 'Thiếu loại nhà hàng',
        data: [],
        message: 'Không thể tải nhà hàng theo loại.'
      };
    }

    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .eq('is_active', true)
      .eq('cuisine_type', category)
      .order('name');

    if (error) {
      console.error('❌ Lỗi khi lấy nhà hàng theo loại:', error);
      return {
        success: false,
        error: error.message,
        data: [],
        message: 'Không thể tải nhà hàng theo loại.'
      };
    }

    if (!data || data.length === 0) {
      return {
        success: true,
        data: [],
        message: `Không có nhà hàng nào thuộc loại "${category}".`
      };
    }

    const formattedData = data.map(restaurant => ({
      id: restaurant.id,
      name: restaurant.name || 'Nhà hàng chưa có tên',
      address: restaurant.address || 'Đang cập nhật địa chỉ',
      rating: restaurant.average_rating || 0,
      type: restaurant.cuisine_type || 'Nhà hàng',
      category: restaurant.cuisine_type || 'default',
      image_url: restaurant.image_url || WHITE_IMAGE,
      image: restaurant.image_url || WHITE_IMAGE,
      latitude: restaurant.latitude,
      longitude: restaurant.longitude,
      price_range: restaurant.price_range || 'Chưa cập nhật',
      cuisine_type: restaurant.cuisine_type,
      average_rating: restaurant.average_rating,
      is_active: restaurant.is_active,
      environment_tags: restaurant.environment_tags,
      description: restaurant.description || 'Mô tả đang được cập nhật',
      phone: restaurant.phone || 'Chưa có số điện thoại',
      open_time: restaurant.open_time || null,
      close_time: restaurant.close_time || null,
      openingHours: restaurant.open_time && restaurant.close_time
        ? `${restaurant.open_time} - ${restaurant.close_time}`
        : 'Chưa cập nhật giờ mở cửa',
      signature_dish: restaurant.signature_dish || null,
      popular_items: restaurant.popular_items || [],
      features: restaurant.environment_tags
        ? restaurant.environment_tags.split(',').map(t => t.trim()).filter(Boolean)
        : []
    }));

    return { success: true, data: formattedData };

  } catch (error) {
    console.error('❌ Lỗi trong getRestaurantsByCategory:', error);
    return {
      success: false,
      error: error.message,
      data: [],
      message: 'Có lỗi xảy ra khi tải nhà hàng theo loại.'
    };
  }
};

export const getAllRestaurantCategories = async () => {
  try {
    console.log('📡 Lấy tất cả loại nhà hàng từ Supabase...');

    const { data, error } = await supabase
      .from('restaurants')
      .select('cuisine_type')
      .eq('is_active', true)
      .not('cuisine_type', 'is', null);

    if (error) {
      console.error('❌ Lỗi khi lấy loại nhà hàng:', error);
      return {
        success: false,
        error: error.message,
        data: [],
        message: 'Không thể tải danh mục nhà hàng.'
      };
    }

    const categories = [...new Set(data.map(item => item.cuisine_type).filter(Boolean))];

    if (categories.length === 0) {
      return {
        success: true,
        data: [],
        message: 'Chưa có loại nhà hàng nào trong hệ thống.'
      };
    }

    return { success: true, data: categories.sort() };

  } catch (error) {
    console.error('❌ Lỗi trong getAllRestaurantCategories:', error);
    return {
      success: false,
      error: error.message,
      data: [],
      message: 'Có lỗi xảy ra khi tải danh mục nhà hàng.'
    };
  }
};

export const getNearbyRestaurants = async (latitude, longitude, radiusInKm = 10) => {
  try {
    console.log(`📍 Lấy nhà hàng gần vị trí: ${latitude}, ${longitude}`);

    if (!latitude || !longitude) {
      return {
        success: false,
        error: 'Thiếu tọa độ vị trí',
        data: [],
        message: 'Không thể tìm nhà hàng gần đây.'
      };
    }

    const latDelta = radiusInKm / 111;
    const lonDelta = radiusInKm / (111 * Math.cos(latitude * Math.PI / 180));

    const minLat = latitude - latDelta;
    const maxLat = latitude + latDelta;
    const minLon = longitude - lonDelta;
    const maxLon = longitude + lonDelta;

    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .eq('is_active', true)
      .gte('latitude', minLat)
      .lte('latitude', maxLat)
      .gte('longitude', minLon)
      .lte('longitude', maxLon)
      .order('name');

    if (error) {
      console.error('❌ Lỗi khi lấy nhà hàng gần đây:', error);
      return {
        success: false,
        error: error.message,
        data: [],
        message: 'Không thể tìm nhà hàng gần đây.'
      };
    }

    if (!data || data.length === 0) {
      return {
        success: true,
        data: [],
        message: 'Không tìm thấy nhà hàng nào trong khu vực gần đây.'
      };
    }

    const formattedData = data.map(restaurant => ({
      id: restaurant.id,
      name: restaurant.name || 'Nhà hàng chưa có tên',
      address: restaurant.address || 'Đang cập nhật địa chỉ',
      rating: restaurant.average_rating || 0,
      type: restaurant.cuisine_type || 'Nhà hàng',
      category: restaurant.cuisine_type || 'default',
      image_url: restaurant.image_url || WHITE_IMAGE,
      image: restaurant.image_url || WHITE_IMAGE,
      latitude: restaurant.latitude,
      longitude: restaurant.longitude,
      price_range: restaurant.price_range || 'Chưa cập nhật',
      cuisine_type: restaurant.cuisine_type,
      average_rating: restaurant.average_rating,
      is_active: restaurant.is_active,
      environment_tags: restaurant.environment_tags,
      description: restaurant.description || 'Mô tả đang được cập nhật',
      phone: restaurant.phone || 'Chưa có số điện thoại',
      open_time: restaurant.open_time || null,
      close_time: restaurant.close_time || null,
      openingHours: restaurant.open_time && restaurant.close_time
        ? `${restaurant.open_time} - ${restaurant.close_time}`
        : 'Chưa cập nhật giờ mở cửa',
      signature_dish: restaurant.signature_dish || null,
      popular_items: restaurant.popular_items || [],
      features: restaurant.environment_tags
        ? restaurant.environment_tags.split(',').map(t => t.trim()).filter(Boolean)
        : []
    }));

    return { success: true, data: formattedData };

  } catch (error) {
    console.error('❌ Lỗi trong getNearbyRestaurants:', error);
    return {
      success: false,
      error: error.message,
      data: [],
      message: 'Có lỗi xảy ra khi tìm nhà hàng gần đây.'
    };
  }
};

export const getRestaurantStats = async (restaurantId) => {
  try {
    console.log(`📊 Lấy thống kê nhà hàng ID: ${restaurantId}`);

    if (!restaurantId) {
      return {
        success: false,
        error: 'Thiếu ID nhà hàng',
        message: 'Không thể tải thống kê.'
      };
    }

    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('*')
      .eq('id', restaurantId)
      .single();

    if (restaurantError) {
      console.error('❌ Lỗi lấy thông tin nhà hàng:', restaurantError);
      return {
        success: false,
        error: restaurantError.message,
        message: 'Không thể tải thông tin nhà hàng.'
      };
    }

    let bookingCount = 0;
    try {
      const { count } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantId)
        .eq('status', 'completed');
      bookingCount = count || 0;
    } catch (err) {
      console.warn('⚠️ Không thể lấy số booking:', err.message);
    }

    let reviewCount = 0;
    try {
      const { count } = await supabase
        .from('Reviews')
        .select('*', { count: 'exact', head: true })
        .eq('id_restaurants', restaurantId);
      reviewCount = count || 0;
    } catch (err) {
      console.warn('⚠️ Không thể lấy số review:', err.message);
    }

    let menuCount = 0;
    try {
      const { count } = await supabase
        .from('menus')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantId)
        .eq('is_available', true);
      menuCount = count || 0;
    } catch (err) {
      console.warn('⚠️ Không thể lấy số món ăn:', err.message);
    }

    const stats = {
      restaurant_info: {
        name: restaurant.name || 'Nhà hàng chưa có tên',
        cuisine_type: restaurant.cuisine_type || 'Chưa phân loại',
        status: restaurant.is_active ? 'Hoạt động' : 'Đã đóng',
      },
      counts: {
        bookings: bookingCount,
        reviews: reviewCount,
        menu_items: menuCount,
      },
      rating: restaurant.average_rating || 0,
    };

    return { success: true, data: stats };

  } catch (error) {
    console.error('❌ Lỗi trong getRestaurantStats:', error);
    return {
      success: false,
      error: error.message,
      message: 'Có lỗi xảy ra khi tải thống kê.'
    };
  }
};

export const createRestaurantReview = async (reviewData) => {
  try {
    console.log('📝 Tạo đánh giá mới cho nhà hàng:', reviewData);

    if (!reviewData.restaurant_id || !reviewData.customer_id) {
      return {
        success: false,
        error: 'Thiếu thông tin bắt buộc',
        message: 'Vui lòng cung cấp đầy đủ thông tin.'
      };
    }

    const insertData = {
      id_restaurants: reviewData.restaurant_id,
      id_customers: reviewData.customer_id,
      rating: reviewData.rating || 0,
      review: reviewData.review || '',
      images: reviewData.images || [],
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('Reviews')
      .insert([insertData])
      .select(`
        profiles: id_customers (
          id,
          full_name,
          avatar_url
        )
      `)
      .single();

    if (error) {
      console.error('❌ Lỗi tạo đánh giá:', error);
      return {
        success: false,
        error: error.message,
        message: 'Không thể tạo đánh giá.'
      };
    }

    console.log('✅ Tạo đánh giá thành công:', data.id);

    return {
      success: true,
      data,
      message: 'Cảm ơn bạn đã đánh giá nhà hàng!'
    };
  } catch (error) {
    console.error('❌ Lỗi trong createRestaurantReview:', error);
    return {
      success: false,
      error: error.message,
      message: 'Có lỗi xảy ra khi tạo đánh giá.'
    };
  }
};

export const updateRestaurantReview = async (reviewId, updates) => {
  try {
    console.log(`🔄 Cập nhật đánh giá ID: ${reviewId}`);

    if (!reviewId) {
      return {
        success: false,
        error: 'Thiếu ID đánh giá',
        message: 'Không thể cập nhật đánh giá.'
      };
    }

    const updateData = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('Reviews')
      .update(updateData)
      .eq('id', reviewId)
      .select(`
        profiles: id_customers (
          id,
          full_name,
          avatar_url
        )
      `)
      .single();

    if (error) {
      console.error('❌ Lỗi cập nhật đánh giá:', error);
      return {
        success: false,
        error: error.message,
        message: 'Không thể cập nhật đánh giá.'
      };
    }

    console.log('✅ Cập nhật đánh giá thành công');

    return {
      success: true,
      data,
      message: 'Đã cập nhật đánh giá thành công!'
    };
  } catch (error) {
    console.error('❌ Lỗi trong updateRestaurantReview:', error);
    return {
      success: false,
      error: error.message,
      message: 'Có lỗi xảy ra khi cập nhật đánh giá.'
    };
  }
};

export const deleteRestaurantReview = async (reviewId) => {
  try {
    console.log(`🗑️ Xóa đánh giá ID: ${reviewId}`);

    if (!reviewId) {
      return {
        success: false,
        error: 'Thiếu ID đánh giá',
        message: 'Không thể xóa đánh giá.'
      };
    }

    const { error } = await supabase
      .from('Reviews')
      .delete()
      .eq('id', reviewId);

    if (error) {
      console.error('❌ Lỗi xóa đánh giá:', error);
      return {
        success: false,
        error: error.message,
        message: 'Không thể xóa đánh giá.'
      };
    }

    console.log('✅ Xóa đánh giá thành công');

    return {
      success: true,
      message: 'Đã xóa đánh giá thành công!'
    };
  } catch (error) {
    console.error('❌ Lỗi trong deleteRestaurantReview:', error);
    return {
      success: false,
      error: error.message,
      message: 'Có lỗi xảy ra khi xóa đánh giá.'
    };
  }
};

export const getRestaurantAverageRating = async (restaurantId) => {
  try {
    console.log(`⭐ Lấy đánh giá trung bình cho nhà hàng ID: ${restaurantId}`);

    if (!restaurantId) {
      return {
        success: false,
        error: 'Thiếu ID nhà hàng',
        message: 'Không thể tải đánh giá.'
      };
    }

    const { data, error } = await supabase
      .from('Reviews')
      .select('rating')
      .eq('id_restaurants', restaurantId);

    if (error) {
      console.error('❌ Lỗi lấy đánh giá:', error);
      return {
        success: false,
        error: error.message,
        message: 'Không thể tải đánh giá.'
      };
    }

    if (!data || data.length === 0) {
      return {
        success: true,
        data: { average: 0, count: 0 },
        message: 'Nhà hàng này chưa có đánh giá nào.'
      };
    }

    const totalRating = data.reduce((sum, review) => sum + (review.rating || 0), 0);
    const averageRating = totalRating / data.length;

    return {
      success: true,
      data: {
        average: parseFloat(averageRating.toFixed(1)),
        count: data.length
      }
    };
  } catch (error) {
    console.error('❌ Lỗi trong getRestaurantAverageRating:', error);
    return {
      success: false,
      error: error.message,
      message: 'Có lỗi xảy ra khi tải đánh giá.'
    };
  }
};

export const addMenuImage = async (menuId, imageUrl) => {
  try {
    console.log(`➕ Thiết lập ảnh cho món ăn ID: ${menuId}`);

    const { data, error } = await supabase
      .from('menus')
      .update({ image: imageUrl, updated_at: new Date().toISOString() })
      .eq('id', menuId)
      .select('*')
      .single();

    if (error) {
      console.error('❌ Lỗi khi thiết lập ảnh món ăn:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('❌ Lỗi trong addMenuImage:', error);
    return { success: false, error: error.message };
  }
};

export const updateMenuImage = async (menuId, imageUrl) => {
  return await addMenuImage(menuId, imageUrl);
};

export const deleteMenuImage = async (menuId) => {
  try {
    console.log(`🗑️ Đang xóa ảnh cho món ăn ID: ${menuId}`);

    const { data, error } = await supabase
      .from('menus')
      .update({ image: null, updated_at: new Date().toISOString() })
      .eq('id', menuId)
      .select('*')
      .single();

    if (error) {
      console.error('❌ Lỗi khi xóa ảnh món ăn:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('❌ Lỗi trong deleteMenuImage:', error);
    return { success: false, error: error.message };
  }
};

export const getMenuImages = async (menuId) => {
  try {
    console.log(`🔍 Đang lấy ảnh cho món ăn ID: ${menuId}`);

    const { data, error } = await supabase
      .from('menus')
      .select('image')
      .eq('id', menuId)
      .single();

    if (error) {
      console.error('❌ Lỗi khi lấy ảnh món ăn:', error);
      return { success: false, error: error.message, data: [] };
    }

    if (!data || !data.image) return { success: true, data: [] };

    return { success: true, data: [{ image_url: data.image }] };
  } catch (error) {
    console.error('❌ Lỗi trong getMenuImages:', error);
    return { success: false, error: error.message, data: [] };
  }
};

export const calculatePointsAndDiscount = async (customerId, amount) => {
  try {
    const pointsEarned = Math.floor(amount / 10000);

    const discountResult = await applyRankDiscount(customerId, amount);

    let finalAmount = amount;
    let discountApplied = 0;
    let discountPercentage = 0;

    if (discountResult.success && discountResult.data.discountPercentage > 0) {
      finalAmount = discountResult.data.discountedAmount;
      discountApplied = discountResult.data.discountApplied;
      discountPercentage = discountResult.data.discountPercentage;
    }

    const pointsFromDiscountedAmount = Math.floor(finalAmount / 10000);

    return {
      success: true,
      data: {
        originalAmount: amount,
        finalAmount,
        discountApplied,
        discountPercentage,
        pointsEarned,
        pointsFromDiscountedAmount,
        rankInfo: discountResult.data?.customerRank || null,
      },
      message: discountPercentage > 0
        ? `Được giảm ${discountPercentage}% (${discountApplied.toLocaleString()} VND)`
        : 'Không có discount',
    };
  } catch (error) {
    console.error('❌ Lỗi tính toán điểm và discount:', error);
    return {
      success: false,
      error: error.message,
      data: {
        originalAmount: amount,
        finalAmount: amount,
        discountApplied: 0,
        discountPercentage: 0,
        pointsEarned: Math.floor(amount / 10000),
      }
    };
  }
};

// Hàm tạo invoice từ booking
export const createInvoiceFromBooking = async (bookingId, invoiceData = {}) => {
  try {
    console.log(`🧾 Tạo invoice cho booking: ${bookingId}`);

    // Kiểm tra bookingId hợp lệ
    if (!bookingId || !isValidUUID(bookingId)) {
      console.error('❌ BookingId không hợp lệ:', bookingId);
      return { success: false, error: 'BookingId không hợp lệ' };
    }

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        user_id,
        restaurant_id,
        table_id,
        customer_name,
        phone,
        restaurants:restaurant_id (id, name),
        tables:table_id (id, table_name),
        profiles:user_id (id, full_name, phone, email, current_rank_id)
      `)
      .eq('id', bookingId)
      .single();

    if (bookingError) {
      console.error('❌ Lỗi lấy booking:', bookingError);
      return { success: false, error: 'Không tìm thấy booking' };
    }

    console.log(`🔍 Lấy order_items cho booking: ${bookingId}`);
    const { data: orderItems, error: itemsError } = await supabase
      .from('order_items')
      .select(`
        id,
        food_id,
        quantity,
        price_at_time,
        menus:food_id (food_name, price)
      `)
      .eq('booking_id', bookingId);

    if (itemsError) {
      console.error('❌ Lỗi lấy order items:', itemsError);
      return { success: false, error: 'Không thể lấy danh sách món ăn' };
    }

    console.log(`📦 Có ${orderItems?.length || 0} order_items`);

    let sub_total = 0;

    if (orderItems && orderItems.length > 0) {
      console.log('📊 Chi tiết từng order_item:');
      orderItems.forEach((item, index) => {
        const price_at_time = Number(item.price_at_time) || 0;
        const menu_price = Number(item.menus?.price) || 0;
        const quantity = Number(item.quantity) || 1;

        const itemPrice = price_at_time > 0 ? price_at_time : menu_price;
        const itemTotal = itemPrice * quantity;

        console.log(`   [${index + 1}] ${item.menus?.food_name || 'Không tên'}:`);
        console.log(`       price_at_time: ${price_at_time}`);
        console.log(`       menu_price: ${menu_price}`);
        console.log(`       quantity: ${quantity}`);
        console.log(`       itemPrice dùng: ${itemPrice}`);
        console.log(`       itemTotal: ${itemTotal}`);

        sub_total += itemTotal;
      });
    } else {
      console.log('⚠️ Không có order_items để tính toán');
    }

    console.log(`💰 Tổng sub_total tính được: ${sub_total.toLocaleString()} đ`);

    const customerId = booking.user_id || booking.profiles?.id;
    const customerRankId = booking.profiles?.current_rank_id;
    const customerName = invoiceData.customer_name || booking.profiles?.full_name || 'Khách hàng';
    const customerPhone = invoiceData.customer_phone || booking.profiles?.phone || '';
    const customerEmail = invoiceData.customer_email || booking.profiles?.email || '';

    let rank_discount_amount = 0;
    let rank_discount_percentage = 0;

    if (customerRankId) {
      const { data: rank, error: rankError } = await supabase
        .from('customer_ranks')
        .select('*')
        .eq('id', customerRankId)
        .single();

      if (!rankError && rank) {
        rank_discount_percentage = rank.discount_percentage || 0;
        rank_discount_amount = Math.floor(sub_total * (rank_discount_percentage / 100));
        console.log(`🎫 Áp dụng discount hạng ${rank.rank_name}: ${rank_discount_percentage}% = ${rank_discount_amount.toLocaleString()} đ`);
      }
    } else {
      console.log('ℹ️ Khách hàng không có rank_id');
    }

    const discount_amount = Number(invoiceData.discount_amount) || 0;
    const tax_amount = Number(invoiceData.tax_amount) || 0;
    const service_fee = Number(invoiceData.service_fee) || 0;

    const final_amount = Math.max(0, sub_total
      + tax_amount
      + service_fee
      - discount_amount
      - rank_discount_amount);

    const points_earned = Math.floor(final_amount / 10000);

    console.log('📊 Chi tiết tính toán:');
    console.log(`   sub_total: ${sub_total.toLocaleString()} đ`);
    console.log(`   tax_amount: ${tax_amount.toLocaleString()} đ`);
    console.log(`   service_fee: ${service_fee.toLocaleString()} đ`);
    console.log(`   discount_amount: ${discount_amount.toLocaleString()} đ`);
    console.log(`   rank_discount_amount: ${rank_discount_amount.toLocaleString()} đ`);
    console.log(`   final_amount: ${final_amount.toLocaleString()} đ`);
    console.log(`   points_earned: ${points_earned} điểm`);

    const invoiceNumber = `INV${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    const invoiceDataToInsert = {
      customer_id: customerId,
      invoice_number: invoiceNumber,
      sub_total: Number(sub_total.toFixed(2)),
      discount_amount: discount_amount,
      tax_amount: tax_amount,
      service_fee: service_fee,
      rank_discount_amount: rank_discount_amount,
      rank_discount_percentage: rank_discount_percentage,
      status: 'Draft',
      issued_at: new Date().toISOString(),
      due_date: invoiceData.due_date || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      payment_due_date: invoiceData.payment_due_date || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      table_id: booking.table_id,
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_email: customerEmail,
      payment_status: 'unpaid',
      paid_amount: 0,
      updated_at: new Date().toISOString(),
      notes: invoiceData.notes || `Hóa đơn cho booking ${bookingId}`,
      customer_rank_id: customerRankId,
      booking_id: bookingId,
      points_earned: points_earned,
    };

    console.log('📤 Đang tạo invoice với dữ liệu:', {
      invoice_number: invoiceNumber,
      sub_total,
      final_amount,
      order_items_count: orderItems?.length || 0
    });

    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert([invoiceDataToInsert])
      .select(`*`)
      .single();

    if (invoiceError) {
      console.error('❌ Lỗi tạo invoice:', invoiceError);
      return { success: false, error: invoiceError.message };
    }

    console.log('✅ Tạo invoice thành công:', invoice.id);

    return {
      success: true,
      data: invoice,
      message: `Đã tạo hóa đơn ${invoiceNumber}`
    };
  } catch (error) {
    console.error('❌ Lỗi trong createInvoiceFromBooking:', error);
    return { success: false, error: error.message };
  }
};

export const upsertInvoiceSubTotal = async (bookingId, sub_total) => {
  try {
    if (!bookingId) return { success: false, error: 'Thiếu bookingId' };

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        restaurants:restaurant_id (id, name),
        profiles:user_id (id, full_name, phone, email, current_rank_id)
      `)
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      console.error('❌ Không tìm thấy booking khi upsert sub_total:', bookingError);
      return { success: false, error: bookingError?.message || 'Không tìm thấy booking' };
    }

    const { data: existingInvoice } = await supabase
      .from('invoices')
      .select('*')
      .eq('booking_id', bookingId)
      .limit(1)
      .single();

    if (existingInvoice) {
      const updatePayload = {
        sub_total: Number(sub_total || 0),
        updated_at: new Date().toISOString(),
      };

      const { data: updated, error: updateError } = await supabase
        .from('invoices')
        .update(updatePayload)
        .eq('id', existingInvoice.id)
        .select()
        .single();

      if (updateError) {
        console.error('❌ Lỗi cập nhật sub_total cho invoice:', updateError);
        return { success: false, error: updateError.message };
      }

      return { success: true, data: updated };
    }

    const invoiceNumber = `INV${Date.now()}${Math.random().toString(36).substr(2,6).toUpperCase()}`;
    const newInvoice = {
      customer_id: booking.user_id || booking.profiles?.id || null,
      invoice_number: invoiceNumber,
      sub_total: Number(sub_total || 0),
      status: 'Draft',
      issued_at: new Date().toISOString(),
      payment_due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      payment_status: 'unpaid',
      paid_amount: 0,
      updated_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      customer_rank_id: booking.profiles?.current_rank_id || null,
      booking_id: bookingId,
      customer_name: booking.profiles?.full_name || null,
      customer_phone: booking.profiles?.phone || null,
      customer_email: booking.profiles?.email || null,
    };

    const { data: inserted, error: insertError } = await supabase
      .from('invoices')
      .insert([newInvoice])
      .select()
      .single();

    if (insertError) {
      console.error('❌ Lỗi tạo invoice minimal khi upsert sub_total:', insertError);
      return { success: false, error: insertError.message };
    }

    return { success: true, data: inserted };
  } catch (error) {
    console.error('❌ Lỗi trong upsertInvoiceSubTotal:', error);
    return { success: false, error: error.message };
  }
};

// Trong supabase.js, sửa hàm getInvoiceByBookingId
export const getInvoiceByBookingId = async (bookingId) => {
  try {
    // KIỂM TRA bookingId TRƯỚC KHI THỰC HIỆN TRUY VẤN
    if (!bookingId) {
      console.warn('⚠️ getInvoiceByBookingId: bookingId là null hoặc undefined');
      return { success: true, data: null };
    }
    
    // Kiểm tra nếu bookingId là 'undefined' (string)
    if (bookingId === 'undefined' || bookingId === 'null') {
      console.warn(`⚠️ getInvoiceByBookingId: bookingId là string "${bookingId}"`);
      return { success: true, data: null };
    }
    
    // Kiểm tra UUID hợp lệ
    if (!isValidUUID(bookingId)) {
      console.warn(`⚠️ getInvoiceByBookingId: bookingId không phải UUID hợp lệ: ${bookingId}`);
      return { success: true, data: null };
    }

    console.log(`🔍 Lấy invoice cho booking: ${bookingId}`);

    const { data, error } = await supabase
      .from('invoices')
      .select(`
        id,
        invoice_number,
        sub_total,
        discount_amount,
        tax_amount,
        service_fee,
        rank_discount_amount,
        rank_discount_percentage,
        final_amount,
        paid_amount,
        payment_status,
        points_earned,
        customer_ranks (*),
        bookings (
          id,
          booking_time,
          customer_name,
          phone,
          tables (
            table_name,
            capacity
          ),
          order_items (
            id,
            food_id,
            quantity,
            price_at_time,
            menus:food_id (
              food_name,
              price
            )
          )
        )
      `)
      .eq('booking_id', bookingId)
      .limit(1)
      .single();

    if (error) {
      // Nếu lỗi là "PGRST116" (không tìm thấy bản ghi), trả về null thay vì lỗi
      if (error.code === 'PGRST116') {
        console.log(`ℹ️ Không tìm thấy invoice cho booking ${bookingId}`);
        return { success: true, data: null };
      }
      
      console.error('❌ Lỗi lấy invoice:', error);
      return { success: false, error: error.message };
    }

    console.log(`✅ Tìm thấy invoice: ${data?.invoice_number || 'N/A'}`);
    return { success: true, data };

  } catch (error) {
    console.error('❌ Lỗi trong getInvoiceByBookingId:', error);
    return { success: false, error: error.message };
  }
};

export const getCustomerInvoices = async (customerId, options = {}) => {
  try {
    const {
      limit = 20,
      offset = 0,
      status = null,
      payment_status = null,
      start_date = null,
      end_date = null
    } = options;

    console.log(`📋 Lấy invoices cho customer: ${customerId}`);

    let query = supabase
      .from('invoices')
      .select(`
        customer_ranks (*)
      `, { count: 'exact' })
      .eq('customer_id', customerId);

    if (status) {
      query = query.eq('status', status);
    }
    if (payment_status) {
      query = query.eq('payment_status', payment_status);
    }
    if (start_date) {
      query = query.gte('issued_at', start_date);
    }
    if (end_date) {
      query = query.lte('issued_at', end_date);
    }

    query = query
      .order('issued_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('❌ Lỗi lấy danh sách invoices:', error);
      return { success: false, error: error.message };
    }

    console.log(`✅ Lấy được ${data?.length || 0} invoices`);

    return {
      success: true,
      data: data || [],
      count: count || 0
    };
  } catch (error) {
    console.error('❌ Lỗi trong getCustomerInvoices:', error);
    return { success: false, error: error.message };
  }
};

export const getInvoiceDetails = async (invoiceId) => {
  try {
    console.log(`🔍 Lấy chi tiết invoice: ${invoiceId}`);

    const { data, error } = await supabase
      .from('invoices')
      .select(`
        id,
        invoice_number,
        sub_total,
        discount_amount,
        tax_amount,
        service_fee,
        rank_discount_amount,
        rank_discount_percentage,
        final_amount,
        paid_amount,
        payment_status,
        points_earned,
        issued_at,
        updated_at,
        notes,
        customer_ranks (*),
        bookings (
          id,
          booking_time,
          customer_name,
          phone,
          tables (
            table_name
          ),
          order_items (
            id,
            food_id,
            quantity,
            price_at_time,
            menus:food_id (
              food_name,
              price
            )
          )
        )
      `)
      .eq('id', invoiceId)
      .single();

    if (error) {
      console.error('❌ Lỗi lấy chi tiết invoice:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Lấy chi tiết invoice thành công:', data?.id, data?.invoice_number);
    try {
      if ((!data.sub_total || Number(data.sub_total) === 0) && data.bookings?.order_items?.length) {
        let computedSubTotal = 0;
        data.bookings.order_items.forEach(item => {
          const price_at_time = Number(item.price_at_time) || 0;
          const menu_price = Number(item.menus?.price) || 0;
          const quantity = Number(item.quantity) || 1;
          const itemPrice = price_at_time > 0 ? price_at_time : menu_price;
          computedSubTotal += itemPrice * quantity;
        });

        console.log(`ℹ️ Fallback computed sub_total from order_items: ${computedSubTotal}`);
        data.sub_total = computedSubTotal;

        const tax_amount = Number(data.tax_amount) || 0;
        const service_fee = Number(data.service_fee) || 0;
        const discount_amount = Number(data.discount_amount) || 0;
        const rank_discount_amount = Number(data.rank_discount_amount) || 0;

        data.final_amount = Math.max(0, data.sub_total + tax_amount + service_fee - discount_amount - rank_discount_amount);
        data.points_earned = Math.floor(data.final_amount / 10000);
      }
    } catch (err) {
      console.warn('⚠️ Lỗi khi tính fallback sub_total:', err);
    }

    return { success: true, data };
  } catch (error) {
    console.error('❌ Lỗi trong getInvoiceDetails:', error);
    return { success: false, error: error.message };
  }
};

export const updateInvoice = async (invoiceId, updates) => {
  try {
    console.log(`🔄 Cập nhật invoice ${invoiceId}`);

    const restrictedFields = ['id', 'invoice_number', 'customer_id', 'created_at'];
    const safeUpdates = { ...updates };

    restrictedFields.forEach(field => {
      if (field in safeUpdates) {
        console.warn(`⚠️ Không thể cập nhật trường ${field}`);
        delete safeUpdates[field];
      }
    });

    safeUpdates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('invoices')
      .update(safeUpdates)
      .eq('id', invoiceId)
      .select()
      .single();

    if (error) {
      console.error('❌ Lỗi cập nhật invoice:', error);
      return { success: false, error: error.message };
    }

    console.log(`✅ Cập nhật invoice thành công: ${invoiceId}`);
    return { success: true, data };
  } catch (error) {
    console.error('❌ Lỗi trong updateInvoice:', error);
    return { success: false, error: error.message };
  }
};

export const cancelInvoice = async (invoiceId, userId, reason = '') => {
  try {
    console.log(`🗑️ Hủy invoice: ${invoiceId}`);

    const updateData = {
      status: 'cancelled',
      payment_status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancelled_by: userId,
      cancellation_reason: reason,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('invoices')
      .update(updateData)
      .eq('id', invoiceId)
      .select()
      .single();

    if (error) {
      console.error('❌ Lỗi hủy invoice:', error);
      return { success: false, error: error.message };
    }

    console.log(`✅ Đã hủy invoice: ${invoiceId}`);
    return {
      success: true,
      data,
      message: 'Đã hủy hóa đơn'
    };
  } catch (error) {
    console.error('❌ Lỗi trong cancelInvoice:', error);
    return { success: false, error: error.message };
  }
};

export const getPaymentSummary = async (customerId) => {
  try {
    const { data: invoices, error } = await supabase
      .from('invoices')
      .select('final_amount, paid_amount, payment_status, points_earned, status')
      .eq('customer_id', customerId);

    if (error) throw error;

    const summary = {
      total_invoices: invoices.length,
      total_amount: invoices.reduce((sum, inv) => sum + (inv.final_amount || 0), 0),
      total_paid: invoices.reduce((sum, inv) => sum + (inv.paid_amount || 0), 0),
      total_points: invoices.reduce((sum, inv) => sum + (inv.points_earned || 0), 0),
      paid_invoices: invoices.filter(inv => inv.payment_status === 'paid').length,
      pending_invoices: invoices.filter(inv => inv.payment_status === 'unpaid').length,
      partial_invoices: invoices.filter(inv => inv.payment_status === 'partial').length,
      cancelled_invoices: invoices.filter(inv => inv.status === 'cancelled').length,
    };

    return { success: true, data: summary };
  } catch (error) {
    console.error('❌ Lỗi lấy tổng quan thanh toán:', error);
    return { success: false, error: error.message };
  }
};

export const createDirectInvoice = async ( customerId, invoiceData) => {
  try {
    console.log(`🧾 Tạo invoice trực tiếp: customer=${customerId}`);

    const { data: customer, error: customerError } = await supabase
      .from('profiles')
      .select('full_name, phone, email, current_rank_id')
      .eq('id', customerId)
      .single();

    if (customerError) {
      return { success: false, error: 'Không tìm thấy khách hàng' };
    }

    const items = invoiceData.items || [];
    const sub_total = items.reduce((sum, item) => {
      return sum + (item.unit_price * item.quantity);
    }, 0);

    const invoiceNumber = `INV-DIR-${Date.now()}`;

    const invoiceDataToInsert = {
      customer_id: customerId,
      invoice_number: invoiceNumber,
      sub_total: sub_total,
      discount_amount: invoiceData.discount_amount || 0,
      tax_amount: invoiceData.tax_amount || 0,
      service_fee: invoiceData.service_fee || 0,
      status: 'Draft',
      issued_at: new Date().toISOString(),
      due_date: invoiceData.due_date || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      payment_due_date: invoiceData.payment_due_date || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      branch_id: invoiceData.branch_id || null,
      table_id: invoiceData.table_id || null,
      customer_name: customer.full_name,
      customer_phone: customer.phone,
      customer_email: customer.email,
      payment_status: 'unpaid',
      paid_amount: 0,
      notes: invoiceData.notes || 'Hóa đơn trực tiếp',
      customer_rank_id: customer.current_rank_id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert([invoiceDataToInsert])
      .select()
      .single();

    if (invoiceError) {
      console.error('❌ Lỗi tạo invoice trực tiếp:', invoiceError);
      return { success: false, error: invoiceError.message };
    }

    console.log('✅ Tạo invoice trực tiếp thành công:', invoice.id);

    return {
      success: true,
      data: invoice,
      message: `Đã tạo hóa đơn ${invoiceNumber}`
    };
  } catch (error) {
    console.error('❌ Lỗi trong createDirectInvoice:', error);
    return { success: false, error: error.message };
  }
};

export const checkAndUpdateOverdueInvoices = async () => {
  try {
    console.log('⏰ Kiểm tra invoice quá hạn');

    const today = new Date().toISOString();

    const { data: overdueInvoices, error } = await supabase
      .from('invoices')
      .select('id, invoice_number, payment_due_date')
      .eq('payment_status', 'unpaid')
      .lt('payment_due_date', today)
      .not('payment_due_date', 'is', null);

    if (error) {
      console.error('❌ Lỗi kiểm tra invoice quá hạn:', error);
      return { success: false, error: error.message };
    }

    if (!overdueInvoices || overdueInvoices.length === 0) {
      return {
        success: true,
        data: [],
        message: 'Không có invoice quá hạn'
      };
    }

    console.log(`⚠️ Tìm thấy ${overdueInvoices.length} invoice quá hạn`);

    const invoiceIds = overdueInvoices.map(inv => inv.id);

    const { error: updateError } = await supabase
      .from('invoices')
      .update({
        payment_status: 'overdue',
        updated_at: new Date().toISOString()
      })
      .in('id', invoiceIds);

    if (updateError) {
      console.error('❌ Lỗi cập nhật invoice quá hạn:', updateError);
      return { success: false, error: updateError.message };
    }

    console.log(`✅ Đã cập nhật ${invoiceIds.length} invoice thành trạng thái overdue`);

    return {
      success: true,
      data: overdueInvoices,
      message: `Đã cập nhật ${invoiceIds.length} invoice quá hạn`
    };
  } catch (error) {
    console.error('❌ Lỗi trong checkAndUpdateOverdueInvoices:', error);
    return { success: false, error: error.message };
  }
};
// Trong supabase.js, sửa hàm payInvoice
export const payInvoice = async (invoiceId, paymentData, options = {}) => {
  try {
    // KIỂM TRA invoiceId CÓ HỢP LỆ KHÔNG TRƯỚC KHI TIẾP TỤC
    if (!invoiceId) {
      console.error('❌ payInvoice: invoiceId là null hoặc undefined');
      return { 
        success: false, 
        error: 'Thiếu ID hóa đơn' 
      };
    }

    // Kiểm tra nếu invoiceId là 'undefined' (string)
    if (invoiceId === 'undefined' || invoiceId === 'null') {
      console.error('❌ payInvoice: invoiceId là string không hợp lệ:', invoiceId);
      return { 
        success: false, 
        error: 'ID hóa đơn không hợp lệ' 
      };
    }

    // Kiểm tra UUID hợp lệ
    if (!isValidUUID(invoiceId)) {
      console.error('❌ payInvoice: invoiceId không phải UUID hợp lệ:', invoiceId);
      return { 
        success: false, 
        error: 'Định dạng ID hóa đơn không hợp lệ' 
      };
    }

    console.log(`💰 Thanh toán invoice: ${invoiceId}`, { options });

    const {
      completeBooking = true,
      clearOrderItems = true,
      addPoints = true,
    } = options;

    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*, customer_ranks(*)')
      .eq('id', invoiceId)
      .single();

    if (invoiceError || !invoice) {
      console.error('❌ Lỗi lấy invoice:', invoiceError);
      return { success: false, error: invoiceError?.message || 'Không tìm thấy invoice' };
    }

    const paymentAmount = paymentData.amount_actual || paymentData.amount || (completeBooking ? invoice.final_amount : 0);

    if (!paymentAmount || Number(paymentAmount) <= 0) {
      return { success: false, error: 'Vui lòng nhập số tiền thanh toán' };
    }

    const newPaidAmount = (invoice.paid_amount || 0) + Number(paymentAmount);

    let newPaymentStatus = invoice.payment_status || 'unpaid';
    if (newPaidAmount >= (invoice.final_amount || 0)) {
      newPaymentStatus = 'paid';
    } else if (newPaidAmount > 0) {
      newPaymentStatus = 'partial';
    }

    const updateData = {
      paid_amount: newPaidAmount,
      payment_status: newPaymentStatus,
      updated_at: new Date().toISOString(),
    };

    const { data: updatedInvoice, error: updateError } = await supabase
      .from('invoices')
      .update(updateData)
      .eq('id', invoiceId)
      .select('*, customer_ranks(*)')
      .single();

    if (updateError) {
      console.error('❌ Lỗi cập nhật invoice:', updateError);
      return { success: false, error: updateError.message };
    }

    const afterPaymentActions = [];

    if (newPaymentStatus === 'paid' && completeBooking && invoice.booking_id) {
      try {
        const bookingResult = await updateBooking(invoice.booking_id, {
          status: 'completed',
        });

        if (bookingResult && bookingResult.success) {
          afterPaymentActions.push('booking_completed');
        } else {
          console.error('❌ Lỗi cập nhật booking:', bookingResult?.error || 'Unknown');
        }
      } catch (bkErr) {
        console.error('❌ Exception khi cập nhật booking:', bkErr);
      }

      try {
        const { data: bookingRow, error: bookingRowErr } = await supabase
          .from('bookings')
          .select('table_id')
          .eq('id', invoice.booking_id)
          .single();

        if (!bookingRowErr && bookingRow && bookingRow.table_id) {
          const res = await setTableStatusSafe(bookingRow.table_id, 'available');
          if (!res.success) console.warn('⚠️ Không thể cập nhật trạng thái bàn khi hoàn thành booking:', res.error);
        }
      } catch (err) {
        console.warn('⚠️ Không thể cập nhật trạng thái bàn khi hoàn thành booking:', err.message);
      }

      if (clearOrderItems) {
        try {
          const { error: deleteError } = await supabase
            .from('order_items')
            .delete()
            .eq('booking_id', invoice.booking_id);

          if (!deleteError) {
            afterPaymentActions.push('order_items_cleared');
          }
        } catch (delErr) {
          console.warn('⚠️ Không thể xóa order_items:', delErr.message || delErr);
        }
      }
    }

    let pointsAdded = 0;
    if (addPoints && invoice.customer_id) {
      const pointsToAdd = Math.floor(Number(paymentAmount) / 10000);
      if (pointsToAdd > 0) {
        const pointsResult = await updateCustomerPointsAndRank(invoice.customer_id, pointsToAdd);
        if (pointsResult.success) {
          pointsAdded = pointsToAdd;
          afterPaymentActions.push('points_added');
        }
      }
    }

    try {
      await supabase
        .from('payment_logs')
        .insert([{
          invoice_id: invoiceId,
          amount: Number(paymentAmount),
          reference_id: paymentData.reference_id || null,
          payment_type: completeBooking ? 'full_payment' : 'partial_payment',
          status: 'completed',
          created_at: new Date().toISOString(),
        }]);
    } catch (logError) {
      console.warn('⚠️ Không thể ghi log thanh toán:', logError.message || logError);
    }

    return {
      success: true,
      data: {
        invoice: updatedInvoice,
        payment: {
          amount: Number(paymentAmount),
          status: newPaymentStatus,
          type: completeBooking ? 'full_payment' : 'partial_payment',
        },
        points_added: pointsAdded,
        after_payment_actions: afterPaymentActions,
      },
      message: newPaymentStatus === 'paid' ? (completeBooking ? 'Thanh toán thành công! Booking đã kết thúc.' : 'Thanh toán thành công!') : 'Thanh toán một phần thành công',
    };
  } catch (error) {
    console.error('❌ Lỗi trong payInvoice:', error);
    return { success: false, error: error.message };
  }
};

export const payInvoicePartial = async (invoiceId, paymentData) => {
  return await payInvoice(invoiceId, paymentData, {
    completeBooking: false,    
    clearOrderItems: false,   
    addPoints: false,        
  });
};

export const payInvoiceComplete = async (invoiceId, paymentData) => {
  return await payInvoice(invoiceId, paymentData, {
    completeBooking: true,    
    clearOrderItems: true,     
    addPoints: true,          
  });
};

export const createAndPayInvoiceForBooking = async (bookingId, paymentData) => {
  try {
    console.log(`💰 Tạo và thanh toán invoice cho booking: ${bookingId}`);

    let invoice;
    const existingInvoice = await getInvoiceByBookingId(bookingId);

    if (existingInvoice.success && existingInvoice.data) {
      console.log('✅ Đã có invoice:', existingInvoice.data.invoice_number);
      invoice = existingInvoice.data;
    } else {
      console.log('➕ Tạo invoice mới từ booking');
      const invoiceResult = await createInvoiceFromBooking(bookingId, paymentData);
      if (!invoiceResult.success) {
        return { success: false, error: invoiceResult.error };
      }
      invoice = invoiceResult.data;
    }

    const paymentResult = await payInvoice(invoice.id, paymentData);

    if (!paymentResult.success) {
      return paymentResult;
    }

    if (paymentResult.data.invoice.payment_status === 'paid') {
      try {
        const bookingResult = await updateBooking(bookingId, {
          status: 'completed',
        });

        if (!bookingResult || !bookingResult.success) {
          console.error('❌ Lỗi cập nhật booking:', bookingResult?.error || 'Unknown');
          return {
            ...paymentResult,
            warning: 'Thanh toán thành công nhưng không thể cập nhật trạng thái booking',
          };
        }
      } catch (bkErr) {
        console.error('❌ Exception khi cập nhật booking:', bkErr);
        return {
          ...paymentResult,
          warning: 'Thanh toán thành công nhưng không thể cập nhật trạng thái booking',
        };
      }

      try {
        const { data: bookingRow, error: bookingRowErr } = await supabase
          .from('bookings')
          .select('table_id')
          .eq('id', bookingId)
          .single();

        if (!bookingRowErr && bookingRow && bookingRow.table_id) {
          const res = await setTableStatusSafe(bookingRow.table_id, 'available');
          if (!res.success) console.warn('⚠️ Không thể cập nhật trạng thái bàn khi hoàn thành booking:', res.error);
        }
      } catch (err) {
        console.warn('⚠️ Không thể cập nhật trạng thái bàn khi hoàn thành booking:', err.message);
      }

      if (paymentData.clear_order_items !== false) {
        const { error: deleteError } = await supabase
          .from('order_items')
          .delete()
          .eq('booking_id', bookingId);

        if (deleteError) {
          console.warn('⚠️ Không thể xóa order_items:', deleteError.message);
        }
      }
    }

    return paymentResult;
  } catch (error) {
    console.error('❌ Lỗi trong createAndPayInvoiceForBooking:', error);
    return { success: false, error: error.message };
  }
};

export const checkTableAvailability = async (tableId, bookingTimeISO) => {
  try {
    if (!tableId || !bookingTimeISO) {
      return { success: false, error: 'Thiếu tableId hoặc bookingTime' };
    }

    const target = new Date(bookingTimeISO);

    const windowStart = new Date(target);
    windowStart.setHours(windowStart.getHours() - 1);
    const windowEnd = new Date(target);
    windowEnd.setHours(windowEnd.getHours() + 1);

    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('table_id', tableId)
      .in('status', ['confirmed'])
      .gte('booking_time', windowStart.toISOString())
      .lte('booking_time', windowEnd.toISOString());

    if (error) {
      console.error('❌ Lỗi kiểm tra table availability:', error);
      return { success: false, error: error.message };
    }

    const conflicts = data || [];

    try {
      const { data: tableRow } = await supabase
        .from('tables')
        .select('status')
        .eq('id', tableId)
        .single();

      if (tableRow && tableRow.status === 'occupied') {
        return { success: true, data: { isAvailable: false, conflicts: [{ reason: 'table_occupied' }] } };
      }
    } catch (err) {
    }

    const isAvailable = conflicts.length === 0;

    return { success: true, data: { isAvailable, conflicts } };
  } catch (error) {
    console.error('❌ Lỗi trong checkTableAvailability:', error);
    return { success: false, error: error.message };
  }
};

export const createBooking = async (bookingData) => {
  try {
    if (!bookingData) {
      return { success: false, error: 'Thiếu dữ liệu booking' };
    }

    const tableId = bookingData.table_id || bookingData.tableId || null;
    const bookingTime = bookingData.booking_time || new Date().toISOString();

    if (tableId) {
      const { data: tableRow, error: tableError } = await supabase
        .from('tables')
        .select('id, status')
        .eq('id', tableId)
        .single();

      if (tableError || !tableRow) {
        return { success: false, error: 'Bàn không tồn tại' };
      }

      if (tableRow.status === 'occupied') {
        return { success: false, error: 'Bàn đang bận (occupied)' };
      }

      const avail = await checkTableAvailability(tableId, bookingTime);
      if (!avail.success) {
        return { success: false, error: 'Không thể kiểm tra tình trạng bàn' };
      }
      if (!avail.data.isAvailable) {
        return { success: false, error: 'Bàn đã được đặt vào khung thời gian này' };
      }
    }

    const willAutoConfirm = !!bookingData.auto_confirm || bookingData.status === 'confirmed' || bookingData.status === 'seated';

    const payload = {
      user_id: bookingData.user_id || null,
      restaurant_id: bookingData.restaurant_id || bookingData.restaurantId || null,
      table_id: tableId,
      customer_name: bookingData.customer_name || bookingData.customerName || 'Khách hàng',
      phone: bookingData.phone || bookingData.customer_phone || '',
      people_count: bookingData.people_count || bookingData.number_of_people || 2,
      booking_time: bookingTime,
      status: willAutoConfirm ? 'confirmed' : 'pending',
    };

    console.log('📤 Đang tạo booking với payload:', payload);

    const { data, error } = await supabase
      .from('bookings')
      .insert([payload])
      .select(`
        *,
        restaurants:restaurant_id (
          id,
          name,
          cuisine_type,
          image_url
        ),
        tables:table_id (
          id,
          table_name,
          capacity,
          status
        )
      `)
      .single();

    if (error) {
      console.error('❌ Lỗi tạo booking:', error);
      return { success: false, error: error.message || String(error) };
    }

    // CẬP NHẬT TRẠNG THÁI BÀN THÀNH 'occupied'
    if (willAutoConfirm && data && data.table_id) {
      try {
        console.log(`🔄 Đang cập nhật trạng thái bàn ${data.table_id} -> occupied`);
        const res = await setTableStatusSafe(data.table_id, 'occupied');
        if (!res.success) {
          console.error('❌ Không thể cập nhật trạng thái bàn:', res.error);
        } else {
          console.log('✅ Đã cập nhật trạng thái bàn thành occupied');
        }
      } catch (err) {
        console.error('❌ Lỗi khi cập nhật trạng thái bàn:', err.message || err);
      }
    }

    return { success: true, data };
  } catch (error) {
    console.error('❌ Lỗi trong createBooking:', error);
    return { success: false, error: error.message || String(error) };
  }
};

export const updateBooking = async (bookingId, updates) => {
  try {
    console.log(`🔄 Cập nhật booking ${bookingId}`, updates);

    if (!bookingId) {
      return { success: false, error: 'Thiếu bookingId' };
    }

    const restrictedFields = ['id', 'user_id', 'restaurant_id'];
    const safeUpdates = { ...updates };
    restrictedFields.forEach(f => { if (f in safeUpdates) delete safeUpdates[f]; });

    const { data, error } = await supabase
      .from('bookings')
      .update(safeUpdates)
      .eq('id', bookingId)
      .select(`*, tables:table_id (id, table_name, status)`)
      .single();

    if (error) {
      console.error('❌ Lỗi cập nhật booking:', error);
      return { success: false, error: error.message || String(error) };
    }

    try {
        if (safeUpdates.status && data && data.table_id) {
        if (safeUpdates.status === 'completed' || safeUpdates.status === 'cancelled') {
          const r = await setTableStatusSafe(data.table_id, 'available');
          if (!r.success) console.warn('⚠️ Không thể đồng bộ trạng thái bàn sau khi cập nhật booking:', r.error);
        } else if (safeUpdates.status === 'confirmed' || safeUpdates.status === 'seated') {
          const r = await setTableStatusSafe(data.table_id, 'occupied');
          if (!r.success) console.warn('⚠️ Không thể đồng bộ trạng thái bàn sau khi cập nhật booking:', r.error);
        }
      }

      try {
        if (data && data.table_id) {
          const { data: freshTable } = await supabase
            .from('tables')
            .select('id, table_name, status')
            .eq('id', data.table_id)
            .single();
          if (freshTable) data.tables = freshTable;
        }
      } catch (refreshErr) {
      }
    } catch (tblErr) {
      console.warn('⚠️ Không thể đồng bộ trạng thái bàn sau khi cập nhật booking:', tblErr.message || tblErr);
    }

    return { success: true, data };
  } catch (error) {
    console.error('❌ Lỗi trong updateBooking:', error);
    return { success: false, error: error.message || String(error) };
  }
};

export default supabase;
