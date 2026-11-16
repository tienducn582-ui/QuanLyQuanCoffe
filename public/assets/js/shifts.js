/**
 * shifts.js - Logic trang Quản lý Ca làm việc (public/shifts.html)
 * TV1 phụ trách
 */

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Kiểm tra đăng nhập bắt buộc
  if (typeof requireLogin === 'function') {
    requireLogin();
  }

  // 2. Render Navbar dùng chung
  if (typeof renderNavbar === 'function') {
    renderNavbar();
  }

  const isAdminUser = typeof isAdmin === 'function' ? isAdmin() : false;
  const btnAddShift = document.getElementById('btnAddShift');
  const shiftsList = document.getElementById('shiftsList');
  const shiftsLoading = document.getElementById('shiftsLoading');
  const shiftsEmpty = document.getElementById('shiftsEmpty');
  const shiftModalEl = document.getElementById('shiftModal');
  const shiftModal = shiftModalEl && window.bootstrap ? new bootstrap.Modal(shiftModalEl) : null;
  const shiftForm = document.getElementById('shiftForm');
  const shiftFormError = document.getElementById('shiftFormError');

  // Nếu là Admin, hiện nút Thêm ca
  if (isAdminUser && btnAddShift) {
    btnAddShift.classList.remove('d-none');
  }

  // Tải danh sách ca và các công việc của ca
  await loadShifts();

  // Mở modal thêm ca: reset form
  if (btnAddShift) {
    btnAddShift.addEventListener('click', () => {
      shiftForm.reset();
      document.getElementById('shiftId').value = '';
      document.getElementById('shiftModalTitle').textContent = 'Thêm ca làm việc mới';
      if (shiftFormError) {
        shiftFormError.classList.add('d-none');
        shiftFormError.textContent = '';
      }
    });
  }

  // Submit form Thêm/Sửa Ca
  if (shiftForm) {
    shiftForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!isAdminUser) return;

      const shiftId = document.getElementById('shiftId').value;
      const name = document.getElementById('shiftName').value.trim();
      const startTime = document.getElementById('shiftStartTime').value;
      const endTime = document.getElementById('shiftEndTime').value;
      const note = document.getElementById('shiftNote').value.trim();

      if (startTime >= endTime) {
        if (shiftFormError) {
          shiftFormError.textContent = 'Giờ bắt đầu phải nhỏ hơn giờ kết thúc!';
          shiftFormError.classList.remove('d-none');
        }
        return;
      }

      const payload = { name, startTime, endTime, note };
      const btnSave = document.getElementById('btnSaveShift');
      if (typeof showLoading === 'function') showLoading(btnSave);

      try {
        if (shiftId) {
          // Cập nhật
          await apiFetch(`/api/shifts/${shiftId}`, {
            method: 'PUT',
            body: JSON.stringify(payload)
          });
          if (typeof showToast === 'function') showToast('Cập nhật ca làm việc thành công', 'success');
        } else {
          // Thêm mới
          await apiFetch('/api/shifts', {
            method: 'POST',
            body: JSON.stringify(payload)
          });
          if (typeof showToast === 'function') showToast('Thêm ca làm việc thành công', 'success');
        }

        if (shiftModal) shiftModal.hide();
        await loadShifts();
      } catch (err) {
        if (shiftFormError) {
          shiftFormError.textContent = err.message || 'Lỗi khi lưu ca làm việc';
          shiftFormError.classList.remove('d-none');
        } else if (typeof showToast === 'function') {
          showToast(err.message, 'danger');
        }
      } finally {
        if (typeof hideLoading === 'function') hideLoading(btnSave);
      }
    });
  }

  /**
   * Tải danh sách ca và các công việc thuộc ca
   */
  async function loadShifts() {
    if (shiftsLoading) shiftsLoading.classList.remove('d-none');
    if (shiftsList) shiftsList.innerHTML = '';
    if (shiftsEmpty) shiftsEmpty.classList.add('d-none');

    try {
      const res = await apiFetch('/api/shifts');
      const shifts = res.data || [];

      if (shiftsLoading) shiftsLoading.classList.add('d-none');

      if (shifts.length === 0) {
        if (typeof showEmpty === 'function') {
          showEmpty(shiftsEmpty, 'Chưa có ca làm việc nào. Vui lòng thêm ca mới.');
        } else {
          shiftsEmpty.innerHTML = '<div class="alert alert-info text-center">Chưa có ca làm việc nào.</div>';
          shiftsEmpty.classList.remove('d-none');
        }
        return;
      }

      // Render từng thẻ ca
      for (const shift of shifts) {
        const cardCol = document.createElement('div');
        cardCol.className = 'col-md-6 col-lg-4';

        const safeName = typeof escapeHtml === 'function' ? escapeHtml(shift.name) : shift.name;
        const safeStart = typeof escapeHtml === 'function' ? escapeHtml(shift.startTime) : shift.startTime;
        const safeEnd = typeof escapeHtml === 'function' ? escapeHtml(shift.endTime) : shift.endTime;
        const safeNote = typeof escapeHtml === 'function' ? escapeHtml(shift.note) : shift.note;

        let adminActions = '';
        if (isAdminUser) {
          adminActions = `
            <div class="dropdown">
              <button class="btn btn-sm btn-outline-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                Thao tác
              </button>
              <ul class="dropdown-menu dropdown-menu-end">
                <li><button class="dropdown-item btn-edit-shift" data-id="${shift.id}">Sửa ca</button></li>
                <li><button class="dropdown-item text-danger btn-delete-shift" data-id="${shift.id}" data-name="${safeName}">Xóa ca</button></li>
              </ul>
            </div>
          `;
        }

        cardCol.innerHTML = `
          <div class="card h-100 shadow-sm border-0 border-top border-4 border-primary">
            <div class="card-body d-flex flex-column">
              <div class="d-flex justify-content-between align-items-start mb-2">
                <h5 class="card-title fw-bold text-primary mb-0">${safeName}</h5>
                ${adminActions}
              </div>
              <div class="text-muted small mb-2">
                <i class="bi bi-clock"></i> <strong>Thời gian:</strong> ${safeStart} - ${safeEnd}
              </div>
              ${safeNote ? `<p class="card-text text-secondary small mb-3 fst-italic">${safeNote}</p>` : ''}
              
              <hr class="my-2">
              
              <div class="d-flex justify-content-between align-items-center mb-2">
                <span class="fw-semibold small">Công việc trong ca (${shift.taskCount}):</span>
              </div>
              
              <div class="shift-tasks-container flex-grow-1" id="shift-tasks-${shift.id}">
                <div class="text-center py-2 text-muted small"><span class="spinner-border spinner-border-sm"></span> Đang tải việc...</div>
              </div>
            </div>
          </div>
        `;

        shiftsList.appendChild(cardCol);

        // Tải các công việc thuộc ca này (GET /api/tasks?shiftId=...&pageSize=50)
        loadTasksForShift(shift.id);
      }

      // Gắn sự kiện sửa / xóa ca cho Admin
      attachAdminEvents();

    } catch (err) {
      if (shiftsLoading) shiftsLoading.classList.add('d-none');
      if (typeof showToast === 'function') {
        showToast('Lỗi khi tải danh sách ca làm việc: ' + err.message, 'danger');
      }
    }
  }

  /**
   * Tải công việc theo từng ca
   */
  async function loadTasksForShift(shiftId) {
    const taskContainer = document.getElementById(`shift-tasks-${shiftId}`);
    if (!taskContainer) return;

    try {
      const res = await apiFetch(`/api/tasks?shiftId=${shiftId}&pageSize=50`);
      const tasks = res.data || [];

      if (tasks.length === 0) {
        taskContainer.innerHTML = '<p class="text-muted small text-center my-2">Không có công việc nào trong ca này.</p>';
        return;
      }

      taskContainer.innerHTML = '';
      const listGroup = document.createElement('div');
      listGroup.className = 'list-group list-group-flush small';

      tasks.forEach(task => {
        const item = document.createElement('div');
        item.className = 'list-group-item px-0 py-2 d-flex justify-content-between align-items-center';

        const safeTitle = typeof escapeHtml === 'function' ? escapeHtml(task.title || task.Title) : (task.title || task.Title);
        const taskId = task.id || task.Id;
        const currentStatus = task.status || task.Status || 'Pending';

        let badgeClass = 'bg-secondary';
        if (currentStatus === 'InProgress') badgeClass = 'bg-warning text-dark';
        if (currentStatus === 'Done') badgeClass = 'bg-success';

        item.innerHTML = `
          <div class="text-truncate me-2" style="max-width: 170px;" title="${safeTitle}">
            <span>${safeTitle}</span>
          </div>
          <div class="d-flex align-items-center gap-1">
            <select class="form-select form-select-sm py-0 px-1 status-select" style="font-size: 0.75rem; width: auto;" data-id="${taskId}">
              <option value="Pending" ${currentStatus === 'Pending' ? 'selected' : ''}>Pending</option>
              <option value="InProgress" ${currentStatus === 'InProgress' ? 'selected' : ''}>InProgress</option>
              <option value="Done" ${currentStatus === 'Done' ? 'selected' : ''}>Done</option>
            </select>
          </div>
        `;
        listGroup.appendChild(item);
      });

      taskContainer.appendChild(listGroup);

      // Bắt sự kiện đổi trạng thái công việc (PATCH /api/tasks/:id/status)
      taskContainer.querySelectorAll('.status-select').forEach(select => {
        select.addEventListener('change', async (e) => {
          const tId = e.target.getAttribute('data-id');
          const newStatus = e.target.value;
          try {
            await apiFetch(`/api/tasks/${tId}/status`, {
              method: 'PATCH',
              body: JSON.stringify({ status: newStatus })
            });
            if (typeof showToast === 'function') {
              showToast('Đổi trạng thái công việc thành công', 'success');
            }
          } catch (error) {
            if (typeof showToast === 'function') {
              showToast('Lỗi cập nhật trạng thái: ' + error.message, 'danger');
            }
          }
        });
      });

    } catch (err) {
      taskContainer.innerHTML = '<p class="text-danger small my-2">Lỗi tải công việc</p>';
    }
  }

  /**
   * Gắn sự kiện Sửa/Xóa cho Admin
   */
  function attachAdminEvents() {
    if (!isAdminUser) return;

    // Sửa ca
    document.querySelectorAll('.btn-edit-shift').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.getAttribute('data-id');
        try {
          const res = await apiFetch(`/api/shifts/${id}`);
          const shift = res.data;
          document.getElementById('shiftId').value = shift.id;
          document.getElementById('shiftName').value = shift.name;
          document.getElementById('shiftStartTime').value = shift.startTime;
          document.getElementById('shiftEndTime').value = shift.endTime;
          document.getElementById('shiftNote').value = shift.note || '';

          document.getElementById('shiftModalTitle').textContent = 'Sửa ca làm việc';
          if (shiftFormError) shiftFormError.classList.add('d-none');
          if (shiftModal) shiftModal.show();
        } catch (err) {
          if (typeof showToast === 'function') showToast(err.message, 'danger');
        }
      });
    });

    // Xóa ca
    document.querySelectorAll('.btn-delete-shift').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.getAttribute('data-id');
        const name = e.target.getAttribute('data-name');
        if (!confirm(`Bạn có chắc chắn muốn xóa ca "${name}" không?\nCác công việc thuộc ca này sẽ được chuyển thành Chưa phân ca.`)) {
          return;
        }

        try {
          await apiFetch(`/api/shifts/${id}`, { method: 'DELETE' });
          if (typeof showToast === 'function') showToast('Xóa ca làm việc thành công', 'success');
          await loadShifts();
        } catch (err) {
          if (typeof showToast === 'function') showToast(err.message, 'danger');
        }
      });
    });
  }
});
