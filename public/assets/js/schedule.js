/**
 * schedule.js - Logic trang Lịch Phân Ca Tuần (public/schedule.html)
 * TV1 phụ trách - Tính năng mở rộng [TV1-X4]
 */

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Kiểm tra đăng nhập bắt buộc
  if (typeof requireLogin === 'function' && !requireLogin()) return;

  const currentUser = typeof getUser === 'function' ? getUser() : null;
  const isAdminUser = typeof isAdmin === 'function' ? isAdmin() : false;

  const btnPrevWeek = document.getElementById('btnPrevWeek');
  const btnNextWeek = document.getElementById('btnNextWeek');
  const btnCurrentWeek = document.getElementById('btnCurrentWeek');
  const weekRangeDisplay = document.getElementById('weekRangeDisplay');
  const btnOpenAssignModal = document.getElementById('btnOpenAssignModal');

  const scheduleLoading = document.getElementById('scheduleLoading');
  const scheduleTbody = document.getElementById('scheduleTbody');
  const scheduleMobileCards = document.getElementById('scheduleMobileCards');

  const assignModalEl = document.getElementById('assignModal');
  const assignModal = assignModalEl && window.bootstrap ? new bootstrap.Modal(assignModalEl) : null;
  const assignForm = document.getElementById('assignForm');
  const assignFormError = document.getElementById('assignFormError');
  const assignShiftSelect = document.getElementById('assignShiftSelect');
  const assignUserSelect = document.getElementById('assignUserSelect');
  const assignWorkDateInput = document.getElementById('assignWorkDate');

  // Quản lý trạng thái
  let shiftsCache = [];
  let usersCache = [];
  let currentMonday = getMonday(new Date());

  // Hiển thị nút phân ca cho Admin
  if (isAdminUser && btnOpenAssignModal) {
    btnOpenAssignModal.classList.remove('d-none');
  }

  /**
   * Tính ngày Thứ Hai của tuần chứa một ngày bất kỳ (theo giờ địa phương)
   */
  function getMonday(d) {
    const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const day = date.getDay(); // 0 là Chủ Nhật, 1 là Thứ Hai...
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(date.setDate(diff));
  }

  /**
   * Định dạng Date object thành chuỗi YYYY-MM-DD theo giờ địa phương (Tránh toISOString)
   */
  function formatLocalDate(d) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Định dạng DD/MM để hiển thị tiêu đề ngày
   */
  function formatDisplayDate(d) {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}`;
  }

  // Khởi tạo và tải dữ liệu ban đầu
  await initData();

  // Sự kiện chuyển tuần
  if (btnPrevWeek) {
    btnPrevWeek.addEventListener('click', async () => {
      currentMonday.setDate(currentMonday.getDate() - 7);
      await renderSchedule();
    });
  }

  if (btnNextWeek) {
    btnNextWeek.addEventListener('click', async () => {
      currentMonday.setDate(currentMonday.getDate() + 7);
      await renderSchedule();
    });
  }

  if (btnCurrentWeek) {
    btnCurrentWeek.addEventListener('click', async () => {
      currentMonday = getMonday(new Date());
      await renderSchedule();
    });
  }

  // Mở modal phân ca từ nút chính
  if (btnOpenAssignModal) {
    btnOpenAssignModal.addEventListener('click', () => {
      openAssignModal();
    });
  }

  // Submit form Phân công ca (Chỉ Admin)
  if (assignForm) {
    assignForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!isAdminUser) return;

      const shiftId = assignShiftSelect.value;
      const userId = assignUserSelect.value;
      const workDate = assignWorkDateInput.value;
      const btnSave = document.getElementById('btnSaveAssignment');

      if (!shiftId || !userId || !workDate) {
        if (assignFormError) {
          assignFormError.textContent = 'Vui lòng điền đầy đủ ca làm, nhân viên và ngày làm!';
          assignFormError.classList.remove('d-none');
        }
        return;
      }

      if (btnSave) {
        btnSave.disabled = true;
        btnSave.textContent = 'Đang lưu...';
      }

      try {
        await apiFetch('/api/schedule', {
          method: 'POST',
          body: JSON.stringify({
            shiftId: Number(shiftId),
            userId: Number(userId),
            workDate
          })
        });

        if (typeof showToast === 'function') {
          showToast('Phân công ca làm việc thành công!', 'success');
        }

        if (assignModal) assignModal.hide();
        await renderSchedule();
      } catch (err) {
        if (assignFormError) {
          assignFormError.textContent = err.message || 'Lỗi khi phân công ca làm việc.';
          assignFormError.classList.remove('d-none');
        } else if (typeof showToast === 'function') {
          showToast(err.message, 'danger');
        }
      } finally {
        if (btnSave) {
          btnSave.disabled = false;
          btnSave.textContent = 'Lưu phân công';
        }
      }
    });
  }

  /**
   * Khởi tạo các danh mục dùng chung (Shifts & Users)
   */
  async function initData() {
    try {
      const promises = [apiFetch('/api/shifts')];
      if (isAdminUser) {
        promises.push(apiFetch('/api/users'));
      }

      const [resShifts, resUsers] = await Promise.all(promises);
      shiftsCache = resShifts.data || [];
      if (resUsers && resUsers.data) {
        usersCache = resUsers.data;
      }

      // Điền options cho select ca
      if (assignShiftSelect) {
        assignShiftSelect.innerHTML = '<option value="">-- Chọn ca làm việc --</option>' +
          shiftsCache.map(s => `<option value="${s.id}">${escapeHtml(s.name)} (${s.startTime} - ${s.endTime})</option>`).join('');
      }

      // Điền options cho select user
      if (assignUserSelect && usersCache.length > 0) {
        assignUserSelect.innerHTML = '<option value="">-- Chọn nhân viên --</option>' +
          usersCache.map(u => `<option value="${u.id}">${escapeHtml(u.fullName || u.email)} (${u.role})</option>`).join('');
      }

      await renderSchedule();
    } catch (err) {
      if (typeof showToast === 'function') {
        showToast('Lỗi khi tải dữ liệu khởi tạo lịch: ' + err.message, 'danger');
      }
    }
  }

  /**
   * Tải và hiển thị lịch phân công cho tuần hiện tại
   */
  async function renderSchedule() {
    if (scheduleLoading) scheduleLoading.classList.remove('d-none');

    // 7 ngày của tuần
    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(currentMonday.getFullYear(), currentMonday.getMonth(), currentMonday.getDate() + i);
      weekDays.push(d);
    }

    const fromDateStr = formatLocalDate(weekDays[0]);
    const toDateStr = formatLocalDate(weekDays[6]);

    // Hiển thị dải ngày tuần
    if (weekRangeDisplay) {
      weekRangeDisplay.textContent = `Thứ Hai, ${formatDisplayDate(weekDays[0])} - Chủ Nhật, ${formatDisplayDate(weekDays[6])}/${weekDays[6].getFullYear()}`;
    }

    // Cập nhật tiêu đề ngày trên thead
    const dayHeaderIds = ['dateMon', 'dateTue', 'dateWed', 'dateThu', 'dateFri', 'dateSat', 'dateSun'];
    const todayStr = formatLocalDate(new Date());

    dayHeaderIds.forEach((id, idx) => {
      const el = document.getElementById(id);
      if (el) {
        const isToday = formatLocalDate(weekDays[idx]) === todayStr;
        el.textContent = `${formatDisplayDate(weekDays[idx])}${isToday ? ' (Hôm nay)' : ''}`;
        if (isToday) {
          el.parentElement.classList.add('table-primary');
        } else {
          el.parentElement.classList.remove('table-primary');
        }
      }
    });

    try {
      const res = await apiFetch(`/api/schedule?from=${fromDateStr}&to=${toDateStr}`);
      const assignments = res.data || [];

      if (scheduleLoading) scheduleLoading.classList.add('d-none');

      // 1. Render Desktop Table
      renderDesktopTable(weekDays, assignments);

      // 2. Render Mobile View
      renderMobileView(weekDays, assignments);

      // Gắn sự kiện Hủy phân công và Thêm nhanh
      attachGridEvents();

    } catch (err) {
      if (scheduleLoading) scheduleLoading.classList.add('d-none');
      if (scheduleTbody) {
        scheduleTbody.innerHTML = `
          <tr>
            <td colspan="8" class="text-center py-4 text-danger">
              Lỗi khi tải lịch phân ca: ${typeof escapeHtml === 'function' ? escapeHtml(err.message) : err.message}
            </td>
          </tr>
        `;
      }
    }
  }

  /**
   * Render lưới tuần dạng bảng trên Desktop
   */
  function renderDesktopTable(weekDays, assignments) {
    if (!scheduleTbody) return;

    if (shiftsCache.length === 0) {
      scheduleTbody.innerHTML = `
        <tr>
          <td colspan="8" class="text-center py-4 text-muted">
            Chưa có ca làm việc nào được cấu hình trong hệ thống.
          </td>
        </tr>
      `;
      return;
    }

    const todayStr = formatLocalDate(new Date());

    const rowsHtml = shiftsCache.map(shift => {
      const safeShiftName = typeof escapeHtml === 'function' ? escapeHtml(shift.name) : shift.name;

      const cellsHtml = weekDays.map(d => {
        const dateStr = formatLocalDate(d);
        const isToday = dateStr === todayStr;
        const cellAssignments = assignments.filter(a => a.shiftId === shift.id && a.workDate === dateStr);

        let badgesHtml = '';
        if (cellAssignments.length > 0) {
          badgesHtml = cellAssignments.map(a => {
            const isMe = currentUser && a.userId === currentUser.id;
            const safeUserName = typeof escapeHtml === 'function' ? escapeHtml(a.userName) : a.userName;
            const removeBtn = isAdminUser
              ? `<button type="button" class="btn-remove-assign" data-id="${a.id}" data-name="${safeUserName}" title="Hủy phân công">&times;</button>`
              : '';

            return `
              <div class="user-assignment-badge ${isMe ? 'is-me' : 'bg-light text-dark border'}" title="${isMe ? 'Ca của bạn' : ''}">
                <span class="text-truncate" style="max-width: 105px;">${safeUserName}</span>
                ${removeBtn}
              </div>
            `;
          }).join('');
        } else {
          badgesHtml = '<span class="text-muted fst-italic" style="font-size: 0.72rem;">Chưa có</span>';
        }

        const addBtn = isAdminUser
          ? `<button type="button" class="btn-cell-add" data-shift-id="${shift.id}" data-date="${dateStr}" title="Phân công thêm nhân viên">+ Thêm</button>`
          : '';

        return `
          <td class="p-1">
            <div class="schedule-cell ${isToday ? 'today-col' : ''}">
              ${badgesHtml}
              ${addBtn}
            </div>
          </td>
        `;
      }).join('');

      return `
        <tr>
          <td class="col-shift">
            <strong class="text-primary">${safeShiftName}</strong><br>
            <small class="text-muted">${shift.startTime} - ${shift.endTime}</small>
          </td>
          ${cellsHtml}
        </tr>
      `;
    }).join('');

    scheduleTbody.innerHTML = rowsHtml;
  }

  /**
   * Render danh sách theo ngày trên Mobile (< 576px)
   */
  function renderMobileView(weekDays, assignments) {
    if (!scheduleMobileCards) return;

    const dayNames = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật'];
    const todayStr = formatLocalDate(new Date());

    const cardsHtml = weekDays.map((d, idx) => {
      const dateStr = formatLocalDate(d);
      const isToday = dateStr === todayStr;
      const dayAssignments = assignments.filter(a => a.workDate === dateStr);

      let shiftBlocks = '';
      if (shiftsCache.length > 0) {
        shiftBlocks = shiftsCache.map(shift => {
          const shiftAssigned = dayAssignments.filter(a => a.shiftId === shift.id);
          const safeShiftName = typeof escapeHtml === 'function' ? escapeHtml(shift.name) : shift.name;

          let staffListHtml = '';
          if (shiftAssigned.length > 0) {
            staffListHtml = shiftAssigned.map(a => {
              const isMe = currentUser && a.userId === currentUser.id;
              const safeUserName = typeof escapeHtml === 'function' ? escapeHtml(a.userName) : a.userName;
              const removeBtn = isAdminUser
                ? `<button type="button" class="btn-remove-assign ms-1" data-id="${a.id}" data-name="${safeUserName}">&times;</button>`
                : '';
              return `
                <span class="badge ${isMe ? 'bg-primary text-white' : 'bg-light text-dark border'} me-1 mb-1 p-2">
                  ${safeUserName} ${removeBtn}
                </span>
              `;
            }).join('');
          } else {
            staffListHtml = '<span class="text-muted fst-italic small">Chưa xếp người</span>';
          }

          const addBtn = isAdminUser
            ? `<button type="button" class="btn btn-outline-secondary btn-sm py-0 px-2 ms-2 btn-cell-add" data-shift-id="${shift.id}" data-date="${dateStr}">+</button>`
            : '';

          return `
            <div class="p-2 mb-2 bg-light rounded border">
              <div class="d-flex justify-content-between align-items-center mb-1">
                <strong>${safeShiftName} <small class="text-muted">(${shift.startTime}-${shift.endTime})</small></strong>
                ${addBtn}
              </div>
              <div class="d-flex flex-wrap align-items-center">
                ${staffListHtml}
              </div>
            </div>
          `;
        }).join('');
      } else {
        shiftBlocks = '<p class="text-muted small">Chưa có ca làm việc.</p>';
      }

      return `
        <div class="card mb-3 shadow-sm ${isToday ? 'border-primary' : ''}">
          <div class="card-header ${isToday ? 'bg-primary text-white' : 'bg-light'} py-2">
            <strong>${dayNames[idx]}, ${formatDisplayDate(d)}</strong> ${isToday ? '<span class="badge bg-warning text-dark ms-1">Hôm nay</span>' : ''}
          </div>
          <div class="card-body p-2">
            ${shiftBlocks}
          </div>
        </div>
      `;
    }).join('');

    scheduleMobileCards.innerHTML = cardsHtml;
  }

  /**
   * Mở modal phân ca
   */
  function openAssignModal(shiftId = '', workDate = '') {
    if (!isAdminUser) return;
    if (assignForm) assignForm.reset();
    if (assignFormError) {
      assignFormError.classList.add('d-none');
      assignFormError.textContent = '';
    }

    if (shiftId && assignShiftSelect) {
      assignShiftSelect.value = String(shiftId);
    }
    if (workDate && assignWorkDateInput) {
      assignWorkDateInput.value = workDate;
    } else if (assignWorkDateInput) {
      assignWorkDateInput.value = formatLocalDate(new Date());
    }

    if (assignModal) assignModal.show();
  }

  /**
   * Gắn sự kiện Hủy phân công và Nút thêm nhanh trên ô lịch
   */
  function attachGridEvents() {
    // 1. Nút thêm nhanh trên ô
    document.querySelectorAll('.btn-cell-add').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const sId = e.currentTarget.getAttribute('data-shift-id');
        const dt = e.currentTarget.getAttribute('data-date');
        openAssignModal(sId, dt);
      });
    });

    // 2. Nút hủy phân công (Chỉ Admin)
    if (isAdminUser) {
      document.querySelectorAll('.btn-remove-assign').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const id = e.currentTarget.getAttribute('data-id');
          const name = e.currentTarget.getAttribute('data-name');
          if (!confirm(`Bạn có chắc muốn hủy phân công của "${name}" khỏi ca này không?`)) {
            return;
          }

          e.currentTarget.disabled = true;
          try {
            await apiFetch(`/api/schedule/${id}`, { method: 'DELETE' });
            if (typeof showToast === 'function') {
              showToast('Hủy phân công ca thành công!', 'success');
            }
            await renderSchedule();
          } catch (err) {
            if (typeof showToast === 'function') {
              showToast(err.message || 'Lỗi khi hủy phân công ca.', 'danger');
            }
            e.currentTarget.disabled = false;
          }
        });
      });
    }
  }
});
