## Phạm vi thiết kế CSDL
Backend Dev 2 chịu trách nhiệm thiết kế các bảng:
- Category
- MenuItem
- Table
- QRCode
- Order
- OrderItem
- Payment

## Danh sách bảng dữ liệu
1. category
2. menu_item
3. table
4. qr_code
5. order
6. order_item
7. payment

## Bảng category
Chức năng:
- Phân loại món ăn (Khai vị, Món chính, Nước uống)

Quan hệ:
- 1 category có nhiều menu_item
- Thuộc về 1 restaurant

## Bảng menu_item
Chức năng:
- Lưu thông tin món ăn

Quan hệ:
- Thuộc 1 category
- Thuộc 1 restaurant
- Có thể xuất hiện trong nhiều order_item

## Bảng table

Chức năng:
- Quản lý bàn trong nhà hàng

Quan hệ:
- Thuộc 1 restaurant
- Mỗi bàn có 1 QR
- Mỗi bàn có nhiều order

## Bảng qr_code
Chức năng:
- Lưu thông tin QR để guest quét

Quan hệ:
- Gắn với 1 table
- Gắn với 1 restaurant

## Bảng order
Chức năng:
- Lưu đơn hàng của khách

Quan hệ:
- Thuộc 1 table
- Thuộc 1 restaurant
- Có nhiều order_item

## Bảng order_item
Chức năng:
- Lưu chi tiết từng món trong order

Quan hệ:
- Thuộc 1 order
- Tham chiếu đến menu_item

## Bảng payment
Chức năng:
- Lưu thông tin thanh toán

Quan hệ:
- Thuộc 1 order

## 10. Quy ước thiết kế CSDL
- id: khóa chính (PK)
- *_id: khóa ngoại (FK)
- created_at, updated_at: thời gian tạo / cập nhật
- status: trạng thái nghiệp vụ
- price lưu dạng số nguyên (VND)

## 11. Bảng category
| Tên cột | Kiểu | Mô tả |
|------|------|------|
| id | int | Khóa chính |
| restaurant_id | int | Nhà hàng sở hữu |
| name | varchar | Tên danh mục |
| description | text | Mô tả |
| status | varchar | ACTIVE / INACTIVE |
| created_at | datetime | Ngày tạo |
| updated_at | datetime | Ngày cập nhật |

## Bảng menu_item

| Tên cột | Kiểu | Mô tả |
|------|------|------|
| id | int | Khóa chính |
| restaurant_id | int | Nhà hàng |
| category_id | int | Danh mục |
| name | varchar | Tên món |
| description | text | Mô tả |
| price | int | Giá |
| image_url | varchar | Ảnh |
| status | varchar | AVAILABLE / SOLD_OUT |
| created_at | datetime | Ngày tạo |
| updated_at | datetime | Ngày cập nhật |

## 13. Bảng table
| Tên cột | Kiểu | Mô tả |
|------|------|------|
| id | int | Khóa chính |
| restaurant_id | int | Nhà hàng |
| table_number | varchar | Số bàn |
| status | varchar | AVAILABLE / OCCUPIED |
| created_at | datetime | Ngày tạo |

## 14. Bảng qr_code
| Tên cột | Kiểu | Mô tả |
|------|------|------|
| id | int | Khóa chính |
| restaurant_id | int | Nhà hàng |
| table_id | int | Bàn |
| qr_value | varchar | Nội dung QR |
| is_active | boolean | Trạng thái QR |
| created_at | datetime | Ngày tạo |

## 15. Bảng orders
| Tên cột | Kiểu | Mô tả |
|------|------|------|
| id | int | Khóa chính |
| restaurant_id | int | Nhà hàng |
| table_id | int | Bàn |
| total_amount | int | Tổng tiền |
| status | varchar | NEW / CONFIRMED / COOKING / READY / SERVED / PAID |
| created_at | datetime | Ngày tạo |

## Bảng orders_item
| Tên cột | Kiểu | Mô tả |
|------|------|------|
| id | int | Khóa chính |
| order_id | int | Đơn hàng |
| menu_item_id | int | Món |
| quantity | int | Số lượng |
| price | int | Giá tại thời điểm order |

## Bảng payment
| Tên cột | Kiểu | Mô tả |
|------|------|------|
| id | int | Khóa chính |
| order_id | int | Đơn hàng |
| method | varchar | CASH / MOMO / ZALOPAY |
| amount | int | Số tiền |
| status | varchar | PENDING / PAID |
| created_at | datetime | Ngày tạo |
