const content = document.getElementById("content");
const pageTitle = document.getElementById("page-title");

const supabaseUrl = 'https://vhjxxgajenkzuykkqloi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZoanh4Z2FqZW5renV5a2txbG9pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzQ5ODIyMiwiZXhwIjoyMDgzMDc0MjIyfQ.c6AfU8do1i4pgxiE-1SCrT6OU6Sgj4aSbhB-Rh981MM';
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);
let allFoods = [];

let allTables = [];

let allReservations = [];

let currentFinanceData = [];

let customers = [
    { id: 1, name: "Nguyễn Văn A", phone: "0909xxx", visits: 5, spend: 1200000 },
    { id: 2, name: "Trần Thị B", phone: "0912xxx", visits: 2, spend: 450000 }
];

let staffs = [];

let schedules = []; 

let currentRestaurantId = null;

const TIME_SLOTS = [
    { id: '08-12', label: '08:00 - 12:00' },
    { id: '12-16', label: '12:00 - 16:00' },
    { id: '16-20', label: '16:00 - 20:00' },
    { id: '20-24', label: '20:00 - 24:00' }
];

async function fetchRestaurantId() {
    // Lấy 1 dòng đầu tiên từ bảng 'restaurants' (hoặc bảng chứa thông tin nhà hàng của bạn)
    const { data, error } = await _supabase.from('restaurants').select('id').limit(1).single();
    
    if (data) {
        currentRestaurantId = data.id;
        console.log("Đã lấy ID nhà hàng:", currentRestaurantId);
    } else {
        console.error("Không tìm thấy thông tin nhà hàng:", error);
    }
}

// tự động khởi chạy
document.addEventListener("DOMContentLoaded", () => {
    setupNavigation();
    fetchRestaurantId();
    renderMenu(); // mặc định vào trang Menu
});

function setupNavigation() {
    document.querySelectorAll(".menu-item").forEach(item => {
        item.addEventListener("click", () => {
            document.querySelectorAll(".menu-item").forEach(i => i.classList.remove("active"));
            item.classList.add("active");

            // Routing
            const page = item.dataset.page;
            if (page === "menu") renderMenu();
            if (page === "table-reservation") renderTableReservation();
            if (page === "finance") renderFinance();
            if (page === "customer") renderCustomer();
            if (page === "staff") renderStaffTable();
        });
    });
}

// menu
async function renderMenu() {
    pageTitle.innerText = "Quản lý Thực đơn";
    content.innerHTML = `<div class="loading">Đang tải dữ liệu từ Database...</div>`;

    try {
        const { data, error } = await _supabase.from('menus').select('*').order('id', { ascending: true });
        if (error) throw error;
        allFoods = data;

        // Vẽ thanh công cụ (Search & Filter)
        content.innerHTML = `
            <div class="page-header">
                <div style="display:flex; gap:10px;">
                    <input type="text" id="searchInput" placeholder="Tìm tên món..." onkeyup="filterMenu()">
                    <select id="categoryFilter" onchange="filterMenu()">
                        <option value="">Tất cả danh mục</option>
                        <option value="Món chính">Món chính</option>
                        <option value="Đồ uống">Đồ uống</option>
                        <option value="Tráng miệng">Tráng miệng</option>
                    </select>
                </div>
                <button onclick="openMenuModal()" class="btn-green">+ Thêm món mới</button>
                <button onclick="openGoogleForm()" class="btn-primary">Nhập từ Google Form</button>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>Tên món</th>
                        <th>Giá</th>
                        <th>Trạng thái</th>
                        <th>Sản phẩm bán chạy</th>
                        <th>Số lượng hàng tồn kho</th>
                        <th>Loại món</th>
                        <th>Mô tả món</th>
                    </tr>
                </thead>
                <tbody id="menuTableBody"></tbody>
            </table>
        `;
        renderTableBody(allFoods); 
    } catch (err) {
        content.innerHTML = `Lỗi: ${err.message}`;
    }
}

function renderTableBody(data) {
    const tbody = document.getElementById("menuTableBody");
    if (!tbody) return;

    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center">Không có dữ liệu hiển thị.</td></tr>`;
        return;
    }

    tbody.innerHTML = data.map(f => `
        <tr>
            <td><strong>${f.food_name}</strong></td>
            <td>${Number(f.price).toLocaleString()}đ</td>
            <td>${f.is_available ? 'Còn hàng' : 'Hết hàng'}</td>
            <td>${f.best_seller ? 'Có' : 'Không'}</td>
            <td>${Number(f.stock_count).toLocaleString()}</td>
            <td><span class="status-badge active">${f.category}</span></td>
            <td>${f.description || '---'}</td>
            <td>
                <button onclick="window.editFood('${f.id}')" class="btn-gray"><i class="fas fa-edit"></i> Sửa</button>
                <button onclick="window.deleteFood('${f.id}')" class="btn-red"><i class="fas fa-trash"></i> Xóa</button>
            </td>
        </tr>
    `).join('');
}

async function openAddMenuForm() {
    const name = prompt("Nhập tên món ăn:");
    const price = prompt("Nhập giá bán (VNĐ):");
    const is_available = confirm("Món này còn hàng không? Nhấn 'OK' cho Còn, 'Hủy' cho Hết.");
    const is_best_seller = confirm("Món này có phải sản phẩm bán chạy không? Nhấn 'Yes' cho Có, 'No' cho Không.");
    const stock_count = prompt("Nhập số lượng hàng tồn kho:");
    const category = prompt("Nhập loại (Món chính/Đồ uống/Tráng miệng):");
    const description = prompt("Nhập mô tả món ăn (tùy chọn):");

    if (name && price && category) {
        const { error } = await _supabase
            .from('menus')
            .insert([{ 
                food_name: name, 
                price: parseInt(price),
                is_available: is_available,
                best_seller: best_seller,
                stock_quantity: parseInt(stock_quantity),
                category: category,
                description: description
            }]);

        if (error) {
            alert("Lỗi khi thêm: " + error.message);
        } else {
            alert("Đã thêm món ăn vào menu thành công!");
            renderMenu();
        }
    }
}

window.deleteFood = async function(id) {
    const isConfirm = confirm("Bạn có chắc chắn muốn xóa món này không?");
    if (!isConfirm) return;

    try {
        const { error } = await _supabase
            .from('menus')
            .delete()
            .eq('id', id);

        if (error) throw error;

        alert("Đã xóa món ăn thành công!");
        renderMenu();
    } catch (err) {
        alert("Không thể xóa: " + err.message);
    }
};

window.openMenuForm = function(item = null) {
    const title = item ? "Chỉnh sửa món ăn" : "Thêm món mới";
    const bodyHtml = `
        <div class="form-group">
            <label>Tên món</label>
            <input type="text" id="m_name" value="${item ? item.food_name : ''}">
        </div>
        <div class="form-group">
            <label>Giá bán</label>
            <input type="number" id="m_price" value="${item ? item.price : ''}">
        </div>
        <div class="form-group">
            <label>Trạng thái</label>
            <select id="m_status">
                <option value="true" ${item?.is_available ? 'selected' : ''}>Còn hàng</option>
                <option value="false" ${!item?.is_available ? 'selected' : ''}>Hết hàng</option>
            </select>
        </div>
        <div class="form-group">
            <label>Sản phẩm bán chạy</label>
            <select id="m_bestseller">
                <option value="true" ${item?.best_seller ? 'selected' : ''}>Có</option>
                <option value="false" ${!item?.best_seller ? 'selected' : ''}>Không</option>
            </select>
        </div>
        <div class="form-group">
            <label>Số lượng hàng tồn kho</label>
            <input type="number" id="m_stock" value="${item ? item.stock_count : ''}">
        </div>
        <div class="form-group">
            <label>Danh mục</label>
            <select id="m_cat">
                <option value="Món chính" ${item?.category === 'Món chính' ? 'selected' : ''}>Món chính</option>
                <option value="Đồ uống" ${item?.category === 'Đồ uống' ? 'selected' : ''}>Đồ uống</option>
            </select>
        </div>
        <div class="form-group">
            <label>Mô tả món</label>
            <textarea id="m_desc" rows="3">${item ? item.description : ''}</textarea>
    `;

    showUniversalModal(title, bodyHtml, async () => {
        //lưu vào Supabase
        const name = document.getElementById("fName").value;
        const price = document.getElementById("fPrice").value;
        
        if (item) {
            await _supabase.from('menus').update({ food_name: name, price: price }).eq('id', item.id);
        } else {
            await _supabase.from('menus').insert([{ food_name: name, price: price }]);
        }
        renderMenu(); // Load lại bảng
    });
}

window.openMenuModal = function(item = null) {
    const title = item ? "Chỉnh sửa món ăn" : "Thêm món mới";
    const bodyHtml = `
        <div class="form-group">
            <label>Tên món</label>
            <input type="text" id="m_name" value="${item ? item.food_name : ''}">
        </div>
        <div class="form-group">
            <label>Giá bán</label>
            <input type="number" id="m_price" value="${item ? item.price : ''}">
        </div>
        <div class="form-group">
            <lable>Có sẵn</lable>
            <select id="m_available">
                <option value="true" ${item?.is_available ? 'selected' : ''}>Còn hàng</option>
                <option value="false" ${!item?.is_available ? 'selected' : ''}>Hết hàng</option>
            </select>
        </div>
        <div class="form-group">
            <label>Sản phẩm bán chạy</label>
            <select id="m_bestseller">
                <option value="true" ${item?.best_seller ? 'selected' : ''}>Có</option>
                <option value="false" ${!item?.best_seller ? 'selected' : ''}>Không</option>
        </div>
        <div class="form-group">
            <label>Số lượng hàng tồn kho</label>
            <input type="number" id="m_stock" value="${item ? item.stock_count : ''}">
        </div>
        <div class="form-group">
            <label>Danh mục</label>
            <select id="m_cat">
                <option value="Main Course" ${item?.category === 'Main Course' ? 'selected' : ''}>Món chính</option>
                <option value="Drink" ${item?.category === 'Drink' ? 'selected' : ''}>Đồ uống</option>
                <option value="Side Dish" ${item?.category === 'Side Dish' ? 'selected' : ''}>Tráng miệng</option>
            </select>
        </div>
        <div class="form-group">
            <label>Mô tả món</label>
            <textarea id="m_desc" rows="3">${item ? item.description : ''}</textarea>
    `;

    showUniversalModal(title, bodyHtml, async () => {
        const payload = {
            food_name: document.getElementById("m_name").value,
            price: document.getElementById("m_price").value,
            category: document.getElementById("m_cat").value
        };

        if (item) {
            await _supabase.from('menus').update(payload).eq('id', item.id);
        } else {
            await _supabase.from('menus').insert([payload]);
        }
        renderMenu();
    });
}

window.editFood = function(id) {
    console.log("Đang click sửa ID:", id);
    console.log("Danh sách hiện tại:", allFoods);
    const item = allFoods.find(f => f.id == id);
    
    if (!item) {
        alert("Lỗi: Không tìm thấy dữ liệu món ăn.");
        return;
    }

    openMenuModal(item);

    const bodyHtml = `
        <div class="form-group" style="margin-bottom: 15px;">
            <label>Tên món</label>
            <input type="text" id="edit_m_name" value="${item.food_name}" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">
        </div>
        <div class="form-group" style="margin-bottom: 15px;">
            <label>Giá bán (VNĐ)</label>
            <input type="number" id="edit_m_price" value="${item.price}" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">
        </div>
        <div class="form-group" style="margin-bottom: 15px;">
            <label>Danh mục</label>
            <select id="edit_m_cat" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">
                <option value="Món chính" ${item.category === 'Món chính' ? 'selected' : ''}>Món chính</option>
                <option value="Đồ uống" ${item.category === 'Đồ uống' ? 'selected' : ''}>Đồ uống</option>
                <option value="Tráng miệng" ${item.category === 'Tráng miệng' ? 'selected' : ''}>Tráng miệng</option>
            </select>
        </div>
    `;

    window.showUniversalModal("Chỉnh sửa món ăn", bodyHtml, async () => {
        const updatedData = {
            food_name: document.getElementById("edit_m_name").value,
            price: parseInt(document.getElementById("edit_m_price").value),
            category: document.getElementById("edit_m_cat").value
        };

        const { error } = await _supabase
            .from('menus')
            .update(updatedData)
            .eq('id', id);

        if (error) {
            alert("Lỗi khi lưu: " + error.message);
        } else {
            alert("Cập nhật thành công!");
            renderMenu();
        }
    });
};

window.filterMenu = function() {
    const keyword = document.getElementById("searchInput").value.toLowerCase();
    const category = document.getElementById("categoryFilter").value;

    const filtered = allFoods.filter(item => {
        const matchesName = item.food_name.toLowerCase().includes(keyword);
        const matchesCat = category === "" || item.category === category;
        return matchesName && matchesCat;
    });

    renderTableBody(filtered);
}

// Chỗ ngồi
async function fetchTableData() {
    const { data: tables, error: tError } = await _supabase
        .from('tables')
        .select('*')
        .order('table_name');
    if (tError) { console.error(tError); return; }
    allTables = tables;

    const { data: bookings, error: bError } = await _supabase
        .from('bookings')
        .select('*');
    if (bError) { console.error(bError); return; }
    allReservations = bookings;

    renderTableGrid();
    renderReservationList();
}

async function renderTableReservation() {
    pageTitle.innerText = "Quản lý Bàn & Đặt chỗ";
    content.innerHTML = `<div class="loading">Đang tải dữ liệu bàn và khách...</div>`;

    // 1. Tạo thanh công cụ quản lý (Toolbar)
    const toolbarHtml = `
        <div style="background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
            <div style="font-size: 14px; color: #666;">
                <i class="fas fa-circle" style="color: #2ecc71;"></i> Trống &nbsp;
                <i class="fas fa-circle" style="color: #e74c3c;"></i> Đang phục vụ
            </div>
            <div style="display:flex; gap:10px;">
                <button onclick="addNewTable()" class="btn-green" style="padding: 8px 15px;">
                    <i class="fas fa-plus"></i> Thêm bàn
                </button>
                
                <button onclick="downloadTableTemplate()" class="btn-gray" style="padding: 8px 15px; background:#3498db; color:white;">
                    <i class="fas fa-download"></i> File mẫu
                </button>

                <input type="file" id="excelInput" accept=".xlsx, .xls" style="display: none;" onchange="handleExcelUpload(this)">
                <button onclick="document.getElementById('excelInput').click()" class="btn-gray" style="padding: 8px 15px; background:#27ae60; color:white;">
                    <i class="fas fa-file-excel"></i> Nhập Excel
                </button>
            </div>
        </div>
    `;

    // 2. Tạo khung chứa Sơ đồ và Danh sách
    const layoutHtml = `
        <div class="dual-layout">
            <div class="layout-left">
                <h3 style="margin-bottom: 15px;">Sơ đồ nhà hàng</h3>
                <div class="table-grid" id="tableGridContainer"></div>
            </div>

            <div class="layout-right">
                <h3 style="margin-bottom: 15px;">Danh sách đặt bàn</h3>
                <div id="reservationList">
                    <div class="loading">Đang tải danh sách...</div>
                </div>
            </div>
        </div>
    `;

    content.innerHTML = toolbarHtml + layoutHtml;

    await fetchTableData();
    renderTableGrid(); // Vẽ lại ô bàn (đã có logic xóa nút xóa trong này nếu cần)
    renderReservationList();
}

function renderTableGrid() {
    const container = document.getElementById("tableGridContainer");
    if (!container) return;

    const sortedTables = [...allTables].sort((a, b) => {
        const nameA = (a.table_name || a.name || "").toString();
        const nameB = (b.table_name || b.name || "").toString();
        return nameA.localeCompare(nameB, 'vi', { numeric: true });
    });

    container.innerHTML = sortedTables.map(t => {
        const currentGuest = allReservations.find(r => r.table_id == t.id && r.status === 'confirmed');
        const isOccupied = (t.status === 'occupied' || currentGuest);
        const statusClass = isOccupied ? 'reserved' : 'available';

        return `
            <div class="table-box ${statusClass}" style="position:relative;">
                
                ${!isOccupied ? `
                <i class="fas fa-times-circle" 
                   style="position:absolute; top:5px; right:5px; color:#e74c3c; cursor:pointer; font-size:18px; z-index:10;" 
                   onclick="deleteTable('${t.id}')" title="Xóa bàn này"></i>
                ` : ''}

                <div onclick="window.handleTableClick('${t.id}')">
                    <div class="table-icon" style="color: ${isOccupied ? '#c0392b' : '#2ecc71'}">
                        <i class="fas ${isOccupied ? 'fa-user-check' : 'fa-couch'}"></i>
                    </div>
                    
                    <h4>${t.table_name || t.name}</h4>
                    
                    <div style="margin-top:5px;">
                        ${isOccupied && currentGuest 
                            ? `<strong style="color:#333; font-size:1.1em">${currentGuest.people_count}/${t.capacity || t.seats}</strong> 
                               <span style="color:#666; font-size:0.8em">khách</span>` 
                            : `<span style="color:#666">Sức chứa: ${t.capacity || t.seats}</span>`}
                    </div>
                    
                    ${isOccupied && currentGuest ? `
                        <div style="color:#555; font-size:12px; margin-top:8px; border-top:1px solid rgba(0,0,0,0.1); padding-top:5px; font-weight:500;">
                            ${currentGuest.customer_name}
                        </div>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

function renderReservationList() {

    const container = document.getElementById("reservationList");
    if (!container) return;

    const pendingGuests = allReservations.filter(r => r.status === 'pending');
    const confirmedGuests = allReservations.filter(r => r.status === 'confirmed');

    container.innerHTML = `
        <div class="list-section">
            <h3 style="margin-bottom:15px; color:#e67e22; border-bottom: 2px solid #e67e22; padding-bottom:5px; display:inline-block;">
                <i class="fas fa-clock"></i> Chờ xếp chỗ <span style="font-size:0.8em; background:#e67e22; color:white; padding:2px 8px; border-radius:10px;">${pendingGuests.length}</span>
            </h3>
            
            ${pendingGuests.length === 0 ? '<p style="color:#999; font-style:italic;">Không có khách đang chờ.</p>' : ''}

            ${pendingGuests.map(r => `
                <div class="reservation-card" style="border-left: 5px solid #f1c40f;">
                    <div class="res-info">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <strong style="font-size:16px;">${r.customer_name}</strong>
                            <span style="font-size:12px; color:#7f8c8d;">${new Date(r.booking_time).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                        <div style="margin-top:5px; color:#555;">
                            <span><i class="fas fa-users"></i> ${r.people_count} người</span> • 
                            <span><i class="fas fa-phone"></i> ${r.phone || '---'}</span>
                        </div>
                    </div>
                    <button class="btn-green" style="width:100%; margin-top:10px;" onclick="window.assignTableModal('${r.id}')">
                        <i class="fas fa-check"></i> Xếp bàn
                    </button>
                </div>
            `).join('')}
        </div>

        <div style="height: 30px;"></div> <div class="list-section">
            <h3 style="margin-bottom:15px; color:#27ae60; border-bottom: 2px solid #27ae60; padding-bottom:5px; display:inline-block;">
                <i class="fas fa-utensils"></i> Đang phục vụ <span style="font-size:0.8em; background:#27ae60; color:white; padding:2px 8px; border-radius:10px;">${confirmedGuests.length}</span>
            </h3>

            ${confirmedGuests.map(r => {
                const tableObj = allTables.find(t => t.id == r.table_id);
                const tableName = tableObj ? (tableObj.table_name || tableObj.name) : "Không xác định";

                return `
                <div class="reservation-card" style="border-left: 5px solid #2ecc71; background-color: #f6fffa;">
                    <div class="res-info">
                        <div style="display:flex; justify-content:space-between;">
                            <strong>${r.customer_name}</strong>
                            <span style="color:#27ae60; font-weight:bold; border:1px solid #27ae60; padding:2px 6px; border-radius:4px; font-size:12px;">
                                ${tableName}
                            </span>
                        </div>
                        <div style="margin-top:8px; font-size:14px; color:#666;">
                            <i class="fas fa-users"></i> ${r.people_count} khách
                        </div>
                    </div>
                    <div style="display:flex; gap:10px; margin-top:10px;">
                        <button class="btn-gray" style="flex:1; font-size:13px;" onclick="window.handleTableClick('${r.table_id}')">
                            <i class="fas fa-info-circle"></i> Chi tiết
                        </button>
                    </div>
                </div>
                `;
            }).join('')}
        </div>
    `;
}

window.handleTableClick = function(tableId) {
    const table = allTables.find(t => t.id == tableId);
    const guest = allReservations.find(r => r.table_id == tableId && r.status === 'confirmed');

    if (guest || (table && table.status === 'occupied')) {
        const bodyHtml = `
            <div style="text-align:center; padding: 10px 0;">
                <div style="font-size: 55px; color: #421f1b; margin-bottom: 20px;"><i class="fas fa-file-invoice-dollar"></i></div>
                <h2 style="margin-bottom:20px; color:#2c3e50; font-size: 24px;">Thanh toán ${table.table_name || table.name}</h2>
                
                <div style="background:#fdf2f2; padding:25px; border-radius:12px; text-align:left; border:1px solid #fab1a0; width: 95%; margin: 0 auto 20px auto; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                    <p style="font-size:17px; margin-bottom:12px;"><strong><i class="fas fa-user"></i> Khách hàng:</strong> ${guest ? guest.customer_name : "Khách vãng lai"}</p>
                    <p style="font-size:17px; margin-bottom:12px;"><strong><i class="fas fa-users"></i> Số lượng:</strong> ${guest ? guest.people_count : "?"} người</p>
                    <p style="font-size:17px;"><strong><i class="fas fa-clock"></i> Giờ vào:</strong> ${guest ? new Date(guest.booking_time).toLocaleTimeString('vi-VN') : "N/A"}</p>
                </div>
                
                <p style="font-size:16px; color:#636e72; font-style: italic;">Xác nhận khách đã hoàn tất thanh toán và dọn bàn?</p>
            </div>
        `;

        showUniversalModal("Trả bàn", bodyHtml, async () => {
            try {
                await _supabase.from('tables').update({ status: 'available' }).eq('id', tableId);
                
                if (guest) {
                    await _supabase.from('bookings').update({ status: 'completed' }).eq('id', guest.id);
                }

                alert("Đã trả bàn thành công!");
                await fetchTableData();
            } catch (err) {
                alert("Lỗi database: " + err.message);
            }
        });
    } else {
        const bodyHtml = `
            <div class="form-group" style="padding: 10px;">
                <label style="display:block; margin-bottom:8px;">Tên bàn</label>
                <input type="text" id="edit_t_name" value="${table.table_name || table.name}" style="width:100%;">
                <label style="display:block; margin-top:15px; margin-bottom:8px;">Sức chứa (người)</label>
                <input type="number" id="edit_t_seats" value="${table.capacity || table.seats}" style="width:100%;">
            </div>
        `;
        showUniversalModal("Cấu hình bàn", bodyHtml, async () => {
            const name = document.getElementById("edit_t_name").value;
            const seats = document.getElementById("edit_t_seats").value;
            await _supabase.from('tables').update({ table_name: name, capacity: seats }).eq('id', tableId);
            await fetchTableData();
        });
    }
};

window.openAddTableModal = function() {
    const bodyHtml = `
        <div class="form-group"><label>Tên bàn</label><input type="text" id="new_t_name" placeholder="Bàn 10"></div>
        <div class="form-group"><label>Số ghế</label><input type="number" id="new_t_seats" value="4"></div>
    `;
    showUniversalModal("Thêm bàn mới", bodyHtml, async () => {
        const name = document.getElementById("new_t_name").value;
        const seats = document.getElementById("new_t_capacity").value;
        await _supabase.from('tables').insert([{ name, capacity, status: 'available' }]);
        renderTableReservation();
    });
}

window.confirmReservation = function(id) {
    const res = allReservations.find(r => r.id === id);
    
    const availableTable = tables.find(t => !t.reserved && t.capacity >= res.people_count);
    
    if (!availableTable) {
        alert("Không còn bàn trống phù hợp cho " + res.people_count + " người!");
        return;
    }

    alert(`Đã xếp ${res.customer} vào ${availableTable.name}`);
    renderTableReservation();
}

window.releaseTable = function(tableId) {
    if (confirm("Xác nhận khách đã thanh toán và dọn bàn xong?")) {

        const table = allTables.find(t => t.id === tableId);
        if (table) table.reserved = false;

        allReservations.forEach(r => {
            if (r.id === tableId && r.status === 'confirmed') {
                r.status = 'completed'; 
            }
        });

        alert("Đã giải phóng " + table.table_name);
        renderTableReservation();
    }
};

window.rejectReservation = function(id) {
    if (confirm("Bạn có chắc chắn muốn hủy yêu cầu đặt chỗ này?")) {
        const index = reservations.findIndex(r => r.id === id);
        if (index !== -1) {
            reservations.splice(index, 1); 
            renderTableReservation();
        }
    }
};

window.openBookingForm = function(resId) {
    const res = allReservations.find(r => r.id === resId);
    const bodyHtml = `
        <div class="form-group">
            <label>Tên khách hàng</label>
            <input type="text" id="custName" value="${res.customer}">
        </div>
        <div class="form-group">
            <label>Số người</label>
            <input type="number" id="custPeople" value="${res.people}">
        </div>
    `;

    showUniversalModal("Xác nhận xếp bàn", bodyHtml, async () => {
        res.customer_name = document.getElementById("custName").value;
        res.people_count = document.getElementById("custPeople").value;
        res.status = 'confirmed';
        renderTableReservation(); // Load lại sơ đồ bàn
    });
}

window.assignTableModal = function(reservationId) {
    const resItem = allReservations.find(r => r.id == reservationId);
    if (!resItem) return;

    const availableTables = allTables.filter(t => t.status === 'available');

    if (availableTables.length === 0) {
        alert("Hiện tại không còn bàn trống nào!");
        return;
    }

    const bodyHtml = `
        <div style="padding: 15px; text-align:center;">
            <div style="margin-bottom: 20px;">
                <p style="font-size:18px; color:#2c3e50;">Khách: <strong>${resItem.customer_name}</strong></p>
                <p style="color:#7f8c8d;">Số lượng: ${resItem.people_count} người</p>
            </div>
            
            <div class="form-group" style="text-align:left;">
                <label style="font-weight:600; color:#333;">Chọn bàn trống:</label>
                <select id="select_table_id" style="width:100%; padding: 12px; margin-top:8px; border: 1px solid #ddd; border-radius: 6px; font-size:16px;">
                    ${availableTables.map(t => `
                        <option value="${t.id}">
                            ${t.table_name || t.name} (Ghế: ${t.capacity})
                        </option>
                    `).join('')}
                </select>
            </div>
            <p style="font-size:13px; color:#e74c3c; margin-top:10px;">
                <i class="fas fa-info-circle"></i> Lưu ý: Bàn sẽ chuyển sang trạng thái "Đang phục vụ" ngay lập tức.
            </p>
        </div>
    `;

    showUniversalModal("Xếp bàn cho khách", bodyHtml, async () => {
        const selectedTableId = document.getElementById("select_table_id").value;

        try {
            // 1. Cập nhật trạng thái bàn thành 'occupied' (Có người)
            const { error: errTable } = await _supabase
                .from('tables')
                .update({ status: 'occupied' })
                .eq('id', selectedTableId);
            
            if (errTable) throw errTable;

            const { error: errBooking } = await _supabase
                .from('bookings')
                .update({ 
                    status: 'confirmed', 
                    table_id: selectedTableId,
                    booking_time: new Date().toISOString()
                })
                .eq('id', reservationId);

            if (errBooking) throw errBooking;

            alert("Đã xếp bàn thành công!");
            await fetchTableData();

        } catch (error) {
            console.error(error);
            alert("Lỗi khi xếp bàn: " + error.message);
        }
    });
}

window.addNewTable = function() {
    const bodyHtml = `
        <div class="form-group" style="margin-bottom:15px;">
            <label>Tên bàn (Ví dụ: Bàn 10, VIP 1):</label>
            <input type="text" id="new_table_name" class="form-control" placeholder="Nhập tên bàn..." style="width:100%; padding:10px; border:1px solid #ddd; border-radius:5px;">
        </div>
        <div class="form-group">
            <label>Số ghế:</label>
            <input type="number" id="new_table_capacity" class="form-control" value="4" style="width:100%; padding:10px; border:1px solid #ddd; border-radius:5px;">
        </div>
    `;

    showUniversalModal("Thêm bàn mới", bodyHtml, async () => {
        const name = document.getElementById("new_table_name").value;
        const capacity = document.getElementById("new_table_capacity").value;

        if (!name) { alert("Vui lòng nhập tên bàn!"); return; }

        try {
            const { error } = await _supabase.from('tables').insert([
                { table_name: name, capacity: parseInt(capacity), status: 'available' }
            ]);
            
            if (error) throw error;
            
            alert("Thêm bàn thành công!");
            await fetchTableData();
        } catch (err) {
            alert("Lỗi: " + err.message);
        }
    });
};

window.deleteTable = async function(id) {
    if (!confirm("Bạn có chắc chắn muốn xóa bàn này không?")) return;
    
    try {
        const { error } = await _supabase.from('tables').delete().eq('id', id);
        if (error) throw error;
        await fetchTableData();
    } catch (err) {
        alert("Không thể xóa bàn (có thể do đang có đơn đặt hoặc lỗi hệ thống).");
        console.error(err);
    }
};

window.downloadTableTemplate = function() {
    const data = [
        { "TenBan": "Bàn 01", "SoGhe": 4 },
        { "TenBan": "Bàn 02", "SoGhe": 4 },
        { "TenBan": "VIP 01", "SoGhe": 10 }
    ];
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "DanhSachBan");
    XLSX.writeFile(wb, "Mau_Danh_Sach_Ban.xlsx");
};

window.handleExcelUpload = function(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        if (jsonData.length === 0) {
            alert("File không có dữ liệu!");
            return;
        }
        confirmImportModal(jsonData);
    };
    reader.readAsArrayBuffer(file);
    input.value = ''; // Reset input
};

function confirmImportModal(data) {
    // Lưu data vào biến tạm để dùng khi bấm nút
    window.tempImportData = data;

    const bodyHtml = `
        <p>Đã đọc được <strong>${data.length}</strong> bàn từ file.</p>
        <div style="background:#f9f9f9; padding:10px; border-radius:5px; margin-bottom:15px; max-height:200px; overflow-y:auto; border:1px solid #eee;">
            <table style="width:100%; font-size:13px;">
                <thead><tr style="background:#eee;"><th>Tên bàn</th><th>Ghế</th></tr></thead>
                <tbody>
                    ${data.map(item => `
                        <tr>
                            <td>${item['TenBan'] || item['name'] || '---'}</td>
                            <td>${item['SoGhe'] || item['capacity'] || 4}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        
        <div style="display:flex; gap:10px; justify-content:center; margin-top:10px;">
            <button onclick="processImport('append')" class="btn-green" style="flex:1;">
                <i class="fas fa-plus"></i> Thêm mới (Giữ bàn cũ)
            </button>
            <button onclick="processImport('replace')" class="btn-red" style="flex:1;">
                <i class="fas fa-sync"></i> Thay thế toàn bộ
            </button>
        </div>
    `;

    // Hiển thị modal nhưng ẩn nút Save mặc định đi vì ta dùng nút riêng
    showUniversalModal("Xác nhận nhập Excel", bodyHtml, () => {});
    document.getElementById("modalSaveBtn").style.display = "none";
}

window.processImport = async function(mode) {
    const data = window.tempImportData;
    if (!data) return;

    try {
        const formattedData = data.map(item => ({
            table_name: item['TenBan'] || item['name'], 
            capacity: item['SoGhe'] || item['capacity'] || 4,
            status: 'available'
        })).filter(item => item.table_name);

        if (mode === 'replace') {
            if (!confirm("CẢNH BÁO: Toàn bộ bàn cũ sẽ bị xóa và thay bằng danh sách mới. Các khách đang ngồi sẽ được chuyển về danh sách 'Chờ xếp chỗ'.")) return;
            
            const { error: updateError } = await _supabase
                .from('bookings')
                .update({ 
                    table_id: null,
                    status: 'pending'
                })
                .not('table_id', 'is', null);

            if (updateError) {
                console.warn("Lỗi cập nhật booking:", updateError.message);
            }

            const { error: delError } = await _supabase
                .from('tables')
                .delete()
                .not('id', 'is', null);
            
            if (delError) throw new Error("Không thể xóa bàn cũ (Lỗi ràng buộc dữ liệu): " + delError.message);
        }

        const { error: insertError } = await _supabase.from('tables').insert(formattedData);
        if (insertError) throw insertError;

        alert("Cập nhật sơ đồ bàn thành công! Tất cả khách cũ đã được đưa về danh sách Chờ.");
        document.getElementById("universalModal").style.display = "none";
        document.getElementById("modalSaveBtn").style.display = "inline-block"; 
        await fetchTableData();

    } catch (err) {
        alert("Lỗi khi nhập: " + err.message);
        console.error(err);
    }
};

// Báo cáo
async function renderFinance() {
    pageTitle.innerText = "Báo cáo Doanh thu & Chi phí";
    
    const toolbarHtml = `
        <div class="finance-toolbar">
            <div>
                <h3 style="margin:0; color:#2c3e50;">Tổng quan tài chính</h3>
                <p style="margin:0; font-size:13px; color:#7f8c8d;" id="recordCount">Đang tải...</p>
            </div>
            <div style="display:flex; gap:10px;">
                <button onclick="generateDummyFinanceData()" class="btn-gray" style="background:#f39c12; color:white;">
                    <i class="fas fa-magic"></i> Tạo Data Ảo (Test)
                </button>
                <button onclick="downloadFinanceTemplate()" class="btn-gray" style="background:#3498db; color:white;">
                    <i class="fas fa-download"></i> Tải Mẫu
                </button>
                
                <input type="file" id="financeExcelInput" accept=".xlsx, .xls" style="display: none;" onchange="handleFinanceImport(this)">
                <button onclick="document.getElementById('financeExcelInput').click()" class="btn-gray" style="background:#27ae60; color:white;">
                    <i class="fas fa-file-excel"></i> Nhập Excel
                </button>
                
                <button onclick="exportFinanceExcel()" class="btn-green">
                    <i class="fas fa-file-export"></i> Xuất Báo Cáo
                </button>
            </div>
        </div>
    `;

    const mainHtml = `
        <div id="financeStats" class="summary-cards">
            </div>

        <div class="table-container">
            <table class="finance-table" style="width:100%; border-collapse: collapse;">
                <thead>
                    <tr>
                        <th style="padding:15px;">Ngày tháng</th>
                        <th>Loại</th>
                        <th>Nội dung</th>
                        <th>Danh mục</th>
                        <th style="text-align:right; padding-right:20px;">Số tiền (VNĐ)</th>
                    </tr>
                </thead>
                <tbody id="financeTableBody">
                    </tbody>
            </table>
        </div>
    `;

    content.innerHTML = toolbarHtml + mainHtml;

    if (!budgets || budgets.length === 0) {
        budgets = [
            { id: 1, date: '2023-10-01', type: "Thu", category: "Bán hàng", note: "Doanh thu ca sáng", amount: 2500000 },
            { id: 2, date: '2023-10-01', type: "Chi", category: "Nguyên liệu", note: "Nhập rau củ", amount: 500000 },
        ];
    }
    
    currentFinanceData = [...budgets];
    refreshFinanceUI();
}

function refreshFinanceUI() {
    const tableBody = document.getElementById("financeTableBody");
    const statsContainer = document.getElementById("financeStats");
    const countLabel = document.getElementById("recordCount");

    if (!tableBody) return;

    // 1. Tính toán tổng
    let totalThu = 0;
    let totalChi = 0;

    // Sắp xếp theo ngày mới nhất
    currentFinanceData.sort((a, b) => new Date(b.date) - new Date(a.date));

    // 2. Vẽ bảng
    let rowsHtml = currentFinanceData.map(item => {
        const isThu = item.type === 'Thu';
        const amountVal = parseFloat(item.amount);
        
        if (isThu) totalThu += amountVal;
        else totalChi += amountVal;

        return `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding:12px 15px;">${formatDateVN(item.date)}</td>
                <td><span class="${isThu ? 'text-green' : 'text-red'}">${item.type}</span></td>
                <td>${item.note}</td>
                <td><span style="background:#f1f2f6; padding:2px 8px; border-radius:4px; font-size:12px;">${item.category || 'Khác'}</span></td>
                <td style="text-align:right; padding-right:20px; font-weight:500;">
                    ${amountVal.toLocaleString('vi-VN')} ₫
                </td>
            </tr>
        `;
    }).join('');

    tableBody.innerHTML = rowsHtml;

    // 3. Cập nhật Thẻ thống kê
    const balance = totalThu - totalChi;
    statsContainer.innerHTML = `
        <div class="card">
            <div class="card-icon bg-green"><i class="fas fa-arrow-down"></i></div>
            <div class="card-info">
                <h5>Tổng Thu</h5>
                <p style="color:#27ae60;">${totalThu.toLocaleString('vi-VN')} ₫</p>
            </div>
        </div>
        <div class="card">
            <div class="card-icon bg-red"><i class="fas fa-arrow-up"></i></div>
            <div class="card-info">
                <h5>Tổng Chi</h5>
                <p style="color:#c0392b;">${totalChi.toLocaleString('vi-VN')} ₫</p>
            </div>
        </div>
        <div class="card">
            <div class="card-icon bg-blue"><i class="fas fa-wallet"></i></div>
            <div class="card-info">
                <h5>Lợi Nhuận Ròng</h5>
                <p style="color:${balance >= 0 ? '#2980b9' : '#e74c3c'};">
                    ${balance.toLocaleString('vi-VN')} ₫
                </p>
            </div>
        </div>
    `;

    countLabel.innerText = `Hiển thị ${currentFinanceData.length} giao dịch`;
}

window.generateDummyFinanceData = function() {
    const count = 50; // Tạo 50 dòng dữ liệu
    const categoriesThu = ["Bán hàng", "Phí dịch vụ", "Tiền tip"];
    const categoriesChi = ["Nhập hàng", "Điện nước", "Lương nhân viên", "Sửa chữa", "Marketing"];
    
    const newData = [];
    
    for (let i = 0; i < count; i++) {
        const isThu = Math.random() > 0.4; // 60% là Thu
        const type = isThu ? "Thu" : "Chi";
        const catList = isThu ? categoriesThu : categoriesChi;
        const category = catList[Math.floor(Math.random() * catList.length)];
        
        // Random ngày trong 30 ngày qua
        const date = new Date();
        date.setDate(date.getDate() - Math.floor(Math.random() * 30));
        const dateStr = date.toISOString().split('T')[0];

        // Random tiền (từ 100k đến 5tr)
        const amount = (Math.floor(Math.random() * 50) + 1) * 100000;

        newData.push({
            id: Date.now() + i,
            date: dateStr,
            type: type,
            category: category,
            note: `Giao dịch tự động #${i + 1}`,
            amount: amount
        });
    }

    // Gộp vào dữ liệu hiện tại (để test)
    currentFinanceData = newData; 
    budgets = newData; // Lưu vào biến toàn cục giả lập
    
    alert(`Đã tạo thành công ${count} dòng dữ liệu mẫu!`);
    refreshFinanceUI();
};

window.downloadFinanceTemplate = function() {
    const data = [
        { "Ngay": "2023-10-20", "Loai": "Thu", "SoTien": 1500000, "DanhMuc": "Bán hàng", "GhiChu": "Thu ca sáng" },
        { "Ngay": "2023-10-20", "Loai": "Chi", "SoTien": 500000, "DanhMuc": "Nguyên liệu", "GhiChu": "Mua rau" }
    ];
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "MauBaoCao");
    XLSX.writeFile(wb, "Mau_Nhap_Lieu_Tai_Chinh.xlsx");
};

window.exportFinanceExcel = function() {
    if (currentFinanceData.length === 0) {
        alert("Không có dữ liệu để xuất!");
        return;
    }

    const dataToExport = currentFinanceData.map(item => ({
        "Ngày": item.date,
        "Loại": item.type,
        "Số Tiền": item.amount,
        "Danh Mục": item.category,
        "Ghi Chú": item.note
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "BaoCaoTaiChinh");
    XLSX.writeFile(wb, `Bao_Cao_${new Date().toISOString().slice(0,10)}.xlsx`);
};

window.handleFinanceImport = function(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);

        if (jsonData.length === 0) { alert("File rỗng!"); return; }

        // Map dữ liệu Excel về đúng cấu trúc
        const mappedData = jsonData.map((row, index) => ({
            id: Date.now() + index,
            date: row['Ngay'] || row['Date'] || new Date().toISOString().split('T')[0],
            type: row['Loai'] || row['Type'] || 'Thu',
            amount: row['SoTien'] || row['Amount'] || 0,
            category: row['DanhMuc'] || row['Category'] || 'Khác',
            note: row['GhiChu'] || row['Note'] || ''
        }));

        if(confirm(`Tìm thấy ${mappedData.length} giao dịch. Bạn muốn thay thế dữ liệu hiện tại không?`)) {
            currentFinanceData = mappedData;
            budgets = mappedData; // Update biến gốc
            refreshFinanceUI();
            alert("Nhập dữ liệu thành công!");
        }
    };
    reader.readAsArrayBuffer(file);
    input.value = '';
};

function formatDateVN(dateString) {
    if(!dateString) return "";
    const [y, m, d] = dateString.split('-');
    return `${d}/${m}/${y}`;
}

// Khách hàng
function renderCustomer() {
    pageTitle.innerText = "Dữ liệu Khách hàng";
    let html = `
        <div class="page-header"><button class="btn-green">Xuất Excel</button></div>
        <table>
            <thead><tr><th>Tên</th><th>SĐT</th><th>Số lần ghé</th><th>Chi tiêu</th></tr></thead>
            <tbody>
                ${customers.map(c => `<tr><td>${c.name}</td><td>${c.phone}</td><td>${c.visits}</td><td>${c.spend.toLocaleString()}đ</td></tr>`).join('')}
            </tbody>
        </table>
    `;
    content.innerHTML = html;
}
// Nhân viên

async function renderStaffTable() {
    const content = document.getElementById("content");
    content.innerHTML = `
        <div class="page-header">
            <h2 id="page-title">Quản lý Nhân sự & Lịch làm</h2>
            <div class="header-actions">
                <button class="btn-primary" onclick="window.openStaffModal()"><i class="fas fa-plus"></i> Thêm nhân viên</button>
                <button class="btn-success" onclick="window.exportStaffExcel()"><i class="fas fa-file-excel"></i> Xuất Excel</button>
            </div>
        </div>

        <div class="dual-layout" style="display:flex; flex-direction:column; gap:30px;">
            
            <div class="card" style="padding:20px; border-radius:8px; background:white; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                <div style="display:flex; justify-content:space-between; margin-bottom:15px;">
                    <h3>Danh sách Nhân viên</h3>
                    <input type="text" id="staffSearch" placeholder="Tìm tên..." onkeyup="window.filterStaff()" style="padding:5px 10px; border:1px solid #ddd; border-radius:4px;">
                </div>
                <div class="table-container">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Họ Tên</th>
                                <th>Chức Vụ</th>
                                <th>Loại Hợp Đồng</th>
                                <th>SĐT</th>
                                <th>Hành Động</th>
                            </tr>
                        </thead>
                        <tbody id="staffTableBody">
                            <tr><td colspan="6" style="text-align:center;">Đang tải...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="card" style="padding:20px; border-radius:8px; background:white; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                <div style="margin-bottom:15px;">
                    <h3>📅 Bảng Xếp Ca Làm Việc (Hôm nay)</h3>
                    <p style="font-size:13px; color:#666;">
                        <span style="color:#2ecc71; font-weight:bold;">●</span> Click vào ô để xếp lịch. 
                        <strong>Full-time</strong> sẽ tự động chọn 8 tiếng.
                    </p>
                </div>
                <div class="table-container">
                    <table class="table table-bordered schedule-table">
                        <thead>
                            <tr>
                                <th style="width: 25%;">Nhân Viên</th>
                                ${TIME_SLOTS.map(s => `<th>${s.label}</th>`).join('')}
                                <th>Tổng giờ</th>
                            </tr>
                        </thead>
                        <tbody id="scheduleTableBody">
                            <tr><td colspan="6" style="text-align:center;">Đang tải lịch...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
    
    // Gọi tải dữ liệu
    await Promise.all([loadStaffs(), loadSchedules()]);
    // Sau khi tải xong cả 2 mới vẽ bảng để tránh lỗi đồng bộ
    renderStaff(staffs);
};

// --- 3. XỬ LÝ DỮ LIỆU (DATA) ---

// Tải nhân viên
async function loadStaffs() {
    let { data, error } = await _supabase.from('staffs').select('*').order('id', { ascending: true });
    if (error) console.error("Lỗi tải NV:", error);
    else staffs = data || [];
}

// Tải lịch làm việc (Bảng scheduling)
async function loadSchedules() {
    let { data, error } = await _supabase.from('scheduling').select('*');
    if (error) console.error("Lỗi tải lịch:", error);
    else schedules = data || [];
}

// Vẽ bảng nhân viên
function renderStaff(data) {
    const tbody = document.getElementById("staffTableBody");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">Chưa có dữ liệu</td></tr>`;
    } else {
        data.forEach(s => {
            const roleColor = s.role === 'Quản lý' ? '#e74c3c' : (s.role === 'Thu ngân' ? '#2ecc71' : '#3498db');
            const typeBadge = s.shift === 'Full-time' ? 
                '<span class="badge-ft" style="background:#2c3e50; color:white; padding:2px 6px; border-radius:4px; font-size:11px;">Full-time</span>' : 
                '<span class="badge-pt" style="background:#f39c12; color:white; padding:2px 6px; border-radius:4px; font-size:11px;">Part-time</span>';
            
            // FIX: Thêm dấu nháy đơn '${s.id}' để tránh lỗi cú pháp nếu ID là chuỗi
            tbody.innerHTML += `
                <tr>
                    <td>#${s.id}</td>
                    <td><strong>${s.name}</strong></td>
                    <td><span style="background:${roleColor}; color:white; padding:4px 8px; border-radius:4px; font-size:12px;">${s.role}</span></td>
                    <td>${typeBadge}</td>
                    <td>${s.phone || '-'}</td>
                    <td>
                        <button class="btn-icon edit" onclick="window.editStaff('${s.id}')"><i class="fas fa-edit"></i></button>
                        <button class="btn-icon delete" onclick="window.deleteStaff('${s.id}')"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `;
        });
    }
    renderScheduleTable();
}

// Vẽ bảng lịch
function renderScheduleTable() {
    const tbody = document.getElementById("scheduleTableBody");
    if (!tbody) return;
    tbody.innerHTML = "";

    staffs.forEach(staff => {
        // Lọc lịch của nhân viên này
        // FIX: Dùng == thay vì === để so sánh số và chuỗi an toàn
        const staffSchedules = schedules.filter(sch => sch.staff_id == staff.id);
        const totalHours = staffSchedules.length * 4;

        let rowHtml = `
            <tr>
                <td>
                    <div style="font-weight:bold; font-size:15px;">${staff.name}</div>
                    <div style="font-size:12px; margin-top:4px; color:#666;">
                        ${staff.shift} - ${staff.role}
                    </div>
                </td>
        `;

        TIME_SLOTS.forEach(slot => {
            const isChecked = staffSchedules.some(sch => sch.slot === slot.id);
            
            const bgStyle = isChecked ? 'background-color:#e8f5e9; border:1px solid #2ecc71;' : '';
            const icon = isChecked ? '<i class="fas fa-check-circle" style="color:#2ecc71; font-size:24px;"></i>' : '<i class="far fa-circle" style="color:#ddd; font-size:24px;"></i>';
            
            // FIX QUAN TRỌNG: Thêm dấu nháy đơn '${staff.id}'
            rowHtml += `
                <td style="text-align:center; cursor:pointer; vertical-align:middle; transition:0.2s; ${bgStyle}" 
                    onclick="window.toggleSchedule('${staff.id}', '${slot.id}')"
                    onmouseover="this.style.backgroundColor='#f9f9f9'"
                    onmouseout="this.style.backgroundColor='${isChecked ? '#e8f5e9' : 'transparent'}'">
                    ${icon}
                </td>
            `;
        });

        rowHtml += `
                <td style="text-align:center; font-weight:bold; vertical-align:middle; color:${totalHours >= 8 ? '#27ae60' : '#7f8c8d'}">
                    ${totalHours}h
                </td>
            </tr>
        `;
        tbody.innerHTML += rowHtml;
    });
}

// --- 4. LOGIC CLICK VÀ LƯU VÀO DB ---
window.toggleSchedule = async function(staffId, clickedSlotId) {
    console.log("Đã click:", staffId, clickedSlotId); // Debug xem nhận sự kiện chưa

    // FIX: Dùng == để tìm staff (đề phòng staffId truyền vào là chuỗi còn trong data là số)
    const staff = staffs.find(s => s.id == staffId);
    if (!staff) {
        console.error("Không tìm thấy nhân viên với ID:", staffId);
        return;
    }

    // Xác định các Slot cần xử lý (Logic 8 tiếng cho Full-time)
    let slotsToProcess = [clickedSlotId]; 

    if (staff.shift === 'Full-time') {
        if (clickedSlotId === '08-12') slotsToProcess = ['08-12', '12-16'];
        else if (clickedSlotId === '12-16') slotsToProcess = ['12-16', '16-20'];
        else if (clickedSlotId === '16-20') slotsToProcess = ['16-20', '20-24'];
        else if (clickedSlotId === '20-24') {
            alert("⚠️ Full-time không thể bắt đầu lúc 20:00 (chỉ còn 4 tiếng).");
            return;
        }
    }

    try {
        // Kiểm tra xem slot đã tồn tại chưa
        const existingItems = schedules.filter(sch => 
            sch.staff_id == staffId && slotsToProcess.includes(sch.slot)
        );
        
        // Nếu đã có -> XÓA (Uncheck)
        if (existingItems.length > 0) {
            const idsToDelete = existingItems.map(x => x.id);
            
            // Xóa DB
            const { error } = await _supabase.from('scheduling').delete().in('id', idsToDelete);
            if (error) throw error;

            // Xóa local
            schedules = schedules.filter(x => !idsToDelete.includes(x.id));
        } 
        // Nếu chưa có -> THÊM (Check)
        else {
            const newRows = slotsToProcess.map(slot => ({
                restaurant_id: currentRestaurantId,
                staff_id: staffId,
                staff_name: staff.name,
                slot: slot
            }));

            // Thêm DB
            const { data, error } = await _supabase.from('scheduling').insert(newRows).select();
            if (error) throw error;

            // Thêm local
            if (data) schedules.push(...data);
        }

        renderScheduleTable();

    } catch (err) {
        console.error("Lỗi cập nhật lịch:", err);
        alert("Lỗi server: " + err.message);
    }
};

// --- 5. CÁC FORM MODAL ---
window.openStaffModal = function(staffId = null) {
    // FIX: Tìm nhân viên bằng ID thay vì truyền object trực tiếp để tránh lỗi chuỗi
    let staff = null;
    if(staffId) staff = staffs.find(s => s.id == staffId);

    const isEdit = staff !== null;
    const formHtml = `
        <div class="form-group"><label>Họ Tên:</label><input type="text" id="sName" class="form-control" value="${staff ? staff.name : ''}"></div>
        <div class="dual-layout" style="gap:15px">
            <div class="form-group" style="flex:1"><label>Chức Vụ:</label>
                <select id="sRole" class="form-control">
                    <option value="Quản lý" ${staff?.role === 'Quản lý'?'selected':''}>Quản lý</option>
                    <option value="Thu ngân" ${staff?.role === 'Thu ngân'?'selected':''}>Thu ngân</option>
                    <option value="Phục vụ" ${staff?.role === 'Phục vụ'?'selected':''}>Phục vụ</option>
                    <option value="Đầu bếp" ${staff?.role === 'Đầu bếp'?'selected':''}>Đầu bếp</option>
                    <option value="Vệ sinh" ${staff?.role === 'Vệ sinh'?'selected':''}>Vệ sinh</option>
                </select>
            </div>
            <div class="form-group" style="flex:1"><label>Loại Hợp Đồng:</label>
                <select id="sShift" class="form-control">
                    <option value="Full-time" ${staff?.shift === 'Full-time'?'selected':''}>Full-time (8h)</option>
                    <option value="Part-time" ${staff?.shift === 'Part-time'?'selected':''}>Part-time (4h)</option>
                </select>
            </div>
        </div>
        <div class="form-group"><label>SĐT:</label><input type="text" id="sPhone" class="form-control" value="${staff ? staff.phone : ''}"></div>
    `;

    showUniversalModal(isEdit ? "Sửa Nhân Viên" : "Thêm Nhân Viên", formHtml, async () => {
        const payload = {
            name: document.getElementById("sName").value,
            role: document.getElementById("sRole").value,
            shift: document.getElementById("sShift").value,
            phone: document.getElementById("sPhone").value
        };
        
        if(!payload.name) return alert("Vui lòng nhập tên!");

        try {
            if (isEdit) {
                await _supabase.from('staffs').update(payload).eq('id', staff.id);
            } else {
                await _supabase.from('staffs').insert([payload]);
            }
            closeUniversalModal();
            // Reload lại dữ liệu để đồng bộ
            await loadStaffs(); 
            renderStaffTable(staffs);
        } catch (e) {
            alert("Lỗi lưu: " + e.message);
        }
    });
};

window.editStaff = (id) => window.openStaffModal(id);

window.deleteStaff = async (id) => {
    if(confirm("Bạn có chắc muốn xóa?")) {
        await _supabase.from('staffs').delete().eq('id', id);
        await _supabase.from('scheduling').delete().eq('staff_id', id);
        await loadStaffs();
        renderStaffTable(staffs);
    }
};

window.filterStaff = function() {
    const term = document.getElementById("staffSearch").value.toLowerCase();
    const filtered = staffs.filter(s => (s.name || '').toLowerCase().includes(term));
    renderStaffTable(filtered);
};

window.exportStaffExcel = function() {
    if (staffs.length === 0) return alert("Chưa có dữ liệu!");
    const dataExport = staffs.map(s => ({
        "ID": s.id, "Họ Tên": s.name, "Chức Vụ": s.role, "Loại HĐ": s.shift, "SĐT": s.phone
    }));
    const ws = XLSX.utils.json_to_sheet(dataExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "NhanVien");
    XLSX.writeFile(wb, "DanhSachNhanVien.xlsx");
};

// --- HELPER FUNCTIONS ---
window.showUniversalModal = function(title, bodyHtml, saveCallback) {
    const modal = document.getElementById("universalModal");
    document.getElementById("modalTitle").innerText = title;
    document.getElementById("modalBody").innerHTML = bodyHtml;
    
    const saveBtn = document.getElementById("modalSaveBtn");
    const newBtn = saveBtn.cloneNode(true);
    saveBtn.parentNode.replaceChild(newBtn, saveBtn);
    
    newBtn.onclick = saveCallback;
    modal.style.display = "flex";
};

window.closeUniversalModal = () => document.getElementById("universalModal").style.display = "none";
// Hàm đóng Modal
window.closeUniversalModal = function() {
    document.getElementById("universalModal").style.display = "none";
}