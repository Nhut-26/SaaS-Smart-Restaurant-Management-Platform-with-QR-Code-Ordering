class RecommendationEngine:
    def __init__(self, supabase_client):
        self.supabase = supabase_client

    async def search_food(self, keyword, user_lat, user_lng, weather_context=None):
        # Clean keyword
        keyword = keyword.replace('"', '').strip()
        print(f"🔎 Engine Running: Tìm món '{keyword}'")

        # --- CHIẾN THUẬT: TÌM TRỰC TIẾP TRONG MENU (ƯU TIÊN) ---
        # 1. Tìm các món ăn có tên khớp từ khóa
        menu_res = self.supabase.table("menus")\
            .select("*")\
            .ilike("food_name", f"%{keyword}%")\
            .limit(10)\
            .execute()

        # 2. Nếu tìm thấy món ăn -> Gộp thông tin quán vào
        if menu_res.data:
            dishes = menu_res.data
            # Lấy danh sách ID quán từ các món tìm được
            rest_ids = list(set([d['restaurant_id'] for d in dishes]))
            
            # Lấy thông tin các quán đó (Tên, địa chỉ, ảnh quán để fallback)
            if rest_ids:
                rests_res = self.supabase.table("restaurants")\
                    .select("id, name, address, image_url")\
                    .in_("id", rest_ids)\
                    .execute()
                
                # Tạo map để tra cứu nhanh: {rest_id: rest_data}
                rest_map = {r['id']: r for r in rests_res.data}

                # 3. TẠO DANH SÁCH KẾT QUẢ "MÓN ĂN + QUÁN"
                final_results = []
                for dish in dishes:
                    rest_info = rest_map.get(dish['restaurant_id'])
                    if rest_info:
                        final_results.append({
                            # Thông tin hiển thị chính (Món ăn)
                            "id": rest_info['id'], # Vẫn giữ ID quán để click vào đặt bàn
                            "name": dish['food_name'],   # Tên hiển thị là Tên Món
                            "price_range": f"{int(dish.get('price', 0)):,}đ", # Giá món
                            
                            # Xử lý ảnh: Ưu tiên ảnh món, nếu không có thì lấy ảnh quán
                            "image_url": dish.get('image') ,
                            
                            # Thông tin phụ (Của quán nào)
                            "restaurant_name": rest_info['name'],
                            "address": rest_info['address'],
                            "is_dish": True, # Cờ đánh dấu đây là kết quả tìm món
                            
                            # Khoảng cách (tạm tính giả lập hoặc lấy từ DB nếu có)
                            "dist_km": 0.0 
                        })
                
                print(f"✅ Tìm thấy {len(final_results)} món ăn khớp lệnh.")
                return final_results
        else:
            # --- FALLBACK: NẾU KHÔNG TÌM THẤY MÓN, TÌM TÊN QUÁN ---
            print("⚠️ Không tìm thấy menu, chuyển sang tìm tên quán.")
            response_name = self.supabase.table("restaurants")\
                .select("*")\
                .ilike("name", f"%{keyword}%")\
                .execute()
            
            if response_name.data:
                return response_name.data

            return []
    # --- THÊM HÀM NÀY VÀO DƯỚI search_food ---
    async def search_restaurants(self, keyword, user_lat, user_lng):
        keyword = str(keyword).replace('"', '').strip().lower()
        print(f"🔎 Engine Running: Tìm QUÁN với từ khóa '{keyword}'")

        # 1. Danh sách từ khóa chung chung -> Trả về tất cả quán (hoặc quán rating cao)
        generic_keywords = ["ngon", "hot", "xịn", "đẹp", "gợi ý", "review", "bestseller"]
        
        is_generic = any(k in keyword for k in generic_keywords) or len(keyword) < 2
        
        query = self.supabase.table("restaurants").select("*")
        
        # 2. Nếu không phải từ khóa chung chung thì mới lọc theo tên
        if not is_generic:
            query = query.ilike("name", f"%{keyword}%")
            
        response = query.limit(10).execute()
        
        results = []
        if response.data:
            for item in response.data:
                # Xử lý ảnh và khoảng cách giả lập
                item["image_url"] = item.get("image_url")
                item["dist_km"] = 1.5 # Bạn có thể thêm logic tính khoảng cách thật ở đây
                item["is_dish"] = False # Đánh dấu là QUÁN
                results.append(item)
                
        return results