/**
 * Router: /api/ingredients
 * Thành viên phụ trách: TV4 (Cơ sở dữ liệu, Thống kê, Kiểm thử)
 * Mô tả: Phân hệ Kho tối giản và cảnh báo sắp hết [TV4-X7]
 *   - GET /: Danh sách nguyên liệu (tìm kiếm, lọc sắp hết, phân trang)
 *   - GET /:id: Chi tiết một nguyên liệu
 *   - POST /: Thêm mới nguyên liệu (Chỉ Admin)
 *   - PUT /:id: Cập nhật thông tin nguyên liệu (Chỉ Admin)
 *   - DELETE /:id: Xóa nguyên liệu (Chỉ Admin)
 *   - PATCH /:id/stock: Nhập/xuất kho (delta), tự tạo Task nhập hàng khi chạm ngưỡng (Admin & Staff)
 */

const express = require('express');
const router = express.Router();

const { query } = require('../db');
const { verifyToken, requireRole } = require('../middleware/auth');

// Yêu cầu đăng nhập toàn bộ router
router.use(verifyToken);

/**
 * Hàm hỗ trợ escape ký tự đặc biệt trong câu lệnh LIKE SQL Server
 */
function escapeLike(str) {
  if (!str) return '';
  return str.replace(/\[/g, '[[]').replace(/%/g, '[%]').replace(/_/g, '[_]');
}

const MAX_SQL_INT = 2147483647;
const MAX_DECIMAL_10_2 = 99999999.99;

/**
 * Kiểm tra giá trị số hợp lệ (không rỗng, hữu hạn, trong khoảng 0..1,000,000)
 */
function parseIngredientNumber(val, defaultVal = 0) {
  if (val === undefined || val === null) return defaultVal;
  if (typeof val === 'string' && val.trim() === '') return NaN;
  const num = Number(val);
  return Number.isFinite(num) ? num : NaN;
}

/**
 * 1. GET /api/ingredients
 * Tìm kiếm theo tên, lọc lowOnly=1 (Quantity <= MinQuantity), phân trang chuẩn
 */
router.get('/', async (req, res) => {
  try {
    const search = req.query.search ? String(req.query.search).trim() : '';
    const lowOnly = req.query.lowOnly === '1' || req.query.lowOnly === 'true';

    let page = parseInt(req.query.page, 10);
    if (isNaN(page) || page < 1) page = 1;

    let pageSize = parseInt(req.query.pageSize, 10);
    if (isNaN(pageSize) || pageSize < 1) pageSize = 10;
    if (pageSize > 50) pageSize = 50;

    const offset = (page - 1) * pageSize;
    if (!Number.isSafeInteger(offset) || offset > MAX_SQL_INT) {
      return res.status(400).json({
        success: false,
        message: 'Số trang vượt quá giới hạn cho phép'
      });
    }

    // Xây dựng điều kiện WHERE động có tham số hóa
    const conditions = [];
    const params = { offset, pageSize };

    if (search) {
      conditions.push(`Name LIKE @searchEscaped`);
      params.searchEscaped = `%${escapeLike(search)}%`;
    }

    if (lowOnly) {
      conditions.push(`Quantity <= MinQuantity`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // 1. Đếm tổng số bản ghi
    const countSql = `SELECT COUNT(*) AS total FROM dbo.Ingredients ${whereClause};`;
    const countResult = await query(countSql, params);
    const total = Number(countResult.recordset[0]?.total || 0);
    const totalPages = Math.ceil(total / pageSize) || 1;

    // 2. Lấy danh sách nguyên liệu phân trang
    const listSql = `
      SELECT 
        Id,
        Name,
        Unit,
        Quantity,
        MinQuantity,
        CONVERT(VARCHAR(19), UpdatedAt, 120) AS UpdatedAtText,
        CASE WHEN Quantity <= MinQuantity THEN 1 ELSE 0 END AS isLow
      FROM dbo.Ingredients
      ${whereClause}
      ORDER BY 
        CASE WHEN Quantity <= MinQuantity THEN 0 ELSE 1 END,
        Name ASC
      OFFSET @offset ROWS
      FETCH NEXT @pageSize ROWS ONLY;
    `;
    const listResult = await query(listSql, params);

    const data = listResult.recordset.map(row => ({
      id: Number(row.Id),
      name: row.Name,
      unit: row.Unit,
      quantity: Number(row.Quantity),
      minQuantity: Number(row.MinQuantity),
      isLow: Boolean(row.isLow),
      updatedAt: row.UpdatedAtText
    }));

    return res.status(200).json({
      success: true,
      data,
      pagination: {
        page,
        pageSize,
        total,
        totalPages
      },
      message: 'Lấy danh sách nguyên liệu thành công'
    });
  } catch (error) {
    console.error('[TV4 - Ingredients GET Error]:', error.message || error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi lấy danh sách nguyên liệu'
    });
  }
});

/**
 * 2. GET /api/ingredients/:id
 * Lấy thông tin chi tiết một nguyên liệu (404 nếu không thấy)
 */
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Mã nguyên liệu không hợp lệ'
      });
    }

    const sql = `
      SELECT 
        Id,
        Name,
        Unit,
        Quantity,
        MinQuantity,
        CONVERT(VARCHAR(19), UpdatedAt, 120) AS UpdatedAtText,
        CASE WHEN Quantity <= MinQuantity THEN 1 ELSE 0 END AS isLow
      FROM dbo.Ingredients
      WHERE Id = @id;
    `;
    const result = await query(sql, { id });
    const row = result.recordset[0];

    if (!row) {
      return res.status(404).json({
        success: false,
        message: 'Nguyên liệu không tồn tại'
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        id: Number(row.Id),
        name: row.Name,
        unit: row.Unit,
        quantity: Number(row.Quantity),
        minQuantity: Number(row.MinQuantity),
        isLow: Boolean(row.isLow),
        updatedAt: row.UpdatedAtText
      },
      message: 'Lấy thông tin nguyên liệu thành công'
    });
  } catch (error) {
    console.error('[TV4 - Ingredients GET :id Error]:', error.message || error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi lấy thông tin nguyên liệu'
    });
  }
});

/**
 * 3. POST /api/ingredients [Chỉ Admin]
 * Thêm nguyên liệu mới: Name 1-100, Unit 1-20, Quantity & MinQuantity 0..1000000
 * Trùng tên trả 409
 */
router.post('/', requireRole('Admin'), async (req, res) => {
  try {
    const { name, unit, quantity, minQuantity } = req.body || {};

    const trimmedName = typeof name === 'string' ? name.trim() : '';
    const trimmedUnit = typeof unit === 'string' ? unit.trim() : '';
    const numQty = parseIngredientNumber(quantity, 0);
    const numMin = parseIngredientNumber(minQuantity, 0);

    const errors = [];
    if (!trimmedName || trimmedName.length < 1 || trimmedName.length > 100) {
      errors.push('Tên nguyên liệu phải từ 1 đến 100 ký tự');
    }
    if (!trimmedUnit || trimmedUnit.length < 1 || trimmedUnit.length > 20) {
      errors.push('Đơn vị tính phải từ 1 đến 20 ký tự');
    }
    if (isNaN(numQty) || numQty < 0 || numQty > 1000000) {
      errors.push('Số lượng tồn kho phải là số từ 0 đến 1,000,000');
    }
    if (isNaN(numMin) || numMin < 0 || numMin > 1000000) {
      errors.push('Ngưỡng tối thiểu phải là số từ 0 đến 1,000,000');
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu nguyên liệu không hợp lệ',
        errors
      });
    }

    // Kiểm tra trùng tên
    const checkSql = `SELECT 1 FROM dbo.Ingredients WHERE Name = @name;`;
    const checkRes = await query(checkSql, { name: trimmedName });
    if (checkRes.recordset.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Tên nguyên liệu đã tồn tại trong kho'
      });
    }

    const insertSql = `
      INSERT INTO dbo.Ingredients (Name, Unit, Quantity, MinQuantity, UpdatedAt)
      OUTPUT INSERTED.Id, INSERTED.Name, INSERTED.Unit, INSERTED.Quantity, INSERTED.MinQuantity,
             CONVERT(VARCHAR(19), INSERTED.UpdatedAt, 120) AS UpdatedAtText
      VALUES (@name, @unit, @quantity, @minQuantity, GETDATE());
    `;
    const insertRes = await query(insertSql, {
      name: trimmedName,
      unit: trimmedUnit,
      quantity: numQty,
      minQuantity: numMin
    });
    const inserted = insertRes.recordset[0];

    return res.status(201).json({
      success: true,
      data: {
        id: Number(inserted.Id),
        name: inserted.Name,
        unit: inserted.Unit,
        quantity: Number(inserted.Quantity),
        minQuantity: Number(inserted.MinQuantity),
        isLow: Number(inserted.Quantity) <= Number(inserted.MinQuantity),
        updatedAt: inserted.UpdatedAtText
      },
      message: 'Thêm nguyên liệu vào kho thành công'
    });
  } catch (error) {
    if (error && (error.number === 2627 || error.number === 2601)) {
      return res.status(409).json({
        success: false,
        message: 'Tên nguyên liệu đã tồn tại trong kho'
      });
    }
    console.error('[TV4 - Ingredients POST Error]:', error.message || error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi thêm nguyên liệu'
    });
  }
});

/**
 * 4. PUT /api/ingredients/:id [Chỉ Admin]
 * Cập nhật nguyên liệu: Name 1-100, Unit 1-20, Quantity & MinQuantity 0..1000000
 */
router.put('/:id', requireRole('Admin'), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Mã nguyên liệu không hợp lệ'
      });
    }

    // Kiểm tra tồn tại
    const existRes = await query(`SELECT 1 FROM dbo.Ingredients WHERE Id = @id;`, { id });
    if (existRes.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Nguyên liệu không tồn tại'
      });
    }

    const { name, unit, quantity, minQuantity } = req.body || {};
    const trimmedName = typeof name === 'string' ? name.trim() : '';
    const trimmedUnit = typeof unit === 'string' ? unit.trim() : '';
    const numQty = parseIngredientNumber(quantity, 0);
    const numMin = parseIngredientNumber(minQuantity, 0);

    const errors = [];
    if (!trimmedName || trimmedName.length < 1 || trimmedName.length > 100) {
      errors.push('Tên nguyên liệu phải từ 1 đến 100 ký tự');
    }
    if (!trimmedUnit || trimmedUnit.length < 1 || trimmedUnit.length > 20) {
      errors.push('Đơn vị tính phải từ 1 đến 20 ký tự');
    }
    if (isNaN(numQty) || numQty < 0 || numQty > 1000000) {
      errors.push('Số lượng tồn kho phải là số từ 0 đến 1,000,000');
    }
    if (isNaN(numMin) || numMin < 0 || numMin > 1000000) {
      errors.push('Ngưỡng tối thiểu phải là số từ 0 đến 1,000,000');
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu nguyên liệu không hợp lệ',
        errors
      });
    }

    // Kiểm tra trùng tên với nguyên liệu khác
    const dupSql = `SELECT 1 FROM dbo.Ingredients WHERE Name = @name AND Id <> @id;`;
    const dupRes = await query(dupSql, { name: trimmedName, id });
    if (dupRes.recordset.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Tên nguyên liệu đã được sử dụng cho mục khác'
      });
    }

    const updateSql = `
      UPDATE dbo.Ingredients
      SET Name = @name, Unit = @unit, Quantity = @quantity, MinQuantity = @minQuantity, UpdatedAt = GETDATE()
      OUTPUT INSERTED.Id, INSERTED.Name, INSERTED.Unit, INSERTED.Quantity, INSERTED.MinQuantity,
             CONVERT(VARCHAR(19), INSERTED.UpdatedAt, 120) AS UpdatedAtText
      WHERE Id = @id;
    `;
    const updateRes = await query(updateSql, {
      id,
      name: trimmedName,
      unit: trimmedUnit,
      quantity: numQty,
      minQuantity: numMin
    });
    const updated = updateRes.recordset[0];

    return res.status(200).json({
      success: true,
      data: {
        id: Number(updated.Id),
        name: updated.Name,
        unit: updated.Unit,
        quantity: Number(updated.Quantity),
        minQuantity: Number(updated.MinQuantity),
        isLow: Number(updated.Quantity) <= Number(updated.MinQuantity),
        updatedAt: updated.UpdatedAtText
      },
      message: 'Cập nhật nguyên liệu thành công'
    });
  } catch (error) {
    if (error && (error.number === 2627 || error.number === 2601)) {
      return res.status(409).json({
        success: false,
        message: 'Tên nguyên liệu đã được sử dụng cho mục khác'
      });
    }
    console.error('[TV4 - Ingredients PUT Error]:', error.message || error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi cập nhật nguyên liệu'
    });
  }
});

/**
 * 5. DELETE /api/ingredients/:id [Chỉ Admin]
 * Xóa nguyên liệu khỏi kho
 */
router.delete('/:id', requireRole('Admin'), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Mã nguyên liệu không hợp lệ'
      });
    }

    const checkSql = `SELECT 1 FROM dbo.Ingredients WHERE Id = @id;`;
    const checkRes = await query(checkSql, { id });
    if (checkRes.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Nguyên liệu không tồn tại'
      });
    }

    await query(`DELETE FROM dbo.Ingredients WHERE Id = @id;`, { id });

    return res.status(200).json({
      success: true,
      message: 'Đã xóa nguyên liệu khỏi kho thành công'
    });
  } catch (error) {
    console.error('[TV4 - Ingredients DELETE Error]:', error.message || error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi xóa nguyên liệu'
    });
  }
});

/**
 * 6. PATCH /api/ingredients/:id/stock { delta } [Admin & Staff]
 * Nhập (+) hoặc Xuất (-) kho
 * delta là số khác 0, |delta| <= 100000; kết quả Quantity < 0 thì 400 'Tồn kho không đủ'.
 * Gộp trong MỘT lần gọi query() với T-SQL batch có SET XACT_ABORT ON và BEGIN TRAN:
 *   - UPDATE Ingredients (Quantity += delta)
 *   - Nếu Quantity <= MinQuantity và chưa có Tasks với Title = N'Nhập hàng: ' + Name (Status <> 'Done')
 *     thì INSERT vào Tasks (Description N'Tự tạo từ cảnh báo kho', Status 'Pending', Priority 'High', Deadline hôm nay, CategoryId 'Kho và mua hàng')
 *   - COMMIT TRAN
 *   - Trả { ingredient, autoTaskCreated }
 */
router.patch('/:id/stock', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Mã nguyên liệu không hợp lệ'
      });
    }

    const { delta } = req.body;
    if (delta === undefined || delta === null || delta === '') {
      return res.status(400).json({
        success: false,
        message: 'Thiếu số lượng thay đổi (delta)'
      });
    }

    const numDelta = Number(delta);
    if (isNaN(numDelta) || numDelta === 0) {
      return res.status(400).json({
        success: false,
        message: 'Số lượng thay đổi (delta) phải là số khác 0'
      });
    }

    if (Math.abs(numDelta) > 100000) {
      return res.status(400).json({
        success: false,
        message: 'Số lượng thay đổi mỗi lần tối đa là 100,000'
      });
    }

    // Thực hiện toàn bộ giao dịch trong MỘT lần gọi query()
    const batchSql = `
      SET NOCOUNT ON;
      SET XACT_ABORT ON;
      BEGIN TRAN;

      DECLARE @currQty DECIMAL(10,2), @minQty DECIMAL(10,2), @ingName NVARCHAR(100);
      SELECT @currQty = Quantity, @minQty = MinQuantity, @ingName = Name 
      FROM dbo.Ingredients WITH (UPDLOCK, ROWLOCK)
      WHERE Id = @id;

      IF @currQty IS NULL
      BEGIN
        ROLLBACK TRAN;
        THROW 50001, N'Nguyên liệu không tồn tại', 1;
      END;

      IF @currQty + @delta < 0
      BEGIN
        ROLLBACK TRAN;
        THROW 50002, N'Tồn kho không đủ', 1;
      END;

      IF @currQty + @delta > ${MAX_DECIMAL_10_2}
      BEGIN
        ROLLBACK TRAN;
        THROW 50003, N'Số lượng tồn kho vượt quá giới hạn cho phép', 1;
      END;

      UPDATE dbo.Ingredients 
      SET Quantity = Quantity + @delta, UpdatedAt = GETDATE()
      WHERE Id = @id;

      DECLARE @newQty DECIMAL(10,2);
      SET @newQty = @currQty + @delta;

      DECLARE @autoTaskCreated BIT = 0;
      DECLARE @taskTitle NVARCHAR(200) = N'Nhập hàng: ' + @ingName;

      IF @newQty <= @minQty
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM dbo.Tasks 
          WHERE Title = @taskTitle AND Status <> 'Done'
        )
        BEGIN
          DECLARE @catId INT;
          SELECT @catId = Id FROM dbo.Categories WHERE Name = N'Kho và mua hàng';

          INSERT INTO dbo.Tasks (Title, Description, Status, Priority, Deadline, CategoryId, CreatedAt)
          VALUES (
            @taskTitle, 
            N'Tự tạo từ cảnh báo kho', 
            'Pending', 
            'High', 
            CAST(GETDATE() AS DATE), 
            @catId, 
            GETDATE()
          );
          SET @autoTaskCreated = 1;
        END;
      END;

      COMMIT TRAN;

      SELECT 
        Id, Name, Unit, Quantity, MinQuantity,
        CONVERT(VARCHAR(19), UpdatedAt, 120) AS UpdatedAtText,
        CASE WHEN Quantity <= MinQuantity THEN 1 ELSE 0 END AS isLow,
        @autoTaskCreated AS autoTaskCreated
      FROM dbo.Ingredients
      WHERE Id = @id;
    `;

    const result = await query(batchSql, { id, delta: numDelta });
    const row = result.recordset[0];

    const autoTaskCreated = Boolean(row.autoTaskCreated);
    const ingredient = {
      id: Number(row.Id),
      name: row.Name,
      unit: row.Unit,
      quantity: Number(row.Quantity),
      minQuantity: Number(row.MinQuantity),
      isLow: Boolean(row.isLow),
      updatedAt: row.UpdatedAtText
    };

    return res.status(200).json({
      success: true,
      data: {
        ingredient,
        autoTaskCreated
      },
      message: autoTaskCreated 
        ? 'Cập nhật kho thành công. Đã tự động tạo việc Nhập hàng do tồn kho chạm ngưỡng tối thiểu!'
        : 'Cập nhật số lượng kho thành công'
    });
  } catch (error) {
    if (error.number === 50001 || error.message?.includes('Nguyên liệu không tồn tại')) {
      return res.status(404).json({
        success: false,
        message: 'Nguyên liệu không tồn tại'
      });
    }
    if (error.number === 50002 || error.message?.includes('Tồn kho không đủ')) {
      return res.status(400).json({
        success: false,
        message: 'Tồn kho không đủ để xuất số lượng yêu cầu'
      });
    }
    if (error.number === 50003 || error.number === 8115) {
      return res.status(400).json({
        success: false,
        message: 'Số lượng tồn kho vượt quá giới hạn cho phép'
      });
    }

    console.error('[TV4 - Ingredients PATCH stock Error]:', error.message || error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi cập nhật số lượng tồn kho'
    });
  }
});

module.exports = router;
