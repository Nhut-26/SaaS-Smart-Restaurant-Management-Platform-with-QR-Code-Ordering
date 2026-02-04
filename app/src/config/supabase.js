import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

const supabaseUrl = 'https://vhjxxgajenkzuykkqloi.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZoanh4Z2FqZW5renV5a2txbG9pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0OTgyMjIsImV4cCI6MjA4MzA3NDIyMn0.l04T4IY-2mdFTvVhksDBmL5buErB1Pfa97GQOgRVtCg';

// Tạo client không dùng Auth
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// HÀM KIỂM TRA KẾT NỐI
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

// ========== AUTHENTICATION FUNCTIONS ==========

// HÀM ĐĂNG KÝ NGƯỜI DÙNG (TẠO STRAIGHT VÀO PROFILES)
export const registerUser = async (userData) => {
    try {
        const { email, password, phone, fullName } = userData;

        console.log('📝 Đang đăng ký người dùng với email:', email);

        // 1. Kiểm tra email đã tồn tại chưa
        const { data: existingEmail, error: emailError } = await supabase
            .from('profiles')
            .select('email')
            .eq('email', email)
            .single();

        if (existingEmail && !emailError) {
            return {
                success: false,
                error: 'Email đã được sử dụng'
            };
        }

        // 2. Kiểm tra phone đã tồn tại chưa
        const { data: existingPhone, error: phoneError } = await supabase
            .from('profiles')
            .select('phone')
            .eq('phone', phone)
            .single();

        if (existingPhone && !phoneError) {
            return {
                success: false,
                error: 'Số điện thoại đã được sử dụng'
            };
        }

        // 3. Tạo user thẳng vào bảng profiles (không dùng Auth)
        console.log('🔐 Đang tạo user trong bảng profiles...');

        // Tạo timestamp hiện tại
        const createdAt = new Date().toISOString();

        // KHÔNG truyền id - để Supabase tự tạo UUID
        const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .insert([
                {
                    full_name: fullName || email.split('@')[0],
                    phone: phone,
                    email: email,
                    password: password, // Lưu password trực tiếp (trong thực tế nên mã hóa)
                    loyalty_points: 0,
                    global_role: 'customer',
                    created_at: createdAt,
                }
            ])
            .select()
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
                    id: profileData.id, // Lấy id từ dữ liệu trả về
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

// HÀM ĐĂNG NHẬP (Email làm username, không dùng Auth)
export const loginUser = async (email, password) => {
    try {
        console.log('🔐 Đang đăng nhập với email:', email);

        // 1. Tìm user trong bảng profiles bằng email
        const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('email', email)
            .single();

        if (profileError || !profileData) {
            console.log('❌ Không tìm thấy tài khoản với email:', email);
            return {
                success: false,
                error: 'Email hoặc mật khẩu không đúng'
            };
        }

        console.log('✅ Tìm thấy profile, kiểm tra mật khẩu...');

        // 2. Kiểm tra mật khẩu (so sánh trực tiếp vì lưu plain text)
        if (profileData.password !== password) {
            console.log('❌ Mật khẩu không đúng');
            return {
                success: false,
                error: 'Email hoặc mật khẩu không đúng'
            };
        }

        console.log('✅ Đăng nhập thành công:', profileData.full_name);

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

// HÀM CẬP NHẬT PROFILE
export const updateUserProfile = async (profileId, updates) => {
    try {
        // Thêm updated_at
        const updateData = {
            ...updates,
            updated_at: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('profiles')
            .update(updateData)
            .eq('id', profileId)
            .select()
            .single();

        if (error) throw error;

        return { success: true, data };
    } catch (error) {
        console.error('❌ Lỗi cập nhật profile:', error);
        return { success: false, error: error.message };
    }
};

// HÀM LẤY THÔNG TIN USER
export const getUserProfile = async (profileId) => {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', profileId)
            .single();

        if (error) throw error;

        return { success: true, data };
    } catch (error) {
        console.error('❌ Lỗi lấy profile:', error);
        return { success: false, error: error.message };
    }
};

// HÀM KIỂM TRA EMAIL TỒN TẠI
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

// HÀM KIỂM TRA PHONE TỒN TẠI
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

// HÀM ĐỔI MẬT KHẨU
export const changePassword = async (profileId, currentPassword, newPassword) => {
    try {
        // 1. Lấy profile
        const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', profileId)
            .single();

        if (profileError) throw new Error('Không tìm thấy tài khoản');

        // 2. Kiểm tra mật khẩu hiện tại
        if (profileData.password !== currentPassword) {
            return {
                success: false,
                error: 'Mật khẩu hiện tại không đúng'
            };
        }

        // 3. Cập nhật mật khẩu mới
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

// HÀM QUÊN MẬT KHẨU
export const forgotPassword = async (email) => {
    try {
        // 1. Tìm profile theo email
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

// ========== RESTAURANT FUNCTIONS ==========

// HÀM LẤY DỮ LIỆU NHÀ HÀNG 
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
            return { success: false, error: error.message, data: [] };
        }

        console.log(`✅ Lấy được ${data?.length || 0} nhà hàng`);

        if (!data || data.length === 0) {
            console.log('⚠️ Không có nhà hàng nào');
            return { success: true, data: [] };
        }

        // Format dữ liệu để phù hợp với app
        const formattedData = data.map(restaurant => ({
            id: restaurant.id,
            name: restaurant.name,
            address: restaurant.address || 'Địa chỉ đang cập nhật',
            rating: restaurant.average_rating || 4.0,
            type: restaurant.cuisine_type || 'Nhà hàng',
            category: restaurant.cuisine_type || 'default',
            image_url: getRestaurantImage(restaurant.cuisine_type),
            latitude: restaurant.latitude,
            longitude: restaurant.longitude,
            price_range: restaurant.price_range,
            cuisine_type: restaurant.cuisine_type,
            average_rating: restaurant.average_rating,
            is_active: restaurant.is_active,
            environment_tags: restaurant.environment_tags,
            description: restaurant.description || `Nhà hàng ${restaurant.name} chuyên phục vụ các món ${restaurant.cuisine_type || 'đặc sản'}`,
            phone: restaurant.phone || '(028) 1234 5678',
            // Thêm open_time và close_time
            open_time: restaurant.open_time || '08:00',
            close_time: restaurant.close_time || '22:00',
            // Giữ openingHours cho tương thích ngược
            openingHours: formatOpeningHours(restaurant.open_time, restaurant.close_time) || '08:00 - 22:00',
            signatureDish: restaurant.signature_dish || getSignatureDish(restaurant.cuisine_type),
            popularItems: getPopularItemsFromTags(restaurant.popular_items, restaurant.cuisine_type),
            features: getFeatures(restaurant.environment_tags),
        }));

        return { success: true, data: formattedData };

    } catch (error) {
        console.error('❌ Lỗi trong getRestaurants:', error.message);
        return { success: false, error: error.message, data: [] };
    }
};

// HÀM LẤY CHI TIẾT NHÀ HÀNG THEO ID
export const getRestaurantById = async (restaurantId) => {
    try {
        console.log(`📡 Lấy chi tiết nhà hàng ID: ${restaurantId}`);

        const { data, error } = await supabase
            .from('restaurants')
            .select('*')
            .eq('id', restaurantId)
            .single();

        if (error) {
            console.error('❌ Lỗi khi lấy chi tiết nhà hàng:', error);
            return { success: false, error: error.message };
        }

        if (!data) {
            return { success: false, error: 'Không tìm thấy nhà hàng' };
        }

        // Format dữ liệu
        const formattedRestaurant = {
            id: data.id,
            name: data.name,
            address: data.address || 'Địa chỉ đang cập nhật',
            rating: data.average_rating || 4.0,
            type: data.cuisine_type || 'Nhà hàng',
            category: data.cuisine_type || 'default',
            image: getRestaurantImage(data.cuisine_type),
            image_url: getRestaurantImage(data.cuisine_type),
            description: data.description || `Nhà hàng ${data.name} chuyên phục vụ các món ${data.cuisine_type || 'đặc sản'}`,
            open_time: data.open_time || '08:00',
            close_time: data.close_time || '22:00',
            openingHours: formatOpeningHours(data.open_time, data.close_time) || '08:00 - 22:00',
            phone: data.phone || '(028) 1234 5678',
            signatureDish: data.signature_dish || getSignatureDish(data.cuisine_type),
            popularItems: getPopularItemsFromTags(data.popular_items, data.cuisine_type),
            features: getFeatures(data.environment_tags),
            price_range: data.price_range,
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
        return { success: false, error: error.message };
    }
};

// HÀM LẤY DỮ LIỆU MENU
export const getMenuItemsByRestaurant = async (restaurantId) => {
    try {
        console.log(`📡 Lấy menu cho nhà hàng ID: ${restaurantId}`);

        const { data, error } = await supabase
            .from('menus')
            .select('*')
            .eq('restaurant_id', restaurantId)
            .eq('is_available', true)
            .order('category')
            .order('food_name');

        if (error) {
            console.error('❌ Lỗi khi lấy menu:', error);
            return {
                success: false,
                error: error.message,
                data: []
            };
        }

        if (data && data.length > 0) {
            console.log(`✅ Lấy được ${data.length} món ăn từ Supabase`);

            const formattedMenu = data.map(item => ({
                id: item.id.toString(),
                name: item.food_name,
                price: item.price,
                category: item.category || 'Món chính',
                description: item.description || 'Món ngon của nhà hàng',
                image_url: getFoodImage(item.category, item.food_name),
                restaurant_id: item.restaurant_id,
                is_available: item.is_available,
                is_best_seller: item.is_best_seller || false,
                stock_count: item.stock_count || 0,
            }));

            return { success: true, data: formattedMenu };
        } else {
            console.log('⚠️ Nhà hàng này không có món ăn nào');
            return {
                success: true,
                data: []
            };
        }

    } catch (error) {
        console.error('❌ Lỗi trong getMenuItemsByRestaurant:', error.message);
        return {
            success: false,
            error: error.message,
            data: []
        };
    }
};

// Hàm lấy món bán chạy
export const getBestSellerItems = async (restaurantId) => {
    try {
        const { data, error } = await supabase
            .from('menus')
            .select('*')
            .eq('restaurant_id', restaurantId)
            .eq('is_available', true)
            .eq('is_best_seller', true)
            .order('food_name');

        if (error) {
            console.error('❌ Lỗi khi lấy món bán chạy:', error);
            return { success: false, error: error.message, data: [] };
        }

        if (data && data.length > 0) {
            const formattedItems = data.map(item => ({
                id: item.id.toString(),
                name: item.food_name,
                price: item.price,
                category: item.category,
                description: item.description,
                image_url: getFoodImage(item.category, item.food_name),
                is_best_seller: true,
                stock_count: item.stock_count || 0,
            }));

            return { success: true, data: formattedItems };
        }

        return { success: true, data: [] };

    } catch (error) {
        console.error('❌ Lỗi khi lấy món bán chạy:', error);
        return { success: false, error: error.message, data: [] };
    }
};

// HÀM LẤY ĐÁNH GIÁ CHO NHÀ HÀNG - DÙNG ĐÚNG TÊN BẢNG VÀ TRƯỜNG
export const getReviewsByRestaurant = async (restaurantId, limit = 10) => {
    try {
        console.log(`📡 Lấy đánh giá cho nhà hàng ID: ${restaurantId}`);

        // Truy vấn đúng bảng Reviews với join profiles
        const { data: rows, error } = await supabase
            .from('Reviews')
            .select(`
        *,
        profiles: id_customers (
          id,
          full_name,
          avatar_url
        )
      `)
            .eq('id_restaurants', restaurantId) // Đúng tên trường: id_restaurants
            // Nếu bảng Reviews không có trường `created_at`, sắp xếp theo `id` giảm dần
            .order('id', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('❌ Lỗi khi lấy reviews:', error);
            return { success: false, error: error.message, data: [] };
        }

        console.log(`✅ Lấy được ${rows?.length || 0} đánh giá từ bảng Reviews`);

        // Format dữ liệu - CHỈ dùng trường 'review'
        const formatted = (rows || []).map((r) => {
            return {
                id: r.id,
                rating: r.rating || 0, // Nếu có rating
                review: r.review || '', // CHỈ dùng trường 'review'
                restaurant_id: r.id_restaurants, // Dùng đúng tên trường
                id_customer: r.id_customers, // Dùng đúng tên trường
                images: r.images || [],
                customer: r.profiles || {
                    id: r.id_customers || null,
                    full_name: 'Người dùng',
                    avatar_url: null
                }
            };
        });

        return { success: true, data: formatted };

    } catch (error) {
        console.error('❌ Lỗi trong getReviewsByRestaurant:', error);
        return { success: false, error: error.message, data: [] };
    }
};

// HÀM LẤY DỮ LIỆU BÀN
export const getTablesByRestaurant = async (restaurantId) => {
    try {
        console.log(`📡 Lấy danh sách bàn cho nhà hàng ID: ${restaurantId}`);

        const { data, error } = await supabase
            .from('tables')
            .select('*')
            .eq('restaurant_id', restaurantId)
            .order('table_name');

        if (error) {
            console.error('❌ Lỗi khi lấy danh sách bàn:', error);
            return { success: false, error: error.message, data: [] };
        }

        console.log(`✅ Lấy được ${data?.length || 0} bàn từ Supabase`);

        if (!data || data.length === 0) {
            return { success: true, data: [] };
        }

        const formattedTables = data.map(table => ({
            id: table.id,
            name: table.table_name || `Bàn ${table.id}`,
            capacity: table.capacity || 2,
            status: table.status || 'available',
            restaurant_id: table.restaurant_id,
        }));

        return { success: true, data: formattedTables };

    } catch (error) {
        console.error('❌ Lỗi trong getTablesByRestaurant:', error.message);
        return { success: false, error: error.message, data: [] };
    }
};

// Cập nhật trạng thái bàn
export const updateTableStatus = async (tableId, status) => {
    try {
        const { data, error } = await supabase
            .from('tables')
            .update({ status: status })
            .eq('id', tableId)
            .select();

        if (error) throw error;

        return { success: true, data: data[0] };
    } catch (error) {
        console.error('❌ Lỗi khi cập nhật trạng thái bàn:', error);
        return { success: false, error: error.message };
    }
};

// Thêm booking vào lịch sử 
export const createBookingHistory = async (bookingData) => {
    try {
        const { data, error } = await supabase
            .from('bookings')
            .insert([
                {
                    table_id: bookingData.tableId,
                    restaurant_id: bookingData.restaurantId,
                    customer_name: bookingData.customerName,
                    customer_phone: bookingData.customerPhone,
                    start_time: bookingData.startTime,
                    end_time: bookingData.endTime,
                    number_of_people: bookingData.numberOfPeople,
                    status: bookingData.status || 'active',
                }
            ])
            .select();

        if (error) throw error;

        return { success: true, data: data[0] };
    } catch (error) {
        console.error('❌ Lỗi khi tạo booking:', error);
        return { success: false, error: error.message };
    }
};

// Lấy lịch sử booking theo bàn và thời gian
export const getBookingHistory = async (tableId, startDate, endDate) => {
    try {
        const { data, error } = await supabase
            .from('bookings')
            .select('*')
            .eq('table_id', tableId)
            .gte('start_time', startDate.toISOString())
            .lte('end_time', endDate.toISOString())
            .order('start_time', { ascending: false });

        if (error) throw error;

        return { success: true, data: data || [] };
    } catch (error) {
        console.error('❌ Lỗi khi lấy lịch sử booking:', error);
        return { success: false, error: error.message };
    }
};

// ========== REVIEW FUNCTIONS ==========

// Xóa review theo id - DÙNG ĐÚNG BẢNG Reviews
export const deleteReviewById = async (reviewId) => {
    if (!reviewId) return { success: false, error: 'Không có reviewId' };

    try {
        console.log(`🗑️ Đang xóa review ID: ${reviewId}`);

        const { data, error } = await supabase
            .from('Reviews') // Đúng tên bảng
            .delete()
            .eq('id', reviewId);

        if (error) {
            console.error('❌ Lỗi xóa review:', error);
            return { success: false, error: error.message };
        }

        console.log('✅ Đã xóa review thành công');
        return { success: true, data };

    } catch (error) {
        console.error('❌ Lỗi trong deleteReviewById:', error);
        return { success: false, error: error.message };
    }
};

// Tạo hoặc cập nhật review (CHỈ DÙNG TRƯỜNG 'review')
// Tạo hoặc cập nhật review - DÙNG ĐÚNG BẢNG VÀ TRƯỜNG
export const upsertReview = async (reviewData) => {
    try {
        if (!reviewData) {
            return { success: false, error: 'Không có dữ liệu review' };
        }

        console.log('📝 Đang gửi review:', reviewData);

        // Chuẩn bị payload - DÙNG ĐÚNG TÊN TRƯỜNG CỦA BẢNG Reviews
        // Không gửi created_at/updated_at từ client — để DB quản lý nếu cần
        const payload = {
            review: reviewData.review || '', // Đúng tên trường
            id_restaurants: reviewData.restaurant_id || null, // Đúng tên trường
            id_customers: reviewData.id_customer || null, // Đúng tên trường
        };

        let result;

        if (reviewData.id) {
            // Update existing review
            console.log(`🔄 Đang cập nhật review trong bảng Reviews`);
            result = await supabase
                .from('Reviews') // Đúng tên bảng
                .update(payload)
                .eq('id', reviewData.id)
                .select();
        } else {
            // Insert new review
            console.log(`➕ Đang thêm review mới vào bảng Reviews`);
            result = await supabase
                .from('Reviews') // Đúng tên bảng
                .insert([payload])
                .select();
        }

        const { data, error } = result;

        if (error) {
            console.error('❌ Lỗi upsert review:', error);
            return { success: false, error: error.message };
        }

        console.log(`✅ Review đã được lưu thành công vào bảng Reviews`);
        return { success: true, data: Array.isArray(data) ? data[0] : data };

    } catch (error) {
        console.error('❌ Lỗi trong upsertReview:', error);
        return { success: false, error: error.message };
    }
};

// ========== HELPER FUNCTIONS ==========

// Hàm helper mới để format giờ mở cửa
const formatOpeningHours = (openTime, closeTime) => {
    if (openTime && closeTime) {
        // Format giờ từ HH:mm sang HH:mm
        const formatTime = (timeStr) => {
            if (!timeStr) return '';
            // Nếu timeStr đã ở dạng HH:mm thì giữ nguyên
            if (timeStr.match(/^\d{1,2}:\d{2}$/)) {
                const [hours, minutes] = timeStr.split(':');
                return `${hours.padStart(2, '0')}:${minutes}`;
            }
            return timeStr;
        };

        return `${formatTime(openTime)} - ${formatTime(closeTime)}`;
    }
    return null;
};

// Lấy ảnh nhà hàng theo loại ẩm thực
const getRestaurantImage = (cuisineType) => {
    const images = {
        'Việt Nam': 'https://images.unsplash.com/photo-1559925393-8be0ec4767c8?w=400',
        'Hải sản': 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400',
        'Lẩu': 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=400',
        'BBQ': 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400',
        'Ý': 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400',
        'Nhật': 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=400',
        'Hàn Quốc': 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400',
    };
    return images[cuisineType] || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400';
};

// Lấy món đặc trưng
const getSignatureDish = (cuisineType) => {
    const dishes = {
        'Việt Nam': 'Phở Bò',
        'Hải sản': 'Tôm Hùm Alaska',
        'Lẩu': 'Lẩu Thái Chua Cay',
        'BBQ': 'Thịt Nướng Hàn Quốc',
        'Ý': 'Pizza Ý',
        'Nhật': 'Sushi Tổng Hợp',
        'Hàn Quốc': 'Kimchi',
    };
    return dishes[cuisineType] || 'Món đặc biệt của nhà hàng';
};

// Lấy món phổ biến từ tags hoặc theo loại ẩm thực
const getPopularItemsFromTags = (popularItems, cuisineType) => {
    // Nếu có dữ liệu từ database
    if (popularItems && typeof popularItems === 'string') {
        return popularItems.split(',').map(item => item.trim());
    }

    // Fallback theo loại ẩm thực
    const items = {
        'Việt Nam': ['Phở Bò', 'Bún Chả', 'Gỏi Cuốn', 'Cơm Tấm'],
        'Hải sản': ['Tôm Hùm', 'Cua Hoàng Đế', 'Hàu Nướng', 'Sashimi'],
        'Lẩu': ['Lẩu Thái', 'Lẩu Bò', 'Lẩu Hải Sản', 'Lẩu Gà'],
        'BBQ': ['Ba chỉ nướng', 'Sườn nướng', 'Gà nướng', 'Hải sản nướng'],
    };
    return items[cuisineType] || ['Món đặc biệt'];
};

// Lấy các tính năng từ environment tags
const getFeatures = (environmentTags) => {
    if (!environmentTags || typeof environmentTags !== 'string') {
        return ['WiFi miễn phí', 'Đỗ xe', 'Điều hòa'];
    }

    const tagMap = {
        'view': 'View đẹp',
        'romantic': 'Không gian lãng mạn',
        'family': 'Phù hợp gia đình',
        'parking': 'Có chỗ đỗ xe',
        'wifi': 'WiFi miễn phí',
        'ac': 'Điều hòa',
        'outdoor': 'Không gian ngoài trời',
        'private': 'Phòng riêng',
    };

    const tags = environmentTags.split(',').map(tag => tag.trim());
    return tags.map(tag => tagMap[tag] || tag).slice(0, 5); // Giới hạn 5 tính năng
};

// Lấy ảnh món ăn
const getFoodImage = (category, foodName) => {
    const imageMap = {
        'Phở': 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=300',
        'Bún': 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=300',
        'Cơm': 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300',
        'Gỏi': 'https://images.unsplash.com/photo-1552465011-b4e30bf7349d?w=300',
        'Tôm': 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=300',
        'Cua': 'https://images.unsplash.com/photo-1565299584963-27c957a5129a?w=300',
        'Cá': 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=300',
        'Hàu': 'https://images.unsplash.com/photo-1598511757320-6d7f46f0df2e?w=300',
        'Lẩu': 'https://images.unsplash.com/photo-1578894381167-8c27a5d3c7c6?w=300',
        'Nướng': 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=300',
        'BBQ': 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=300',
        'Trà': 'https://images.unsplash.com/photo-1561047029-3000c68339ca?w=300',
        'Cà phê': 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=300',
        'Nước ép': 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=300',
        'Chè': 'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=300',
        'Bánh': 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=300',
        'Kem': 'https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?w=300',
    };

    // Kiểm tra theo tên món
    if (foodName) {
        for (const [keyword, imageUrl] of Object.entries(imageMap)) {
            if (foodName.toLowerCase().includes(keyword.toLowerCase())) {
                return imageUrl;
            }
        }
    }

    // Kiểm tra theo category
    const categoryImages = {
        'Khai vị': 'https://images.unsplash.com/photo-1552465011-b4e30bf7349d?w=300',
        'Món chính': 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=300',
        'Hải sản': 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=300',
        'Thịt': 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=300',
        'Rau': 'https://images.unsplash.com/photo-1546069901-d5bfd2cbfb1f?w=300',
        'Đồ uống': 'https://images.unsplash.com/photo-1561047029-3000c68339ca?w=300',
        'Tráng miệng': 'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=300',
    };

    return categoryImages[category] || getDefaultFoodImage();
};

// Hàm lấy ảnh món ăn mặc định
const getDefaultFoodImage = () => {
    const images = [
        'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=300',
        'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=300',
        'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=300',
        'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=300',
    ];
    return images[Math.floor(Math.random() * images.length)];
};

// ========== SPATIAL / LOCATION HELPERS ==========

// Lấy danh sách SRID từ bảng spatial_ref_sys
export const getAllSRIDs = async () => {
    try {
        const { data, error } = await supabase
            .from('spatial_ref_sys')
            .select('srid, auth_name, auth_srid, srtext, proj4text')
            .order('srid');

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('❌ Lỗi khi lấy SRID:', error);
        return { success: false, error: error.message };
    }
};

// Lấy thông tin SRID theo giá trị srid
export const getSRIDBySrid = async (srid) => {
    try {
        const { data, error } = await supabase
            .from('spatial_ref_sys')
            .select('*')
            .eq('srid', srid)
            .single();

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('❌ Lỗi khi lấy SRID theo srid:', error);
        return { success: false, error: error.message };
    }
};

// Haversine - tính khoảng cách (km)
const toRad = (deg) => (deg * Math.PI) / 180;
export const computeDistanceKm = (lat1, lon1, lat2, lon2) => {
    if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
    const R = 6371; // bán kính Trái Đất (km)
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

// Lấy nhà hàng kèm khoảng cách từ tọa độ origin, có lọc radiusKm và giới hạn
export const getRestaurantsWithDistance = async (originLat, originLon, options = {}) => {
    try {
        const { radiusKm = null, limit = 20 } = options || {};
        const res = await getRestaurants();
        if (!res.success) return res;

        let data = res.data.map(r => {
            const distance = (r.latitude != null && r.longitude != null) ? computeDistanceKm(originLat, originLon, r.latitude, r.longitude) : null;
            return { ...r, distanceKm: distance };
        });

        if (radiusKm != null) {
            data = data.filter(r => r.distanceKm != null && r.distanceKm <= radiusKm);
        }

        data.sort((a, b) => {
            if (a.distanceKm == null) return 1;
            if (b.distanceKm == null) return -1;
            return a.distanceKm - b.distanceKm;
        });

        if (limit) data = data.slice(0, limit);

        return { success: true, data };
    } catch (error) {
        console.error('❌ Lỗi khi lấy nhà hàng với khoảng cách:', error);
        return { success: false, error: error.message, data: [] };
    }
};

// Tạo URL chỉ đường (Google Maps) — dùng Linking.openURL trên RN
export const getNavigationUrl = (originLat, originLon, destLat, destLon, mode = 'driving') => {
    if (destLat == null || destLon == null) return null;
    const destination = encodeURIComponent(`${destLat},${destLon}`);
    if (originLat == null || originLon == null) {
        return `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=${mode}`;
    }
    const origin = encodeURIComponent(`${originLat},${originLon}`);
    return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=${mode}`;
};

// Export all functions
export default {
    supabase,
    testConnection,

    // Auth functions
    registerUser,
    loginUser,
    updateUserProfile,
    getUserProfile,
    checkEmailExists,
    checkPhoneExists,
    changePassword,
    forgotPassword,

    // Restaurant functions
    getRestaurants,
    getRestaurantById,
    getMenuItemsByRestaurant,
    getBestSellerItems,
    getTablesByRestaurant,
    updateTableStatus,
    createBookingHistory,
    getBookingHistory,

    // Review functions
    getReviewsByRestaurant,
    deleteReviewById,
    upsertReview,

    // Location functions
    getAllSRIDs,
    getSRIDBySrid,
    computeDistanceKm,
    getRestaurantsWithDistance,
    getNavigationUrl,
};
// ========== BOOKING FUNCTIONS ==========
// HÀM TẠO BOOKING MỚI
export const createBooking = async (bookingData) => {
    try {
        console.log('📝 Đang tạo booking mới:', bookingData);

        // Debug: Log what we're receiving
        console.log('🔍 Debug bookingData.restaurant_id:', bookingData.restaurant_id);
        console.log('🔍 Debug bookingData.restaurantId:', bookingData.restaurantId);

        const insertData = {
            restaurant_id: bookingData.restaurant_id, // Use snake_case directly
            user_id: bookingData.user_id || bookingData.userId,
            customer_name: bookingData.customer_name || bookingData.customerName,
            booking_time: bookingData.booking_time || bookingData.bookingTime,
            phone: bookingData.phone,
            people_count: bookingData.people_count || bookingData.peopleCount,
            table_id: bookingData.table_id || bookingData.tableId,
            status: bookingData.status || 'confirmed',
        };

        console.log('📤 Dữ liệu sẽ insert vào bookings:', insertData);

        const { data, error } = await supabase
            .from('bookings')
            .insert([insertData])
            .select()
            .single();

        if (error) {
            console.error('❌ Lỗi từ Supabase khi tạo booking:', error);
            throw error;
        }

        console.log('✅ Tạo booking thành công:', data);
        return { success: true, data };
    } catch (error) {
        console.error('❌ Lỗi khi tạo booking:', error);
        return { success: false, error: error.message };
    }
};

// HÀM CẬP NHẬT BOOKING
export const updateBooking = async (bookingId, updates) => {
    try {
        const { data, error } = await supabase
            .from('bookings')
            .update({
                ...updates,
                updated_at: new Date().toISOString()
            })
            .eq('id', bookingId)
            .select()
            .single();

        if (error) throw error;

        return { success: true, data };
    } catch (error) {
        console.error('❌ Lỗi khi cập nhật booking:', error);
        return { success: false, error: error.message };
    }
};

// HÀM LẤY BOOKING CỦA USER
export const getUserBookings = async (userId) => {
    try {
        const { data, error } = await supabase
            .from('bookings')
            .select(`
        *,
        restaurants:restaurant_id (id, name, cuisine_type, address)
      `)
            .eq('user_id', userId)
            .order('booking_time', { ascending: false });

        if (error) throw error;

        return { success: true, data };
    } catch (error) {
        console.error('❌ Lỗi khi lấy danh sách booking của user:', error);
        return { success: false, error: error.message };
    }
};

// HÀM LẤY BOOKING THEO ID
export const getBookingById = async (bookingId) => {
    try {
        const { data, error } = await supabase
            .from('booking')
            .select(`
        *,
        restaurants:restaurant_id (id, name, cuisine_type, address),
        tables:table_id (id, table_name, capacity)
      `)
            .eq('id', bookingId)
            .single();

        if (error) throw error;

        return { success: true, data };
    } catch (error) {
        console.error('❌ Lỗi khi lấy booking theo ID:', error);
        return { success: false, error: error.message };
    }
};

// HÀM LẤY BOOKING ĐANG HOẠT ĐỘNG CỦA USER
export const getActiveUserBooking = async (userId, restaurantId = null) => {
    try {
        let query = supabase
            .from('booking')
            .select(`
        *,
        restaurants:restaurant_id (id, name, cuisine_type, address),
        tables:table_id (id, table_name, capacity)
      `)
            .eq('user_id', userId)
            .eq('status', 'confirmed');

        if (restaurantId) {
            query = query.eq('restaurant_id', restaurantId);
        }

        const { data, error } = await query.order('booking_time', { ascending: false });

        if (error) throw error;

        // Trả về booking gần nhất nếu có
        const activeBooking = data && data.length > 0 ? data[0] : null;

        return { success: true, data: activeBooking };
    } catch (error) {
        console.error('❌ Lỗi khi lấy booking active của user:', error);
        return { success: false, error: error.message };
    }
};

// HÀM KIỂM TRA BÀN CÓ TRỐNG KHÔNG
export const checkTableAvailability = async (tableId, bookingTime) => {
    try {
        // Chuyển đổi bookingTime sang Date object nếu cần
        const bookingDate = new Date(bookingTime);
        const startOfDay = new Date(bookingDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(bookingDate);
        endOfDay.setHours(23, 59, 59, 999);

        const { data, error } = await supabase
            .from('bookings')
            .select('*')
            .eq('table_id', tableId)
            .eq('status', 'confirmed')
            .gte('booking_time', startOfDay.toISOString())
            .lte('booking_time', endOfDay.toISOString());

        if (error) throw error;

        // Kiểm tra xem có booking nào trùng thời gian không
        // (Có thể cần logic phức tạp hơn dựa trên thời gian kết thúc booking)
        const isAvailable = data.length === 0;

        return {
            success: true,
            data: {
                isAvailable,
                conflictingBookings: data
            }
        };
    } catch (error) {
        console.error('❌ Lỗi khi kiểm tra trạng thái bàn:', error);
        return { success: false, error: error.message };
    }
};