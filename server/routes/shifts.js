/**
 * routes/shifts.js - Quản lý ca làm việc
 * TV1 phụ trách
 */

const express = require('express');
const router = express.Router();
const { query } = require('../db');
const { verifyToken, requireRole } = require('../middleware/auth');
const {
  isString,
  isPositiveInt,
  isISODate,
  isTimeHHmm,
  sendBadRequest
} = require('../utils/validators');

/**
 * Định dạng đối tượng Time từ mssql sang chuỗi 'HH:mm'
 * @param {Date|string} timeVal 
 * @returns {string} 'HH:mm'
 */
function formatTimeHHmm(timeVal) {
  if (!timeVal) return '';
  if (typeof timeVal === 'string') {
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
 * GET /api/shifts/logs - Lấy nhật ký ca làm việc
 * Query: date (YYYY-MM-DD, mặc định hôm nay), shiftId (tùy chọn)
 * Quyền: Mọi tài khoản đã đăng nhập
 * Chú ý: Đặt TRƯỚC /:id để tránh Express nhầm 'logs' là ID
 */
router.get('/logs', verifyToken, async (req, res, next) => {
  try {
    const { date, shiftId, active } = req.query;
    const onlyActiveMine = active === '1' || active === 'true';
    let targetDate = date;

    if (!onlyActiveMine) {
      if (targetDate) {
        if (!isISODate(targetDate)) {
          return sendBadRequest(res, ['Ngày không đúng định dạng YYYY-MM-DD hoặc không hợp lệ.']);
        }
      } else {
        const now = new Date();
        targetDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      }
    }

    let sql = `
      SELECT TOP 100
        sl.Id,
        sl.ShiftId,
        s.Name AS ShiftName,
        sl.UserId,
        u.FullName AS UserName,
        CONVERT(VARCHAR(10), sl.LogDate, 120) AS LogDate,
        CONVERT(VARCHAR(19), sl.StartedAt, 120) AS StartedAtText,
        CONVERT(VARCHAR(19), sl.EndedAt, 120) AS EndedAtText,
        sl.HandoverNote
      FROM ShiftLogs sl
      JOIN Shifts s ON sl.ShiftId = s.Id
      JOIN Users u ON sl.UserId = u.Id
      WHERE 1 = 1
    `;
    const params = {};

    if (onlyActiveMine) {
      sql += ' AND sl.UserId = @userId AND sl.EndedAt IS NULL';
      params.userId = req.user.id;
    } else {
      sql += ' AND sl.LogDate = @date';
      params.date = targetDate;
    }

    if (shiftId !== undefined && shiftId !== '') {
      if (!isPositiveInt(shiftId)) {
        return sendBadRequest(res, ['Mã ca làm việc không hợp lệ (phải là số nguyên dương).']);
      }
      sql += ' AND sl.ShiftId = @shiftId';
      params.shiftId = Number(shiftId);
    }

    sql += ' ORDER BY sl.StartedAt DESC';

    const result = await query(sql, params);
    const logs = result.recordset.map(r => ({
      id: r.Id,
      shiftId: r.ShiftId,
      shiftName: r.ShiftName,
      userId: r.UserId,
      userName: r.UserName,
      logDate: r.LogDate,
      startedAt: r.StartedAtText,
      endedAt: r.EndedAtText || null,
      handoverNote: r.HandoverNote || ''
    }));

    res.json({
      success: true,
      data: logs,
      message: 'Lấy nhật ký ca làm việc thành công'
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
    const id = req.params.id;
    if (!isPositiveInt(id)) {
      return sendBadRequest(res, ['Mã ca làm việc không hợp lệ (phải là số nguyên dương).']);
    }

    const shiftId = Number(id);
    const result = await query('SELECT Id, Name, StartTime, EndTime, Note FROM Shifts WHERE Id = @id', { id: shiftId });
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
    const { name, startTime, endTime, note } = req.body || {};
    const errors = [];

    if (!isString(name, 1, 50)) {
      errors.push('Tên ca làm việc phải từ 1 đến 50 ký tự.');
    }

    if (!isTimeHHmm(startTime)) {
      errors.push('Giờ bắt đầu không đúng định dạng HH:mm (00:00 - 23:59).');
    }
    if (!isTimeHHmm(endTime)) {
      errors.push('Giờ kết thúc không đúng định dạng HH:mm (00:00 - 23:59).');
    }

    if (isTimeHHmm(startTime) && isTimeHHmm(endTime)) {
      if (startTime.trim() >= endTime.trim()) {
        errors.push('Giờ bắt đầu phải nhỏ hơn giờ kết thúc.');
      }
    }

    if (note !== undefined && note !== null && typeof note === 'string' && note.trim().length > 255) {
      errors.push('Ghi chú không được vượt quá 255 ký tự.');
    }

    if (errors.length > 0) {
      return sendBadRequest(res, errors);
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
      note: note && typeof note === 'string' && note.trim() ? note.trim() : null
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
    const id = req.params.id;
    if (!isPositiveInt(id)) {
      return sendBadRequest(res, ['Mã ca làm việc không hợp lệ (phải là số nguyên dương).']);
    }

    const shiftId = Number(id);
    const { name, startTime, endTime, note } = req.body || {};
    const errors = [];

    if (!isString(name, 1, 50)) {
      errors.push('Tên ca làm việc phải từ 1 đến 50 ký tự.');
    }

    if (!isTimeHHmm(startTime)) {
      errors.push('Giờ bắt đầu không đúng định dạng HH:mm (00:00 - 23:59).');
    }
    if (!isTimeHHmm(endTime)) {
      errors.push('Giờ kết thúc không đúng định dạng HH:mm (00:00 - 23:59).');
    }

    if (isTimeHHmm(startTime) && isTimeHHmm(endTime)) {
      if (startTime.trim() >= endTime.trim()) {
        errors.push('Giờ bắt đầu phải nhỏ hơn giờ kết thúc.');
      }
    }

    if (note !== undefined && note !== null && typeof note === 'string' && note.trim().length > 255) {
      errors.push('Ghi chú không được vượt quá 255 ký tự.');
    }

    if (errors.length > 0) {
      return sendBadRequest(res, errors);
    }

    // Kiểm tra ca tồn tại
    const checkExist = await query('SELECT Id FROM Shifts WHERE Id = @id', { id: shiftId });
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
      id: shiftId,
      name: name.trim(),
      startTime: startTime.trim(),
      endTime: endTime.trim(),
      note: note && typeof note === 'string' && note.trim() ? note.trim() : null
    });

    res.json({
      success: true,
      data: {
        id: shiftId,
        name: name.trim(),
        startTime: startTime.trim(),
        endTime: endTime.trim(),
        note: note && typeof note === 'string' && note.trim() ? note.trim() : ''
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
    const id = req.params.id;
    if (!isPositiveInt(id)) {
      return sendBadRequest(res, ['Mã ca làm việc không hợp lệ (phải là số nguyên dương).']);
    }

    const shiftId = Number(id);
    const checkExist = await query('SELECT Id FROM Shifts WHERE Id = @id', { id: shiftId });
    if (checkExist.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy ca làm việc'
      });
    }

    // Xóa ca làm việc (Do FK Tasks có ON DELETE SET NULL nên Tasks tự động được cập nhật ShiftId = NULL)
    await query('DELETE FROM Shifts WHERE Id = @id', { id: shiftId });

    res.json({
      success: true,
      message: 'Xóa ca làm việc thành công'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/shifts/:id/start - Bắt đầu nhận ca làm việc
 * Quyền: Mọi tài khoản đã đăng nhập
 */
router.post('/:id/start', verifyToken, async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!isPositiveInt(id)) {
      return sendBadRequest(res, ['Mã ca làm việc không hợp lệ (phải là số nguyên dương).']);
    }

    const shiftId = Number(id);
    const userId = req.user.id;

    // 1. Kiểm tra ca làm việc tồn tại
    const shiftCheck = await query('SELECT Id FROM Shifts WHERE Id = @id', { id: shiftId });
    if (shiftCheck.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy ca làm việc'
      });
    }

    // 2. Kiểm tra người dùng có ShiftLogs nào chưa kết thúc (EndedAt IS NULL) ở bất kỳ ca nào
    const activeCheck = await query(
      'SELECT TOP 1 Id, ShiftId FROM ShiftLogs WHERE UserId = @userId AND EndedAt IS NULL',
      { userId }
    );
    if (activeCheck.recordset.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Bạn đang trong một ca chưa kết thúc'
      });
    }

    // 3. Tạo bản ghi ShiftLogs mới với LogDate = hôm nay, StartedAt = SYSDATETIME()
    const insertSql = `
      INSERT INTO ShiftLogs (ShiftId, UserId, LogDate, StartedAt, EndedAt, HandoverNote)
      OUTPUT INSERTED.Id, INSERTED.ShiftId, INSERTED.UserId,
             CONVERT(VARCHAR(10), INSERTED.LogDate, 120) AS LogDate,
             CONVERT(VARCHAR(19), INSERTED.StartedAt, 120) AS StartedAtText
      VALUES (@shiftId, @userId, CAST(GETDATE() AS DATE), SYSDATETIME(), NULL, NULL)
    `;

    const result = await query(insertSql, { shiftId, userId });
    const inserted = result.recordset[0];

    res.status(201).json({
      success: true,
      data: {
        id: inserted.Id,
        shiftId: inserted.ShiftId,
        userId: inserted.UserId,
        logDate: inserted.LogDate,
        startedAt: inserted.StartedAtText
      },
      message: 'Nhận ca làm việc thành công'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/shifts/:id/end - Kết thúc ca làm việc và ghi nhận bàn giao
 * Body: { handoverNote?: string } (tối đa 500 ký tự)
 * Quyền: Mọi tài khoản đã đăng nhập
 */
router.post('/:id/end', verifyToken, async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!isPositiveInt(id)) {
      return sendBadRequest(res, ['Mã ca làm việc không hợp lệ (phải là số nguyên dương).']);
    }

    const shiftId = Number(id);
    const userId = req.user.id;
    const { handoverNote } = req.body || {};

    if (handoverNote !== undefined && handoverNote !== null && typeof handoverNote === 'string' && handoverNote.trim().length > 500) {
      return sendBadRequest(res, ['Ghi chú bàn giao không được vượt quá 500 ký tự.']);
    }

    // Tìm log chưa kết thúc của CHÍNH người dùng ở ca :id
    const findLog = await query(
      'SELECT TOP 1 Id FROM ShiftLogs WHERE ShiftId = @shiftId AND UserId = @userId AND EndedAt IS NULL',
      { shiftId, userId }
    );

    if (findLog.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy ca làm việc đang mở của bạn để kết thúc'
      });
    }

    const logId = findLog.recordset[0].Id;
    const noteVal = handoverNote && typeof handoverNote === 'string' && handoverNote.trim() ? handoverNote.trim() : null;

    await query(
      `UPDATE ShiftLogs 
       SET EndedAt = SYSDATETIME(), HandoverNote = @handoverNote 
       WHERE Id = @logId`,
      { logId, handoverNote: noteVal }
    );

    res.json({
      success: true,
      message: 'Kết thúc ca làm việc và bàn giao thành công'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/shifts/:id/handover - Lấy thông tin bàn giao ca gần nhất và các công việc chưa xong
 * Quyền: Mọi tài khoản đã đăng nhập
 */
router.get('/:id/handover', verifyToken, async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!isPositiveInt(id)) {
      return sendBadRequest(res, ['Mã ca làm việc không hợp lệ (phải là số nguyên dương).']);
    }

    const shiftId = Number(id);

    // Kiểm tra ca làm việc tồn tại
    const shiftCheck = await query('SELECT Id FROM Shifts WHERE Id = @id', { id: shiftId });
    if (shiftCheck.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy ca làm việc'
      });
    }

    // Log đã kết thúc gần nhất của ca
    const logSql = `
      SELECT TOP 1 
        u.FullName AS userName,
        CONVERT(VARCHAR(19), sl.EndedAt, 120) AS endedAt,
        sl.HandoverNote AS handoverNote
      FROM ShiftLogs sl
      JOIN Users u ON sl.UserId = u.Id
      WHERE sl.ShiftId = @shiftId AND sl.EndedAt IS NOT NULL
      ORDER BY sl.EndedAt DESC
    `;
    const logRes = await query(logSql, { shiftId });
    const lastLog = logRes.recordset.length > 0 ? {
      userName: logRes.recordset[0].userName,
      endedAt: logRes.recordset[0].endedAt,
      handoverNote: logRes.recordset[0].handoverNote || ''
    } : null;

    // Các công việc còn dở của ca (Status khác 'Done')
    const taskSql = `
      SELECT 
        t.Id AS id,
        t.Title AS title,
        t.Priority AS priority,
        t.Status AS status,
        CONVERT(VARCHAR(10), t.Deadline, 120) AS deadline
      FROM Tasks t
      WHERE t.ShiftId = @shiftId AND t.Status <> 'Done'
      ORDER BY 
        CASE t.Priority WHEN 'High' THEN 1 WHEN 'Medium' THEN 2 WHEN 'Low' THEN 3 ELSE 4 END,
        t.Deadline ASC
    `;
    const taskRes = await query(taskSql, { shiftId });
    const openTasks = taskRes.recordset.map(t => ({
      id: t.id,
      title: t.title,
      priority: t.priority,
      status: t.status,
      deadline: t.deadline
    }));

    res.json({
      success: true,
      data: {
        lastLog,
        openTasks
      },
      message: 'Lấy thông tin bàn giao ca thành công'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
