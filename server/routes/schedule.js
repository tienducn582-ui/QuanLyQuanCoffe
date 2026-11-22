/**
 * server/routes/schedule.js - Quản lý Lịch phân ca tuần (/api/schedule)
 * TV1 phụ trách - Tính năng mở rộng [TV1-X4]
 */

const express = require('express');
const router = express.Router();
const { query } = require('../db');
const { verifyToken, requireRole } = require('../middleware/auth');
const {
  isPositiveInt,
  isISODate,
  sendBadRequest
} = require('../utils/validators');

// Yêu cầu xác thực toàn bộ router
router.use(verifyToken);

/**
 * Kiểm tra tính hợp lệ của khoảng ngày from và to (YYYY-MM-DD, tối đa 31 ngày)
 */
function validateDateRange(from, to) {
  const errors = [];
  if (!from || !isISODate(from)) {
    errors.push('Tham số from bắt buộc và phải đúng định dạng YYYY-MM-DD.');
  }
  if (!to || !isISODate(to)) {
    errors.push('Tham số to bắt buộc và phải đúng định dạng YYYY-MM-DD.');
  }
  if (errors.length > 0) return { isValid: false, errors };

  const fromDate = new Date(from);
  const toDate = new Date(to);

  if (fromDate > toDate) {
    errors.push('Ngày bắt đầu (from) phải nhỏ hơn hoặc bằng ngày kết thúc (to).');
    return { isValid: false, errors };
  }

  const diffDays = Math.round((toDate - fromDate) / (1000 * 60 * 60 * 24));
  if (diffDays > 31) {
    errors.push('Khoảng cách giữa from và to tối đa không quá 31 ngày.');
    return { isValid: false, errors };
  }

  return { isValid: true };
}

/**
 * GET /api/schedule/mine?from=&to=
 * Lấy lịch phân ca của chính người dùng hiện tại
 * Đặt /mine TRƯỚC /:id để tránh xung đột routing
 */
router.get('/mine', async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const rangeCheck = validateDateRange(from, to);
    if (!rangeCheck.isValid) {
      return sendBadRequest(res, rangeCheck.errors);
    }

    const userId = req.user.id;
    const sql = `
      SELECT 
        sa.Id AS id,
        sa.ShiftId AS shiftId,
        s.Name AS shiftName,
        sa.UserId AS userId,
        u.FullName AS userName,
        CONVERT(VARCHAR(10), sa.WorkDate, 120) AS workDate
      FROM ShiftAssignments sa
      JOIN Shifts s ON sa.ShiftId = s.Id
      JOIN Users u ON sa.UserId = u.Id
      WHERE sa.UserId = @userId AND sa.WorkDate >= @from AND sa.WorkDate <= @to
      ORDER BY sa.WorkDate ASC, s.StartTime ASC
    `;

    const result = await query(sql, { userId, from, to });
    res.json({
      success: true,
      data: result.recordset,
      message: 'Lấy lịch phân ca cá nhân thành công'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/schedule?from=&to=
 * Lấy danh sách phân ca của toàn quán trong khoảng ngày from..to
 * Quyền: Mọi tài khoản đã đăng nhập
 */
router.get('/', async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const rangeCheck = validateDateRange(from, to);
    if (!rangeCheck.isValid) {
      return sendBadRequest(res, rangeCheck.errors);
    }

    const sql = `
      SELECT 
        sa.Id AS id,
        sa.ShiftId AS shiftId,
        s.Name AS shiftName,
        sa.UserId AS userId,
        u.FullName AS userName,
        CONVERT(VARCHAR(10), sa.WorkDate, 120) AS workDate
      FROM ShiftAssignments sa
      JOIN Shifts s ON sa.ShiftId = s.Id
      JOIN Users u ON sa.UserId = u.Id
      WHERE sa.WorkDate >= @from AND sa.WorkDate <= @to
      ORDER BY sa.WorkDate ASC, s.StartTime ASC, u.FullName ASC
    `;

    const result = await query(sql, { from, to });
    res.json({
      success: true,
      data: result.recordset,
      message: 'Lấy danh sách phân ca thành công'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/schedule
 * Phân công ca làm việc cho nhân viên vào một ngày cụ thể
 * Body: { shiftId, userId, workDate }
 * Quyền: Chỉ Admin
 */
router.post('/', requireRole('Admin'), async (req, res, next) => {
  try {
    const { shiftId, userId, workDate } = req.body || {};
    const errors = [];

    if (!isPositiveInt(shiftId)) {
      errors.push('Mã ca làm việc không hợp lệ (phải là số nguyên dương).');
    }
    if (!isPositiveInt(userId)) {
      errors.push('Mã người dùng không hợp lệ (phải là số nguyên dương).');
    }
    if (!workDate || !isISODate(workDate)) {
      errors.push('Ngày phân ca không đúng định dạng YYYY-MM-DD hoặc không hợp lệ.');
    }

    if (errors.length > 0) {
      return sendBadRequest(res, errors);
    }

    const sId = Number(shiftId);
    const uId = Number(userId);

    // 1. Kiểm tra ca làm việc tồn tại
    const shiftCheck = await query('SELECT Id FROM Shifts WHERE Id = @id', { id: sId });
    if (shiftCheck.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy ca làm việc'
      });
    }

    // 2. Kiểm tra người dùng tồn tại
    const userCheck = await query('SELECT Id FROM Users WHERE Id = @id', { id: uId });
    if (userCheck.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }

    // 3. Kiểm tra trùng bộ ba (ShiftId, UserId, WorkDate)
    const dupCheck = await query(
      'SELECT Id FROM ShiftAssignments WHERE ShiftId = @shiftId AND UserId = @userId AND WorkDate = @workDate',
      { shiftId: sId, userId: uId, workDate }
    );
    if (dupCheck.recordset.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Nhân viên đã được phân công ca làm việc này trong ngày.'
      });
    }

    // 4. Thêm bản ghi phân công
    const insertSql = `
      INSERT INTO ShiftAssignments (ShiftId, UserId, WorkDate)
      OUTPUT INSERTED.Id AS id, INSERTED.ShiftId AS shiftId, INSERTED.UserId AS userId, CONVERT(VARCHAR(10), INSERTED.WorkDate, 120) AS workDate
      VALUES (@shiftId, @userId, @workDate)
    `;

    const result = await query(insertSql, { shiftId: sId, userId: uId, workDate });
    const inserted = result.recordset[0];

    res.status(201).json({
      success: true,
      data: inserted,
      message: 'Phân công ca làm việc thành công'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/schedule/:id
 * Hủy lịch phân công ca làm việc
 * Quyền: Chỉ Admin
 */
router.delete('/:id', requireRole('Admin'), async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!isPositiveInt(id)) {
      return sendBadRequest(res, ['Mã lịch phân công không hợp lệ (phải là số nguyên dương).']);
    }

    const assignmentId = Number(id);

    // Kiểm tra tồn tại
    const checkExist = await query('SELECT Id FROM ShiftAssignments WHERE Id = @id', { id: assignmentId });
    if (checkExist.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy lịch phân công ca'
      });
    }

    await query('DELETE FROM ShiftAssignments WHERE Id = @id', { id: assignmentId });

    res.json({
      success: true,
      message: 'Hủy phân công ca thành công'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
