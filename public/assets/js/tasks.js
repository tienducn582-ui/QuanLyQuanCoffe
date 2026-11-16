/**
 * ====================================================================
 * DỰ ÁN: CAFE TASK MANAGER (HỆ THỐNG QUẢN LÝ CÔNG VIỆC QUÁN CAFE)
 * TẦNG NGHIỆP VỤ: CRUD & VALIDATION CHO DANH SÁCH CÔNG VIỆC
 * File: assets/js/tasks.js
 * Phụ trách: Người 2 (CRUD Operations & Data Validation)
 * ====================================================================
 * Mô tả:
 * - Triển khai đầy đủ 4 thao tác CRUD (Create, Read, Update, Delete) + Toggle Status.
 * - Validation realtime khi gõ (input/blur) và khi submit biểu mẫu.
 * - Kiểm tra dữ liệu nghiêm ngặt theo Data Contract của nhóm:
 *   + Title: Không rỗng, 3 - 100 ký tự, tự động cắt khoảng trắng thừa (trim).
 *   + Description: Không rỗng, tối thiểu 10 ký tự, tối đa 500 ký tự.
 *   + Priority: Nhận giá trị hợp lệ ('Low' | 'Medium' | 'High').
 *   + Status: Nhận giá trị hợp lệ ('Pending' | 'Done').
 *   + Deadline: Ngày hợp lệ YYYY-MM-DD, >= ngày hiện tại khi tạo mới.
 * - Hiển thị thông báo lỗi trực tiếp trên biểu mẫu và Toast alert thân thiện.
 * - Chống gửi form nhiều lần (Double-submission prevention).
 * - Chống tấn công XSS bằng hàm thoát mã HTML an toàn (escapeHTML).
 * - Cung cấp hàm toàn cục window.renderTaskList(tasksToRender) phục vụ Người 3.
 * ====================================================================
 */

(function (window, document) {
  'use strict';

  /* ------------------------------------------------------------------
     1. TIỆN ÍCH DÙNG TRONG MODULE (UTILITIES & HELPERS)
     ------------------------------------------------------------------ */

  /**
   * Thoát mã HTML an toàn nhằm ngăn ngừa tấn công XSS
   * @param {string} str 
   * @returns {string}
   */
  function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Lấy ngày hôm nay dưới dạng YYYY-MM-DD theo giờ địa phương
   * @returns {string}
   */
  function getTodayString() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Định dạng ngày YYYY-MM-DD sang định dạng dd/mm/yyyy hiển thị cho người Việt
   * @param {string} dateStr 
   * @returns {string}
   */
  function formatDateVi(dateStr) {
    if (!dateStr) return 'Chưa đặt';
    const parts = String(dateStr).split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  }

  /**
   * Kiểm tra ngày deadline so với hôm nay
   * @param {string} deadlineStr 
   * @returns {'overdue' | 'today' | 'future'}
   */
  function checkDeadlineStatus(deadlineStr) {
    if (!deadlineStr) return 'future';
    const todayStr = getTodayString();
    if (deadlineStr < todayStr) return 'overdue';
    if (deadlineStr === todayStr) return 'today';
    return 'future';
  }

  /**
   * Bản đồ nhãn tiếng Việt cho Mức độ ưu tiên
   */
  const PRIORITY_LABELS = {
    High: 'Ưu tiên cao',
    Medium: 'Trung bình',
    Low: 'Thấp'
  };

  /**
   * Bản đồ nhãn tiếng Việt cho Trạng thái
   */
  const STATUS_LABELS = {
    Pending: 'Chờ làm (Pending)',
    Done: 'Đã xong (Done)'
  };

  /* ------------------------------------------------------------------
     2. CÁC THÀNH PHẦN DOM CHÍNH
     ------------------------------------------------------------------ */
  const dom = {
    // Thống kê
    statTotal: document.getElementById('stat-total'),
    statPending: document.getElementById('stat-pending'),
    statCompleted: document.getElementById('stat-completed'),
    statHigh: document.getElementById('stat-high'),
    taskVisibleCount: document.getElementById('task-visible-count'),

    // Danh sách & Chế độ xem
    cardsContainer: document.getElementById('task-cards-container'),
    tableContainer: document.getElementById('task-table-container'),
    tableBody: document.getElementById('task-table-body'),
    emptyState: document.getElementById('empty-state'),
    viewCardBtn: document.getElementById('view-mode-card'),
    viewTableBtn: document.getElementById('view-mode-table'),

    // Bộ lọc / Tìm kiếm
    searchInput: document.getElementById('search-input'),
    filterStatus: document.getElementById('filter-status'),
    filterPriority: document.getElementById('filter-priority'),
    sortDeadline: document.getElementById('sort-deadline'),

    // Modal Thêm/Sửa
    modalBackdrop: document.getElementById('task-modal-backdrop'),
    modalTitle: document.getElementById('task-modal-title'),
    modalCloseBtn: document.getElementById('btn-close-modal'),
    modalCancelBtn: document.getElementById('btn-cancel-modal'),
    openAddModalBtn: document.getElementById('btn-open-add-modal'),
    emptyAddBtn: document.getElementById('btn-empty-add'),
    resetDefaultsBtn: document.getElementById('btn-reset-defaults'),

    // Biểu mẫu
    form: document.getElementById('task-form'),
    taskId: document.getElementById('task-id'),
    taskTitle: document.getElementById('task-title'),
    taskDesc: document.getElementById('task-desc'),
    taskCategory: document.getElementById('task-category'),
    taskPriority: document.getElementById('task-priority'),
    taskDeadline: document.getElementById('task-deadline'),
    taskStatus: document.getElementById('task-status'),
    btnSave: document.getElementById('btn-save-task'),
    btnSaveSpinner: document.getElementById('save-task-spinner'),
    btnSaveText: document.getElementById('save-task-text'),

    // Đếm ký tự
    counterTitle: document.getElementById('counter-task-title'),
    counterDesc: document.getElementById('counter-task-desc'),

    // Thông báo lỗi
    errorTitle: document.getElementById('error-task-title'),
    errorDesc: document.getElementById('error-task-desc'),
    errorCategory: document.getElementById('error-task-category'),
    errorPriority: document.getElementById('error-task-priority'),
    errorDeadline: document.getElementById('error-task-deadline'),
    errorStatus: document.getElementById('error-task-status'),

    // Modal Xác nhận xóa
    confirmDeleteBackdrop: document.getElementById('confirm-delete-backdrop'),
    confirmDeleteTitle: document.getElementById('confirm-delete-title'),
    confirmDeleteName: document.getElementById('delete-task-name'),
    confirmDeleteHiddenId: document.getElementById('delete-task-id-hidden'),
    btnCancelDelete: document.getElementById('btn-cancel-delete'),
    btnConfirmDelete: document.getElementById('btn-confirm-delete')
  };

  // Trạng thái hiện tại của module
  let currentViewMode = 'card'; // 'card' | 'table'
  let isSubmitting = false;      // Chống double-submit

  /* ------------------------------------------------------------------
     3. TẦNG VALIDATION: KIỂM TRA TÍNH HỢP LỆ CỦA DỮ LIỆU
     ------------------------------------------------------------------ */

  /**
   * Hiển thị thông báo lỗi trực tiếp trên field
   */
  function setFieldError(inputEl, errorEl, message) {
    if (!inputEl) return;
    inputEl.classList.add('is-invalid');
    inputEl.classList.remove('is-valid');
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.classList.add('is-visible');
    }
  }

  /**
   * Xóa thông báo lỗi của field
   */
  function clearFieldError(inputEl, errorEl) {
    if (!inputEl) return;
    inputEl.classList.remove('is-invalid');
    if (inputEl.value && inputEl.value.trim() !== '') {
      inputEl.classList.add('is-valid');
    } else {
      inputEl.classList.remove('is-valid');
    }
    if (errorEl) {
      errorEl.textContent = '';
      errorEl.classList.remove('is-visible');
    }
  }

  /**
   * Xóa toàn bộ trạng thái lỗi trên form
   */
  function resetAllValidation() {
    clearFieldError(dom.taskTitle, dom.errorTitle);
    clearFieldError(dom.taskDesc, dom.errorDesc);
    clearFieldError(dom.taskCategory, dom.errorCategory);
    clearFieldError(dom.taskPriority, dom.errorPriority);
    clearFieldError(dom.taskDeadline, dom.errorDeadline);
    clearFieldError(dom.taskStatus, dom.errorStatus);
    if (dom.taskTitle) dom.taskTitle.classList.remove('is-valid');
    if (dom.taskDesc) dom.taskDesc.classList.remove('is-valid');
    if (dom.taskCategory) dom.taskCategory.classList.remove('is-valid');
    if (dom.taskPriority) dom.taskPriority.classList.remove('is-valid');
    if (dom.taskDeadline) dom.taskDeadline.classList.remove('is-valid');
    if (dom.taskStatus) dom.taskStatus.classList.remove('is-valid');
  }

  /**
   * Cập nhật bộ đếm ký tự realtime
   */
  function updateCharCounters() {
    if (dom.taskTitle && dom.counterTitle) {
      const titleLen = dom.taskTitle.value.length;
      dom.counterTitle.textContent = `${titleLen}/100`;
      if (titleLen >= 100) {
        dom.counterTitle.classList.add('is-limit');
      } else {
        dom.counterTitle.classList.remove('is-limit');
      }
    }

    if (dom.taskDesc && dom.counterDesc) {
      const descLen = dom.taskDesc.value.length;
      dom.counterDesc.textContent = `${descLen}/500 (tối thiểu 10)`;
      if (descLen >= 500) {
        dom.counterDesc.classList.add('is-limit');
      } else {
        dom.counterDesc.classList.remove('is-limit');
      }
    }
  }

  /**
   * Kiểm tra tính hợp lệ của Tiêu đề (Title)
   * - Bắt buộc nhập (sau khi trim không rỗng)
   * - Tối thiểu 3 ký tự
   * - Tối đa 100 ký tự
   * @returns {boolean}
   */
  function validateTitle() {
    if (!dom.taskTitle) return true;
    const value = dom.taskTitle.value.trim();

    if (value === '') {
      setFieldError(dom.taskTitle, dom.errorTitle, 'Tên công việc không được để trống.');
      return false;
    }
    if (value.length < 3) {
      setFieldError(dom.taskTitle, dom.errorTitle, 'Tên công việc phải có ít nhất 3 ký tự.');
      return false;
    }
    if (value.length > 100) {
      setFieldError(dom.taskTitle, dom.errorTitle, 'Tên công việc không được vượt quá 100 ký tự.');
      return false;
    }

    clearFieldError(dom.taskTitle, dom.errorTitle);
    return true;
  }

  /**
   * Kiểm tra tính hợp lệ của Mô tả (Description)
   * - Bắt buộc nhập
   * - Tối thiểu 10 ký tự (theo chuẩn Data Contract trong đề bài)
   * - Tối đa 500 ký tự
   * @returns {boolean}
   */
  function validateDescription() {
    if (!dom.taskDesc) return true;
    const value = dom.taskDesc.value.trim();

    if (value === '') {
      setFieldError(dom.taskDesc, dom.errorDesc, 'Mô tả chi tiết không được để trống.');
      return false;
    }
    if (value.length < 10) {
      setFieldError(dom.taskDesc, dom.errorDesc, 'Mô tả chi tiết phải có tối thiểu 10 ký tự.');
      return false;
    }
    if (value.length > 500) {
      setFieldError(dom.taskDesc, dom.errorDesc, 'Mô tả không được vượt quá 500 ký tự.');
      return false;
    }

    clearFieldError(dom.taskDesc, dom.errorDesc);
    return true;
  }

  /**
   * Kiểm tra tính hợp lệ của Độ ưu tiên (Priority)
   * @returns {boolean}
   */
  function validatePriority() {
    if (!dom.taskPriority) return true;
    const value = dom.taskPriority.value;
    const allowed = ['Low', 'Medium', 'High'];

    if (!allowed.includes(value)) {
      setFieldError(dom.taskPriority, dom.errorPriority, 'Độ ưu tiên phải là Low, Medium hoặc High.');
      return false;
    }

    clearFieldError(dom.taskPriority, dom.errorPriority);
    return true;
  }

  /**
   * Kiểm tra tính hợp lệ của Trạng thái (Status)
   * @returns {boolean}
   */
  function validateStatus() {
    if (!dom.taskStatus) return true;
    const value = dom.taskStatus.value;
    const allowed = ['Pending', 'Done'];

    if (!allowed.includes(value)) {
      setFieldError(dom.taskStatus, dom.errorStatus, 'Trạng thái phải là Pending hoặc Done.');
      return false;
    }

    clearFieldError(dom.taskStatus, dom.errorStatus);
    return true;
  }

  /**
   * Kiểm tra tính hợp lệ của Hạn chót (Deadline)
   * - Bắt buộc nhập ngày hợp lệ dạng YYYY-MM-DD
   * - Khi tạo mới: không được nhỏ hơn ngày hôm nay
   * @returns {boolean}
   */
  function validateDeadline() {
    if (!dom.taskDeadline) return true;
    const value = dom.taskDeadline.value;
    const isEditing = Boolean(dom.taskId && dom.taskId.value);

    if (!value) {
      setFieldError(dom.taskDeadline, dom.errorDeadline, 'Vui lòng chọn hạn chót hoàn thành.');
      return false;
    }

    // Kiểm tra định dạng YYYY-MM-DD
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(value)) {
      setFieldError(dom.taskDeadline, dom.errorDeadline, 'Định dạng ngày không hợp lệ (YYYY-MM-DD).');
      return false;
    }

    // Nếu tạo mới, ngày phải >= ngày hiện tại
    const todayStr = getTodayString();
    if (!isEditing && value < todayStr) {
      setFieldError(
        dom.taskDeadline,
        dom.errorDeadline,
        `Hạn chót không được nhỏ hơn ngày hiện tại (${formatDateVi(todayStr)}).`
      );
      return false;
    }

    clearFieldError(dom.taskDeadline, dom.errorDeadline);
    return true;
  }

  /**
   * Kiểm tra toàn bộ form trước khi lưu
   * @returns {boolean} true nếu toàn bộ dữ liệu hợp lệ
   */
  function validateAll() {
    const isTitleValid = validateTitle();
    const isDescValid = validateDescription();
    const isPriorityValid = validatePriority();
    const isStatusValid = validateStatus();
    const isDeadlineValid = validateDeadline();

    return isTitleValid && isDescValid && isPriorityValid && isStatusValid && isDeadlineValid;
  }

  /* ------------------------------------------------------------------
     4. TẦNG HIỂN THỊ (READ): RENDER DANH SÁCH THẺ & BẢNG
     ------------------------------------------------------------------ */

  /**
   * Cập nhật các thẻ số liệu thống kê (Stats Cards)
   */
  function updateStats(allTasks) {
    if (!Array.isArray(allTasks)) return;

    const total = allTasks.length;
    const pendingCount = allTasks.filter(t => t.status === 'Pending').length;
    const completedCount = allTasks.filter(t => t.status === 'Done').length;
    const highCount = allTasks.filter(t => t.priority === 'High').length;

    if (dom.statTotal) dom.statTotal.textContent = total;
    if (dom.statPending) dom.statPending.textContent = pendingCount;
    if (dom.statCompleted) dom.statCompleted.textContent = completedCount;
    if (dom.statHigh) dom.statHigh.textContent = highCount;
  }

  /**
   * Render HTML cho 1 thẻ công việc (Card View)
   */
  function renderTaskCardHTML(task) {
    const isDone = task.status === 'Done';
    const priorityKey = task.priority || 'Medium';
    const deadlineState = checkDeadlineStatus(task.deadline);

    let deadlineBadgeClass = 'badge-priority-low';
    let deadlinePrefix = '📅';

    if (isDone) {
      deadlineBadgeClass = 'badge-completed';
    } else if (deadlineState === 'overdue') {
      deadlineBadgeClass = 'badge-priority-high';
      deadlinePrefix = '⚠️ Quá hạn:';
    } else if (deadlineState === 'today') {
      deadlineBadgeClass = 'badge-priority-medium';
      deadlinePrefix = '🔥 Hôm nay:';
    } else {
      deadlinePrefix = '📅 Hạn:';
    }

    return `
      <div class="task-card ${isDone ? 'is-done' : ''} priority-${priorityKey.toLowerCase()}" data-task-id="${escapeHTML(task.id)}">
        <div class="task-header">
          <div style="flex: 1; min-width: 0;">
            <div class="task-meta">
              <span class="badge ${isDone ? 'badge-completed' : 'badge-pending'}">
                ${isDone ? '✓ Đã xong (Done)' : '⏳ Chờ làm (Pending)'}
              </span>
              <span class="badge badge-priority-${priorityKey.toLowerCase()}">
                ● ${PRIORITY_LABELS[priorityKey] || priorityKey}
              </span>
              <span style="font-size: var(--text-xs); color: var(--text-muted); background: var(--bg-surface-secondary); padding: 2px 8px; border-radius: var(--radius-sm); font-weight: 500;">
                🏷️ ${escapeHTML(task.category || 'Chung')}
              </span>
              <span class="badge ${deadlineBadgeClass}">
                ${deadlinePrefix} ${formatDateVi(task.deadline)}
              </span>
              <span style="font-size: 0.7rem; color: var(--text-muted); font-family: monospace;">
                #${escapeHTML(task.id)}
              </span>
            </div>

            <h3 class="task-title">
              ${escapeHTML(task.title)}
            </h3>
          </div>

          <!-- Các nút thao tác nhanh -->
          <div class="task-actions">
            <button 
              type="button" 
              class="task-checkbox-btn ${isDone ? 'is-checked' : ''} btn-toggle-task" 
              data-id="${escapeHTML(task.id)}" 
              title="${isDone ? 'Đánh dấu Chưa hoàn thành (Pending)' : 'Đánh dấu Đã hoàn thành (Done)'}">
              ${isDone ? '↺ Mở lại' : '✓ Hoàn thành'}
            </button>
            <button 
              type="button" 
              class="btn-icon btn-edit-task" 
              data-id="${escapeHTML(task.id)}" 
              title="Chỉnh sửa công việc">
              ✏️
            </button>
            <button 
              type="button" 
              class="btn-icon btn-delete-task" 
              data-id="${escapeHTML(task.id)}" 
              data-name="${escapeHTML(task.title)}" 
              style="color: var(--danger);" 
              title="Xóa công việc">
              🗑️
            </button>
          </div>
        </div>

        <p class="task-desc">
          ${escapeHTML(task.description)}
        </p>
      </div>
    `;
  }

  /**
   * Render HTML cho 1 hàng trong bảng (Table View)
   */
  function renderTaskTableRowHTML(task) {
    const isDone = task.status === 'Done';
    const priorityKey = task.priority || 'Medium';
    const deadlineState = checkDeadlineStatus(task.deadline);

    let deadlineBadgeClass = 'badge-priority-low';
    if (isDone) deadlineBadgeClass = 'badge-completed';
    else if (deadlineState === 'overdue') deadlineBadgeClass = 'badge-priority-high';
    else if (deadlineState === 'today') deadlineBadgeClass = 'badge-priority-medium';

    return `
      <tr class="${isDone ? 'is-done' : ''}" data-task-id="${escapeHTML(task.id)}">
        <td style="text-align: center;">
          <input 
            type="checkbox" 
            class="table-toggle-checkbox btn-toggle-task" 
            data-id="${escapeHTML(task.id)}"
            ${isDone ? 'checked' : ''}
            title="${isDone ? 'Chuyển về Pending' : 'Chuyển sang Done'}"
            style="width: 17px; height: 17px; cursor: pointer; accent-color: var(--status-completed);">
        </td>
        <td style="font-family: monospace; font-size: var(--text-xs); color: var(--text-muted);">
          ${escapeHTML(task.id)}
        </td>
        <td>
          <div class="task-title-cell" style="font-weight: 600; font-size: var(--text-sm); margin-bottom: 2px;">
            ${escapeHTML(task.title)}
          </div>
          <div style="font-size: var(--text-xs); color: var(--text-secondary); max-width: 420px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            ${escapeHTML(task.description)}
          </div>
        </td>
        <td>
          <span style="font-size: var(--text-xs); background: var(--bg-surface-secondary); padding: 2px 6px; border-radius: var(--radius-sm);">
            ${escapeHTML(task.category || 'Chung')}
          </span>
        </td>
        <td>
          <span class="badge badge-priority-${priorityKey.toLowerCase()}">
            ${PRIORITY_LABELS[priorityKey] || priorityKey}
          </span>
        </td>
        <td>
          <span class="badge ${deadlineBadgeClass}">
            ${formatDateVi(task.deadline)}
          </span>
        </td>
        <td>
          <span class="badge ${isDone ? 'badge-completed' : 'badge-pending'}">
            ${isDone ? '✓ Đã xong' : '⏳ Chờ làm'}
          </span>
        </td>
        <td>
          <div class="task-table-actions">
            <button 
              type="button" 
              class="btn-icon btn-edit-task" 
              data-id="${escapeHTML(task.id)}" 
              title="Chỉnh sửa công việc"
              style="width: 32px; height: 32px; font-size: 0.85rem;">
              ✏️
            </button>
            <button 
              type="button" 
              class="btn-icon btn-delete-task" 
              data-id="${escapeHTML(task.id)}" 
              data-name="${escapeHTML(task.title)}" 
              title="Xóa công việc"
              style="width: 32px; height: 32px; font-size: 0.85rem; color: var(--danger);">
              🗑️
            </button>
          </div>
        </td>
      </tr>
    `;
  }

  /**
   * Hàm hiển thị danh sách công việc chính
   * THEO QUY ƯỚC NHÓM TRONG README (Dòng 197-203):
   * Xuất ra đối tượng toàn cục `window.renderTaskList(tasksToRender)` để Người 3 gọi khi tìm kiếm/lọc.
   * @param {Array} [tasksToRender] Danh sách task cần hiển thị (nếu không truyền sẽ lấy toàn bộ từ TaskService)
   */
  function renderTaskList(tasksToRender) {
    if (!window.TaskService) {
      console.warn('[tasks.js] Không tìm thấy window.TaskService!');
      return;
    }

    const allTasks = window.TaskService.getAllTasks();
    updateStats(allTasks);

    const list = Array.isArray(tasksToRender) ? tasksToRender : allTasks;

    // Cập nhật số lượng hiển thị
    if (dom.taskVisibleCount) {
      dom.taskVisibleCount.textContent = list.length;
    }

    // Nếu không có công việc nào hiển thị
    if (list.length === 0) {
      if (dom.cardsContainer) dom.cardsContainer.innerHTML = '';
      if (dom.tableBody) dom.tableBody.innerHTML = '';
      if (dom.tableContainer) dom.tableContainer.style.display = 'none';
      if (dom.cardsContainer) dom.cardsContainer.style.display = 'none';
      if (dom.emptyState) dom.emptyState.style.display = 'block';
      return;
    }

    if (dom.emptyState) {
      dom.emptyState.style.display = 'none';
    }

    // Render Card View
    if (dom.cardsContainer) {
      dom.cardsContainer.innerHTML = list.map(renderTaskCardHTML).join('');
      if (currentViewMode === 'card') {
        dom.cardsContainer.style.display = 'flex';
      } else {
        dom.cardsContainer.style.display = 'none';
      }
    }

    // Render Table View
    if (dom.tableBody) {
      dom.tableBody.innerHTML = list.map(renderTaskTableRowHTML).join('');
      if (currentViewMode === 'table') {
        dom.tableContainer.style.display = 'block';
      } else {
        dom.tableContainer.style.display = 'none';
      }
    }
  }

  // Đưa ra window theo đúng Data Contract quy ước
  window.renderTaskList = renderTaskList;

  /* ------------------------------------------------------------------
     5. TẦNG MODAL (CREATE & UPDATE FORM CONTROLS)
     ------------------------------------------------------------------ */

  /**
   * Mở modal thêm công việc mới (Create)
   */
  function openAddModal() {
    if (!dom.modalBackdrop || !dom.form) return;

    dom.form.reset();
    if (dom.taskId) dom.taskId.value = '';
    if (dom.modalTitle) dom.modalTitle.textContent = 'Thêm Công Việc Mới';

    // Đặt hạn chót mặc định là ngày hôm nay
    const today = getTodayString();
    if (dom.taskDeadline) {
      dom.taskDeadline.value = today;
      dom.taskDeadline.setAttribute('min', today); // Không cho chọn ngày trong quá khứ khi thêm mới
    }
    if (dom.taskPriority) dom.taskPriority.value = 'Medium';
    if (dom.taskStatus) dom.taskStatus.value = 'Pending';
    if (dom.taskCategory) dom.taskCategory.value = 'Chung';

    resetAllValidation();
    updateCharCounters();

    dom.modalBackdrop.classList.add('is-open');
    dom.modalBackdrop.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    // Focus vào ô tiêu đề
    setTimeout(() => {
      if (dom.taskTitle) dom.taskTitle.focus();
    }, 150);
  }

  /**
   * Mở modal chỉnh sửa công việc đã tồn tại (Update)
   * @param {string} taskId 
   */
  function openEditModal(taskId) {
    if (!window.TaskService || !dom.modalBackdrop || !dom.form) return;

    const task = window.TaskService.getTaskById(taskId);
    if (!task) {
      if (window.showToast) window.showToast('Không tìm thấy công việc cần sửa!', 'error');
      return;
    }

    dom.form.reset();
    resetAllValidation();

    if (dom.taskId) dom.taskId.value = task.id;
    if (dom.modalTitle) dom.modalTitle.textContent = `✏️ Chỉnh Sửa: #${task.id}`;
    if (dom.taskTitle) dom.taskTitle.value = task.title || '';
    if (dom.taskDesc) dom.taskDesc.value = task.description || '';
    if (dom.taskCategory) dom.taskCategory.value = task.category || 'Chung';
    if (dom.taskPriority) dom.taskPriority.value = task.priority || 'Medium';
    if (dom.taskDeadline) {
      dom.taskDeadline.value = task.deadline || '';
      dom.taskDeadline.removeAttribute('min'); // Khi sửa công việc cũ không khóa min để xem được lịch sử
    }
    if (dom.taskStatus) dom.taskStatus.value = task.status || 'Pending';

    updateCharCounters();

    dom.modalBackdrop.classList.add('is-open');
    dom.modalBackdrop.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    setTimeout(() => {
      if (dom.taskTitle) dom.taskTitle.focus();
    }, 150);
  }

  /**
   * Đóng modal Thêm / Sửa
   */
  function closeModal() {
    if (!dom.modalBackdrop) return;
    dom.modalBackdrop.classList.remove('is-open');
    dom.modalBackdrop.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    resetAllValidation();
  }

  /* ------------------------------------------------------------------
     6. TẦNG XỬ LÝ LƯU BIỂU MẪU (CREATE & UPDATE SUBMISSION)
     ------------------------------------------------------------------ */

  /**
   * Xử lý lưu công việc khi người dùng bấm Submit
   * @param {Event} e 
   */
  function handleFormSubmit(e) {
    e.preventDefault();
    if (isSubmitting) return;

    // 1. Kiểm tra validation
    const isValid = validateAll();
    if (!isValid) {
      if (window.showToast) {
        window.showToast('Vui lòng kiểm tra lại các trường thông tin bị lỗi!', 'warning');
      }
      return;
    }

    // 2. Chuẩn bị dữ liệu và loại bỏ khoảng trắng thừa ở đầu/cuối
    const editingId = dom.taskId ? dom.taskId.value.trim() : '';
    const taskPayload = {
      title: dom.taskTitle.value.trim(),
      description: dom.taskDesc.value.trim(),
      category: dom.taskCategory ? dom.taskCategory.value.trim() : 'Chung',
      priority: dom.taskPriority ? dom.taskPriority.value : 'Medium',
      deadline: dom.taskDeadline ? dom.taskDeadline.value : getTodayString(),
      status: dom.taskStatus ? dom.taskStatus.value : 'Pending'
    };

    // 3. Khóa nút submit chống click kép ngoài ý muốn
    isSubmitting = true;
    if (dom.btnSave) dom.btnSave.disabled = true;
    if (dom.btnSaveSpinner) dom.btnSaveSpinner.style.display = 'inline';
    if (dom.btnSaveText) dom.btnSaveText.textContent = 'Đang lưu...';

    try {
      if (editingId) {
        // CẬP NHẬT CÔNG VIỆC CŨ (UPDATE)
        const updated = window.TaskService.updateTask(editingId, taskPayload);
        if (updated) {
          if (window.showToast) {
            window.showToast(`Đã cập nhật công việc #${editingId} thành công!`, 'success');
          }
          closeModal();
          applyFiltersAndRender();
        } else {
          if (window.showToast) {
            window.showToast('Lỗi khi cập nhật công việc!', 'error');
          }
        }
      } else {
        // THÊM CÔNG VIỆC MỚI (CREATE)
        const created = window.TaskService.addTask(taskPayload);
        if (created) {
          if (window.showToast) {
            window.showToast('Đã thêm công việc mới thành công!', 'success');
          }
          closeModal();
          applyFiltersAndRender();
        } else {
          if (window.showToast) {
            window.showToast('Lỗi khi thêm công việc mới!', 'error');
          }
        }
      }
    } catch (err) {
      console.error('[tasks.js] Lỗi khi xử lý biểu mẫu:', err);
      if (window.showToast) window.showToast('Đã có lỗi hệ thống xảy ra!', 'error');
    } finally {
      isSubmitting = false;
      if (dom.btnSave) dom.btnSave.disabled = false;
      if (dom.btnSaveSpinner) dom.btnSaveSpinner.style.display = 'none';
      if (dom.btnSaveText) dom.btnSaveText.textContent = 'Lưu công việc';
    }
  }

  /* ------------------------------------------------------------------
     7. TẦNG XỬ LÝ XÓA CÔNG VIỆC (DELETE WITH CONFIRMATION)
     ------------------------------------------------------------------ */

  /**
   * Mở hộp thoại xác nhận xóa công việc
   * @param {string} taskId 
   * @param {string} taskName 
   */
  function openConfirmDelete(taskId, taskName) {
    if (!taskId) return;

    if (dom.confirmDeleteBackdrop) {
      if (dom.confirmDeleteName) dom.confirmDeleteName.textContent = taskName ? `"${taskName}"` : `#${taskId}`;
      if (dom.confirmDeleteHiddenId) dom.confirmDeleteHiddenId.value = taskId;
      dom.confirmDeleteBackdrop.classList.add('is-open');
      dom.confirmDeleteBackdrop.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    } else {
      // Fallback nếu không có modal
      const confirmed = window.confirm(`Bạn có chắc chắn muốn xóa công việc "${taskName || taskId}" không?\nThao tác này không thể hoàn tác!`);
      if (confirmed) {
        executeDelete(taskId);
      }
    }
  }

  /**
   * Đóng hộp thoại xác nhận xóa
   */
  function closeConfirmDelete() {
    if (!dom.confirmDeleteBackdrop) return;
    dom.confirmDeleteBackdrop.classList.remove('is-open');
    dom.confirmDeleteBackdrop.setAttribute('aria-hidden', 'true');
    if (dom.confirmDeleteHiddenId) dom.confirmDeleteHiddenId.value = '';
    document.body.style.overflow = '';
  }

  /**
   * Thực hiện xóa công việc qua TaskService
   * @param {string} taskId 
   */
  function executeDelete(taskId) {
    if (!window.TaskService || !taskId) return;

    const success = window.TaskService.deleteTask(taskId);
    if (success) {
      if (window.showToast) window.showToast('Đã xóa công việc thành công!', 'success');
      closeConfirmDelete();
      applyFiltersAndRender();
    } else {
      if (window.showToast) window.showToast('Không thể xóa công việc này!', 'error');
    }
  }

  /* ------------------------------------------------------------------
     8. TẦNG ĐỔI TRẠNG THÁI NHANH (TOGGLE STATUS: PENDING <-> DONE)
     ------------------------------------------------------------------ */
  function handleToggleStatus(taskId) {
    if (!window.TaskService || !taskId) return;

    const updated = window.TaskService.toggleStatus(taskId);
    if (updated) {
      const isNowDone = updated.status === 'Done';
      if (window.showToast) {
        window.showToast(
          `Công việc #${taskId} đã chuyển sang: ${isNowDone ? 'Hoàn thành (Done)' : 'Chờ làm (Pending)'}`,
          isNowDone ? 'success' : 'info'
        );
      }
      applyFiltersAndRender();
    }
  }

  /* ------------------------------------------------------------------
     9. TÍCH HỢP BỘ LỌC & TÌM KIẾM (TOOLBAR INTEGRATION)
     Hỗ trợ Người 3 có sẵn khung lọc và kết nối mượt mà
     ------------------------------------------------------------------ */
  function applyFiltersAndRender() {
    if (!window.TaskService) return;

    const allTasks = window.TaskService.getAllTasks();
    const searchTerm = dom.searchInput ? dom.searchInput.value.trim().toLowerCase() : '';
    const statusVal = dom.filterStatus ? dom.filterStatus.value : 'all';
    const priorityVal = dom.filterPriority ? dom.filterPriority.value : 'all';
    const sortVal = dom.sortDeadline ? dom.sortDeadline.value : 'none';

    // 1. Lọc theo từ khóa tìm kiếm
    let filtered = allTasks.filter(task => {
      const title = (task.title || '').toLowerCase();
      const desc = (task.description || '').toLowerCase();
      const cat = (task.category || '').toLowerCase();
      const id = (task.id || '').toLowerCase();

      const matchSearch = !searchTerm || title.includes(searchTerm) || desc.includes(searchTerm) || cat.includes(searchTerm) || id.includes(searchTerm);
      const matchStatus = statusVal === 'all' || task.status === statusVal;
      const matchPriority = priorityVal === 'all' || task.priority === priorityVal;

      return matchSearch && matchStatus && matchPriority;
    });

    // 2. Sắp xếp theo hạn chót (Deadline)
    if (sortVal === 'asc') {
      filtered.sort((a, b) => (a.deadline || '').localeCompare(b.deadline || ''));
    } else if (sortVal === 'desc') {
      filtered.sort((a, b) => (b.deadline || '').localeCompare(a.deadline || ''));
    }

    renderTaskList(filtered);
  }

  /* ------------------------------------------------------------------
     10. KHỞI TẠO SỰ KIỆN (EVENT LISTENERS SETUP)
     ------------------------------------------------------------------ */
  function initEventListeners() {
    // 10.1. Nút mở modal thêm công việc
    if (dom.openAddModalBtn) {
      dom.openAddModalBtn.addEventListener('click', openAddModal);
    }
    if (dom.emptyAddBtn) {
      dom.emptyAddBtn.addEventListener('click', openAddModal);
    }

    // 10.2. Nút đóng modal
    if (dom.modalCloseBtn) {
      dom.modalCloseBtn.addEventListener('click', closeModal);
    }
    if (dom.modalCancelBtn) {
      dom.modalCancelBtn.addEventListener('click', closeModal);
    }

    // Đóng khi click ngoài backdrop
    if (dom.modalBackdrop) {
      dom.modalBackdrop.addEventListener('click', (e) => {
        if (e.target === dom.modalBackdrop) {
          closeModal();
        }
      });
    }

    // Đóng khi bấm phím Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (dom.modalBackdrop && dom.modalBackdrop.classList.contains('is-open')) {
          closeModal();
        }
        if (dom.confirmDeleteBackdrop && dom.confirmDeleteBackdrop.classList.contains('is-open')) {
          closeConfirmDelete();
        }
      }
    });

    // 10.3. Validation Realtime khi gõ & blur
    if (dom.taskTitle) {
      dom.taskTitle.addEventListener('input', () => {
        updateCharCounters();
        validateTitle();
      });
      dom.taskTitle.addEventListener('blur', validateTitle);
    }

    if (dom.taskDesc) {
      dom.taskDesc.addEventListener('input', () => {
        updateCharCounters();
        validateDescription();
      });
      dom.taskDesc.addEventListener('blur', validateDescription);
    }

    if (dom.taskDeadline) {
      dom.taskDeadline.addEventListener('change', validateDeadline);
      dom.taskDeadline.addEventListener('blur', validateDeadline);
    }

    if (dom.taskPriority) {
      dom.taskPriority.addEventListener('change', validatePriority);
    }

    if (dom.taskStatus) {
      dom.taskStatus.addEventListener('change', validateStatus);
    }

    // 10.4. Submit form
    if (dom.form) {
      dom.form.addEventListener('submit', handleFormSubmit);
    }

    // 10.5. Sự kiện trên danh sách task (Event Delegation cho Sửa, Xóa, Toggle)
    const handleListAction = (e) => {
      // Toggle Done / Pending
      const toggleBtn = e.target.closest('.btn-toggle-task');
      if (toggleBtn) {
        e.preventDefault();
        const id = toggleBtn.getAttribute('data-id');
        handleToggleStatus(id);
        return;
      }

      // Sửa công việc
      const editBtn = e.target.closest('.btn-edit-task');
      if (editBtn) {
        e.preventDefault();
        const id = editBtn.getAttribute('data-id');
        openEditModal(id);
        return;
      }

      // Xóa công việc
      const deleteBtn = e.target.closest('.btn-delete-task');
      if (deleteBtn) {
        e.preventDefault();
        const id = deleteBtn.getAttribute('data-id');
        const name = deleteBtn.getAttribute('data-name');
        openConfirmDelete(id, name);
        return;
      }
    };

    if (dom.cardsContainer) {
      dom.cardsContainer.addEventListener('click', handleListAction);
    }
    if (dom.tableBody) {
      dom.tableBody.addEventListener('click', handleListAction);
    }

    // 10.6. Modal xác nhận xóa
    if (dom.btnCancelDelete) {
      dom.btnCancelDelete.addEventListener('click', closeConfirmDelete);
    }
    if (dom.confirmDeleteBackdrop) {
      dom.confirmDeleteBackdrop.addEventListener('click', (e) => {
        if (e.target === dom.confirmDeleteBackdrop) {
          closeConfirmDelete();
        }
      });
    }
    if (dom.btnConfirmDelete) {
      dom.btnConfirmDelete.addEventListener('click', () => {
        const idToDelete = dom.confirmDeleteHiddenId ? dom.confirmDeleteHiddenId.value : '';
        if (idToDelete) {
          executeDelete(idToDelete);
        }
      });
    }

    // 10.7. Chuyển đổi chế độ xem (Card View / Table View)
    if (dom.viewCardBtn) {
      dom.viewCardBtn.addEventListener('click', () => {
        currentViewMode = 'card';
        dom.viewCardBtn.classList.add('active');
        if (dom.viewTableBtn) dom.viewTableBtn.classList.remove('active');
        applyFiltersAndRender();
      });
    }

    if (dom.viewTableBtn) {
      dom.viewTableBtn.addEventListener('click', () => {
        currentViewMode = 'table';
        dom.viewTableBtn.classList.add('active');
        if (dom.viewCardBtn) dom.viewCardBtn.classList.remove('active');
        applyFiltersAndRender();
      });
    }

    // 10.8. Thanh tìm kiếm, lọc & sắp xếp (Toolbar)
    if (dom.searchInput) {
      dom.searchInput.addEventListener('input', applyFiltersAndRender);
    }
    if (dom.filterStatus) {
      dom.filterStatus.addEventListener('change', applyFiltersAndRender);
    }
    if (dom.filterPriority) {
      dom.filterPriority.addEventListener('change', applyFiltersAndRender);
    }
    if (dom.sortDeadline) {
      dom.sortDeadline.addEventListener('change', applyFiltersAndRender);
    }

    // 10.9. Nút nạp lại 5 việc mẫu khi danh sách trống
    if (dom.resetDefaultsBtn) {
      dom.resetDefaultsBtn.addEventListener('click', () => {
        if (!window.TaskService) return;
        window.TaskService.resetDefaultTasks();
        if (window.showToast) window.showToast('Đã nạp lại 5 công việc mẫu ban đầu!', 'success');
        applyFiltersAndRender();
      });
    }

    // 10.10. Lắng nghe Custom Event 'tasks:changed' từ TaskService
    // Đồng bộ tức thời khi Import JSON, Clear All hoặc thay đổi dữ liệu từ nơi khác
    window.addEventListener('tasks:changed', function (event) {
      applyFiltersAndRender();
    });
  }

  /* ------------------------------------------------------------------
     11. KHỞI CHẠY KHI TẢI XONG TRANG
     ------------------------------------------------------------------ */
  document.addEventListener('DOMContentLoaded', function () {
    // Đảm bảo TaskService đã khởi tạo dữ liệu mẫu nếu là lần đầu truy cập
    if (window.TaskService && typeof window.TaskService.init === 'function') {
      window.TaskService.init();
    }

    initEventListeners();
    applyFiltersAndRender();
  });

})(window, document);
