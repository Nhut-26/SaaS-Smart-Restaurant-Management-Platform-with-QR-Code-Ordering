const content = document.getElementById("content");
const pageTitle = document.getElementById("page-title");


const SUPABASE_URL = "https://vhjxxgajenkzuykkqloi.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZoanh4Z2FqZW5renV5a2txbG9pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0OTgyMjIsImV4cCI6MjA4MzA3NDIyMn0.l04T4IY-2mdFTvVhksDBmL5buErB1Pfa97GQOgRVtCg";

const db = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);
document.addEventListener("DOMContentLoaded", () => {
  checkAuth();
  setupNavigation();
  renderSystemDashboard();
});

async function checkAuth() {
  const { data: { session } } = await db.auth.getSession();

  if (!session) {
   window.location.href = "../Login/login.html";

    return;
  }

  const adminNameEl = document.getElementById("adminName");
  if (adminNameEl) {
    adminNameEl.innerText =
      session.user.user_metadata?.full_name || session.user.email;
  }
}

const logoutBtn = document.getElementById("logout-btn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    await db.auth.signOut();
    window.location.href = "../login.html";
  });
}



// Dữ liệu ảo
let tenants = [
    { id: 1, name: "Phố Biển", owner: "Nguyễn Văn A", email: "a@mail.com", status: "Active", aiPlan: "pro" },
    { id: 2, name: "Pizza Home", owner: "Trần Thị B", email: "b@mail.com", status: "Pending", aiPlan: "free" },
    { id: 3, name: "Se Restaurant", owner: "Lê Minh Nhựt", email: "minhnhut@mail.com", status: "Pending", aiPlan: "plus" }
];
let systemStats = { revenue: 150000000, tenants: 45, users: 120 };

let users = [];

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



function setupNavigation() {
    const menuItems = document.querySelectorAll(".menu-item");
    menuItems.forEach(item => {
        item.addEventListener("click", () => {
            menuItems.forEach(i => i.classList.remove("active"));
            item.classList.add("active");
            
            const page = item.dataset.page;
            if (page === "dashboard") renderSystemDashboard();
            if (page === "tenants") fetchAndRenderRestaurants();
            if (page === "users") fetchAndRenderUsers();
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

// Nhà hàng

async function fetchAndRenderRestaurants() {
    pageTitle.innerText = "Đang tải dữ liệu nhà hàng...";
    
    try {
        const { data, error } = await db
            .from('restaurants') 
            .select(`
                *,
                tenants (
                    name,
                    email
                )
            `)
            .order('name', { ascending: true });

        if (error) throw error;

        restaurants = data || [];
        renderRestaurants(); 

    } catch (err) {
        console.error("Lỗi tải data:", err);
        content.innerHTML = `<div class="error-msg">Lỗi: ${err.message}</div>`;
    }
}

function renderRestaurants() {
    pageTitle.innerText = "Quản lý Đối tác (Nhà hàng)";

    let html = `
        <div class="page-header">
            <input type="text" placeholder="Tìm nhà hàng, chủ sở hữu..." onkeyup="filterRestaurants(this.value)">
            <button onclick="syncFromGoogleForm()" class="btn-green"><i class="fas fa-sync"></i> Đồng bộ Google Form</button>
        </div>
        <table class="user-table">
            <thead>
                <tr>
                    <th style="width: 25%;">Thông tin Nhà hàng</th>
                    <th style="width: 15%;">Loại hình</th>  <th style="width: 15%;">Mức giá</th>    <th style="width: 10%; text-align: center;">Trạng thái</th>
                    <th style="width: 20%;">Xét duyệt / Khóa</th>
                    <th style="width: 15%; text-align: right;">Thao tác</th>
                </tr>
            </thead>
            <tbody>
    `;

    if (!restaurants || restaurants.length === 0) {
        html += `<tr><td colspan="6" style="text-align:center; padding: 20px;">Chưa có dữ liệu nhà hàng.</td></tr>`;
    } else {
        restaurants.forEach(r => {
            const rId = r.id;
            const rName = r.name || "Chưa đặt tên";
            const rCuisine = r.cuisine_type || "<span style='color:#bbb'>--</span>";
            const rPrice = r.price_range || "<span style='color:#bbb'>--</span>";

            const rStatus = r.status || 'Pending';
            
            const tenantInfo = r.tenants || {}; 
            const tOwner = tenantInfo.name || "Unknown";
            const tEmail = tenantInfo.email || "";

            // Xử lý giao diện trạng thái
            let rowStyle = "";
            let badgeHtml = "";
            
            if (rStatus === 'Active') {
                rowStyle = "background-color: #e8f8f5;"; 
                badgeHtml = `<span style="background:#27ae60; color:white; padding:5px 10px; border-radius:15px; font-size:11px; font-weight:bold;">Active</span>`;
            } else if (rStatus === 'Locked') {
                rowStyle = "background-color: #fce4ec;"; 
                badgeHtml = `<span style="background:#c0392b; color:white; padding:5px 10px; border-radius:15px; font-size:11px; font-weight:bold;">Locked</span>`;
            } else {
                rowStyle = "";
                badgeHtml = `<span style="background:#f39c12; color:white; padding:5px 10px; border-radius:15px; font-size:11px; font-weight:bold;">Pending</span>`;
            }

            html += `
            <tr style="${rowStyle} transition: background-color 0.3s;">
                <td>
                    <strong style="font-size: 15px; color: #2c3e50;">${rName}</strong><br>
                    <div style="margin-top: 5px; color: #555; font-size: 12px;">
                        <i class="fas fa-user-tie"></i> ${tOwner} <br>
                        <i class="fas fa-envelope"></i> ${tEmail}
                    </div>
                </td>
                
                <td style="font-size: 14px; color: #444;">${rCuisine}</td>

                <td style="font-size: 14px; color: #444;">${rPrice}</td>

                <td style="text-align: center; vertical-align: middle;">
                    ${badgeHtml}
                </td>

                <td style="vertical-align: middle;">
                    <select onchange="processRestaurantAction('${rId}', this.value)" 
                            style="width: 100%; padding: 6px; border-radius: 4px; border: 1px solid #ddd; font-size: 13px;">
                        <option value="" disabled selected>-- Chọn --</option>
                        <option value="Active" style="color: #27ae60; font-weight:bold;">&#10003; Duyệt</option>
                        <option value="Locked" style="color: #c0392b; font-weight:bold;">&#128274; Khóa</option>
                        <option value="Pending" style="color: #f39c12;">&#8987; Treo</option>
                    </select>
                </td>

                <td style="text-align: right; vertical-align: middle;">
                    <button onclick="editRestaurantInfo('${rId}')" class="btn-gray" title="Sửa thông tin">
                        <i class="fas fa-pen"></i>
                    </button>
                    <button onclick="deleteRestaurant('${rId}')" class="btn-red" title="Xóa">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
            `;
        });
    }

    html += `</tbody></table>`;
    content.innerHTML = html;
}

// --- HÀM XỬ LÝ: STATUS, EDIT, DELETE, SYNC ---

async function processRestaurantAction(id, newStatus) {
    if (!newStatus) return;
    if (!confirm("Bạn muốn thay đổi trạng thái nhà hàng này?")) {
        renderRestaurants(); 
        return;
    }

    const restaurant = restaurants.find(r => r.id === id);
    if (restaurant) {
        restaurant.status = newStatus;
        renderRestaurants(); 
    }

    try {
        const { error } = await db
            .from('restaurants')
            .update({ status: newStatus })
            .eq('id', id);
        if (error) throw error;
    } catch (err) {
        alert("Lỗi cập nhật: " + err.message);
        fetchAndRenderRestaurants(); 
    }
}

async function editRestaurantInfo(id) {
    const r = restaurants.find(item => item.id === id);
    if (!r) return;
    const currentTenant = r.tenants || {};

    // Prompt lấy thông tin (Thêm 2 mục mới)
    const newName = prompt("Tên nhà hàng:", r.name);
    if (newName === null) return;
    
    // Thêm prompt cho Loại hình
    const newCuisine = prompt("Loại hình ẩm thực (VD: Buffet, Lẩu, Cafe...):", r.cuisine_type || "");
    if (newCuisine === null) return;

    // Thêm prompt cho Mức giá
    const newPrice = prompt("Mức giá (VD: 100k - 200k):", r.price_range || "");
    if (newPrice === null) return;

    const newOwner = prompt("Tên chủ sở hữu:", currentTenant.owner);
    if (newOwner === null) return;
    const newEmail = prompt("Email:", currentTenant.email);
    if (newEmail === null) return;

    // Update UI
    r.name = newName;
    r.cuisine_type = newCuisine; // Cập nhật biến local
    r.price_range = newPrice;    // Cập nhật biến local
    if(r.tenants) { r.tenants.owner = newOwner; r.tenants.email = newEmail; }
    
    renderRestaurants();

    // Update DB
    try {
        // Update bảng Restaurants (thêm cuisine_type và price_range)
        await db.from('restaurants').update({ 
            name: newName,
            cuisine_type: newCuisine,
            price_range: newPrice
        }).eq('id', id);

        // Update bảng Tenants
        if (r.tenant_id) {
            await db.from('tenants').update({ owner: newOwner, email: newEmail }).eq('id', r.tenant_id);
        }
        alert("Đã lưu thông tin!");
    } catch (err) {
        alert("Lỗi khi lưu: " + err.message);
        fetchAndRenderRestaurants();
    }
}

async function deleteRestaurant(id) {
    if (!confirm("Bạn có chắc muốn xóa vĩnh viễn?")) return;
    try {
        const { error } = await db.from('restaurants').delete().eq('id', id);
        if (error) throw error;
        restaurants = restaurants.filter(r => r.id !== id);
        renderRestaurants();
    } catch (err) {
        alert("Không thể xóa: " + err.message);
    }
}

async function syncFromGoogleForm() {
    // Logic: Tạo Tenant -> Lấy ID -> Tạo Restaurant
    const API_URL = "https://sheetdb.io/api/v1/lwt1l44qsuwxo";
    const btn = document.querySelector(".btn-green");
    if(btn) btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ...';

    try {
        const response = await fetch(API_URL);
        const sheetData = await response.json();
        let newCount = 0;

        for (const item of sheetData) {
            const email = item["Email"];
            if (!email) continue;
            const exists = restaurants.some(r => r.tenants && r.tenants.email === email);
            
            if (!exists) {
                // Tạo Tenant
                const { data: tenantData, error: tErr } = await db
                    .from('tenants')
                    .insert({ owner: item["Tên chủ sở hữu"] || "Unknown", email: email })
                    .select().single();

                if (!tErr) {
                    // Tạo Restaurant
                    await db.from('restaurants').insert({
                        name: item["Tên nhà hàng"] || "Nhà hàng mới",
                        status: "Pending",
                        tenant_id: tenantData.id,
                        // Mặc định cho 2 cột mới khi sync từ form (vì form chưa có cột này)
                        cuisine_type: "Chưa cập nhật", 
                        price_range: "Chưa cập nhật"
                    });
                    newCount++;
                }
            }
        }
        alert(`Đồng bộ xong! Thêm mới: ${newCount}`);
        fetchAndRenderRestaurants();
    } catch (e) {
        alert("Lỗi kết nối!");
        console.error(e);
        if(btn) btn.innerHTML = '<i class="fas fa-sync"></i> Đồng bộ Google Form';
    }
}

function filterRestaurants(keyword) {
    const term = keyword.toLowerCase();
    const rows = document.querySelectorAll("tbody tr");
    rows.forEach(row => {
        row.style.display = row.innerText.toLowerCase().includes(term) ? "" : "none";
    });
}

//user
async function fetchAndRenderUsers() {
    pageTitle.innerText = "Đang tải dữ liệu...";
    try {
        const { data, error } = await db
            .from('tenants')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        users = data || [];
        renderGlobalUsers();
    } catch (err) {
        console.error("Lỗi tải users:", err);
        content.innerHTML = `<div class="error-msg">Lỗi kết nối: ${err.message}</div>`;
    }
}

function renderGlobalUsers() {
    pageTitle.innerText = "Quản lý Người dùng & Doanh thu";
    
    let html = `
        <div class="page-header">
            <input type="text" placeholder="Tìm kiếm tên, email..." onkeyup="filterUsers(this.value)">
            <button onclick="addUser()" class="btn-green">+ Thêm User</button>
        </div>
        <table class="user-table">
            <thead>
                <tr>
                    <th>Thông tin User</th> <th>Gói Dịch Vụ</th>
                    <th>Giá Trị</th>
                    <th>Thanh Toán</th>
                    <th>Hành động</th>
                </tr>
            </thead>
            <tbody>
    `;

    const today = new Date();

    if (!users || users.length === 0) {
        html += `<tr><td colspan="5" style="text-align:center; padding: 20px;">Chưa có dữ liệu.</td></tr>`;
    } else {
        users.forEach(u => {
            // Lấy ID để xử lý logic (nhưng không hiển thị ra UI)
            const uId = u.id; 
            
            const uName = u.name || "Chưa đặt tên";
            const uEmail = u.email || "No Email";
            // Nếu package trong DB là trial hoặc null, mặc định hiển thị là monthly để tránh lỗi select box
            let uPackage = u.package;
            if (!PLAN_PRICES[uPackage]) uPackage = 'monthly'; 

            const uStatus = u.status || "unpaid";
            
            // Xử lý ngày tháng
            let expiryDateObj;
            let expiryDateStr;

            // Ưu tiên lấy expired_at từ DB
            if (u.expired_at) {
                expiryDateObj = new Date(u.expired_at);
                expiryDateStr = formatDate(expiryDateObj);
            } else {
                // Nếu chưa có thì tính tạm
                expiryDateStr = calculateExpiryDate(new Date(u.created_at || new Date()), uPackage);
                const [d, m, y] = expiryDateStr.split('/');
                expiryDateObj = new Date(`${y}-${m}-${d}`);
            }

            const isExpired = expiryDateObj < today;
            const expiredLabel = isExpired ? `<span class="expired-tag">QUÁ HẠN</span>` : '';
            const dateStyle = isExpired ? 'color:#d32f2f; font-weight:bold;' : 'color:#27ae60; font-weight:bold;';

            const rowClass = uStatus === 'paid' ? 'row-paid' : 'row-unpaid';
            const price = (PLAN_PRICES[uPackage] || 0).toLocaleString('vi-VN');

            html += `
                <tr class="${rowClass}">
                    <td style="max-width: 250px;">
                        <strong>${uName}</strong><br>
                        <small style="color:#666">${uEmail}</small>
                        </td>
                    <td>
                        <select onchange="updateUserPackage('${uId}', this.value)" class="plan-select ${uPackage}">
                            <option value="monthly" ${uPackage === 'monthly' ? 'selected' : ''}>MONTHLY</option>
                            <option value="quarterly" ${uPackage === 'quarterly' ? 'selected' : ''}>QUARTERLY</option>
                            <option value="yearly" ${uPackage === 'yearly' ? 'selected' : ''}>YEARLY</option>
                            </select>
                        <div style="font-size:11px; margin-top:5px; line-height: 1.4;">
                            <span style="${dateStyle}">Hết hạn: ${expiryDateStr} ${expiredLabel}</span>
                        </div>
                    </td>
                    <td><strong style="font-size:15px; color:#2c3e50;">${price}đ</strong></td>
                    <td>
                        <select onchange="updatePaymentStatus('${uId}', this.value)" class="payment-select ${uStatus}">
                            <option value="paid" ${uStatus === 'paid' ? 'selected' : ''}>Đã thanh toán</option>
                            <option value="unpaid" ${uStatus !== 'paid' ? 'selected' : ''}>Chưa thanh toán</option>
                        </select>
                    </td>
                    <td>
                        <button onclick="deleteUser('${uId}')" class="btn-red"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `;
        });
    }

    html += `</tbody></table>`;
    content.innerHTML = html;
}


async function updateUserPackage(id, newPackage) {
    if (!id) {
        alert("Lỗi: Không tìm thấy ID người dùng!");
        return;
    }

    // 1. Tính ngày hết hạn MỚI dựa trên thời điểm hiện tại
    const now = new Date();
    let newExpiryDate = new Date(now);

    // Logic cộng ngày (Đã bỏ trial)
    if (newPackage === 'monthly') {
        newExpiryDate.setMonth(newExpiryDate.getMonth() + 1);
    } else if (newPackage === 'quarterly') {
        newExpiryDate.setMonth(newExpiryDate.getMonth() + 3);
    } else if (newPackage === 'yearly') {
        newExpiryDate.setFullYear(newExpiryDate.getFullYear() + 1);
    } else {
        // Fallback: Nếu lỗi thì mặc định 1 tháng để tránh crash
        newExpiryDate.setMonth(newExpiryDate.getMonth() + 1);
    }

    const expiryISOString = newExpiryDate.toISOString();

    // 2. Cập nhật UI ngay lập tức
    const user = users.find(u => u.id === id);
    if (user) {
        user.package = newPackage;
        user.expired_at = expiryISOString;
        renderGlobalUsers();
    }

    // 3. Gửi lên Supabase
    try {
        const { error } = await db
            .from('tenants')
            .update({ 
                package: newPackage,
                expired_at: expiryISOString 
            })
            .eq('id', id);

        if (error) throw error;
        console.log(`Đã lưu gói mới cho user ${id}`);
    } catch (err) {
        alert(`Lỗi khi lưu dữ liệu: ${err.message}`);
        fetchAndRenderUsers(); // Tải lại data gốc nếu lỗi
    }
}

async function updatePaymentStatus(id, newStatus) {
    const user = users.find(u => u.id === id);
    if (user) {
        user.status = newStatus;
        renderGlobalUsers();
    }
    const { error } = await db.from('tenants').update({ status: newStatus }).eq('id', id);
    if (error) {
        alert("Lỗi cập nhật trạng thái!");
        fetchAndRenderUsers();
    }
}

async function deleteUser(id) {
    if (!confirm("Bạn có chắc muốn xóa vĩnh viễn user này?")) return;
    const { error } = await db.from('tenants').delete().eq('id', id);
    if (error) alert("Không xóa được!");
    else {
        alert("Đã xóa thành công!");
        fetchAndRenderUsers();
    }
}


function formatDate(dateObj) {
    if (!dateObj || isNaN(dateObj.getTime())) return "N/A";
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();
    return `${day}/${month}/${year}`;
}

function calculateExpiryDate(startDateObj, plan) {
    // Hàm này chỉ dùng để hiển thị nếu DB chưa có expired_at
    const date = new Date(startDateObj.getTime());
    if (isNaN(date.getTime())) return formatDate(new Date());

    if (plan === 'monthly') date.setMonth(date.getMonth() + 1);
    else if (plan === 'quarterly') date.setMonth(date.getMonth() + 3);
    else if (plan === 'yearly') date.setFullYear(date.getFullYear() + 1);
    // Mặc định trả về 1 tháng nếu không khớp
    else date.setMonth(date.getMonth() + 1);
    
    return formatDate(date);
}

function filterUsers(keyword) {
    const term = keyword.toLowerCase();
    const rows = document.querySelectorAll(".user-table tbody tr");
    rows.forEach(row => {
        const text = row.innerText.toLowerCase();
        row.style.display = text.includes(term) ? "" : "none";
    });
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