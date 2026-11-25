/**
 * public/assets/js/api.js - Thư viện gọi API và quản lý phiên người dùng
 * Phụ trách: TV5 (Giao diện chung & Client Core)
 * 
 * HỢP ĐỒNG API CHUNG:
 * - apiFetch(path, options): Tự gắn Bearer token, gặp 401 tự chuyển về login.html, lỗi throw Error(message)
 * - getUser(): Lấy thông tin người dùng từ localStorage ('user')
 * - isAdmin(): Kiểm tra người dùng có quyền Admin hay không
 * - requireLogin(): Chặn truy cập nếu chưa đăng nhập, chuyển về login.html
 * - logout(): Gửi POST /api/auth/logout, xóa token và user, chuyển về login.html
 */

const API_BASE = ''; // Dùng đường dẫn tương đối (cùng origin)

/**
 * Lấy thông tin user hiện tại từ localStorage
 * @returns {Object|null} { id, fullName, email, role } hoặc null
 */
function getUser() {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.error('Lỗi đọc dữ liệu người dùng từ localStorage:', e);
    return null;
  }
}

/**
 * Kiểm tra xem người dùng hiện tại có phải là Admin hay không
 * @returns {boolean}
 */
function isAdmin() {
  const user = getUser();
  return Boolean(user && user.role === 'Admin');
}

/**
 * Bắt buộc người dùng phải đăng nhập mới được xem trang này
 * Nếu chưa đăng nhập, lưu lại URL hiện tại và chuyển hướng tới login.html
 */
function requireLogin() {
  const token = localStorage.getItem('token');
  if (!token) {
    // Lưu URL trước khi redirect để sau khi đăng nhập có thể quay lại
    sessionStorage.setItem('redirectAfterLogin', window.location.href);
    window.location.href = 'login.html';
    return false;
  }
  return true;
}

/**
 * Gọi API backend bằng fetch chuẩn
 * - Tự động gắn Bearer Token
 * - Tự động parse JSON
 * - Xử lý 401: Xóa phiên và đưa về login.html
 * - Ném lỗi (throw Error) nếu success === false hoặc HTTP status >= 400
 * 
 * @param {string} path - Đường dẫn endpoint (VD: '/api/tasks' hoặc '/api/tasks?page=1')
 * @param {Object} options - Các tùy chọn fetch (method, body, headers, ...)
 * @returns {Promise<any>} - Dữ liệu JSON trả về từ backend
 */
async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = path.startsWith('/') ? path : `/${path}`;

  let response;
  try {
    response = await fetch(url, {
      ...options,
      headers
    });
  } catch (networkError) {
    console.error('Lỗi kết nối mạng khi gọi API:', networkError);
    throw new Error('Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại mạng hoặc server!');
  }

  // Xử lý khi phiên làm việc hết hạn hoặc không hợp lệ (401)
  if (response.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // Chỉ chuyển hướng nếu không yêu cầu bỏ qua redirect và không phải đang ở trang login hoặc register
    const currentFile = window.location.pathname.split('/').pop();
    if (!options.skipAuthRedirect && currentFile !== 'login.html' && currentFile !== 'register.html') {
      window.location.href = 'login.html';
    }
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || 'Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.');
  }

  let data;
  try {
    data = await response.json();
  } catch (parseError) {
    throw new Error(`Máy chủ trả về phản hồi không hợp lệ (${response.status})`);
  }

  if (!response.ok || (data && data.success === false)) {
    const errorMsg = data && data.message ? data.message : `Yêu cầu thất bại với mã lỗi ${response.status}`;
    const err = new Error(errorMsg);
    if (data && data.errors) err.errors = data.errors;
    throw err;
  }

  return data;
}

/**
 * Đăng xuất tài khoản
 * Gọi POST /api/auth/logout, xóa token và user khỏi localStorage rồi về login.html
 */
async function logout() {
  try {
    await apiFetch('/api/auth/logout', { method: 'POST' });
  } catch (err) {
    console.warn('Lỗi khi gọi API đăng xuất phía server:', err.message);
  } finally {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('redirectAfterLogin');
    window.location.href = 'login.html';
  }
}
