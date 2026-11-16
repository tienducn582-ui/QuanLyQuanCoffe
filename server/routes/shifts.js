/**
 * routes/shifts.js - Quản lý ca làm việc
 * TV1 phụ trách
 */

const express = require('express');
const router = express.Router();
const { query } = require('../db');
const { verifyToken, requireRole } = require('../middleware/auth');

/**
 * Định dạng đối tượng Time từ mssql sang chuỗi 'HH:mm'
 * @param {Date|string} timeVal 
 * @returns {string} 'HH:mm'
 */
function formatTimeHHmm(timeVal) {
  if (!timeVal) return '';
  if (typeof timeVal === 'string') {
    // Nếu đã là chuỗi dạng 'HH:mm:ss' hoặc 'HH:mm'
    return timeVal.substring(0, 5);
  }
  if (timeVal instanceof Date) {
    const hours = String(timeVal.getUTCHours()).padStart(2, '0');
    const minutes = String(timeVal.getUTCMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }
  return String(timeVal);
}

/**
 * GET /api/shifts - Lấy danh sách ca làm việc kèm số lượng công việc (taskCount)
 * Quyền: Mọi tài khoản đã đăng nhập
 */
router.get('/', verifyToken, async (req, res, next) => {
  try {
    const sql = `
      SELECT 
        s.Id, 
        s.Name, 
        s.StartTime, 
        s.EndTime, 
        s.Note,
        COUNT(t.Id) AS TaskCount
      FROM Shifts s
      LEFT JOIN Tasks t ON s.Id = t.ShiftId
      GROUP BY s.Id, s.Name, s.StartTime, s.EndTime, s.Note
      ORDER BY s.StartTime ASC
    `;
    const result = await query(sql);

    const shifts = result.recordset.map(row => ({
      id: row.Id,
      name: row.Name,
      startTime: formatTimeHHmm(row.StartTime),
      endTime: formatTimeHHmm(row.EndTime),
      note: row.Note || '',
      taskCount: row.TaskCount || 0
    }));

    res.json({
      success: true,
      data: shifts,
      message: 'Lấy danh sách ca làm việc thành công'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/shifts/:id - Lấy chi tiết ca làm việc theo ID
 * Quyền: Mọi tài khoản đã đăng nhập
 */
router.get('/:id', verifyToken, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Mã ca làm việc không hợp lệ'
      });
    }

    const result = await query('SELECT Id, Name, StartTime, EndTime, Note FROM Shifts WHERE Id = @id', { id });
    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy ca làm việc'
      });
    }

    const row = result.recordset[0];
    res.json({
      success: true,
      data: {
        id: row.Id,
        name: row.Name,
        startTime: formatTimeHHmm(row.StartTime),
        endTime: formatTimeHHmm(row.EndTime),
        note: row.Note || ''
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/shifts - Thêm mới ca làm việc
 * Quyền: Chỉ Admin
 */
router.post('/', verifyToken, requireRole('Admin'), async (req, res, next) => {
  try {
    const { name, startTime, endTime, note } = req.body;
    const errors = [];

    if (!name || typeof name !== 'string' || name.trim().length === 0 || name.trim().length > 50) {
      errors.push('Tên ca làm việc phải từ 1 đến 50 ký tự');
    }

    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!startTime || !timeRegex.test(startTime)) {
      errors.push('Giờ bắt đầu không đúng định dạng HH:mm (00:00 - 23:59)');
    }
    if (!endTime || !timeRegex.test(endTime)) {
      errors.push('Giờ kết thúc không đúng định dạng HH:mm (00:00 - 23:59)');
    }

    if (startTime && endTime && timeRegex.test(startTime) && timeRegex.test(endTime)) {
      if (startTime >= endTime) {
        errors.push('Giờ bắt đầu phải nhỏ hơn giờ kết thúc');
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu không hợp lệ',
        errors
      });
    }

    const insertSql = `
      INSERT INTO Shifts (Name, StartTime, EndTime, Note)
      OUTPUT INSERTED.Id, INSERTED.Name, INSERTED.StartTime, INSERTED.EndTime, INSERTED.Note
      VALUES (@name, @startTime, @endTime, @note)
    `;

    const result = await query(insertSql, {
      name: name.trim(),
      startTime: startTime.trim(),
      endTime: endTime.trim(),
      note: note ? note.trim() : null
    });

    const inserted = result.recordset[0];
    res.status(201).json({
      success: true,
      data: {
        id: inserted.Id,
        name: inserted.Name,
        startTime: formatTimeHHmm(inserted.StartTime),
        endTime: formatTimeHHmm(inserted.EndTime),
        note: inserted.Note || ''
      },
      message: 'Thêm ca làm việc thành công'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/shifts/:id - Cập nhật ca làm việc
 * Quyền: Chỉ Admin
 */
router.put('/:id', verifyToken, requireRole('Admin'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Mã ca làm việc không hợp lệ'
      });
    }

    const { name, startTime, endTime, note } = req.body;
    const errors = [];

    if (!name || typeof name !== 'string' || name.trim().length === 0 || name.trim().length > 50) {
      errors.push('Tên ca làm việc phải từ 1 đến 50 ký tự');
    }

    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!startTime || !timeRegex.test(startTime)) {
      errors.push('Giờ bắt đầu không đúng định dạng HH:mm (00:00 - 23:59)');
    }
    if (!endTime || !timeRegex.test(endTime)) {
      errors.push('Giờ kết thúc không đúng định dạng HH:mm (00:00 - 23:59)');
    }

    if (startTime && endTime && timeRegex.test(startTime) && timeRegex.test(endTime)) {
      if (startTime >= endTime) {
        errors.push('Giờ bắt đầu phải nhỏ hơn giờ kết thúc');
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu không hợp lệ',
        errors
      });
    }

    // Kiểm tra ca tồn tại
    const checkExist = await query('SELECT Id FROM Shifts WHERE Id = @id', { id });
    if (checkExist.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy ca làm việc'
      });
    }

    const updateSql = `
      UPDATE Shifts
      SET Name = @name, StartTime = @startTime, EndTime = @endTime, Note = @note
      WHERE Id = @id
    `;

    await query(updateSql, {
      id,
      name: name.trim(),
      startTime: startTime.trim(),
      endTime: endTime.trim(),
      note: note ? note.trim() : null
    });

    res.json({
      success: true,
      data: {
        id,
        name: name.trim(),
        startTime: startTime.trim(),
        endTime: endTime.trim(),
        note: note ? note.trim() : ''
      },
      message: 'Cập nhật ca làm việc thành công'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/shifts/:id - Xóa ca làm việc
 * Quyền: Chỉ Admin (Các task liên quan được SET NULL ShiftId theo CSDL)
 */
router.delete('/:id', verifyToken, requireRole('Admin'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Mã ca làm việc không hợp lệ'
      });
    }

    const checkExist = await query('SELECT Id FROM Shifts WHERE Id = @id', { id });
    if (checkExist.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy ca làm việc'
      });
    }

    // Xóa ca làm việc (Do FK Tasks có ON DELETE SET NULL nên Tasks tự động được cập nhật ShiftId = NULL)
    await query('DELETE FROM Shifts WHERE Id = @id', { id });

    res.json({
      success: true,
      message: 'Xóa ca làm việc thành công'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
