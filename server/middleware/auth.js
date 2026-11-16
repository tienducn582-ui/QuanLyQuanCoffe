/**
 * server/middleware/auth.js - Middleware xác thực JWT và kiểm tra phân quyền người dùng
 */

const jwt = require('jsonwebtoken');

/**
 * Middleware kiểm tra JWT từ header Authorization: Bearer <JWT>
 */
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Vui lòng đăng nhập để tiếp tục (thiếu hoặc sai định dạng token).'
    });
  }

  const token = authHeader.split(' ')[1];
  const secret = process.env.JWT_SECRET || 'cafe_task_manager_super_secret_jwt_key_2026_xyz';

  try {
    const decoded = jwt.verify(token, secret);
    // Gắn thông tin người dùng vào request: { id, email, role }
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role
    };
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Phiên đăng nhập đã hết hạn hoặc token không hợp lệ. Vui lòng đăng nhập lại.'
    });
  }
}

/**
 * Middleware kiểm tra vai trò người dùng (Admin, Staff, ...)
 * @param  {...string} roles - Danh sách vai trò được phép truy cập
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Chưa xác thực người dùng.'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền thực hiện thao tác này.'
      });
    }

    next();
  };
}

module.exports = {
  verifyToken,
  requireRole
};
