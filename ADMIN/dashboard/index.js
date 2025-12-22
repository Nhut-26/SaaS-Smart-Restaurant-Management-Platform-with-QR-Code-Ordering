// ================================
// 1. DOM ELEMENTS
// ================================
const content = document.getElementById("content");
const menuItems = document.querySelectorAll(".menu-item");
const pageTitle = document.getElementById("page-title");

// ================================
// 2. MOCK DATA
// ================================
const foods = [
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

// ================================
// 3. RENDER MENU (MÓN ĂN)
// ================================
function renderMenu() {
  pageTitle.innerText = "Quản lý Menu";

  let html = `
    <div class="page-header">
      <h3>Danh sách món ăn</h3>
      <button>+ Thêm món</button>
    </div>

    <table>
      <tr>
        <th>Tên món</th>
        <th>Giá</th>
        <th>Danh mục</th>
        <th>Trạng thái</th>
        <th>Chỉnh sửa</th>
      </tr>
  `;

  foods.forEach(food => {
    html += `
      <tr>
        <td>${food.name}</td>
        <td>${food.price.toLocaleString()} đ</td>
        <td>${food.category}</td>
        <td>
          <span class="status ${food.status === "Đang bán" ? "active" : "inactive"}">
            ${food.status}
          </span>
        </td>
        <td>
          <button class="btn-edit">Sửa</button>
          <button class="btn-delete">Xóa</button>
        </td>
      </tr>
    `;
  });

  html += `</table>`;
  content.innerHTML = html;
}

// ================================
// 4. RENDER RESERVATION (ĐẶT CHỖ)
// ================================
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

// ================================
// 5. RENDER BUDGET (NGÂN SÁCH)
// ================================
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


// ================================
// 6. SIDEBAR CLICK EVENT
// ================================
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

// ================================
// 7. INIT – LOAD MẶC ĐỊNH
// ================================
renderMenu();

const settingBtn = document.getElementById("settingBtn");
const settingMenu = document.getElementById("settingMenu");

settingBtn.addEventListener("click", () => {
  settingMenu.style.display =
    settingMenu.style.display === "flex" ? "none" : "flex";
});
