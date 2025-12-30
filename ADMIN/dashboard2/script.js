function showTab(tabId) {
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.add('hidden');
    });
    document.getElementById(tabId).classList.remove('hidden');
    if(tabId === 'customer') {
        renderCustomerTable(customer);
    }
    if(tabId === 'staff') {
        renderStaffTable(staff);
    }
    if(tabId === 'report') {
        renderReportTable(report);
    }
    if(tabId === 'table') {
        renderTables();
    }
}
const customer = [
    { id: 1, name: "Nguyễn Văn A", email: "a@gmail.com", phone: "0901234567", bookings: 10, total: 1500000, status: "VIP", notes: "Dị ứng đậu phộng" },
    { id: 2, name: "Trần Thị B", email: "b@gmail.com", phone: "0901234568", bookings: 3, total: 900000, status: "Thường", notes: "" },
    { id: 3, name: "Lê Văn C", email: "c@gmail.com", phone: "0901234569", bookings: 0, total: 0, status: "Bị Khóa", notes: "Lịch sử không tốt" },
    { id: 4, name: "Phạm Thị D", email: "d@gmail.com", phone: "0901234570", bookings: 2, total: 600000, status: "Thường", notes: "" },
    { id: 5, name: "Hoàng Văn E", email: "e@gmail.com", phone:"0901234571", bookings: 12, total: 1200000, status: "VIP", notes: " " },
    { id: 7, name: "Đỗ Văn G", email: "g@gmail.com", phone: "0901234572", bookings: 8, total: 0, status: "Thường", notes: "" },
    { id: 8, name: "Bùi Thị H", email: "h@gmail.com", phone: "0901234573", bookings: 2, total: 0, status: "Thường", notes: "Dị ứng hành lá" },
    { id: 9, name: "Trịnh Văn I", email: "i@gmail.com", phone:"0901234574", bookings: 4, total: 0, status: "Thường", notes: "" },
    { id: 10, name: "Phan Thị K", email: "k@gmail.com", phone:"0901234575", bookings: 6, total: 0, status: "Thường", notes: "Dị ứng hành phi" }
];
function renderCustomerTable(data) {
    const tableBody = document.querySelector("#customerTable tbody");
    tableBody.innerHTML = "";
    data.forEach(customer => {
        const row = `
        <tr>
            <td>${customer.id}</td>
            <td>${customer.name}</td>
            <td>${customer.email}</td>
            <td>${customer.phone}</td>
            <td>${customer.bookings}</td>
            <td>${customer.total}</td>
            <td>${customer.status}</td>
            <td>${customer.notes}</td>
        </tr>
        `;
        tableBody.innerHTML += row;
    });
}

function searchCustomer() {
    const input = document.getElementById("customerSearch").value.toLowerCase();
    const rows = document.querySelectorAll("#customerTable tr");

    for (let i = 1; i < rows.length; i++) {
        const text = rows[i].innerText.toLowerCase();
        rows[i].style.display = text.includes(input) ? "" : "none";
    }
}
const staff = [
    { id: 1, name: "Nguyễn Văn L", email: "l@gmail.com", phone: "0901234567", position: "Admin", status: "Đang làm việc", shift: "Sáng", time: "08:00 - 16:00", notes: "" },
    { id: 2, name: "Trần Thị M", email: "m@gmail.com", phone: "0901234568", position: "Quản Lý", status: "Đang làm việc", shift: "Chiều", time: "16:00 - 24:00", notes: "" },
    { id: 3, name: "Lê Văn N", email: "n@gmail.com", phone: "0901234569", position: "Thu Ngân", status: "Đang làm việc", shift: "Tối", time: "24:00 - 08:00", notes: "" },
    { id: 4, name: "Phạm Thị O", email: "o@gmail.com", phone:"0901234570", position:"Phục Vụ", status:"Đang làm việc", shift:"Sáng", time:"08:00 - 16:00" , notes:""},
    { id : 5, name : "Hoàng Văn P" , email : "p@gmail.com" , phone : "0901234571" , position : "Bảo Vệ" , status : "Đang làm việc" , shift : "Tối" , time : "24:00 - 8:00" , notes : ""},
    { id : 6, name : "Vũ Thị Q" , email : "q@gmail.com" , phone : "0901234572" , position : "Phục Vụ" , status : "Đang làm việc" , shift : "Sáng" , time : "08:00 - 16:00" , notes : ""},
    { id : 7, name : "Đỗ Văn R" , email : "r@gmail.com" , phone : "0901234573" , position : "Phục Vụ" , status : "Đang làm việc" , shift : "Chiều" , time : "16:00 - 24:00" , notes : ""},
    { id : 8, name : "Bùi Thị S" , email : "s@gmail.com" , phone : "0901234574" , position : "Phục Vụ" , status : "Đang làm việc" , shift : "Tối" , time : "24:00 - 08:00" , notes : ""},
    { id : 9, name : "Trịnh Văn T" , email : "t@gmail.com" , phone : "0901234575" , position : "Phục Vụ" , status : "Đang làm việc" , shift : "Sáng" , time : "08:00 - 16:00" , notes : ""},
    { id : 10, name : "Phan Thị U" , email : "u@gmail.com" , phone : "0901234576" , position : "Phục Vụ" , status : "Đang làm việc" , shift : "Chiều" , time : "16:00 - 24:00" , notes : ""},
    { id : 11, name :"Lý Văn V", email:"v@gmail.com", phone:"0901234577", position:"Phục Vụ", status:"Đang làm việc", shift:"Sáng", time:"8:00 - 16:00", notes:""}
];
function renderStaffTable(data) {
    const tableBody = document.querySelector("#staffTable tbody");
    tableBody.innerHTML = "";
    data.forEach(staff => {
        const row = `
        <tr>
            <td>${staff.id}</td>
            <td>${staff.name}</td>
            <td>${staff.email}</td>
            <td>${staff.phone}</td>
            <td>${staff.position}</td>
            <td>${staff.status}</td>
            <td>${staff.shift}</td>
            <td>${staff.time}</td>
            <td>${staff.notes}</td>
        </tr>
        `;
        tableBody.innerHTML += row;
    });
}

function searchStaff() {
    const input = document.getElementById("staffSearch").value.toLowerCase();
    const rows = document.querySelectorAll("#staffTable tr");
    for (let i = 1; i < rows.length; i++) {
        const text = rows[i].innerText.toLowerCase();
        rows[i].style.display = text.includes(input) ? "" : "none";
    }
}
const report = [
    { id: 1, type: "Doanh thu hôm nay", value: "5,000,000 VND", notes: "" },
    { id: 2,type:"Doanh thu theo ngày", value:"5,000,000 VND", notes:""},
    { id: 3,type:"Doanh thu theo tuần", value:"35,000,000 VND", notes:""},
    { id: 4,type:"Doanh thu theo tháng", value:"150,000,000 VND", notes:""},
    { id: 5,type:"Món bán chạy nhất", value:"Phở bò", notes:"200 phần"},
    { id: 6,type:"Món ít bán nhất", value:"Bánh cuốn", notes:"5 phần"},
    { id: 7,type:"Khách hàng quay lại", value:"150 khách", notes:""},
    { id: 8,type:"Khách hàng mới", value:"50 khách", notes:""},
    { id: 9,type:"Khách hàng VIP", value:"20 khách", notes:""},
    { id: 10,type:"Số đơn xử lý hôm nay", value:"80 đơn", notes:""},
    { id: 11,type:"Số đơn hủy hôm nay", value:"5 đơn", notes:""},
    { id: 12,type:"Doanh thu theo nhân viên", value:"4,000,000 VND", notes:"Nhân viên L: 2,000,000 VND, Nhân viên S: 2,000,000 VND"},
    { id: 13,type:"Hiệu suất ", value:"85%", notes:""}
];
function renderReportTable(data) {
    const tableBody = document.querySelector("#reportTable tbody");
    tableBody.innerHTML = "";
    data.forEach(report => {
        const row = `
        <tr>
            <td>${report.id}</td>
            <td>${report.type}</td>
            <td>${report.value}</td>
            <td>${report.notes}</td>
        </tr>
        `;
        tableBody.innerHTML += row;
    });
}
function searchReport() {
    const input = document.getElementById("reportSearch").value.toLowerCase();
    const rows = document.querySelectorAll("#reportTable tr");

    for (let i = 1; i < rows.length; i++) {
        const text = rows[i].innerText.toLowerCase();
        rows[i].style.display = text.includes(input) ? "" : "none";
    }
}
let tables= [
    { id: 1, name: "", people: "", time: "", status: "available" },
    { id: 2, name: "", people: "", time: "", status: "available" },
    { id: 3, name: "", people: "", time: "", status: "available" },
    { id: 4, name: "", people: "", time: "", status: "available" },
    { id: 5, name: "", people: "", time: "", status: "available"  },
    { id: 6, name: "", people: "", time: "", status: "available"  },
    { id: 7, name: "", people: "", time: "", status: "available"  },
    { id: 8, name: "", people: "", time: "", status: "available"  },
    { id: 9, name: "", people: "", time: "", status: "available"  },
    { id: 10, name: "", people: "", time: "", status: "available" }
];
function renderTables() {
    const Grid = document.getElementById("tableGrid");
    Grid.innerHTML = "";
    tables.forEach(table => {
        Grid.innerHTML += `
          <div class="table-box ${table.status}" 
          onclick="openTableModal(${table.id})">
          <div class="table-title">Bàn${table.id}</div>
          <div class="table-status-text">${getStatusText(table.status)}</div>
          <div>Bàn ${table.id}</div>
          ${table.name ? `<div>Tên: ${table.name}</div>` : ""}
            ${table.people ? `<div>Số người: ${table.people}</div>` : ""}
            ${table.time ? `<div>Thời gian: ${table.time}</div>` : ""}
            </div>
        `;
    });
}
function getStatusText(status) {
    if (status === "available") return "Trống";
    if (status === "occupied") return "Đang dùng";
    return "Đã đặt";
}
function searchAvailableTable(value) {
    value = value.toLowerCase();
    document.querySelectorAll('.table-box').forEach(box => {
        box.style.display = box.innerText.toLowerCase().includes(value)
         ? "flex"
         : "none";
    });
}
renderTables();
let selectedTableId = null;
function openTableModal(tableId) {
    selectedTableId = tableId;
    const table = tables.find(t => t.id === tableId);
    document.getElementById("customerName").value = table.name;
    document.getElementById("customerCount").value = table.people;
    document.getElementById("tableStatus").value = table.status;
    document.getElementById("tableModal").classList.remove("hidden");
}

function saveTableInfo() {
    const name = document.getElementById("customerName").value.trim();
    const people = document.getElementById("customerCount").value;
    const status = document.getElementById("tableStatus").value;
    const table = tables.find(t => t.id === selectedTableId);
    if (!table) return;
    if (status !== "available" && (!name || !people)) {
        alert("Vui lòng nhập đầy đủ thông tin");
        return;
    }
    table.status = status;
    table.name = status === "available" ? "" : name;
    table.people = status === "available" ? "" : people;
    table.time = new Date().toLocaleString(); 
    closeTableModal();
    renderTables();
    
}
function closeTableModal() {
    document.getElementById("tableModal").classList.add("hidden");
    
}
function deleteTableInfo() {
    const table = tables.find(t => t.id === selectedTableId);
    if (!table) return;
    table.name = "";
    table.people = "";
    table.time = "";
    table.status = "available";
    closeTableModal();
    renderTables();
}
function getStatusText(status) {
    if (status === "available") return "Trống";
    if (status === "occupied") return "Đang dùng";
    return "Đã đặt";
}