// DOM ELEMENTS
const content = document.getElementById("content");
const menuItems = document.querySelectorAll(".menu-item");
const pageTitle = document.getElementById("page-title");

// MOCK DATA CHO HỆ THỐNG SAAS (ADMIN)
let tenants = [
  { id: 1, name: "Nhà hàng Phố Biển", owner: "Nguyễn Văn A", email: "phobien@gmail.com", status: "Active", joinDate: "2024-01-10", plan: "Premium" },
  { id: 2, name: "Pizza Home", owner: "Trần Thị B", email: "pizzahome@gmail.com", status: "Pending", joinDate: "2024-01-12", plan: "Basic" },
  { id: 3, name: "Sushi World", owner: "Lê Văn C", email: "sushiworld@gmail.com", status: "Active", joinDate: "2024-01-15", plan: "Enterprise" }
];

let globalUsers = [
  { id: 1, name: "Admin_Master", role: "Super Admin", lastLogin: "2024-01-20 08:30" },
  { id: 2, name: "Manager_Phobien", role: "Restaurant Manager", lastLogin: "2024-01-20 09:15" },
  { id: 3, name: "Staff_Pizzahome", role: "Staff", lastLogin: "2024-01-19 18:00" }
];

let systemStats = {
  totalRevenue: 150000000,
  totalTenants: 45,
  activeUsers: 120,
  aiQueries: 1500
};

// INITIAL RENDER
document.addEventListener("DOMContentLoaded", () => {
  renderSystemDashboard(); // Mặc định vào trang tổng quan
});

// SIDEBAR NAVIGATION
menuItems.forEach(item => {
  item.addEventListener("click", () => {
    menuItems.forEach(i => i.classList.remove("active"));
    item.classList.add("active");
    const page = item.dataset.page;

    if (page === "dashboard") renderSystemDashboard();
    if (page === "tenants") renderTenants();
    if (page === "users") renderGlobalUsers();
    if (page === "ai-config") renderAIConfig();
  });
});

// 1. TRANG TỔNG QUAN HỆ THỐNG
function renderSystemDashboard() {
  pageTitle.innerText = "Tổng quan hệ thống S2O";
  content.innerHTML = `
    <div class="finance-summary">
      <div class="summary">
        <p>Tổng doanh thu SaaS</p>
        <h3>${systemStats.totalRevenue.toLocaleString()}đ</h3>
      </div>
      <div class="summary">
        <p>Tổng nhà hàng (Tenants)</p>
        <h3>${systemStats.totalTenants}</h3>
      </div>
      <div class="summary">
        <p>Người dùng hoạt động</p>
        <h3>${systemStats.activeUsers}</h3>
      </div>
      <div class="summary">
        <p>AI Requests</p>
        <h3>${systemStats.aiQueries}</h3>
      </div>
    </div>
    <div style="margin-top: 20px;">
      <h4>Biểu đồ tăng trưởng (Placeholder cho Chart.js)</h4>
      <div style="height: 200px; background: #eee; display:flex; align-items:center; justify-content:center; border-radius:10px;">
        [Biểu đồ doanh thu toàn hệ thống]
      </div>
    </div>
  `;
}

// 2. QUẢN LÝ NHÀ HÀNG (TENANT) - Quan trọng nhất của Admin
function renderTenants() {
  pageTitle.innerText = "Quản lý đối tác Nhà hàng";
  let html = `
    <div class="page-header">
      <input type="text" placeholder="Tìm kiếm nhà hàng">
      <button onclick="addTenantManual()">+ Thêm nhà hàng</button>
      <button onclick="syncFromGoogleForm()" style="background-color: #27ae60;">
        <i class="fab fa-google"></i> Duyệt từ Google Form
      </button>
    </div>
    <table>
      <tr>
        <th>ID</th>
        <th>Nhà hàng</th>
        <th>Chủ sở hữu</th>
        <th>Trạng thái</th>
        <th>Chỉnh sửa</th>
      </tr>
  `;

  tenants.forEach(t => {
    html += `
      <tr>
        <td>#${t.id}</td>
        <td><strong>${t.name}</strong></td>
        <td>${t.owner}<br><small>${t.email}</small></td>
        <td><span class="status-badge ${t.status.toLowerCase()}">${t.status}</span></td>
        <td>
          <button onclick="editTenant(${t.id})"><i class="fas fa-edit"></i> Sửa</button>
          <button onclick="deleteTenant(${t.id})" class="btn-red"><i class="fas fa-trash"></i> Xóa</button>
          <button onclick="toggleTenantStatus(${t.id})" class="btn-toggle">Khóa/Mở</button>
        </td>
      </tr>
    `;
  });

  html += "</table>";
  content.innerHTML = html;
}

function deleteTenant(id) {
    if (confirm("Bạn có chắc chắn muốn xóa nhà hàng này? Dữ liệu tenant sẽ bị mất vĩnh viễn!")) {
        tenants = tenants.filter(t => t.id !== id);
        renderTenants();
    }
}

function editTenant(id) {
    const t = tenants.find(item => item.id === id);
    const newName = prompt("Nhập tên nhà hàng mới:", t.name);
    const newOwner = prompt("Nhập tên chủ sở hữu mới:", t.owner);

    if (newName && newOwner) {
        t.name = newName;
        t.owner = newOwner;
        alert("Cập nhật thành công!");
        renderTenants();
    }
}

function addTenantManual() {
    const name = prompt("Nhập tên nhà hàng:");
    const owner = prompt("Nhập tên chủ sở hữu:");
    const email = prompt("Nhập email liên hệ:");

    if (name && owner && email) {
        const newId = tenants.length > 0 ? tenants[tenants.length - 1].id + 1 : 1;
        tenants.push({
            id: newId,
            name: name,
            owner: owner,
            email: email,
            status: "Active",
            joinDate: new Date().toISOString().split('T')[0]
        });
        renderTenants();
    }
}

async function syncFromGoogleForm() {
    const API_URL = "https://sheetdb.io/api/v1/lwt1l44qsuwxo"; 
    
    try {
        alert("Đang đồng bộ dữ liệu từ Google Form...");
        const response = await fetch(API_URL);
        const data = await response.json();
        
        data.forEach(item => {
            // Kiểm tra theo Email để tránh trùng lặp nhà hàng
            const isExist = tenants.some(t => t.email === item["Email"]);
            
            if (!isExist) {
                tenants.push({
                    id: tenants.length + 1,
                    name: item["Tên nhà hàng"] || "Nhà hàng mới", // Tên cột phải khớp 100% trong Excel
                    owner: item["Tên chủ sở hữu"] || "Chưa rõ",
                    email: item["Email"],
                    status: "Pending", // Mặc định là chờ duyệt
                    joinDate: new Date().toISOString().split('T')[0]
                });
            }
        });
        
        //Cập nhật lại giao diện
        renderTenants();
        alert("Đồng bộ thành công! Có " + data.length + " yêu cầu từ Form.");
        
    } catch (error) {
        console.error("Lỗi:", error);
        alert("Không thể kết nối với Google Sheets. Hãy kiểm tra lại API ID.");
    }
}

// 3. QUẢN LÝ NGƯỜI DÙNG TOÀN HỆ THỐNG (Khớp ảnh mẫu ban đầu)
function renderGlobalUsers() {
  pageTitle.innerText = "Quản lý tài khoản & Phân quyền";
  let html = `
    <div class="page-header">
      <button onclick="alert('Import Excel')">Import Excel</button>
      <button onclick="alert('Export Excel')">Export Excel</button>
    </div>
    <table>
      <tr>
        <th>Tên tài khoản</th>
        <th>Vai trò</th>
        <th>Lần đăng nhập cuối</th>
        <th>Hành động</th>
      </tr>
  `;

  globalUsers.forEach(u => {
    html += `
      <tr>
        <td>${u.name}</td>
        <td>${u.role}</td>
        <td>${u.lastLogin}</td>
        <td>
          <button onclick="alert('Xem chi tiết user')">Chi tiết</button>
          <button style="color:red">Xóa</button>
        </td>
      </tr>
    `;
  });

  html += "</table>";
  content.innerHTML = html;
}

// 4. CẤU HÌNH AI (Đúng yêu cầu gói 5)
function renderAIConfig() {
  pageTitle.innerText = "Cấu hình module AI thông minh";
  content.innerHTML = `
  <div class="recommendation">
    <h4>Tham số thuật toán Recommendation</h4>
    <div style="margin: 15px 0;">
      <label>Độ ưu tiên khoảng cách (m): </label>
      <input type="number" value="2000" style="width: 100px;">
    </div>
    <div style="margin: 15px 0;">
      <label>Trọng số đánh giá (Rating weight): </label>
      <input type="range" min="0" max="1" step="0.1" value="0.7">
    </div>
  </div>
  <div class="status">
    <h4>Trạng thái AI Chatbot</h4>
    <p>Model: GPT-4o / RAG System</p>
    <p>Trạng thái: <span style="color:green">Đang hoạt động</span></p>
    <button onclick="alert('Đã gửi yêu cầu train lại model với dữ liệu mới')">Train lại model</button>
  </div>
  `;
}

// CÁC HÀM XỬ LÝ LOGIC
function toggleTenantStatus(id) {
  const tenant = tenants.find(t => t.id === id);
  tenant.status = tenant.status === 'Active' ? 'Locked' : 'Active';
  renderTenants();
}

// Đảm bảo các dòng này nằm ở đầu hoặc cuối file admin.js
window.onload = () => {
    renderSystemDashboard(); 
};