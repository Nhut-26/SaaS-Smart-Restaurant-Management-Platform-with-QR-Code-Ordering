###API menu
### Tạo món ăn
- Method: POST
- URL: /api/menu
- Input:
  - name
  - price
  - category_id
  - description
  - image_url
- Output:
  - menu_id
  - status

### Lấy danh sách menu
- Method: GET
- URL: /api/menu
- Mô tả:
  - Dùng cho QR Menu
  - Khách xem không cần đăng nhập

### Cập nhật món
- Method: PUT
- URL: /api/menu/{id}

### Xóa món
- Method: DELETE
- URL: /api/menu/{id}

###API table
### Tạo bàn
- Method: POST
- URL: /api/table
- Input:
  - table_number
  - capacity

### Danh sách bàn
- Method: GET
- URL: /api/table

### Trạng thái bàn
- Method: PUT
- URL: /api/table/{id}/status
- Trạng thái:
  - empty
  - occupied

###API QR 
### Tạo QR cho bàn
- Method: POST
- URL: /api/qr
- Input:
  - table_id
- Output:
  - qr_url

### Quét QR
- Method: GET
- URL: /qr/{code}
- Kết quả:
  - Hiển thị menu theo nhà hàng

## Luồng nghiệp vụ QR Menu
1. Nhân viên tạo bàn
2. Hệ thống tạo QR cho bàn
3. Khách quét QR
4. Hệ thống xác định:
   - Nhà hàng
   - Bàn
5. Trả về danh sách menu
