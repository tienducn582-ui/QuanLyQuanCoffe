/**
 * public/assets/js/pos.js - Xử lý nghiệp vụ phía Client cho màn hình POS & Sơ đồ bàn
 * Thành viên phụ trách: TV5 (Giao diện chung & Client Core) - Tác vụ [TV5-X9]
 */

let tablesData = [];
let menuData = [];
let currentFilter = 'all'; // 'all' | 'free' | 'occupied'
let selectedTable = null;
let currentOrder = null;

// Modal instances
let payModalInstance = null;
let cancelOrderModalInstance = null;
let manageTablesModalInstance = null;
let manageMenuModalInstance = null;

// Khởi tạo trang khi DOM sẵn sàng
document.addEventListener('DOMContentLoaded', async () => {
  if (!requireLogin()) return;

  // Render thanh điều hướng chung
  renderNavbar();

  // Khởi tạo các modal Bootstrap
  const payModalEl = document.getElementById('payModal');
  if (payModalEl && window.bootstrap) {
    payModalInstance = new bootstrap.Modal(payModalEl);
  }

  const cancelModalEl = document.getElementById('cancelOrderModal');
  if (cancelModalEl && window.bootstrap) {
    cancelOrderModalInstance = new bootstrap.Modal(cancelModalEl);
  }

  const manageTablesEl = document.getElementById('manageTablesModal');
  if (manageTablesEl && window.bootstrap) {
    manageTablesModalInstance = new bootstrap.Modal(manageTablesEl);
  }

  const manageMenuEl = document.getElementById('manageMenuModal');
  if (manageMenuEl && window.bootstrap) {
    manageMenuModalInstance = new bootstrap.Modal(manageMenuEl);
  }

  // Phân quyền: Nếu là Admin thì hiển thị các nút quản lý bàn và thực đơn
  if (isAdmin()) {
    const adminBox = document.getElementById('adminPosActions');
    if (adminBox) adminBox.classList.remove('d-none');
  }

  // Hỗ trợ bấm Enter trong ô tìm kiếm SĐT khách hàng
  document.getElementById('posCustomerPhone')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      searchCustomer();
    }
  });

  // Tải dữ liệu ban đầu
  await Promise.all([loadTables(), loadMenu()]);
});

/**
 * Hiển thị thông báo lỗi chung trên trang
 */
function showPageError(message) {
  const alertEl = document.getElementById('posAlertError');
  if (!alertEl) return;
  if (!message) {
    alertEl.classList.add('d-none');
    alertEl.textContent = '';
  } else {
    alertEl.classList.remove('d-none');
    alertEl.textContent = message;
  }
}

/**
 * Tải danh sách bàn từ Server: GET /api/pos/tables
 */
async function loadTables() {
  try {
    showPageError(null);
    const res = await apiFetch('/api/pos/tables');
    if (res && res.success && Array.isArray(res.data)) {
      tablesData = res.data;
      renderTables();

      // Nếu đang chọn một bàn, cập nhật lại trạng thái của bàn đó
      if (selectedTable) {
        const found = tablesData.find(t => t.id === selectedTable.id);
        if (found) {
          selectTable(found, false);
        } else {
          selectedTable = null;
          resetOrderPanel();
        }
      }
    }
  } catch (err) {
    console.error('Lỗi loadTables:', err);
    showPageError(err.message || 'Không thể tải danh sách bàn từ máy chủ.');
  }
}

/**
 * Tải danh mục thực đơn món nước từ Server: GET /api/pos/menu
 */
async function loadMenu() {
  try {
    const res = await apiFetch('/api/pos/menu');
    if (res && res.success && Array.isArray(res.data)) {
      menuData = res.data;
      renderMenu();
    }
  } catch (err) {
    console.error('Lỗi loadMenu:', err);
    showToast('Không thể tải thực đơn món nước.', 'danger');
  }
}

/**
 * Thay đổi bộ lọc bàn: 'all' | 'free' | 'occupied'
 */
function setTableFilter(filter) {
  currentFilter = filter;

  document.getElementById('btnFilterAll')?.classList.toggle('active', filter === 'all');
  document.getElementById('btnFilterFree')?.classList.toggle('active', filter === 'free');
  document.getElementById('btnFilterOccupied')?.classList.toggle('active', filter === 'occupied');

  renderTables();
}

/**
 * Render danh sách bàn ra giao diện
 */
function renderTables() {
  const grid = document.getElementById('tablesGrid');
  const summary = document.getElementById('tableSummaryText');
  if (!grid) return;

  const freeCount = tablesData.filter(t => t.status === 'Free').length;
  const occupiedCount = tablesData.filter(t => t.status === 'Occupied').length;
  if (summary) {
    summary.textContent = `${freeCount} bàn trống / ${tablesData.length} tổng bàn (${occupiedCount} có khách)`;
  }

  let filtered = tablesData;
  if (currentFilter === 'free') {
    filtered = tablesData.filter(t => t.status === 'Free');
  } else if (currentFilter === 'occupied') {
    filtered = tablesData.filter(t => t.status === 'Occupied');
  }

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; padding: var(--space-24); text-align: center; color: var(--text-secondary); font-size: var(--text-sm);">
        Không có bàn nào phù hợp với bộ lọc.
      </div>
    `;
    return;
  }

  grid.innerHTML = filtered.map(table => {
    const isFree = table.status === 'Free';
    const isSelected = selectedTable && selectedTable.id === table.id;
    const cardClass = isFree ? 'pos-table-free' : 'pos-table-occupied';
    const selectedClass = isSelected ? 'pos-table-selected' : '';
    const badgeClass = isFree ? 'pos-badge-free' : 'pos-badge-occupied';
    const badgeText = isFree ? 'Trống' : 'Có khách';

    return `
      <div class="pos-table-card ${cardClass} ${selectedClass}" onclick="selectTableById(${table.id})">
        <div>
          <div class="pos-table-title">${escapeHtml(table.name)}</div>
          <div class="pos-table-seats">${escapeHtml(table.seats)} chỗ ngồi</div>
          <span class="pos-table-badge ${badgeClass}">${badgeText}</span>
        </div>
        ${
          !isFree && table.openTotal > 0
            ? `<div class="pos-table-total">${table.openTotal.toLocaleString('vi-VN')} đ</div>`
            : ''
        }
      </div>
    `;
  }).join('');
}

/**
 * Render danh sách món nước vào menu grid (cột chính và panel modal)
 */
function renderMenu() {
  const grid = document.getElementById('menuGrid');
  const panelGrid = document.getElementById('panelMenuGrid');

  if (menuData.length === 0) {
    const emptyHtml = `
      <div style="grid-column: 1 / -1; padding: var(--space-16); text-align: center; color: var(--text-secondary); font-size: var(--text-sm);">
        Chưa có món ăn hoặc đồ uống nào trong thực đơn.
      </div>
    `;
    if (grid) grid.innerHTML = emptyHtml;
    if (panelGrid) panelGrid.innerHTML = emptyHtml;
    return;
  }

  const menuHtml = menuData.map(item => `
    <div class="pos-menu-card" onclick="onMenuItemClick(${item.id})">
      <div class="pos-menu-name">${escapeHtml(item.name)}</div>
      <div class="pos-menu-price">${item.price.toLocaleString('vi-VN')} đ</div>
    </div>
  `).join('');

  if (grid) grid.innerHTML = menuHtml;
  if (panelGrid) panelGrid.innerHTML = menuHtml;
}

/**
 * Chọn bàn theo ID từ sự kiện click
 */
function selectTableById(tableId) {
  const table = tablesData.find(t => t.id === tableId);
  if (table) {
    selectTable(table, true);
  }
}

/**
 * Chọn bàn và cập nhật panel bên phải
 */
async function selectTable(table, reloadOrderIfOccupied = true) {
  selectedTable = table;
  renderTables();

  const tableNameEl = document.getElementById('panelTableName');
  const orderMetaEl = document.getElementById('panelOrderMeta');
  const tableBadgeEl = document.getElementById('panelTableBadge');

  if (tableNameEl) tableNameEl.textContent = table.name;
  if (orderMetaEl) orderMetaEl.textContent = `${table.seats} chỗ ngồi • Trạng thái: ${table.status === 'Free' ? 'Bàn trống' : 'Đang phục vụ'}`;
  
  if (tableBadgeEl) {
    const isFree = table.status === 'Free';
    tableBadgeEl.innerHTML = `<span class="pos-table-badge ${isFree ? 'pos-badge-free' : 'pos-badge-occupied'}">${isFree ? 'Trống' : 'Có khách'}</span>`;
  }

  // Điều khiển hiển thị các khối trong Order Panel
  const emptyBox = document.getElementById('panelEmptyState');
  const openBox = document.getElementById('panelOpenOrderBox');
  const activeBox = document.getElementById('panelActiveOrderBox');

  emptyBox?.classList.add('d-none');

  if (table.status === 'Free') {
    // Bàn trống: hiện form mở đơn
    openBox?.classList.remove('d-none');
    activeBox?.classList.add('d-none');
    currentOrder = null;

    // Reset input khách hàng
    const phoneInput = document.getElementById('posCustomerPhone');
    const custIdInput = document.getElementById('posCustomerId');
    const custResult = document.getElementById('posCustomerResult');
    if (phoneInput) phoneInput.value = '';
    if (custIdInput) custIdInput.value = '';
    if (custResult) custResult.textContent = '';
  } else {
    // Bàn có khách: hiện chi tiết đơn và danh sách món
    openBox?.classList.add('d-none');
    activeBox?.classList.remove('d-none');

    if (reloadOrderIfOccupied && table.openOrderId) {
      await loadOrderDetails(table.openOrderId);
    }
  }

  // Nếu màn hình di động (<768px), mở panel dưới dạng modal toàn màn hình
  if (window.innerWidth < 768) {
    openMobileOrderPanel();
  }
}

/**
 * Mở modal panel đơn hàng toàn màn hình (trên di động <768px)
 */
function openMobileOrderPanel() {
  const wrapper = document.getElementById('orderPanelWrapper');
  if (wrapper) {
    wrapper.classList.add('pos-mobile-modal-open');
    document.body.style.overflow = 'hidden';
  }
}

/**
 * Đóng modal panel đơn hàng trên di động để quay lại sơ đồ bàn
 */
function closeMobileOrderPanel() {
  const wrapper = document.getElementById('orderPanelWrapper');
  if (wrapper) {
    wrapper.classList.remove('pos-mobile-modal-open');
    document.body.style.overflow = '';
  }
}

/**
 * Tải chi tiết đơn hàng: GET /api/pos/orders/:id
 */
async function loadOrderDetails(orderId) {
  try {
    const res = await apiFetch(`/api/pos/orders/${orderId}`);
    if (res && res.success && res.data) {
      currentOrder = res.data;
      renderActiveOrder();
    }
  } catch (err) {
    console.error('Lỗi loadOrderDetails:', err);
    showToast(err.message || 'Không thể tải chi tiết đơn hàng.', 'danger');
  }
}

/**
 * Render nội dung chi tiết đơn hàng đang mở
 */
function renderActiveOrder() {
  if (!currentOrder) return;

  // Cập nhật thông tin khách hàng nếu có
  const custInfoBox = document.getElementById('panelCustomerInfo');
  if (custInfoBox) {
    if (currentOrder.customerName || currentOrder.customerPhone) {
      custInfoBox.style.display = 'block';
      custInfoBox.innerHTML = `
        <strong>Khách hàng:</strong> ${escapeHtml(currentOrder.customerName || 'Không tên')} 
        (${escapeHtml(currentOrder.customerPhone || '')})
        ${currentOrder.customerPoints !== null ? `• Điểm: <strong>${currentOrder.customerPoints}</strong>` : ''}
      `;
    } else {
      custInfoBox.style.display = 'none';
      custInfoBox.innerHTML = '';
    }
  }

  // Render danh sách món đã gọi
  const itemsList = document.getElementById('panelItemsList');
  if (itemsList) {
    if (!currentOrder.items || currentOrder.items.length === 0) {
      itemsList.innerHTML = `
        <div style="padding: var(--space-16); text-align: center; color: var(--text-secondary); font-size: var(--text-xs);">
          Chưa có món nào. Bấm vào món bên thực đơn để thêm vào bàn này.
        </div>
      `;
    } else {
      itemsList.innerHTML = currentOrder.items.map(item => `
        <div class="pos-order-item">
          <div style="flex: 1; padding-right: 8px;">
            <div style="font-weight: 600; color: var(--text-color);">${escapeHtml(item.name)}</div>
            <div style="font-size: var(--text-xs); color: var(--text-secondary);">
              ${item.unitPrice.toLocaleString('vi-VN')} đ
            </div>
          </div>

          <!-- Bộ nút tăng giảm số lượng & xóa món -->
          <div style="display: flex; align-items: center; gap: 6px;">
            <button type="button" class="btn btn-sm btn-outline px-2 py-0" style="font-size: 11px; height: 26px;" onclick="changeItemQuantity(${item.id}, ${item.quantity - 1})">-</button>
            <span style="font-weight: 700; font-size: var(--text-sm); min-width: 20px; text-align: center;">${item.quantity}</span>
            <button type="button" class="btn btn-sm btn-outline px-2 py-0" style="font-size: 11px; height: 26px;" onclick="changeItemQuantity(${item.id}, ${item.quantity + 1})">+</button>
            <button type="button" class="btn btn-sm btn-outline text-danger border-danger px-2 py-0" style="font-size: 11px; height: 26px;" title="Xóa món" onclick="deleteOrderItem(${item.id})">Xóa</button>
          </div>

          <div style="font-weight: 700; color: var(--primary); min-width: 75px; text-align: right;">
            ${item.lineTotal.toLocaleString('vi-VN')} đ
          </div>
        </div>
      `).join('');
    }
  }

  // Cập nhật tổng tiền
  const totalEl = document.getElementById('panelTotalAmount');
  if (totalEl) {
    totalEl.textContent = (currentOrder.total || 0).toLocaleString('vi-VN') + ' đ';
  }
}

/**
 * Mở đơn hàng mới cho bàn đang chọn
 */
async function openOrderForCurrentTable() {
  if (!selectedTable) {
    showToast('Vui lòng chọn bàn cần mở đơn.', 'warning');
    return;
  }

  const btn = document.getElementById('btnCreateOrder');
  const custIdVal = document.getElementById('posCustomerId')?.value;
  const customerId = custIdVal ? Number(custIdVal) : undefined;

  try {
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Đang mở đơn...';
    }

    const res = await apiFetch('/api/pos/orders', {
      method: 'POST',
      body: JSON.stringify({
        tableId: selectedTable.id,
        customerId
      })
    });

    if (res && res.success) {
      showToast('Mở đơn thành công cho bàn ' + selectedTable.name, 'success');
      await loadTables();
      const updated = tablesData.find(t => t.id === selectedTable.id);
      if (updated) {
        await selectTable(updated, true);
      }
    }
  } catch (err) {
    console.error('Lỗi openOrderForCurrentTable:', err);
    showToast(err.message || 'Không thể tạo đơn hàng mới.', 'danger');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Mở đơn phục vụ bàn này';
    }
  }
}

/**
 * Bấm vào một món trong thực đơn để thêm vào đơn của bàn đang chọn
 */
async function onMenuItemClick(menuItemId) {
  if (!selectedTable) {
    showToast('Vui lòng chọn bàn trước khi gọi món.', 'warning');
    return;
  }

  if (selectedTable.status === 'Free' || !selectedTable.openOrderId) {
    showToast('Bàn đang trống. Vui lòng bấm "Mở đơn phục vụ" trước khi gọi món.', 'warning');
    return;
  }

  const item = menuData.find(m => m.id === menuItemId);
  const itemName = item ? item.name : 'món';

  try {
    const res = await apiFetch(`/api/pos/orders/${selectedTable.openOrderId}/items`, {
      method: 'POST',
      body: JSON.stringify({
        menuItemId,
        quantity: 1
      })
    });

    if (res && res.success) {
      showToast(`Đã thêm 1 ${itemName}`, 'success');
      // Tải lại chi tiết đơn và danh sách bàn (cập nhật tổng tiền hiển thị trên card bàn)
      await Promise.all([
        loadOrderDetails(selectedTable.openOrderId),
        loadTables()
      ]);
    }
  } catch (err) {
    console.error('Lỗi thêm món:', err);
    showToast(err.message || 'Không thể thêm món vào đơn.', 'danger');
  }
}

/**
 * Tăng / giảm số lượng món trong đơn: PATCH /api/pos/orders/:id/items/:itemId
 */
async function changeItemQuantity(itemId, newQuantity) {
  if (!currentOrder) return;

  if (newQuantity <= 0) {
    deleteOrderItem(itemId);
    return;
  }

  if (newQuantity > 99) {
    showToast('Số lượng tối đa cho mỗi món là 99.', 'warning');
    return;
  }

  try {
    const res = await apiFetch(`/api/pos/orders/${currentOrder.id}/items/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify({ quantity: newQuantity })
    });

    if (res && res.success) {
      await Promise.all([
        loadOrderDetails(currentOrder.id),
        loadTables()
      ]);
    }
  } catch (err) {
    console.error('Lỗi sửa số lượng:', err);
    showToast(err.message || 'Không thể cập nhật số lượng món.', 'danger');
  }
}

/**
 * Xóa món khỏi đơn hàng: DELETE /api/pos/orders/:id/items/:itemId
 */
async function deleteOrderItem(itemId) {
  if (!currentOrder) return;

  if (!confirm('Bạn có chắc chắn muốn xóa món này khỏi đơn hàng?')) {
    return;
  }

  try {
    const res = await apiFetch(`/api/pos/orders/${currentOrder.id}/items/${itemId}`, {
      method: 'DELETE'
    });

    if (res && res.success) {
      showToast('Đã xóa món khỏi đơn hàng.', 'success');
      await Promise.all([
        loadOrderDetails(currentOrder.id),
        loadTables()
      ]);
    }
  } catch (err) {
    console.error('Lỗi xóa món:', err);
    showToast(err.message || 'Không thể xóa món khỏi đơn hàng.', 'danger');
  }
}

/**
 * Hiển thị Modal xác nhận hủy đơn
 */
function showCancelModal() {
  if (!currentOrder) {
    showToast('Không có đơn hàng nào để hủy.', 'warning');
    return;
  }
  if (cancelOrderModalInstance) {
    cancelOrderModalInstance.show();
  }
}

/**
 * Gửi yêu cầu hủy đơn hàng: POST /api/pos/orders/:id/cancel
 */
async function submitCancelOrder() {
  if (!currentOrder) return;

  const btn = document.getElementById('btnConfirmCancel');
  try {
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Đang hủy...';
    }

    const res = await apiFetch(`/api/pos/orders/${currentOrder.id}/cancel`, {
      method: 'POST'
    });

    if (res && res.success) {
      showToast('Đã hủy đơn hàng thành công.', 'success');
      if (cancelOrderModalInstance) {
        cancelOrderModalInstance.hide();
      }
      currentOrder = null;
      selectedTable = null;
      resetOrderPanel();
      await loadTables();
    }
  } catch (err) {
    console.error('Lỗi hủy đơn:', err);
    showToast(err.message || 'Không thể hủy đơn hàng.', 'danger');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Xác nhận hủy đơn';
    }
  }
}

/**
 * Hiển thị Modal xác nhận thanh toán
 */
function showPayModal() {
  if (!currentOrder) {
    showToast('Không có đơn hàng nào để thanh toán.', 'warning');
    return;
  }

  if (!currentOrder.items || currentOrder.items.length === 0) {
    showToast('Đơn hàng chưa có món nào, không thể thanh toán.', 'warning');
    return;
  }

  const bodyText = document.getElementById('payModalBodyText');
  const totalText = document.getElementById('payModalTotalText');

  if (bodyText) {
    let msg = `Thanh toán cho <strong>${escapeHtml(currentOrder.tableName)}</strong> (Mã đơn #${currentOrder.id}).`;
    if (currentOrder.customerId && currentOrder.total >= 10000) {
      const earnedPoints = Math.floor(currentOrder.total / 10000);
      msg += `<br><span class="text-success">Khách hàng sẽ được tích lũy <strong>+${earnedPoints} điểm</strong>.</span>`;
    }
    bodyText.innerHTML = msg;
  }

  if (totalText) {
    totalText.textContent = (currentOrder.total || 0).toLocaleString('vi-VN') + ' đ';
  }

  if (payModalInstance) {
    payModalInstance.show();
  }
}

/**
 * Gửi yêu cầu thanh toán đơn hàng: POST /api/pos/orders/:id/pay
 */
async function submitPayOrder() {
  if (!currentOrder) return;

  const btn = document.getElementById('btnConfirmPay');
  try {
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Đang thanh toán...';
    }

    const res = await apiFetch(`/api/pos/orders/${currentOrder.id}/pay`, {
      method: 'POST'
    });

    if (res && res.success) {
      showToast('Thanh toán thành công hóa đơn ' + currentOrder.total.toLocaleString('vi-VN') + ' đ!', 'success');
      
      if (payModalInstance) {
        payModalInstance.hide();
      }

      currentOrder = null;
      selectedTable = null;
      resetOrderPanel();

      await loadTables();
    }
  } catch (err) {
    console.error('Lỗi thanh toán:', err);
    showToast(err.message || 'Không thể thực hiện thanh toán.', 'danger');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Đồng ý thanh toán';
    }
  }
}

/**
 * Tìm kiếm khách hàng bằng SĐT để gắn vào đơn mở
 */
async function searchCustomer() {
  const phoneInput = document.getElementById('posCustomerPhone');
  const resultEl = document.getElementById('posCustomerResult');
  const custIdInput = document.getElementById('posCustomerId');
  const phone = phoneInput ? phoneInput.value.trim() : '';

  if (!phone) {
    if (resultEl) resultEl.textContent = 'Vui lòng nhập số điện thoại khách hàng.';
    return;
  }

  try {
    if (resultEl) resultEl.textContent = 'Đang tìm kiếm...';
    const res = await apiFetch(`/api/customers?search=${encodeURIComponent(phone)}`);
    if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
      const cust = res.data[0];
      if (custIdInput) custIdInput.value = cust.id;
      if (resultEl) {
        resultEl.innerHTML = `<span class="text-success">Đã tìm thấy: <strong>${escapeHtml(cust.fullName)}</strong> (${escapeHtml(cust.rank)} - ${cust.points} điểm)</span>`;
      }
    } else {
      if (custIdInput) custIdInput.value = '';
      if (resultEl) {
        resultEl.innerHTML = `<span class="text-secondary">Không tìm thấy khách hàng với SĐT này (đơn sẽ không tích điểm).</span>`;
      }
    }
  } catch (err) {
    console.warn('API customers chưa sẵn sàng hoặc lỗi:', err);
    if (resultEl) {
      resultEl.innerHTML = `<span class="text-secondary">Không tìm thấy hoặc chưa hỗ trợ tìm khách.</span>`;
    }
  }
}

/**
 * Đặt lại trạng thái ban đầu của panel đơn hàng
 */
function resetOrderPanel() {
  closeMobileOrderPanel();
  const tableNameEl = document.getElementById('panelTableName');
  const orderMetaEl = document.getElementById('panelOrderMeta');
  const tableBadgeEl = document.getElementById('panelTableBadge');

  if (tableNameEl) tableNameEl.textContent = 'Chưa chọn bàn';
  if (orderMetaEl) orderMetaEl.textContent = 'Vui lòng bấm chọn một bàn bên trái để bắt đầu.';
  if (tableBadgeEl) tableBadgeEl.innerHTML = '';

  document.getElementById('panelEmptyState')?.classList.remove('d-none');
  document.getElementById('panelOpenOrderBox')?.classList.add('d-none');
  document.getElementById('panelActiveOrderBox')?.classList.add('d-none');
}

/* ==========================================================================
   4. CHỨC NĂNG DÀNH CHO ADMIN: QUẢN LÝ BÀN & QUẢN LÝ THỰC ĐƠN
   ========================================================================== */

/**
 * Mở modal Quản lý Sơ đồ bàn (Admin)
 */
function openTablesManagementModal() {
  resetTableForm();
  renderManageTablesTable();
  if (manageTablesModalInstance) {
    manageTablesModalInstance.show();
  }
}

function resetTableForm() {
  document.getElementById('editingTableId').value = '';
  document.getElementById('inputTableName').value = '';
  document.getElementById('inputTableSeats').value = '4';
  document.getElementById('tableFormTitle').textContent = 'Thêm bàn mới';
  document.getElementById('btnSaveTable').textContent = 'Lưu bàn';
  document.getElementById('btnCancelEditTable')?.classList.add('d-none');
  document.getElementById('tableFormError').textContent = '';
}

function renderManageTablesTable() {
  const tbody = document.getElementById('manageTablesTbody');
  if (!tbody) return;

  if (tablesData.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Chưa có bàn nào.</td></tr>';
    return;
  }

  tbody.innerHTML = tablesData.map(t => `
    <tr>
      <td>#${t.id}</td>
      <td style="font-weight: 600;">${escapeHtml(t.name)}</td>
      <td>${t.seats} chỗ</td>
      <td>
        <span class="pos-table-badge ${t.status === 'Free' ? 'pos-badge-free' : 'pos-badge-occupied'}">
          ${t.status === 'Free' ? 'Trống' : 'Có khách'}
        </span>
      </td>
      <td class="text-end">
        <button type="button" class="btn btn-sm btn-outline me-1" onclick="editTable(${t.id}, '${escapeHtml(t.name)}', ${t.seats})">Sửa</button>
        <button type="button" class="btn btn-sm btn-outline text-danger border-danger" onclick="deleteTable(${t.id}, '${escapeHtml(t.name)}')">Xóa</button>
      </td>
    </tr>
  `).join('');
}

function editTable(id, name, seats) {
  document.getElementById('editingTableId').value = id;
  document.getElementById('inputTableName').value = name;
  document.getElementById('inputTableSeats').value = seats;
  document.getElementById('tableFormTitle').textContent = `Chỉnh sửa bàn: ${name}`;
  document.getElementById('btnSaveTable').textContent = 'Cập nhật';
  document.getElementById('btnCancelEditTable')?.classList.remove('d-none');
  document.getElementById('tableFormError').textContent = '';
}

async function saveTable() {
  const id = document.getElementById('editingTableId').value;
  const name = document.getElementById('inputTableName').value.trim();
  const seats = parseInt(document.getElementById('inputTableSeats').value, 10);
  const errEl = document.getElementById('tableFormError');

  if (!name) {
    errEl.textContent = 'Vui lòng nhập tên bàn.';
    return;
  }
  if (isNaN(seats) || seats < 1 || seats > 20) {
    errEl.textContent = 'Số ghế phải từ 1 đến 20.';
    return;
  }

  try {
    errEl.textContent = '';
    const method = id ? 'PUT' : 'POST';
    const path = id ? `/api/pos/tables/${id}` : '/api/pos/tables';

    const res = await apiFetch(path, {
      method,
      body: JSON.stringify({ name, seats })
    });

    if (res && res.success) {
      showToast(res.message || 'Lưu bàn thành công.', 'success');
      resetTableForm();
      await loadTables();
      renderManageTablesTable();
    }
  } catch (err) {
    errEl.textContent = err.message || 'Lỗi khi lưu bàn.';
  }
}

async function deleteTable(id, name) {
  if (!confirm(`Bạn có chắc chắn muốn xóa bàn "${name}"?`)) return;

  try {
    const res = await apiFetch(`/api/pos/tables/${id}`, { method: 'DELETE' });
    if (res && res.success) {
      showToast(`Đã xóa bàn "${name}" thành công.`, 'success');
      await loadTables();
      renderManageTablesTable();
    }
  } catch (err) {
    alert(err.message || 'Không thể xóa bàn này.');
  }
}

/**
 * Mở modal Quản lý Thực đơn (Admin)
 */
async function openMenuManagementModal() {
  resetMenuForm();
  await loadManageMenuTable();
  if (manageMenuModalInstance) {
    manageMenuModalInstance.show();
  }
}

function resetMenuForm() {
  document.getElementById('editingMenuId').value = '';
  document.getElementById('inputMenuName').value = '';
  document.getElementById('inputMenuPrice').value = '';
  document.getElementById('inputMenuActive').checked = true;
  document.getElementById('menuFormTitle').textContent = 'Thêm món mới vào thực đơn';
  document.getElementById('btnSaveMenu').textContent = 'Lưu món';
  document.getElementById('btnCancelEditMenu')?.classList.add('d-none');
  document.getElementById('menuFormError').textContent = '';
}

async function loadManageMenuTable() {
  const tbody = document.getElementById('manageMenuTbody');
  if (!tbody) return;

  try {
    // Admin lấy cả món đã ngừng bán: ?all=1
    const res = await apiFetch('/api/pos/menu?all=1');
    if (res && res.success && Array.isArray(res.data)) {
      if (res.data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Chưa có món nào.</td></tr>';
        return;
      }

      tbody.innerHTML = res.data.map(m => `
        <tr>
          <td>#${m.id}</td>
          <td style="font-weight: 600;">${escapeHtml(m.name)}</td>
          <td>${m.price.toLocaleString('vi-VN')} đ</td>
          <td>
            <span class="badge ${m.isActive ? 'bg-success' : 'bg-secondary'}">
              ${m.isActive ? 'Đang bán' : 'Ngừng bán'}
            </span>
          </td>
          <td class="text-end">
            <button type="button" class="btn btn-sm btn-outline me-1" onclick="editMenu(${m.id}, '${escapeHtml(m.name)}', ${m.price}, ${m.isActive})">Sửa</button>
            <button type="button" class="btn btn-sm btn-outline text-danger border-danger" onclick="deleteMenu(${m.id}, '${escapeHtml(m.name)}')">Xóa</button>
          </td>
        </tr>
      `).join('');
    }
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-danger text-center">${escapeHtml(err.message)}</td></tr>`;
  }
}

function editMenu(id, name, price, isActive) {
  document.getElementById('editingMenuId').value = id;
  document.getElementById('inputMenuName').value = name;
  document.getElementById('inputMenuPrice').value = price;
  document.getElementById('inputMenuActive').checked = Boolean(isActive);
  document.getElementById('menuFormTitle').textContent = `Chỉnh sửa món: ${name}`;
  document.getElementById('btnSaveMenu').textContent = 'Cập nhật';
  document.getElementById('btnCancelEditMenu')?.classList.remove('d-none');
  document.getElementById('menuFormError').textContent = '';
}

async function saveMenu() {
  const id = document.getElementById('editingMenuId').value;
  const name = document.getElementById('inputMenuName').value.trim();
  const price = parseInt(document.getElementById('inputMenuPrice').value, 10);
  const isActive = document.getElementById('inputMenuActive').checked;
  const errEl = document.getElementById('menuFormError');

  if (!name) {
    errEl.textContent = 'Vui lòng nhập tên món.';
    return;
  }
  if (isNaN(price) || price < 0) {
    errEl.textContent = 'Đơn giá phải là số lớn hơn hoặc bằng 0.';
    return;
  }

  try {
    errEl.textContent = '';
    const method = id ? 'PUT' : 'POST';
    const path = id ? `/api/pos/menu/${id}` : '/api/pos/menu';

    const res = await apiFetch(path, {
      method,
      body: JSON.stringify({ name, price, isActive })
    });

    if (res && res.success) {
      showToast(res.message || 'Lưu món thành công.', 'success');
      resetMenuForm();
      await Promise.all([loadMenu(), loadManageMenuTable()]);
    }
  } catch (err) {
    errEl.textContent = err.message || 'Lỗi khi lưu món.';
  }
}

async function deleteMenu(id, name) {
  if (!confirm(`Bạn có chắc chắn muốn xóa món "${name}" khỏi thực đơn?`)) return;

  try {
    const res = await apiFetch(`/api/pos/menu/${id}`, { method: 'DELETE' });
    if (res && res.success) {
      showToast(`Đã xóa món "${name}" thành công.`, 'success');
      await Promise.all([loadMenu(), loadManageMenuTable()]);
    }
  } catch (err) {
    alert(err.message || 'Không thể xóa món này.');
  }
}
