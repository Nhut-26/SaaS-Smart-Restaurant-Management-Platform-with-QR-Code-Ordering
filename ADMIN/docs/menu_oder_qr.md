# Phân tích nghiệp vụ S2O – Menu, Order, QR
Hệ thống S2O (Scan to Order) cho phép khách hàng tại nhà hàng
quét mã QR trên bàn để xem menu, chọn món và đặt món
mà không cần đăng nhập.

Hệ thống hỗ trợ nhiều nhà hàng (multi-tenant).
Mỗi nhà hàng có menu, bàn, QR riêng.

## Các loại người dùng
1. Guest (khách hàng)
- Không đăng nhập
- Quét QR
- Xem menu
- Tạo order
- Thanh toán

2. Nhà hàng / Bếp
- Nhận order từ khách
- Xem trạng thái order
- Cập nhật trạng thái món

3. Admin
- Quản lý menu
- Quản lý bàn
- Xem doanh thu

## Luồng quét QR
1. QR được dán trên bàn ăn
2. Mỗi QR chứa một token
3. Khi guest quét QR:
   - Hệ thống xác định được:
     + Nhà hàng (tenant)
     + Bàn (table)
4. Guest được chuyển tới trang menu của nhà hàng

## Luồng xem menu
1. Guest truy cập menu thông qua QR
2. Backend trả về danh sách món ăn:
   - Tên món
   - Giá
   - Trạng thái còn/hết
   - Hình ảnh
3. Menu chỉ hiển thị món đang available

## Luồng tạo order
1. Guest chọn món và số lượng
2. Guest gửi yêu cầu tạo order
3. Backend tạo:
   - Order
   - Order items (từng món)
4. Giá món được lưu tại thời điểm order
5. Order gắn với:
   - Bàn
   - Nhà hàng

## Luồng bếp nhận order
1. Khi order được tạo:
   - Hệ thống gửi thông báo real-time
2. Bếp thấy order mới ngay lập tức
3. Trạng thái order thay đổi:
   pending → cooking → done

## Luồng thanh toán
1. Guest yêu cầu thanh toán
2. Backend xác nhận order
3. Order chuyển sang trạng thái paid
4. Doanh thu được ghi nhận

## Giả định
- Guest không cần tài khoản
- QR xác định duy nhất bàn
- Một order thuộc về một bàn
- Một order có nhiều món
- Giá món không thay đổi sau khi order

## Use Case chính của hệ thống
### Actor: Guest
- UC01: Quét QR
- UC02: Xem menu
- UC03: Thêm món vào order
- UC04: Tạo order
- UC05: Thanh toán

### Actor: Nhà hàng / Bếp
- UC06: Nhận order mới
- UC07: Cập nhật trạng thái order

### Actor: Admin
- UC08: Quản lý menu
- UC09: Quản lý bàn
- UC10: Xem doanh thu

### UC04 – Tạo Order
**Actor:** Guest

**Mô tả:**
Guest chọn món từ menu và gửi yêu cầu đặt món.

**Điều kiện tiên quyết:**
- Guest đã quét QR
- QR hợp lệ
- Menu đang available

**Luồng chính:**
1. Guest chọn món và số lượng
2. Guest gửi yêu cầu tạo order
3. Backend kiểm tra món còn bán
4. Backend tạo order
5. Backend tạo order item
6. Backend trả về thông tin order

**Luồng thay thế:**
- 3a. Món hết hàng → trả lỗi

## Trạng thái Order
### Danh sách trạng thái
- NEW: Order vừa được tạo
- CONFIRMED: Bếp xác nhận
- COOKING: Đang chế biến
- READY: Món đã xong
- SERVED: Đã phục vụ khách
- PAID: Đã thanh toán
- CANCELED: Đã hủy

### Luồng chuyển trạng thái Order
NEW → CONFIRMED → COOKING → READY → SERVED → PAID
NEW → CANCELED
CONFIRMED → CANCELED

## Nghiệp vụ QR và Bàn
- Mỗi bàn có đúng 1 QR
- Mỗi QR thuộc về 1 nhà hàng
- QR chứa thông tin:
  - restaurant_id
  - table_id
- Guest không cần đăng nhập
- Guest chỉ được order trong nhà hàng tương ứng QR

## Business Rules
- BR01: Chỉ order món có status = AVAILABLE
- BR02: Không cho chỉnh order khi đã CONFIRMED
- BR03: Mỗi order phải gắn với 1 bàn
- BR04: Tổng tiền = tổng (giá * số lượng)
- BR05: Guest không cần tài khoản

## Các trường hợp đặc biệt
- QR hết hạn
- Bàn đã bị khóa
- Món bị xóa khi đang order
- Mất kết nối khi gửi order

## Tổng kết cho thiết kế hệ thống
Tài liệu này được sử dụng để:
- Vẽ Use Case Diagram
- Thiết kế ERD Menu – Order
- Xây dựng API Backend
- Phát triển UI QR Menu

## Quan hệ giữa các bảng (ERD)
- restaurant 1–N category
- restaurant 1–N menu_item
- category 1–N menu_item
- restaurant 1–N table
- table 1–1 qr_code
- table 1–N order
- order 1–N order_item
- menu_item 1–N order_item
- order 1–1 payment
