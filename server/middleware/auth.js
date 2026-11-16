/**
 * auth.js - Middleware xác thực JWT và kiểm tra quyền hạn (Role-based access control)
 */

const jwt = require('jsonwebtoken');

/**
 * Xác thực token từ header Authorization: Bearer <token>
 */
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({
      success: false,
      message: 'Vui lòng đăng nhập để thực hiện thao tác này'
    });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({
      success: false,
      message: 'Token không đúng định dạng Bearer'
    });
  }

  const token = parts[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_jwt_key_cafe_task_manager_2026');
    req.user = decoded; // { id, email, role }
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Phiên đăng nhập đã hết hạn hoặc token không hợp lệ'
    });
  }
}

/**
 * Kiểm tra vai trò của người dùng (Admin, Staff,...)
 * @param  {...string} roles - Danh sách vai trò được phép
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Chưa xác thực người dùng'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền thực hiện thao tác này'
      });
    }

    next();
  };
}

module.exports = {
  verifyToken,
  requireRole
};
