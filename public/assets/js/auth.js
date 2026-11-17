/**
 * public/assets/js/auth.js - Xử lý giao diện Đăng nhập, Đăng ký và Hồ sơ cá nhân
 * Thành viên phụ trách: TV2 (Xác thực, Phân quyền & Bảo mật)
 *
 * Khớp hợp đồng với:
 * - public/login.html (#loginForm, #email, #password, #btnLogin, #formError)
 * - public/register.html (#registerForm, #fullName, #email, #password, #confirmPassword, #btnRegister, #formError)
 * - public/profile.html (#profileForm, #email, #role, #fullName, #currentPassword, #newPassword, #btnSaveProfile, #formError)
 * - public/assets/js/api.js (apiFetch, getUser, requireLogin, logout)
 * - public/assets/js/ui.js (validateField, showToast, renderNavbar, showLoading, hideLoading)
 */

(function () {
  'use strict';

  const PASSWORD_RULE_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,100}$/;

  /**
   * Hiển thị thông báo lỗi chung của biểu mẫu tại #formError
   * @param {string} message
   */
  function showFormError(message) {
    const formError = document.getElementById('formError');
    if (!formError) return;
    formError.textContent = message || 'Đã xảy ra lỗi. Vui lòng kiểm tra lại.';
    formError.style.display = 'block';
  }

  /**
   * Ẩn thông báo lỗi chung tại #formError
   */
  function clearFormError() {
    const formError = document.getElementById('formError');
    if (!formError) return;
    formError.textContent = '';
    formError.style.display = 'none';
  }

  /**
   * Hàm hỗ trợ validateField dự phòng nếu ui.js chưa nạp
   */
  function checkField(inputEl, rules) {
    if (typeof validateField === 'function') {
      return validateField(inputEl, rules);
    }
    if (!inputEl) return true;
    const val = (inputEl.value || '').trim();
    if (rules.required && !val) return false;
    return true;
  }

  /* ==================================================================
   * 1. TRANG ĐĂNG NHẬP (login.html)
   * ================================================================== */
  function initLoginPage() {
    const loginForm = document.getElementById('loginForm');
    if (!loginForm) return;

    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const btnLogin = document.getElementById('btnLogin');

    const validateEmailInput = () =>
      checkField(emailInput, {
        required: true,
        email: true,
        maxLength: 100,
        label: 'Địa chỉ email'
      });

    const validatePasswordInput = () =>
      checkField(passwordInput, {
        required: true,
        maxLength: 100,
        label: 'Mật khẩu'
      });

    if (emailInput) {
      emailInput.addEventListener('blur', validateEmailInput);
      emailInput.addEventListener('input', () => {
        clearFormError();
        if (emailInput.classList.contains('is-invalid')) validateEmailInput();
      });
    }

    if (passwordInput) {
      passwordInput.addEventListener('blur', validatePasswordInput);
      passwordInput.addEventListener('input', () => {
        clearFormError();
        if (passwordInput.classList.contains('is-invalid')) validatePasswordInput();
      });
    }

    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearFormError();

      const okEmail = validateEmailInput();
      const okPass = validatePasswordInput();
      if (!okEmail || !okPass) {
        return;
      }

      if (typeof showLoading === 'function' && btnLogin) showLoading(btnLogin);

      try {
        const res = await apiFetch('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({
            email: emailInput.value.trim(),
            password: passwordInput.value
          })
        });

        if (res && res.data && res.data.token) {
          localStorage.setItem('token', res.data.token);
          localStorage.setItem('user', JSON.stringify(res.data.user || {}));
        }

        if (typeof showToast === 'function') {
          showToast(res.message || 'Đăng nhập thành công!', 'success');
        }

        sessionStorage.removeItem('redirectAfterLogin');
        window.location.href = 'tasks.html';
      } catch (err) {
        showFormError(err.message || 'Email hoặc mật khẩu không đúng.');
      } finally {
        if (typeof hideLoading === 'function' && btnLogin) hideLoading(btnLogin);
      }
    });
  }

  /* ==================================================================
   * 2. TRANG ĐĂNG KÝ (register.html)
   * ================================================================== */
  function initRegisterPage() {
    const registerForm = document.getElementById('registerForm');
    if (!registerForm) return;

    const fullNameInput = document.getElementById('fullName');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const btnRegister = document.getElementById('btnRegister');

    const validateFullNameInput = () =>
      checkField(fullNameInput, {
        required: true,
        minLength: 2,
        maxLength: 100,
        label: 'Họ và tên'
      });

    const validateEmailInput = () =>
      checkField(emailInput, {
        required: true,
        email: true,
        maxLength: 100,
        label: 'Địa chỉ email'
      });

    const validatePasswordInput = () =>
      checkField(passwordInput, {
        required: true,
        minLength: 8,
        maxLength: 100,
        pattern: PASSWORD_RULE_REGEX,
        patternMessage: 'Mật khẩu tối thiểu 8 ký tự gồm chữ và số.',
        label: 'Mật khẩu'
      });

    const validateConfirmPasswordInput = () =>
      checkField(confirmPasswordInput, {
        required: true,
        label: 'Xác nhận mật khẩu',
        custom: (val) => {
          if (!passwordInput) return true;
          return val === passwordInput.value || 'Mật khẩu xác nhận không khớp.';
        }
      });

    [
      [fullNameInput, validateFullNameInput],
      [emailInput, validateEmailInput],
      [passwordInput, validatePasswordInput],
      [confirmPasswordInput, validateConfirmPasswordInput]
    ].forEach(([inputEl, validatorFn]) => {
      if (!inputEl) return;
      inputEl.addEventListener('blur', validatorFn);
      inputEl.addEventListener('input', () => {
        clearFormError();
        if (inputEl.classList.contains('is-invalid')) validatorFn();
      });
    });

    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearFormError();

      const okName = validateFullNameInput();
      const okEmail = validateEmailInput();
      const okPass = validatePasswordInput();
      const okConfirm = validateConfirmPasswordInput();

      if (!okName || !okEmail || !okPass || !okConfirm) {
        return;
      }

      if (typeof showLoading === 'function' && btnRegister) showLoading(btnRegister);

      try {
        const res = await apiFetch('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            fullName: fullNameInput.value.trim(),
            email: emailInput.value.trim(),
            password: passwordInput.value
          })
        });

        if (typeof showToast === 'function') {
          showToast(res.message || 'Đăng ký tài khoản thành công!', 'success');
        }

        setTimeout(() => {
          window.location.href = 'login.html';
        }, 500);
      } catch (err) {
        showFormError(err.message || 'Không thể đăng ký tài khoản. Vui lòng thử lại.');
      } finally {
        if (typeof hideLoading === 'function' && btnRegister) hideLoading(btnRegister);
      }
    });
  }

  /* ==================================================================
   * 3. TRANG HỒ SƠ CÁ NHÂN (profile.html)
   * ================================================================== */
  async function initProfilePage() {
    const profileForm = document.getElementById('profileForm');
    if (!profileForm) return;

    if (typeof requireLogin === 'function') {
      const loggedIn = requireLogin();
      if (!loggedIn) return;
    }

    const emailInput = document.getElementById('email');
    const roleInput = document.getElementById('role');
    const fullNameInput = document.getElementById('fullName');
    const currentPasswordInput = document.getElementById('currentPassword');
    const newPasswordInput = document.getElementById('newPassword');
    const btnSaveProfile = document.getElementById('btnSaveProfile');

    // Điền trước dữ liệu từ localStorage nếu có
    const cachedUser = typeof getUser === 'function' ? getUser() : null;
    if (cachedUser) {
      if (emailInput) emailInput.value = cachedUser.email || '';
      if (roleInput) roleInput.value = cachedUser.role || '';
      if (fullNameInput) fullNameInput.value = cachedUser.fullName || '';
    }

    // Gọi GET /api/me để lấy thông tin mới nhất từ CSDL
    try {
      const meRes = await apiFetch('/api/me');
      if (meRes && meRes.data) {
        const me = meRes.data;
        if (emailInput) emailInput.value = me.email || '';
        if (roleInput) roleInput.value = me.role || '';
        if (fullNameInput) fullNameInput.value = me.fullName || '';
        localStorage.setItem(
          'user',
          JSON.stringify({
            id: me.id,
            fullName: me.fullName,
            email: me.email,
            role: me.role
          })
        );
        if (typeof renderNavbar === 'function') {
          renderNavbar();
        }
      }
    } catch (err) {
      showFormError(err.message || 'Không thể tải thông tin hồ sơ cá nhân.');
    }

    const validateFullNameInput = () =>
      checkField(fullNameInput, {
        required: true,
        minLength: 2,
        maxLength: 100,
        label: 'Họ và tên'
      });

    const validatePasswordChange = () => {
      const curVal = currentPasswordInput ? currentPasswordInput.value.trim() : '';
      const newVal = newPasswordInput ? newPasswordInput.value.trim() : '';

      // Nếu cả 2 ô mật khẩu đều để trống thì không đổi mật khẩu -> hợp lệ
      if (!curVal && !newVal) {
        checkField(currentPasswordInput, { required: false });
        checkField(newPasswordInput, { required: false });
        return true;
      }

      const okCur = checkField(currentPasswordInput, {
        required: true,
        label: 'Mật khẩu hiện tại'
      });

      const okNew = checkField(newPasswordInput, {
        required: true,
        minLength: 8,
        maxLength: 100,
        pattern: PASSWORD_RULE_REGEX,
        patternMessage: 'Mật khẩu mới tối thiểu 8 ký tự gồm chữ và số.',
        label: 'Mật khẩu mới'
      });

      return okCur && okNew;
    };

    if (fullNameInput) {
      fullNameInput.addEventListener('blur', validateFullNameInput);
      fullNameInput.addEventListener('input', () => {
        clearFormError();
        if (fullNameInput.classList.contains('is-invalid')) validateFullNameInput();
      });
    }

    [currentPasswordInput, newPasswordInput].forEach((el) => {
      if (!el) return;
      el.addEventListener('input', () => {
        clearFormError();
        if (el.classList.contains('is-invalid')) validatePasswordChange();
      });
    });

    profileForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearFormError();

      const okName = validateFullNameInput();
      const okPass = validatePasswordChange();
      if (!okName || !okPass) {
        return;
      }

      const payload = {
        fullName: fullNameInput.value.trim()
      };

      const curVal = currentPasswordInput ? currentPasswordInput.value : '';
      const newVal = newPasswordInput ? newPasswordInput.value : '';
      if (curVal.trim() !== '' || newVal.trim() !== '') {
        payload.currentPassword = curVal;
        payload.newPassword = newVal;
      }

      if (typeof showLoading === 'function' && btnSaveProfile) showLoading(btnSaveProfile);

      try {
        const updateRes = await apiFetch('/api/me', {
          method: 'PUT',
          body: JSON.stringify(payload)
        });

        if (updateRes && updateRes.data) {
          const updatedUser = updateRes.data;
          localStorage.setItem(
            'user',
            JSON.stringify({
              id: updatedUser.id,
              fullName: updatedUser.fullName,
              email: updatedUser.email,
              role: updatedUser.role
            })
          );
          if (fullNameInput) fullNameInput.value = updatedUser.fullName || '';
          if (typeof renderNavbar === 'function') {
            renderNavbar();
          }
        }

        if (currentPasswordInput) currentPasswordInput.value = '';
        if (newPasswordInput) newPasswordInput.value = '';

        if (typeof showToast === 'function') {
          showToast(updateRes.message || 'Cập nhật hồ sơ cá nhân thành công!', 'success');
        }
      } catch (err) {
        showFormError(err.message || 'Cập nhật hồ sơ thất bại.');
      } finally {
        if (typeof hideLoading === 'function' && btnSaveProfile) hideLoading(btnSaveProfile);
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initLoginPage();
    initRegisterPage();
    initProfilePage();
  });
})();
