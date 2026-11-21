/**
 * public/assets/js/pos.js - Xử lý nghiệp vụ phía Client cho màn hình POS & Sơ đồ bàn
 * Thành viên phụ trách: TV5 (Giao diện chung & Client Core) - Tác vụ [TV5-X9]
 */

let tablesData = [];
let menuData = [];
let currentFilter = 'all'; // 'all' | 'free' | 'occupied'
let selectedTable = null;
let currentOrder = null;
let payModalInstance = null;

// Khởi tạo trang khi DOM sẵn sàng
document.addEventListener('DOMContentLoaded', async () => {
  if (!requireLogin()) return;

  // Render thanh điều hướng chung
  renderNavbar();

  // Khởi tạo modal Bootstrap
  const payModalEl = document.getElementById('payModal');
  if (payModalEl && window.bootstrap) {
    payModalInstance = new bootstrap.Modal(payModalEl);
  }

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
 * Render danh sách món nước vào menu grid
 */
function renderMenu() {
  const grid = document.getElementById('menuGrid');
  if (!grid) return;

  if (menuData.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; padding: var(--space-16); text-align: center; color: var(--text-secondary); font-size: var(--text-sm);">
        Chưa có món ăn hoặc đồ uống nào trong thực đơn.
      </div>
    `;
    return;
  }

  grid.innerHTML = menuData.map(item => `
    <div class="pos-menu-card" onclick="onMenuItemClick(${item.id})">
      <div class="pos-menu-name">${escapeHtml(item.name)}</div>
      <div class="pos-menu-price">${item.price.toLocaleString('vi-VN')} đ</div>
    </div>
  `).join('');
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
          <div>
            <div style="font-weight: 600; color: var(--text-color);">${escapeHtml(item.name)}</div>
            <div style="font-size: var(--text-xs); color: var(--text-secondary);">
              ${item.quantity} x ${item.unitPrice.toLocaleString('vi-VN')} đ
            </div>
          </div>
          <div style="font-weight: 700; color: var(--primary);">
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
