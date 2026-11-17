/**
 * Router: /api/stats
 * Thành viên phụ trách: TV4 (Cơ sở dữ liệu, Thống kê, Kiểm thử)
 * Mô tả: Cung cấp API thống kê tổng quan tiến độ công việc, ca làm, phân bổ theo trạng thái, ưu tiên và danh mục
 */

const express = require('express');
const router = express.Router();

// Hợp đồng kết nối CSDL và middleware xác thực
const { query } = require('../db');
const { verifyToken } = require('../middleware/auth');

/**
 * GET /api/stats
 * Yêu cầu đăng nhập (cả Admin và Staff đều có quyền xem thống kê)
 * Trả về:
 *   - totals: { total, pending, inProgress, done, overdue, completionRate }
 *   - byStatus: [ { label, count } ]
 *   - byPriority: [ { label, count } ]
 *   - byCategory: [ { label, count } ] (gom CategoryId NULL thành 'Chưa phân loại')
 */
router.get('/', verifyToken, async (req, res) => {
  try {
    // 1. Truy vấn các chỉ số tổng quan (totals)
    // overdue: Hạn chót nhỏ hơn hôm nay VÀ trạng thái chưa hoàn thành (khác 'Done')
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
    // Tỷ lệ hoàn thành làm tròn 1 chữ số thập phân (0 nếu total = 0)
    const completionRate = total > 0 ? Math.round((done / total) * 1000) / 10 : 0;

    // 2. Thống kê theo Trạng thái (byStatus) dùng GROUP BY
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

    // 3. Thống kê theo Mức độ ưu tiên (byPriority) dùng GROUP BY
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

    // 4. Thống kê theo Danh mục (byCategory) dùng GROUP BY, gom NULL thành 'Chưa phân loại'
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

    // 5. Trả dữ liệu phản hồi theo đúng định dạng chuẩn hệ thống
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
    // Không bao giờ để lộ chuỗi kết nối hay chi tiết kỹ thuật ra ngoài client
    console.error('[TV4 - Stats API Error]:', error.message || error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi lấy dữ liệu thống kê'
    });
  }
});

module.exports = router;
