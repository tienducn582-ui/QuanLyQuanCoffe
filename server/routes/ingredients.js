/**
 * server/routes/ingredients.js - Router khung cho chức năng Kho tối giản và cảnh báo sắp hết (/api/ingredients)
 * Thành viên phụ trách: TV4 (sẽ ghi đè file khung này)
 */

const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');

// Yêu cầu đăng nhập theo Hợp đồng mở rộng
router.use(verifyToken);

/**
 * GET /api/ingredients
 * Endpoint khung ban đầu, trả về danh sách rỗng
 */
router.get('/', (req, res) => {
  res.json({
    success: true,
    data: [],
    message: 'Khung router /api/ingredients sẵn sàng.'
  });
});

module.exports = router;
