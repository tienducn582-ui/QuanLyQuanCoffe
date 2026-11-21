/**
 * server/routes/templates.js - API mẫu việc / checklist mở - đóng ca (/api/templates)
 * Thành viên phụ trách: TV3 (tác vụ TV3-X3, ghi đè file khung của TV1-E0)
 *
 * Danh sách endpoint (toàn bộ router yêu cầu đăng nhập - verifyToken):
 * - GET    /api/templates?shiftId=      (mọi vai trò) danh sách mẫu kèm shiftName, categoryName
 * - POST   /api/templates               (chỉ Admin) tạo mẫu
 * - PUT    /api/templates/:id           (chỉ Admin) sửa mẫu (gồm bật/tắt IsActive)
 * - DELETE /api/templates/:id           (chỉ Admin) xóa mẫu
 * - POST   /api/templates/generate      (chỉ Admin) { shiftId, date? } sinh công việc cho ngày
 *
 * Quy tắc sinh việc (Hợp đồng mở rộng): Status 'Pending', AssigneeId NULL, Deadline = date;
 * bỏ qua mẫu nếu đã có Tasks cùng Title + ShiftId + Deadline. Trả { created, skipped }.
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

// Toàn bộ router mẫu việc đều cần đăng nhập
router.use(verifyToken);

// Khớp CHECK trong database/schema-mo-rong.sql
const PRIORITIES = ['Low', 'Medium', 'High'];
const MAX_TITLE = 200;
const MAX_DESCRIPTION = 500;

// Phần SELECT dùng chung: JOIN để lấy tên ca và tên danh mục
const SELECT_TEMPLATE = `
  SELECT tt.Id, tt.Title, tt.Description, tt.Priority, tt.CategoryId, c.Name AS CategoryName,
         tt.ShiftId, s.Name AS ShiftName, tt.IsActive
  FROM dbo.TaskTemplates tt
  INNER JOIN dbo.Shifts s ON tt.ShiftId = s.Id
  LEFT JOIN dbo.Categories c ON tt.CategoryId = c.Id
`;

/**
 * Coi undefined, null và chuỗi rỗng là "không có giá trị"
 */
function isEmpty(value) {
  return value === undefined || value === null || (typeof value === 'string' && value.trim() === '');
}

/**
 * Đổi dòng SQL sang JSON camelCase trả cho Frontend
 */
function mapTemplate(row) {
  return {
    id: row.Id,
    title: row.Title,
    description: row.Description || '',
    priority: row.Priority,
    categoryId: row.CategoryId,
    categoryName: row.CategoryName || null,
    shiftId: row.ShiftId,
    shiftName: row.ShiftName,
    isActive: Boolean(row.IsActive)
  };
}

/**
 * Lấy một mẫu theo id (null nếu không có)
 */
async function findTemplateById(id) {
  const result = await query(`${SELECT_TEMPLATE} WHERE tt.Id = @id`, { id });
  return result.recordset[0] ? mapTemplate(result.recordset[0]) : null;
}

/**
 * Đọc giá trị đúng/sai: nhận true/false hoặc 1/0 (số hay chuỗi). Trả null nếu không hợp lệ.
 */
function parseBool(value) {
  if (value === true || value === 1 || value === '1' || value === 'true') return true;
  if (value === false || value === 0 || value === '0' || value === 'false') return false;
  return null;
}

/**
 * Kiểm tra dữ liệu mẫu gửi lên cho POST và PUT. Trả { errors, data }.
 */
function validateTemplateBody(body) {
  const errors = [];
  const b = body || {};

  if (!isString(b.title, 1, MAX_TITLE)) {
    errors.push(`Tên mẫu việc là bắt buộc và dài từ 1 đến ${MAX_TITLE} ký tự.`);
  }
  if (!isEmpty(b.description) && !isString(b.description, 0, MAX_DESCRIPTION)) {
    errors.push(`Mô tả phải là chuỗi không quá ${MAX_DESCRIPTION} ký tự.`);
  }

  const priority = isEmpty(b.priority) ? 'Medium' : b.priority;
  if (!isOneOf(priority, PRIORITIES)) {
    errors.push('Mức ưu tiên chỉ nhận Low, Medium hoặc High.');
  }

  // Mẫu việc bắt buộc thuộc một ca (ShiftId NOT NULL trong CSDL)
  if (!isPositiveInt(b.shiftId)) {
    errors.push('Ca làm (shiftId) là bắt buộc và phải là số nguyên dương.');
  }
  if (!isEmpty(b.categoryId) && !isPositiveInt(b.categoryId)) {
    errors.push('Danh mục (categoryId) phải là số nguyên dương hoặc để trống.');
  }

  // IsActive: không gửi thì mặc định bật
  const isActive = b.isActive === undefined ? true : parseBool(b.isActive);
  if (isActive === null) {
    errors.push('isActive chỉ nhận true hoặc false.');
  }

  const data = {
    title: typeof b.title === 'string' ? b.title.trim() : b.title,
    description: isEmpty(b.description) ? null : String(b.description).trim(),
    priority,
    shiftId: isPositiveInt(b.shiftId) ? Number(b.shiftId) : null,
    categoryId: isEmpty(b.categoryId) ? null : Number(b.categoryId),
    isActive
  };
  return { errors, data };
}

/**
 * Kiểm tra ca và danh mục có tồn tại. Trả câu thông báo lỗi đầu tiên (404) hoặc null.
 */
async function checkReferences(data) {
  const shift = await query('SELECT 1 AS Found FROM dbo.Shifts WHERE Id = @id', { id: data.shiftId });
  if (shift.recordset.length === 0) return `Ca làm với id ${data.shiftId} không tồn tại.`;

  if (data.categoryId !== null) {
    const cat = await query('SELECT 1 AS Found FROM dbo.Categories WHERE Id = @id', { id: data.categoryId });
    if (cat.recordset.length === 0) return `Danh mục với id ${data.categoryId} không tồn tại.`;
  }
  return null;
}

/**
 * Middleware kiểm tra :id là số nguyên dương
 */
function checkIdParam(req, res, next) {
  if (!isPositiveInt(req.params.id)) {
    return sendBadRequest(res, ['Mã mẫu việc (id) phải là số nguyên dương.']);
  }
  req.templateId = Number(req.params.id);
  next();
}

function notFound(res, message = 'Không tìm thấy mẫu việc.') {
  return res.status(404).json({ success: false, message });
}

/**
 * GET /api/templates?shiftId= - Danh sách mẫu việc (lọc theo ca nếu có)
 * Quyền: mọi tài khoản đã đăng nhập
 */
router.get('/', async (req, res, next) => {
  try {
    const { shiftId } = req.query;
    if (!isEmpty(shiftId) && !isPositiveInt(shiftId)) {
      return sendBadRequest(res, ['shiftId phải là số nguyên dương.']);
    }

    const where = isEmpty(shiftId) ? '' : 'WHERE tt.ShiftId = @shiftId';
    const result = await query(
      `${SELECT_TEMPLATE} ${where} ORDER BY s.StartTime ASC, tt.Title ASC, tt.Id ASC`,
      isEmpty(shiftId) ? {} : { shiftId: Number(shiftId) }
    );
    res.json({ success: true, data: result.recordset.map(mapTemplate), message: 'Lấy danh sách mẫu việc thành công.' });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/templates/generate - Sinh công việc từ các mẫu đang bật của một ca cho một ngày
 * Body: { shiftId, date? (YYYY-MM-DD, mặc định hôm nay) }
 * Quyền: chỉ Admin. Đặt TRƯỚC các route /:id.
 */
router.post('/generate', requireRole('Admin'), async (req, res, next) => {
  try {
    const b = req.body || {};
    const errors = [];
    if (!isPositiveInt(b.shiftId)) errors.push('Ca làm (shiftId) là bắt buộc và phải là số nguyên dương.');
    if (!isEmpty(b.date) && !isISODate(b.date)) errors.push('Ngày (date) phải là ngày hợp lệ dạng YYYY-MM-DD.');
    if (errors.length > 0) return sendBadRequest(res, errors);

    const shiftId = Number(b.shiftId);
    const date = isEmpty(b.date) ? null : b.date.trim();

    const shift = await query('SELECT 1 AS Found FROM dbo.Shifts WHERE Id = @shiftId', { shiftId });
    if (shift.recordset.length === 0) return notFound(res, `Ca làm với id ${shiftId} không tồn tại.`);

    // Một batch T-SQL trong giao dịch:
    // - @d = ngày truyền lên, hoặc hôm nay theo đồng hồ SQL Server (khớp quy tắc "quá hạn")
    // - Mẫu trùng Title trong cùng ca chỉ lấy một (ROW_NUMBER) để không tự sinh trùng trong một lần bấm
    // - NOT EXISTS + UPDLOCK, HOLDLOCK: hai Admin bấm cùng lúc cũng không tạo việc trùng
    const result = await query(
      `SET XACT_ABORT ON;
       DECLARE @d DATE = COALESCE(TRY_CONVERT(DATE, @date, 23), CAST(GETDATE() AS DATE));
       DECLARE @created TABLE (Id INT);
       DECLARE @total INT;

       BEGIN TRAN;

       SELECT @total = COUNT(*) FROM dbo.TaskTemplates WHERE ShiftId = @shiftId AND IsActive = 1;

       WITH src AS (
         SELECT tt.Title, tt.Description, tt.Priority, tt.CategoryId, tt.ShiftId,
                ROW_NUMBER() OVER (PARTITION BY tt.Title ORDER BY tt.Id) AS Rn
         FROM dbo.TaskTemplates tt
         WHERE tt.ShiftId = @shiftId AND tt.IsActive = 1
       )
       INSERT INTO dbo.Tasks (Title, Description, Status, Priority, Deadline, CategoryId, ShiftId, AssigneeId)
       OUTPUT INSERTED.Id INTO @created (Id)
       SELECT src.Title, src.Description, N'Pending', src.Priority, @d, src.CategoryId, src.ShiftId, NULL
       FROM src
       WHERE src.Rn = 1
         AND NOT EXISTS (
           SELECT 1 FROM dbo.Tasks t WITH (UPDLOCK, HOLDLOCK)
           WHERE t.Title = src.Title AND t.ShiftId = src.ShiftId AND t.Deadline = @d
         );

       COMMIT;

       SELECT (SELECT COUNT(*) FROM @created) AS Created,
              @total - (SELECT COUNT(*) FROM @created) AS Skipped,
              CONVERT(CHAR(10), @d, 23) AS WorkDate;
       SELECT Id FROM @created;`,
      { shiftId, date }
    );

    const summary = result.recordsets[0][0];
    const createdIds = result.recordsets[1].map(r => r.Id);

    // Ghi lịch sử 'created' cho các việc vừa sinh (thao tác phụ: lỗi chỉ ghi console)
    if (createdIds.length > 0) {
      try {
        const params = { userId: req.user.id };
        const placeholders = createdIds.map((id, i) => {
          params[`id${i}`] = id;
          return `@id${i}`;
        });
        await query(
          `INSERT INTO dbo.TaskLogs (TaskId, UserId, Action, NewValue)
           SELECT Id, @userId, 'created', Status FROM dbo.Tasks WHERE Id IN (${placeholders.join(', ')})`,
          params
        );
      } catch (logErr) {
        console.error('[TaskLogs] Không ghi được lịch sử cho việc sinh từ mẫu:', logErr.message);
      }
    }

    res.json({
      success: true,
      data: { created: summary.Created, skipped: summary.Skipped, date: summary.WorkDate, taskIds: createdIds },
      message: `Đã tạo ${summary.Created} việc, bỏ qua ${summary.Skipped}.`
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/templates - Tạo mẫu việc
 * Quyền: chỉ Admin
 */
router.post('/', requireRole('Admin'), async (req, res, next) => {
  try {
    const { errors, data } = validateTemplateBody(req.body);
    if (errors.length > 0) return sendBadRequest(res, errors);

    const refError = await checkReferences(data);
    if (refError) return notFound(res, refError);

    const result = await query(
      `INSERT INTO dbo.TaskTemplates (Title, Description, Priority, CategoryId, ShiftId, IsActive)
       OUTPUT INSERTED.Id
       VALUES (@title, @description, @priority, @categoryId, @shiftId, @isActive)`,
      data
    );
    const template = await findTemplateById(result.recordset[0].Id);
    res.status(201).json({ success: true, data: template, message: 'Tạo mẫu việc thành công.' });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/templates/:id - Sửa toàn bộ mẫu việc (Frontend dùng cả cho công tắc bật/tắt)
 * Quyền: chỉ Admin
 */
router.put('/:id', requireRole('Admin'), checkIdParam, async (req, res, next) => {
  try {
    const { errors, data } = validateTemplateBody(req.body);
    if (errors.length > 0) return sendBadRequest(res, errors);

    const existing = await query('SELECT 1 AS Found FROM dbo.TaskTemplates WHERE Id = @id', { id: req.templateId });
    if (existing.recordset.length === 0) return notFound(res);

    const refError = await checkReferences(data);
    if (refError) return notFound(res, refError);

    const result = await query(
      `UPDATE dbo.TaskTemplates
       SET Title = @title, Description = @description, Priority = @priority,
           CategoryId = @categoryId, ShiftId = @shiftId, IsActive = @isActive
       WHERE Id = @id`,
      { ...data, id: req.templateId }
    );
    if (result.rowsAffected[0] === 0) return notFound(res);

    const template = await findTemplateById(req.templateId);
    res.json({ success: true, data: template, message: 'Cập nhật mẫu việc thành công.' });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/templates/:id - Xóa mẫu việc (các công việc đã sinh trước đó vẫn giữ nguyên)
 * Quyền: chỉ Admin
 */
router.delete('/:id', requireRole('Admin'), checkIdParam, async (req, res, next) => {
  try {
    const result = await query('DELETE FROM dbo.TaskTemplates WHERE Id = @id', { id: req.templateId });
    if (result.rowsAffected[0] === 0) return notFound(res);
    res.json({ success: true, data: { id: req.templateId }, message: 'Xóa mẫu việc thành công.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
