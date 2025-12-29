function showTab(tabId) {
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.add('hidden');
    });
    document.getElementById(tabId).classList.remove('hidden');
}

function searchCustomer() {
    const input = document.getElementById("customerSearch").value.toLowerCase();
    const rows = document.querySelectorAll("#customerTable tr");

    for (let i = 1; i < rows.length; i++) {
        const text = rows[i].innerText.toLowerCase();
        rows[i].style.display = text.includes(input) ? "" : "none";
    }
}

function searchStaff() {
    const input = document.getElementById("staffSearch").value.toLowerCase();
    const rows = document.querySelectorAll("#staffTable tr");

    for (let i = 1; i < rows.length; i++) {
        const text = rows[i].innerText.toLowerCase();
        rows[i].style.display = text.includes(input) ? "" : "none";
    }
}

function searchReport() {
    const input = document.getElementById("reportSearch").value.toLowerCase();
    const rows = document.querySelectorAll("#reportTable tr");

    for (let i = 1; i < rows.length; i++) {
        const text = rows[i].innerText.toLowerCase();
        rows[i].style.display = text.includes(input) ? "" : "none";
    }
}
function searchAvailableTable(value) {
    value = value.toLowerCase();
    document.querySelectorAll('.table-box');
    tables.forEach(table => {
        const name = table.querySelector(".table-name").innerText.toLowerCase();
        const status = table.dataset.status;
        if (name.includes(value) || value === "") {
            table.style.display = 'flex';
        } else {
            table.style.display = 'none';
        }
    });
}
let selectedTable = null;
function toggleTable(table) {
    selectedTable = table;
    document.getElementById("tableModal").classList.remove("hidden");
}
function renderTable(table) {
    const status = table.dataset.status || "available";
    const name = table.dataset.name || "";
    const people = table.dataset.people || "";
    const time = table.dataset.time || "";
    const tableName = table.dataset.tableName;

    table.classList.remove("available", "occupied", "reserved");
    table.classList.add(status);

    if (status === "available") {
        table.innerHTML = `
            <span class="table-name">${tableName}</span>
            <span class="table-status">Trống</span>
        `;
    } 
    else if (status === "reserved") {
        table.innerHTML = `
            <span class="table-name">${tableName}</span>
            <span class="table-status">Đã đặt</span>
            <small>${name}</small>
            <small>${people} người</small>
            <small>${time}</small>
        `;
    } 
    else if (status === "occupied") {
        table.innerHTML = `
            <span class="table-name">${tableName}</span>
            <span class="table-status">Đang sử dụng</span>
            <small>${name}</small>
            <small>${people} người</small>
            <small>${time}</small>
        `;
    }
}

function updateTableUI(table) {
    table.innerHTML = `
     ${table.innerText.split('<')[0]}
        <div class="table-info">
     ${table.dataset.name}</div>
        <div class="table-info">
     ${table.dataset.people}</div>
        <div class="table-info">
     ${table.dataset.time}</div>
    `;
}
function saveTableInfo() {
    if (!selectedTable) return;

    const name = document.getElementById("customerName").value.trim();
    const people = document.getElementById("customerCount").value;
    const status = document.getElementById("tableStatus").value;
    const time = new Date().toLocaleTimeString();

    if (!name || !people) {
        alert("Vui lòng nhập đầy đủ thông tin");
        return;
    }

    selectedTable.dataset.name = name;
    selectedTable.dataset.people = people;
    selectedTable.dataset.time = time;
    selectedTable.dataset.status = status;

    renderTable(selectedTable);
    closeTableModal();
}
function closeTableModal() {
    document.getElementById("tableModal").classList.add("hidden");
    
}
document.querySelectorAll(".table-box").forEach((table, index) => {
    table.dataset.tableName = `Bàn ${index + 1}`;
    table.dataset.status = "available";
    renderTable(table);
});
function deleteTableInfo() {
    if (!selectedTable) return;

    selectedTable.dataset.status = "available";
    delete selectedTable.dataset.name;
    delete selectedTable.dataset.people;
    delete selectedTable.dataset.time;

    renderTable(selectedTable);
    closeTableModal();
}

function setTableStatus(table, status) {
    table.classList.remove("available", "occupied", "reserved");
    table.classList.add(status);
    table.dataset.status = status;
}