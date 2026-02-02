const SUPABASE_URL = 'https://vhjxxgajenkzuykkqloi.supabase.co'; //
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZoanh4Z2FqZW5renV5a2txbG9pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0OTgyMjIsImV4cCI6MjA4MzA3NDIyMn0.l04T4IY-2mdFTvVhksDBmL5buErB1Pfa97GQOgRVtCg'; //

const supaClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- DOM ELEMENTS & VARIABLES ---
const signUpButton = document.getElementById('signUp');
const signInButton = document.getElementById('signIn');
const container = document.getElementById('container');
const toast = document.getElementById('toast-message');

let tempUserId = null; 
let previousStep = ''; // Lưu trạng thái để nút "Quay lại" ở bước 2 biết đường về

// --- HIỆU ỨNG SLIDER (GIỮ NGUYÊN) ---
signUpButton.addEventListener('click', () => container.classList.add("right-panel-active"));
signInButton.addEventListener('click', () => container.classList.remove("right-panel-active"));

function showToast(message, type) {
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 3000);
}

// ==========================================
// LOGIC QUẢN LÝ CÁC BƯỚC ĐĂNG KÝ (MỚI)
// ==========================================

const step0 = document.getElementById('step-0-selection');
const step1New = document.getElementById('step-1-new');
const step1Exist = document.getElementById('step-1-exist');
const step2 = document.getElementById('step-2-restaurant');

// 1. CHUYỂN TỪ BƯỚC 0 (LỰA CHỌN) -> BƯỚC 1
document.getElementById('btn-mode-new').addEventListener('click', () => {
    step0.classList.add('hidden');
    step1New.classList.remove('hidden');
    previousStep = 'new';
});

document.getElementById('btn-mode-exist').addEventListener('click', () => {
    step0.classList.add('hidden');
    step1Exist.classList.remove('hidden');
    previousStep = 'exist';
});

// 2. NÚT QUAY LẠI (TỪ BƯỚC 1 VỀ BƯỚC 0)
document.querySelectorAll('.btn-back-to-select').forEach(btn => {
    btn.addEventListener('click', () => {
        step1New.classList.add('hidden');
        step1Exist.classList.add('hidden');
        step0.classList.remove('hidden');
    });
});

// 3. XỬ LÝ: TẠO TÀI KHOẢN MỚI (LUỒNG 1)
document.getElementById('btn-next-step-new').addEventListener('click', async () => {
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const phone = document.getElementById('reg-phone').value;
    const password = document.getElementById('reg-pass').value;

    if (!name || !email || !phone || !password) {
        showToast("Vui lòng điền đầy đủ thông tin!", "error");
        return;
    }

    showToast("Đang tạo tài khoản...", "success");

    // Đăng ký Auth
    const { data: authData, error: authError } = await supaClient.auth.signUp({
        email: email,
        password: password,
        options: { data: { full_name: name, phone: phone } }
    });

    if (authError) {
        showToast(authError.message, "error");
        return;
    }

    if (authData.user) {
        tempUserId = authData.user.id;
        // Lưu Tenant vào DB
        const { error: dbError } = await supaClient.from('tenants').insert([{ 
            id: tempUserId, name: name, email: email, password: password, tenant_phone: phone
        }]);

        if (dbError) {
            showToast("Lỗi lưu dữ liệu: " + dbError.message, "error");
        } else {
            showToast("Tạo tài khoản thành công! Hãy tạo nhà hàng đầu tiên.", "success");
            step1New.classList.add('hidden');
            step2.classList.remove('hidden');
        }
    }
});

// 4. XỬ LÝ: XÁC THỰC TÀI KHOẢN CŨ (LUỒNG 2)
document.getElementById('btn-verify-user').addEventListener('click', async () => {
    const email = document.getElementById('verify-email').value;
    const password = document.getElementById('verify-pass').value;

    if (!email || !password) {
        showToast("Vui lòng nhập email và mật khẩu!", "error");
        return;
    }

    showToast("Đang xác thực...", "success");

    // Đăng nhập ngầm để lấy ID
    const { data, error } = await supaClient.auth.signInWithPassword({ email, password });

    if (error) {
        showToast("Xác thực thất bại: " + error.message, "error");
        return;
    }

    // Nếu đúng, lưu ID và chuyển sang bước tạo nhà hàng
    tempUserId = data.user.id;
    showToast("Xác thực thành công! Vui lòng nhập thông tin chi nhánh.", "success");
    
    // Logout ngay để tránh xung đột session nếu người dùng hủy ngang (tùy chọn)
    // await supaClient.auth.signOut(); 
    
    step1Exist.classList.add('hidden');
    step2.classList.remove('hidden');
});

// 5. QUAY LẠI TỪ BƯỚC 2 VỀ BƯỚC 1 (TƯƠNG ỨNG)
document.getElementById('btn-back-step-2').addEventListener('click', () => {
    step2.classList.add('hidden');
    if (previousStep === 'new') {
        step1New.classList.remove('hidden');
    } else {
        step1Exist.classList.remove('hidden');
    }
});

// 6. HOÀN TẤT ĐĂNG KÝ NHÀ HÀNG (CHUNG CHO CẢ 2)
document.getElementById('form-register').addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!tempUserId) {
        showToast("Mất kết nối người dùng. Vui lòng thực hiện lại.", "error");
        return;
    }

    const restName = document.getElementById('rest-name').value;
    const restAddress = document.getElementById('rest-address').value;
    const restCuisine = document.getElementById('rest-cuisine').value;

    if (!restName || !restAddress || !restCuisine) {
        showToast("Vui lòng nhập đủ thông tin nhà hàng!", "error");
        return;
    }

    showToast("Đang khởi tạo chi nhánh...", "success");

    const { error: restError } = await supaClient.from('restaurants').insert([{
        name: restName,
        address: restAddress,
        cuisine_type: restCuisine,
        tenant_id: tempUserId // ID này lấy từ Tenant mới hoặc Tenant cũ
    }]);

    if (restError) {
        showToast("Lỗi tạo nhà hàng: " + restError.message, "error");
    } else {
        showToast("Thêm nhà hàng thành công! Đang chuyển hướng...", "success");
        setTimeout(() => {
            window.location.href = "../Manager/manager.html";
        }, 1500);
    }
});

// --- LOGIC ĐĂNG NHẬP CHÍNH (GIỮ NGUYÊN NHƯ CŨ) ---
document.getElementById('form-login').addEventListener('submit', async (e) => {
    // ... (Giữ nguyên logic đăng nhập ở file cũ của bạn) ...
    // Copy lại đoạn xử lý đăng nhập từ file login.js gốc vào đây
    e.preventDefault();
    const restNameInput = document.getElementById('login-rest-name').value.trim();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-pass').value;

    showToast("Đang kiểm tra thông tin...", "success");
    const { data, error } = await supaClient.auth.signInWithPassword({ email, password });
    if (error) { showToast("Đăng nhập thất bại: " + error.message, "error"); return; }

    const { data: restData, error: restError } = await supaClient
        .from('restaurants')
        .select('name')
        .eq('tenant_id', data.user.id)
        .eq('name', restNameInput) // Kiểm tra chính xác tên nhà hàng nhập vào
        .maybeSingle(); // Dùng maybeSingle để tránh lỗi nếu có nhiều chi nhánh trùng tên (dù hiếm)

    // Nếu không tìm thấy nhà hàng khớp tên với user đó
    if (!restData) {
        // Có thể user có nhà hàng nhưng nhập sai tên, hoặc chưa có nhà hàng nào
        showToast(`Không tìm thấy nhà hàng "${restNameInput}" trong tài khoản này!`, "error");
        await supaClient.auth.signOut();
        return;
    }

    const userInfo = {
        id: data.user.id,
        email: data.user.email,
        ownerName: data.user.user_metadata.full_name || "Quản lý",
        restaurantName: restData.name
    };
    localStorage.setItem("currentUser", JSON.stringify(userInfo));
    showToast("Đăng nhập thành công!", "success");
    setTimeout(() => { window.location.href = "../Admin/admin.html"; }, 1000);
});