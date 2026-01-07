
const supabaseUrl = ('https://vhjxxgajenkzuykkqloi.supabase.co')
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZoanh4Z2FqZW5renV5a2txbG9pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0OTgyMjIsImV4cCI6MjA4MzA3NDIyMn0.l04T4IY-2mdFTvVhksDBmL5buErB1Pfa97GQOgRVtCg'

const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

async function startApp() {
    try {
        const { data: { user } } = await _supabase.auth.getUser();

        if (!user) {
            renderLogin();
        } else {
            setupSidebar();
            loadPage("order"); // Trang mặc định
        }
    } catch (error) {
        console.error("Lỗi khởi tạo:", error);
        document.getElementById("content-area").innerHTML = "Lỗi kết nối database!";
    }
}

function renderLogin() {
    document.body.innerHTML = `
        <div style="height:100vh; display:flex; align-items:center; justify-content:center; background:#f3f4f6;">
            <div style="background:white; padding:40px; border-radius:15px; box-shadow:0 10px 25px rgba(0,0,0,0.1); width:350px; text-align:center;">
                <h2 style="color:#059669; margin-bottom:20px;">SE Admin Login</h2>
                <input type="email" id="email" placeholder="Email Admin" style="width:100%; padding:12px; margin-bottom:10px; border:1px solid #ddd; border-radius:8px;">
                <input type="password" id="pass" placeholder="Mật khẩu" style="width:100%; padding:12px; margin-bottom:20px; border:1px solid #ddd; border-radius:8px;">
                <button onclick="handleLogin()" style="width:100%; padding:12px; background:#059669; color:white; border:none; border-radius:8px; cursor:pointer; font-weight:bold;">ĐĂNG NHẬP</button>
            </div>
        </div>
    `;
}

async function handleLogin() {
    const email = document.getElementById("email").value;
    const pass = document.getElementById("pass").value;
    const { error } = await _supabase.auth.signInWithPassword({ email, password: pass });
    if (error) alert("Lỗi đăng nhập: " + error.message);
    else location.reload();
}

function setupSidebar() {
    document.querySelectorAll(".nav-item").forEach(item => {
        item.addEventListener("click", () => {
            document.querySelectorAll(".nav-item").forEach(i => i.classList.remove("active"));
            item.classList.add("active");
            loadPage(item.dataset.page);
        });
    });
}

async function loadPage(page) {
    const area = document.getElementById("content-area");
    const title = document.getElementById("page-title");
    area.innerHTML = "<p>Đang tải dữ liệu...</p>";

    switch (page) {
        case "order":
            title.innerText = "Đơn hàng (POS)";
            await renderOrders(area);
            break;
        case "inventory":
            title.innerText = "Kho hàng";
            await renderInventory(area);
            break;
        case "materials":
            title.innerText = "Nguyên vật liệu";
            area.innerHTML = "<div class='card'>Quản lý định mức nguyên liệu...</div>";
            break;
        case "staff":
            title.innerText = "Nhân viên";
            await renderStaff(area);
            break;
    }
}

async function renderStaff(container) {
    const { data: staff, error } = await _supabase.from('profiles').select('*');
    if (error) return container.innerHTML = "Không thể tải dữ liệu nhân viên.";

    container.innerHTML = `
        <div class="card">
            <table class="data-table">
                <thead><tr><th>Họ tên</th><th>SĐT</th><th>Ngày tham gia</th></tr></thead>
                <tbody>
                    ${staff.map(s => `<tr><td>${s.full_name}</td><td>${s.phone}</td><td>${new Date(s.created_at).toLocaleDateString()}</td></tr>`).join('')}
                </tbody>
            </table>
        </div>
    `;
}

async function renderOrders(container) {
    const { data: orders } = await _supabase.from('transactions').select('*').eq('transaction_type', 'Thu');
    container.innerHTML = `
        <div class="stats-grid">
            <div class="card"><p>Đơn hàng</p><h3>${orders?.length || 0}</h3></div>
            <div class="card"><p>Doanh thu</p><h3>${orders?.reduce((a, b) => a + b.amount, 0).toLocaleString()}đ</h3></div>
        </div>
    `;
}

function showSignUp() {
    const title = document.getElementById('title');
    const desc = document.getElementById('desc');
    const btn = document.getElementById('main-button');
    const toggle = document.getElementById('toggle-link');

    document.querySelector('.auth-card').classList.add('fade-in');

    title.innerText = "Đăng ký SE Admin";
    desc.innerText = "Tạo tài khoản quản trị mới";
    btn.innerText = "TẠO TÀI KHOẢN";
    btn.onclick = handleSignUp;

    toggle.innerText = "Quay lại Đăng nhập";
    toggle.onclick = showLogin;
}
function showLogin() {
    const title = document.getElementById('title');
    const desc = document.getElementById('desc');
    const btn = document.getElementById('main-button');
    const toggle = document.getElementById('toggle-link');

    document.querySelector('.auth-card').classList.add('fade-in');

    title.innerText = "SE Admin System";
    desc.innerText = "Vui lòng đăng nhập để tiếp tục";
    btn.innerText = "ĐĂNG NHẬP";
    btn.onclick = handleSignIn;

    toggle.innerText = "Đăng ký tài khoản";
    toggle.onclick = showSignUp;

    setTimeout(() => {
        document.querySelector('.auth-card').classList.remove('fade-in');
    }, 500);
}
async function handleSignUp() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-pass').value;

    const { data, error } = await _supabase.auth.signUp({ email, password });
    if (error) alert("Lỗi: " + error.message);
    else alert("Đăng ký thành công! Hãy kiểm tra Email của bạn.");
}

async function handleForgotPassword() {
    const email = document.getElementById('login-email').value;
    if (!email) return alert("Vui lòng nhập Email trước khi lấy lại mật khẩu!");

    const { error } = await _supabase.auth.resetPasswordForEmail(email);
    if (error) alert("Lỗi: " + error.message);
    else alert("Liên kết đặt lại mật khẩu đã được gửi vào Email!");
}
    let currentMode = 'login';

    function toggleAuthMode() {
        const title = document.getElementById('auth-title');
        const desc = document.getElementById('auth-desc');
        const mainBtn = document.getElementById('main-button');
        const toggleLink = document.getElementById('toggle-link');

        if (currentMode === 'login') {
            currentMode = 'signup';
            title.innerText = "Đăng ký SE Admin";
            desc.innerText = "Tạo tài khoản quản trị mới";
            mainBtn.innerText = "TẠO TÀI KHOẢN";
            toggleLink.innerText = "Quay lại Đăng nhập";
        } else {
            currentMode = 'login';
            title.innerText = "SE Admin System";
            desc.innerText = "Vui lòng đăng nhập để tiếp tục";
            mainBtn.innerText = "ĐĂNG NHẬP";
            toggleLink.innerText = "Đăng ký tài khoản";
        }
    }

    async function handleMainAction() {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        if (!email || !password) {
            alert("Vui lòng nhập đầy đủ thông tin!");
            return;
        }

        if (currentMode === 'login') {
            const { error } = await _supabase.auth.signInWithPassword({ email, password });
            if (error) alert("Lỗi: " + error.message);
            else window.location.href = 'manager.html';
        } else {
            const { error } = await _supabase.auth.signUp({ email, password });
            if (error) alert("Lỗi: " + error.message);
            else alert("Đăng ký thành công! Hãy kiểm tra email để xác nhận tài khoản.");
        }
    }
    const { data, error } = await _supabase.auth.signInWithPassword({ email, password });

    if (data.user) {
        const { data: profile } = await _supabase
            .from('profiles')
            .select('role')
            .eq('id', data.user.id)
            .single();

        if (profile && profile.role === 'admin') {
            window.location.href = 'manager.html';
        } else {
            window.location.href = 'customer_home.html';
        }
    }


startApp();