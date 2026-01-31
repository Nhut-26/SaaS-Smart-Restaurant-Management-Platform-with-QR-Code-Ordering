const content = document.getElementById("content");
const pageTitle = document.getElementById("page-title");
const SUPABASE_URL  = 'https://vhjxxgajenkzuykkqloi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZoanh4Z2FqZW5renV5a2txbG9pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzQ5ODIyMiwiZXhwIjoyMDgzMDc0MjIyfQ.c6AfU8do1i4pgxiE-1SCrT6OU6Sgj4aSbhB-Rh981MM';
const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);
(async () => {
    const { data } = await supabaseClient.auth.getSession();
    if (!data || !data.session) {
        window.location.replace("../Login/login.html");
    }
})();

const currentUser = JSON.parse(localStorage.getItem("currentUser"));
if (!currentUser) {
    window.location.href = "../Login/login.html";
}
const ownerNameEl = document.getElementById("owner-name");
ownerNameEl.textContent = currentUser.ownerName || currentUser.email;

let allFoods = [];

let allTables = [];

let allReservations = [];

let currentFinanceData = [];

let customers = [
    { id: 1, name: "Nguyễn Văn A", phone: "0909xxx", visits: 5, spend: 1200000 },
    { id: 2, name: "Trần Thị B", phone: "0912xxx", visits: 2, spend: 450000 }
];
let customerChartInstance = null;

let staffs = [];

let schedules = []; 

let currentRestaurantId = null;

let currentStaffTab = 'list';

const TIME_SLOTS = [
    { id: '08-12', label: '08:00 - 12:00' },
    { id: '12-16', label: '12:00 - 16:00' },
    { id: '16-20', label: '16:00 - 20:00' },
    { id: '20-24', label: '20:00 - 24:00' }
];

async function fetchRestaurantId() {
    // Lấy 1 dòng đầu tiên từ bảng 'restaurants' (hoặc bảng chứa thông tin nhà hàng của bạn)
    const { data, error } = await supabaseClient.from('restaurants').select('id').limit(1).single();
    
    if (data) {
        currentRestaurantId = data.id;
        console.log("Đã lấy ID nhà hàng:", currentRestaurantId);
    } else {
        console.error("Không tìm thấy thông tin nhà hàng:", error);
    }
}

// tự động khởi chạy
document.addEventListener("DOMContentLoaded", () => {
    setupNavigation();
    fetchRestaurantId();
    renderMenu(); // mặc định vào trang Menu
});

function setupNavigation() {
    document.querySelectorAll(".menu-item").forEach(item => {
        item.addEventListener("click", () => {
            document.querySelectorAll(".menu-item").forEach(i => i.classList.remove("active"));
            item.classList.add("active");

            // Routing
            const page = item.dataset.page;
            if (page === "menu") renderMenu();
            if (page === "table-reservation") renderTableReservation();
            if (page === "finance") renderFinance();
            if (page === "customer") renderCustomerPage();
            if (page === "staff") renderStaffPage();
        });
    });
}

// menu
async function renderMenu() {
    pageTitle.innerText = "Quản lý Thực đơn";
    content.innerHTML = `<div class="loading">Đang tải dữ liệu từ Database...</div>`;

    try {
        const { data, error } = await supabaseClient.from('menus').select('*').order('id', { ascending: true });
        if (error) throw error;
        allFoods = data;

        // Vẽ thanh công cụ (Search & Filter)
        content.innerHTML = `
            <div class="page-header">
                <div style="display:flex; gap:10px;">
                    <input type="text" id="searchInput" placeholder="Tìm tên món..." onkeyup="filterMenu()">
                    <select id="categoryFilter" onchange="filterMenu()">
                        <option value="">Tất cả danh mục</option>
                        <option value="Món chính">Món chính</option>
                        <option value="Đồ uống">Đồ uống</option>
                        <option value="Tráng miệng">Tráng miệng</option>
                    </select>
                </div>
                <button onclick="openMenuModal()" class="btn-green">+ Thêm món mới</button>
                <button onclick="openGoogleForm()" class="btn-primary">Nhập từ Google Form</button>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>Tên món</th>
                        <th>Giá</th>
                        <th>Trạng thái</th>
                        <th>Sản phẩm bán chạy</th>
                        <th>Số lượng hàng tồn kho</th>
                        <th>Loại món</th>
                        <th>Mô tả món</th>
                        <th>Edit</th>
                    </tr>
                </thead>
                <tbody id="menuTableBody"></tbody>
            </table>
        `;
        renderTableBody(allFoods); 
    } catch (err) {
        content.innerHTML = `Lỗi: ${err.message}`;
    }
}

function renderTableBody(data) {
    const tbody = document.getElementById("menuTableBody");
    if (!tbody) return;

    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center">Không có dữ liệu hiển thị.</td></tr>`;
        return;
    }

    tbody.innerHTML = data.map(f => `
        <tr>
            <td><strong>${f.food_name}</strong></td>
            <td>${Number(f.price).toLocaleString()}đ</td>
            <td>${f.is_available ? 'Còn hàng' : 'Hết hàng'}</td>
            <td>${f.description ? 'Có' : 'Không'}</td>
            <td>${Number(f.stock_count).toLocaleString()}</td>
            <td><span class="status-badge active">${f.category}</span></td>
            <td>${f.description || '---'}</td>
            <td>
                <button onclick="window.editFood('${f.id}')" class="btn-gray"><i class="fas fa-edit"></i> Sửa</button>
                <button onclick="window.deleteFood('${f.id}')" class="btn-red"><i class="fas fa-trash"></i> Xóa</button>
            </td>
        </tr>
    `).join('');
}

async function openAddMenuForm() {
    const name = prompt("Nhập tên món ăn:");
    const price = prompt("Nhập giá bán (VNĐ):");
    const is_available = confirm("Món này còn hàng không? Nhấn 'OK' cho Còn, 'Hủy' cho Hết.");
    const is_description = confirm("Món này có phải sản phẩm bán chạy không? Nhấn 'Yes' cho Có, 'No' cho Không.");
    const stock_count = prompt("Nhập số lượng hàng tồn kho:");
    const category = prompt("Nhập loại (Món chính/Đồ uống/Tráng miệng):");
    const description = prompt("Nhập mô tả món ăn (tùy chọn):");

    if (name && price && category) {
        const { error } = await supabaseClient

            .from('menus')
            .insert([{ 
                food_name: name, 
                price: parseInt(price),
                is_available: is_available,
                description: description,
                stock_quantity: parseInt(stock_quantity),
                category: category,
                description: description
            }]);

        if (error) {
            alert("Lỗi khi thêm: " + error.message);
        } else {
            alert("Đã thêm món ăn vào menu thành công!");
            renderMenu();
        }
    }
}

window.deleteFood = async function(id) {
    const isConfirm = confirm("Bạn có chắc chắn muốn xóa món này không?");
    if (!isConfirm) return;

    try {
        const { error } = await supabaseClient
            .from('menus')
            .delete()
            .eq('id', id);

        if (error) throw error;

        alert("Đã xóa món ăn thành công!");
        renderMenu();
    } catch (err) {
        alert("Không thể xóa: " + err.message);
    }
};

window.openAddMenuForm = function(item = null) {
    const title = item ? "Chỉnh sửa món ăn" : "Thêm món mới";
    const bodyHtml = `
        <div class="form-group">
            <label>Tên món</label>
            <input type="text" id="m_name" value="${item ? item.food_name : ''}">
        </div>
        <div class="form-group">
            <label>Giá bán</label>
            <input type="number" id="m_price" value="${item ? item.price : ''}">
        </div>
        <div class="form-group">
            <label>Trạng thái</label>
            <select id="m_status">
                <option value="true" ${item?.is_available ? 'selected' : ''}>Còn hàng</option>
                <option value="false" ${!item?.is_available ? 'selected' : ''}>Hết hàng</option>
            </select>
        </div>
        <div class="form-group">
            <label>Sản phẩm bán chạy</label>
            <select id="m_bestseller">
                <option value="true" ${item?.description ? 'selected' : ''}>Có</option>
                <option value="false" ${!item?.description ? 'selected' : ''}>Không</option>
            </select>
        </div>
        <div class="form-group">
            <label>Số lượng hàng tồn kho</label>
            <input type="number" id="m_stock" value="${item ? item.stock_count : ''}">
        </div>
        <div class="form-group">
            <label>Danh mục</label>
            <select id="m_cat">
                <option value="Món chính" ${item?.category === 'Món chính' ? 'selected' : ''}>Món chính</option>
                <option value="Đồ uống" ${item?.category === 'Đồ uống' ? 'selected' : ''}>Đồ uống</option>
            </select>
        </div>
        <div class="form-group">
            <label>Mô tả món</label>
            <textarea id="m_desc" rows="3">${item ? item.description : ''}</textarea>
    `;

    showUniversalModal(title, bodyHtml, async () => {
        //lưu vào Supabase
        const name = document.getElementById("fName").value;
        const price = document.getElementById("fPrice").value;
        
        if (item) {
            await supabaseClient.from('menus').update({ food_name: name, price: price }).eq('id', item.id);
        } else {
            await supabaseClient.from('menus').insert([{ food_name: name, price: price }]);
        }
        renderMenu(); // Load lại bảng
    });
}

window.openMenuModal = function(item = null) {
    const title = item ? "Chỉnh sửa món ăn" : "Thêm món mới";
    
    const currentImageSrc = item && item.image ? item.image : 'https://via.placeholder.com/150?text=No+Image';

    const bodyHtml = `
        <div style="display: flex; gap: 20px; flex-wrap: wrap;">
            <div style="flex: 1; min-width: 250px;">
                <div class="form-group">
                    <label>Tên món</label>
                    <input type="text" id="m_name" value="${item ? item.food_name : ''}" class="form-control">
                </div>
                <div class="form-group">
                    <label>Giá bán (VNĐ)</label>
                    <input type="number" id="m_price" value="${item ? item.price : ''}" class="form-control">
                </div>
                <div class="form-group">
                    <label>Trạng thái</label>
                    <select id="m_available" class="form-control">
                        <option value="true" ${item?.is_available ? 'selected' : ''}>Còn hàng</option>
                        <option value="false" ${!item?.is_available ? 'selected' : ''}>Hết hàng</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Số lượng tồn kho</label>
                    <input type="number" id="m_stock" value="${item ? item.stock_count : '0'}" class="form-control">
                </div>
                 <div class="form-group">
                    <label>Danh mục</label>
                    <select id="m_cat" class="form-control">
                        <option value="Món chính" ${item?.category === 'Món chính' ? 'selected' : ''}>Món chính</option>
                        <option value="Đồ uống" ${item?.category === 'Đồ uống' ? 'selected' : ''}>Đồ uống</option>
                        <option value="Tráng miệng" ${item?.category === 'Tráng miệng' ? 'selected' : ''}>Tráng miệng</option>
                    </select>
                </div>
            </div>

            <div style="flex: 1; min-width: 250px;">
                <div class="form-group">
                    <label>Hình ảnh món ăn</label>
                    <div style="margin-bottom: 10px; text-align: center; background: #f9f9f9; padding: 10px; border-radius: 8px;">
                        <img id="preview_img" src="${currentImageSrc}" style="width: 100%; max-height: 200px; object-fit: contain;">
                    </div>
                    <input type="file" id="m_image_file" accept="image/*" onchange="document.getElementById('preview_img').src = window.URL.createObjectURL(this.files[0])">
                </div>
                <div class="form-group">
                    <label>Mô tả chi tiết</label>
                    <textarea id="m_desc" rows="5" style="width:100%; padding: 10px;" placeholder="Nhập mô tả món ăn...">${item ? (item.description || '') : ''}</textarea>
                </div>
            </div>
        </div>
    `;

    showUniversalModal(title, bodyHtml, async () => {
        const saveBtn = document.querySelector("#universalModal .btn-green");
        const originalText = saveBtn.innerText;
        saveBtn.innerText = "Đang lưu...";
        saveBtn.disabled = true;

        try {
            const name = document.getElementById("m_name").value;
            const price = document.getElementById("m_price").value;
            const category = document.getElementById("m_cat").value;
            const stock = document.getElementById("m_stock").value;
            const available = document.getElementById("m_available").value === "true";
            const description = document.getElementById("m_desc").value;
            
            // Xử lý upload ảnh
            const fileInput = document.getElementById("m_image_file");
            let imageUrl = item ? item.image : null; // Giữ link ảnh cũ mặc định

            if (fileInput.files.length > 0) {
                // Gọi hàm uploadImage đã có sẵn ở cuối file
                const newUrl = await uploadImage(fileInput.files[0]);
                if (newUrl) imageUrl = newUrl;
            }

            const payload = {
                food_name: name,
                price: parseInt(price),
                category: category,
                stock_count: parseInt(stock),
                is_available: available,
                description: description, // Lưu mô tả văn bản
                image: imageUrl
            };

            let error;
            if (item) {
                // Update
                const res = await supabaseClient.from('menus').update(payload).eq('id', item.id);
                error = res.error;
            } else {
                // Insert
                const res = await supabaseClient.from('menus').insert([payload]);
                error = res.error;
            }

            if (error) throw error;

            alert("Lưu thành công!");
            window.closeUniversalModal();
            renderMenu();

        } catch (err) {
            console.error(err);
            alert("Lỗi: " + err.message);
        } finally {
            saveBtn.innerText = originalText;
            saveBtn.disabled = false;
        }
    });
}

window.editFood = function(id) {
    console.log("Đang click sửa ID:", id);
    console.log("Danh sách hiện tại:", allFoods);
    const item = allFoods.find(f => f.id == id);
    if (!item) {
        alert("Lỗi: Không tìm thấy dữ liệu món ăn.");
        return;
    }
    // Gọi lại Modal đầy đủ chức năng
    openMenuModal(item);

    const modalBody = `
        <div class="form-group">
            <label>Tên món:</label>
            <input type="text" id="editName" value="${item.name}" class="form-control">
        </div>
        <div class="form-group">
            <label>Giá (VNĐ):</label>
            <input type="number" id="editPrice" value="${item.price}" class="form-control">
        </div>
        <div class="form-group">
            <label>Danh mục:</label>
            <select id="editCategory" class="form-control">
                <option value="Khai vị" ${item.category === 'Khai vị' ? 'selected' : ''}>Khai vị</option>
                <option value="Món chính" ${item.category === 'Món chính' ? 'selected' : ''}>Món chính</option>
                <option value="Tráng miệng" ${item.category === 'Tráng miệng' ? 'selected' : ''}>Tráng miệng</option>
                <option value="Đồ uống" ${item.category === 'Đồ uống' ? 'selected' : ''}>Đồ uống</option>
            </select>
        </div>
        
        <div class="form-group">
            <label>Mô tả:</label>
            <textarea id="editDescription" class="form-control" rows="3">${item.description || ''}</textarea>
        </div>

        <div class="form-group">
            <label>Hình ảnh:</label>
            <div style="margin-bottom: 10px;">
                <img src="${item.image || 'https://via.placeholder.com/100'}" 
                     id="currentImagePreview" 
                     style="width: 100px; height: 100px; object-fit: cover; border-radius: 8px; border: 1px solid #ddd;">
            </div>
            <input type="file" id="editImageFile" accept="image/*">
            <small style="color: #666; display: block; margin-top: 5px;">Để trống nếu không muốn thay đổi ảnh.</small>
        </div>
    `;

    // 2. Định nghĩa hàm Lưu 
    const saveCallback = async () => {
        const newName = document.getElementById("editName").value;
        const newPrice = document.getElementById("editPrice").value;
        const newCategory = document.getElementById("editCategory").value;
        
        // Lấy giá trị Mô tả mới
        const newDescription = document.getElementById("editDescription").value;
        
        // Lấy file ảnh mới (nếu có)
        const newImageFile = document.getElementById("editImageFile").files[0];

        // Biến lưu đường dẫn ảnh (mặc định là ảnh cũ)
        let newImageUrl = item.image_url;

        // --- Logic Upload Ảnh Mới ---
        if (newImageFile) {
            try {
                const fileName = `menu/${Date.now()}_${newImageFile.name.replace(/\s/g, '_')}`;
                
                const { data, error: uploadError } = await supabaseClient.storage
                    .from('menu_images') 
                    .upload(fileName, newImageFile);

                if (uploadError) throw uploadError;

                // Lấy Public URL của ảnh vừa up
                const { data: urlData } = supabaseClient.storage
                    .from('menu_images')
                    .getPublicUrl(fileName);
                
                newImageUrl = urlData.publicUrl;

            } catch (err) {
                console.error("Lỗi upload ảnh:", err);
                alert("Không thể tải ảnh lên: " + err.message);
                return; // Dừng lại nếu upload lỗi
            }
        }
        // -----------------------------

        // Gửi lệnh Update lên Database
        const { error } = await supabaseClient
            .from('menus')
            .update({
                name: newName,
                price: newPrice,
                category: newCategory,
                description: newDescription, // Cập nhật mô tả
                image_url: newImageUrl       // Cập nhật link ảnh
            })
            .eq('id', item.id);

        if (error) {
            throw new Error(error.message);
        }

        // Tải lại danh sách món và đóng modal
        alert("Cập nhật món thành công!");
        window.closeUniversalModal();
        renderMenu(); // Hoặc hàm render lại trang menu của bạn
    };

    window.openUniversalModal("Chỉnh sửa món ăn", modalBody, saveCallback);
};

window.filterMenu = function() {
    const keyword = document.getElementById("searchInput").value.toLowerCase();
    const category = document.getElementById("categoryFilter").value;

    const filtered = allFoods.filter(item => {
        const matchesName = item.food_name.toLowerCase().includes(keyword);
        const matchesCat = category === "" || item.category === category;
        return matchesName && matchesCat;
    });

    renderTableBody(filtered);
}
async function uploadImage(file) {
    try {
        const fileName = `dish_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '')}`;
        const { data, error } = await supabaseClient
            .storage
            .from('menu_images')
            .upload(fileName, file);

        if (error) throw error;

        const { data: urlData } = supabaseClient
            .storage
            .from('menu_images')
            .getPublicUrl(fileName);

        return urlData.publicUrl;
    } catch (err) {
        console.error("Upload lỗi:", err);
        alert("Lỗi upload ảnh: " + err.message);
        return null;
    }
}

// Chỗ ngồi
async function fetchTableData() {
    const { data: tables, error: tError } = await supabaseClient
        .from('tables')
        .select('*')
        .order('table_name');
    if (tError) { console.error(tError); return; }
    allTables = tables;

    const { data: bookings, error: bError } = await supabaseClient
        .from('bookings')
        .select('*');
    if (bError) { console.error(bError); return; }
    allReservations = bookings;

    renderTableGrid();
    renderReservationList();
}

async function renderTableReservation() {
    pageTitle.innerText = "Quản lý Bàn & Đặt chỗ";
    content.innerHTML = `<div class="loading">Đang tải dữ liệu bàn và khách...</div>`;

    // 1. Tạo thanh công cụ quản lý (Toolbar)
    const toolbarHtml = `
        <div style="background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
            <div style="font-size: 14px; color: #666;">
                <i class="fas fa-circle" style="color: #2ecc71;"></i> Trống &nbsp;
                <i class="fas fa-circle" style="color: #e74c3c;"></i> Đang phục vụ
            </div>
            <div style="display:flex; gap:10px;">
                <button onclick="addNewTable()" class="btn-green" style="padding: 8px 15px;">
                    <i class="fas fa-plus"></i> Thêm bàn
                </button>
                
                <button onclick="downloadTableTemplate()" class="btn-gray" style="padding: 8px 15px; background:#3498db; color:white;">
                    <i class="fas fa-download"></i> File mẫu
                </button>

                <input type="file" id="excelInput" accept=".xlsx, .xls" style="display: none;" onchange="handleExcelUpload(this)">
                <button onclick="document.getElementById('excelInput').click()" class="btn-gray" style="padding: 8px 15px; background:#27ae60; color:white;">
                    <i class="fas fa-file-excel"></i> Nhập Excel
                </button>
            </div>
        </div>
    `;

    // 2. Tạo khung chứa Sơ đồ và Danh sách
    const layoutHtml = `
        <div class="dual-layout">
            <div class="layout-left">
                <h3 style="margin-bottom: 15px;">Sơ đồ nhà hàng</h3>
                <div class="table-grid" id="tableGridContainer"></div>
            </div>

            <div class="layout-right">
                <h3 style="margin-bottom: 15px;">Danh sách đặt bàn</h3>
                <div id="reservationList">
                    <div class="loading">Đang tải danh sách...</div>
                </div>
            </div>
        </div>
    `;

    content.innerHTML = toolbarHtml + layoutHtml;

    await fetchTableData();
    renderTableGrid(); // Vẽ lại ô bàn (đã có logic xóa nút xóa trong này nếu cần)
    renderReservationList();
}

function renderTableGrid() {
    const container = document.getElementById("tableGridContainer");
    if (!container) return;

    const sortedTables = [...allTables].sort((a, b) => {
        const nameA = (a.table_name || a.name || "").toString();
        const nameB = (b.table_name || b.name || "").toString();
        return nameA.localeCompare(nameB, 'vi', { numeric: true });
    });

    container.innerHTML = sortedTables.map(t => {
        const currentGuest = allReservations.find(r => r.table_id == t.id && r.status === 'confirmed');
        const isOccupied = (t.status === 'occupied' || currentGuest);
        const statusClass = isOccupied ? 'reserved' : 'available';

        return `
            <div class="table-box ${statusClass}" style="position:relative;">
                
                ${!isOccupied ? `
                <i class="fas fa-times-circle" 
                   style="position:absolute; top:5px; right:5px; color:#e74c3c; cursor:pointer; font-size:18px; z-index:10;" 
                   onclick="deleteTable('${t.id}')" title="Xóa bàn này"></i>
                ` : ''}

                <div onclick="window.handleTableClick('${t.id}')">
                    <div class="table-icon" style="color: ${isOccupied ? '#c0392b' : '#2ecc71'}">
                        <i class="fas ${isOccupied ? 'fa-user-check' : 'fa-couch'}"></i>
                    </div>
                    
                    <h4>${t.table_name || t.name}</h4>
                    
                    <div style="margin-top:5px;">
                        ${isOccupied && currentGuest 
                            ? `<strong style="color:#333; font-size:1.1em">${currentGuest.people_count}/${t.capacity || t.seats}</strong> 
                               <span style="color:#666; font-size:0.8em">khách</span>` 
                            : `<span style="color:#666">Sức chứa: ${t.capacity || t.seats}</span>`}
                    </div>
                    
                    ${isOccupied && currentGuest ? `
                        <div style="color:#555; font-size:12px; margin-top:8px; border-top:1px solid rgba(0,0,0,0.1); padding-top:5px; font-weight:500;">
                            ${currentGuest.customer_name}
                        </div>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

function renderReservationList() {

    const container = document.getElementById("reservationList");
    if (!container) return;

    const pendingGuests = allReservations.filter(r => r.status === 'pending');
    const confirmedGuests = allReservations.filter(r => r.status === 'confirmed');

    container.innerHTML = `
        <div class="list-section">
            <h3 style="margin-bottom:15px; color:#e67e22; border-bottom: 2px solid #e67e22; padding-bottom:5px; display:inline-block;">
                <i class="fas fa-clock"></i> Chờ xếp chỗ <span style="font-size:0.8em; background:#e67e22; color:white; padding:2px 8px; border-radius:10px;">${pendingGuests.length}</span>
            </h3>
            
            ${pendingGuests.length === 0 ? '<p style="color:#999; font-style:italic;">Không có khách đang chờ.</p>' : ''}

            ${pendingGuests.map(r => `
                <div class="reservation-card" style="border-left: 5px solid #f1c40f;">
                    <div class="res-info">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <strong style="font-size:16px;">${r.customer_name}</strong>
                            <span style="font-size:12px; color:#7f8c8d;">${new Date(r.booking_time).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                        <div style="margin-top:5px; color:#555;">
                            <span><i class="fas fa-users"></i> ${r.people_count} người</span> • 
                            <span><i class="fas fa-phone"></i> ${r.phone || '---'}</span>
                        </div>
                    </div>
                    <button class="btn-green" style="width:100%; margin-top:10px;" onclick="window.assignTableModal('${r.id}')">
                        <i class="fas fa-check"></i> Xếp bàn
                    </button>
                </div>
            `).join('')}
        </div>

        <div style="height: 30px;"></div> <div class="list-section">
            <h3 style="margin-bottom:15px; color:#27ae60; border-bottom: 2px solid #27ae60; padding-bottom:5px; display:inline-block;">
                <i class="fas fa-utensils"></i> Đang phục vụ <span style="font-size:0.8em; background:#27ae60; color:white; padding:2px 8px; border-radius:10px;">${confirmedGuests.length}</span>
            </h3>

            ${confirmedGuests.map(r => {
                const tableObj = allTables.find(t => t.id == r.table_id);
                const tableName = tableObj ? (tableObj.table_name || tableObj.name) : "Không xác định";

                return `
                <div class="reservation-card" style="border-left: 5px solid #2ecc71; background-color: #f6fffa;">
                    <div class="res-info">
                        <div style="display:flex; justify-content:space-between;">
                            <strong>${r.customer_name}</strong>
                            <span style="color:#27ae60; font-weight:bold; border:1px solid #27ae60; padding:2px 6px; border-radius:4px; font-size:12px;">
                                ${tableName}
                            </span>
                        </div>
                        <div style="margin-top:8px; font-size:14px; color:#666;">
                            <i class="fas fa-users"></i> ${r.people_count} khách
                        </div>
                    </div>
                    <div style="display:flex; gap:10px; margin-top:10px;">
                        <button class="btn-gray" style="flex:1; font-size:13px;" onclick="window.handleTableClick('${r.table_id}')">
                            <i class="fas fa-info-circle"></i> Chi tiết
                        </button>
                    </div>
                </div>
                `;
            }).join('')}
        </div>
    `;
}

window.handleTableClick = function(tableId) {
    const table = allTables.find(t => t.id == tableId);
    const guest = allReservations.find(r => r.table_id == tableId && r.status === 'confirmed');

    if (guest || (table && table.status === 'occupied')) {
        const bodyHtml = `
            <div style="text-align:center; padding: 10px 0;">
                <div style="font-size: 55px; color: #421f1b; margin-bottom: 20px;"><i class="fas fa-file-invoice-dollar"></i></div>
                <h2 style="margin-bottom:20px; color:#2c3e50; font-size: 24px;">Thanh toán ${table.table_name || table.name}</h2>
                
                <div style="background:#fdf2f2; padding:25px; border-radius:12px; text-align:left; border:1px solid #fab1a0; width: 95%; margin: 0 auto 20px auto; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                    <p style="font-size:17px; margin-bottom:12px;"><strong><i class="fas fa-user"></i> Khách hàng:</strong> ${guest ? guest.customer_name : "Khách vãng lai"}</p>
                    <p style="font-size:17px; margin-bottom:12px;"><strong><i class="fas fa-users"></i> Số lượng:</strong> ${guest ? guest.people_count : "?"} người</p>
                    <p style="font-size:17px;"><strong><i class="fas fa-clock"></i> Giờ vào:</strong> ${guest ? new Date(guest.booking_time).toLocaleTimeString('vi-VN') : "N/A"}</p>
                </div>
                
                <p style="font-size:16px; color:#636e72; font-style: italic;">Xác nhận khách đã hoàn tất thanh toán và dọn bàn?</p>
            </div>
        `;

        showUniversalModal("Trả bàn", bodyHtml, async () => {
            try {
                await supabaseClient.from('tables').update({ status: 'available' }).eq('id', tableId);
                
                if (guest) {
                    await supabaseClient.from('bookings').update({ status: 'completed' }).eq('id', guest.id);
                }

                alert("Đã trả bàn thành công!");
                await fetchTableData();
            } catch (err) {
                alert("Lỗi database: " + err.message);
            }
        });
    } else {
        const bodyHtml = `
            <div class="form-group" style="padding: 10px;">
                <label style="display:block; margin-bottom:8px;">Tên bàn</label>
                <input type="text" id="edit_t_name" value="${table.table_name || table.name}" style="width:100%;">
                <label style="display:block; margin-top:15px; margin-bottom:8px;">Sức chứa (người)</label>
                <input type="number" id="edit_t_seats" value="${table.capacity || table.seats}" style="width:100%;">
            </div>
        `;
        showUniversalModal("Cấu hình bàn", bodyHtml, async () => {
            const name = document.getElementById("edit_t_name").value;
            const seats = document.getElementById("edit_t_seats").value;
            await supabaseClient.from('tables').update({ table_name: name, capacity: seats }).eq('id', tableId);
            await fetchTableData();
        });
    }
};

window.openAddTableModal = function() {
    const bodyHtml = `
        <div class="form-group"><label>Tên bàn</label><input type="text" id="new_t_name" placeholder="Bàn 10"></div>
        <div class="form-group"><label>Số ghế</label><input type="number" id="new_t_seats" value="4"></div>
    `;
    showUniversalModal("Thêm bàn mới", bodyHtml, async () => {
        const name = document.getElementById("new_t_name").value;
        const seats = document.getElementById("new_t_seats").value;
        await supabaseClient.from('tables').insert([{ table_name: name, capacity: seats, status: 'available' }]);
        renderTableReservation();
    });
}

window.confirmReservation = function(id) {
    const res = allReservations.find(r => r.id === id);
    
    const availableTable = tables.find(t => !t.reserved && t.capacity >= res.people_count);
    
    if (!availableTable) {
        alert("Không còn bàn trống phù hợp cho " + res.people_count + " người!");
        return;
    }

    alert(`Đã xếp ${res.customer} vào ${availableTable.name}`);
    renderTableReservation();
}

window.releaseTable = function(tableId) {
    if (confirm("Xác nhận khách đã thanh toán và dọn bàn xong?")) {

        const table = allTables.find(t => t.id === tableId);
        if (table) table.reserved = false;

        allReservations.forEach(r => {
            if (r.id === tableId && r.status === 'confirmed') {
                r.status = 'completed'; 
            }
        });

        alert("Đã giải phóng " + table.table_name);
        renderTableReservation();
    }
};

window.rejectReservation = function(id) {
    if (confirm("Bạn có chắc chắn muốn hủy yêu cầu đặt chỗ này?")) {
        const index = reservations.findIndex(r => r.id === id);
        if (index !== -1) {
            reservations.splice(index, 1); 
            renderTableReservation();
        }
    }
};

window.openBookingForm = function(resId) {
    const res = allReservations.find(r => r.id === resId);
    const bodyHtml = `
        <div class="form-group">
            <label>Tên khách hàng</label>
            <input type="text" id="custName" value="${res.customer}">
        </div>
        <div class="form-group">
            <label>Số người</label>
            <input type="number" id="custPeople" value="${res.people}">
        </div>
    `;

    showUniversalModal("Xác nhận xếp bàn", bodyHtml, async () => {
        res.customer_name = document.getElementById("custName").value;
        res.people_count = document.getElementById("custPeople").value;
        res.status = 'confirmed';
        renderTableReservation(); // Load lại sơ đồ bàn
    });
}

window.assignTableModal = function(reservationId) {
    const resItem = allReservations.find(r => r.id == reservationId);
    if (!resItem) return;

    const availableTables = allTables.filter(t => t.status === 'available');

    if (availableTables.length === 0) {
        alert("Hiện tại không còn bàn trống nào!");
        return;
    }

    const bodyHtml = `
        <div style="padding: 15px; text-align:center;">
            <div style="margin-bottom: 20px;">
                <p style="font-size:18px; color:#2c3e50;">Khách: <strong>${resItem.customer_name}</strong></p>
                <p style="color:#7f8c8d;">Số lượng: ${resItem.people_count} người</p>
            </div>
            
            <div class="form-group" style="text-align:left;">
                <label style="font-weight:600; color:#333;">Chọn bàn trống:</label>
                <select id="select_table_id" style="width:100%; padding: 12px; margin-top:8px; border: 1px solid #ddd; border-radius: 6px; font-size:16px;">
                    ${availableTables.map(t => `
                        <option value="${t.id}">
                            ${t.table_name || t.name} (Ghế: ${t.capacity})
                        </option>
                    `).join('')}
                </select>
            </div>
            <p style="font-size:13px; color:#e74c3c; margin-top:10px;">
                <i class="fas fa-info-circle"></i> Lưu ý: Bàn sẽ chuyển sang trạng thái "Đang phục vụ" ngay lập tức.
            </p>
        </div>
    `;

    showUniversalModal("Xếp bàn cho khách", bodyHtml, async () => {
        const selectedTableId = document.getElementById("select_table_id").value;

        try {
            // 1. Cập nhật trạng thái bàn thành 'occupied' (Có người)
            const { error: errTable } = await supabaseClient
                .from('tables')
                .update({ status: 'occupied' })
                .eq('id', selectedTableId);
            
            if (errTable) throw errTable;

            const { error: errBooking } = await supabaseClient
                .from('bookings')
                .update({ 
                    status: 'confirmed', 
                    table_id: selectedTableId,
                    booking_time: new Date().toISOString()
                })
                .eq('id', reservationId);

            if (errBooking) throw errBooking;

            alert("Đã xếp bàn thành công!");
            await fetchTableData();

        } catch (error) {
            console.error(error);
            alert("Lỗi khi xếp bàn: " + error.message);
        }
    });
}

window.addNewTable = function() {
    const bodyHtml = `
        <div class="form-group" style="margin-bottom:15px;">
            <label>Tên bàn (Ví dụ: Bàn 10, VIP 1):</label>
            <input type="text" id="new_table_name" class="form-control" placeholder="Nhập tên bàn..." style="width:100%; padding:10px; border:1px solid #ddd; border-radius:5px;">
        </div>
        <div class="form-group">
            <label>Số ghế:</label>
            <input type="number" id="new_table_capacity" class="form-control" value="4" style="width:100%; padding:10px; border:1px solid #ddd; border-radius:5px;">
        </div>
    `;

    showUniversalModal("Thêm bàn mới", bodyHtml, async () => {
        const name = document.getElementById("new_table_name").value;
        const capacity = document.getElementById("new_table_capacity").value;

        if (!name) { alert("Vui lòng nhập tên bàn!"); return; }

        try {
            const { error } = await supabaseClient.from('tables').insert([
                { table_name: name, capacity: parseInt(capacity), status: 'available' }
            ]);
            
            if (error) throw error;
            
            alert("Thêm bàn thành công!");
            await fetchTableData();
        } catch (err) {
            alert("Lỗi: " + err.message);
        }
    });
};

window.deleteTable = async function(id) {
    if (!confirm("Bạn có chắc chắn muốn xóa bàn này không?")) return;
    
    try {
        const { error } = await supabaseClient.from('tables').delete().eq('id', id);
        if (error) throw error;
        await fetchTableData();
    } catch (err) {
        alert("Không thể xóa bàn (có thể do đang có đơn đặt hoặc lỗi hệ thống).");
        console.error(err);
    }
};

window.downloadTableTemplate = function() {
    const data = [
        { "TenBan": "Bàn 01", "SoGhe": 4 },
        { "TenBan": "Bàn 02", "SoGhe": 4 },
        { "TenBan": "VIP 01", "SoGhe": 10 }
    ];
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "DanhSachBan");
    XLSX.writeFile(wb, "Mau_Danh_Sach_Ban.xlsx");
};

window.handleExcelUpload = function(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        if (jsonData.length === 0) {
            alert("File không có dữ liệu!");
            return;
        }
        confirmImportModal(jsonData);
    };
    reader.readAsArrayBuffer(file);
    input.value = ''; // Reset input
};

function confirmImportModal(data) {
    // Lưu data vào biến tạm để dùng khi bấm nút
    window.tempImportData = data;

    const bodyHtml = `
        <p>Đã đọc được <strong>${data.length}</strong> bàn từ file.</p>
        <div style="background:#f9f9f9; padding:10px; border-radius:5px; margin-bottom:15px; max-height:200px; overflow-y:auto; border:1px solid #eee;">
            <table style="width:100%; font-size:13px;">
                <thead><tr style="background:#eee;"><th>Tên bàn</th><th>Ghế</th></tr></thead>
                <tbody>
                    ${data.map(item => `
                        <tr>
                            <td>${item['TenBan'] || item['name'] || '---'}</td>
                            <td>${item['SoGhe'] || item['capacity'] || 4}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        
        <div style="display:flex; gap:10px; justify-content:center; margin-top:10px;">
            <button onclick="processImport('append')" class="btn-green" style="flex:1;">
                <i class="fas fa-plus"></i> Thêm mới (Giữ bàn cũ)
            </button>
            <button onclick="processImport('replace')" class="btn-red" style="flex:1;">
                <i class="fas fa-sync"></i> Thay thế toàn bộ
            </button>
        </div>
    `;

    // Hiển thị modal nhưng ẩn nút Save mặc định đi vì ta dùng nút riêng
    showUniversalModal("Xác nhận nhập Excel", bodyHtml, () => {});
    document.getElementById("modalSaveBtn").style.display = "none";
}

window.processImport = async function(mode) {
    const data = window.tempImportData;
    if (!data) return;

    try {
        const formattedData = data.map(item => ({
            table_name: item['TenBan'] || item['name'], 
            capacity: item['SoGhe'] || item['capacity'] || 4,
            status: 'available'
        })).filter(item => item.table_name);

        if (mode === 'replace') {
            if (!confirm("CẢNH BÁO: Toàn bộ bàn cũ sẽ bị xóa và thay bằng danh sách mới. Các khách đang ngồi sẽ được chuyển về danh sách 'Chờ xếp chỗ'.")) return;
            
            const { error: updateError } = await supabaseClient
                .from('bookings')
                .update({ 
                    table_id: null,
                    status: 'pending'
                })
                .not('table_id', 'is', null);

            if (updateError) {
                console.warn("Lỗi cập nhật booking:", updateError.message);
            }

            const { error: delError } = await supabaseClient
                .from('tables')
                .delete()
                .not('id', 'is', null);
            
            if (delError) throw new Error("Không thể xóa bàn cũ (Lỗi ràng buộc dữ liệu): " + delError.message);
        }

        const { error: insertError } = await supabaseClient.from('tables').insert(formattedData);
        if (insertError) throw insertError;

        alert("Cập nhật sơ đồ bàn thành công! Tất cả khách cũ đã được đưa về danh sách Chờ.");
        document.getElementById("universalModal").style.display = "none";
        document.getElementById("modalSaveBtn").style.display = "inline-block"; 
        await fetchTableData();

    } catch (err) {
        alert("Lỗi khi nhập: " + err.message);
        console.error(err);
    }
};

// Báo cáo
async function renderFinance() {
    pageTitle.innerText = "Báo cáo Doanh thu & Chi phí";
    
    const toolbarHtml = `
        <div class="finance-toolbar">
            <div>
                <h3 style="margin:0; color:#2c3e50;">Tổng quan tài chính</h3>
                <p style="margin:0; font-size:13px; color:#7f8c8d;" id="recordCount">Đang tải...</p>
            </div>
            <div style="display:flex; gap:10px;">
                <button onclick="generateDummyFinanceData()" class="btn-gray" style="background:#f39c12; color:white;">
                    <i class="fas fa-magic"></i> Tạo Data Ảo (Test)
                </button>
                <button onclick="downloadFinanceTemplate()" class="btn-gray" style="background:#3498db; color:white;">
                    <i class="fas fa-download"></i> Tải Mẫu
                </button>
                
                <input type="file" id="financeExcelInput" accept=".xlsx, .xls" style="display: none;" onchange="handleFinanceImport(this)">
                <button onclick="document.getElementById('financeExcelInput').click()" class="btn-gray" style="background:#27ae60; color:white;">
                    <i class="fas fa-file-excel"></i> Nhập Excel
                </button>
                
                <button onclick="exportFinanceExcel()" class="btn-green">
                    <i class="fas fa-file-export"></i> Xuất Báo Cáo
                </button>
            </div>
        </div>
    `;

    const mainHtml = `
        <div id="financeStats" class="summary-cards">
            </div>

        <div class="table-container">
            <table class="finance-table" style="width:100%; border-collapse: collapse;">
                <thead>
                    <tr>
                        <th style="padding:15px;">Ngày tháng</th>
                        <th>Loại</th>
                        <th>Nội dung</th>
                        <th>Danh mục</th>
                        <th style="text-align:right; padding-right:20px;">Số tiền (VNĐ)</th>
                    </tr>
                </thead>
                <tbody id="financeTableBody">
                    </tbody>
            </table>
        </div>
    `;

    content.innerHTML = toolbarHtml + mainHtml;
 if (!currentRestaurantId) {
        console.warn("Chưa có restaurant_id");
        return;
    }

    const { data, error } = await supabaseClient
        .from("financial_reports")
        .select("*")
    
        .order("transaction_date", { ascending: false });

    if (error) {
        console.error("Lỗi Supabase:", error);
        alert("Không tải được báo cáo");
        return;
    }

    console.log("FINANCE DATA:", data); // 👈 BẮT BUỘC PHẢI THẤY

    renderFinanceTable(data);
}



function renderFinanceTable(data) {
    const tbody = document.getElementById("financeTableBody");
    tbody.innerHTML = "";

    data.forEach(item => {
        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${item.transaction_date}</td>
            <td>${item.type === "income" ? "Doanh thu" : "Chi phí"}</td>
            <td>${item.description}</td>
            <td>${item.type === "income" ? "Thu" : "Chi"}</td>
            <td>${Number(item.amount).toLocaleString("vi-VN")} đ</td>
        `;

        tbody.appendChild(tr);
    });
}



function refreshFinanceUI() {
    const tableBody = document.getElementById("financeTableBody");
    const statsContainer = document.getElementById("financeStats");
    const countLabel = document.getElementById("recordCount");

    if (!tableBody) return;

    // 1. Tính toán tổng
    let totalThu = 0;
    let totalChi = 0;

    // Sắp xếp theo ngày mới nhất
    currentFinanceData.sort((a, b) => new Date(b.date) - new Date(a.date));

    // 2. Vẽ bảng
    let rowsHtml = currentFinanceData.map(item => {
        const isThu = item.type === 'Thu';
        const amountVal = parseFloat(item.amount);
        
        if (isThu) totalThu += amountVal;
        else totalChi += amountVal;

        return `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding:12px 15px;">${formatDateVN(item.date)}</td>
                <td><span class="${isThu ? 'text-green' : 'text-red'}">${item.type}</span></td>
                <td>${item.note}</td>
                <td><span style="background:#f1f2f6; padding:2px 8px; border-radius:4px; font-size:12px;">${item.category || 'Khác'}</span></td>
                <td style="text-align:right; padding-right:20px; font-weight:500;">
                    ${amountVal.toLocaleString('vi-VN')} ₫
                </td>
            </tr>
        `;
    }).join('');

    tableBody.innerHTML = rowsHtml;

    // 3. Cập nhật Thẻ thống kê
    const balance = totalThu - totalChi;
    statsContainer.innerHTML = `
        <div class="card">
            <div class="card-icon bg-green"><i class="fas fa-arrow-down"></i></div>
            <div class="card-info">
                <h5>Tổng Thu</h5>
                <p style="color:#27ae60;">${totalThu.toLocaleString('vi-VN')} ₫</p>
            </div>
        </div>
        <div class="card">
            <div class="card-icon bg-red"><i class="fas fa-arrow-up"></i></div>
            <div class="card-info">
                <h5>Tổng Chi</h5>
                <p style="color:#c0392b;">${totalChi.toLocaleString('vi-VN')} ₫</p>
            </div>
        </div>
        <div class="card">
            <div class="card-icon bg-blue"><i class="fas fa-wallet"></i></div>
            <div class="card-info">
                <h5>Lợi Nhuận Ròng</h5>
                <p style="color:${balance >= 0 ? '#2980b9' : '#e74c3c'};">
                    ${balance.toLocaleString('vi-VN')} ₫
                </p>
            </div>
        </div>
    `;

    countLabel.innerText = `Hiển thị ${currentFinanceData.length} giao dịch`;
}

window.generateDummyFinanceData = function() {
    const count = 50; // Tạo 50 dòng dữ liệu
    const categoriesThu = ["Bán hàng", "Phí dịch vụ", "Tiền tip"];
    const categoriesChi = ["Nhập hàng", "Điện nước", "Lương nhân viên", "Sửa chữa", "Marketing"];
    
    const newData = [];
    
    for (let i = 0; i < count; i++) {
        const isThu = Math.random() > 0.4; // 60% là Thu
        const type = isThu ? "Thu" : "Chi";
        const catList = isThu ? categoriesThu : categoriesChi;
        const category = catList[Math.floor(Math.random() * catList.length)];
        
        // Random ngày trong 30 ngày qua
        const date = new Date();
        date.setDate(date.getDate() - Math.floor(Math.random() * 30));
        const dateStr = date.toISOString().split('T')[0];

        // Random tiền (từ 100k đến 5tr)
        const amount = (Math.floor(Math.random() * 50) + 1) * 100000;

        newData.push({
            id: Date.now() + i,
            date: dateStr,
            type: type,
            category: category,
            note: `Giao dịch tự động #${i + 1}`,
            amount: amount
        });
    }

    // Gộp vào dữ liệu hiện tại (để test)
    currentFinanceData = newData; 
    budgets = newData; // Lưu vào biến toàn cục giả lập
    
    alert(`Đã tạo thành công ${count} dòng dữ liệu mẫu!`);
    refreshFinanceUI();
};

window.downloadFinanceTemplate = function() {
    const data = [
        { "Ngay": "2023-10-20", "Loai": "Thu", "SoTien": 1500000, "DanhMuc": "Bán hàng", "GhiChu": "Thu ca sáng" },
        { "Ngay": "2023-10-20", "Loai": "Chi", "SoTien": 500000, "DanhMuc": "Nguyên liệu", "GhiChu": "Mua rau" }
    ];
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "MauBaoCao");
    XLSX.writeFile(wb, "Mau_Nhap_Lieu_Tai_Chinh.xlsx");
};

window.exportFinanceExcel = function() {
    if (currentFinanceData.length === 0) {
        alert("Không có dữ liệu để xuất!");
        return;
    }

    const dataToExport = currentFinanceData.map(item => ({
        "Ngày": item.date,
        "Loại": item.type,
        "Số Tiền": item.amount,
        "Danh Mục": item.category,
        "Ghi Chú": item.note
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "BaoCaoTaiChinh");
    XLSX.writeFile(wb, `Bao_Cao_${new Date().toISOString().slice(0,10)}.xlsx`);
};

window.handleFinanceImport = function(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);

        if (jsonData.length === 0) { alert("File rỗng!"); return; }

        // Map dữ liệu Excel về đúng cấu trúc
        const mappedData = jsonData.map((row, index) => ({
            id: Date.now() + index,
            date: row['Ngay'] || row['Date'] || new Date().toISOString().split('T')[0],
            type: row['Loai'] || row['Type'] || 'Thu',
            amount: row['SoTien'] || row['Amount'] || 0,
            category: row['DanhMuc'] || row['Category'] || 'Khác',
            note: row['GhiChu'] || row['Note'] || ''
        }));

        if(confirm(`Tìm thấy ${mappedData.length} giao dịch. Bạn muốn thay thế dữ liệu hiện tại không?`)) {
            currentFinanceData = mappedData;
            budgets = mappedData; // Update biến gốc
            refreshFinanceUI();
            alert("Nhập dữ liệu thành công!");
        }
    };
    reader.readAsArrayBuffer(file);
    input.value = '';
};

function formatDateVN(dateString) {
    if(!dateString) return "";
    const [y, m, d] = dateString.split('-');
    return `${d}/${m}/${y}`;
}

// Khách hàng
window.renderCustomerPage = async function() {
    // 1. Hiển thị thông báo đang tải để người dùng biết
    pageTitle.innerText = "Quản lý Khách hàng";
    document.getElementById("content").innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 60vh;">
            <div style="width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid var(--manager-primary); border-radius: 50%; animation: spin 1s linear infinite;"></div>
            <p style="margin-top: 20px; color: #666; font-weight: 500;">Đang đồng bộ dữ liệu...</p>
        </div>
        <style>@keyframes spin {0% {transform: rotate(0deg);} 100% {transform: rotate(360deg);}}</style>
    `;

    try {
        // Tải dữ liệu song song nếu chưa có
        const promises = [];
        if (!allTables || allTables.length === 0) {
            promises.push(supabaseClient.from('tables').select('*').then(({ data }) => allTables = data || []));
        }
        if (!allReservations || allReservations.length === 0) {
            promises.push(supabaseClient.from('bookings').select('*').then(({ data }) => allReservations = data || []));
        }
        if (promises.length > 0) await Promise.all(promises);

        const today = new Date().toISOString().split('T')[0];

        // HTML Structure Mới - Chuyên nghiệp hơn
        const html = `
            <div class="control-panel">
                <div class="control-group">
                    <i class="far fa-calendar-alt" style="color: var(--manager-primary); font-size: 20px;"></i>
                    <label>Xem báo cáo ngày:</label>
                    <input type="date" id="customerDateFilter" class="custom-date-input" value="${today}" onchange="updateCustomerStats()">
                </div>
                <button class="btn-green" onclick="exportDailyCustomerExcel()" style="display: flex; align-items: center; gap: 8px; padding: 10px 20px;">
                    <i class="fas fa-file-excel"></i> Xuất Excel
                </button>
            </div>

            <div class="kpi-grid">
                <div class="kpi-card">
                    <div class="kpi-icon bg-light-red"><i class="fas fa-users"></i></div>
                    <div class="kpi-info">
                        <h4>Tổng Khách Dự Kiến</h4>
                        <div class="kpi-value" id="kpiTotalGuests">0</div>
                    </div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-icon bg-light-blue"><i class="fas fa-clipboard-check"></i></div>
                    <div class="kpi-info">
                        <h4>Số Bàn Đã Đặt</h4>
                        <div class="kpi-value" id="kpiTotalBookings">0</div>
                    </div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-icon bg-light-green"><i class="fas fa-clock"></i></div>
                    <div class="kpi-info">
                        <h4>Giờ Đông Nhất</h4>
                        <div class="kpi-value" id="kpiPeakHour">--:--</div>
                    </div>
                </div>
            </div>

            <div class="analytics-container">
                <div class="card-box">
                    <div class="card-header">
                        <h3 class="card-title">Biểu Đồ Lưu Lượng Khách</h3>
                    </div>
                    <div class="chart-wrapper" style="flex:1; position: relative; min-height: 300px;">
                        <canvas id="customerChart"></canvas>
                    </div>
                </div>

                <div class="card-box" style="padding: 0; overflow: hidden;">
                    <div class="card-header" style="padding: 20px; margin: 0;">
                        <h3 class="card-title">Chi Tiết Đặt Bàn</h3>
                    </div>
                    <div style="overflow-y: auto; height: 350px; padding: 0;">
                        <table class="mini-table">
                            <thead style="position: sticky; top: 0; background: #fff; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                                <tr>
                                    <th>Giờ</th>
                                    <th>Tên Khách</th>
                                    <th>Bàn</th>
                                    <th style="text-align: right;">SL</th>
                                </tr>
                            </thead>
                            <tbody id="bookingTableBody">
                                </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        document.getElementById("content").innerHTML = html;
        updateCustomerStats(); // Tính toán lần đầu

    } catch (error) {
        console.error("Lỗi:", error);
        document.getElementById("content").innerHTML = `<div style="color:red; text-align:center; padding:20px;">Lỗi tải dữ liệu: ${error.message}</div>`;
    }
};

// Hàm xử lý logic chính khi chọn ngày
window.updateCustomerStats = function() {
    const selectedDate = document.getElementById("customerDateFilter").value;
    
    // Lọc dữ liệu
    const dailyBookings = allReservations.filter(res => 
        res.booking_time && res.booking_time.startsWith(selectedDate)
    ).sort((a, b) => new Date(a.booking_time) - new Date(b.booking_time));

    // --- Xử lý KPI ---
    let totalGuests = 0;
    const hourCounts = {}; // Dùng để tìm giờ cao điểm
    let bookingTableHtml = "";

    dailyBookings.forEach(booking => {
        // Tính tổng khách
        const guests = parseInt(booking.people_count) || 0;
        totalGuests += guests;

        // Đếm giờ cao điểm
        const hour = new Date(booking.booking_time).getHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + guests;

        // Tìm tên bàn
        const table = allTables.find(t => t.id == booking.table_id);
        const tableName = table ? table.name : "N/A";
        const timeStr = new Date(booking.booking_time).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'});

        // HTML cho bảng nhỏ bên phải
        bookingTableHtml += `
            <tr>
                <td style="color: var(--manager-primary); font-weight:bold;">${timeStr}</td>
                <td>
                    <div style="font-weight: 500; color: #333;">${booking.customer_name || 'Khách lẻ'}</div>
                    <div style="font-size: 11px; color: #888;">${booking.customer_phone || ''}</div>
                </td>
                <td><span class="table-badge">${tableName}</span></td>
                <td style="text-align: right; font-weight: bold;">${guests}</td>
            </tr>
        `;
    });

    if (dailyBookings.length === 0) {
        bookingTableHtml = `<tr><td colspan="4" style="text-align:center; padding:30px; color:#999;">Không có khách vào ngày này</td></tr>`;
    }

    // Cập nhật DOM
    document.getElementById("bookingTableBody").innerHTML = bookingTableHtml;
    document.getElementById("kpiTotalGuests").innerText = totalGuests;
    document.getElementById("kpiTotalBookings").innerText = dailyBookings.length;

    // Tìm giờ cao điểm
    let peakHour = "--:--";
    let maxCount = 0;
    for (const [h, count] of Object.entries(hourCounts)) {
        if (count > maxCount) {
            maxCount = count;
            peakHour = `${h}:00`;
        }
    }
    document.getElementById("kpiPeakHour").innerText = peakHour;

    // --- Vẽ biểu đồ ---
    renderCustomerChart(dailyBookings);
};

// Hàm vẽ biểu đồ
window.renderCustomerChart = function(bookings) {
    const ctx = document.getElementById('customerChart').getContext('2d');

    // Tạo mảng dữ liệu 14 tiếng (8h - 22h)
    const labels = [];
    const dataValues = [];
    for (let i = 8; i <= 22; i++) {
        labels.push(`${i}h`);
        let count = 0;
        bookings.forEach(b => {
            if (new Date(b.booking_time).getHours() === i) {
                count += (parseInt(b.people_count) || 0);
            }
        });
        dataValues.push(count);
    }

    if (customerChartInstance) customerChartInstance.destroy();

    // Gradient màu cho đẹp
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(235, 63, 98, 0.5)');
    gradient.addColorStop(1, 'rgba(235, 63, 98, 0.0)');

    customerChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Lượng khách',
                data: dataValues,
                borderColor: '#eb3f62',
                backgroundColor: gradient,
                borderWidth: 2,
                pointBackgroundColor: '#fff',
                pointBorderColor: '#eb3f62',
                pointRadius: 4,
                fill: true,
                tension: 0.4 // Làm mềm đường cong
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    padding: 10,
                    cornerRadius: 8,
                    displayColors: false,
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { borderDash: [5, 5], color: '#f0f0f0' },
                    ticks: { precision: 0 }
                },
                x: {
                    grid: { display: false }
                }
            }
        }
    });
};

window.exportDailyCustomerExcel = function() {
    const selectedDate = document.getElementById("customerDateFilter").value;
    
    const dailyBookings = allReservations.filter(res => res.booking_time && res.booking_time.startsWith(selectedDate));

    if (dailyBookings.length === 0) return alert("Không có dữ liệu để xuất!");

    const detailData = dailyBookings.map(b => {
        const table = allTables.find(t => t.id == b.table_id);
        return {
            "Ngày": selectedDate,
            "Giờ đến": new Date(b.booking_time).toLocaleTimeString('vi-VN'),
            "Tên Khách Hàng": b.customer_name,
            "Số Điện Thoại": b.phone,
            "Số Lượng Khách": b.people_count,
            "Bàn": table ? table.name : "N/A",
            "Ngày Tạo Đơn": new Date(b.created_at).toLocaleString('vi-VN')
        };
    });
    const hoursCount = {};
    dailyBookings.forEach(b => {
        const h = new Date(b.booking_time).getHours();
        const key = `${h}:00 - ${h+1}:00`;
        if (!hoursCount[key]) hoursCount[key] = 0;
        hoursCount[key] += (parseInt(b.people_count) || 0);
    });

    const chartData = Object.keys(hoursCount).map(key => ({
        "Khung Giờ": key,
        "Tổng Số Khách": hoursCount[key]
    }));

    // Tạo Workbook
    const wb = XLSX.utils.book_new();
    
    // Tạo Sheet Chi tiết
    const wsDetail = XLSX.utils.json_to_sheet(detailData);
    XLSX.utils.book_append_sheet(wb, wsDetail, "ChiTietKhachHang");

    // Tạo Sheet Biểu đồ
    const wsChart = XLSX.utils.json_to_sheet(chartData);
    XLSX.utils.book_append_sheet(wb, wsChart, "SoLieuBieuDo");

    // Xuất file
    XLSX.writeFile(wb, `BaoCao_KhachHang_${selectedDate}.xlsx`);
};
// Nhân viên

window.renderStaffPage = async function() {
    pageTitle.innerText = "Quản lý Nhân sự và Lịch làm việc";
    document.getElementById("content").innerHTML = `
        <div style="text-align: center; padding: 50px;">
            <i class="fas fa-spinner fa-spin" style="font-size: 40px; color: var(--manager-primary);"></i>
            <p style="margin-top: 10px;">Đang tải dữ liệu nhân sự...</p>
        </div>
    `;

    try {
        // 2. Tải dữ liệu song song 
        const promises = [];
        
        // Luôn tải lại để đảm bảo dữ liệu mới nhất
        promises.push(supabaseClient.from('staffs').select('*').order('id', { ascending: true }).then(({ data }) => staffs = data || []));
        promises.push(supabaseClient.from('scheduling').select('*').then(({ data }) => scheduling = data || []));
        
        await Promise.all(promises);

        // 3. Render Khung Trang
        const html = `
            <div class="page-header">
                <div class="staff-tabs">
                    <button class="tab-btn ${currentStaffTab === 'list' ? 'active' : ''}" onclick="switchStaffTab('list')">
                        <i class="fas fa-users"></i> Danh Sách
                    </button>
                    <button class="tab-btn ${currentStaffTab === 'schedule' ? 'active' : ''}" onclick="switchStaffTab('schedule')">
                        <i class="fas fa-calendar-alt"></i> Xếp Lịch Làm Việc
                    </button>
                </div>
            </div>
            
            <div id="staffTabContent">
                </div>
        `;

        document.getElementById("content").innerHTML = html;
        
        // 4. Render nội dung theo Tab đang chọn
        if (currentStaffTab === 'list') renderStaffListView();
        else renderScheduleView();

    } catch (error) {
        console.error("Lỗi tải staff:", error);
        document.getElementById("content").innerHTML = `<p style="color:red; text-align:center;">Lỗi: ${error.message}</p>`;
    }
};

// Hàm chuyển đổi Tab 
window.switchStaffTab = function(tabName) {
    currentStaffTab = tabName;
    
    // Update UI active class
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    // Tìm button vừa click để add class active 
    event.currentTarget.classList.add('active'); 

    if (tabName === 'list') renderStaffListView();
    else renderScheduleView();
};

window.renderStaffListView = function() {
    // Tính KPI
    const totalStaff = staffs.length;
    const totalChefs = staffs.filter(s => (s.role || '').toLowerCase().includes('bếp')).length;
    const totalWaiters = staffs.filter(s => (s.role || '').toLowerCase().includes('phục vụ')).length;

    const html = `
        <div class="kpi-grid">
            <div class="kpi-card">
                <div class="kpi-icon bg-light-red"><i class="fas fa-user-tie"></i></div>
                <div class="kpi-info"><h4>Tổng Nhân Sự</h4><div class="kpi-value">${totalStaff}</div></div>
            </div>
            <div class="kpi-card">
                <div class="kpi-icon bg-light-blue"><i class="fas fa-utensils"></i></div>
                <div class="kpi-info"><h4>Bếp</h4><div class="kpi-value">${totalChefs}</div></div>
            </div>
            <div class="kpi-card">
                <div class="kpi-icon bg-light-green"><i class="fas fa-concierge-bell"></i></div>
                <div class="kpi-info"><h4>Phục Vụ</h4><div class="kpi-value">${totalWaiters}</div></div>
            </div>
        </div>

        <div class="control-panel">
             <div class="control-group">
                <input type="text" id="staffSearch" placeholder="Tìm tên nhân viên..." onkeyup="filterStaff()" class="form-control" style="width: 250px;">
            </div>
            <div style="display:flex; gap:10px;">
                <button class="btn-green" onclick="openAddStaffModal()"><i class="fas fa-plus"></i> Thêm Mới</button>
                <button class="btn-green" onclick="exportStaffExcel()" style="background:#27ae60;"><i class="fas fa-file-excel"></i> Xuất Excel</button>
            </div>
        </div>

        <div class="table-box" style="padding: 0; overflow: hidden;">
            <table class="table" style="margin-top:0;">
                <thead>
                    <tr>
                        <th style="padding-left:30px;">Nhân Viên</th>
                        <th>Chức Vụ</th>
                        <th>SĐT</th>
                        <th>Ca Mặc Định</th>
                        <th style="text-align: right; padding-right:30px;">Hành Động</th>
                    </tr>
                </thead>
                <tbody id="staffTableBody"></tbody>
            </table>
        </div>
    `;
    document.getElementById("staffTabContent").innerHTML = html;
    renderStaffTable(staffs); // Gọi hàm vẽ bảng
};

// Hàm vẽ bảng dữ liệu (Tách ra để dùng cho Search)
window.renderStaffTable = function(dataList) {
    const tbody = document.getElementById("staffTableBody");
    if (!tbody) return;
    
    if (dataList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px;">Không tìm thấy dữ liệu.</td></tr>`;
        return;
    }

    tbody.innerHTML = dataList.map(s => {
        let roleBadge = 'role-other';
        const r = (s.role || '').toLowerCase();
        if(r.includes('bếp')) roleBadge = 'role-chef';
        else if(r.includes('phục vụ')) roleBadge = 'role-waiter';
        else if(r.includes('quản lý')) roleBadge = 'role-manager';

        return `
            <tr>
                <td style="padding-left:30px;">
                    <div class="staff-info">
                        <div class="staff-avatar" style="background:${stringToColor(s.name)};">${s.name.charAt(0).toUpperCase()}</div>
                        <div>
                            <span class="staff-name">${s.name}</span>
                            <span class="staff-sub">ID: #${s.id}</span>
                        </div>
                    </div>
                </td>
                <td><span class="role-badge ${roleBadge}">${s.role}</span></td>
                <td>${s.phone || '-'}</td>
                <td><span style="background:#f4f6f8; padding:4px 8px; border-radius:4px;">${s.shift || 'Full-time'}</span></td>
                <td style="text-align:right; padding-right:30px;">
                     <button class="action-btn btn-edit" onclick="editStaff('${s.id}')" title="Sửa"><i class="fas fa-edit"></i></button>
                     <button class="action-btn btn-delete" onclick="deleteStaff('${s.id}')" title="Xóa"><i class="fas fa-trash-alt"></i></button>
                </td>
            </tr>
        `;
    }).join('');
};

window.filterStaff = function() {
    const term = document.getElementById("staffSearch").value.toLowerCase();
    const filtered = staffs.filter(s => (s.name || '').toLowerCase().includes(term));
    renderStaffTable(filtered);
};

function stringToColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    return '#' + "00000".substring(0, 6 - c.length) + c;
}

window.renderScheduleView = function() {
    const days = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ Nhật"];
    const shifts = [
        { id: "Sang", label: "Sáng (6h-14h)" }, 
        { id: "Chieu", label: "Chiều (14h-22h)" }
    ];

    let tableHtml = `
        <div class="schedule-container">
            <h3 style="margin-bottom: 15px; color: #333;">Lịch Làm Việc Tuần Này</h3>
            <table class="schedule-table">
                <thead>
                    <tr>
                        <th style="width: 100px;">Ca / Thứ</th>
                        ${days.map(d => `<th>${d}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
    `;

    shifts.forEach(shiftObj => {
        tableHtml += `<tr>
            <td style="font-weight:bold; text-align:center; background:#fcfcfc;">${shiftObj.label}</td>`;
            
        days.forEach(day => {
            // Lọc nhân viên trong ô này
            // Logic: day_of_week trong DB là "Thứ 2", shift_type là "Sang" hoặc "Chieu"
            const staffInSlot = schedules.filter(s => s.day_of_week === day && s.shift_type === shiftObj.id);

            let content = "";
            staffInSlot.forEach(s => {
                // Lấy role để tô màu
                const staffInfo = staffs.find(st => st.id == s.staff_id);
                const roleClass = (staffInfo && (staffInfo.role||'').toLowerCase().includes('bếp')) ? 'role-bep' : 'role-pv';

                content += `
                    <div class="shift-tag ${roleClass}">
                        <span>${s.staff_name}</span>
                        <i class="fas fa-times remove-shift" onclick="deleteSchedule('${s.id}')" title="Xóa lịch"></i>
                    </div>
                `;
            });

            tableHtml += `
                <td>
                    <div style="min-height: 80px;">${content}</div>
                    <button class="add-shift-btn" onclick="openAddScheduleModal('${day}', '${shiftObj.id}')">
                        + Thêm
                    </button>
                </td>
            `;
        });
        tableHtml += `</tr>`;
    });

    tableHtml += `</tbody></table></div>`;
    document.getElementById("staffTabContent").innerHTML = tableHtml;
};


// 1. Thêm Nhân Viên
window.openAddStaffModal = function() {
    const html = `
        <div class="form-group">
            <label>Họ và Tên <span style="color:red">*</span></label>
            <input type="text" id="newStaffName" class="form-control" placeholder="Nhập họ tên...">
        </div>
        <div class="form-group">
            <label>Chức Vụ</label>
            <select id="newStaffRole" class="form-control">
                <option value="Phục vụ">Phục vụ</option>
                <option value="Bếp">Bếp</option>
                <option value="Quản lý">Quản lý</option>
                <option value="Thu ngân">Thu ngân</option>
            </select>
        </div>
        <div class="form-group">
            <label>Ca Mặc Định</label>
            <select id="newStaffShift" class="form-control">
                <option value="Full-time">Full-time</option>
                <option value="Sáng">Ca Sáng</option>
                <option value="Chiều">Ca Chiều</option>
            </select>
        </div>
        <div class="form-group">
            <label>Số Điện Thoại</label>
            <input type="text" id="newStaffPhone" class="form-control" placeholder="Ví dụ: 0909xxxxxx">
        </div>
    `;

    showUniversalModal("Thêm Nhân Viên Mới", html, async () => {
        // Lấy dữ liệu từ form
        const name = document.getElementById("newStaffName").value.trim();
        const role = document.getElementById("newStaffRole").value;
        const shift = document.getElementById("newStaffShift").value;
        const phone = document.getElementById("newStaffPhone").value.trim();

        // Kiểm tra dữ liệu đầu vào
        if (!name) {
            alert("Vui lòng nhập tên nhân viên!");
            return; // Dừng lại không lưu
        }

        // Gửi lên Supabase
        const { data, error } = await supabaseClient
            .from('staffs')
            .insert([{ name: name, role: role, shift: shift, phone: phone }])
            .select();

        if (error) {
            alert("Lỗi khi thêm: " + error.message);
        } else {
            // Thành công: Cập nhật giao diện ngay lập tức
            if (data && data.length > 0) {
                staffs.push(data[0]); // Thêm vào mảng local
                renderStaffListView(); // Vẽ lại bảng
                closeUniversalModal(); // Đóng modal
            }
        }
    });
};

// 2. Sửa Nhân Viên
window.editStaff = function(id) {
    const s = staffs.find(x => x.id == id);
    if (!s) return;

    const html = `
        <div class="form-group"><label>Họ Tên</label><input id="editStaffName" class="form-control" value="${s.name}"></div>
        <div class="form-group"><label>Chức Vụ</label>
            <select id="editStaffRole" class="form-control">
                <option value="Phục vụ" ${s.role === 'Phục vụ' ? 'selected' : ''}>Phục vụ</option>
                <option value="Bếp" ${s.role === 'Bếp' ? 'selected' : ''}>Bếp</option>
                <option value="Quản lý" ${s.role === 'Quản lý' ? 'selected' : ''}>Quản lý</option>
                <option value="Thu ngân" ${s.role === 'Thu ngân' ? 'selected' : ''}>Thu ngân</option>
            </select>
        </div>
        <div class="form-group"><label>Ca Mặc Định</label>
            <select id="editStaffShift" class="form-control">
                <option value="Sáng" ${s.shift === 'Sáng' ? 'selected' : ''}>Sáng</option>
                <option value="Chiều" ${s.shift === 'Chiều' ? 'selected' : ''}>Chiều</option>
                <option value="Full-time" ${s.shift === 'Full-time' ? 'selected' : ''}>Full-time</option>
            </select>
        </div>
        <div class="form-group"><label>SĐT</label><input id="editStaffPhone" class="form-control" value="${s.phone || ''}"></div>
    `;

    showUniversalModal("Cập Nhật Thông Tin", html, async () => {
        const name = document.getElementById("editStaffName").value;
        const role = document.getElementById("editStaffRole").value;
        const shift = document.getElementById("editStaffShift").value;
        const phone = document.getElementById("editStaffPhone").value;

        const { error } = await supabaseClient.from('staffs').update({ name, role, shift, phone }).eq('id', id);
        if (error) alert("Lỗi update: " + error.message);
        else {
            // Update local array
            const idx = staffs.findIndex(x => x.id == id);
            if(idx !== -1) {
                staffs[idx] = { ...staffs[idx], name, role, shift, phone };
            }
            renderStaffListView();
            closeUniversalModal();
        }
    });
};

// 3. Xóa Nhân Viên
window.deleteStaff = async function(id) {
    if(!confirm("Bạn có chắc muốn xóa nhân viên này?")) return;
    
    // Xóa cả lịch làm việc của nhân viên đó trước (để sạch data)
    await supabaseClient.from('scheduling').delete().eq('staff_id', id);

    const { error } = await supabaseClient.from('staffs').delete().eq('id', id);
    if(error) alert("Lỗi xóa: " + error.message);
    else {
        staffs = staffs.filter(s => s.id !== id);
        renderStaffListView();
    }
};

// 4. Thêm Lịch 
window.openAddScheduleModal = function(day, shiftId) {
    const options = staffs.map(s => `<option value="${s.id}" data-name="${s.name}">${s.name} (${s.role})</option>`).join('');

    const shiftLabel = (shiftId === 'Sang') ? 'Sáng (6h-14h)' : 'Chiều (14h-22h)';
    
    const html = `
        <div class="form-group">
            <label>Thời gian:</label>
            <input class="form-control" value="${day} - ${shiftLabel}" disabled style="background:#eee;">
        </div>
        <div class="form-group">
            <label>Chọn Nhân Viên:</label>
            <select id="scheduleStaffSelect" class="form-control">${options}</select>
        </div>
    `;

    showUniversalModal("Phân Công Ca Làm", html, async () => {
        const select = document.getElementById("scheduleStaffSelect");
        const staffId = select.value;
        const staffName = select.options[select.selectedIndex].getAttribute('data-name');

        const { data, error } = await supabaseClient.from('scheduling').insert([{
            staff_id: staffId,
            staff_name: staffName,
            day_of_week: day,
            shift_type: shiftId
        }]).select();

        if (error) alert("Lỗi: " + error.message);
        else {
            if(data) schedules.push(data[0]);
            renderScheduleView();
            closeUniversalModal();
        }
    });
};

// 5. Xóa Lịch
window.deleteSchedule = async function(scheduleId) {
    if (!confirm("Hủy ca làm việc này?")) return;
    const { error } = await supabaseClient.from('scheduling').delete().eq('id', scheduleId);
    if (error) alert("Lỗi: " + error.message);
    else {
        schedules = schedules.filter(s => s.id !== scheduleId);
        renderScheduleView();
    }
};

window.closeUniversalModal = function() {
    document.getElementById("universalModal").style.display = "none";
};

window.showUniversalModal = function(title, bodyHtml, saveCallback) {
    const modal = document.getElementById("universalModal");
    if(!modal) return console.error("Không tìm thấy modal!");

    document.getElementById("modalTitle").innerText = title;
    document.getElementById("modalBody").innerHTML = bodyHtml;
    
    // Xử lý nút Lưu 
    const saveBtn = document.getElementById("modalSaveBtn");
    const newBtn = saveBtn.cloneNode(true);
    saveBtn.parentNode.replaceChild(newBtn, saveBtn);
    
    // Gán sự kiện mới cho nút Lưu
    newBtn.addEventListener('click', async () => {
        // Hiển thị trạng thái đang lưu
        newBtn.innerText = "Đang lưu...";
        newBtn.disabled = true;
        
        try {
            await saveCallback();
        } catch (err) {
            console.error(err);
            alert("Có lỗi xảy ra: " + err.message);
        } finally {
            // Trả lại trạng thái nút
            newBtn.innerText = "Lưu thay đổi";
            newBtn.disabled = false;
        }
    });

    // Hiển thị Modal
    modal.style.display = "flex";
};

window.onclick = function(event) {
    const modal = document.getElementById("universalModal");
    if (event.target == modal) {
        window.closeUniversalModal();
    }

};
document.addEventListener("DOMContentLoaded", () => {
    const logoutBtn = document.getElementById("logoutBtn");
    if (!logoutBtn) return;

    logoutBtn.addEventListener("click", async () => {
        const { error } = await supabaseClient.auth.signOut();

        if (error) {
            alert("❌ Đăng xuất lỗi: " + error.message);
        } else {
            localStorage.clear();
            sessionStorage.clear();
            window.location.replace("../Login/login.html");
        }
    });
});