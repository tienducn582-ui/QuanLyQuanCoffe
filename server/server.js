/**
 * server.js - Điểm khởi động chính của ứng dụng Backend Cafe Task Manager
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { query } = require('./db');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// Cấu hình Middleware cơ bản
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Phục vụ thư mục static public/
const publicPath = path.join(__dirname, '..', 'public');
app.use(express.static(publicPath));

// API Health check kiểm tra kết nối CSDL
app.get('/api/health', async (req, res, next) => {
  try {
    await query('SELECT 1 AS health');
    res.json({
      success: true,
      data: { status: 'OK', database: 'Connected' },
      message: 'Hệ thống hoạt động bình thường'
    });
  } catch (error) {
    next(error);
  }
});

// Gắn 7 router cho các tính năng
app.use('/api/auth', require('./routes/auth'));
app.use('/api/me', require('./routes/me'));
app.use('/api/users', require('./routes/users'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/shifts', require('./routes/shifts'));
app.use('/api/stats', require('./routes/stats'));

// Route mặc định cho SPA / Trang chủ nếu không trúng API
app.get('*', (req, res, next) => {
  if (req.originalUrl.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(publicPath, 'index.html'));
});

// Middleware xử lý lỗi (luôn đặt ở cuối cùng)
app.use(notFound);
app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Cafe Task Manager Server đang chạy tại http://localhost:${PORT}`);
  });
}

module.exports = app;
