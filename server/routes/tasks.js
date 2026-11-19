/**
 * server/routes/tasks.js - API quản lý công việc (/api/tasks)
 * Thành viên phụ trách: TV3 (Công việc)
 *
 * Danh sách endpoint (toàn bộ router yêu cầu đăng nhập - verifyToken):
 * - GET    /api/tasks?search=&status=&priority=&categoryId=&shiftId=&page=1&pageSize=10
 * - GET    /api/tasks/:id
 * - POST   /api/tasks              (Admin và Staff)
 * - PUT    /api/tasks/:id          (chỉ Admin)
 * - PATCH  /api/tasks/:id/status   (Admin và Staff)
 * - DELETE /api/tasks/:id          (chỉ Admin)
 */

const express = require('express');
const { query } = require('../db');
const { verifyToken, requireRole } = require('../middleware/auth');
const {
  isString,
  isPositiveInt,
  isISODate,
  isOneOf,
  sendBadRequest
} = require('../utils/validators');

const router = express.Router();

// Toàn bộ router công việc đều cần đăng nhập
router.use(verifyToken);

// Các giá trị hợp lệ, khớp với ràng buộc CHECK trong database/schema.sql
const STATUSES = ['Pending', 'InProgress', 'Done'];
const PRIORITIES = ['Low', 'Medium', 'High'];
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;
const MAX_DESCRIPTION = 2000;

// Phần SELECT dùng chung: JOIN để lấy thêm tên danh mục, tên ca, tên người thực hiện
const SELECT_TASK = `
  SELECT t.Id, t.Title, t.Description, t.Status, t.Priority, t.Deadline,
         t.CategoryId, c.Name AS CategoryName,
         t.ShiftId, s.Name AS ShiftName,
         t.AssigneeId, u.FullName AS AssigneeName,
         t.CreatedAt
  FROM dbo.Tasks t
  LEFT JOIN dbo.Categories c ON t.CategoryId = c.Id
  LEFT JOIN dbo.Shifts s ON t.ShiftId = s.Id
  LEFT JOIN dbo.Users u ON t.AssigneeId = u.Id
`;

/**
 * Đổi cột DATE của mssql (kiểu Date, giờ UTC 00:00) sang chuỗi 'YYYY-MM-DD'
 */
function formatDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

/**
 * Đổi một dòng dữ liệu SQL (tên cột viết hoa) sang object JSON (camelCase) trả cho Frontend
 */
function mapTask(row) {
  return {
    id: row.Id,
    title: row.Title,
    description: row.Description || '',
    status: row.Status,
    priority: row.Priority,
    deadline: formatDate(row.Deadline),
    categoryId: row.CategoryId,
    categoryName: row.CategoryName || null,
    shiftId: row.ShiftId,
    shiftName: row.ShiftName || null,
    assigneeId: row.AssigneeId,
    assigneeName: row.AssigneeName || null,
    createdAt: row.CreatedAt instanceof Date ? row.CreatedAt.toISOString() : row.CreatedAt
  };
}

/**
 * Coi undefined, null và chuỗi rỗng là "không có giá trị"
 */
function isEmpty(value) {
  return value === undefined || value === null || (typeof value === 'string' && value.trim() === '');
}

/**
 * Escape các ký tự đặc biệt của LIKE trong SQL Server: [ % _
 * Ví dụ: '50%' -> '50[%]' để tìm đúng chữ "50%" chứ không phải "50 + bất kỳ"
 * (Dấu ' không cần xử lý vì giá trị được truyền bằng tham số, không nối chuỗi.)
 */
function escapeLike(text) {
  return text.replace(/\[/g, '[[]').replace(/%/g, '[%]').replace(/_/g, '[_]');
}

/**
 * Lấy một công việc theo id (trả null nếu không có)
 */
async function findTaskById(id) {
  const result = await query(`${SELECT_TASK} WHERE t.Id = @id`, { id });
  return result.recordset[0] ? mapTask(result.recordset[0]) : null;
}

/**
 * Kiểm tra dữ liệu gửi lên cho POST và PUT.
 * Trả về { errors, data } với data là giá trị đã chuẩn hóa để ghi vào CSDL.
 */
function validateTaskBody(body) {
  const errors = [];
  const b = body || {};

  // Title: bắt buộc, 1-200 ký tự
  if (!isString(b.title, 1, 200)) {
    errors.push('Tên công việc là bắt buộc và dài từ 1 đến 200 ký tự.');
  }

  // Description: không bắt buộc, tối đa MAX_DESCRIPTION ký tự
  if (!isEmpty(b.description) && !isString(b.description, 0, MAX_DESCRIPTION)) {
    errors.push(`Mô tả phải là chuỗi không quá ${MAX_DESCRIPTION} ký tự.`);
  }

  // Status và Priority: không gửi thì dùng giá trị mặc định
  const status = isEmpty(b.status) ? 'Pending' : b.status;
  if (!isOneOf(status, STATUSES)) {
    errors.push('Trạng thái chỉ nhận Pending, InProgress hoặc Done.');
  }
  const priority = isEmpty(b.priority) ? 'Medium' : b.priority;
  if (!isOneOf(priority, PRIORITIES)) {
    errors.push('Mức ưu tiên chỉ nhận Low, Medium hoặc High.');
  }

  // Deadline: null hoặc ngày thật dạng YYYY-MM-DD
  if (!isEmpty(b.deadline) && !isISODate(b.deadline)) {
    errors.push('Hạn chót phải là ngày hợp lệ dạng YYYY-MM-DD.');
  }

  // Các khóa ngoại: null hoặc số nguyên dương
  const fkFields = [
    ['categoryId', 'Danh mục'],
    ['shiftId', 'Ca làm'],
    ['assigneeId', 'Người thực hiện']
  ];
  for (const [field, label] of fkFields) {
    if (!isEmpty(b[field]) && !isPositiveInt(b[field])) {
      errors.push(`${label} (${field}) phải là số nguyên dương hoặc để trống.`);
    }
  }

  const data = {
    title: typeof b.title === 'string' ? b.title.trim() : b.title,
    description: isEmpty(b.description) ? null : String(b.description).trim(),
    status,
    priority,
    deadline: isEmpty(b.deadline) ? null : String(b.deadline).trim(),
    categoryId: isEmpty(b.categoryId) ? null : Number(b.categoryId),
    shiftId: isEmpty(b.shiftId) ? null : Number(b.shiftId),
    assigneeId: isEmpty(b.assigneeId) ? null : Number(b.assigneeId)
  };

  return { errors, data };
}

/**
 * Kiểm tra CategoryId, ShiftId, AssigneeId có tồn tại trong CSDL hay không.
 * Chỉ kiểm tra các trường khác null. Trả về mảng lỗi.
 */
async function checkReferences(data) {
  const checks = [
    ['categoryId', 'dbo.Categories', 'Danh mục'],
    ['shiftId', 'dbo.Shifts', 'Ca làm'],
    ['assigneeId', 'dbo.Users', 'Người thực hiện']
  ];
  const errors = [];
  for (const [field, table, label] of checks) {
    if (data[field] === null) continue;
    // Tên bảng lấy từ danh sách cố định ở trên (không lấy từ người dùng) nên an toàn
    const result = await query(`SELECT 1 AS Found FROM ${table} WHERE Id = @id`, { id: data[field] });
    if (result.recordset.length === 0) {
      errors.push(`${label} với id ${data[field]} không tồn tại.`);
    }
  }
  return errors;
}

/**
 * Middleware kiểm tra :id trên URL là số nguyên dương, sai thì 400
 */
function checkIdParam(req, res, next) {
  if (!isPositiveInt(req.params.id)) {
    return sendBadRequest(res, ['Mã công việc (id) phải là số nguyên dương.']);
  }
  req.taskId = Number(req.params.id);
  next();
}

/**
 * GET /api/tasks - Danh sách công việc có tìm kiếm, lọc và phân trang
 * Quyền: mọi tài khoản đã đăng nhập
 */
router.get('/', async (req, res, next) => {
  try {
    const q = req.query;
    const errors = [];

    // 1. Kiểm tra tham số phân trang
    const page = isEmpty(q.page) ? 1 : q.page;
    const pageSize = isEmpty(q.pageSize) ? DEFAULT_PAGE_SIZE : q.pageSize;
    if (!isPositiveInt(page)) errors.push('page phải là số nguyên dương.');
    if (!isPositiveInt(pageSize) || Number(pageSize) > MAX_PAGE_SIZE) {
      errors.push(`pageSize phải là số nguyên từ 1 đến ${MAX_PAGE_SIZE}.`);
    }

    // 2. Kiểm tra tham số lọc
    if (!isEmpty(q.status) && !isOneOf(q.status, STATUSES)) {
      errors.push('status chỉ nhận Pending, InProgress hoặc Done.');
    }
    if (!isEmpty(q.priority) && !isOneOf(q.priority, PRIORITIES)) {
      errors.push('priority chỉ nhận Low, Medium hoặc High.');
    }
    if (!isEmpty(q.categoryId) && !isPositiveInt(q.categoryId)) {
      errors.push('categoryId phải là số nguyên dương.');
    }
    if (!isEmpty(q.shiftId) && !isPositiveInt(q.shiftId)) {
      errors.push('shiftId phải là số nguyên dương.');
    }
    if (!isEmpty(q.search) && !isString(q.search, 1, 200)) {
      errors.push('search không được dài quá 200 ký tự.');
    }
    if (errors.length > 0) return sendBadRequest(res, errors);

    // 3. Ghép điều kiện WHERE. Chỉ ghép các đoạn SQL cố định,
    //    còn giá trị người dùng nhập luôn đi qua tham số @...
    const conditions = [];
    const params = {};

    if (!isEmpty(q.search)) {
      conditions.push('(t.Title LIKE @search OR t.Description LIKE @search)');
      params.search = `%${escapeLike(q.search.trim())}%`;
    }
    if (!isEmpty(q.status)) {
      conditions.push('t.Status = @status');
      params.status = q.status;
    }
    if (!isEmpty(q.priority)) {
      conditions.push('t.Priority = @priority');
      params.priority = q.priority;
    }
    if (!isEmpty(q.categoryId)) {
      conditions.push('t.CategoryId = @categoryId');
      params.categoryId = Number(q.categoryId);
    }
    if (!isEmpty(q.shiftId)) {
      conditions.push('t.ShiftId = @shiftId');
      params.shiftId = Number(q.shiftId);
    }
    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // 4. Đếm tổng số bản ghi khớp điều kiện (truy vấn COUNT riêng)
    const countResult = await query(`SELECT COUNT(*) AS Total FROM dbo.Tasks t ${where}`, params);
    const total = countResult.recordset[0].Total;

    // 5. Lấy đúng một trang: Deadline tăng dần, việc không có Deadline xếp cuối
    const pageNum = Number(page);
    const size = Number(pageSize);
    const listResult = await query(
      `${SELECT_TASK}
       ${where}
       ORDER BY CASE WHEN t.Deadline IS NULL THEN 1 ELSE 0 END, t.Deadline ASC, t.Id DESC
       OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY`,
      { ...params, offset: (pageNum - 1) * size, pageSize: size }
    );

    // Nếu page vượt quá tổng số trang thì data là mảng rỗng, Frontend tự lùi về trang cuối
    res.json({
      success: true,
      data: listResult.recordset.map(mapTask),
      pagination: {
        page: pageNum,
        pageSize: size,
        total,
        totalPages: Math.ceil(total / size)
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/tasks/:id - Chi tiết một công việc
 * Quyền: mọi tài khoản đã đăng nhập
 */
router.get('/:id', checkIdParam, async (req, res, next) => {
  try {
    const task = await findTaskById(req.taskId);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy công việc.' });
    }
    res.json({ success: true, data: task, message: 'Lấy chi tiết công việc thành công.' });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/tasks - Tạo công việc mới
 * Quyền: Admin và Staff
 */
router.post('/', async (req, res, next) => {
  try {
    const { errors, data } = validateTaskBody(req.body);
    if (errors.length > 0) return sendBadRequest(res, errors);

    const refErrors = await checkReferences(data);
    if (refErrors.length > 0) return sendBadRequest(res, refErrors);

    const result = await query(
      `INSERT INTO dbo.Tasks (Title, Description, Status, Priority, Deadline, CategoryId, ShiftId, AssigneeId)
       OUTPUT INSERTED.Id
       VALUES (@title, @description, @status, @priority, @deadline, @categoryId, @shiftId, @assigneeId)`,
      data
    );
    const task = await findTaskById(result.recordset[0].Id);

    res.status(201).json({ success: true, data: task, message: 'Tạo công việc thành công.' });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/tasks/:id - Sửa toàn bộ thông tin công việc
 * Quyền: chỉ Admin
 */
router.put('/:id', requireRole('Admin'), checkIdParam, async (req, res, next) => {
  try {
    const { errors, data } = validateTaskBody(req.body);
    if (errors.length > 0) return sendBadRequest(res, errors);

    const refErrors = await checkReferences(data);
    if (refErrors.length > 0) return sendBadRequest(res, refErrors);

    const result = await query(
      `UPDATE dbo.Tasks
       SET Title = @title, Description = @description, Status = @status, Priority = @priority,
           Deadline = @deadline, CategoryId = @categoryId, ShiftId = @shiftId, AssigneeId = @assigneeId
       WHERE Id = @id`,
      { ...data, id: req.taskId }
    );
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy công việc.' });
    }

    const task = await findTaskById(req.taskId);
    res.json({ success: true, data: task, message: 'Cập nhật công việc thành công.' });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/tasks/:id/status - Chỉ đổi trạng thái công việc
 * Quyền: Admin và Staff
 */
router.patch('/:id/status', checkIdParam, async (req, res, next) => {
  try {
    const status = req.body ? req.body.status : undefined;
    if (!isOneOf(status, STATUSES)) {
      return sendBadRequest(res, ['Trạng thái chỉ nhận Pending, InProgress hoặc Done.']);
    }

    const result = await query(
      'UPDATE dbo.Tasks SET Status = @status WHERE Id = @id',
      { status, id: req.taskId }
    );
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy công việc.' });
    }

    const task = await findTaskById(req.taskId);
    res.json({ success: true, data: task, message: 'Cập nhật trạng thái thành công.' });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/tasks/:id - Xóa công việc
 * Quyền: chỉ Admin
 */
router.delete('/:id', requireRole('Admin'), checkIdParam, async (req, res, next) => {
  try {
    const result = await query('DELETE FROM dbo.Tasks WHERE Id = @id', { id: req.taskId });
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy công việc.' });
    }
    res.json({ success: true, data: { id: req.taskId }, message: 'Xóa công việc thành công.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
