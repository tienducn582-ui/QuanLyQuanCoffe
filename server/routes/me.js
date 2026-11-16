/**
 * server/routes/me.js - Router quản lý hồ sơ cá nhân của người dùng đang đăng nhập (/api/me)
 * Thành viên phụ trách: TV2 (Xác thực, Phân quyền & Bảo mật)
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const { query } = require('../db');
const { verifyToken } = require('../middleware/auth');
const {
  isString,
  isStrongPassword,
  sendBadRequest
} = require('../utils/validators');

const router = express.Router();

// Mọi route trong /api/me đều yêu cầu đăng nhập
router.use(verifyToken);

/**
 * GET /api/me
 * Lấy thông tin hồ sơ của người dùng hiện tại (không bao gồm PasswordHash)
 */
router.get('/', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT u.Id, u.FullName, u.Email, u.CreatedAt, r.Name AS RoleName
       FROM dbo.Users u
       INNER JOIN dbo.Roles r ON u.RoleId = r.Id
       WHERE u.Id = @id;`,
      { id: Number(req.user.id) }
    );

    const user = result.recordset && result.recordset[0];
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông tin người dùng.'
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        id: Number(user.Id),
        fullName: user.FullName,
        email: user.Email,
        role: user.RoleName,
        createdAt: user.CreatedAt
      },
      message: 'Lấy thông tin hồ sơ thành công.'
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/me
 * Cập nhật họ tên (2-100 ký tự) và tùy chọn đổi mật khẩu (cần currentPassword + newPassword mạnh)
 */
router.put('/', async (req, res, next) => {
  try {
    const { fullName, currentPassword, newPassword } = req.body || {};
    const errors = [];

    const wantsPasswordChange =
      (typeof newPassword === 'string' && newPassword.trim() !== '') ||
      (typeof currentPassword === 'string' && currentPassword.trim() !== '');

    if (fullName !== undefined || !wantsPasswordChange) {
      if (!isString(fullName, 2, 100)) {
        errors.push('Họ và tên phải có độ dài từ 2 đến 100 ký tự.');
      }
    }

    if (wantsPasswordChange) {
      if (!isString(currentPassword, 1, 100)) {
        errors.push('Vui lòng nhập mật khẩu hiện tại.');
      }
      if (!isStrongPassword(newPassword)) {
        errors.push('Mật khẩu mới tối thiểu 8 ký tự gồm chữ và số.');
      }
    }

    if (errors.length > 0) {
      return sendBadRequest(res, errors);
    }

    // Lấy thông tin người dùng hiện tại từ CSDL
    const userResult = await query(
      `SELECT u.Id, u.FullName, u.Email, u.PasswordHash, r.Name AS RoleName
       FROM dbo.Users u
       INNER JOIN dbo.Roles r ON u.RoleId = r.Id
       WHERE u.Id = @id;`,
      { id: Number(req.user.id) }
    );

    const user = userResult.recordset && userResult.recordset[0];
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông tin người dùng.'
      });
    }

    const updatedFullName = fullName !== undefined ? fullName.trim() : user.FullName;

    if (wantsPasswordChange) {
      const isCurrentValid = await bcrypt.compare(currentPassword, user.PasswordHash);
      if (!isCurrentValid) {
        return sendBadRequest(res, ['Mật khẩu hiện tại không đúng.']);
      }

      const newPasswordHash = await bcrypt.hash(newPassword, 10);
      await query(
        `UPDATE dbo.Users
         SET FullName = @fullName, PasswordHash = @passwordHash
         WHERE Id = @id;`,
        {
          id: Number(user.Id),
          fullName: updatedFullName,
          passwordHash: newPasswordHash
        }
      );
    } else {
      await query(
        `UPDATE dbo.Users
         SET FullName = @fullName
         WHERE Id = @id;`,
        {
          id: Number(user.Id),
          fullName: updatedFullName
        }
      );
    }

    return res.status(200).json({
      success: true,
      data: {
        id: Number(user.Id),
        fullName: updatedFullName,
        email: user.Email,
        role: user.RoleName
      },
      message: wantsPasswordChange
        ? 'Cập nhật hồ sơ và đổi mật khẩu thành công.'
        : 'Cập nhật hồ sơ cá nhân thành công.'
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
