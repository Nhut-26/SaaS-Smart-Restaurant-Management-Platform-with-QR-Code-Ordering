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

const reservations = [
  { id: 1, name: "Nguyễn Văn A", phone: "0909xxx", time: "18:00", people: 4, status: "Chờ duyệt" },
  { id: 2, name: "Trần Thị B", phone: "0911xxx", time: "19:30", people: 2, status: "Đã xác nhận" }
];

const budgets = [
  { id: 1, date: "20/12/2025", type: "Thu", note: "Bán hàng", amount: 2500000 },
  { id: 2, date: "20/12/2025", type: "Chi", note: "Nhập nguyên liệu", amount: 1200000 },
  { id: 3, date: "21/12/2025", type: "Thu", note: "Bán hàng", amount: 1800000 }
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

  let html = `
    <div class="page-header">
      <h3>Danh sách đặt chỗ</h3>
    </div>

    <table>
      <tr>
        <th>Khách</th>
        <th>SĐT</th>
        <th>Thời gian</th>
        <th>Số người</th>
        <th>Trạng thái</th>
        <th>Hành động</th>
      </tr>
  `;

  reservations.forEach(r => {
    html += `
      <tr>
        <td>${r.name}</td>
        <td>${r.phone}</td>
        <td>${r.time}</td>
        <td>${r.people}</td>
        <td>
          <span class="status pending">${r.status}</span>
        </td>
        <td>
          <button class="btn-confirm">Xác nhận</button>
          <button class="btn-delete">Hủy</button>
        </td>
      </tr>
    `;
  });

  html += `</table>`;
  content.innerHTML = html;
}

//NGÂN SÁCH

function renderBudget() {
  pageTitle.innerText = "Quản lý Ngân sách";

  let totalIncome = 0;
  let totalExpense = 0;

  budgets.forEach(b => {
    if (b.type === "Thu") totalIncome += b.amount;
    else totalExpense += b.amount;
  });

  const balance = totalIncome - totalExpense;

  let html = `
    <div class="budget-top">
      <div class="bank-card">
        <div class="card-header">
          <span class="bank-name">SE Restaurant Bank</span>
          <i class="fas fa-wifi"></i>
        </div>

        <div class="card-balance">
          <p>Số dư hiện tại</p>
          <h2>${balance.toLocaleString()} đ</h2>
        </div>

        <div class="card-footer">
          <span>**** 8899</span>
          <span>12/25</span>
        </div>
      </div>

      <div class="summary-cards">
        <div class="summary income">
          <p>Tổng thu</p>
          <h3>${totalIncome.toLocaleString()} đ</h3>
        </div>
        <div class="summary expense">
          <p>Tổng chi</p>
          <h3>${totalExpense.toLocaleString()} đ</h3>
        </div>
      </div>
    </div>

    <table>
      <tr>
        <th>Ngày</th>
        <th>Loại</th>
        <th>Nội dung</th>
        <th>Số tiền</th>
      </tr>
  `;

  budgets.forEach(b => {
    html += `
      <tr>
        <td>${b.date}</td>
        <td>${b.type}</td>
        <td>${b.note}</td>
        <td>${b.amount.toLocaleString()} đ</td>
      </tr>
    `;
  });

  html += `</table>`;
  content.innerHTML = html;
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
    if (page === "budget") renderBudget();
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
