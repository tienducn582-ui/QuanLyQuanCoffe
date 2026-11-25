/**
 * server/routes/tasks.js - API quản lý công việc (/api/tasks)
 * Thành viên phụ trách: TV3 (Công việc)
 *
 * Danh sách endpoint (toàn bộ router yêu cầu đăng nhập - verifyToken):
 * - GET    /api/tasks?search=&status=&priority=&categoryId=&shiftId=&assigneeId=&overdue=&page=1&pageSize=10
 *          (assigneeId = số nguyên dương hoặc 'me'; overdue = 1 chỉ lấy việc quá hạn - TV3-X5)
 * - GET    /api/tasks/:id
 * - GET    /api/tasks/:id/logs      (Admin và Staff - lịch sử thao tác, TV3-X5)
 * - POST   /api/tasks              (Admin và Staff)
 * - POST   /api/tasks/:id/comments  (Admin và Staff - bình luận, TV3-X5)
 * - PUT    /api/tasks/:id          (chỉ Admin)
 * - PATCH  /api/tasks/:id/status   (Admin và Staff)
 * - DELETE /api/tasks/:id          (chỉ Admin)
 *
 * Ghi lịch sử (bảng TaskLogs, TV3-X5): POST -> 'created'; PATCH status -> 'status';
 * PUT -> 'status' nếu Status đổi, 'updated' nếu trường khác đổi; bình luận -> 'comment'.
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
const MAX_COMMENT = 500;

// Điều kiện "quá hạn" theo QUY TẮC NGHIỆP VỤ của Hợp đồng mở rộng
const OVERDUE_CONDITION = "t.Deadline < CAST(GETDATE() AS DATE) AND t.Status <> 'Done'";

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

/* ------------------------------------------------------------------
   LỊCH SỬ CÔNG VIỆC (TaskLogs) - TV3-X5
   ------------------------------------------------------------------ */

const LOG_ACTIONS = ['created', 'updated', 'status', 'comment'];

/**
 * Cắt chuỗi cho vừa cột NVARCHAR(50) của OldValue / NewValue (null giữ nguyên null)
 */
function toLogValue(value) {
  if (value === undefined || value === null) return null;
  return String(value).slice(0, 50);
}

/**
 * Ghi một dòng vào bảng TaskLogs.
 * Dùng cho thao tác PHỤ (ghi lịch sử sau khi tạo, sửa, đổi trạng thái): lỗi chỉ ghi console,
 * KHÔNG ném lỗi ra ngoài, để thao tác chính (đã thành công) vẫn trả về bình thường.
 * Trả về true nếu ghi được, false nếu lỗi.
 */
async function addLog(taskId, userId, action, oldValue = null, newValue = null, comment = null) {
  try {
    if (!LOG_ACTIONS.includes(action)) throw new Error(`Action không hợp lệ: ${action}`);
    await query(
      `INSERT INTO dbo.TaskLogs (TaskId, UserId, Action, OldValue, NewValue, Comment)
       VALUES (@taskId, @userId, @action, @oldValue, @newValue, @comment)`,
      {
        taskId,
        userId: userId || null,
        action,
        oldValue: toLogValue(oldValue),
        newValue: toLogValue(newValue),
        comment: comment === null || comment === undefined ? null : String(comment).slice(0, MAX_COMMENT)
      }
    );
    return true;
  } catch (err) {
    console.error(`[TaskLogs] Không ghi được lịch sử (task ${taskId}, ${action}):`, err.message);
    return false;
  }
}

/**
 * So sánh dữ liệu cũ (dòng SQL) với dữ liệu mới (đã chuẩn hóa) của PUT,
 * trả về danh sách MÃ NGẮN của các trường (khác Status) đã thay đổi.
 * Mã ngắn để cả danh sách vừa cột NewValue NVARCHAR(50):
 * title, desc, prio, deadline, cat, shift, assignee (Frontend tự đổi sang chữ tiếng Việt).
 */
function changedFields(oldRow, data) {
  const pairs = [
    ['title', oldRow.Title, data.title],
    ['desc', oldRow.Description, data.description],
    ['prio', oldRow.Priority, data.priority],
    ['deadline', formatDate(oldRow.Deadline), data.deadline],
    ['cat', oldRow.CategoryId, data.categoryId],
    ['shift', oldRow.ShiftId, data.shiftId],
    ['assignee', oldRow.AssigneeId, data.assigneeId]
  ];
  const norm = v => (v === undefined || v === null || v === '' ? null : String(v));
  return pairs.filter(([, oldV, newV]) => norm(oldV) !== norm(newV)).map(([name]) => name);
}

/**
 * Đổi một dòng TaskLogs (kèm tên người thao tác) sang JSON camelCase
 */
function mapLog(row) {
  return {
    id: row.Id,
    action: row.Action,
    oldValue: row.OldValue,
    newValue: row.NewValue,
    comment: row.Comment,
    userName: row.UserName || null,
    // Chuỗi 'YYYY-MM-DD HH:mm:ss' theo giờ của SQL Server (đổi bằng CONVERT trong SQL)
    // để không bị lệch múi giờ khi driver mssql coi DATETIME2 là giờ UTC
    createdAt: row.CreatedAtText
  };
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
      errors.push('search phải là một chuỗi không quá 200 ký tự.');
    }
    // assigneeId: số nguyên dương hoặc 'me' (= người đang đăng nhập), giá trị khác thì 400
    let assigneeId = null;
    if (!isEmpty(q.assigneeId)) {
      if (q.assigneeId === 'me') assigneeId = Number(req.user.id);
      else if (isPositiveInt(q.assigneeId)) assigneeId = Number(q.assigneeId);
      else errors.push("assigneeId phải là số nguyên dương hoặc 'me'.");
    }
    // overdue: chỉ nhận 1 (lọc việc quá hạn) hoặc 0 / để trống (không lọc)
    if (!isEmpty(q.overdue) && q.overdue !== '1' && q.overdue !== '0') {
      errors.push('overdue chỉ nhận 1 (chỉ việc quá hạn) hoặc 0.');
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
    if (assigneeId !== null) {
      conditions.push('t.AssigneeId = @assigneeId');
      params.assigneeId = assigneeId;
    }
    if (q.overdue === '1') {
      // Đoạn SQL cố định, không chứa giá trị người dùng nhập
      conditions.push(`(${OVERDUE_CONDITION})`);
    }
    // Câu COUNT bên dưới dùng đúng biến where này nên pagination.total luôn khớp bộ lọc
    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // 4. Đếm tổng số bản ghi khớp điều kiện (truy vấn COUNT riêng)
    const countResult = await query(`SELECT COUNT(*) AS Total FROM dbo.Tasks t ${where}`, params);
    const total = countResult.recordset[0].Total;

    // 5. Lấy đúng một trang: Deadline tăng dần, việc không có Deadline xếp cuối
    const pageNum = Number(page);
    const size = Number(pageSize);
    const offset = (pageNum - 1) * size;
    if (!Number.isSafeInteger(offset) || offset > 2147483647) {
      return sendBadRequest(res, ['Số trang vượt quá giới hạn cho phép.']);
    }
    const listResult = await query(
      `${SELECT_TASK}
       ${where}
       ORDER BY CASE WHEN t.Deadline IS NULL THEN 1 ELSE 0 END, t.Deadline ASC, t.Id DESC
       OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY`,
      { ...params, offset, pageSize: size }
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
 * GET /api/tasks/:id/logs - Lịch sử thao tác và bình luận của một công việc (mới nhất trước)
 * Quyền: mọi tài khoản đã đăng nhập
 */
router.get('/:id/logs', checkIdParam, async (req, res, next) => {
  try {
    const exists = await query('SELECT 1 AS Found FROM dbo.Tasks WHERE Id = @id', { id: req.taskId });
    if (exists.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy công việc.' });
    }

    const result = await query(
      `SELECT l.Id, l.Action, l.OldValue, l.NewValue, l.Comment, l.CreatedAt,
              CONVERT(VARCHAR(19), l.CreatedAt, 120) AS CreatedAtText, u.FullName AS UserName
       FROM dbo.TaskLogs l
       LEFT JOIN dbo.Users u ON l.UserId = u.Id
       WHERE l.TaskId = @id
       ORDER BY l.CreatedAt DESC, l.Id DESC`,
      { id: req.taskId }
    );
    res.json({ success: true, data: result.recordset.map(mapLog), message: 'Lấy lịch sử công việc thành công.' });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/tasks/:id/comments - Thêm bình luận vào công việc { comment: 1-500 ký tự }
 * Quyền: Admin và Staff
 * Đây là thao tác CHÍNH (không phải log phụ) nên lỗi ghi CSDL sẽ trả về lỗi cho người dùng.
 */
router.post('/:id/comments', checkIdParam, async (req, res, next) => {
  try {
    const comment = req.body ? req.body.comment : undefined;
    if (!isString(comment, 1, MAX_COMMENT)) {
      return sendBadRequest(res, [`Bình luận là bắt buộc và dài từ 1 đến ${MAX_COMMENT} ký tự.`]);
    }

    // Chèn bình luận chỉ khi công việc tồn tại (INSERT ... SELECT ... WHERE EXISTS trong một câu lệnh)
    const result = await query(
      `INSERT INTO dbo.TaskLogs (TaskId, UserId, Action, Comment)
       OUTPUT INSERTED.Id
       SELECT @taskId, @userId, 'comment', @comment
       WHERE EXISTS (SELECT 1 FROM dbo.Tasks WHERE Id = @taskId)`,
      { taskId: req.taskId, userId: req.user.id, comment: comment.trim() }
    );
    if (result.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy công việc.' });
    }

    const logResult = await query(
      `SELECT l.Id, l.Action, l.OldValue, l.NewValue, l.Comment, l.CreatedAt,
              CONVERT(VARCHAR(19), l.CreatedAt, 120) AS CreatedAtText, u.FullName AS UserName
       FROM dbo.TaskLogs l
       LEFT JOIN dbo.Users u ON l.UserId = u.Id
       WHERE l.Id = @id`,
      { id: result.recordset[0].Id }
    );
    res.status(201).json({ success: true, data: mapLog(logResult.recordset[0]), message: 'Đã thêm bình luận.' });
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
    const newId = result.recordset[0].Id;
    await addLog(newId, req.user.id, 'created', null, data.status);
    const task = await findTaskById(newId);

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

    // OUTPUT DELETED.* trả về giá trị CŨ ngay trong câu UPDATE, dùng để ghi lịch sử chính xác
    const result = await query(
      `UPDATE dbo.Tasks
       SET Title = @title, Description = @description, Status = @status, Priority = @priority,
           Deadline = @deadline, CategoryId = @categoryId, ShiftId = @shiftId, AssigneeId = @assigneeId
       OUTPUT DELETED.Title, DELETED.Description, DELETED.Status, DELETED.Priority, DELETED.Deadline,
              DELETED.CategoryId, DELETED.ShiftId, DELETED.AssigneeId
       WHERE Id = @id`,
      { ...data, id: req.taskId }
    );
    if (result.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy công việc.' });
    }

    // Ghi lịch sử: 'status' nếu Status đổi, 'updated' nếu trường khác đổi (có thể ghi cả hai)
    const oldRow = result.recordset[0];
    if (oldRow.Status !== data.status) {
      await addLog(req.taskId, req.user.id, 'status', oldRow.Status, data.status);
    }
    const changed = changedFields(oldRow, data);
    if (changed.length > 0) {
      await addLog(req.taskId, req.user.id, 'updated', null, changed.join(','));
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
      'UPDATE dbo.Tasks SET Status = @status OUTPUT DELETED.Status AS OldStatus WHERE Id = @id',
      { status, id: req.taskId }
    );
    if (result.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy công việc.' });
    }

    // Ghi lịch sử khi trạng thái thật sự thay đổi (chọn lại đúng trạng thái cũ thì không ghi)
    const oldStatus = result.recordset[0].OldStatus;
    if (oldStatus !== status) {
      await addLog(req.taskId, req.user.id, 'status', oldStatus, status);
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
