/**
 * routes/categories.js - Quản lý danh mục công việc
 * Endpoint: GET /api/categories
 */

const express = require('express');
const router = express.Router();
const { query } = require('../db');
const { verifyToken } = require('../middleware/auth');

/**
 * GET /api/categories - Lấy danh sách toàn bộ danh mục công việc
 * Quyền: Mọi tài khoản đã đăng nhập (Admin & Staff)
 */
router.get('/', verifyToken, async (req, res, next) => {
  try {
    const sql = `
      SELECT Id, Name
      FROM Categories
      ORDER BY Id ASC
    `;
    const result = await query(sql);

    const categories = result.recordset.map(row => ({
      id: row.Id,
      name: row.Name
    }));

    res.json({
      success: true,
      data: categories,
      message: 'Lấy danh sách danh mục thành công'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
