/**
 * public/assets/js/customers.js - Logic trang Khách hàng tích điểm (public/customers.html)
 * Thành viên phụ trách: TV2 (Xác thực, Phân quyền & Bảo mật) - Tác vụ [TV2-X8]
 *
 * Dùng các hàm chuẩn: apiFetch, isAdmin, requireLogin (api.js)
 * và showToast, renderPagination, showEmpty, escapeHtml, showLoading, hideLoading, validateField (ui.js).
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Bắt buộc đăng nhập mới được truy cập
  if (typeof requireLogin === 'function' && !requireLogin()) return;

  const admin = typeof isAdmin === 'function' ? isAdmin() : false;

  const state = {
    search: '',
    page: 1,
    pageSize: 10
  };

  const el = {
    searchInput: document.getElementById('searchInput'),
    btnResetFilters: document.getElementById('btnResetFilters'),
    summary: document.getElementById('customersSummary'),
    loading: document.getElementById('customersLoading'),
    empty: document.getElementById('customersEmpty'),
    tableWrap: document.getElementById('customersTableWrap'),
    tableBody: document.getElementById('customersTableBody'),
    pagination: document.getElementById('customersPagination'),
    btnAddCustomer: document.getElementById('btnAddCustomer'),

    // Modal Thêm / Sửa
    customerModalEl: document.getElementById('customerModal'),
    customerModalTitle: document.getElementById('customerModalTitle'),
    customerForm: document.getElementById('customerForm'),
    customerFormError: document.getElementById('customerFormError'),
    customerId: document.getElementById('customerId'),
    customerFullName: document.getElementById('customerFullName'),
    customerPhone: document.getElementById('customerPhone'),
    btnSaveCustomer: document.getElementById('btnSaveCustomer'),

    // Modal Cộng điểm
    earnModalEl: document.getElementById('earnModal'),
    earnForm: document.getElementById('earnForm'),
    earnFormError: document.getElementById('earnFormError'),
    earnCustomerId: document.getElementById('earnCustomerId'),
    earnCustomerInfo: document.getElementById('earnCustomerInfo'),
    earnAmount: document.getElementById('earnAmount'),
    earnPreview: document.getElementById('earnPreview'),
    btnConfirmEarn: document.getElementById('btnConfirmEarn'),

    // Modal Đổi điểm
    redeemModalEl: document.getElementById('redeemModal'),
    redeemForm: document.getElementById('redeemForm'),
    redeemFormError: document.getElementById('redeemFormError'),
    redeemCustomerId: document.getElementById('redeemCustomerId'),
    redeemCustomerInfo: document.getElementById('redeemCustomerInfo'),
    redeemPoints: document.getElementById('redeemPoints'),
    redeemPreview: document.getElementById('redeemPreview'),
    btnConfirmRedeem: document.getElementById('btnConfirmRedeem')
  };

  const customerModal = window.bootstrap ? new bootstrap.Modal(el.customerModalEl) : null;
  const earnModal = window.bootstrap ? new bootstrap.Modal(el.earnModalEl) : null;
  const redeemModal = window.bootstrap ? new bootstrap.Modal(el.redeemModalEl) : null;

  let currentCustomers = [];
  let activePointsTarget = null;
  let savingCustomer = false;
  let savingEarn = false;
  let savingRedeem = false;
  let loadCounter = 0;

  function showModal(modalInstance) {
    if (modalInstance) modalInstance.show();
    else showToast('Không tải được thư viện Bootstrap, không mở được biểu mẫu.', 'danger');
  }

  function computeRankLabel(points) {
    const pts = Number(points || 0);
    if (pts >= 300) return 'Vàng';
    if (pts >= 100) return 'Bạc';
    return 'Đồng';
  }

  function getRankBadgeClass(rank) {
    if (rank === 'Vàng') return 'rank-vang';
    if (rank === 'Bạc') return 'rank-bac';
    return 'rank-dong';
  }

  function hideAlert(boxEl) {
    if (!boxEl) return;
    boxEl.classList.add('d-none');
    boxEl.textContent = '';
  }

  function showAlert(boxEl, message) {
    if (!boxEl) return;
    boxEl.textContent = message || 'Đã xảy ra lỗi.';
    boxEl.classList.remove('d-none');
  }

  function buildQuery() {
    const params = new URLSearchParams();
    Object.entries(state).forEach(([key, value]) => {
      if (value !== '' && value !== null && value !== undefined) {
        params.set(key, value);
      }
    });
    return params.toString();
  }

  /* ------------------------------------------------------------------
     TẢI VÀ HIỂN THỊ DANH SÁCH KHÁCH HÀNG
     ------------------------------------------------------------------ */
  async function loadCustomers() {
    const myLoad = ++loadCounter;
    el.loading.classList.remove('d-none');
    el.empty.classList.add('d-none');

    try {
      const result = await apiFetch(`/api/customers?${buildQuery()}`);
      if (myLoad !== loadCounter) return;

      const p = result.pagination || { page: 1, pageSize: state.pageSize, total: 0, totalPages: 0 };

      // Nếu xóa hết bản ghi ở trang cuối thì tự lùi về trang cuối cùng còn dữ liệu
      if (result.data.length === 0 && p.total > 0 && state.page > p.totalPages) {
        state.page = p.totalPages;
        return loadCustomers();
      }

      currentCustomers = result.data || [];
      renderTable(currentCustomers);
      renderPagination(el.pagination, p, (newPage) => {
        state.page = newPage;
        loadCustomers();
      });

      el.summary.textContent = p.total > 0
        ? `Tìm thấy ${p.total} khách hàng · Trang ${p.page}/${p.totalPages}`
        : 'Không có khách hàng nào khớp điều kiện.';
    } catch (err) {
      if (myLoad !== loadCounter) return;
      currentCustomers = [];
      el.tableBody.innerHTML = '';
      el.pagination.innerHTML = '';
      el.summary.textContent = 'Không tải được dữ liệu.';
      showToast(err.message || 'Lỗi khi tải danh sách khách hàng.', 'danger');
    } finally {
      if (myLoad === loadCounter) {
        el.loading.classList.add('d-none');
      }
    }
  }

  function renderTable(customers) {
    if (!customers || customers.length === 0) {
      el.tableWrap.classList.add('d-none');
      el.empty.classList.remove('d-none');
      showEmpty(el.empty, 'Không tìm thấy khách hàng');
      return;
    }

    el.tableWrap.classList.remove('d-none');

    el.tableBody.innerHTML = customers.map((customer) => {
      const rank = customer.rank || computeRankLabel(customer.points);
      const badgeClass = getRankBadgeClass(rank);
      const adminButtons = admin
        ? `<button type="button" class="btn btn-outline btn-sm" data-action="edit" data-id="${escapeHtml(customer.id)}">Sửa</button>
           <button type="button" class="btn btn-danger btn-sm" data-action="delete" data-id="${escapeHtml(customer.id)}">Xóa</button>`
        : '';

      return `
        <tr>
          <td data-label="Mã">#${escapeHtml(customer.id)}</td>
          <td data-label="Họ và tên"><strong>${escapeHtml(customer.fullName)}</strong></td>
          <td data-label="Số điện thoại">${escapeHtml(customer.phone)}</td>
          <td data-label="Điểm tích lũy"><span><strong>${escapeHtml(Number(customer.points || 0).toLocaleString('vi-VN'))}</strong> điểm</span></td>
          <td data-label="Hạng"><span class="rank-badge ${badgeClass}">${escapeHtml(rank)}</span></td>
          <td data-label="Thao tác" class="text-end">
            <div class="customer-actions">
              <button type="button" class="btn btn-primary btn-sm" data-action="earn" data-id="${escapeHtml(customer.id)}">Cộng điểm</button>
              <button type="button" class="btn btn-outline btn-sm" data-action="redeem" data-id="${escapeHtml(customer.id)}">Đổi điểm</button>
              ${adminButtons}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  /* ------------------------------------------------------------------
     TÌM KIẾM (DEBOUNCE 300MS)
     ------------------------------------------------------------------ */
  let searchTimer = null;
  el.searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      state.search = el.searchInput.value.trim();
      state.page = 1;
      loadCustomers();
    }, 300);
  });

  el.btnResetFilters.addEventListener('click', () => {
    el.searchInput.value = '';
    state.search = '';
    state.page = 1;
    loadCustomers();
  });

  /* ------------------------------------------------------------------
     MODAL THÊM / SỬA KHÁCH HÀNG
     ------------------------------------------------------------------ */
  const validateFullName = () => validateField(el.customerFullName, {
    required: true,
    minLength: 2,
    maxLength: 100,
    label: 'Họ và tên'
  });

  const validatePhone = () => validateField(el.customerPhone, {
    required: true,
    pattern: /^[0-9]{9,11}$/,
    patternMessage: 'Số điện thoại phải gồm 9 đến 11 chữ số (0-9).',
    label: 'Số điện thoại'
  });

  el.customerFullName.addEventListener('blur', validateFullName);
  el.customerFullName.addEventListener('input', () => {
    hideAlert(el.customerFormError);
    if (el.customerFullName.classList.contains('is-invalid')) validateFullName();
  });

  el.customerPhone.addEventListener('blur', validatePhone);
  el.customerPhone.addEventListener('input', () => {
    hideAlert(el.customerFormError);
    if (el.customerPhone.classList.contains('is-invalid')) validatePhone();
  });

  function resetCustomerValidation() {
    validateField(el.customerFullName, {});
    validateField(el.customerPhone, {});
    hideAlert(el.customerFormError);
  }

  el.btnAddCustomer.addEventListener('click', () => {
    el.customerForm.reset();
    el.customerId.value = '';
    el.customerModalTitle.textContent = 'Thêm khách hàng mới';
    resetCustomerValidation();
    showModal(customerModal);
  });

  function openEditModal(customer) {
    if (!admin) return;
    el.customerForm.reset();
    el.customerId.value = customer.id;
    el.customerFullName.value = customer.fullName || '';
    el.customerPhone.value = customer.phone || '';
    el.customerModalTitle.textContent = `Sửa khách hàng #${customer.id}`;
    resetCustomerValidation();
    showModal(customerModal);
  }

  el.customerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (savingCustomer) return;
    hideAlert(el.customerFormError);

    const okName = validateFullName();
    const okPhone = validatePhone();
    if (!okName || !okPhone) return;

    const id = el.customerId.value;
    if (id && !admin) return;

    const payload = {
      fullName: el.customerFullName.value.trim(),
      phone: el.customerPhone.value.trim()
    };

    savingCustomer = true;
    showLoading(el.btnSaveCustomer);
    try {
      if (id) {
        await apiFetch(`/api/customers/${id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        showToast('Cập nhật khách hàng thành công.', 'success');
      } else {
        await apiFetch('/api/customers', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        showToast('Thêm khách hàng thành công.', 'success');
      }
      if (customerModal) customerModal.hide();
      await loadCustomers();
    } catch (err) {
      const msg = err.errors ? err.errors.join(' ') : err.message;
      showAlert(el.customerFormError, msg);
      showToast(err.message || 'Không thể lưu khách hàng.', 'danger');
    } finally {
      savingCustomer = false;
      hideLoading(el.btnSaveCustomer);
    }
  });

  /* ------------------------------------------------------------------
     MODAL CỘNG ĐIỂM
     ------------------------------------------------------------------ */
  function validateEarnAmount() {
    return validateField(el.earnAmount, {
      required: true,
      label: 'Số tiền hóa đơn',
      custom: (val) => {
        if (!/^\d+$/.test(val)) {
          return 'Số tiền hóa đơn phải là số nguyên (VNĐ).';
        }
        const num = Number(val);
        if (!Number.isSafeInteger(num) || num < 10000 || num > 1000000000) {
          return 'Số tiền hóa đơn phải từ 10.000 đến 1.000.000.000 đ.';
        }
        return true;
      }
    });
  }

  function updateEarnPreview() {
    if (!activePointsTarget) return;
    const raw = (el.earnAmount.value || '').trim();
    if (!/^\d+$/.test(raw)) {
      el.earnPreview.textContent = 'Nhập số tiền từ 10.000đ trở lên để xem trước số điểm sẽ cộng.';
      return;
    }
    const amount = Number(raw);
    if (amount < 10000 || amount > 1000000000) {
      el.earnPreview.textContent = 'Số tiền hợp lệ từ 10.000đ đến 1.000.000.000đ.';
      return;
    }
    const added = Math.floor(amount / 10000);
    const nextPoints = Number(activePointsTarget.points || 0) + added;
    const nextRank = computeRankLabel(nextPoints);
    el.earnPreview.innerHTML = `
      Điểm sẽ cộng: <strong>+${escapeHtml(added.toLocaleString('vi-VN'))} điểm</strong><br>
      Tổng điểm sau cộng: <strong>${escapeHtml(nextPoints.toLocaleString('vi-VN'))} điểm</strong> (Hạng: <strong>${escapeHtml(nextRank)}</strong>)
    `;
  }

  function openEarnModal(customer) {
    activePointsTarget = customer;
    el.earnForm.reset();
    el.earnCustomerId.value = customer.id;
    validateField(el.earnAmount, {});
    hideAlert(el.earnFormError);
    el.earnCustomerInfo.innerHTML = `
      Khách hàng: <strong>${escapeHtml(customer.fullName)}</strong> (${escapeHtml(customer.phone)})<br>
      Điểm hiện tại: <strong>${escapeHtml(Number(customer.points || 0).toLocaleString('vi-VN'))} điểm</strong> · Hạng: <strong>${escapeHtml(customer.rank || computeRankLabel(customer.points))}</strong>
    `;
    el.earnPreview.textContent = 'Nhập số tiền từ 10.000đ trở lên để xem trước số điểm sẽ cộng.';
    showModal(earnModal);
  }

  el.earnAmount.addEventListener('input', () => {
    hideAlert(el.earnFormError);
    updateEarnPreview();
    if (el.earnAmount.classList.contains('is-invalid')) validateEarnAmount();
  });

  el.earnForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (savingEarn) return;
    hideAlert(el.earnFormError);
    if (!validateEarnAmount()) return;

    const id = el.earnCustomerId.value;
    const amount = Number(el.earnAmount.value.trim());

    savingEarn = true;
    showLoading(el.btnConfirmEarn);
    try {
      const res = await apiFetch(`/api/customers/${id}/earn`, {
        method: 'POST',
        body: JSON.stringify({ amount })
      });
      if (earnModal) earnModal.hide();
      showToast(res.message || 'Cộng điểm thành công.', 'success');
      await loadCustomers();
    } catch (err) {
      const msg = err.errors ? err.errors.join(' ') : err.message;
      showAlert(el.earnFormError, msg);
      showToast(err.message || 'Không thể cộng điểm.', 'danger');
    } finally {
      savingEarn = false;
      hideLoading(el.btnConfirmEarn);
    }
  });

  /* ------------------------------------------------------------------
     MODAL ĐỔI ĐIỂM
     ------------------------------------------------------------------ */
  function validateRedeemPoints() {
    return validateField(el.redeemPoints, {
      required: true,
      label: 'Số điểm muốn đổi',
      custom: (val) => {
        if (!/^[1-9]\d*$/.test(val)) {
          return 'Số điểm đổi phải là số nguyên dương.';
        }
        const pts = Number(val);
        if (!Number.isSafeInteger(pts) || pts <= 0) {
          return 'Số điểm đổi không hợp lệ.';
        }
        if (activePointsTarget && pts > Number(activePointsTarget.points || 0)) {
          return 'Không đủ điểm để thực hiện giao dịch này.';
        }
        return true;
      }
    });
  }

  function updateRedeemPreview() {
    if (!activePointsTarget) return;
    const raw = (el.redeemPoints.value || '').trim();
    if (!/^[1-9]\d*$/.test(raw)) {
      el.redeemPreview.textContent = 'Nhập số điểm muốn đổi (không vượt quá điểm hiện có).';
      return;
    }
    const pts = Number(raw);
    const curPts = Number(activePointsTarget.points || 0);
    if (pts > curPts) {
      el.redeemPreview.innerHTML = `<span style="color: var(--status-danger); font-weight: 600;">Không đủ điểm (hiện có ${escapeHtml(curPts.toLocaleString('vi-VN'))} điểm).</span>`;
      return;
    }
    const remain = curPts - pts;
    const nextRank = computeRankLabel(remain);
    el.redeemPreview.innerHTML = `
      Điểm còn lại sau khi đổi: <strong>${escapeHtml(remain.toLocaleString('vi-VN'))} điểm</strong> (Hạng: <strong>${escapeHtml(nextRank)}</strong>)
    `;
  }

  function openRedeemModal(customer) {
    activePointsTarget = customer;
    el.redeemForm.reset();
    el.redeemCustomerId.value = customer.id;
    validateField(el.redeemPoints, {});
    hideAlert(el.redeemFormError);
    el.redeemCustomerInfo.innerHTML = `
      Khách hàng: <strong>${escapeHtml(customer.fullName)}</strong> (${escapeHtml(customer.phone)})<br>
      Điểm hiện tại: <strong>${escapeHtml(Number(customer.points || 0).toLocaleString('vi-VN'))} điểm</strong> · Hạng: <strong>${escapeHtml(customer.rank || computeRankLabel(customer.points))}</strong>
    `;
    el.redeemPreview.textContent = 'Nhập số điểm muốn đổi (không vượt quá điểm hiện có).';
    showModal(redeemModal);
  }

  el.redeemPoints.addEventListener('input', () => {
    hideAlert(el.redeemFormError);
    updateRedeemPreview();
    if (el.redeemPoints.classList.contains('is-invalid')) validateRedeemPoints();
  });

  el.redeemForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (savingRedeem) return;
    hideAlert(el.redeemFormError);
    if (!validateRedeemPoints()) return;

    const id = el.redeemCustomerId.value;
    const points = Number(el.redeemPoints.value.trim());

    savingRedeem = true;
    showLoading(el.btnConfirmRedeem);
    try {
      const res = await apiFetch(`/api/customers/${id}/redeem`, {
        method: 'POST',
        body: JSON.stringify({ points })
      });
      if (redeemModal) redeemModal.hide();
      showToast(res.message || 'Đổi điểm thành công.', 'success');
      await loadCustomers();
    } catch (err) {
      const msg = err.errors ? err.errors.join(' ') : err.message;
      showAlert(el.redeemFormError, msg);
      showToast(err.message || 'Không thể đổi điểm.', 'danger');
    } finally {
      savingRedeem = false;
      hideLoading(el.btnConfirmRedeem);
    }
  });

  /* ------------------------------------------------------------------
     THAO TÁC TRÊN TỪNG DÒNG BẢNG
     ------------------------------------------------------------------ */
  el.tableBody.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;

    const id = Number(btn.dataset.id);
    const customer = currentCustomers.find((item) => item.id === id);
    if (!customer) return;

    const action = btn.dataset.action;
    if (action === 'earn') {
      openEarnModal(customer);
      return;
    }
    if (action === 'redeem') {
      openRedeemModal(customer);
      return;
    }
    if (action === 'edit') {
      openEditModal(customer);
      return;
    }
    if (action === 'delete') {
      if (!admin) return;
      if (!confirm(`Bạn có chắc muốn xóa khách hàng "${customer.fullName}" (${customer.phone})?`)) {
        return;
      }
      showLoading(btn);
      try {
        await apiFetch(`/api/customers/${id}`, { method: 'DELETE' });
        showToast('Xóa khách hàng thành công.', 'success');
        await loadCustomers();
      } catch (err) {
        showToast(err.message || 'Không thể xóa khách hàng.', 'danger');
        hideLoading(btn);
      }
    }
  });

  // Khởi chạy tải dữ liệu ban đầu
  loadCustomers();
});
