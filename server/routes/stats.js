/**
 * server/routes/stats.js - Router khung cho endpoint /api/stats
 * Thành viên phụ trách sẽ cài đặt chi tiết theo phân công.
 */
const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    success: true,
    data: [],
    message: 'Khung API /api/stats hoạt động bình thường'
  });
});

module.exports = router;
