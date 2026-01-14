const content = document.getElementById("content");
const pageTitle = document.getElementById("page-title");

// Dữ liệu ảo
let tenants = [
    { id: 1, name: "Phố Biển", owner: "Nguyễn Văn A", email: "a@mail.com", status: "Active" },
    { id: 2, name: "Pizza Home", owner: "Trần Thị B", email: "b@mail.com", status: "Pending" }
];
let systemStats = { revenue: 150000000, tenants: 45, users: 120 };

// Load
document.addEventListener("DOMContentLoaded", () => {
    setupNavigation();
    renderSystemDashboard();
});

function setupNavigation() {
    const menuItems = document.querySelectorAll(".menu-item");
    menuItems.forEach(item => {
        item.addEventListener("click", () => {
            menuItems.forEach(i => i.classList.remove("active"));
            item.classList.add("active");
            
            const  page = item.dataset.page;
            if (page === "dashboard") renderSystemDashboard();
            if (page === "tenants") renderTenants();
            if (page === "users") renderGlobalUsers();
            if (page === "ai-config") renderAIConfig();
        });
    });
}

// Thống kê
function renderSystemDashboard() {
    pageTitle.innerText = "Tổng quan hệ thống";
    content.innerHTML = `
        <div class="finance-summary">
            <div class="summary">
                <p>Tổng doanh thu SaaS</p>
                <h3>${systemStats.revenue.toLocaleString()}đ</h3>
            </div>
            <div class="summary">
                <p>Tổng đối tác</p>
                <h3>${systemStats.tenants}</h3>
            </div>
            <div class="summary">
                <p>Người dùng Active</p>
                <h3>${systemStats.users}</h3>
            </div>
        </div>
        <div style="background:white; padding:20px; border-radius:12px; height:300px; display:flex; align-items:center; justify-content:center; color:#999; border: 2px dashed #ddd;">
            [Biểu đồ tăng trưởng hệ thống sẽ hiển thị ở đây]
        </div>
    `;
}

// Đối tác
function renderTenants() {
    pageTitle.innerText = "Quản lý Đối tác";
    let html = `
        <div class="page-header">
            <input type="text" placeholder="Tìm kiếm nhà hàng...">
            <div style="display:flex; gap:10px;">
                <button onclick="addTenantManual()" class="btn-green">+ Thêm mới</button>
                <button onclick="syncFromGoogleForm()" style="background:#f39c12"><i class="fab fa-google"></i> Duyệt Form</button>
            </div>
        </div>
        <table>
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Nhà hàng</th>
                    <th>Chủ sở hữu</th>
                    <th>Trạng thái</th>
                    <th>Hành động</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    tenants.forEach(t => {
        html += `
            <tr>
                <td>#${t.id}</td>
                <td><strong>${t.name}</strong></td>
                <td>${t.owner}<br><small style="color:#888">${t.email}</small></td>
                <td><span class="status-badge ${t.status.toLowerCase()}">${t.status}</span></td>
                <td>
                    <button onclick="editTenant(${t.id})" class="btn-gray"><i class="fas fa-pen"></i></button>
                    <button onclick="deleteTenant(${t.id})" class="btn-red"><i class="fas fa-trash"></i></button>
                    <button onclick="toggleStatus(${t.id})" style="background:#34495e"><i class="fas fa-lock"></i></button>
                </td>
            </tr>
        `;
    });
    html += `</tbody></table>`;
    content.innerHTML = html;
}

// Load file gg form vào danh sách đối tác đăng kí
async function syncFromGoogleForm() {
    const API_URL = "https://sheetdb.io/api/v1/lwt1l44qsuwxo"; 
    try {
        const btn = event.target;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang tải...';
        
        const response = await fetch(API_URL);
        const data = await response.json();
        
        let count = 0;
        data.forEach(item => {
            if (!tenants.some(t => t.email === item["Email"])) {
                tenants.push({
                    id: tenants.length + 1,
                    name: item["Tên nhà hàng"] || "No Name",
                    owner: item["Tên chủ sở hữu"] || "Unknown",
                    email: item["Email"],
                    status: "Pending"
                });
                count++;
            }
        });
        
        renderTenants();
        alert(`Đã đồng bộ thành công! Tìm thấy ${count} nhà hàng mới.`);
    } catch (e) {
        alert("Lỗi kết nối API Google Sheets!");
        console.error(e);
    }
}

function addTenantManual() {}
function deleteTenant(id) {}
function toggleStatus(id) {}
function renderGlobalUsers() { content.innerHTML = "<p>Tính năng Users đang cập nhật...</p>"; }
function renderAIConfig() { content.innerHTML = "<p>Tính năng AI Config đang cập nhật...</p>"; }