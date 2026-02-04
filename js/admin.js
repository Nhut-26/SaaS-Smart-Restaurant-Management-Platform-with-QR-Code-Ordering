const content = document.getElementById("content");
const pageTitle = document.getElementById("page-title");


const SUPABASE_URL = "https://vhjxxgajenkzuykkqloi.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZoanh4Z2FqZW5renV5a2txbG9pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0OTgyMjIsImV4cCI6MjA4MzA3NDIyMn0.l04T4IY-2mdFTvVhksDBmL5buErB1Pfa97GQOgRVtCg";

const db = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);
(async () => {
    const { data: { session }, error } = await db.auth.getSession();

    if (error || !session) {
        window.location.replace("../Login/loginAdmin.html");
        return;
    }
})();
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

// Cấu hình các gói AI theo yêu cầu mới
const AI_PLANS_CONFIG = {
    'basic': {
        model: 'GPT 1',
        speed: 'Chậm',
        price: '20.000đ/tháng',
        desc: 'Truyền tải chậm'
    },
    'plus': {
        model: 'GPT 2',
        speed: 'Nhanh',
        price: '40.000đ/tháng',
        desc: 'Truyền tải nhanh'
    },
    'pro': {
        model: 'GPT 3',
        speed: 'Siêu tốc',
        price: '55.000đ/tháng',
        desc: 'Nhanh nhất'
    },
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
let dashboardTenants = [];
let dashboardRestaurants = [];

// Thống kê
function renderSystemDashboard() {
    pageTitle.innerText = "Tổng quan hệ thống";

    fetchDashboardData().then(() => {
        const kpi = calculateDashboardKPIs();

        content.innerHTML = `
    <div class="finance-summary">
        <div class="summary">
            <p>Tổng doanh thu SaaS</p>
            <h3>${kpi.totalRevenue.toLocaleString()}đ</h3>
        </div>

        <div class="summary">
            <p>Doanh thu tháng này</p>
            <h3>${kpi.monthlyRevenue.toLocaleString()}đ</h3>
        </div>

        <div class="summary">
            <p>Tổng đối tác</p>
            <h3>${kpi.totalTenants}</h3>
        </div>

        <div class="summary">
            <p>User Active</p>
            <h3>${kpi.activeUsers}</h3>
        </div>

        <div class="summary">
            <p>Đối tác ngưng hoạt động</p>
            <h3>${kpi.inactiveUsers}</h3>
        </div>

        <div class="summary">
            <p>Nhà hàng đang online</p>
            <h3>${kpi.activeRestaurants}</h3>
        </div>

        <!-- ROW 50 / 50 -->
        <div class="dashboard-row">
            <div class="card">
                <h3>📊 Doanh thu theo tháng</h3>
                <div class="chart-box">
                    <canvas id="revenueChart"></canvas>
                </div>
            </div>

            ${renderExpiringTenantsTable()}
        </div>
    </div>
`;
        renderRevenueChart();
    });
}

async function fetchDashboardData() {
    try {
        // 1️⃣ Lấy tenants
        const { data: tenants, error: tError } = await db
            .from("tenants")
            .select("id, name,  status, package, created_at");
        if (tError) throw tError;

        // 2️⃣ Lấy restaurants
        const { data: restaurants, error: rError } = await db
            .from("restaurants")
            .select("id, name, status");

        if (rError) throw rError;

        dashboardTenants = tenants || [];
        dashboardRestaurants = restaurants || [];

        console.log("✅ DASHBOARD TENANTS:", dashboardTenants);
        console.log("✅ DASHBOARD RESTAURANTS:", dashboardRestaurants);

    } catch (err) {
        console.error("❌ Lỗi tải dashboard data:", err.message);
    }
}
function calculateDashboardKPIs() {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let totalRevenue = 0;
    let monthlyRevenue = 0;
    let activeUsers = 0;
    let inactiveUsers = 0;

    dashboardTenants.forEach(t => {
        const price = PLAN_PRICES[t.package] || 0;
        const createdAt = new Date(t.created_at);

        // Tổng doanh thu
        if (t.status === 'paid') {
            totalRevenue += price;
            activeUsers++;

            // Doanh thu tháng này
            if (
                createdAt.getMonth() === currentMonth &&
                createdAt.getFullYear() === currentYear
            ) {
                monthlyRevenue += price;
            }
        } else {
            inactiveUsers++;
        }
    });

    const totalTenants = dashboardTenants.length;
    const activeRestaurants = dashboardRestaurants.filter(
        r => r.status === 'Active'
    ).length;

    return {
        totalRevenue,
        monthlyRevenue,
        totalTenants,
        activeUsers,
        inactiveUsers,
        activeRestaurants
    };
}
function getMonthlyRevenueData() {
    const monthlyData = {};

    dashboardTenants.forEach(t => {
        if (t.status !== 'paid') return;

        const date = new Date(t.created_at);
        const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
        const price = PLAN_PRICES[t.package] || 0;

        if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = 0;
        }

        monthlyData[monthKey] += price;
    });

    const labels = Object.keys(monthlyData).sort();
    const values = labels.map(m => monthlyData[m]);

    return { labels, values };
}
function renderRevenueChart() {
    const ctx = document.getElementById("revenueChart");
    if (!ctx) return;

    const { labels, values } = getMonthlyRevenueData();

    new Chart(ctx, {
        type: "bar",
        data: {
            labels,
            datasets: [{
                label: "Doanh thu (VNĐ)",
                data: values,
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false, // 👈 RẤT QUAN TRỌNG
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    ticks: {
                        callback: v => v.toLocaleString() + "đ"
                    }
                }
            }
        }
    });
}
function getExpiringTenants(days = 7) {
    const now = new Date();
    const limitDate = new Date();
    limitDate.setDate(now.getDate() + days);

    return dashboardTenants.filter(t => {
        if (!t.expired_at) return false;
        if (t.status !== 'paid') return false;

        const expiredAt = new Date(t.expired_at);
        return expiredAt >= now && expiredAt <= limitDate;
    });
}
function renderExpiringTenantsTable() {
    const list = getExpiringTenants(7);

    let rows = "";

    if (list.length === 0) {
        rows = `
            <tr>
                <td colspan="4" style="text-align:center; color:#888;">
                    Không có đối tác sắp hết hạn 🎉
                </td>
            </tr>
        `;
    } else {
        rows = list.slice(0, 5).map(t => `
            <tr>
                <td>${t.name}</td>
                <td>${t.package}</td>
                <td>${new Date(t.expired_at).toLocaleDateString()}</td>
                <td>
                    <span style="
                        background:#fee2e2;
                        color:#b91c1c;
                        padding:4px 8px;
                        border-radius:8px;
                        font-size:12px;
                    ">
                        Sắp hết hạn
                    </span>
                </td>
            </tr>
        `).join("");
    }

    return `
        <div style="
            background:#fff;
            padding:20px;
            border-radius:12px;
            margin-top:30px;
        ">
            <h3>⚠️ Đối tác sắp hết hạn (7 ngày)</h3>

            <table style="width:100%; margin-top:10px; border-collapse:collapse;">
                <thead>
                    <tr style="text-align:left; border-bottom:1px solid #eee;">
                        <th>Tên</th>
                        <th>Gói</th>
                        <th>Hết hạn</th>
                        <th>Trạng thái</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>
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
    if (r.tenants) { r.tenants.owner = newOwner; r.tenants.email = newEmail; }

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
    if (btn) btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ...';

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
        if (btn) btn.innerHTML = '<i class="fas fa-sync"></i> Đồng bộ Google Form';
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


async function renderAIConfig() {
    pageTitle.innerText = "Đang tải cấu hình AI...";

    try {
        // 1. Lấy dữ liệu từ Supabase
        const { data, error } = await db
            .from('tenants')
            .select('id, name, status, ai_plan')
            .order('id', { ascending: true });

        if (error) throw error;

        const aiTenants = data || [];
        pageTitle.innerText = "Cấu hình AI & Cấp phát tài nguyên";

        // Thống kê (Gộp null/free/basic vào nhóm Basic)
        const countBasic = aiTenants.filter(t => t.ai_plan === 'basic' || t.ai_plan === 'free' || !t.ai_plan).length;
        const countPlus = aiTenants.filter(t => t.ai_plan === 'plus').length;
        const countPro = aiTenants.filter(t => t.ai_plan === 'pro').length;

        let html = `
            <div class="page-header">
                <div class="ai-stats-group">
                    <div class="ai-stat-card">
                        <span>Gói Basic (GPT 1)</span>
                        <strong>${countBasic}</strong>
                    </div>
                    <div class="ai-stat-card">
                        <span>Gói Plus (GPT 2)</span>
                        <strong>${countPlus}</strong>
                    </div>
                    <div class="ai-stat-card">
                        <span>Gói Pro (GPT 3)</span>
                        <strong>${countPro}</strong>
                    </div>
                </div>
                <input type="text" placeholder="Tìm kiếm nhà hàng..." onkeyup="filterAIConfig(this.value)">
            </div>

            <table class="ai-table" style="width: 100%; border-collapse: separate; border-spacing: 0 10px;">
                <thead>
                    <tr style="text-align: left; color: #666;">
                        <th style="padding: 10px;">Nhà hàng</th>
                        <th style="padding: 10px;">Chọn Gói Cước</th>
                        <th style="padding: 10px;">Cấu hình chi tiết (Tự động)</th>
                        <th style="padding: 10px;">Trạng thái</th>
                    </tr>
                </thead>
                <tbody>
        `;

        if (aiTenants.length === 0) {
            html += `<tr><td colspan="4" style="text-align:center;">Chưa có dữ liệu.</td></tr>`;
        } else {
            aiTenants.forEach(t => {
                // 1. Xử lý Gói cước (Mặc định Basic nếu null/free)
                let currentPlan = t.ai_plan || 'basic';
                if (currentPlan === 'free') currentPlan = 'basic';

                const config = AI_PLANS_CONFIG[currentPlan] || AI_PLANS_CONFIG['basic'];

                // 2. Xử lý Trạng thái
                // Chấp nhận cả 'paid' (đã thanh toán) là trạng thái xanh
                const rawStatus = (t.status || '').toLowerCase(); // Chuyển về chữ thường để so sánh
                const isOnline = rawStatus === 'paid';

                // Màu sắc trạng thái
                const statusColor = isOnline ? '#27ae60' : '#bdc3c7'; // Xanh lá hoặc Xám
                const statusText = isOnline ? 'Đang hoạt động' : 'Chưa kích hoạt';

                // Màu nền badge gói cước
                let badgeColor = '#f5f5f5';
                if (currentPlan === 'plus') badgeColor = '#e3f2fd'; // Xanh nhạt
                if (currentPlan === 'pro') badgeColor = '#fff3e0';  // Cam nhạt

                html += `
                    <tr style="background: #fff; box-shadow: 0 2px 5px rgba(0,0,0,0.05); border-radius: 8px;">
                        <td style="padding: 15px; border-radius: 8px 0 0 8px;">
                            <div style="font-weight:bold; font-size:15px; color:#2c3e50;">${t.name || 'No Name'}</div>
                            <div style="font-size:12px; color:#888;">ID: #${t.id}</div>
                        </td>
                        <td style="padding: 15px;">
                            <select onchange="updateAIPlan('${t.id}', this.value)" 
                                    style="padding: 8px; border-radius: 6px; border: 1px solid #ddd; width: 100%; font-weight: bold; cursor: pointer;">
                                <option value="basic" ${currentPlan === 'basic' ? 'selected' : ''}>Basic</option>
                                <option value="plus" ${currentPlan === 'plus' ? 'selected' : ''}>Plus</option>
                                <option value="pro" ${currentPlan === 'pro' ? 'selected' : ''}>Pro</option>
                            </select>
                        </td>
                        <td style="padding: 15px;">
                            <div style="display: flex; gap: 8px; flex-wrap: wrap; background: ${badgeColor}; padding: 8px; border-radius: 6px;">
                                <span class="spec-tag" style="background:#fff; padding:4px 8px; border-radius:4px; border:1px solid #ddd; font-size:12px;">
                                    <i class="fas fa-robot" style="color:#2980b9;"></i> <b>${config.model}</b>
                                </span>
                                <span class="spec-tag" style="background:#fff; padding:4px 8px; border-radius:4px; border:1px solid #ddd; font-size:12px;">
                                    <i class="fas fa-tachometer-alt" style="color:#c0392b;"></i> ${config.speed}
                                </span>
                                <span class="spec-tag" style="background:#fff; padding:4px 8px; border-radius:4px; border:1px solid #ddd; font-size:12px;">
                                    <i class="fas fa-tag" style="color:#27ae60;"></i> <b>${config.price}</b>
                                </span>
                            </div>
                        </td>
                        <td style="padding: 15px; border-radius: 0 8px 8px 0;">
                            <div style="display:flex; align-items:center; gap:8px;">
                                <div style="width: 10px; height: 10px; border-radius: 50%; background: ${statusColor}; box-shadow: 0 0 5px ${statusColor};"></div>
                                <span style="font-size:13px; font-weight: 500; color: ${statusColor};">
                                    ${statusText}
                                </span>
                            </div>
                        </td>
                    </tr>
                `;
            });
        }

        html += `</tbody></table>`;
        content.innerHTML = html;

    } catch (err) {
        console.error("Lỗi:", err);
        content.innerHTML = `<div class="error-msg">Lỗi tải dữ liệu: ${err.message}</div>`;
    }
}

async function updateAIPlan(id, newPlan) {
    // Xác định tên hiển thị để hỏi xác nhận
    const planName = newPlan.toUpperCase();
    let priceInfo = "";
    if (newPlan === 'basic') priceInfo = "20.000đ";
    if (newPlan === 'plus') priceInfo = "40.000đ";
    if (newPlan === 'pro') priceInfo = "55.000đ";

    if (!confirm(`Xác nhận đổi sang gói ${planName} (${priceInfo}) cho nhà hàng này?`)) {
        renderAIConfig(); // Load lại nếu hủy để giao diện quay về cũ
        return;
    }

    try {
        const { error } = await db
            .from('tenants')
            .update({ ai_plan: newPlan })
            .eq('id', id);

        if (error) throw error;

        // Sau khi update thành công, render lại để thấy thông số kỹ thuật mới
        renderAIConfig();

    } catch (err) {
        alert("Lỗi cập nhật: " + err.message);
        renderAIConfig();
    }
}

// Bổ sung hàm lọc nhanh cho bảng AI (nếu cần)
function filterAIConfig(keyword) {
    const term = keyword.toLowerCase();
    const rows = document.querySelectorAll(".ai-table tbody tr");
    rows.forEach(row => {
        row.style.display = row.innerText.toLowerCase().includes(term) ? "" : "none";
    });
}
// ================= LOGOUT =================
document.addEventListener("DOMContentLoaded", () => {
    const logoutBtn = document.querySelector(".logout-btn");

    if (!logoutBtn) {
        console.error("❌ Không tìm thấy nút đăng xuất");
        return;
    }

    logoutBtn.addEventListener("click", async () => {
        const { error } = await db.auth.signOut();

        if (error) {
            console.error("❌ Lỗi đăng xuất:", error);
            alert("Đăng xuất thất bại");
            return;
        }

        // Xoá session local (cho chắc)
        localStorage.clear();
        sessionStorage.clear();

        // Quay về trang login
        window.location.href = "../Login/loginAdmin.html";
    });
});
