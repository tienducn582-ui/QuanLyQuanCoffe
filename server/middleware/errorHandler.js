/**
 * server/middleware/errorHandler.js - Middleware bắt lỗi tập trung và xử lý 404
 */

/**
 * Bắt các route không tồn tại (404)
 */
function notFound(req, res, next) {
  res.status(404).json({
    success: false,
    message: `Đường dẫn ${req.originalUrl} không tồn tại trên hệ thống.`
  });
}

/**
 * Xử lý lỗi tập trung toàn hệ thống (500 hoặc lỗi tùy biến)
 * Tuyệt đối không để lộ mật khẩu, chuỗi kết nối hay stack trace cho client.
 */
function errorHandler(err, req, res, next) {
  console.error('[LỖI HỆ THỐNG]:', err);

  const statusCode = err.status || err.statusCode || 500;
  let message = err.message || 'Lỗi hệ thống';

  // Nếu là lỗi SQL Server hoặc lỗi chưa được xử lý, ẩn thông tin nhạy cảm
  if (err.name === 'MSSQLError' || statusCode === 500) {
    message = 'Đã xảy ra lỗi trong quá trình xử lý hệ thống. Vui lòng thử lại sau.';
  }

  res.status(statusCode).json({
    success: false,
    message: message,
    ...(err.errors ? { errors: err.errors } : {})
  });
}

module.exports = {
  notFound,
  errorHandler
};
