/**
 * server/routes/customers.js - API quản lý Khách hàng tích điểm (/api/customers)
 * Thành viên phụ trách: TV2 (Xác thực, Phân quyền & Bảo mật) - Tác vụ [TV2-X8]
 *
 * Danh sách endpoint (toàn bộ router yêu cầu đăng nhập - verifyToken):
 * - GET    /api/customers?search=&page=1&pageSize=10   (Admin và Staff)
 * - GET    /api/customers/:id                          (Admin và Staff)
 * - POST   /api/customers                              (Admin và Staff)
 * - PUT    /api/customers/:id                          (chỉ Admin)
 * - DELETE /api/customers/:id                          (chỉ Admin)
 * - POST   /api/customers/:id/earn   { amount }        (Admin và Staff)
 * - POST   /api/customers/:id/redeem { points }        (Admin và Staff)
 */

const express = require('express');
const { query } = require('../db');
const { verifyToken, requireRole } = require('../middleware/auth');
const {
  isString,
  isPhone,
  isPositiveInt,
  sendBadRequest
} = require('../utils/validators');

const router = express.Router();

// Toàn bộ route khách hàng đều yêu cầu đăng nhập
router.use(verifyToken);

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;
const MAX_SQL_INT = 2147483647;
const MIN_EARN_AMOUNT = 10000;
const MAX_EARN_AMOUNT = 1000000000;

/**
 * Tính hạng thành viên động theo điểm tích lũy (không lưu CSDL)
 * @param {number} points
 * @returns {'Đồng'|'Bạc'|'Vàng'}
 */
function getRank(points) {
  const pts = Number(points || 0);
  if (pts >= 300) return 'Vàng';
  if (pts >= 100) return 'Bạc';
  return 'Đồng';
}

/**
 * Chuyển một dòng dữ liệu SQL bảng Customers sang JSON chuẩn
 */
function mapCustomer(row) {
  const points = Number(row.Points || 0);
  return {
    id: Number(row.Id),
    fullName: row.FullName,
    phone: row.Phone,
    points,
    rank: getRank(points),
    createdAt: row.CreatedAt instanceof Date ? row.CreatedAt.toISOString() : row.CreatedAt
  };
}

/**
 * Kiểm tra chuỗi rỗng / undefined / null
 */
function isEmpty(value) {
  return value === undefined || value === null || (typeof value === 'string' && value.trim() === '');
}

/**
 * Kiểm tra số nguyên dương nằm trong phạm vi INT 32-bit của SQL Server
 */
function isSqlPositiveInt(value, max = MAX_SQL_INT) {
  return isPositiveInt(value) && Number(value) <= max;
}

/**
 * Escape các ký tự đặc biệt của LIKE trong SQL Server: [ % _
 */
function escapeLike(text) {
  return text.replace(/\[/g, '[[]').replace(/%/g, '[%]').replace(/_/g, '[_]');
}

/**
 * Middleware kiểm tra :id trên URL
 */
function checkIdParam(req, res, next) {
  if (!isSqlPositiveInt(req.params.id)) {
    return sendBadRequest(res, ['Mã khách hàng (id) phải là số nguyên dương hợp lệ.']);
  }
  req.customerId = Number(req.params.id);
  next();
}

/**
 * Kiểm tra dữ liệu đầu vào khi tạo / cập nhật thông tin khách hàng
 */
function validateCustomerBody(body) {
  const b = body || {};
  const errors = [];

  if (!isString(b.fullName, 2, 100)) {
    errors.push('Họ và tên khách hàng phải có độ dài từ 2 đến 100 ký tự.');
  }
  if (!isPhone(b.phone)) {
    errors.push('Số điện thoại phải gồm 9 đến 11 chữ số (0-9).');
  }

  return {
    errors,
    data: {
      fullName: typeof b.fullName === 'string' ? b.fullName.trim() : b.fullName,
      phone: typeof b.phone === 'string' ? b.phone.trim() : b.phone
    }
  };
}

/**
 * GET /api/customers - Danh sách khách hàng có tìm kiếm theo tên/SĐT và phân trang
 * Quyền: Admin và Staff
 */
router.get('/', async (req, res, next) => {
  try {
    const q = req.query;
    const errors = [];

    const page = isEmpty(q.page) ? 1 : q.page;
    const pageSize = isEmpty(q.pageSize) ? DEFAULT_PAGE_SIZE : q.pageSize;

    if (!isSqlPositiveInt(page)) {
      errors.push('page phải là số nguyên dương hợp lệ.');
    }
    if (!isSqlPositiveInt(pageSize, MAX_PAGE_SIZE)) {
      errors.push(`pageSize phải là số nguyên từ 1 đến ${MAX_PAGE_SIZE}.`);
    }
    if (!isEmpty(q.search) && !isString(q.search, 1, 100)) {
      errors.push('search phải là chuỗi từ 1 đến 100 ký tự.');
    }
    if (errors.length > 0) {
      return sendBadRequest(res, errors);
    }

    const pageNum = Number(page);
    const size = Number(pageSize);
    const offset = (pageNum - 1) * size;
    if (offset > MAX_SQL_INT) {
      return sendBadRequest(res, ['Số trang vượt quá giới hạn cho phép.']);
    }

    const conditions = [];
    const params = {};

    if (!isEmpty(q.search)) {
      conditions.push('(FullName LIKE @search OR Phone LIKE @search)');
      params.search = `%${escapeLike(q.search.trim())}%`;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await query(
      `SELECT COUNT(*) AS Total FROM dbo.Customers ${where}`,
      params
    );
    const total = Number(countResult.recordset[0].Total || 0);

    const listResult = await query(
      `SELECT Id, FullName, Phone, Points, CreatedAt
       FROM dbo.Customers
       ${where}
       ORDER BY FullName ASC, Id ASC
       OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY`,
      { ...params, offset, pageSize: size }
    );

    return res.status(200).json({
      success: true,
      data: listResult.recordset.map(mapCustomer),
      pagination: {
        page: pageNum,
        pageSize: size,
        total,
        totalPages: Math.ceil(total / size)
      },
      message: 'Lấy danh sách khách hàng thành công.'
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/customers/:id - Chi tiết một khách hàng
 * Quyền: Admin và Staff
 */
router.get('/:id', checkIdParam, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT Id, FullName, Phone, Points, CreatedAt
       FROM dbo.Customers
       WHERE Id = @id`,
      { id: req.customerId }
    );

    const row = result.recordset && result.recordset[0];
    if (!row) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy khách hàng.'
      });
    }

    return res.status(200).json({
      success: true,
      data: mapCustomer(row),
      message: 'Lấy thông tin khách hàng thành công.'
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/customers - Thêm khách hàng mới
 * Quyền: Admin và Staff
 */
router.post('/', async (req, res, next) => {
  try {
    const { errors, data } = validateCustomerBody(req.body);
    if (errors.length > 0) {
      return sendBadRequest(res, errors);
    }

    const existing = await query(
      'SELECT Id FROM dbo.Customers WHERE Phone = @phone',
      { phone: data.phone }
    );
    if (existing.recordset && existing.recordset.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Số điện thoại đã tồn tại trong hệ thống.'
      });
    }

    const insertResult = await query(
      `INSERT INTO dbo.Customers (FullName, Phone)
       OUTPUT INSERTED.Id, INSERTED.FullName, INSERTED.Phone, INSERTED.Points, INSERTED.CreatedAt
       VALUES (@fullName, @phone);`,
      data
    );

    return res.status(201).json({
      success: true,
      data: mapCustomer(insertResult.recordset[0]),
      message: 'Thêm khách hàng thành công.'
    });
  } catch (err) {
    if (err && (err.number === 2627 || err.number === 2601)) {
      return res.status(409).json({
        success: false,
        message: 'Số điện thoại đã tồn tại trong hệ thống.'
      });
    }
    next(err);
  }
});

/**
 * PUT /api/customers/:id - Cập nhật thông tin khách hàng
 * Quyền: Chỉ Admin
 */
router.put('/:id', requireRole('Admin'), checkIdParam, async (req, res, next) => {
  try {
    const { errors, data } = validateCustomerBody(req.body);
    if (errors.length > 0) {
      return sendBadRequest(res, errors);
    }

    const current = await query(
      'SELECT Id FROM dbo.Customers WHERE Id = @id',
      { id: req.customerId }
    );
    if (!current.recordset || current.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy khách hàng.'
      });
    }

    const duplicate = await query(
      'SELECT Id FROM dbo.Customers WHERE Phone = @phone AND Id <> @id',
      { phone: data.phone, id: req.customerId }
    );
    if (duplicate.recordset && duplicate.recordset.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Số điện thoại đã được sử dụng bởi khách hàng khác.'
      });
    }

    const updateResult = await query(
      `UPDATE dbo.Customers
       SET FullName = @fullName, Phone = @phone
       OUTPUT INSERTED.Id, INSERTED.FullName, INSERTED.Phone, INSERTED.Points, INSERTED.CreatedAt
       WHERE Id = @id;`,
      { ...data, id: req.customerId }
    );

    if (!updateResult.recordset || updateResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy khách hàng.'
      });
    }

    return res.status(200).json({
      success: true,
      data: mapCustomer(updateResult.recordset[0]),
      message: 'Cập nhật khách hàng thành công.'
    });
  } catch (err) {
    if (err && (err.number === 2627 || err.number === 2601)) {
      return res.status(409).json({
        success: false,
        message: 'Số điện thoại đã được sử dụng bởi khách hàng khác.'
      });
    }
    next(err);
  }
});

/**
 * DELETE /api/customers/:id - Xóa khách hàng
 * Quyền: Chỉ Admin
 */
router.delete('/:id', requireRole('Admin'), checkIdParam, async (req, res, next) => {
  try {
    const result = await query(
      'DELETE FROM dbo.Customers WHERE Id = @id',
      { id: req.customerId }
    );

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy khách hàng.'
      });
    }

    return res.status(200).json({
      success: true,
      data: { id: req.customerId },
      message: 'Xóa khách hàng thành công.'
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/customers/:id/earn - Cộng điểm theo giá trị hóa đơn
 * Quyền: Admin và Staff
 * Công thức: FLOOR(amount / 10000), amount là số nguyên từ 10000 đến 1000000000
 */
router.post('/:id/earn', checkIdParam, async (req, res, next) => {
  try {
    const amount = req.body ? req.body.amount : undefined;
    if (!isSqlPositiveInt(amount, MAX_EARN_AMOUNT) || Number(amount) < MIN_EARN_AMOUNT) {
      return sendBadRequest(res, [
        `Số tiền hóa đơn phải là số nguyên từ ${MIN_EARN_AMOUNT} đến ${MAX_EARN_AMOUNT}.`
      ]);
    }

    const amountNum = Number(amount);
    const pointsAdded = Math.floor(amountNum / 10000);

    const updateResult = await query(
      `UPDATE dbo.Customers
       SET Points = Points + @pointsAdded
       OUTPUT INSERTED.Id, INSERTED.FullName, INSERTED.Phone, INSERTED.Points, INSERTED.CreatedAt
       WHERE Id = @id;`,
      { id: req.customerId, pointsAdded }
    );

    const row = updateResult.recordset && updateResult.recordset[0];
    if (!row) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy khách hàng.'
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        ...mapCustomer(row),
        pointsAdded
      },
      message: `Đã cộng ${pointsAdded} điểm cho khách hàng.`
    });
  } catch (err) {
    if (err && err.number === 8115) {
      return sendBadRequest(res, ['Tổng điểm tích lũy vượt quá giới hạn cho phép.']);
    }
    next(err);
  }
});

/**
 * POST /api/customers/:id/redeem - Đổi điểm tích lũy (đảm bảo Points không bao giờ âm)
 * Quyền: Admin và Staff
 */
router.post('/:id/redeem', checkIdParam, async (req, res, next) => {
  try {
    const points = req.body ? req.body.points : undefined;
    if (!isSqlPositiveInt(points)) {
      return sendBadRequest(res, ['Số điểm muốn đổi phải là số nguyên dương hợp lệ.']);
    }

    const pointsNum = Number(points);

    // Trừ điểm nguyên tử ngay trong WHERE Points >= @points để tránh race-condition làm âm điểm
    const updateResult = await query(
      `UPDATE dbo.Customers
       SET Points = Points - @points
       OUTPUT INSERTED.Id, INSERTED.FullName, INSERTED.Phone, INSERTED.Points, INSERTED.CreatedAt
       WHERE Id = @id AND Points >= @points;`,
      { id: req.customerId, points: pointsNum }
    );

    if (updateResult.rowsAffected[0] === 0) {
      const checkCustomer = await query(
        'SELECT Id FROM dbo.Customers WHERE Id = @id',
        { id: req.customerId }
      );
      if (!checkCustomer.recordset || checkCustomer.recordset.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy khách hàng.'
        });
      }
      return sendBadRequest(res, ['Không đủ điểm']);
    }

    const row = updateResult.recordset[0];
    return res.status(200).json({
      success: true,
      data: {
        ...mapCustomer(row),
        pointsRedeemed: pointsNum
      },
      message: `Đã đổi ${pointsNum} điểm thành công.`
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
