/**
 * errorHandler.js - Middleware bắt lỗi tập trung và xử lý 404
 */

/**
 * Xử lý khi truy cập đường dẫn API không tồn tại
 */
function notFound(req, res, next) {
  res.status(404).json({
    success: false,
    message: `Không tìm thấy tài nguyên: ${req.method} ${req.originalUrl}`
  });
}

/**
 * Xử lý lỗi hệ thống tập trung (không làm lộ stack trace hoặc cấu hình nhạy cảm)
 */
function errorHandler(err, req, res, next) {
  // Ghi log lỗi nội bộ ra console để debug phía server
  console.error('[SERVER ERROR]:', err);

  const statusCode = err.status || err.statusCode || 500;
  const message = statusCode === 500 ? 'Lỗi hệ thống' : (err.message || 'Lỗi không xác định');

  res.status(statusCode).json({
    success: false,
    message: message
  });
}

module.exports = {
  notFound,
  errorHandler
};
