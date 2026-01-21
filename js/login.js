
const SUPABASE_URL = 'https://vhjxxgajenkzuykkqloi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZoanh4Z2FqZW5renV5a2txbG9pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzQ5ODIyMiwiZXhwIjoyMDgzMDc0MjIyfQ.c6AfU8do1i4pgxiE-1SCrT6OU6Sgj4aSbhB-Rh981MM';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 2. DOM ELEMENTS
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const msgBox = document.getElementById('message');
const btnShowRegister = document.getElementById('btn-show-register');
const btnShowLogin = document.getElementById('btn-show-login');

// 3. TIỆN ÍCH
function showMessage(text, type) {
    msgBox.textContent = text;
    msgBox.className = type; // 'success' hoặc 'error'
    msgBox.style.display = 'block';
}

function toggleForms() {
    loginForm.classList.toggle('hidden');
    registerForm.classList.toggle('hidden');
    msgBox.style.display = 'none';
}

// Kiểm tra xem nút có tồn tại không trước khi gán sự kiện (Tránh lỗi null)
if(btnShowRegister) btnShowRegister.addEventListener('click', toggleForms);
if(btnShowLogin) btnShowLogin.addEventListener('click', toggleForms);

// 4. XỬ LÝ ĐĂNG KÝ
const formRegister = document.getElementById('form-register-submit');
if (formRegister) {
    formRegister.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = document.getElementById('reg-name').value;
        const email = document.getElementById('reg-email').value;
        const password = document.getElementById('reg-pass').value;

        showMessage("Đang xử lý đăng ký...", "success");

        // Bước 1: Đăng ký Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: email,
            password: password,
            // Tùy chọn: Lưu tên ngay vào metadata để dự phòng
            options: {
                data: { full_name: name }
            }
        });

        if (authError) {
            showMessage("Lỗi đăng ký: " + authError.message, 'error');
            return;
        }

        // Bước 2: Insert vào bảng tenants
        // Lưu ý: Nếu Supabase yêu cầu xác thực email, user có thể chưa đăng nhập ngay.
        if (authData.user) {
            const { error: dbError } = await supabase
                .from('tenants')
                .insert([
                    { 
                        id: authData.user.id,
                        name: name,
                        email: email
                    }
                ]);

            if (dbError) {
                // Nếu lỗi do RLS hoặc trùng lặp
                console.error(dbError);
                showMessage("Đăng ký Auth thành công nhưng lỗi lưu hồ sơ (Kiểm tra RLS): " + dbError.message, 'error');
            } else {
                showMessage("Đăng ký thành công! Vui lòng kiểm tra email xác nhận.", 'success');
                formRegister.reset();
            }
        }
    });
}

// 5. XỬ LÝ ĐĂNG NHẬP
const formLogin = document.getElementById('form-login-submit');
if (formLogin) {
    formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-pass').value;

        showMessage("Đang đăng nhập...", "success");

        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) {
            showMessage("Đăng nhập thất bại: " + error.message, 'error');
        } else {
            showMessage("Đăng nhập thành công!", 'success');
            setTimeout(() => {
                alert("Chào mừng quay trở lại!");
                // window.location.href = 'dashboard.html'; // Chuyển trang nếu cần
            }, 1000);
        }
    });
}