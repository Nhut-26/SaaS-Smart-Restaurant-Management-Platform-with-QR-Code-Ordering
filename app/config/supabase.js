import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

const supabaseUrl = 'https://vhjxxgajenkzuykkqloi.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZoanh4Z2FqZW5renV5a2txbG9pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0OTgyMjIsImV4cCI6MjA4MzA3NDIyMn0.l04T4IY-2mdFTvVhksDBmL5buErB1Pfa97GQOgRVtCg';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

//HÀM KIỂM TRA KẾT NỐI
export const testConnection = async () => {
  try {
    const { data, error } = await supabase.from('restaurants').select('count');
    if (error) throw error;
    console.log('✅ Supabase connected successfully');
    return true;
  } catch (error) {
    console.error('❌ Supabase connection failed:', error);
    return false;
  }
};

//HÀM LẤY DỮ LIỆU NHÀ HÀNG 
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

      phone: '(028) 1234 5678',
      openingHours: '08:00 - 22:00',
      description: restaurant.description || `Nhà hàng ${restaurant.name} chuyên phục vụ các món ${restaurant.cuisine_type || 'đặc sản'}`,
      signatureDish: getSignatureDish(restaurant.cuisine_type),
      popularItems: getPopularItems(restaurant.cuisine_type),
      features: getFeatures(restaurant.environment_tags),
    }));

    return { success: true, data: formattedData };
    
  } catch (error) {
    console.error('❌ Lỗi trong getRestaurants:', error.message);
    return { success: false, error: error.message, data: [] };
  }
};

// Lấy chi tiết một nhà hàng
export const getRestaurantById = async (restaurantId) => {
  try {
    console.log(`📡 Lấy chi tiết nhà hàng ID: ${restaurantId}`);
    
    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .eq('id', restaurantId)
      .single();

    if (error) throw error;

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
      openingHours: '08:00 - 22:00',
      phone: '(028) 1234 5678',
      signatureDish: getSignatureDish(data.cuisine_type),
      popularItems: getPopularItems(data.cuisine_type),
      features: getFeatures(data.environment_tags),
    };

    return { success: true, data: formattedRestaurant };
    
  } catch (error) {
    console.error('❌ Lỗi trong getRestaurantById:', error.message);
    return { success: false, error: error.message };
  }
};

//HÀM LẤY DỮ LIỆU MENU
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
        data: getMockMenuByCategory('default')
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
      console.log('⚠️ Không có món ăn nào, dùng mock data');
      return { 
        success: true, 
        data: getMockMenuByCategory('default') 
      };
    }
    
  } catch (error) {
    console.error('❌ Lỗi trong getMenuItemsByRestaurant:', error.message);
    return { 
      success: false, 
      error: error.message,
      data: getMockMenuByCategory('default')
    };
  }
};

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
      return { success: false, error: error.message };
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
    return { success: false, error: error.message };
  }
};

//HÀM HELPER
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

const getPopularItems = (cuisineType) => {
  const items = {
    'Việt Nam': ['Phở Bò', 'Bún Chả', 'Gỏi Cuốn', 'Cơm Tấm'],
    'Hải sản': ['Tôm Hùm', 'Cua Hoàng Đế', 'Hàu Nướng', 'Sashimi'],
    'Lẩu': ['Lẩu Thái', 'Lẩu Bò', 'Lẩu Hải Sản', 'Lẩu Gà'],
    'BBQ': ['Ba chỉ nướng', 'Sườn nướng', 'Gà nướng', 'Hải sản nướng'],
  };
  return items[cuisineType] || ['Món đặc biệt 1', 'Món đặc biệt 2', 'Món đặc biệt 3'];
};

const getFeatures = (environmentTags) => {
  if (!environmentTags) return ['WiFi miễn phí', 'Đỗ xe', 'Điều hòa'];
  
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
  return tags.map(tag => tagMap[tag] || tag);
};

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
  for (const [keyword, imageUrl] of Object.entries(imageMap)) {
    if (foodName.toLowerCase().includes(keyword.toLowerCase())) {
      return imageUrl;
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

// Mock menu data (fallback)
const getMockMenuByCategory = (category) => {
  const mockMenus = {
    seafood: [
      { id: 's1', name: 'Tôm Hùm Alaska', price: 850000, category: 'Hải sản', description: 'Tôm hùm Alaska tươi sống', image_url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=300', is_best_seller: true, stock_count: 5 },
      { id: 's2', name: 'Sushi Tổng Hợp', price: 350000, category: 'Nhật Bản', description: '12 miếng sushi đa dạng', image_url: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=300', is_best_seller: true, stock_count: 10 },
      { id: 's3', name: 'Hàu Phô Mai', price: 180000, category: 'Hải sản nướng', description: 'Hàu tươi nướng phô mai', image_url: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=300', stock_count: 15 },
    ],
    vietnamese: [
      { id: 'v1', name: 'Phở Bò', price: 65000, category: 'Món chính', description: 'Phở bò truyền thống', image_url: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=300', is_best_seller: true, stock_count: 20 },
      { id: 'v2', name: 'Bún Chả', price: 55000, category: 'Món chính', description: 'Bún chả Hà Nội', image_url: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=300', stock_count: 15 },
      { id: 'v3', name: 'Gỏi Cuốn', price: 35000, category: 'Khai vị', description: 'Gỏi cuốn tôm thịt', image_url: 'https://images.unsplash.com/photo-1552465011-b4e30bf7349d?w=300', stock_count: 30 },
      { id: 'v4', name: 'Bánh Xèo', price: 45000, category: 'Món chính', description: 'Bánh xèo miền Trung', image_url: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=300', is_best_seller: true, stock_count: 8 },
    ],
    hotpot: [
      { id: 'h1', name: 'Lẩu Thái Chua Cay', price: 250000, category: 'Lẩu', description: 'Lẩu Thái chua cay đặc trưng', image_url: 'https://images.unsplash.com/photo-1578894381167-8c27a5d3c7c6?w=300', is_best_seller: true, stock_count: 12 },
      { id: 'h2', name: 'Lẩu Bò', price: 220000, category: 'Lẩu', description: 'Lẩu bò tái', image_url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=300', stock_count: 10 },
      { id: 'h3', name: 'Bò Tái', price: 120000, category: 'Thịt', description: 'Bò tái nhúng lẩu', image_url: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=300', stock_count: 25 },
    ],
    default: [
      { id: '1', name: 'Phở Bò', price: 65000, category: 'Món chính', description: 'Phở bò truyền thống', image_url: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=300', is_best_seller: true, stock_count: 20 },
      { id: '2', name: 'Bún Chả', price: 55000, category: 'Món chính', description: 'Bún chả Hà Nội', image_url: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=300', stock_count: 15 },
      { id: '3', name: 'Gỏi Cuốn', price: 35000, category: 'Khai vị', description: 'Gỏi cuốn tôm thịt', image_url: 'https://images.unsplash.com/photo-1552465011-b4e30bf7349d?w=300', stock_count: 30 },
      { id: '4', name: 'Cơm Tấm', price: 50000, category: 'Món chính', description: 'Cơm tấm Sài Gòn', image_url: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=300', stock_count: 40 },
      { id: '5', name: 'Chả Giò', price: 40000, category: 'Khai vị', description: 'Chả giò truyền thống', image_url: 'https://images.unsplash.com/photo-1552465011-b4e30bf7349d?w=300', stock_count: 25 },
    ]
  };
  
  return mockMenus[category] || mockMenus.default;
};
//HÀM LẤY DỮ LIỆU BÀN
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
      return { success: false, error: error.message };
    }

    console.log(`✅ Lấy được ${data?.length || 0} bàn từ Supabase`);

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
    return { success: false, error: error.message };
  }
};
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
