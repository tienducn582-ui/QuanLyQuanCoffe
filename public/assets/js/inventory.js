/**
 * ====================================================================
 * CAFE TASK MANAGER - LOGIC QUẢN LÝ KHO NGUYÊN LIỆU (INVENTORY)
 * Thành viên phụ trách: TV4 (Cơ sở dữ liệu, Thống kê, Kiểm thử)
 * Module: public/assets/js/inventory.js
 * ====================================================================
 */

let currentPage = 1;
const pageSize = 10;
let currentSearch = '';
let currentLowOnly = false;
let searchDebounceTimer = null;
let modalStockInstance = null;
let modalIngredientInstance = null;
let currentIngredients = [];

// Hàm an toàn nếu api.js / ui.js chưa sẵn sàng
const safeApiFetch = async (path, options = {}) => {
  if (typeof apiFetch === 'function') {
    return await apiFetch(path, options);
  }
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };
  const response = await fetch(path, { ...options, headers });
  if (response.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
    throw new Error('Phiên đăng nhập đã hết hạn');
  }
  const json = await response.json();
  if (!response.ok || !json.success) {
    throw new Error(json.message || 'Lỗi khi gọi API');
  }
  return json;
};

const safeRequireLogin = () => {
  if (typeof requireLogin === 'function') return requireLogin();
  if (!localStorage.getItem('token')) {
    window.location.href = 'login.html';
    return false;
  }
  return true;
};

const safeIsAdmin = () => {
  if (typeof isAdmin === 'function') return isAdmin();
  try {
    const userStr = localStorage.getItem('user');
    if (!userStr) return false;
    const user = JSON.parse(userStr);
    return user && user.role === 'Admin';
  } catch (e) {
    return false;
  }
};

const safeShowToast = (message, type = 'info') => {
  if (typeof showToast === 'function') {
    showToast(message, type);
  } else {
    console.log(`[Toast ${type}]: ${message}`);
  }
};

const safeEscapeHtml = (str) => {
  if (typeof escapeHtml === 'function') return escapeHtml(str);
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

/**
 * Khởi tạo khi DOM sẵn sàng
 */
document.addEventListener('DOMContentLoaded', () => {
  if (!safeRequireLogin()) return;

  // Khởi tạo Bootstrap Modals
  const elModalStock = document.getElementById('modalStock');
  if (elModalStock && typeof bootstrap !== 'undefined') {
    modalStockInstance = new bootstrap.Modal(elModalStock);
  }
  const elModalIng = document.getElementById('modalIngredient');
  if (elModalIng && typeof bootstrap !== 'undefined') {
    modalIngredientInstance = new bootstrap.Modal(elModalIng);
  }

  // 1. Phân quyền hiển thị nút Thêm Nguyên Liệu (Chỉ Admin)
  const btnAdd = document.getElementById('btn-add-ingredient');
  if (btnAdd) {
    if (safeIsAdmin()) {
      btnAdd.style.display = 'inline-flex';
      btnAdd.addEventListener('click', openAddIngredientModal);
    } else {
      btnAdd.style.display = 'none';
    }
  }

  // 2. Tìm kiếm debounce 300ms
  const searchInput = document.getElementById('input-search-ingredient');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = setTimeout(() => {
        currentSearch = e.target.value.trim();
        currentPage = 1;
        loadIngredients();
      }, 300);
    });
  }

  // 3. Lọc chỉ xem sắp hết
  const checkLowOnly = document.getElementById('check-low-only');
  if (checkLowOnly) {
    checkLowOnly.addEventListener('change', (e) => {
      currentLowOnly = e.target.checked;
      currentPage = 1;
      loadIngredients();
    });
  }

  // 4. Lưu nhập / xuất kho (hỗ trợ cả nhấn Enter trong ô số lượng)
  const btnSaveStock = document.getElementById('btn-save-stock');
  if (btnSaveStock) {
    btnSaveStock.addEventListener('click', handleSaveStock);
  }
  const stockAmountInput = document.getElementById('stock-amount');
  if (stockAmountInput) {
    stockAmountInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSaveStock();
      }
    });
  }

  // 5. Lưu thêm / sửa nguyên liệu (Admin) — chặn submit mặc định khi nhấn Enter
  const formIngredient = document.getElementById('form-ingredient');
  if (formIngredient) {
    formIngredient.addEventListener('submit', (e) => {
      e.preventDefault();
      handleSaveIngredient();
    });
  }
  const btnSaveIngredient = document.getElementById('btn-save-ingredient');
  if (btnSaveIngredient) {
    btnSaveIngredient.addEventListener('click', handleSaveIngredient);
  }

  // 6. Ủy quyền sự kiện các nút Nhập / Xuất / Sửa / Xóa trong bảng (tránh lỗi inline onclick khi tên có dấu nháy)
  const tbody = document.getElementById('table-ingredients-body');
  if (tbody) {
    tbody.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-action][data-id]');
      if (!btn) return;
      const id = Number(btn.dataset.id);
      const ing = currentIngredients.find(item => item.id === id);
      if (!ing) return;

      const action = btn.dataset.action;
      if (action === 'stock-in') {
        openStockModal(ing.id, ing.name, ing.quantity, ing.unit, 'in');
      } else if (action === 'stock-out') {
        openStockModal(ing.id, ing.name, ing.quantity, ing.unit, 'out');
      } else if (action === 'edit') {
        openEditIngredientModal(ing.id);
      } else if (action === 'delete') {
        handleDeleteIngredient(ing.id, ing.name);
      }
    });
  }

  // 7. Nạp dữ liệu lần đầu
  loadIngredients();
});

/**
 * Nạp danh sách nguyên liệu từ API GET /api/ingredients
 */
async function loadIngredients() {
  const tbody = document.getElementById('table-ingredients-body');
  const emptyState = document.getElementById('ingredients-empty-state');
  const paginationInfo = document.getElementById('pagination-info');
  const paginationContainer = document.getElementById('pagination-container');

  try {
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-secondary"><div class="spinner-border spinner-border-sm text-primary me-2"></div>Đang tải dữ liệu...</td></tr>`;
    }

    const queryParams = new URLSearchParams({
      page: currentPage,
      pageSize: pageSize,
      ...(currentSearch ? { search: currentSearch } : {}),
      ...(currentLowOnly ? { lowOnly: '1' } : {})
    });

    const res = await safeApiFetch(`/api/ingredients?${queryParams.toString()}`);
    const list = res.data || [];
    currentIngredients = list;
    const pagination = res.pagination || { page: 1, pageSize: 10, total: 0, totalPages: 1 };

    if (list.length === 0) {
      if (pagination.total > 0 && currentPage > pagination.totalPages) {
        currentPage = pagination.totalPages;
        return loadIngredients();
      }
      if (tbody) tbody.innerHTML = '';
      if (emptyState) emptyState.style.display = 'block';
      if (paginationInfo) paginationInfo.textContent = 'Hiển thị 0 / 0 nguyên liệu';
      if (paginationContainer) paginationContainer.innerHTML = '';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';

    const isAdminUser = safeIsAdmin();

    if (tbody) {
      tbody.innerHTML = list.map(item => {
        const isLow = item.isLow;
        const updatedTime = item.updatedAt ? new Date(item.updatedAt).toLocaleString('vi-VN') : 'Mới tạo';

        return `
          <tr class="${isLow ? 'row-is-low' : ''}">
            <td data-label="Nguyên liệu">
              <strong class="d-block ${isLow ? 'text-danger' : ''}">${safeEscapeHtml(item.name)}</strong>
              ${isLow ? '<small class="text-danger"><i class="fa-solid fa-triangle-exclamation me-1"></i>Đã chạm ngưỡng an toàn</small>' : ''}
            </td>
            <td data-label="Đơn vị" class="text-center"><span class="badge bg-light text-dark border">${safeEscapeHtml(item.unit)}</span></td>
            <td data-label="Tồn kho" class="text-center fw-bold ${isLow ? 'text-danger fs-6' : ''}">${item.quantity}</td>
            <td data-label="Ngưỡng tối thiểu" class="text-center text-secondary">${item.minQuantity}</td>
            <td data-label="Trạng thái" class="text-center">
              ${isLow ? '<span class="badge-low"><i class="fa-solid fa-bell me-1"></i>Sắp hết</span>' : '<span class="badge-ok">Đủ hàng</span>'}
            </td>
            <td data-label="Cập nhật lúc" class="text-center small text-muted">${safeEscapeHtml(updatedTime)}</td>
            <td data-label="Thao tác" class="text-end">
              <div class="d-inline-flex gap-1">
                <!-- Nút Nhập/Xuất kho cho cả Admin và Staff -->
                <button type="button" class="btn btn-sm btn-outline-success" data-action="stock-in" data-id="${item.id}" title="Nhập thêm">
                  <i class="fa-solid fa-plus"></i> Nhập
                </button>
                <button type="button" class="btn btn-sm btn-outline-danger" data-action="stock-out" data-id="${item.id}" title="Xuất dùng">
                  <i class="fa-solid fa-minus"></i> Xuất
                </button>
                
                ${isAdminUser ? `
                  <button type="button" class="btn btn-sm btn-outline-secondary" data-action="edit" data-id="${item.id}" title="Chỉnh sửa">
                    <i class="fa-solid fa-pen-to-square"></i>
                  </button>
                  <button type="button" class="btn btn-sm btn-outline-danger" data-action="delete" data-id="${item.id}" title="Xóa">
                    <i class="fa-solid fa-trash"></i>
                  </button>
                ` : ''}
              </div>
            </td>
          </tr>
        `;
      }).join('');
    }

    if (paginationInfo) {
      const from = (pagination.page - 1) * pagination.pageSize + 1;
      const to = Math.min(pagination.page * pagination.pageSize, pagination.total);
      paginationInfo.textContent = `Hiển thị ${from} - ${to} trong tổng số ${pagination.total} nguyên liệu`;
    }

    // Hiển thị thanh phân trang
    if (paginationContainer) {
      if (typeof renderPagination === 'function') {
        renderPagination(paginationContainer, pagination, (newPage) => {
          currentPage = newPage;
          loadIngredients();
        });
      } else {
        renderSimplePagination(paginationContainer, pagination);
      }
    }
  } catch (err) {
    console.error('[loadIngredients Error]:', err);
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-danger">Lỗi nạp dữ liệu: ${safeEscapeHtml(err.message)}</td></tr>`;
    }
  }
}

/**
 * Phân trang fallback nếu ui.js chưa có
 */
function renderSimplePagination(container, pagination) {
  if (pagination.totalPages <= 1) {
    container.innerHTML = '';
    return;
  }
  let html = `<ul class="pagination pagination-sm mb-0">`;
  for (let i = 1; i <= pagination.totalPages; i++) {
    html += `<li class="page-item ${i === pagination.page ? 'active' : ''}">
      <button class="page-link" onclick="changePage(${i})">${i}</button>
    </li>`;
  }
  html += `</ul>`;
  container.innerHTML = html;
}

window.changePage = function (page) {
  currentPage = page;
  loadIngredients();
};

/**
 * Mở modal Nhập / Xuất kho
 */
window.openStockModal = function (id, name, currentQty, unit, defaultType = 'in') {
  document.getElementById('stock-ingredient-id').value = id;
  document.getElementById('stock-ingredient-name').textContent = name;
  document.getElementById('stock-current-qty').textContent = currentQty;
  document.getElementById('stock-unit-label').textContent = unit;
  document.getElementById('stock-unit-addon').textContent = unit;
  document.getElementById('stock-amount').value = '';

  if (defaultType === 'out') {
    document.getElementById('typeOut').checked = true;
  } else {
    document.getElementById('typeIn').checked = true;
  }

  if (modalStockInstance) modalStockInstance.show();
};

/**
 * Xử lý lưu điều chỉnh tồn kho (PATCH /api/ingredients/:id/stock)
 */
async function handleSaveStock() {
  const id = document.getElementById('stock-ingredient-id').value;
  const rawAmount = document.getElementById('stock-amount').value;
  const isOut = document.getElementById('typeOut').checked;

  const amount = parseFloat(rawAmount);
  if (isNaN(amount) || amount <= 0) {
    safeShowToast('Vui lòng nhập số lượng hợp lệ lớn hơn 0', 'warning');
    return;
  }

  const delta = isOut ? -amount : amount;
  const btnSave = document.getElementById('btn-save-stock');

  try {
    if (btnSave) btnSave.disabled = true;

    const res = await safeApiFetch(`/api/ingredients/${id}/stock`, {
      method: 'PATCH',
      body: JSON.stringify({ delta })
    });

    if (modalStockInstance) modalStockInstance.hide();
    safeShowToast(res.message || 'Cập nhật kho thành công!', 'success');

    // Nếu tự động sinh Task nhập hàng, thông báo thêm toast cảnh báo cho nhân viên
    if (res.data && res.data.autoTaskCreated) {
      safeShowToast('Đã tự động tạo việc "Nhập hàng" vào hệ thống công việc!', 'warning');
    }

    loadIngredients();
  } catch (err) {
    safeShowToast(err.message || 'Không thể cập nhật tồn kho', 'danger');
  } finally {
    if (btnSave) btnSave.disabled = false;
  }
}

/**
 * Mở modal Thêm nguyên liệu (Admin)
 */
function openAddIngredientModal() {
  document.getElementById('ingredient-id').value = '';
  document.getElementById('ingredient-name').value = '';
  document.getElementById('ingredient-unit').value = '';
  document.getElementById('ingredient-quantity').value = '0';
  document.getElementById('ingredient-min-quantity').value = '5';
  document.getElementById('modalIngredientLabel').textContent = 'Thêm Nguyên Liệu Mới';

  if (modalIngredientInstance) modalIngredientInstance.show();
}

/**
 * Mở modal Sửa nguyên liệu (Admin)
 */
window.openEditIngredientModal = async function (id) {
  try {
    const res = await safeApiFetch(`/api/ingredients/${id}`);
    const ing = res.data;

    document.getElementById('ingredient-id').value = ing.id;
    document.getElementById('ingredient-name').value = ing.name;
    document.getElementById('ingredient-unit').value = ing.unit;
    document.getElementById('ingredient-quantity').value = ing.quantity;
    document.getElementById('ingredient-min-quantity').value = ing.minQuantity;
    document.getElementById('modalIngredientLabel').textContent = 'Chỉnh Sửa Nguyên Liệu';

    if (modalIngredientInstance) modalIngredientInstance.show();
  } catch (err) {
    safeShowToast(err.message || 'Không thể lấy thông tin nguyên liệu', 'danger');
  }
};

/**
 * Lưu Thêm / Sửa nguyên liệu (Admin)
 */
async function handleSaveIngredient() {
  const id = document.getElementById('ingredient-id').value;
  const name = document.getElementById('ingredient-name').value.trim();
  const unit = document.getElementById('ingredient-unit').value.trim();
  const rawQty = document.getElementById('ingredient-quantity').value.trim();
  const rawMin = document.getElementById('ingredient-min-quantity').value.trim();

  if (!name || !unit) {
    safeShowToast('Vui lòng điền đầy đủ tên và đơn vị tính', 'warning');
    return;
  }

  const quantity = rawQty === '' ? 0 : Number(rawQty);
  const minQuantity = rawMin === '' ? 0 : Number(rawMin);

  if (!Number.isFinite(quantity) || quantity < 0 || quantity > 1000000) {
    safeShowToast('Số lượng tồn kho phải là số từ 0 đến 1,000,000', 'warning');
    return;
  }
  if (!Number.isFinite(minQuantity) || minQuantity < 0 || minQuantity > 1000000) {
    safeShowToast('Ngưỡng tối thiểu phải là số từ 0 đến 1,000,000', 'warning');
    return;
  }

  const payload = { name, unit, quantity, minQuantity };
  const btnSave = document.getElementById('btn-save-ingredient');

  try {
    if (btnSave) btnSave.disabled = true;

    if (id) {
      await safeApiFetch(`/api/ingredients/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      safeShowToast('Cập nhật nguyên liệu thành công!', 'success');
    } else {
      await safeApiFetch('/api/ingredients', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      safeShowToast('Thêm nguyên liệu mới thành công!', 'success');
    }

    if (modalIngredientInstance) modalIngredientInstance.hide();
    loadIngredients();
  } catch (err) {
    safeShowToast(err.message || 'Lỗi lưu nguyên liệu', 'danger');
  } finally {
    if (btnSave) btnSave.disabled = false;
  }
}

/**
 * Xóa nguyên liệu (Admin)
 */
window.handleDeleteIngredient = async function (id, name) {
  if (!confirm(`Bạn có chắc chắn muốn xóa nguyên liệu "${name}" khỏi kho?`)) {
    return;
  }

  try {
    await safeApiFetch(`/api/ingredients/${id}`, {
      method: 'DELETE'
    });
    safeShowToast(`Đã xóa nguyên liệu "${name}" thành công!`, 'success');
    loadIngredients();
  } catch (err) {
    safeShowToast(err.message || 'Lỗi khi xóa nguyên liệu', 'danger');
  }
};
