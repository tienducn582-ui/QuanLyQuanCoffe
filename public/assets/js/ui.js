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
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toastId = 'toast_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
  const toastClass = type === 'danger' || type === 'error' ? 'toast-danger' :
                     type === 'warning' ? 'toast-warning' : 'toast-success';

  const toastHtml = `
    <div id="${toastId}" class="toast-custom ${toastClass}" role="alert" aria-live="assertive" aria-atomic="true">
      <span style="font-weight: 500;">${escapeHtml(message)}</span>
    </div>
  `;

  container.insertAdjacentHTML('beforeend', toastHtml);
  const toastEl = document.getElementById(toastId);

  setTimeout(() => {
    toastEl.style.opacity = '0';
    toastEl.style.transition = 'opacity 300ms ease';
    setTimeout(() => toastEl.remove(), 300);
  }, 3500);
}

/**
 * Hiển thị khối trạng thái dữ liệu rỗng (Empty State) với SVG nét mảnh
 * @param {HTMLElement|string} containerEl - Phần tử chứa
 * @param {string} text - Thông báo hiển thị
 */
function showEmpty(containerEl, text = 'Không có dữ liệu hiển thị.') {
  const el = typeof containerEl === 'string' ? document.querySelector(containerEl) : containerEl;
  if (!el) return;

  el.innerHTML = `
    <div class="empty-state">
      <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M18 8h1a4 4 0 0 1 0 8h-1"></path>
        <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path>
        <line x1="6" y1="1" x2="6" y2="4"></line>
        <line x1="10" y1="1" x2="10" y2="4"></line>
        <line x1="14" y1="1" x2="14" y2="4"></line>
      </svg>
      <h3 style="font-family: var(--font-serif);">${escapeHtml(text)}</h3>
      <p>Hãy thêm mới hoặc thay đổi bộ lọc tìm kiếm của bạn.</p>
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
    target.innerHTML = `<span>Đang tải...</span>`;
  } else {
    target.innerHTML = `
      <div class="empty-state" style="padding: var(--space-32);">
        <p style="color: var(--text-secondary);">Đang tải dữ liệu...</p>
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
 * Vẽ thanh phân trang chuẩn
 * @param {HTMLElement|string} containerEl
 * @param {Object} pagination - { page, pageSize, total, totalPages }
 * @param {Function} onPageChange
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
  for (let i = 1; i <= totalPages; i++) {
    const active = i === page ? 'btn-primary' : 'btn-outline';
    pagesHtml += `<button class="btn btn-sm ${active}" data-page="${i}" style="min-height: 32px; padding: 4px 10px;">${i}</button>`;
  }

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; padding-top: var(--space-16); margin-top: var(--space-16); border-top: 1px solid var(--border-color); flex-wrap: wrap; gap: var(--space-8);">
      <span style="font-size: var(--text-xs); color: var(--text-secondary);">
        Hiển thị <strong>${total > 0 ? startItem : 0} - ${endItem}</strong> / <strong>${total}</strong> mục
      </span>
      <div style="display: flex; gap: 4px;">
        ${pagesHtml}
      </div>
    </div>
  `;

  container.querySelectorAll('button[data-page]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const p = parseInt(btn.getAttribute('data-page'), 10);
      if (p && p !== page && typeof onPageChange === 'function') {
        onPageChange(p);
      }
    });
  });
}

/**
 * Kiểm tra tính hợp lệ của 1 trường nhập liệu (Client-side validation tiếng Việt)
 * @param {HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement} inputEl
 * @param {Object} rules
 * @returns {boolean}
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

  let feedbackEl = inputEl.parentElement.querySelector('.invalid-feedback');
  if (!feedbackEl) {
    feedbackEl = document.createElement('div');
    feedbackEl.className = 'invalid-feedback';
    inputEl.parentElement.appendChild(feedbackEl);
  }

  if (errorMessage) {
    inputEl.classList.add('is-invalid');
    feedbackEl.textContent = errorMessage;
    feedbackEl.style.display = 'block';
    return false;
  } else {
    inputEl.classList.remove('is-invalid');
    feedbackEl.textContent = '';
    feedbackEl.style.display = 'none';
    return true;
  }
}

/**
 * Tạo thanh điều hướng Navbar DUY NHẤT cho toàn bộ website
 * Bố cục:
 * - Logo ô vuông nâu chứa SVG + Tên chữ serif bên trái
 * - Menu điều hướng ở giữa/trái
 * - Nút đổi giao diện Sáng/Tối và nút tài khoản bên phải
 * - Dưới 992px thu gọn thành hamburger menu
 */
function renderNavbar() {
  const navContainer = document.getElementById('navbar') || document.querySelector('nav#navbar, header.site-navbar');
  if (!navContainer) return;

  const user = typeof getUser === 'function' ? getUser() : null;
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  const isCurrent = (page) => (currentPath === page ? 'active' : '');

  let navLinksHtml = '';
  let rightActionsDesktopHtml = '';
  let mobileExtraLinksHtml = '';

  if (!user) {
    // Menu cho khách chưa đăng nhập: CHỈ CÓ Trang chủ
    navLinksHtml = `
      <ul class="navbar-menu">
        <li><a class="nav-link ${isCurrent('index.html')}" href="index.html">Trang chủ</a></li>
      </ul>
    `;
    // Bên phải desktop: Nút Đăng nhập (viền) + Nút Đăng ký (đặc)
    rightActionsDesktopHtml = `
      <div class="navbar-auth-desktop">
        <a href="login.html" class="btn btn-outline btn-sm">Đăng nhập</a>
        <a href="register.html" class="btn btn-primary btn-sm">Đăng ký</a>
      </div>
    `;
    // Bên trong mobile menu đổ xuống
    mobileExtraLinksHtml = `
      <div class="navbar-mobile-auth-links">
        <a href="login.html" class="btn btn-outline" style="width: 100%; justify-content: center; margin-bottom: 8px;">Đăng nhập</a>
        <a href="register.html" class="btn btn-primary" style="width: 100%; justify-content: center;">Đăng ký</a>
      </div>
    `;
  } else {
    // Menu cho người dùng đã đăng nhập: Trang chủ, Công việc, Ca làm, Thống kê
    const roleBadge = user.role === 'Admin' ? 'Admin' : 'Staff';
    navLinksHtml = `
      <ul class="navbar-menu">
        <li><a class="nav-link ${isCurrent('index.html')}" href="index.html">Trang chủ</a></li>
        <li><a class="nav-link ${isCurrent('tasks.html')}" href="tasks.html">Công việc</a></li>
        <li><a class="nav-link ${isCurrent('shifts.html')}" href="shifts.html">Ca làm</a></li>
        <li><a class="nav-link ${isCurrent('statistics.html')}" href="statistics.html">Thống kê</a></li>
      </ul>
    `;
    rightActionsDesktopHtml = `
      <div class="navbar-auth-desktop" style="display: flex; align-items: center; gap: var(--space-8);">
        <a href="profile.html" class="nav-link ${isCurrent('profile.html')}" style="font-size: var(--text-sm); font-weight: 600; color: var(--text-color);">
          ${escapeHtml(user.fullName || user.email)} <span style="font-size: var(--text-xs); color: var(--accent-dark);">(${roleBadge})</span>
        </a>
        <button id="btnLogoutTop" class="btn btn-outline btn-sm" title="Đăng xuất" style="min-height: 32px; padding: 4px 10px;">
          Thoát
        </button>
      </div>
    `;
    mobileExtraLinksHtml = `
      <div class="navbar-mobile-auth-links" style="border-top: 1px solid var(--border-subtle); padding-top: var(--space-12); margin-top: var(--space-8);">
        <a href="profile.html" class="nav-link" style="font-weight: 600; display: block; margin-bottom: 8px;">
          ${escapeHtml(user.fullName || user.email)} (${roleBadge})
        </a>
        <button id="btnLogoutMobile" class="btn btn-outline" style="width: 100%; justify-content: center;">
          Đăng xuất
        </button>
      </div>
    `;
  }

  // Khung HTML chuẩn cho Navbar
  navContainer.className = 'site-navbar';
  navContainer.innerHTML = `
    <div class="navbar-container">
      <div class="navbar-brand-group">
        <a href="index.html" class="navbar-brand-logo" aria-label="Trang chủ Cafe Task Manager">
          <div class="navbar-logo-box">
            <img src="assets/img/logo.svg" alt="Logo" width="36" height="36">
          </div>
          <span class="navbar-brand-name">Cafe Task Manager</span>
        </a>
      </div>

      <div class="navbar-menu-wrapper" id="navbarMenuWrapper">
        ${navLinksHtml}
        ${mobileExtraLinksHtml}
      </div>

      <div class="navbar-actions-group">
        <button id="themeToggleBtn" class="btn-theme-toggle" type="button" aria-label="Chuyển chế độ Sáng/Tối" title="Chuyển chế độ Sáng/Tối">
          <svg class="theme-icon-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
          </svg>
        </button>
        ${rightActionsDesktopHtml}
        <button class="navbar-mobile-toggle" id="navbarMobileToggle" type="button" aria-label="Mở menu điều hướng">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
      </div>
    </div>
  `;

  // Gắn sự kiện nút Đăng xuất
  const handleLogout = (e) => {
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
  };

  const btnLogout = document.getElementById('btnLogoutTop');
  if (btnLogout) {
    btnLogout.addEventListener('click', handleLogout);
  }

  const btnLogoutMobile = document.getElementById('btnLogoutMobile');
  if (btnLogoutMobile) {
    btnLogoutMobile.addEventListener('click', handleLogout);
  }

  // Gắn sự kiện Hamburger menu di động
  const mobileToggle = document.getElementById('navbarMobileToggle');
  const menuWrapper = document.getElementById('navbarMenuWrapper');
  if (mobileToggle && menuWrapper) {
    mobileToggle.addEventListener('click', () => {
      menuWrapper.classList.toggle('is-open');
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
    btn.innerHTML = isDark
      ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`
      : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;
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
