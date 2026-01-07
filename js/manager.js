const content = document.getElementById("content");
const pageTitle = document.getElementById("page-title");

const supabaseUrl = 'https://vhjxxgajenkzuykkqloi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZoanh4Z2FqZW5renV5a2txbG9pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0OTgyMjIsImV4cCI6MjA4MzA3NDIyMn0.l04T4IY-2mdFTvVhksDBmL5buErB1Pfa97GQOgRVtCg';
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

let allFoods = [];

let tables = [
  { id: 1, name: "Bàn 01", seats: 4, reserved: false },
  { id: 2, name: "Bàn 02", seats: 2, reserved: true }, // Giả sử đang có khách
  { id: 3, name: "Bàn 03", seats: 6, reserved: false },
  { id: 4, name: "Bàn 04", seats: 4, reserved: false },
  { id: 5, name: "VIP 01", seats: 10, reserved: false }
];

let reservations = [
  { id: 1, customer: "Nguyễn Văn A", phone: "0909xxx", people: 4, time: "18:30", status: "pending", tableId: null },
  { id: 2, customer: "Trần Thị B", phone: "0912xxx", people: 2, time: "19:00", status: "confirmed", tableId: 2 }
];

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
    { id: 1, name: "Lê Minh", role: "Bếp trưởng", status: "Đang làm" },
    { id: 2, name: "Phạm Hùng", role: "Phục vụ", status: "Đang làm" }
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
        const { data, error } = await _supabase.from('menus').select('*').order('id', { ascending: false });
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
                        <th>Ảnh</th>
                        <th>Tên món</th>
                        <th>Danh mục</th>
                        <th>Giá</th>
                        <th>Chỉnh sửa</th>
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
    tbody.innerHTML = data.map(f => `
        <tr>
            <td><img src="${f.image_url || ''}" style="width:40px;height:40px;border-radius:4px;object-fit:cover;"></td>
            <td>${f.food_name}</td>
            <td><span class="status-badge active">${f.category}</span></td>
            <td>${Number(f.price).toLocaleString()}đ</td>
            <td>
                <button onclick="editFood(${f.id})" class="btn-gray"><i class="fas fa-edit"></i></button>
                <button onclick="deleteFood(${f.id})" class="btn-red"><i class="fas fa-trash"></i></button>
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
                category: category,
                image_url: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c" // Ảnh mẫu
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
    const bodyHtml = `<p style="text-align:center; padding: 10px;">Bạn có chắc chắn muốn xóa món ăn này khỏi thực đơn không?<br>
                      <small style="color:red;">(Hành động này không thể hoàn tác)</small></p>`;

    showUniversalModal("Xác nhận xóa", bodyHtml, async () => {
        try {
            const { error } = await _supabase
                .from('menus')
                .delete()
                .eq('id', id);

            if (error) throw error;

            alert("Đã xóa món ăn thành công!");
            renderMenu(); 
        } catch (err) {
            console.error("Lỗi khi xóa:", err);
            alert("Không thể xóa món ăn: " + err.message);
        }
    });
};

window.openMenuForm = function(item = null) {
    const title = item ? "Chỉnh sửa món ăn" : "Thêm món mới";
    const bodyHtml = `
        <div class="form-group">
            <label>Tên món</label>
            <input type="text" id="fName" value="${item ? item.food_name : ''}">
        </div>
        <div class="form-group">
            <label>Giá (VNĐ)</label>
            <input type="number" id="fPrice" value="${item ? item.price : ''}">
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
    const item = allFoods.find(f => f.id === id);
    openMenuModal(item);
}

window.filterMenu = function() {
    const search = document.getElementById("searchInput").value.toLowerCase();
    const cat = document.getElementById("categoryFilter").value;

    const filtered = allFoods.filter(f => {
        const matchName = f.food_name.toLowerCase().includes(search);
        const matchCat = cat === "" || f.category === cat;
        return matchName && matchCat;
    });
    renderTableBody(filtered);
}

// Đặt chỗ
function renderTableReservation() {
    pageTitle.innerText = "Bàn & Đặt chỗ";
    
    const pending = reservations.filter(r => r.status === 'pending');
    
    content.innerHTML = `
        <div class="dual-layout">
            <div class="layout-left">
                <div class="page-header"><h3><i class="fas fa-th"></i> Sơ đồ bàn</h3></div>
                <div class="table-grid">
                    ${tables.map(t => `
                        <div class="table-box ${t.reserved ? 'reserved' : 'available'}">
                            <h4>${t.name}</h4>
                            <p>${t.seats} ghế</p>
                            ${t.reserved 
                                ? `<small style="color:#e74c3c; font-weight:bold;">Đang có khách</small>
                                   <button onclick="releaseTable(${t.id})" class="btn-release">Trả bàn (Xong)</button>` 
                                : '<small style="color:#2ecc71; font-weight:bold;">Bàn trống</small>'
                            }
                        </div>
                    `).join('')}
                </div>
            </div>

            <div class="layout-right">
                <div class="page-header">
                    <h3><i class="fas fa-clock"></i> Khách đang chờ (${pending.length})</h3>
                </div>
                
                <div class="reservation-list">
                    ${pending.length > 0 ? pending.map(r => `
                        <div class="reservation-card">
                            <h4>
                                <span>${r.customer}</span>
                                <span style="font-size: 12px; background: #eee; padding: 2px 8px; border-radius: 10px;">
                                    ID: #${r.id}
                                </span>
                            </h4>
                            <p><i class="fas fa-users"></i> Số lượng: <strong>${r.people} người</strong></p>
                            <p><i class="far fa-clock"></i> Giờ hẹn: <strong>${r.time}</strong></p>
                            <p><i class="fas fa-phone"></i> SĐT: ${r.phone}</p>
                            
                            <div class="btn-group">
                                <button onclick="confirmReservation(${r.id})" class="btn-green" style="flex: 2;">
                                    Xếp bàn ngay
                                </button>
                                <button onclick="rejectReservation(${r.id})" class="btn-red" style="flex: 1;">
                                    Hủy
                                </button>
                            </div>
                        </div>
                    `).join('') : `
                        <div style="text-align:center; padding: 40px; color: #999;">
                            <i class="fas fa-check-circle fa-3x"></i>
                            <p style="margin-top:10px;">Hiện tại không có khách chờ</p>
                        </div>
                    `}
                </div>
            </div>
        </div>
    `;
}

window.confirmReservation = function(id) {
    // 1. Tìm đơn đặt
    const res = reservations.find(r => r.id === id);
    
    // 2. Tìm bàn trống phù hợp (Logic đơn giản: lấy bàn trống đầu tiên)
    const availableTable = tables.find(t => !t.reserved && t.seats >= res.people);
    
    if (!availableTable) {
        alert("Không còn bàn trống phù hợp cho " + res.people + " người!");
        return;
    }

    // 3. Cập nhật dữ liệu
    res.status = "confirmed";
    res.tableId = availableTable.id;
    availableTable.reserved = true;

    // 4. Render lại
    alert(`Đã xếp ${res.customer} vào ${availableTable.name}`);
    renderTableReservation();
}

window.releaseTable = function(tableId) {
    if (confirm("Xác nhận khách đã thanh toán và dọn bàn xong?")) {

        const table = tables.find(t => t.id === tableId);
        if (table) table.reserved = false;

        reservations.forEach(r => {
            if (r.tableId === tableId && r.status === 'confirmed') {
                r.status = 'completed'; 
            }
        });

        alert("Đã giải phóng " + table.name);
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
    const res = reservations.find(r => r.id === resId);
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
        // Logic cập nhật trạng thái đặt bàn
        res.customer = document.getElementById("custName").value;
        res.people = document.getElementById("custPeople").value;
        res.status = 'confirmed';
        renderTableReservation(); // Load lại sơ đồ bàn
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
    pageTitle.innerText = "Quản lý Nhân sự";
    let html = `
        <div class="page-header"><button class="btn-green">+ Thêm nhân viên</button></div>
        <table>
            <thead><tr><th>Tên</th><th>Chức vụ</th><th>Trạng thái</th></tr></thead>
            <tbody>
                ${staffs.map(s => `<tr><td>${s.name}</td><td>${s.role}</td><td><span class="status-badge active">${s.status}</span></td></tr>`).join('')}
            </tbody>
        </table>
    `;
    content.innerHTML = html;
}
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