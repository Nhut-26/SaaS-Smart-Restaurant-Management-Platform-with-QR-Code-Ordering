
const SUPABASE_URL = 'https://vhjxxgajenkzuykkqloi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZoanh4Z2FqZW5renV5a2txbG9pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0OTgyMjIsImV4cCI6MjA4MzA3NDIyMn0.l04T4IY-2mdFTvVhksDBmL5buErB1Pfa97GQOgRVtCg';

const supaClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const msgBox = document.getElementById('message');
const btnShowRegister = document.getElementById('btn-show-register');
const btnShowLogin = document.getElementById('btn-show-login');


function showMessage(text, type) {
  msgBox.textContent = text;
  msgBox.className = type; 
  msgBox.style.display = 'block';
}

function toggleForms() {
  loginForm.classList.toggle('hidden');
  registerForm.classList.toggle('hidden');
  msgBox.style.display = 'none';
}

if (btnShowRegister) btnShowRegister.addEventListener('click', toggleForms);
if (btnShowLogin) btnShowLogin.addEventListener('click', toggleForms);

/* Đăng Ký*/
const formRegister = document.getElementById('form-register-submit');

if (formRegister) {
  formRegister.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-pass').value;

    showMessage("Đang xử lý đăng ký...", "success");

    // 1. Đăng ký tài khoản vào hệ thống xác thực Supabase (Auth)
    // Bước này cần thiết để tạo User ID và sau này dùng để Đăng nhập
    const { data: authData, error: authError } = await supaClient.auth.signUp({
      email: email,
      password: password,
      options: {
        // Vẫn lưu metadata để tiện hiển thị nếu cần
        data: { full_name: name }
      }
    });

    if (authError) {
      showMessage(authError.message, "error");
      return;
    }

    // 2. Nếu đăng ký Auth thành công, ghi dữ liệu vào bảng 'tenants'
    if (authData.user) {
        const { error: dbError } = await supaClient
            .from('tenants')
            .insert([
                { 
                    id: authData.user.id, // Lấy ID từ tài khoản vừa tạo
                    name: name,
                    email: email,
                    password: password // Lưu password vào bảng (theo yêu cầu)
                }
            ]);

        if (dbError) {
            console.error("Lỗi lưu database:", dbError);
            showMessage("Đăng ký Auth thành công nhưng lỗi lưu dữ liệu: " + dbError.message, "error");
            return;
        }

        showMessage("Đăng ký thành công! Hãy kiểm tra email để xác nhận.", "success");
        formRegister.reset();
    }
  });
}

/* Đăng nhập chuyển sang manager.html*/
const formLogin = document.getElementById('form-login-submit');

if (formLogin) {
  formLogin.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-pass').value;

    showMessage("Đang đăng nhập...", "success");

    const { data, error } = await supaClient.auth.signInWithPassword({
  email,
  password
});

if (error) {
  showMessage("Đăng nhập thất bại: " + error.message, "error");
  return;
}

// ✅ LẤY ĐÚNG TÊN TỪ SUPABASE
const userInfo = {
  id: data.user.id,
  email: data.user.email,
  ownerName: data.user.user_metadata.full_name
};

// ✅ LƯU USER ĐANG LOGIN
localStorage.setItem("currentUser", JSON.stringify(userInfo));

showMessage("Đăng nhập thành công! Đang chuyển trang...", "success");

await new Promise(r => setTimeout(r, 1500));
window.location.href = "../Manager/manager.html";
  });
}