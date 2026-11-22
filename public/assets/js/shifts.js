/**
 * shifts.js - Logic trang Quản lý Ca làm việc (public/shifts.html)
 * TV1 phụ trách - Đã mở rộng tính năng [TV1-X2] Bàn giao ca
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

  const currentUser = typeof getUser === 'function' ? getUser() : null;
  const isAdminUser = typeof isAdmin === 'function' ? isAdmin() : false;
  const btnAddShift = document.getElementById('btnAddShift');
  const shiftsList = document.getElementById('shiftsList');
  const shiftsLoading = document.getElementById('shiftsLoading');
  const shiftsEmpty = document.getElementById('shiftsEmpty');
  const shiftModalEl = document.getElementById('shiftModal');
  const shiftModal = shiftModalEl && window.bootstrap ? new bootstrap.Modal(shiftModalEl) : null;
  const shiftForm = document.getElementById('shiftForm');
  const shiftFormError = document.getElementById('shiftFormError');

  // Modal Kết thúc ca (TV1-X2)
  const endShiftModalEl = document.getElementById('endShiftModal');
  const endShiftModal = endShiftModalEl && window.bootstrap ? new bootstrap.Modal(endShiftModalEl) : null;
  const endShiftForm = document.getElementById('endShiftForm');
  const endShiftError = document.getElementById('endShiftError');
  const handoverNoteInput = document.getElementById('handoverNote');
  const handoverCharCount = document.getElementById('handoverCharCount');
  const btnRefreshLogs = document.getElementById('btnRefreshLogs');

  // Tính chuỗi ngày hôm nay YYYY-MM-DD theo giờ địa phương
  function getTodayString() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // Định dạng ngày giờ hiển thị
  function formatDateTime(dtStr) {
    if (!dtStr) return '';
    try {
      const d = new Date(dtStr);
      if (isNaN(d.getTime())) return String(dtStr);
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${hours}:${minutes} ${day}/${month}/${year}`;
    } catch {
      return String(dtStr);
    }
  }

  // Cập nhật nhãn ngày của bảng nhật ký
  const shiftLogsDateDisplay = document.getElementById('shiftLogsDateDisplay');
  if (shiftLogsDateDisplay) {
    const today = new Date();
    shiftLogsDateDisplay.textContent = `Hôm nay: ${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
  }

  // Đếm ký tự cho ô ghi chú bàn giao
  if (handoverNoteInput && handoverCharCount) {
    handoverNoteInput.addEventListener('input', () => {
      handoverCharCount.textContent = handoverNoteInput.value.length;
    });
  }

  // Nếu là Admin, hiện nút Thêm ca
  if (isAdminUser && btnAddShift) {
    btnAddShift.classList.remove('d-none');
  }

  // Tải danh sách ca và các công việc của ca
  await loadShiftsAndLogs();

  // Nút làm mới nhật ký
  if (btnRefreshLogs) {
    btnRefreshLogs.addEventListener('click', async () => {
      btnRefreshLogs.disabled = true;
      await loadTodayLogs();
      btnRefreshLogs.disabled = false;
      if (typeof showToast === 'function') showToast('Đã làm mới nhật ký ca hôm nay', 'info');
    });
  }

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
          await apiFetch(`/api/shifts/${shiftId}`, {
            method: 'PUT',
            body: JSON.stringify(payload)
          });
          if (typeof showToast === 'function') showToast('Cập nhật ca làm việc thành công', 'success');
        } else {
          await apiFetch('/api/shifts', {
            method: 'POST',
            body: JSON.stringify(payload)
          });
          if (typeof showToast === 'function') showToast('Thêm ca làm việc thành công', 'success');
        }

        if (shiftModal) shiftModal.hide();
        await loadShiftsAndLogs();
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

  // Submit form Kết thúc ca & Bàn giao (TV1-X2)
  if (endShiftForm) {
    endShiftForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const shiftId = document.getElementById('endShiftId').value;
      const handoverNote = (handoverNoteInput ? handoverNoteInput.value : '').trim();
      const btnSubmit = document.getElementById('btnSubmitEndShift');

      if (!shiftId) return;

      if (handoverNote.length > 500) {
        if (endShiftError) {
          endShiftError.textContent = 'Ghi chú bàn giao không được vượt quá 500 ký tự!';
          endShiftError.classList.remove('d-none');
        }
        return;
      }

      if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.textContent = 'Đang xử lý...';
      }

      try {
        await apiFetch(`/api/shifts/${shiftId}/end`, {
          method: 'POST',
          body: JSON.stringify({ handoverNote })
        });

        if (typeof showToast === 'function') {
          showToast('Đã kết thúc ca làm việc và ghi nhận bàn giao thành công', 'success');
        }

        if (endShiftModal) endShiftModal.hide();
        await loadShiftsAndLogs();
      } catch (err) {
        if (endShiftError) {
          endShiftError.textContent = err.message || 'Lỗi khi kết thúc ca làm việc';
          endShiftError.classList.remove('d-none');
        } else if (typeof showToast === 'function') {
          showToast(err.message, 'danger');
        }
      } finally {
        if (btnSubmit) {
          btnSubmit.disabled = false;
          btnSubmit.textContent = 'Xác nhận kết thúc ca';
        }
      }
    });
  }

  /**
   * Tải đồng bộ danh sách ca và nhật ký ca hôm nay
   */
  async function loadShiftsAndLogs() {
    await Promise.all([loadShifts(), loadTodayLogs()]);
  }

  /**
   * Tải nhật ký hôm nay để biết người dùng hiện tại đang mở ca nào
   * và vẽ bảng nhật ký bên dưới
   */
  async function getTodayActiveShiftId() {
    try {
      const today = getTodayString();
      const res = await apiFetch(`/api/shifts/logs?date=${today}`);
      const logs = res.data || [];
      if (!currentUser) return null;
      const activeLog = logs.find(l => l.userId === currentUser.id && !l.endedAt);
      return activeLog ? activeLog.shiftId : null;
    } catch {
      return null;
    }
  }

  /**
   * Tải bảng Nhật ký ca & bàn giao hôm nay
   */
  async function loadTodayLogs() {
    const tbody = document.getElementById('shiftLogsTbody');
    if (!tbody) return;

    try {
      const today = getTodayString();
      const res = await apiFetch(`/api/shifts/logs?date=${today}`);
      const logs = res.data || [];

      if (logs.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="6" class="text-center py-4 text-muted">
              Chưa có nhật ký ca làm việc nào trong ngày hôm nay.
            </td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = logs.map(l => {
        const safeShiftName = typeof escapeHtml === 'function' ? escapeHtml(l.shiftName) : l.shiftName;
        const safeUserName = typeof escapeHtml === 'function' ? escapeHtml(l.userName) : l.userName;
        const startStr = formatDateTime(l.startedAt);
        const endStr = l.endedAt ? formatDateTime(l.endedAt) : '<span class="badge bg-warning text-dark">Đang trực</span>';
        const statusBadge = l.endedAt
          ? '<span class="badge bg-success">Đã hoàn thành</span>'
          : '<span class="badge bg-primary">Đang trực</span>';
        const safeNote = l.handoverNote
          ? `<span class="text-dark">${typeof escapeHtml === 'function' ? escapeHtml(l.handoverNote) : l.handoverNote}</span>`
          : '<span class="text-muted fst-italic">Không có ghi chú</span>';

        return `
          <tr>
            <td class="fw-semibold text-primary">${safeShiftName}</td>
            <td><strong>${safeUserName}</strong></td>
            <td><small class="text-muted">${startStr}</small></td>
            <td><small>${endStr}</small></td>
            <td>${statusBadge}</td>
            <td>${safeNote}</td>
          </tr>
        `;
      }).join('');
    } catch (err) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center py-4 text-danger">
            Lỗi khi tải nhật ký: ${typeof escapeHtml === 'function' ? escapeHtml(err.message) : err.message}
          </td>
        </tr>
      `;
    }
  }

  /**
   * Tải danh sách ca và các công việc thuộc ca
   */
  async function loadShifts() {
    if (shiftsLoading) shiftsLoading.classList.remove('d-none');
    if (shiftsList) shiftsList.innerHTML = '';
    if (shiftsEmpty) shiftsEmpty.classList.add('d-none');

    try {
      const [resShifts, activeShiftId] = await Promise.all([
        apiFetch('/api/shifts'),
        getTodayActiveShiftId()
      ]);
      const shifts = resShifts.data || [];

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

        // Quyết định nút Nhận ca / Kết thúc ca
        let shiftActionBtn = '';
        if (activeShiftId === shift.id) {
          shiftActionBtn = `
            <button class="btn btn-sm btn-danger btn-end-shift" data-id="${shift.id}" data-name="${safeName}" title="Kết thúc ca làm và bàn giao">
              Kết thúc ca
            </button>
          `;
        } else if (!activeShiftId) {
          shiftActionBtn = `
            <button class="btn btn-sm btn-success btn-start-shift" data-id="${shift.id}" data-name="${safeName}" title="Bắt đầu nhận ca">
              Nhận ca
            </button>
          `;
        } else {
          shiftActionBtn = `
            <button class="btn btn-sm btn-outline-secondary disabled" disabled title="Bạn đang trong một ca khác chưa kết thúc">
              Đang trực ca khác
            </button>
          `;
        }

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
                <div>
                  <h5 class="card-title fw-bold text-primary mb-1">${safeName}</h5>
                  <div class="text-muted small">
                    <strong>Thời gian:</strong> ${safeStart} - ${safeEnd}
                  </div>
                </div>
                <div class="d-flex align-items-center gap-1">
                  ${shiftActionBtn}
                  ${adminActions}
                </div>
              </div>
              
              ${safeNote ? `<p class="card-text text-secondary small mb-2 fst-italic">${safeNote}</p>` : ''}
              
              <!-- Khối Bàn giao từ ca trước (TV1-X2) -->
              <div class="shift-handover-box p-2 mb-2 bg-light rounded border" id="shift-handover-${shift.id}">
                <div class="text-center py-1 text-muted small"><span class="spinner-border spinner-border-sm"></span> Đang nạp bàn giao...</div>
              </div>

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

        // Tải thông tin bàn giao ca (/api/shifts/:id/handover)
        loadHandoverForShift(shift.id);

        // Tải các công việc thuộc ca này (GET /api/tasks?shiftId=...&pageSize=50)
        loadTasksForShift(shift.id);
      }

      // Gắn sự kiện sửa / xóa ca cho Admin
      attachAdminEvents();
      // Gắn sự kiện Nhận ca / Kết thúc ca cho Mọi người
      attachShiftActionEvents();

    } catch (err) {
      if (shiftsLoading) shiftsLoading.classList.add('d-none');
      if (typeof showToast === 'function') {
        showToast('Lỗi khi tải danh sách ca làm việc: ' + err.message, 'danger');
      }
    }
  }

  /**
   * Tải thông tin bàn giao ca (/api/shifts/:id/handover)
   */
  async function loadHandoverForShift(shiftId) {
    const box = document.getElementById(`shift-handover-${shiftId}`);
    if (!box) return;

    try {
      const res = await apiFetch(`/api/shifts/${shiftId}/handover`);
      const { lastLog, openTasks } = res.data || {};

      let lastLogHtml = '';
      if (lastLog) {
        const safeUser = typeof escapeHtml === 'function' ? escapeHtml(lastLog.userName) : lastLog.userName;
        const safeNote = lastLog.handoverNote
          ? (typeof escapeHtml === 'function' ? escapeHtml(lastLog.handoverNote) : lastLog.handoverNote)
          : 'Không có ghi chú';
        const endedStr = formatDateTime(lastLog.endedAt);
        lastLogHtml = `
          <div class="small mb-1">
            <span class="fw-semibold text-dark">Bàn giao ca trước:</span>
            <div class="text-secondary fst-italic" style="font-size: 0.8rem;">"${safeNote}"</div>
            <div class="text-muted" style="font-size: 0.75rem;">Bởi <strong>${safeUser}</strong> (${endedStr})</div>
          </div>
        `;
      } else {
        lastLogHtml = `
          <div class="small text-muted fst-italic" style="font-size: 0.8rem;">
            Chưa có thông tin bàn giao ca trước.
          </div>
        `;
      }

      let openTasksHtml = '';
      if (openTasks && openTasks.length > 0) {
        openTasksHtml = `
          <div class="mt-1 pt-1 border-top" style="font-size: 0.75rem;">
            <span class="text-danger fw-semibold">Việc dở chưa xong (${openTasks.length}):</span>
            <ul class="mb-0 ps-3 text-secondary">
              ${openTasks.slice(0, 3).map(t => {
                const sTitle = typeof escapeHtml === 'function' ? escapeHtml(t.title) : t.title;
                return `<li>${sTitle} <span class="badge bg-secondary" style="font-size: 9px;">${t.priority}</span></li>`;
              }).join('')}
              ${openTasks.length > 3 ? `<li><small class="text-muted">...và ${openTasks.length - 3} việc khác</small></li>` : ''}
            </ul>
          </div>
        `;
      }

      box.innerHTML = `
        <div style="font-size: 0.82rem;">
          ${lastLogHtml}
          ${openTasksHtml}
        </div>
      `;
    } catch {
      box.innerHTML = '<div class="small text-muted">Không có dữ liệu bàn giao</div>';
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
   * Gắn sự kiện Nhận ca và Kết thúc ca
   */
  function attachShiftActionEvents() {
    // Nhận ca
    document.querySelectorAll('.btn-start-shift').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const name = e.currentTarget.getAttribute('data-name');
        if (!confirm(`Bạn có muốn bắt đầu nhận "${name}" ngay bây giờ không?`)) {
          return;
        }

        e.currentTarget.disabled = true;
        try {
          await apiFetch(`/api/shifts/${id}/start`, { method: 'POST' });
          if (typeof showToast === 'function') {
            showToast(`Đã nhận ca "${name}" thành công!`, 'success');
          }
          await loadShiftsAndLogs();
        } catch (err) {
          if (typeof showToast === 'function') {
            showToast(err.message || 'Lỗi khi nhận ca làm việc', 'danger');
          }
          e.currentTarget.disabled = false;
        }
      });
    });

    // Kết thúc ca (Mở modal nhập ghi chú bàn giao)
    document.querySelectorAll('.btn-end-shift').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const name = e.currentTarget.getAttribute('data-name');
        document.getElementById('endShiftId').value = id;
        document.getElementById('endShiftInfo').textContent = `Bạn đang kết thúc "${name}". Vui lòng nhập ghi chú bàn giao công việc và nguyên liệu cho ca tiếp theo.`;
        if (handoverNoteInput) handoverNoteInput.value = '';
        if (handoverCharCount) handoverCharCount.textContent = '0';
        if (endShiftError) endShiftError.classList.add('d-none');
        if (endShiftModal) endShiftModal.show();
      });
    });
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
          await loadShiftsAndLogs();
        } catch (err) {
          if (typeof showToast === 'function') showToast(err.message, 'danger');
        }
      });
    });
  }
});
