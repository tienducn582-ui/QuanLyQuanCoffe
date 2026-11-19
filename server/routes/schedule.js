/**
 * server/routes/schedule.js - Router khung cho chức năng Lịch phân ca tuần (/api/schedule)
 * Thành viên phụ trách: TV1 (sẽ ghi đè file khung này)
 */

const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');

// Yêu cầu đăng nhập theo Hợp đồng mở rộng
router.use(verifyToken);

/**
 * GET /api/schedule
 * Endpoint khung ban đầu, trả về danh sách rỗng
 */
router.get('/', (req, res) => {
  res.json({
    success: true,
    data: [],
    message: 'Khung router /api/schedule sẵn sàng.'
  });
});

module.exports = router;
