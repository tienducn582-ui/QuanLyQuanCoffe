/**
 * ====================================================================
 * DỰ ÁN: CAFE TASK MANAGER
 * MODULE THEME: QUẢN LÝ CHẾ ĐỘ SÁNG / TỐI (DARK MODE / LIGHT MODE)
 * File: assets/js/theme.js
 * ====================================================================
 */

(function () {
  'use strict';

  // Khóa lưu trữ đồng bộ trong LocalStorage
  const STORAGE_KEYS = ['theme', 'CAFE_THEME', 'cafe_theme'];

  // Lấy danh sách các nút chuyển đổi theme trên trang
  function getToggleButtons() {
    return document.querySelectorAll('#theme-toggle-btn, #theme-toggle, .theme-toggle-btn');
  }

  // Đọc theme đã lưu trong LocalStorage hoặc theo hệ điều hành
  function getSavedTheme() {
    for (const key of STORAGE_KEYS) {
      const val = localStorage.getItem(key);
      if (val === 'dark' || val === 'light') return val;
    }
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  }

  // Cập nhật biểu tượng Mặt trời / Mặt trăng trên nút bấm
  function updateButtonIcons(isDark) {
    const buttons = getToggleButtons();
    buttons.forEach(btn => {
      if (isDark) {
        btn.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="5"></circle>
            <line x1="12" y1="1" x2="12" y2="3"></line>
            <line x1="12" y1="21" x2="12" y2="23"></line>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
            <line x1="1" y1="12" x2="3" y2="12"></line>
            <line x1="21" y1="12" x2="23" y2="12"></line>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
          </svg>
        `;
        btn.setAttribute('title', 'Chuyển sang Giao diện Sáng (Light Mode)');
        btn.setAttribute('aria-label', 'Chuyển sang Giao diện Sáng');
      } else {
        btn.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
          </svg>
        `;
        btn.setAttribute('title', 'Chuyển sang Giao diện Tối (Dark Mode)');
        btn.setAttribute('aria-label', 'Chuyển sang Giao diện Tối');
      }
    });
  }

  // Áp dụng theme và đồng bộ toàn bộ trang
  function applyTheme(theme, showFeedbackToast = false) {
    const isDark = theme === 'dark';

    // 1. Áp dụng class lên body & html (hỗ trợ cả dark-theme và dark-mode)
    if (document.body) {
      document.body.classList.toggle('dark-theme', isDark);
      document.body.classList.toggle('dark-mode', isDark);
    }
    document.documentElement.classList.toggle('dark-theme', isDark);
    document.documentElement.classList.toggle('dark-mode', isDark);
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');

    // 2. Lưu lại vào LocalStorage
    try {
      STORAGE_KEYS.forEach(key => localStorage.setItem(key, isDark ? 'dark' : 'light'));
    } catch (e) {
      console.warn('[theme.js] Không thể lưu theme vào LocalStorage:', e);
    }

    // 3. Cập nhật biểu tượng nút
    updateButtonIcons(isDark);

    // 4. Phát sự kiện cho các module biểu đồ / thống kê cập nhật
    const eventDetail = { theme: isDark ? 'dark' : 'light', isDark };
    if (typeof window.dispatchEvent === 'function' && typeof CustomEvent === 'function') {
      window.dispatchEvent(new CustomEvent('themechange', { detail: eventDetail }));
    }
    if (typeof document.dispatchEvent === 'function' && typeof CustomEvent === 'function') {
      document.dispatchEvent(new CustomEvent('themechange', { detail: eventDetail }));
    }

    // 5. Hiển thị thông báo Toast duy nhất một lần
    if (showFeedbackToast && typeof window.showToast === 'function') {
      window.showToast(`Đã chuyển sang ${isDark ? 'Giao diện Tối' : 'Giao diện Sáng'}`, 'info');
    }
  }

  // Khóa chống click đúp quá nhanh
  let isToggling = false;

  // Hàm chuyển đổi theme qua lại giữa sáng và tối
  function toggleTheme() {
    if (isToggling) return;
    isToggling = true;
    setTimeout(() => { isToggling = false; }, 200);

    const isCurrentlyDark = document.body 
      ? (document.body.classList.contains('dark-theme') || document.body.classList.contains('dark-mode'))
      : (document.documentElement.getAttribute('data-theme') === 'dark');

    const nextTheme = isCurrentlyDark ? 'light' : 'dark';
    applyTheme(nextTheme, true);
  }

  // Khởi tạo ngay trạng thái từ ban đầu (chống chớp trắng màn hình)
  const initialTheme = getSavedTheme();
  if (initialTheme === 'dark') {
    if (document.body) {
      document.body.classList.add('dark-theme', 'dark-mode');
    }
    document.documentElement.classList.add('dark-theme', 'dark-mode');
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.setAttribute('data-theme', 'light');
  }

  // Gắn sự kiện click duy nhất cho các nút theme
  function bindThemeEvents() {
    const buttons = getToggleButtons();
    buttons.forEach(btn => {
      if (btn.dataset.themeBound) return;
      btn.dataset.themeBound = 'true';

      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        toggleTheme();
      });
    });

    // Đồng bộ lại biểu tượng ban đầu
    const isDark = document.body ? document.body.classList.contains('dark-theme') : (initialTheme === 'dark');
    updateButtonIcons(isDark);
  }

  // Khởi động khi tải xong DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      if (initialTheme === 'dark' && document.body) {
        document.body.classList.add('dark-theme');
      }
      bindThemeEvents();
    });
  } else {
    bindThemeEvents();
  }

  // Xuất hàm ra phạm vi toàn cục
  window.__themeHandled = true;
  window.applyTheme = applyTheme;
  window.toggleTheme = toggleTheme;
})();
