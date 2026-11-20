/**
 * Router: /api/stats
 * Thành viên phụ trách: TV4 (Cơ sở dữ liệu, Thống kê, Kiểm thử)
 * Mô tả: Cung cấp API thống kê tổng quan và nâng cao:
 *   - GET /: Thống kê tổng hợp 6 chỉ số KPI và Group By theo 3 chiều
 *   - GET /by-user: Thống kê theo nhân viên (userId, fullName, total, done, overdue)
 *   - GET /by-shift: Thống kê theo ca làm (shiftId, shiftName, total, done, completionRate)
 *   - GET /weekly: Thống kê tiến độ theo tuần (weekStart, total, done)
 *   - GET /export.csv: Xuất danh sách công việc ra file CSV chuẩn UTF-8 BOM chống CSV Injection (Chỉ Admin)
 */

const express = require('express');
const router = express.Router();

// Hợp đồng kết nối CSDL và middleware xác thực / phân quyền
const { query } = require('../db');
const { verifyToken, requireRole } = require('../middleware/auth');

/**
 * 1. GET /api/stats
 * Yêu cầu đăng nhập (cả Admin và Staff đều có quyền xem thống kê)
 * Trả về: totals, byStatus, byPriority, byCategory
 */
router.get('/', verifyToken, async (req, res) => {
  try {
    const totalsSql = `
      SELECT 
        COUNT(*) AS total,
        COALESCE(SUM(CASE WHEN Status = 'Pending' THEN 1 ELSE 0 END), 0) AS pending,
        COALESCE(SUM(CASE WHEN Status = 'InProgress' THEN 1 ELSE 0 END), 0) AS inProgress,
        COALESCE(SUM(CASE WHEN Status = 'Done' THEN 1 ELSE 0 END), 0) AS done,
        COALESCE(SUM(CASE WHEN Deadline IS NOT NULL AND Deadline < CAST(GETDATE() AS DATE) AND Status <> 'Done' THEN 1 ELSE 0 END), 0) AS overdue
      FROM dbo.Tasks;
    `;
    const totalsResult = await query(totalsSql);
    const row = totalsResult.recordset[0] || {};

    const total = Number(row.total || 0);
    const pending = Number(row.pending || 0);
    const inProgress = Number(row.inProgress || 0);
    const done = Number(row.done || 0);
    const overdue = Number(row.overdue || 0);
    const completionRate = total > 0 ? Math.round((done / total) * 1000) / 10 : 0;

    const statusSql = `
      SELECT 
        Status AS label, 
        COUNT(*) AS [count]
      FROM dbo.Tasks
      GROUP BY Status
      ORDER BY 
        CASE Status 
          WHEN 'Pending' THEN 1 
          WHEN 'InProgress' THEN 2 
          WHEN 'Done' THEN 3 
          ELSE 4 
        END;
    `;
    const statusResult = await query(statusSql);
    const byStatus = statusResult.recordset.map(item => ({
      label: item.label,
      count: Number(item.count)
    }));

    const prioritySql = `
      SELECT 
        Priority AS label, 
        COUNT(*) AS [count]
      FROM dbo.Tasks
      GROUP BY Priority
      ORDER BY 
        CASE Priority 
          WHEN 'Low' THEN 1 
          WHEN 'Medium' THEN 2 
          WHEN 'High' THEN 3 
          ELSE 4 
        END;
    `;
    const priorityResult = await query(prioritySql);
    const byPriority = priorityResult.recordset.map(item => ({
      label: item.label,
      count: Number(item.count)
    }));

    const categorySql = `
      SELECT 
        COALESCE(c.Name, N'Chưa phân loại') AS label,
        COUNT(t.Id) AS [count]
      FROM dbo.Tasks t
      LEFT JOIN dbo.Categories c ON t.CategoryId = c.Id
      GROUP BY COALESCE(c.Name, N'Chưa phân loại')
      ORDER BY [count] DESC;
    `;
    const categoryResult = await query(categorySql);
    const byCategory = categoryResult.recordset.map(item => ({
      label: item.label,
      count: Number(item.count)
    }));

    return res.status(200).json({
      success: true,
      data: {
        totals: {
          total,
          pending,
          inProgress,
          done,
          overdue,
          completionRate
        },
        byStatus,
        byPriority,
        byCategory
      },
      message: 'Lấy dữ liệu thống kê thành công'
    });
  } catch (error) {
    console.error('[TV4 - Stats API Error]:', error.message || error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi lấy dữ liệu thống kê'
    });
  }
});

/**
 * 2. GET /api/stats/by-user
 * Thống kê khối lượng công việc theo nhân viên (mọi vai trò)
 * Trả về: [{ userId, fullName, total, done, overdue }]
 * Việc chưa giao (AssigneeId NULL) gom thành fullName: 'Chưa giao', userId: null
 */
router.get('/by-user', verifyToken, async (req, res) => {
  try {
    const sql = `
      SELECT 
        u.Id AS userId,
        COALESCE(u.FullName, N'Chưa giao') AS fullName,
        COUNT(t.Id) AS total,
        COALESCE(SUM(CASE WHEN t.Status = 'Done' THEN 1 ELSE 0 END), 0) AS done,
        COALESCE(SUM(CASE WHEN t.Deadline IS NOT NULL AND t.Deadline < CAST(GETDATE() AS DATE) AND t.Status <> 'Done' THEN 1 ELSE 0 END), 0) AS overdue
      FROM dbo.Tasks t
      LEFT JOIN dbo.Users u ON t.AssigneeId = u.Id
      GROUP BY u.Id, u.FullName
      ORDER BY 
        CASE WHEN u.Id IS NULL THEN 1 ELSE 0 END,
        COUNT(t.Id) DESC;
    `;
    const result = await query(sql);
    const data = result.recordset.map(row => ({
      userId: row.userId ? Number(row.userId) : null,
      fullName: row.fullName,
      total: Number(row.total || 0),
      done: Number(row.done || 0),
      overdue: Number(row.overdue || 0)
    }));

    return res.status(200).json({
      success: true,
      data,
      message: 'Lấy thống kê theo nhân viên thành công'
    });
  } catch (error) {
    console.error('[TV4 - Stats by-user Error]:', error.message || error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi thống kê theo nhân viên'
    });
  }
});

/**
 * 3. GET /api/stats/by-shift
 * Thống kê theo ca làm việc (mọi vai trò)
 * Trả về: [{ shiftId, shiftName, total, done, completionRate }]
 * Việc không có ca gom thành 'Chưa gán ca', shiftId: null
 * completionRate làm tròn 1 chữ số thập phân, 0 nếu total = 0
 */
router.get('/by-shift', verifyToken, async (req, res) => {
  try {
    const sql = `
      SELECT 
        s.Id AS shiftId,
        COALESCE(s.Name, N'Chưa gán ca') AS shiftName,
        COUNT(t.Id) AS total,
        COALESCE(SUM(CASE WHEN t.Status = 'Done' THEN 1 ELSE 0 END), 0) AS done
      FROM dbo.Tasks t
      LEFT JOIN dbo.Shifts s ON t.ShiftId = s.Id
      GROUP BY s.Id, s.Name
      ORDER BY 
        CASE WHEN s.Id IS NULL THEN 1 ELSE 0 END,
        s.Id ASC;
    `;
    const result = await query(sql);
    const data = result.recordset.map(row => {
      const total = Number(row.total || 0);
      const done = Number(row.done || 0);
      const completionRate = total > 0 ? Math.round((done / total) * 1000) / 10 : 0;
      return {
        shiftId: row.shiftId ? Number(row.shiftId) : null,
        shiftName: row.shiftName,
        total,
        done,
        completionRate
      };
    });

    return res.status(200).json({
      success: true,
      data,
      message: 'Lấy thống kê theo ca làm thành công'
    });
  } catch (error) {
    console.error('[TV4 - Stats by-shift Error]:', error.message || error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi thống kê theo ca làm'
    });
  }
});

/**
 * 4. GET /api/stats/weekly?weeks=8
 * Thống kê tiến độ công việc theo tuần (mọi vai trò)
 * weeks: số nguyên từ 1 đến 26, mặc định 8. Nếu sai trả 400.
 * Tuần tính theo Deadline (việc không có Deadline bỏ qua), bắt đầu thứ Hai (SET DATEFIRST 1).
 * Trả về đủ các tuần kể cả tuần có total = 0: [{ weekStart: 'YYYY-MM-DD', total, done }]
 */
router.get('/weekly', verifyToken, async (req, res) => {
  try {
    let weeks = 8;
    if (req.query.weeks !== undefined) {
      const rawWeeks = req.query.weeks;
      // Kiểm tra phải là chuỗi số nguyên thuần túy
      if (!/^\d+$/.test(String(rawWeeks))) {
        return res.status(400).json({
          success: false,
          message: 'Tham số weeks phải là số nguyên từ 1 đến 26'
        });
      }
      weeks = parseInt(rawWeeks, 10);
      if (weeks < 1 || weeks > 26) {
        return res.status(400).json({
          success: false,
          message: 'Tham số weeks phải nằm trong khoảng từ 1 đến 26'
        });
      }
    }

    // 1. Tạo danh sách các ngày thứ Hai của W tuần (từ quá khứ đến tuần hiện tại)
    const now = new Date();
    const dayOfWeek = (now.getDay() + 6) % 7; // Thứ 2 = 0, CN = 6
    const currentMonday = new Date(now);
    currentMonday.setDate(now.getDate() - dayOfWeek);
    currentMonday.setHours(0, 0, 0, 0);

    const weekList = [];
    for (let i = weeks - 1; i >= 0; i--) {
      const m = new Date(currentMonday);
      m.setDate(currentMonday.getDate() - i * 7);
      const yyyy = m.getFullYear();
      const mm = String(m.getMonth() + 1).padStart(2, '0');
      const dd = String(m.getDate()).padStart(2, '0');
      weekList.push(`${yyyy}-${mm}-${dd}`);
    }

    // 2. Truy vấn SQL Server gom nhóm theo tuần bắt đầu thứ Hai
    const sql = `
      SET DATEFIRST 1;
      SELECT 
        CONVERT(VARCHAR(10), DATEADD(DAY, 1 - DATEPART(WEEKDAY, Deadline), Deadline), 120) AS weekStart,
        COUNT(*) AS total,
        COALESCE(SUM(CASE WHEN Status = 'Done' THEN 1 ELSE 0 END), 0) AS done
      FROM dbo.Tasks
      WHERE Deadline IS NOT NULL
        AND Deadline >= DATEADD(WEEK, -@weeks, CAST(GETDATE() AS DATE))
      GROUP BY DATEADD(DAY, 1 - DATEPART(WEEKDAY, Deadline), Deadline);
    `;
    const result = await query(sql, { weeks: weeks + 2 });
    const map = {};
    for (const r of result.recordset) {
      map[r.weekStart] = {
        total: Number(r.total || 0),
        done: Number(r.done || 0)
      };
    }

    // 3. Khớp đầy đủ tuần kể cả tuần không có công việc (total = 0, done = 0)
    const data = weekList.map(weekStart => ({
      weekStart,
      total: map[weekStart] ? map[weekStart].total : 0,
      done: map[weekStart] ? map[weekStart].done : 0
    }));

    return res.status(200).json({
      success: true,
      data,
      message: 'Lấy thống kê theo tuần thành công'
    });
  } catch (error) {
    console.error('[TV4 - Stats weekly Error]:', error.message || error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi lấy thống kê theo tuần'
    });
  }
});

/**
 * 5. GET /api/stats/export.csv
 * Xuất danh sách toàn bộ công việc ra định dạng CSV (Chỉ Admin)
 * Cột: Id, Tiêu đề, Trạng thái, Ưu tiên, Hạn, Danh mục, Ca, Người thực hiện
 * Định dạng: UTF-8 có BOM (\uFEFF) cho Excel
 * Bảo mật: Chống CSV Injection (=, +, -, @) và escape dấu nháy kép
 */
router.get('/export.csv', verifyToken, requireRole('Admin'), async (req, res) => {
  try {
    const sql = `
      SELECT 
        t.Id,
        t.Title,
        t.Status,
        t.Priority,
        CONVERT(VARCHAR(10), t.Deadline, 120) AS Deadline,
        c.Name AS CategoryName,
        s.Name AS ShiftName,
        u.FullName AS AssigneeName
      FROM dbo.Tasks t
      LEFT JOIN dbo.Categories c ON t.CategoryId = c.Id
      LEFT JOIN dbo.Shifts s ON t.ShiftId = s.Id
      LEFT JOIN dbo.Users u ON t.AssigneeId = u.Id
      ORDER BY t.Id ASC;
    `;
    const result = await query(sql);

    // Hàm chuẩn hóa ô CSV chống CSV Injection và xử lý nháy kép
    const sanitizeCsvCell = (val) => {
      if (val === null || val === undefined) return '""';
      let str = String(val).trim();
      // Chống CSV Injection: nếu ký tự đầu là =, +, -, hoặc @ thì thêm nháy đơn phía trước
      if (/^[=+\-@]/.test(str)) {
        str = "'" + str;
      }
      // Nhân đôi dấu nháy kép bên trong
      str = str.replace(/"/g, '""');
      return `"${str}"`;
    };

    const headers = [
      'Id',
      'Tiêu đề',
      'Trạng thái',
      'Ưu tiên',
      'Hạn',
      'Danh mục',
      'Ca',
      'Người thực hiện'
    ];

    const csvRows = [];
    csvRows.push(headers.map(sanitizeCsvCell).join(','));

    for (const row of result.recordset) {
      csvRows.push([
        sanitizeCsvCell(row.Id),
        sanitizeCsvCell(row.Title),
        sanitizeCsvCell(row.Status),
        sanitizeCsvCell(row.Priority),
        sanitizeCsvCell(row.Deadline || 'Không có'),
        sanitizeCsvCell(row.CategoryName || 'Chưa phân loại'),
        sanitizeCsvCell(row.ShiftName || 'Chưa gán ca'),
        sanitizeCsvCell(row.AssigneeName || 'Chưa giao')
      ].join(','));
    }

    // Nối BOM \uFEFF ở đầu file CSV
    const csvContent = '\uFEFF' + csvRows.join('\r\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="tasks-export.csv"');
    return res.status(200).send(csvContent);
  } catch (error) {
    console.error('[TV4 - Stats export.csv Error]:', error.message || error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi xuất dữ liệu CSV'
    });
  }
});

module.exports = router;
