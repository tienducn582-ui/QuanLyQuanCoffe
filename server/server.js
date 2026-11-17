/**
 * server/server.js - Điểm khởi động chính của ứng dụng Cafe Task Manager
 */

require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const { query } = require('./db');
const { notFound, errorHandler } = require('./middleware/errorHandler');

// Khởi tạo ứng dụng Express
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware cơ bản
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Phục vụ giao diện tĩnh từ thư mục public/
const publicPath = path.join(__dirname, '..', 'public');
app.use(express.static(publicPath));

// API Kiểm tra trạng thái hệ thống và kết nối CSDL
app.get('/api/health', async (req, res, next) => {
  try {
    const result = await query('SELECT 1 AS healthy');
    res.json({
      success: true,
      data: {
        database: 'Connected',
        timestamp: new Date().toISOString()
      },
      message: 'Hệ thống hoạt động bình thường, CSDL đã sẵn sàng.'
    });
  } catch (err) {
    res.status(503).json({
      success: false,
      data: {
        database: 'Disconnected',
        error: err.message
      },
      message: 'Hệ thống chưa thể kết nối tới cơ sở dữ liệu SQL Server.'
    });
  }
});

// Gắn 7 Router API chức năng
app.use('/api/auth', require('./routes/auth'));
app.use('/api/me', require('./routes/me'));
app.use('/api/users', require('./routes/users'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/shifts', require('./routes/shifts'));
app.use('/api/stats', require('./routes/stats'));

// Middleware bắt lỗi 404 và xử lý lỗi tập trung
app.use(notFound);
app.use(errorHandler);

// Khởi động server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`  Cafe Task Manager Server đang chạy tại:`);
    console.log(`  - Local URL:   http://localhost:${PORT}`);
    console.log(`  - API Health:  http://localhost:${PORT}/api/health`);
    console.log(`====================================================`);
  });
}

module.exports = app;
