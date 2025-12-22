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
