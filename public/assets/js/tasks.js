/**
 * public/assets/js/tasks.js - Logic trang Quản lý công việc (public/tasks.html)
 * Thành viên phụ trách: TV3 (Công việc)
 *
 * Mọi dữ liệu lấy và lưu qua API Backend (/api/tasks), KHÔNG dùng LocalStorage cho dữ liệu công việc.
 * Dùng các hàm chung: apiFetch, isAdmin, requireLogin (api.js)
 * và showToast, renderPagination, showEmpty, escapeHtml, showLoading, hideLoading, validateField (ui.js).
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Trang này bắt buộc đăng nhập
  if (!requireLogin()) return;

  const admin = isAdmin();

  // Nhãn tiếng Việt cho trạng thái và mức ưu tiên
  const STATUS_LABELS = { Pending: 'Chờ làm', InProgress: 'Đang làm', Done: 'Hoàn thành' };
  const PRIORITY_LABELS = { Low: 'Thấp', Medium: 'Trung bình', High: 'Cao' };
  const PRIORITY_BADGE = { Low: 'bg-secondary', Medium: 'bg-info text-dark', High: 'bg-danger' };

  // 2. Trạng thái của trang: bộ lọc và trang hiện tại.
  //    Sau khi thêm, sửa, xóa ta tải lại theo đúng state này nên bộ lọc và trang được giữ nguyên.
  const state = {
    search: '',
    status: '',
    priority: '',
    categoryId: '',
    shiftId: '',
    page: 1,
    pageSize: 10
  };

  // 3. Lấy các phần tử DOM
  const el = {
    searchInput: document.getElementById('searchInput'),
    filterStatus: document.getElementById('filterStatus'),
    filterPriority: document.getElementById('filterPriority'),
    filterCategory: document.getElementById('filterCategory'),
    filterShift: document.getElementById('filterShift'),
    btnResetFilters: document.getElementById('btnResetFilters'),
    summary: document.getElementById('tasksSummary'),
    loading: document.getElementById('tasksLoading'),
    empty: document.getElementById('tasksEmpty'),
    tableWrap: document.getElementById('tasksTableWrap'),
    tableBody: document.getElementById('tasksTableBody'),
    pagination: document.getElementById('tasksPagination'),
    btnAddTask: document.getElementById('btnAddTask'),
    modalEl: document.getElementById('taskModal'),
    modalTitle: document.getElementById('taskModalTitle'),
    form: document.getElementById('taskForm'),
    formError: document.getElementById('taskFormError'),
    taskId: document.getElementById('taskId'),
    title: document.getElementById('taskTitle'),
    description: document.getElementById('taskDescription'),
    status: document.getElementById('taskStatus'),
    priority: document.getElementById('taskPriority'),
    deadline: document.getElementById('taskDeadline'),
    category: document.getElementById('taskCategory'),
    shift: document.getElementById('taskShift'),
    assignee: document.getElementById('taskAssignee'),
    btnSave: document.getElementById('btnSaveTask')
  };
  // Modal Bootstrap (nếu CDN Bootstrap không tải được thì danh sách vẫn hiển thị, chỉ báo lỗi khi mở modal)
  const modal = window.bootstrap ? new bootstrap.Modal(el.modalEl) : null;
  function showModal() {
    if (modal) modal.show();
    else showToast('Không tải được thư viện Bootstrap, không mở được biểu mẫu.', 'danger');
  }

  // Danh sách công việc của trang hiện tại (dùng khi bấm Sửa để điền form)
  let currentTasks = [];
  // Cờ chống gửi form hai lần
  let saving = false;
  // Số thứ tự lần tải danh sách: chỉ hiển thị kết quả của lần gọi mới nhất
  // (tránh trường hợp đổi bộ lọc nhanh, phản hồi cũ về sau ghi đè phản hồi mới)
  let loadCounter = 0;

  /* ------------------------------------------------------------------
     TIỆN ÍCH NHỎ
     ------------------------------------------------------------------ */

  // Ngày hôm nay dạng YYYY-MM-DD theo giờ máy người dùng
  function todayString() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  // Đổi 'YYYY-MM-DD' sang 'dd/mm/yyyy'
  function formatDateVi(dateStr) {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  }

  // Tạo các <option> cho select từ mảng { id, name } (giữ lại option đầu tiên "Tất cả"/"Chưa chọn")
  function fillSelect(selectEl, items, getLabel) {
    const first = selectEl.options[0].outerHTML;
    selectEl.innerHTML = first + items
      .map(item => `<option value="${escapeHtml(item.id)}">${escapeHtml(getLabel(item))}</option>`)
      .join('');
  }

  // Tạo chuỗi query string từ state, bỏ các giá trị rỗng
  function buildQuery() {
    const params = new URLSearchParams();
    Object.entries(state).forEach(([key, value]) => {
      if (value !== '' && value !== null && value !== undefined) params.set(key, value);
    });
    return params.toString();
  }

  /* ------------------------------------------------------------------
     TẢI DỮ LIỆU CHO CÁC Ô CHỌN (Danh mục, Ca, Người thực hiện)
     ------------------------------------------------------------------ */
  async function loadLookups() {
    // Gọi song song 3 API; một API lỗi thì các ô khác vẫn có dữ liệu
    const [categories, shifts, users] = await Promise.allSettled([
      apiFetch('/api/categories'),
      apiFetch('/api/shifts'),
      apiFetch('/api/users')
    ]);

    if (categories.status === 'fulfilled') {
      fillSelect(el.filterCategory, categories.value.data, c => c.name);
      fillSelect(el.category, categories.value.data, c => c.name);
    }
    if (shifts.status === 'fulfilled') {
      const label = s => `${s.name} (${s.startTime} - ${s.endTime})`;
      fillSelect(el.filterShift, shifts.value.data, label);
      fillSelect(el.shift, shifts.value.data, label);
    }
    if (users.status === 'fulfilled') {
      fillSelect(el.assignee, users.value.data, u => `${u.fullName} (${u.role})`);
    }
    if ([categories, shifts, users].some(r => r.status === 'rejected')) {
      showToast('Không tải được một số danh sách lựa chọn (danh mục, ca hoặc người dùng).', 'warning');
    }
  }

  /* ------------------------------------------------------------------
     TẢI VÀ HIỂN THỊ DANH SÁCH CÔNG VIỆC
     ------------------------------------------------------------------ */
  async function loadTasks() {
    const myLoad = ++loadCounter;
    el.loading.classList.remove('d-none');
    el.empty.classList.add('d-none');

    try {
      const result = await apiFetch(`/api/tasks?${buildQuery()}`);
      if (myLoad !== loadCounter) return; // đã có lần tải mới hơn, bỏ kết quả cũ
      const p = result.pagination;

      // Trang hiện tại không còn bản ghi (vd: vừa xóa hết trang cuối) -> lùi về trang cuối cùng còn dữ liệu
      if (result.data.length === 0 && p.total > 0 && state.page > p.totalPages) {
        state.page = p.totalPages;
        return loadTasks();
      }

      currentTasks = result.data;
      renderTable(result.data);
      renderPagination(el.pagination, p, (newPage) => {
        state.page = newPage;
        loadTasks();
      });

      el.summary.textContent = p.total > 0
        ? `Tìm thấy ${p.total} công việc · Trang ${p.page}/${p.totalPages}`
        : 'Không có công việc nào khớp điều kiện.';
    } catch (err) {
      if (myLoad !== loadCounter) return;
      currentTasks = [];
      el.tableBody.innerHTML = '';
      el.pagination.innerHTML = '';
      el.summary.textContent = 'Không tải được dữ liệu.';
      showToast(err.message, 'danger');
    } finally {
      if (myLoad === loadCounter) el.loading.classList.add('d-none');
    }
  }

  function renderTable(tasks) {
    if (tasks.length === 0) {
      el.tableWrap.classList.add('d-none');
      el.empty.classList.remove('d-none');
      showEmpty(el.empty, 'Không tìm thấy công việc');
      return;
    }

    el.tableWrap.classList.remove('d-none');
    const today = todayString();

    el.tableBody.innerHTML = tasks.map(task => {
      const overdue = task.deadline && task.deadline < today && task.status !== 'Done';
      const deadlineHtml = task.deadline
        ? `${escapeHtml(formatDateVi(task.deadline))}${overdue ? ' <span class="badge bg-danger">Quá hạn</span>' : ''}`
        : '<span class="task-muted">Không có</span>';

      // Ô đổi trạng thái: mọi người dùng đều được (PATCH /status)
      const statusOptions = Object.entries(STATUS_LABELS)
        .map(([value, label]) => `<option value="${value}" ${value === task.status ? 'selected' : ''}>${label}</option>`)
        .join('');

      // Nút Sửa và Xóa chỉ hiện với Admin
      const adminButtons = admin
        ? `<button type="button" class="btn btn-outline btn-sm" data-action="edit" data-id="${task.id}">Sửa</button>
           <button type="button" class="btn btn-danger btn-sm" data-action="delete" data-id="${task.id}">Xóa</button>`
        : '<span class="task-muted small">—</span>';

      return `
        <tr>
          <td data-label="Mã">#${task.id}</td>
          <td data-label="Công việc">
            <div>
              <strong>${escapeHtml(task.title)}</strong>
              ${task.description ? `<div class="task-muted small">${escapeHtml(task.description)}</div>` : ''}
            </div>
          </td>
          <td data-label="Danh mục / Ca">
            <div>
              ${escapeHtml(task.categoryName || 'Chưa phân loại')}
              <div class="task-muted small">${escapeHtml(task.shiftName || 'Không thuộc ca')}</div>
            </div>
          </td>
          <td data-label="Người thực hiện">${escapeHtml(task.assigneeName || 'Chưa giao')}</td>
          <td data-label="Ưu tiên"><span class="badge ${PRIORITY_BADGE[task.priority] || 'bg-secondary'}">${escapeHtml(PRIORITY_LABELS[task.priority] || task.priority)}</span></td>
          <td data-label="Hạn chót"><div>${deadlineHtml}</div></td>
          <td data-label="Trạng thái">
            <select class="form-select form-select-sm" style="min-width: 9.5rem;" data-action="status" data-id="${task.id}" aria-label="Đổi trạng thái công việc #${task.id}">
              ${statusOptions}
            </select>
          </td>
          <td data-label="Thao tác" class="text-end text-nowrap"><div>${adminButtons}</div></td>
        </tr>
      `;
    }).join('');
  }

  /* ------------------------------------------------------------------
     TÌM KIẾM VÀ BỘ LỌC
     ------------------------------------------------------------------ */

  // Ô tìm kiếm: chờ người dùng ngừng gõ 300ms mới gọi API (debounce)
  let searchTimer = null;
  el.searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      state.search = el.searchInput.value.trim();
      state.page = 1;
      loadTasks();
    }, 300);
  });

  // Đổi bộ lọc thì quay về trang 1
  [
    [el.filterStatus, 'status'],
    [el.filterPriority, 'priority'],
    [el.filterCategory, 'categoryId'],
    [el.filterShift, 'shiftId']
  ].forEach(([selectEl, key]) => {
    selectEl.addEventListener('change', () => {
      state[key] = selectEl.value;
      state.page = 1;
      loadTasks();
    });
  });

  el.btnResetFilters.addEventListener('click', () => {
    el.searchInput.value = '';
    el.filterStatus.value = '';
    el.filterPriority.value = '';
    el.filterCategory.value = '';
    el.filterShift.value = '';
    Object.assign(state, { search: '', status: '', priority: '', categoryId: '', shiftId: '', page: 1 });
    loadTasks();
  });

  /* ------------------------------------------------------------------
     MODAL THÊM / SỬA
     ------------------------------------------------------------------ */
  function hideFormError() {
    el.formError.classList.add('d-none');
    el.formError.textContent = '';
  }

  function resetFormValidation() {
    [el.title, el.description, el.deadline].forEach(input => validateField(input, {}));
    hideFormError();
  }

  function openCreateModal() {
    el.form.reset();
    el.taskId.value = '';
    el.priority.value = 'Medium';
    el.status.value = 'Pending';
    el.modalTitle.textContent = 'Thêm công việc mới';
    resetFormValidation();
    showModal();
  }

  function openEditModal(task) {
    el.taskId.value = task.id;
    el.title.value = task.title;
    el.description.value = task.description || '';
    el.status.value = task.status;
    el.priority.value = task.priority;
    el.deadline.value = task.deadline || '';
    el.category.value = task.categoryId || '';
    el.shift.value = task.shiftId || '';
    el.assignee.value = task.assigneeId || '';
    el.modalTitle.textContent = `Sửa công việc #${task.id}`;
    resetFormValidation();
    showModal();
  }

  // Kiểm tra dữ liệu phía Client trước khi gửi (Server vẫn kiểm tra lại)
  function validateForm() {
    const okTitle = validateField(el.title, { required: true, maxLength: 200, label: 'Tên công việc' });
    const okDesc = validateField(el.description, { maxLength: 2000, label: 'Mô tả' });
    const okDeadline = validateField(el.deadline, {
      label: 'Hạn chót',
      pattern: /^\d{4}-\d{2}-\d{2}$/,
      patternMessage: 'Hạn chót phải là ngày hợp lệ.'
    });
    return okTitle && okDesc && okDeadline;
  }

  el.btnAddTask.addEventListener('click', openCreateModal);

  el.form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (saving) return; // đang gửi thì bỏ qua lần bấm thứ hai
    hideFormError();
    if (!validateForm()) return;

    const id = el.taskId.value;
    const payload = {
      title: el.title.value.trim(),
      description: el.description.value.trim() || null,
      status: el.status.value,
      priority: el.priority.value,
      deadline: el.deadline.value || null,
      categoryId: el.category.value ? Number(el.category.value) : null,
      shiftId: el.shift.value ? Number(el.shift.value) : null,
      assigneeId: el.assignee.value ? Number(el.assignee.value) : null
    };

    saving = true;
    showLoading(el.btnSave);
    try {
      if (id) {
        await apiFetch(`/api/tasks/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
        showToast('Cập nhật công việc thành công', 'success');
      } else {
        await apiFetch('/api/tasks', { method: 'POST', body: JSON.stringify(payload) });
        showToast('Thêm công việc thành công', 'success');
      }
      if (modal) modal.hide();
      await loadTasks(); // giữ nguyên bộ lọc và trang hiện tại
    } catch (err) {
      // Hiện lỗi Server trả về (có thể là danh sách errors) ngay trong form
      el.formError.textContent = err.errors ? err.errors.join(' ') : err.message;
      el.formError.classList.remove('d-none');
      showToast(err.message, 'danger');
    } finally {
      saving = false;
      hideLoading(el.btnSave);
    }
  });

  // Gõ lại thì kiểm tra lại ngay để bỏ viền đỏ
  el.title.addEventListener('input', () => validateField(el.title, { required: true, maxLength: 200, label: 'Tên công việc' }));

  /* ------------------------------------------------------------------
     THAO TÁC TRÊN TỪNG DÒNG: đổi trạng thái, sửa, xóa
     (gắn sự kiện một lần lên tbody, rồi xem data-action của phần tử được bấm)
     ------------------------------------------------------------------ */
  el.tableBody.addEventListener('change', async (e) => {
    const select = e.target.closest('select[data-action="status"]');
    if (!select) return;

    const id = select.dataset.id;
    select.disabled = true;
    try {
      await apiFetch(`/api/tasks/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: select.value })
      });
      showToast(`Đã chuyển công việc #${id} sang "${STATUS_LABELS[select.value]}"`, 'success');
      await loadTasks(); // tải lại để cập nhật nhãn Quá hạn và khớp bộ lọc trạng thái
    } catch (err) {
      showToast(err.message, 'danger');
      await loadTasks(); // trả ô chọn về giá trị thật trong CSDL
    }
  });

  el.tableBody.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;

    const id = Number(btn.dataset.id);
    const task = currentTasks.find(t => t.id === id);
    if (!task) return;

    if (btn.dataset.action === 'edit') {
      openEditModal(task);
      return;
    }

    if (btn.dataset.action === 'delete') {
      if (!confirm(`Bạn có chắc muốn xóa công việc "${task.title}"? Thao tác này không thể hoàn tác.`)) return;

      showLoading(btn);
      try {
        await apiFetch(`/api/tasks/${id}`, { method: 'DELETE' });
        showToast('Xóa công việc thành công', 'success');
        await loadTasks(); // nếu trang hiện tại hết dữ liệu, loadTasks tự lùi một trang
      } catch (err) {
        showToast(err.message, 'danger');
        hideLoading(btn);
      }
    }
  });

  /* ------------------------------------------------------------------
     KHỞI ĐỘNG TRANG
     ------------------------------------------------------------------ */
  (async () => {
    await loadLookups();
    await loadTasks();
  })();
});
