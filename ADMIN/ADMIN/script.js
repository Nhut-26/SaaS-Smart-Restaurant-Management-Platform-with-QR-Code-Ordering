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
    const status = table.dataset.status;
    const statusText = table.querySelector(".table-status");
    if (status === "available") {
        table.dataset.status = "occupied";
        table.className = "table-box occupied";
        statusText.innerText = "Có khách";
    } else if (status === "occupied") {
        table.dataset.status = "available";
        table.className = "table-box available";
        statusText.innerText = "Trống";
    } else if (status === "reserved") {
        table.dataset.status = "available";
        table.className = "table-box available";
        statusText.innerText = "Trống";
    }
    if (table.dataset.status === "available") {
        selectedTable = table;
        document.getElementById("tableModal").classList.remove("hidden");
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
    const name = document.getElementById("customerName").value;
    const count = document.getElementById("customerCount").value;
    const time = new Date().toLocaleTimeString();
    if(!name || !count) {
        alert("Vui lòng nhập đầy đủ thông tin.");
        return;
    }
    selectedTable.dataset.status = "occupied";
    selectedTable.dataset.name = "table-box occupied";
    selectedTable.innerHTML = `
    <span class="table-name">${selectedTable.querySelector(".table-name").innerText}</span>
    <span class="table-status"> Có khách</span>
    <small> ${name} </small>
    <small> ${count} người </small>
    <small>  ${time} </small>
    `;
    closeTableModal();
}
function closeTableModal() {
    document.getElementById("tableModal").classList.add("hidden");
    document.getElementById("customerName").value = "";
    document.getElementById("customerCount").value = "";
}