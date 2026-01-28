class RecommendationEngine:
    def __init__(self, supabase_client):
        self.supabase = supabase_client

    async def search_food(self, keyword, user_lat, user_lng):
        try:
            # Clean keyword
            keyword = keyword.replace('"', '').strip()
            print(f"🔎 Engine Running: '{keyword}'")
            
            # CHIẾN THUẬT 1: TÌM THEO TÊN QUÁN (ƯU TIÊN TUYỆT ĐỐI)
            # Tìm gần đúng (ilike) trong bảng restaurants
            response_name = self.supabase.table("restaurants")\
                .select("*")\
                .ilike("name", f"%{keyword}%")\
                .execute()
            
            if response_name.data and len(response_name.data) > 0:
                print(f"✅ Tìm thấy {len(response_name.data)} quán theo tên.")
                return response_name.data

            # CHIẾN THUẬT 2: TÌM THEO MÓN ĂN (MENU)
            # Nếu không tìm thấy tên quán, mới tìm món ăn
            food_res = self.supabase.table("menu_items")\
                .select("restaurant_id, name")\
                .ilike("name", f"%{keyword}%")\
                .execute()
                
            if not food_res.data:
                return []

            # Lấy danh sách ID quán từ món ăn tìm được
            rest_ids = list(set([item['restaurant_id'] for item in food_res.data]))
            
            if rest_ids:
                # Fetch thông tin các quán đó
                restaurants = self.supabase.table("restaurants")\
                    .select("*")\
                    .in_("id", rest_ids)\
                    .execute()
                return restaurants.data
                
            return []

        except Exception as e:
            print(f"❌ Search Engine Error: {e}")
            return []