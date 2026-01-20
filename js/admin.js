const content = document.getElementById("content");
const pageTitle = document.getElementById("page-title");

// Dữ liệu ảo
let tenants = [
    { id: 1, name: "Phố Biển", owner: "Nguyễn Văn A", email: "a@mail.com", status: "Active", aiPlan: "pro" },
    { id: 2, name: "Pizza Home", owner: "Trần Thị B", email: "b@mail.com", status: "Pending", aiPlan: "free" },
    { id: 3, name: "Se Restaurant", owner: "Lê Minh Nhựt", email: "minhnhut@mail.com", status: "Pending", aiPlan: "plus" }
];
let systemStats = { revenue: 150000000, tenants: 45, users: 120 };

let users = [
    { id: 101, name: "Nguyễn Văn A", restaurant: "Phố Biển", email: "a@mail.com", plan: "monthly", startDate: "2023-10-01", paymentStatus: "paid" },
    { id: 102, name: "Trần Thị B", restaurant: "Pizza Home", email: "b@mail.com", plan: "yearly", startDate: "2023-05-15", paymentStatus: "paid" },
    { id: 103, name: "Lê Minh C", restaurant: "Chưa có", email: "c@mail.com", plan: "trial", startDate: "2023-10-20", paymentStatus: "unpaid" },
    { id: 104, name: "Lê Văn D", restaurant: "Quán Bụi", email: "d@mail.com", plan: "monthly", startDate: "2023-08-01", paymentStatus: "unpaid" } 
];

const PLAN_PRICES = {
    'monthly': 299000,
    'quarterly': 799000,
    'yearly': 2500000,
    'trial': 0
};

const AI_PLANS_CONFIG = {
    'free': { model: 'GPT-3.5', tokens: '10k/tháng', speed: 'Thấp', support: 'Cơ bản' },
    'plus': { model: 'GPT-4', tokens: '100k/tháng', speed: 'Nhanh', support: 'Ưu tiên' },
    'pro': { model: 'GPT-4 Turbo', tokens: 'Không giới hạn', speed: 'Siêu tốc', support: '1:1' }
};

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
        // Xác định class màu sắc dựa trên trạng thái hiện tại
        const statusClass = t.status.toLowerCase(); 
        
        html += `
            <tr>
                <td>#${t.id}</td>
                <td><strong>${t.name}</strong></td>
                <td>${t.owner}<br><small style="color:#888">${t.email}</small></td>
                <td>
                    <select onchange="updateTenantStatus(${t.id}, this.value)" class="status-select ${statusClass}">
                        <option value="Active" ${t.status === 'Active' ? 'selected' : ''}>Active</option>
                        <option value="Pending" ${t.status === 'Pending' ? 'selected' : ''}>Pending</option>
                        <option value="Locked" ${t.status === 'Locked' ? 'selected' : ''}>Locked</option>
                    </select>
                </td>
                <td>
                    <button onclick="editTenant(${t.id})" class="btn-gray"><i class="fas fa-pen"></i></button>
                    <button onclick="deleteTenant(${t.id})" class="btn-red"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `;
    });
    html += `</tbody></table>`;
    content.innerHTML = html;
}

function updateTenantStatus(id, newStatus) {
    const tenant = tenants.find(t => t.id === id);
    if (tenant) {
        tenant.status = newStatus;
        
        renderTenants();
        
        // Thông báo (tùy chọn)
        console.log(`Đã cập nhật ID #${id} sang trạng thái: ${newStatus}`);
    }
}

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

//user
function renderGlobalUsers() {
    pageTitle.innerText = "Quản lý Người dùng";
    
    let html = `
        <div class="page-header">
            <input type="text" placeholder="Tìm kiếm người dùng...">
            <button onclick="addUser()" class="btn-green">+ Thêm User</button>
        </div>
        <table class="user-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Người dùng</th>
                    <th>Gói thuê</th>
                    <th>Giá trị</th>
                    <th>Thanh toán</th> <th>Hành động</th>
                </tr>
            </thead>
            <tbody>
    `;

    const today = new Date();

    users.forEach(u => {
        const expiryDateStr = calculateExpiryDate(u.startDate, u.plan);
        const [d, m, y] = expiryDateStr.split('/');
        const expiryDateObj = new Date(`${y}-${m}-${d}`);
        
        const isExpired = expiryDateObj < today;
        const expiredLabel = isExpired ? `<div class="expired-tag">QUÁ HẠN</div>` : '';
        const dateColor = isExpired ? 'color: #d32f2f; font-weight: bold;' : 'color: #555;';

        const rowClass = u.paymentStatus === 'paid' ? 'row-paid' : 'row-unpaid';

        html += `
            <tr class="${rowClass}">
                <td>#${u.id}</td>
                <td>
                    <strong>${u.name}</strong><br>
                    <small>${u.email}</small>
                    <div style="font-size:11px; color:#666; margin-top:2px;">${u.restaurant}</div>
                </td>
                <td>
                    <select onchange="updateUserPlan(${u.id}, this.value)" class="plan-select ${u.plan}" style="margin-bottom:5px;">
                        <option value="monthly" ${u.plan === 'monthly' ? 'selected' : ''}>Theo Tháng</option>
                        <option value="quarterly" ${u.plan === 'quarterly' ? 'selected' : ''}>Theo Quý</option>
                        <option value="yearly" ${u.plan === 'yearly' ? 'selected' : ''}>Theo Năm</option>
                        <option value="trial" ${u.plan === 'trial' ? 'selected' : ''}>Dùng thử</option>
                    </select>
                    
                    <div style="font-size:11px; line-height: 1.4;">
                        Start: ${formatDate(u.startDate)} <br>
                        <span style="${dateColor}">End: ${expiryDateStr} ${expiredLabel}</span>
                    </div>
                </td>
                
                <td>
                    <strong style="font-size:15px; color:#2c3e50;">
                        ${PLAN_PRICES[u.plan].toLocaleString('vi-VN')}đ
                    </strong>
                </td>

                <td>
                    <select onchange="updatePaymentStatus(${u.id}, this.value)" class="payment-select ${u.paymentStatus}">
                        <option value="paid" ${u.paymentStatus === 'paid' ? 'selected' : ''}>Đã thanh toán</option>
                        <option value="unpaid" ${u.paymentStatus === 'unpaid' ? 'selected' : ''}>Chưa thanh toán</option>
                    </select>
                </td>

                <td>
                    <button onclick="editUser(${u.id})" class="btn-gray"><i class="fas fa-pen"></i></button>
                    <button onclick="deleteUser(${u.id})" class="btn-red"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `;
    });

    html += `</tbody></table>`;
    content.innerHTML = html;
}

function updateUserPlan(id, newPlan) {
    const user = users.find(u => u.id === id);
    if (user) {
        user.plan = newPlan;
        user.startDate = new Date().toISOString().split('T')[0]; 
        
        renderGlobalUsers();
        console.log(`User #${id} đã đổi sang gói: ${newPlan}`);
    }
}

function calculateExpiryDate(startDateStr, plan) {
    const date = new Date(startDateStr);
    
    if (plan === 'monthly') date.setMonth(date.getMonth() + 1);
    else if (plan === 'quarterly') date.setMonth(date.getMonth() + 3);
    else if (plan === 'yearly') date.setFullYear(date.getFullYear() + 1);
    else if (plan === 'trial') date.setDate(date.getDate() + 7);
    
    return formatDate(date.toISOString().split('T')[0]);
}

function formatDate(dateStr) {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
}

function getPlanLabel(plan) {
    const map = {
        'monthly': 'Theo Tháng',
        'quarterly': 'Theo Quý',
        'yearly': 'Theo Năm',
        'trial': 'Dùng thử'
    };
    return map[plan] || plan;
}

function deleteUser(id) {
    if(confirm("Bạn có chắc muốn xóa người dùng này?")) {
        users = users.filter(u => u.id !== id);
        renderGlobalUsers();
    }
}

function editUser(id) {
    alert(`Tính năng chỉnh sửa user ID: ${id} đang phát triển modal.`);
}

function addUser() {
    alert("Tính năng thêm user đang phát triển.");
}

function updatePaymentStatus(id, newStatus) {
    const user = users.find(u => u.id === id);
    if (user) {
        user.paymentStatus = newStatus;
        renderGlobalUsers();
    }
}

function renderAIConfig() {
    pageTitle.innerText = "Cấu hình AI & Cấp phát tài nguyên";
    
    let html = `
        <div class="page-header">
            <div class="ai-stats-group">
                <div class="ai-stat-card">
                    <span>Free Users</span>
                    <strong>${tenants.filter(t => t.aiPlan === 'free').length}</strong>
                </div>
                <div class="ai-stat-card">
                    <span>Plus Users</span>
                    <strong>${tenants.filter(t => t.aiPlan === 'plus').length}</strong>
                </div>
                <div class="ai-stat-card">
                    <span>Pro Users</span>
                    <strong>${tenants.filter(t => t.aiPlan === 'pro').length}</strong>
                </div>
            </div>
            <input type="text" placeholder="Tìm kiếm nhà hàng để cấp phát...">
        </div>

        <table>
            <thead>
                <tr>
                    <th>Nhà hàng</th>
                    <th>Gói AI hiện tại</th>
                    <th>Cấu hình chi tiết (Preview)</th>
                    <th>Trạng thái AI</th>
                </tr>
            </thead>
            <tbody>
    `;

    tenants.forEach(t => {
        const config = AI_PLANS_CONFIG[t.aiPlan];

        html += `
            <tr>
                <td>
                    <div style="font-weight:bold; font-size:14px;">${t.name}</div>
                    <div style="font-size:12px; color:#888;">ID: #${t.id}</div>
                </td>
                <td>
                    <select onchange="updateAIPlan(${t.id}, this.value)" class="ai-select ${t.aiPlan}">
                        <option value="free" ${t.aiPlan === 'free' ? 'selected' : ''}>Gói Free</option>
                        <option value="plus" ${t.aiPlan === 'plus' ? 'selected' : ''}>Gói Plus</option>
                        <option value="pro" ${t.aiPlan === 'pro' ? 'selected' : ''}>Gói Pro</option>
                    </select>
                </td>
                <td>
                    <div class="ai-specs">
                        <span class="spec-tag"><i class="fas fa-brain"></i> ${config.model}</span>
                        <span class="spec-tag"><i class="fas fa-bolt"></i> ${config.speed}</span>
                        <span class="spec-tag"><i class="fas fa-coins"></i> ${config.tokens}</span>
                    </div>
                </td>
                <td>
                   <div style="display:flex; align-items:center; gap:5px;">
                        <div class="status-dot ${t.status === 'Active' ? 'online' : 'offline'}"></div>
                        <span style="font-size:12px; color:#555;">${t.status === 'Active' ? 'Sẵn sàng' : 'Tạm dừng'}</span>
                   </div>
                </td>
            </tr>
        `;
    });

    html += `</tbody></table>`;
    content.innerHTML = html;
}

function updateAIPlan(id, newPlan) {
    const tenant = tenants.find(t => t.id === id);
    if (tenant) {
        tenant.aiPlan = newPlan;
        renderAIConfig();
        // ---API---
        console.log(`Đã cấp gói AI [${newPlan}] cho nhà hàng ${tenant.name}`);
    }
}