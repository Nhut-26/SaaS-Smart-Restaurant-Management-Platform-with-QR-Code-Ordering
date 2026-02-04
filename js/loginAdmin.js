const SUPABASE_URL = "https://vhjxxgajenkzuykkqloi.supabase.co";
const SUPABASE_ANON_KEY ="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZoanh4Z2FqZW5renV5a2txbG9pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0OTgyMjIsImV4cCI6MjA4MzA3NDIyMn0.l04T4IY-2mdFTvVhksDBmL5buErB1Pfa97GQOgRVtCg";

const db = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

let isRegister = false;

const title = document.getElementById("title");
const nameInput = document.getElementById("name");
const emailInput = document.getElementById("email");
const passInput = document.getElementById("password");
const btn = document.getElementById("btn-submit");
const toggle = document.getElementById("toggle");

/* CHUYỂN ĐĂNG NHẬP <-> ĐĂNG KÝ */
toggle.onclick = () => {
  isRegister = !isRegister;
  title.innerText = isRegister ? "Đăng ký" : "Đăng nhập";
  btn.innerText = isRegister ? "Đăng ký" : "Đăng nhập";
  nameInput.style.display = isRegister ? "block" : "none";
  toggle.innerText = isRegister
    ? "Đã có tài khoản? Đăng nhập"
    : "Chưa có tài khoản? Đăng ký";
};

/* SUBMIT */
btn.onclick = async () => {
  const email = emailInput.value.trim();
  const password = passInput.value;

  if (!email || !password) {
    alert("Nhập email và mật khẩu");
    return;
  }

  if (isRegister) {
    const name = nameInput.value.trim();
    const { error } = await db.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name }
      }
    });

    if (error) {
      alert(error.message);
    } else {
      alert("Đăng ký thành công! Hãy đăng nhập");
      toggle.onclick();
    }
  } else {
    const { data, error } =
      await db.auth.signInWithPassword({
        email,
        password
      });

    if (error) {
      alert("Sai tài khoản hoặc mật khẩu");
    } else {
      localStorage.setItem("user", JSON.stringify(data.user));
      window.location.assign("../ADMIN/index.html");

    }
  }
};
