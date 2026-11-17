/**
 * server/routes/auth.js - Router xử lý Đăng ký, Đăng nhập và Đăng xuất (/api/auth)
 * Thành viên phụ trách: TV2 (Xác thực, Phân quyền & Bảo mật)
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { query } = require('../db');
const { verifyToken } = require('../middleware/auth');
const {
  isString,
  isEmail,
  isStrongPassword,
  sendBadRequest
} = require('../utils/validators');

const router = express.Router();

// Giới hạn tối đa 20 lần gọi đăng nhập trong 15 phút trên mỗi IP để chống dò mật khẩu (brute-force)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return res.status(429).json({
      success: false,
      message: 'Quá nhiều yêu cầu, vui lòng thử lại sau 15 phút.'
    });
  }
});

/**
 * POST /api/auth/register
 * Đăng ký tài khoản mới với vai trò mặc định là Staff
 */
router.post('/register', async (req, res, next) => {
  try {
    const { fullName, email, password } = req.body || {};
    const errors = [];

    if (!isString(fullName, 2, 100)) {
      errors.push('Họ và tên phải có độ dài từ 2 đến 100 ký tự.');
    }
    if (!isEmail(email)) {
      errors.push('Địa chỉ email không đúng định dạng.');
    }
    if (!isStrongPassword(password)) {
      errors.push('Mật khẩu tối thiểu 8 ký tự gồm chữ và số.');
    }

    if (errors.length > 0) {
      return sendBadRequest(res, errors);
    }

    const cleanFullName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();

    // 1. Kiểm tra email đã tồn tại hay chưa
    const existingResult = await query(
      'SELECT Id FROM dbo.Users WHERE LOWER(Email) = @email',
      { email: cleanEmail }
    );
    if (existingResult.recordset && existingResult.recordset.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Email đã tồn tại trong hệ thống.'
      });
    }

    // 2. Lấy RoleId của vai trò Staff (tự tạo nếu bảng Roles chưa có)
    let roleResult = await query(
      'SELECT Id FROM dbo.Roles WHERE Name = @roleName',
      { roleName: 'Staff' }
    );
    let staffRoleId;
    if (roleResult.recordset && roleResult.recordset.length > 0) {
      staffRoleId = roleResult.recordset[0].Id;
    } else {
      const insertRole = await query(
        'INSERT INTO dbo.Roles (Name) VALUES (@roleName); SELECT SCOPE_IDENTITY() AS Id;',
        { roleName: 'Staff' }
      );
      staffRoleId = Number(insertRole.recordset[0].Id);
    }

    // 3. Băm mật khẩu bằng bcryptjs (10 salt rounds)
    const passwordHash = await bcrypt.hash(password, 10);

    // 4. Lưu người dùng mới vào CSDL (không trả về PasswordHash)
    const insertUserResult = await query(
      `INSERT INTO dbo.Users (FullName, Email, PasswordHash, RoleId)
       OUTPUT INSERTED.Id, INSERTED.FullName, INSERTED.Email, INSERTED.CreatedAt
       VALUES (@fullName, @email, @passwordHash, @roleId);`,
      {
        fullName: cleanFullName,
        email: cleanEmail,
        passwordHash,
        roleId: staffRoleId
      }
    );

    const createdUser = insertUserResult.recordset[0];

    return res.status(201).json({
      success: true,
      data: {
        id: Number(createdUser.Id),
        fullName: createdUser.FullName,
        email: createdUser.Email,
        role: 'Staff'
      },
      message: 'Đăng ký tài khoản thành công.'
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/login
 * Đăng nhập và cấp phát JWT có thời hạn 8 giờ
 */
router.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    const errors = [];

    if (!isEmail(email)) {
      errors.push('Địa chỉ email không đúng định dạng.');
    }
    if (!isString(password, 1, 100)) {
      errors.push('Vui lòng nhập mật khẩu.');
    }

    if (errors.length > 0) {
      return sendBadRequest(res, errors);
    }

    const cleanEmail = email.trim().toLowerCase();

    // Truy vấn thông tin người dùng kèm tên vai trò
    const userResult = await query(
      `SELECT u.Id, u.FullName, u.Email, u.PasswordHash, r.Name AS RoleName
       FROM dbo.Users u
       INNER JOIN dbo.Roles r ON u.RoleId = r.Id
       WHERE LOWER(u.Email) = @email;`,
      { email: cleanEmail }
    );

    const user = userResult.recordset && userResult.recordset[0];
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Email hoặc mật khẩu không đúng.'
      });
    }

    // So sánh mật khẩu với bản băm trong CSDL
    const isMatch = await bcrypt.compare(password, user.PasswordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Email hoặc mật khẩu không đúng.'
      });
    }

    const userPayload = {
      id: Number(user.Id),
      email: user.Email,
      role: user.RoleName
    };

    const secret = process.env.JWT_SECRET || 'cafe_task_manager_super_secret_jwt_key_2026_xyz';
    const token = jwt.sign(userPayload, secret, { expiresIn: '8h' });

    return res.status(200).json({
      success: true,
      data: {
        token,
        user: {
          id: Number(user.Id),
          fullName: user.FullName,
          email: user.Email,
          role: user.RoleName
        }
      },
      message: 'Đăng nhập thành công.'
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/logout
 * Đăng xuất phiên làm việc hiện tại (yêu cầu Bearer token hợp lệ)
 */
router.post('/logout', verifyToken, (req, res) => {
  return res.status(200).json({
    success: true,
    data: null,
    message: 'Đăng xuất thành công.'
  });
});

module.exports = router;
