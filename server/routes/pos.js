/**
 * server/routes/pos.js - Router khung cho chức năng POS và sơ đồ bàn (/api/pos)
 * Thành viên phụ trách: TV5 (sẽ ghi đè file khung này)
 */

const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');

// Yêu cầu đăng nhập theo Hợp đồng mở rộng
router.use(verifyToken);

/**
 * GET /api/pos
 * Endpoint khung ban đầu, trả về danh sách rỗng
 */
router.get('/', (req, res) => {
  res.json({
    success: true,
    data: [],
    message: 'Khung router /api/pos sẵn sàng.'
  });
});

module.exports = router;
