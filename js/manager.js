const content = document.getElementById("content");
const pageTitle = document.getElementById("page-title");

const supabaseUrl = 'https://vhjxxgajenkzuykkqloi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZoanh4Z2FqZW5renV5a2txbG9pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzQ5ODIyMiwiZXhwIjoyMDgzMDc0MjIyfQ.c6AfU8do1i4pgxiE-1SCrT6OU6Sgj4aSbhB-Rh981MM';
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);
let allFoods = [];

let allTables = [];

let allReservations = [];

let budgets = [
  { id: 1, type: "Thu", note: "Bán hàng ca sáng", amount: 2500000 },
  { id: 2, type: "Chi", note: "Nhập rau củ", amount: 500000 },
  { id: 3, type: "Thu", note: "Bán hàng ca chiều", amount: 3200000 }
];

let customers = [
    { id: 1, name: "Nguyễn Văn A", phone: "0909xxx", visits: 5, spend: 1200000 },
    { id: 2, name: "Trần Thị B", phone: "0912xxx", visits: 2, spend: 450000 }
];

let staffs = [
    { id: 1, name: "Nguyễn Văn Nhân", role: "Phục vụ", status: "Active", shift: "Sáng (08:00 - 14:00)", permissions: ["view_menu", "create_order"] },
    { id: 2, name: "Trần Thị Bếp", role: "Đầu bếp", status: "Active", shift: "Chiều (14:00 - 22:00)", permissions: ["view_menu", "edit_menu"] }
];

// tự động khởi chạy
document.addEventListener("DOMContentLoaded", () => {
    setupNavigation();
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
            if (page === "staff") renderStaff();
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
                        <option value="Main Course">Main Course</option>
                        <option value="Drink">Drink</option>
                        <option value="Side Dish">Side Dish</option>
                    </select>
                </div>
                <button onclick="openMenuModal()" class="btn-green">+ Thêm món mới</button>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>Tên món</th>
                        <th>Danh mục</th>
                        <th>Giá</th>
                        <th>Hành động</th>
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
            <td><span class="status-badge active">${f.category}</span></td>
            <td>${Number(f.price).toLocaleString()}đ</td>
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
    const category = prompt("Nhập loại (Món chính/Đồ uống/Tráng miệng):");

    if (name && price && category) {
        const { error } = await _supabase
            .from('menus')
            .insert([{ 
                food_name: name, 
                price: parseInt(price), 
                category: category
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
            <label>Danh mục</label>
            <select id="m_cat">
                <option value="Món chính" ${item?.category === 'Món chính' ? 'selected' : ''}>Món chính</option>
                <option value="Đồ uống" ${item?.category === 'Đồ uống' ? 'selected' : ''}>Đồ uống</option>
            </select>
        </div>
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
            <label>Danh mục</label>
            <select id="m_cat">
                <option value="Main Course" ${item?.category === 'Main Course' ? 'selected' : ''}>Món chính</option>
                <option value="Drink" ${item?.category === 'Drink' ? 'selected' : ''}>Đồ uống</option>
                <option value="Side Dish" ${item?.category === 'Side Dish' ? 'selected' : ''}>Tráng miệng</option>
            </select>
        </div>
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
    try {
        const tableRes = await _supabase
            .from('tables')
            .select('*')
            .order('id', { ascending: true });
        
        allTables = tableRes.data || [];

        const bookingRes = await _supabase
            .from('bookings')
            .select('*')
            .neq('status', 'completed')
            .order('booking_time', { ascending: true });

        allReservations = bookingRes.data || [];

        renderTableGrid();      
        renderReservationList(); 

    } catch (err) {
        console.error("Lỗi tải data:", err);
        alert("Không thể tải dữ liệu bàn/đặt chỗ. Kiểm tra Console.");
    }
}

async function renderTableReservation() {
    pageTitle.innerText = "Quản lý Bàn & Đặt chỗ";
    content.innerHTML = `<div class="loading">Đang tải dữ liệu bàn và khách...</div>`;

    
    
    content.innerHTML = `
        <div class="page-header">
            <div class="filter-group">
                <button class="btn-green" onclick="openAddTableModal()">+ Thêm bàn mới</button>
                <div style="margin: 20px; font-size: 14px; color: #666;">
                    <i class="fas fa-circle" style="color: #2ecc71;"></i> Trống &nbsp;
                    <i class="fas fa-circle" style="color: #e74c3c;"></i> Đang phục vụ
                </div>
            </div>
        </div>

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

    await fetchTableData();
    
    renderTableGrid();
    renderReservationList();
}

function renderTableGrid() {
    const container = document.getElementById("tableGridContainer");
    
    container.innerHTML = allTables.map(t => {
        const currentGuest = allReservations.find(r => r.table_id === t.id && r.status === 'confirmed');
        
        const isOccupied = t.status === 'occupied' || (currentGuest !== undefined);
        const statusClass = isOccupied ? 'reserved' : 'available';
        const iconColor = isOccupied ? 'white' : '#2ecc71';
        const iconType = isOccupied ? 'fa-users' : 'fa-couch';

        let capacityDisplay;
        if (isOccupied && currentGuest) {
            capacityDisplay = `<span style="font-size: 1.4em; font-weight: bold; color: white;">${currentGuest.people_count}/${t.capacity}</span> <span style="font-size:0.8em">khách</span>`;
        } else {
            capacityDisplay = `<span style="color:#666">Sức chứa: ${t.capacity} người</span>`;
        }

        return `
            <div class="table-box ${statusClass}" onclick="window.handleTableClick(${t.id})">
                <div class="table-icon" style="color:${iconColor}; font-size: 24px; margin-bottom:10px;">
                    <i class="fas ${iconType}"></i>
                </div>
                <h4 style="${isOccupied ? 'color:white' : ''}">${t.table_name}</h4>
                
                <div style="margin-top: 5px;">
                    ${capacityDisplay}
                </div>
                
                ${isOccupied && currentGuest ? `<div style="margin-top:8px; padding-top:8px; border-top:1px solid rgba(255,255,255,0.3); color:#fff; font-size:12px;">KH: ${currentGuest.customer_name}</div>` : ''}
            </div>
        `;
    }).join('');
}

function renderReservationList() {
    const container = document.getElementById("reservationList");
    
    const pendingList = allReservations.filter(r => r.status === 'pending');

    if (pendingList.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; color:#999; padding:20px; background:#fff; border-radius:8px;">
                <i class="far fa-calendar-check" style="font-size:24px; margin-bottom:10px;"></i><br>
                Hiện không có khách chờ
            </div>`;
        return;
    }

    container.innerHTML = pendingList.map(r => {
      
        const dateObj = new Date(r.booking_time);
        const timeStr = dateObj.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        const dateStr = dateObj.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });

        return `
        <div class="reservation-card" style="border-left: 4px solid #f1c40f;">
            <div style="display:flex; justify-content:space-between; align-items:start;">
                <h4 style="margin:0; font-size:16px;">${r.customer_name}</h4>
                <span class="status-badge pending">Chờ xếp</span>
            </div>
            
            <div style="margin: 10px 0; font-size: 13px; color: #555;">
                <p><i class="fas fa-users" style="width:20px"></i> <strong>${r.people_count}</strong> khách</p>
                <p><i class="fas fa-clock" style="width:20px"></i> ${timeStr} - ${dateStr}</p>
                <p><i class="fas fa-phone" style="width:20px"></i> ${r.phone}</p>
            </div>

            <button onclick="window.assignTableModal('${r.id}')" class="btn-green" style="width:100%; padding:8px;">
                <i class="fas fa-arrow-left"></i> Xếp vào bàn trống
            </button>
        </div>
        `;
    }).join('');
}

window.handleTableClick = function(tableId) {
    const table = allTables.find(t => t.id === tableId);
    const guest = allReservations.find(r => r.table_id === tableId && r.status === 'confirmed');

    if (guest) {
        const bodyHtml = `
            <div style="text-align:center">
                <h3 style="color: #e74c3c; margin-bottom: 20px;">${table.table_name} đang phục vụ</h3>
                
                <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; text-align: left; margin-bottom: 20px;">
                    <p><strong>Khách hàng:</strong> ${guest.customer_name}</p>
                    <p><strong>Số điện thoại:</strong> ${guest.phone || 'N/A'}</p>
                    <p><strong>Số lượng khách:</strong> ${guest.people_count} / ${table.capacity} ghế</p>
                    <p><strong>Thời gian đặt:</strong> ${new Date(guest.booking_time).toLocaleString('vi-VN')}</p>
                </div>

                <p style="margin-bottom: 20px;">Xác nhận khách đã thanh toán và dọn bàn?</p>
            </div>
        `;

        showUniversalModal("Chi tiết bàn & Thanh toán", bodyHtml, async () => {
            try {
                await _supabase.from('tables')
                    .update({ status: 'available' })
                    .eq('id', tableId);

                await _supabase.from('bookings')
                    .update({ status: 'completed' })
                    .eq('id', guest.id);
                
                alert("Đã trả bàn thành công!");
                fetchTableData();
            } catch (err) {
                alert("Lỗi khi cập nhật: " + err.message);
            }
        });

    } else {
        const bodyHtml = `
            <div class="form-group">
                <label>Tên bàn</label>
                <input type="text" id="edit_t_name" value="${table.table_name}">
            </div>
            <div class="form-group">
                <label>Số ghế tối đa</label>
                <input type="number" id="edit_t_seats" value="${table.capacity}">
            </div>
            <p style="font-size:13px; color:#666; margin-top:10px;">
                *Để xếp khách vào bàn này, vui lòng chọn khách từ danh sách "Chờ xếp" bên phải màn hình.
            </p>
        `;
        showUniversalModal("Chỉnh sửa thông tin bàn", bodyHtml, async () => {
            const newName = document.getElementById("edit_t_name").value;
            const newSeats = document.getElementById("edit_t_seats").value;
            
            await _supabase.from('tables')
                .update({ table_name: newName, capacity: newSeats })
                .eq('id', tableId);
                
            fetchTableData();
        });
    }
}

window.openAddTableModal = function() {
    const bodyHtml = `
        <div class="form-group"><label>Tên bàn</label><input type="text" id="new_t_name" placeholder="Bàn 10"></div>
        <div class="form-group"><label>Số ghế</label><input type="number" id="new_t_seats" value="4"></div>
    `;
    showUniversalModal("Thêm bàn mới", bodyHtml, async () => {
        const name = document.getElementById("new_t_name").value;
        const seats = document.getElementById("new_t_seats").value;
        await _supabase.from('restaurant_tables').insert([{ name, seats, status: 'available' }]);
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
    
    const availableTables = allTables.filter(t => t.status === 'available');

    if (availableTables.length === 0) {
        alert("Hiện không còn bàn trống nào để xếp!");
        return;
    }

    const bodyHtml = `
        <div style="margin-bottom:15px; background: #e8f8f5; padding: 10px; border-radius: 5px;">
            <p>Khách: <strong>${resItem.customer_name}</strong></p>
            <p>Số lượng: <strong>${resItem.people_count} người</strong></p>
        </div>
        <div class="form-group">
            <label>Chọn bàn thích hợp:</label>
            <select id="select_table_id" style="width:100%; padding: 10px; border-radius: 6px; border: 1px solid #ddd;">
                ${availableTables.map(t => {
                    const isSuitable = t.capacity >= resItem.people_count;
                    const style = isSuitable ? "font-weight:bold; color:green" : "color:gray";
                    return `<option value="${t.id}" style="${style}">
                        ${t.table_name} (Ghế: ${t.capacity}) ${isSuitable ? ' - Phù hợp' : ' - Hơi nhỏ'}
                    </option>`;
                }).join('')}
            </select>
        </div>
    `;

    showUniversalModal("Xếp bàn cho khách", bodyHtml, async () => {
        const selectedTableId = document.getElementById("select_table_id").value;

        try {
            await _supabase.from('tables')
                .update({ status: 'occupied' })
                .eq('id', selectedTableId);
            await _supabase.from('bookings')
                .update({ status: 'confirmed', table_id: selectedTableId })
                .eq('id', reservationId);

            alert("Xếp bàn thành công!");
            fetchTableData();
        } catch (err) {
            alert("Lỗi hệ thống: " + err.message);
        }
    });
}

// Báo cáo
function renderFinance() {
    pageTitle.innerText = "Báo cáo Doanh thu";
    
    const income = budgets.filter(b => b.type === 'Thu').reduce((a, b) => a + b.amount, 0);
    const expense = budgets.filter(b => b.type === 'Chi').reduce((a, b) => a + b.amount, 0);

    content.innerHTML = `
        <div class="finance-summary">
            <div class="summary" style="border-left: 5px solid #2ecc71">
                <p>Tổng thu</p>
                <h3 style="color:#2ecc71">${income.toLocaleString()}đ</h3>
            </div>
            <div class="summary" style="border-left: 5px solid #e74c3c">
                <p>Tổng chi</p>
                <h3 style="color:#e74c3c">${expense.toLocaleString()}đ</h3>
            </div>
            <div class="summary" style="border-left: 5px solid #3498db">
                <p>Lợi nhuận ròng</p>
                <h3 style="color:#3498db">${(income - expense).toLocaleString()}đ</h3>
            </div>
        </div>

        <table>
            <thead>
                <tr>
                    <th>Loại</th>
                    <th>Nội dung</th>
                    <th>Số tiền</th>
                </tr>
            </thead>
            <tbody>
                ${budgets.map(b => `
                    <tr>
                        <td><span class="status-badge ${b.type === 'Thu' ? 'active' : 'locked'}">${b.type}</span></td>
                        <td>${b.note}</td>
                        <td><strong>${b.amount.toLocaleString()}đ</strong></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
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
function renderStaff() {
    pageTitle.innerText = "Quản lý Nhân sự & Lịch làm";
    
    let html = `
        <div class="page-header">
            <div style="display:flex; gap:10px;">
                <button onclick="openStaffModal()" class="btn-green">+ Thêm nhân viên</button>
                <button onclick="exportStaffExcel()" class="btn-gray"><i class="fas fa-file-excel"></i> Xuất Excel</button>
            </div>
        </div>
        <table>
            <thead>
                <tr>
                    <th>Họ Tên</th>
                    <th>Chức vụ</th>
                    <th>Ca làm việc</th>
                    <th>Quyền hạn</th>
                    <th>Hành động</th>
                </tr>
            </thead>
            <tbody>
                ${staffs.map(s => `
                    <tr>
                        <td><strong>${s.name}</strong></td>
                        <td>${s.role}</td>
                        <td><span style="color:#2980b9"><i class="far fa-clock"></i> ${s.shift}</span></td>
                        <td>${s.permissions.map(p => `<small class="status-badge" style="background:#eee; color:#666; margin-right:2px">${p}</small>`).join('')}</td>
                        <td>
                            <button onclick="editStaff(${s.id})" class="btn-gray"><i class="fas fa-edit"></i></button>
                            <button onclick="deleteStaff(${s.id})" class="btn-red"><i class="fas fa-trash"></i></button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    content.innerHTML = html;
}

window.openStaffModal = function(item = null) {
    const title = item ? "Chỉnh sửa nhân viên" : "Thêm nhân viên mới";
    const bodyHtml = `
        <div class="form-group">
            <label>Tên nhân viên</label>
            <input type="text" id="s_name" value="${item ? item.name : ''}">
        </div>
        <div class="form-group">
            <label>Chức vụ</label>
            <select id="s_role">
                <option value="Phục vụ" ${item?.role === 'Phục vụ' ? 'selected' : ''}>Phục vụ</option>
                <option value="Đầu bếp" ${item?.role === 'Đầu bếp' ? 'selected' : ''}>Đầu bếp</option>
                <option value="Thu ngân" ${item?.role === 'Thu ngân' ? 'selected' : ''}>Thu ngân</option>
            </select>
        </div>
        <div class="form-group">
            <label>Lịch làm việc (Ca)</label>
            <select id="s_shift">
                <option value="Sáng (08:00 - 14:00)">Ca Sáng</option>
                <option value="Chiều (14:00 - 22:00)">Ca Chiều</option>
                <option value="Full-time">Cả ngày</option>
            </select>
        </div>
        <div class="form-group">
            <label>Phân quyền</label>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 5px; font-size:14px;">
                <label><input type="checkbox" name="perm" value="view_menu"> Xem Menu</label>
                <label><input type="checkbox" name="perm" value="edit_menu"> Sửa Menu</label>
                <label><input type="checkbox" name="perm" value="view_report"> Xem Báo cáo</label>
                <label><input type="checkbox" name="perm" value="manage_table"> Quản lý bàn</label>
            </div>
        </div>
    `;

    showUniversalModal(title, bodyHtml, async () => {
        const checkboxes = document.querySelectorAll('input[name="perm"]:checked');
        const selectedPerms = Array.from(checkboxes).map(cb => cb.value);
        
        const newStaff = {
            id: item ? item.id : Date.now(),
            name: document.getElementById("s_name").value,
            role: document.getElementById("s_role").value,
            shift: document.getElementById("s_shift").value,
            permissions: selectedPerms,
            status: "Active"
        };

        if (item) {
            const index = staffs.findIndex(s => s.id === item.id);
            staffs[index] = newStaff;
        } else {
            staffs.push(newStaff);
        }
        
        renderStaff();
        alert("Đã cập nhật danh sách nhân sự!");
    });
}

window.editStaff = function(id) {
    const item = staffs.find(s => s.id === id);
    openStaffModal(item);
};

window.exportStaffExcel = function() {
    // Chuẩn bị dữ liệu để xuất
    const dataToExport = staffs.map(s => ({
        "Họ Tên": s.name,
        "Chức Vụ": s.role,
        "Ca Làm Việc": s.shift
    }));

    // Tạo worksheet
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "NhanVien");

    // Xuất file
    XLSX.writeFile(workbook, "Danh_Sach_Nhan_Vien.xlsx");
};
// /**
//  * @param {string} title
//  * @param {string} bodyHtml
//  * @param {function} saveCallback
// */
window.showUniversalModal = function(title, bodyHtml, saveCallback) {
    const modal = document.getElementById("universalModal");
    document.getElementById("modalTitle").innerText = title;
    document.getElementById("modalBody").innerHTML = bodyHtml;
    
    const saveBtn = document.getElementById("modalSaveBtn");
    saveBtn.onclick = async () => {
        saveBtn.innerText = "Đang lưu...";
        saveBtn.disabled = true;
        await saveCallback();
        saveBtn.innerText = "Lưu thay đổi";
        saveBtn.disabled = false;
        closeUniversalModal();
    };
    modal.style.display = "flex";
}
// Hàm đóng Modal
window.closeUniversalModal = function() {
    document.getElementById("universalModal").style.display = "none";
}