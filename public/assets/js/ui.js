/**
 * public/assets/js/ui.js - Thư viện giao diện dùng chung cho hệ thống Cafe Task Manager
 * Phụ trách: TV5 (Giao diện chung & Client Core)
 * 
 * HỢP ĐỒNG CÁC HÀM UI DÙNG CHUNG:
 * - showToast(message, type)
 * - renderNavbar()
 * - renderPagination(containerEl, pagination, onPageChange)
 * - showEmpty(containerEl, text)
 * - escapeHtml(str)
 * - showLoading(el)
 * - hideLoading(el)
 * - validateField(inputEl, rules)
 */

/**
 * Thoát ký tự đặc biệt chống tấn công Cross-Site Scripting (XSS)
 * @param {string|any} str 
 * @returns {string}
 */
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Hiển thị thông báo nhanh (Toast) ở góc màn hình
 * @param {string} message - Nội dung thông báo
 * @param {'success'|'danger'|'warning'|'info'} [type='success'] - Loại thông báo
 */
function showToast(message, type = 'success') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
    container.style.zIndex = '9999';
    document.body.appendChild(container);
  }

  // Chuyển loại Bootstrap sang màu sắc & icon phù hợp
  let bgClass = 'bg-success text-white';
  let icon = 'bi-check-circle-fill';
  if (type === 'danger' || type === 'error') {
    bgClass = 'bg-danger text-white';
    icon = 'bi-exclamation-triangle-fill';
  } else if (type === 'warning') {
    bgClass = 'bg-warning text-dark';
    icon = 'bi-exclamation-circle-fill';
  } else if (type === 'info') {
    bgClass = 'bg-info text-dark';
    icon = 'bi-info-circle-fill';
  }

  const toastId = 'toast_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
  const toastHtml = `
    <div id="${toastId}" class="toast align-items-center ${bgClass} border-0 shadow-lg" role="alert" aria-live="assertive" aria-atomic="true">
      <div class="d-flex">
        <div class="toast-body d-flex align-items-center gap-2">
          <span>${escapeHtml(message)}</span>
        </div>
        <button type="button" class="btn-close ${type === 'warning' || type === 'info' ? '' : 'btn-close-white'} me-2 m-auto" data-bs-dismiss="toast" aria-label="Đóng"></button>
      </div>
    </div>
  `;

  container.insertAdjacentHTML('beforeend', toastHtml);
  const toastEl = document.getElementById(toastId);

  // Khởi tạo Bootstrap Toast nếu có bootstrap bundle, ngược lại fallback CSS
  if (window.bootstrap && window.bootstrap.Toast) {
    const bsToast = new window.bootstrap.Toast(toastEl, { delay: 3500 });
    bsToast.show();
    toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove());
  } else {
    toastEl.classList.add('show');
    setTimeout(() => {
      toastEl.classList.remove('show');
      setTimeout(() => toastEl.remove(), 400);
    }, 3500);
  }
}

/**
 * Hiển thị khối trạng thái dữ liệu rỗng (Empty State)
 * @param {HTMLElement|string} containerEl - Phần tử chứa
 * @param {string} text - Thông báo hiển thị
 */
function showEmpty(containerEl, text = 'Không có dữ liệu hiển thị.') {
  const el = typeof containerEl === 'string' ? document.querySelector(containerEl) : containerEl;
  if (!el) return;

  el.innerHTML = `
    <div class="empty-state text-center py-5 px-3">
      <div class="empty-icon mb-3" style="font-size: 3rem; opacity: 0.6;">☕</div>
      <h6 class="empty-text text-secondary mb-2">${escapeHtml(text)}</h6>
      <p class="text-muted small">Hãy thêm mới hoặc thay đổi bộ lọc tìm kiếm của bạn.</p>
    </div>
  `;
}

/**
 * Hiển thị trạng thái đang tải (Loading Spinner)
 * @param {HTMLElement|string} el
 */
function showLoading(el) {
  const target = typeof el === 'string' ? document.querySelector(el) : el;
  if (!target) return;

  target.setAttribute('data-original-content', target.innerHTML);
  if (target.tagName === 'BUTTON' || target.tagName === 'A') {
    target.disabled = true;
    target.classList.add('disabled');
    target.innerHTML = `
      <span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
      <span>Đang tải...</span>
    `;
  } else {
    target.innerHTML = `
      <div class="text-center py-5">
        <div class="spinner-border text-primary" role="status" style="color: var(--accent) !important;">
          <span class="visually-hidden">Đang tải...</span>
        </div>
        <p class="mt-2 text-muted small">Đang xử lý dữ liệu...</p>
      </div>
    `;
  }
}

/**
 * Ẩn trạng thái đang tải và khôi phục nội dung cũ
 * @param {HTMLElement|string} el
 */
function hideLoading(el) {
  const target = typeof el === 'string' ? document.querySelector(el) : el;
  if (!target) return;

  const original = target.getAttribute('data-original-content');
  if (original !== null) {
    target.innerHTML = original;
    target.removeAttribute('data-original-content');
  }
  if (target.tagName === 'BUTTON' || target.tagName === 'A') {
    target.disabled = false;
    target.classList.remove('disabled');
  }
}

/**
 * Vẽ thanh phân trang Bootstrap
 * @param {HTMLElement|string} containerEl - Phần tử chứa thanh phân trang
 * @param {Object} pagination - { page, pageSize, total, totalPages }
 * @param {Function} onPageChange - Callback hàm khi bấm trang: onPageChange(pageNumber)
 */
function renderPagination(containerEl, pagination, onPageChange) {
  const container = typeof containerEl === 'string' ? document.querySelector(containerEl) : containerEl;
  if (!container) return;

  if (!pagination || pagination.totalPages <= 1) {
    container.innerHTML = '';
    return;
  }

  const { page, totalPages, total, pageSize } = pagination;
  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);

  let pagesHtml = '';

  // Nút Previous
  const prevDisabled = page <= 1 ? 'disabled' : '';
  pagesHtml += `
    <li class="page-item ${prevDisabled}">
      <button class="page-link" data-page="${page - 1}" aria-label="Trang trước" ${prevDisabled ? 'tabindex="-1"' : ''}>
        &laquo;
      </button>
    </li>
  `;

  // Giới hạn số lượng nút trang hiển thị (tối đa 5 nút xung quanh trang hiện tại)
  let startPage = Math.max(1, page - 2);
  let endPage = Math.min(totalPages, page + 2);

  if (startPage > 1) {
    pagesHtml += `<li class="page-item"><button class="page-link" data-page="1">1</button></li>`;
    if (startPage > 2) {
      pagesHtml += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
    }
  }

  for (let i = startPage; i <= endPage; i++) {
    const active = i === page ? 'active' : '';
    pagesHtml += `
      <li class="page-item ${active}">
        <button class="page-link" data-page="${i}">${i}</button>
      </li>
    `;
  }

  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      pagesHtml += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
    }
    pagesHtml += `<li class="page-item"><button class="page-link" data-page="${totalPages}">${totalPages}</button></li>`;
  }

  // Nút Next
  const nextDisabled = page >= totalPages ? 'disabled' : '';
  pagesHtml += `
    <li class="page-item ${nextDisabled}">
      <button class="page-link" data-page="${page + 1}" aria-label="Trang sau" ${nextDisabled ? 'tabindex="-1"' : ''}>
        &raquo;
      </button>
    </li>
  `;

  container.innerHTML = `
    <div class="d-flex flex-column flex-md-row justify-content-between align-items-center gap-2 mt-3 pt-2 border-top">
      <div class="text-muted small">
        Hiển thị <strong>${total > 0 ? startItem : 0} - ${endItem}</strong> trên tổng số <strong>${total}</strong> mục
      </div>
      <nav aria-label="Phân trang danh sách">
        <ul class="pagination pagination-sm mb-0">
          ${pagesHtml}
        </ul>
      </nav>
    </div>
  `;

  // Gắn sự kiện click vào các nút phân trang
  container.querySelectorAll('button.page-link').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const p = parseInt(btn.getAttribute('data-page'), 10);
      if (p && p !== page && p >= 1 && p <= totalPages && typeof onPageChange === 'function') {
        onPageChange(p);
      }
    });
  });
}

/**
 * Kiểm tra tính hợp lệ của 1 trường nhập liệu (Client-side validation)
 * @param {HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement} inputEl - Ô nhập liệu
 * @param {Object} rules - { required, minLength, maxLength, pattern, email, custom, label }
 * @returns {boolean} - true nếu hợp lệ, false nếu lỗi
 */
function validateField(inputEl, rules = {}) {
  if (!inputEl) return true;

  const value = (inputEl.value || '').trim();
  const label = rules.label || inputEl.getAttribute('placeholder') || 'Trường này';

  let errorMessage = '';

  if (rules.required && !value) {
    errorMessage = `${label} không được để trống.`;
  } else if (rules.minLength && value.length < rules.minLength) {
    errorMessage = `${label} phải có ít nhất ${rules.minLength} ký tự.`;
  } else if (rules.maxLength && value.length > rules.maxLength) {
    errorMessage = `${label} không được vượt quá ${rules.maxLength} ký tự.`;
  } else if (rules.email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (value && !emailRegex.test(value)) {
      errorMessage = 'Địa chỉ email không đúng định dạng.';
    }
  } else if (rules.pattern && value) {
    if (!rules.pattern.test(value)) {
      errorMessage = rules.patternMessage || `${label} không đúng định dạng quy định.`;
    }
  } else if (typeof rules.custom === 'function') {
    const customResult = rules.custom(value);
    if (customResult !== true) {
      errorMessage = customResult || `${label} không hợp lệ.`;
    }
  }

  // Tìm hoặc tạo thẻ hiển thị lỗi invalid-feedback
  let feedbackEl = inputEl.parentElement.querySelector('.invalid-feedback');
  if (!feedbackEl) {
    feedbackEl = document.createElement('div');
    feedbackEl.className = 'invalid-feedback';
    inputEl.parentElement.appendChild(feedbackEl);
  }

  if (errorMessage) {
    inputEl.classList.add('is-invalid');
    inputEl.classList.remove('is-valid');
    feedbackEl.textContent = errorMessage;
    feedbackEl.style.display = 'block';
    return false;
  } else {
    inputEl.classList.remove('is-invalid');
    inputEl.classList.add('is-valid');
    feedbackEl.textContent = '';
    feedbackEl.style.display = 'none';
    return true;
  }
}

/**
 * Tạo thanh điều hướng Navbar chung cho toàn bộ các trang
 * - Đổi trạng thái hiển thị tùy theo người dùng đã đăng nhập hay chưa
 * - Tự động active menu tương ứng với trang đang mở
 */
function renderNavbar() {
  const navContainer = document.getElementById('navbar') || document.querySelector('header nav');
  if (!navContainer) return;

  const user = typeof getUser === 'function' ? getUser() : null;
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';

  const isCurrent = (page) => (currentPath === page ? 'active' : '');

  let navItemsHtml = '';

  if (!user) {
    // Menu cho khách chưa đăng nhập
    navItemsHtml = `
      <ul class="navbar-nav me-auto mb-2 mb-lg-0">
        <li class="nav-item">
          <a class="nav-link ${isCurrent('index.html')}" href="index.html">Trang chủ</a>
        </li>
      </ul>
      <div class="d-flex align-items-center gap-2">
        <button id="themeToggleBtn" class="btn btn-outline-secondary btn-sm" title="Chuyển chế độ Sáng/Tối" type="button">
          <span class="theme-icon">🌙</span>
        </button>
        <a href="login.html" class="btn btn-outline-primary btn-sm ${isCurrent('login.html')}">Đăng nhập</a>
        <a href="register.html" class="btn btn-primary btn-sm ${isCurrent('register.html')}" style="background-color: var(--accent); border-color: var(--accent);">Đăng ký</a>
      </div>
    `;
  } else {
    // Menu cho người dùng đã đăng nhập
    const roleBadge = user.role === 'Admin'
      ? '<span class="badge bg-danger ms-1">Admin</span>'
      : '<span class="badge bg-secondary ms-1">Staff</span>';

    navItemsHtml = `
      <ul class="navbar-nav me-auto mb-2 mb-lg-0">
        <li class="nav-item">
          <a class="nav-link ${isCurrent('index.html')}" href="index.html">Trang chủ</a>
        </li>
        <li class="nav-item">
          <a class="nav-link ${isCurrent('tasks.html')}" href="tasks.html">Công việc</a>
        </li>
        <li class="nav-item">
          <a class="nav-link ${isCurrent('shifts.html')}" href="shifts.html">Ca làm</a>
        </li>
        <li class="nav-item">
          <a class="nav-link ${isCurrent('statistics.html')}" href="statistics.html">Thống kê</a>
        </li>
      </ul>
      <div class="d-flex align-items-center gap-3">
        <button id="themeToggleBtn" class="btn btn-outline-secondary btn-sm" title="Chuyển chế độ Sáng/Tối" type="button">
          <span class="theme-icon">🌙</span>
        </button>
        <div class="dropdown">
          <a href="#" class="d-flex align-items-center text-decoration-none dropdown-toggle text-dark" id="userMenuDropdown" data-bs-toggle="dropdown" aria-expanded="false">
            <span class="avatar-circle me-2 bg-primary text-white rounded-circle d-inline-flex justify-content-center align-items-center" style="width: 32px; height: 32px; background-color: var(--primary) !important;">
              ${escapeHtml((user.fullName || 'U').charAt(0).toUpperCase())}
            </span>
            <span class="fw-semibold me-1">${escapeHtml(user.fullName || user.email)}</span>
            ${roleBadge}
          </a>
          <ul class="dropdown-menu dropdown-menu-end shadow-sm" aria-labelledby="userMenuDropdown">
            <li><a class="dropdown-item ${isCurrent('profile.html')}" href="profile.html">👤 Hồ sơ cá nhân</a></li>
            <li><hr class="dropdown-divider"></li>
            <li><a class="dropdown-item text-danger" href="#" id="btnLogoutAction">🚪 Đăng xuất</a></li>
          </ul>
        </div>
      </div>
    `;
  }

  navContainer.className = 'navbar navbar-expand-lg navbar-light bg-surface shadow-sm sticky-top';
  navContainer.innerHTML = `
    <div class="container">
      <a class="navbar-brand d-flex align-items-center gap-2 fw-bold" href="index.html" style="color: var(--primary);">
        <span style="font-size: 1.4rem;">☕</span>
        <span>Cafe Task Manager</span>
      </a>
      <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#mainNavbarNav" aria-controls="mainNavbarNav" aria-expanded="false" aria-label="Toggle navigation">
        <span class="navbar-toggler-icon"></span>
      </button>
      <div class="collapse navbar-collapse" id="mainNavbarNav">
        ${navItemsHtml}
      </div>
    </div>
  `;

  // Gắn sự kiện nút Đăng xuất
  const btnLogout = document.getElementById('btnLogoutAction');
  if (btnLogout) {
    btnLogout.addEventListener('click', (e) => {
      e.preventDefault();
      if (confirm('Bạn có chắc chắn muốn đăng xuất không?')) {
        if (typeof logout === 'function') {
          logout();
        } else {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = 'login.html';
        }
      }
    });
  }

  // Khởi tạo chuyển chế độ Sáng / Tối
  initThemeToggle();
}

/**
 * Xử lý chuyển đổi giao diện Sáng / Tối (Dark/Light mode)
 */
function initThemeToggle() {
  const btn = document.getElementById('themeToggleBtn');
  if (!btn) return;

  const updateIcon = () => {
    const isDark = document.documentElement.classList.contains('dark-theme') ||
                   document.documentElement.getAttribute('data-theme') === 'dark';
    const iconSpan = btn.querySelector('.theme-icon');
    if (iconSpan) {
      iconSpan.textContent = isDark ? '☀️' : '🌙';
    }
  };

  updateIcon();

  btn.addEventListener('click', () => {
    const isDark = document.documentElement.classList.contains('dark-theme') ||
                   document.documentElement.getAttribute('data-theme') === 'dark';
    if (isDark) {
      document.documentElement.classList.remove('dark-theme', 'dark-mode');
      document.documentElement.setAttribute('data-theme', 'light');
      localStorage.setItem('theme', 'light');
    } else {
      document.documentElement.classList.add('dark-theme', 'dark-mode');
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
    }
    updateIcon();
  });
}

// Tự động render Navbar khi DOM đã sẵn sàng
document.addEventListener('DOMContentLoaded', () => {
  renderNavbar();
});
