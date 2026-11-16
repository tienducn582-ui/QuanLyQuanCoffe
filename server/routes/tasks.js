/**
 * server/routes/tasks.js - Router khung cho endpoint /api/tasks
 * Thành viên phụ trách sẽ cài đặt chi tiết theo phân công.
 */
const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    success: true,
    data: [],
    message: 'Khung API /api/tasks hoạt động bình thường'
  });
});

module.exports = router;
