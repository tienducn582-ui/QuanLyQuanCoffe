/**
 * ====================================================================
 * DỰ ÁN: CAFE TASK MANAGER (HỆ THỐNG QUẢN LÝ CÔNG VIỆC QUÁN CAFE)
 * LOGIC TƯƠNG TÁC GIAO DIỆN CHUNG, NAVBAR, DARK/LIGHT THEME, ACTIONS
 * File: assets/js/main.js
 * Phụ trách: Người 1 (Leader / Frontend & System Core)
 * ====================================================================
 * Mô tả:
 * - Điều khiển mở/đóng Navbar Drawer trên Mobile/Tablet.
 * - Quản lý chuyển đổi Dark Mode / Light Mode, lưu trữ LocalStorage 'cafe_theme'.
 * - Nhận diện Active Link trên thanh điều hướng cho cả 3 trang.
 * - Xử lý các sự kiện dùng chung: Clear All (có xác nhận), Export JSON, Import JSON.
 * - Hệ thống Toast Notification thông báo kết quả thân thiện.
 * ====================================================================
 */

(function (window, document) {
  'use strict';

  // Khóa lưu trữ theme theo quy ước nhóm: 'CAFE_THEME' ('light' | 'dark')
  const THEME_STORAGE_KEY = 'CAFE_THEME';
  const LEGACY_THEME_KEY = 'cafe_theme';

  /* ------------------------------------------------------------------
     1. TOAST NOTIFICATION DÙNG CHUNG
     ------------------------------------------------------------------ */
  function showToast(message, type = 'info') {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    // Icon phù hợp theo loại thông báo
    const iconMap = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ'
    };

    toast.innerHTML = `
      <span style="font-weight: 700; font-size: 1.1em;">${iconMap[type] || 'ℹ'}</span>
      <span>${message}</span>
    `;

    container.appendChild(toast);

    // Tự biến mất sau 3.5 giây
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, 3500);
  }

  // Đưa hàm showToast ra window để các trang khác tái sử dụng
  window.showToast = showToast;

  /* ------------------------------------------------------------------
     2. QUẢN LÝ DARK MODE / LIGHT MODE DÙNG CHUNG CHO CẢ 3 TRANG
     ------------------------------------------------------------------ */
  const ThemeManager = {
    init: function () {
      // theme.js đã đảm nhận quản lý Dark/Light mode tập trung cho toàn bộ trang
      if (window.__themeHandled || typeof window.applyTheme === 'function') {
        return;
      }

      const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) || localStorage.getItem(LEGACY_THEME_KEY);
      const systemPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      
      // Nếu đã lưu theme thì ưu tiên sử dụng, nếu chưa thì xem sở thích của hệ thống
      const initialTheme = savedTheme ? savedTheme : (systemPrefersDark ? 'dark' : 'light');
      this.applyTheme(initialTheme);

      // Gắn sự kiện cho các nút chuyển theme trên trang
      const toggleBtns = document.querySelectorAll('.theme-toggle-btn');
      toggleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          this.toggleTheme();
        });
      });
    },

    applyTheme: function (theme) {
      if (typeof window.applyTheme === 'function') {
        window.applyTheme(theme);
        return;
      }

      document.documentElement.setAttribute('data-theme', theme);
      try {
        localStorage.setItem(THEME_STORAGE_KEY, theme);
        localStorage.setItem(LEGACY_THEME_KEY, theme);
      } catch (e) {
        console.warn('[ThemeManager] Không thể lưu theme vào LocalStorage:', e);
      }

      // Cập nhật biểu tượng và nhãn trên nút
      const toggleBtns = document.querySelectorAll('.theme-toggle-btn');
      toggleBtns.forEach(btn => {
        if (theme === 'dark') {
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
    },

    toggleTheme: function () {
      if (typeof window.toggleTheme === 'function') {
        window.toggleTheme();
        return;
      }
      const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
      const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
      this.applyTheme(nextTheme);
      showToast(`Đã chuyển sang ${nextTheme === 'dark' ? 'Giao diện Tối' : 'Giao diện Sáng'}`, 'info');
    }
  };

  window.ThemeManager = ThemeManager;

  /* ------------------------------------------------------------------
     3. NAVBAR RESPONSIVE (DRAWER MỞ/ĐÓNG TRÊN MOBILE)
     ------------------------------------------------------------------ */
  function initNavbar() {
    const toggleBtn = document.getElementById('navbar-toggle');
    const navbarNav = document.getElementById('navbar-nav');
    const overlay = document.getElementById('navbar-overlay');
    const closeBtn = document.getElementById('mobile-nav-close');
    const navLinks = document.querySelectorAll('.nav-link');

    if (!toggleBtn || !navbarNav) return;

    function openNav() {
      navbarNav.classList.add('is-open');
      if (overlay) overlay.classList.add('is-active');
      toggleBtn.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
    }

    function closeNav() {
      navbarNav.classList.remove('is-open');
      if (overlay) overlay.classList.remove('is-active');
      toggleBtn.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    }

    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = navbarNav.classList.contains('is-open');
      if (isOpen) closeNav();
      else openNav();
    });

    if (closeBtn) closeBtn.addEventListener('click', closeNav);
    if (overlay) overlay.addEventListener('click', closeNav);

    navLinks.forEach(link => {
      link.addEventListener('click', closeNav);
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && navbarNav.classList.contains('is-open')) {
        closeNav();
      }
    });
  }

  /* ------------------------------------------------------------------
     4. TỰ ĐỘNG GẮN ACTIVE LINK THEO TRANG ĐANG MỞ
     ------------------------------------------------------------------ */
  function initActiveNavLink() {
    const currentPath = window.location.pathname.toLowerCase();
    const navLinks = document.querySelectorAll('.nav-link');

    // Lấy tên file hiện tại (ví dụ: 'index.html', 'page-2.html', 'page-3.html')
    let currentFileName = currentPath.substring(currentPath.lastIndexOf('/') + 1);
    if (!currentFileName || currentFileName === '') {
      currentFileName = 'index.html';
    }

    navLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (!href) return;

      const linkFileName = href.substring(href.lastIndexOf('/') + 1).toLowerCase();

      if (linkFileName === currentFileName) {
        link.classList.add('active');
        link.setAttribute('aria-current', 'page');
      } else {
        link.classList.remove('active');
        link.removeAttribute('aria-current');
      }
    });
  }

  /* ------------------------------------------------------------------
     5. CÁC HÀNH ĐỘNG DÙNG CHUNG: CLEAR ALL, EXPORT, IMPORT
     ------------------------------------------------------------------ */
  function initGlobalTaskActions() {
    // 5.1. CLEAR ALL
    const clearBtns = document.querySelectorAll('.btn-clear-all');
    clearBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        if (!window.TaskService) return;

        const tasks = window.TaskService.getAllTasks ? window.TaskService.getAllTasks() : window.TaskService.getTasks();
        const currentCount = tasks.length;
        if (currentCount === 0) {
          showToast('Hiện không có công việc nào để xóa!', 'warning');
          return;
        }

        const confirmed = window.confirm(
          `Bạn có chắc chắn muốn XÓA TOÀN BỘ ${currentCount} công việc trong hệ thống không?\n\nLưu ý: Thao tác này không thể hoàn tác!`
        );

        if (confirmed) {
          const success = window.TaskService.clearAll ? window.TaskService.clearAll() : window.TaskService.clearAllTasks();
          if (success) {
            showToast('Đã xóa toàn bộ công việc thành công!', 'success');
          } else {
            showToast('Lỗi khi xóa dữ liệu công việc!', 'error');
          }
        }
      });
    });

    // 5.2. EXPORT JSON
    const exportBtns = document.querySelectorAll('.btn-export-json');
    exportBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        if (!window.TaskService) return;

        const res = window.TaskService.exportJSON();
        if (res.success) {
          showToast(`Đã xuất thành công ${res.count} công việc ra tệp ${res.filename}!`, 'success');
        } else {
          showToast(`Lỗi xuất dữ liệu: ${res.error || 'Thao tác thất bại'}`, 'error');
        }
      });
    });

    // 5.3. IMPORT JSON
    const importInputs = document.querySelectorAll('.input-import-json');
    importInputs.forEach(input => {
      input.addEventListener('change', function () {
        const file = this.files[0];
        if (!file || !window.TaskService) return;

        const confirmed = window.confirm(
          `Bạn có muốn nhập dữ liệu từ tệp "${file.name}" không?\n\nDữ liệu mới sẽ được ghi đè an toàn vào danh sách hiện tại.`
        );

        if (!confirmed) {
          this.value = ''; // Reset input
          return;
        }

        window.TaskService.importJSON(file)
          .then(res => {
            showToast(`Đã nhập thành công ${res.count} công việc từ tệp JSON!`, 'success');
          })
          .catch(err => {
            showToast(err.message || 'Lỗi khi nhập tệp JSON!', 'error');
          })
          .finally(() => {
            this.value = ''; // Reset input để có thể chọn lại cùng 1 file
          });
      });
    });

    // Kích hoạt input file ẩn khi bấm nút Import giao diện
    const triggerImportBtns = document.querySelectorAll('.btn-trigger-import');
    triggerImportBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const targetInputId = btn.getAttribute('data-target-input') || 'input-import-json';
        const input = document.getElementById(targetInputId);
        if (input) {
          input.click();
        }
      });
    });
  }

  /* ------------------------------------------------------------------
     6. KHỞI CHẠY KHI TẢI XONG TRANG
     ------------------------------------------------------------------ */
  document.addEventListener('DOMContentLoaded', function () {
    ThemeManager.init();
    initNavbar();
    initActiveNavLink();
    initGlobalTaskActions();
  });

})(window, document);
