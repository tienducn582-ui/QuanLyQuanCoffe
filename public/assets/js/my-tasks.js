/**
 * public/assets/js/my-tasks.js
 * Quản lý trang Việc của tôi (TV5-X1)
 * 
 * Nghiệp vụ:
 * - Yêu cầu đăng nhập: requireLogin()
 * - Tải danh sách công việc của người dùng hiện tại: GET /api/tasks?assigneeId=me&status=&overdue=&page=&pageSize=10
 * - Hiển thị: Mã, Tiêu đề, Độ ưu tiên, Ca làm, Hạn chót (đỏ nếu quá hạn), Trạng thái, Nút chuyển trạng thái
 * - Nút chuyển trạng thái: Pending -> InProgress -> Done qua PATCH /api/tasks/:id/status
 * - Sau khi chuyển trạng thái: Tải lại danh sách và gọi updateOverdueBadge()
 * - Danh sách rỗng: showEmpty()
 * - Phân trang: renderPagination()
 */

let currentPage = 1;
const PAGE_SIZE = 10;
let currentTasks = [];

/**
 * Khởi tạo trang khi DOM đã nạp
 */
document.addEventListener('DOMContentLoaded', () => {
  // 1. Kiểm tra đăng nhập
  if (typeof requireLogin === 'function' && !requireLogin()) return;

  // 2. Gắn sự kiện bộ lọc
  const filterStatus = document.getElementById('filterStatus');
  const filterOverdue = document.getElementById('filterOverdue');

  if (filterStatus) {
    filterStatus.addEventListener('change', () => {
      currentPage = 1;
      loadMyTasks();
    });
  }

  if (filterOverdue) {
    filterOverdue.addEventListener('change', () => {
      currentPage = 1;
      loadMyTasks();
    });
  }

  // 3. Tải danh sách công việc ban đầu
  loadMyTasks();
});

/**
 * Kiểm tra xem công việc có bị quá hạn hay không
 * Quy tắc: Deadline < ngày hiện tại (theo giờ địa phương YYYY-MM-DD) và Status <> 'Done'
 * @param {Object} task
 * @returns {boolean}
 */
function isTaskOverdue(task) {
  if (!task.deadline || task.status === 'Done') return false;
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const todayStr = `${yyyy}-${mm}-${dd}`;
  return task.deadline < todayStr;
}

/**
 * Chuyển đổi mã mức ưu tiên sang nhãn tiếng Việt và class badge
 * @param {string} priority
 * @returns {{ label: string, badgeClass: string }}
 */
function getPriorityBadge(priority) {
  switch (priority) {
    case 'High':
      return { label: 'Cao', badgeClass: 'badge-danger bg-danger text-white' };
    case 'Medium':
      return { label: 'Vừa', badgeClass: 'badge-warning bg-warning text-dark' };
    case 'Low':
      return { label: 'Thấp', badgeClass: 'badge-secondary bg-secondary text-white' };
    default:
      return { label: priority || 'Thường', badgeClass: 'badge-secondary bg-secondary text-white' };
  }
}

/**
 * Chuyển đổi trạng thái sang nhãn tiếng Việt và dot/badge
 * @param {string} status
 * @returns {{ label: string, dotClass: string, badgeClass: string }}
 */
function getStatusBadge(status) {
  switch (status) {
    case 'Pending':
      return { label: 'Đang chờ', dotClass: 'warning', badgeClass: 'bg-warning text-dark' };
    case 'InProgress':
      return { label: 'Đang làm', dotClass: 'info', badgeClass: 'bg-info text-dark' };
    case 'Done':
      return { label: 'Hoàn thành', dotClass: 'success', badgeClass: 'bg-success text-white' };
    default:
      return { label: status || 'Không rõ', dotClass: '', badgeClass: 'bg-secondary text-white' };
  }
}

/**
 * Tải danh sách công việc của tôi từ server
 */
async function loadMyTasks() {
  const table = document.getElementById('myTasksTable');
  const tbody = document.getElementById('myTasksTableBody');
  const emptyContainer = document.getElementById('emptyTasksContainer');
  const paginationContainer = document.getElementById('paginationContainer');
  const summaryText = document.getElementById('tasksSummaryText');
  const errorContainer = document.getElementById('pageError');

  if (errorContainer) {
    errorContainer.style.display = 'none';
    errorContainer.classList.add('d-none');
    errorContainer.textContent = '';
  }

  const filterStatusEl = document.getElementById('filterStatus');
  const filterOverdueEl = document.getElementById('filterOverdue');

  const statusVal = filterStatusEl ? filterStatusEl.value : '';
  const overdueVal = filterOverdueEl && filterOverdueEl.checked ? '1' : '';

  // Xây dựng query params
  const params = new URLSearchParams();
  params.set('assigneeId', 'me');
  params.set('page', String(currentPage));
  params.set('pageSize', String(PAGE_SIZE));
  if (statusVal) params.set('status', statusVal);
  if (overdueVal) params.set('overdue', overdueVal);

  if (summaryText) summaryText.textContent = 'Đang tải dữ liệu...';
  if (tbody) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: var(--space-32); color: var(--text-secondary);">
          Đang tải danh sách công việc...
        </td>
      </tr>
    `;
  }

  try {
    const res = await apiFetch(`/api/tasks?${params.toString()}`);

    if (!res || !res.success) {
      throw new Error(res?.message || 'Không thể tải danh sách công việc.');
    }

    currentTasks = res.data || [];
    const pagination = res.pagination || { page: 1, pageSize: PAGE_SIZE, total: 0, totalPages: 1 };

    // Nếu trang hiện tại không còn bản ghi (vd: vừa xong việc cuối ở trang > 1) -> tự lùi về trang cuối
    if (currentTasks.length === 0 && pagination.total > 0 && currentPage > pagination.totalPages) {
      currentPage = pagination.totalPages;
      return loadMyTasks();
    }

    // Cập nhật tóm tắt số lượng
    if (summaryText) {
      if (pagination.total === 0) {
        summaryText.textContent = '0 công việc';
      } else {
        summaryText.textContent = `Tổng cộng ${pagination.total} công việc`;
      }
    }

    // Kiểm tra danh sách rỗng
    if (currentTasks.length === 0) {
      if (table) table.style.display = 'none';
      if (emptyContainer) {
        emptyContainer.style.display = 'block';
        showEmpty(emptyContainer, overdueVal === '1' ? 'Không có công việc nào bị quá hạn.' : 'Bạn chưa có công việc nào được phân công.');
      }
      if (paginationContainer) paginationContainer.innerHTML = '';
      return;
    }

    // Hiển thị bảng
    if (emptyContainer) emptyContainer.style.display = 'none';
    if (table) table.style.display = '';

    // Render danh sách công việc
    renderTaskList(currentTasks);

    // Render phân trang
    if (paginationContainer) {
      renderPagination(paginationContainer, pagination, (newPage) => {
        currentPage = newPage;
        loadMyTasks();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }

  } catch (err) {
    console.error('[MyTasks Error]:', err);
    if (summaryText) summaryText.textContent = 'Lỗi tải dữ liệu';
    if (tbody) tbody.innerHTML = '';
    if (errorContainer) {
      errorContainer.textContent = err.message || 'Lỗi kết nối khi tải danh sách công việc.';
      errorContainer.classList.remove('d-none');
      errorContainer.style.display = 'block';
    }
    if (typeof showToast === 'function') {
      showToast(err.message || 'Lỗi tải danh sách công việc.', 'danger');
    }
  }
}

/**
 * Render mảng công việc vào bảng tbody
 * @param {Array} tasks
 */
function renderTaskList(tasks) {
  const tbody = document.getElementById('myTasksTableBody');
  if (!tbody) return;

  tbody.innerHTML = tasks.map(task => {
    const overdue = isTaskOverdue(task);
    const prio = getPriorityBadge(task.priority);
    const stat = getStatusBadge(task.status);

    // Định dạng Deadline
    let deadlineDisplay = 'Không có hạn';
    let deadlineClass = 'task-muted';
    if (task.deadline) {
      const parts = task.deadline.split('-');
      if (parts.length === 3) {
        deadlineDisplay = `${parts[2]}/${parts[1]}/${parts[0]}`;
      } else {
        deadlineDisplay = escapeHtml(task.deadline);
      }

      if (overdue) {
        deadlineClass = 'task-overdue-text text-danger fw-bold';
        deadlineDisplay += ' (Quá hạn)';
      }
    }

    // Nút chuyển trạng thái theo luồng Pending -> InProgress -> Done
    let actionBtnHtml = '';
    if (task.status === 'Pending') {
      actionBtnHtml = `
        <button type="button" class="btn btn-sm btn-outline btn-status-step" data-id="${task.id}" data-next="InProgress" style="min-height: 28px; padding: 2px 10px; font-size: var(--text-xs); white-space: nowrap;">
          Bắt đầu
        </button>
      `;
    } else if (task.status === 'InProgress') {
      actionBtnHtml = `
        <button type="button" class="btn btn-sm btn-primary btn-status-step" data-id="${task.id}" data-next="Done" style="min-height: 28px; padding: 2px 10px; font-size: var(--text-xs); white-space: nowrap;">
          Hoàn thành
        </button>
      `;
    } else if (task.status === 'Done') {
      actionBtnHtml = `
        <span class="badge bg-success" style="font-size: 11px; padding: 4px 8px; font-weight: 500;">
          Đã xong
        </span>
      `;
    }

    const rowClass = overdue ? 'task-overdue-row' : '';

    return `
      <tr class="${rowClass}">
        <td data-label="Mã" style="font-weight: 600; color: var(--text-secondary);">
          #${task.id}
        </td>
        <td data-label="Tiêu đề công việc">
          <div style="font-weight: 600; color: var(--text-color); margin-bottom: 2px; word-break: break-word;">
            ${escapeHtml(task.title)}
          </div>
          ${task.description ? `<div style="font-size: var(--text-xs); color: var(--text-secondary); word-break: break-word;">${escapeHtml(task.description)}</div>` : ''}
          ${task.categoryName ? `<div style="font-size: 11px; color: var(--accent-dark); margin-top: 2px;">Danh mục: ${escapeHtml(task.categoryName)}</div>` : ''}
        </td>
        <td data-label="Ưu tiên">
          <span class="badge ${prio.badgeClass}" style="font-size: 11px; padding: 3px 8px;">
            ${escapeHtml(prio.label)}
          </span>
        </td>
        <td data-label="Ca làm" style="font-size: var(--text-sm);">
          ${escapeHtml(task.shiftName || 'Không gán ca')}
        </td>
        <td data-label="Hạn chót" class="${deadlineClass}" style="font-size: var(--text-sm);">
          ${deadlineDisplay}
        </td>
        <td data-label="Trạng thái">
          <span class="status-dot ${stat.dotClass}"></span>
          <span style="font-size: var(--text-sm); font-weight: 500;">${escapeHtml(stat.label)}</span>
        </td>
        <td data-label="Thao tác" style="text-align: right;">
          ${actionBtnHtml}
        </td>
      </tr>
    `;
  }).join('');

  // Gắn sự kiện cho các nút chuyển trạng thái
  tbody.querySelectorAll('.btn-status-step').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const taskId = btn.getAttribute('data-id');
      const nextStatus = btn.getAttribute('data-next');
      if (!taskId || !nextStatus) return;

      await handleStatusChange(taskId, nextStatus, btn);
    });
  });
}

/**
 * Gửi yêu cầu chuyển trạng thái công việc
 * @param {string|number} taskId
 * @param {string} nextStatus
 * @param {HTMLButtonElement} btnEl
 */
async function handleStatusChange(taskId, nextStatus, btnEl) {
  if (btnEl) {
    btnEl.disabled = true;
    btnEl.textContent = 'Đang xử lý...';
  }

  try {
    const res = await apiFetch(`/api/tasks/${taskId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: nextStatus })
    });

    if (res && res.success) {
      const statusLabel = nextStatus === 'InProgress' ? 'Đang làm' : 'Hoàn thành';
      if (typeof showToast === 'function') {
        showToast(`Đã chuyển công việc #${taskId} sang trạng thái "${statusLabel}".`, 'success');
      }

      // Tải lại danh sách công việc
      await loadMyTasks();

      // Cập nhật huy hiệu quá hạn trên navbar
      if (typeof updateOverdueBadge === 'function') {
        updateOverdueBadge();
      }
    } else {
      throw new Error(res?.message || 'Không thể cập nhật trạng thái công việc.');
    }
  } catch (err) {
    console.error('[ChangeStatus Error]:', err);
    if (typeof showToast === 'function') {
      showToast(err.message || 'Lỗi khi cập nhật trạng thái công việc.', 'danger');
    }
    if (btnEl) {
      btnEl.disabled = false;
      btnEl.textContent = nextStatus === 'InProgress' ? 'Bắt đầu' : 'Hoàn thành';
    }
  }
}
