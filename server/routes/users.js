/**
 * server/routes/users.js - Router lấy danh sách người dùng phục vụ phân công công việc (/api/users)
 * Thành viên phụ trách: TV2 (Xác thực, Phân quyền & Bảo mật)
 */

const express = require('express');
const { query } = require('../db');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/users
 * Yêu cầu đã đăng nhập; chỉ trả về id, fullName, role (không trả email hay PasswordHash)
 */
router.get('/', verifyToken, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT u.Id, u.FullName, r.Name AS RoleName
       FROM dbo.Users u
       INNER JOIN dbo.Roles r ON u.RoleId = r.Id
       ORDER BY u.Id ASC;`
    );

    const users = (result.recordset || []).map((row) => ({
      id: Number(row.Id),
      fullName: row.FullName,
      role: row.RoleName
    }));

    return res.status(200).json({
      success: true,
      data: users,
      message: 'Lấy danh sách người dùng thành công.'
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
