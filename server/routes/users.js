/**
 * server/routes/users.js - Router khung cho endpoint /api/users
 * Thành viên phụ trách sẽ cài đặt chi tiết theo phân công.
 */
const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    success: true,
    data: [],
    message: 'Khung API /api/users hoạt động bình thường'
  });
});

module.exports = router;
