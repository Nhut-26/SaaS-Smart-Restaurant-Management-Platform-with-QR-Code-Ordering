// DOM ELEMENTS

const content = document.getElementById("content");
const menuItems = document.querySelectorAll(".menu-item");
const pageTitle = document.getElementById("page-title");

//MOCK DATA

let foods = [
  { id: 1, name: "Phở bò", price: 45000, category: "Món chính", status: "Đang bán" },
  { id: 2, name: "Bún chả", price: 40000, category: "Món chính", status: "Đang bán" },
  { id: 3, name: "Trà đào", price: 30000, category: "Nước uống", status: "Ngừng bán" }
];

let reservations = [
  {
    id: 1,
    customer: "Nguyễn Văn A",
    people: 4,
    time: "18:00",
    status: "pending", // pending | confirmed
    tableId: null
  }
];

const budgets = [
  { id: 1, date: "20/12/2025", type: "Thu", note: "Bán hàng", amount: 2500000 },
  { id: 2, date: "20/12/2025", type: "Chi", note: "Nhập nguyên liệu", amount: 1200000 },
  { id: 3, date: "21/12/2025", type: "Thu", note: "Bán hàng", amount: 1800000 }
];
// KHÁCH HÀNG
let customers = [
  { id: 1, name: "Nguyễn Văn A", phone: "0909xxx", visits: 5 },
  { id: 2, name: "Trần Thị B", phone: "0911xxx", visits: 2 }
];

// NHÂN VIÊN
const staffs = [
  { id: 1, name: "Lê Minh", role: "Thu ngân", status: "Đang làm" },
  { id: 2, name: "Phạm Hùng", role: "Phục vụ", status: "Nghỉ" }
];

// BÀN
const tables = [
  { id: 1, name: "Bàn 1", seats: 4, reserved: false },
  { id: 2, name: "Bàn 2", seats: 2, reserved: true },
  { id: 3, name: "Bàn 3", seats: 6, reserved: false }
];

//MÓN ĂN

function renderMenu() {
  pageTitle.innerText = "Quản lý Menu";
  content.innerHTML = `
    <h2 class="page-title">Menu</h2>

    <!-- SEARCH + FILTER -->
    <div class="page-header">
      <input id="searchInput" placeholder="Tìm theo tên món..." />
      <select id="categoryFilter">
        <option value="">Tất cả danh mục</option>
        <option value="Món chính">Món chính</option>
        <option value="Nước uống">Nước uống</option>
        <option value="Tráng miệng">Tráng miệng</option>
      </select>
      <button onclick="openAdd()">+ Thêm món</button>
    </div>

    <!-- FORM -->
    <div class="form-box" id="formBox" style="display:none">
      <input id="nameInput" placeholder="Tên món" />
      <input id="priceInput" type="number" placeholder="Giá" />
      <select id="categoryInput">
        <option value="Món chính">Món chính</option>
        <option value="Nước uống">Nước uống</option>
        <option value="Tráng miệng">Tráng miệng</option>
      </select>
      <button onclick="saveFood()">Lưu</button>
      <button onclick="closeForm()">Hủy</button>
    </div>

    <!-- TABLE -->
    <table class="table">
      <thead>
        <tr>
          <th>Tên món</th>
          <th>Danh mục</th>
          <th>Giá</th>
          <th>Hành động</th>
        </tr>
      </thead>
      <tbody id="foodTable"></tbody>
    </table>
  `;

   renderTable(foods);

  document.getElementById("searchInput")
    .addEventListener("input", filterFood);
  document.getElementById("categoryFilter")
    .addEventListener("change", filterFood);
}
function renderTable(list) {
  const table = document.getElementById("foodTable");
  table.innerHTML = "";

  list.forEach(item => {
    table.innerHTML += `
      <tr>
        <td>${item.name}</td>
        <td>${item.category}</td>
        <td>${item.price.toLocaleString()}đ</td>
        <td>
          <button onclick="editFood(${item.id})">Sửa</button>
          <button onclick="deleteFood(${item.id})">Xóa</button>
        </td>
      </tr>
    `;
  });
}
function saveFood() {
  const name = document.getElementById("nameInput").value.trim();
  const price = +document.getElementById("priceInput").value;
  const category = document.getElementById("categoryInput").value;

  if (!name || !price) {
    alert("Vui lòng nhập đầy đủ thông tin");
    return;
  }

  if (editId) {
    // Update
    const food = foods.find(f => f.id === editId);
    food.name = name;
    food.price = price;
    food.category = category;
    editId = null;
  } else {
    // Thêm
    foods.push({
      id: Date.now(),
      name,
      price,
      category
    });
  }

  closeForm();
  renderTable(foods);
}

// Sửa

function editFood(id) {
  const food = foods.find(f => f.id === id);
  editId = id;

  document.getElementById("formBox").style.display = "flex";
  document.getElementById("nameInput").value = food.name;
  document.getElementById("priceInput").value = food.price;
  document.getElementById("categoryInput").value = food.category;
}

// Xóa

function deleteFood(id) {
  if (!confirm("Bạn có chắc muốn xóa món này?")) return;
  foods = foods.filter(f => f.id !== id);
  renderTable(foods);
}

//Tìm và lọc

function filterFood() {
  const keyword = document.getElementById("searchInput").value.toLowerCase();
  const category = document.getElementById("categoryFilter").value;

  const filtered = foods.filter(item => {
    const matchName = item.name.toLowerCase().includes(keyword);
    const matchCategory = category === "" || item.category === category;
    return matchName && matchCategory;
  });

  renderTable(filtered);
}

// Control

function openAdd() {
  editId = null;
  document.getElementById("formBox").style.display = "flex";
  document.getElementById("nameInput").value = "";
  document.getElementById("priceInput").value = "";
  document.getElementById("categoryInput").value = "Món chính";
}

function closeForm() {
  document.getElementById("formBox").style.display = "none";
}
renderMenu();

// ĐẶT CHỖ

function renderReservation() {
  pageTitle.innerText = "Quản lý Đặt chỗ";

  content.innerHTML = `
    <button onclick="openReservationForm()">+ Thêm đặt chỗ</button>
    <div class="reservation-block pending">
      <h3>Chờ phê duyệt</h3>
      ${renderReservationTable("pending")}
    </div>
    <div class="reservation-block confirmed">
      <h3>Đã xác nhận</h3>
      ${renderReservationTable("confirmed")}
    </div>
  `;
}

function renderReservationTable(status) {
  const list = reservations.filter(r => r.status === status);

  if (list.length === 0) return "<p>Không có dữ liệu</p>";

  return `
    <table>
      <tr>
        <th>Khách</th>
        <th>Số người</th>
        <th>Giờ</th>
        <th>Hành động</th>
      </tr>
      ${list.map(r => `
        <tr>
          <td>${r.customer}</td>
          <td>${r.people}</td>
          <td>${r.time}</td>
          <td>
            ${status === "pending"
              ? `<button onclick="confirmReservation(${r.id})">Xác nhận</button>`
              : ""}
            <button onclick="editReservation(${r.id})">Sửa</button>
            <button onclick="deleteReservation(${r.id})">Xóa</button>
          </td>
        </tr>
      `).join("")}
    </table>
  `;
}

function confirmReservation(id) {
  const r = reservations.find(x => x.id === id);
  const table = tables.find(t => !t.reserved);

  if (!table) {
    alert("Không còn bàn trống!");
    return;
  }

  r.status = "confirmed";
  r.tableId = table.id;
  table.reserved = true;

  renderReservation();
}
function deleteReservation(id) {
  reservations = reservations.filter(r => r.id !== id);
  renderReservation();
}

//bao cao

function renderFinance() {
  pageTitle.innerText = "Báo cáo";

  const totalIncome = budgets
    .filter(b => b.type === "Thu")
    .reduce((s, b) => s + b.amount, 0);

  const totalExpense = budgets
    .filter(b => b.type === "Chi")
    .reduce((s, b) => s + b.amount, 0);

  content.innerHTML = `
    <!-- TỔNG QUAN -->
    <div class="summary-cards">
      <div class="summary income">
        <p>Tổng thu</p>
        <h3>${totalIncome.toLocaleString()} đ</h3>
      </div>
      <div class="summary expense">
        <p>Tổng chi</p>
        <h3>${totalExpense.toLocaleString()} đ</h3>
      </div>
      <div class="summary">
        <p>Lợi nhuận</p>
        <h3>${(totalIncome - totalExpense).toLocaleString()} đ</h3>
      </div>
    </div>

    <!-- BẢNG NGÂN SÁCH -->
    <h3>Chi tiết thu chi</h3>
    <table>
      <tr>
        <th>Loại</th>
        <th>Số tiền</th>
        <th>Ghi chú</th>
      </tr>
      ${budgets.map(b => `
        <tr>
          <td>${b.type}</td>
          <td>${b.amount.toLocaleString()} đ</td>
          <td>${b.note}</td>
        </tr>
      `).join("")}
    </table>
  `;
}


//SIDEBAR CLICK EVENT

menuItems.forEach(item => {
  item.addEventListener("click", () => {

    // Active menu
    menuItems.forEach(i => i.classList.remove("active"));
    item.classList.add("active");

    // Điều hướng
    const page = item.dataset.page;

    if (page === "menu") renderMenu();
    if (page === "reservation") renderReservation();
    if (page === "finance") renderFinance();
    if (page === "customer") renderCustomer();
    if (page === "staff") renderStaff();
    if (page === "table") renderTableManager();

  });
});

// INIT – LOAD MẶC ĐỊNH

renderMenu();

const settingBtn = document.getElementById("settingBtn");
const settingMenu = document.getElementById("settingMenu");

settingBtn.addEventListener("click", () => {
  settingMenu.style.display =
    settingMenu.style.display === "flex" ? "none" : "flex";
});

//khach hang

function renderCustomer() {
  pageTitle.innerText = "Quản lý Khách hàng";

  let html = `
    <table>
      <tr>
        <th>Tên</th>
        <th>SĐT</th>
        <th>Số lần đến</th>
      </tr>
  `;

  customers.forEach(c => {
    html += `
      <tr>
        <td>${c.name}</td>
        <td>${c.phone}</td>
        <td>${c.visits}</td>
      </tr>
    `;
  });

  html += "</table>";
  content.innerHTML = html;
}

//Nhan vien

function renderStaff() {
  pageTitle.innerText = "Quản lý Nhân viên";

  let html = `
    <table>
      <tr>
        <th>Tên</th>
        <th>Chức vụ</th>
        <th>Trạng thái</th>
      </tr>
  `;

  staffs.forEach(s => {
    html += `
      <tr>
        <td>${s.name}</td>
        <td>${s.role}</td>
        <td>${s.status}</td>
      </tr>
    `;
  });

  html += "</table>";
  content.innerHTML = html;
}

// Quan ly ban

function renderTableManager() {
  pageTitle.innerText = "Quản lý Bàn";

  let html = `<div class="table-grid">`;

  tables.forEach(t => {
    html += `
      <div class="table-box ${t.reserved ? "reserved" : "available"}">
        <h4>${t.name}</h4>
        <p>${t.seats} chỗ</p>
        <span>${t.reserved ? "Đã đặt" : "Trống"}</span>
      </div>
    `;
  });

  html += "</div>";
  content.innerHTML = html;
}

// lien ket voi dat cho

function confirmReservation(id) {
  const table = tables.find(t => !t.reserved);
  if (!table) {
    alert("Hết bàn trống!");
    return;
  }

  table.reserved = true;
  alert(`Đã gán ${table.name} cho khách`);
}


