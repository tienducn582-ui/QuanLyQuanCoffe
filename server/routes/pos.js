/**
 * server/routes/pos.js - API Quản lý Sơ đồ bàn & POS Gọi món (/api/pos)
 * Thành viên phụ trách: TV5 (Giao diện chung & Client Core) - Tác vụ [TV5-X9]
 *
 * Danh sách endpoint:
 * [ĐỢT 1 - MỨC TỐI THIỂU]
 * - GET    /api/pos/tables               Lấy danh sách bàn kèm trạng thái (Free/Occupied), mã đơn và tổng tiền
 * - GET    /api/pos/menu                 Lấy danh mục món nước (mặc định chỉ lấy món đang bán IsActive = 1)
 * - POST   /api/pos/orders               Tạo đơn hàng mới cho bàn (chặn trùng bằng 409)
 * - GET    /api/pos/orders/:id           Xem chi tiết đơn hàng, danh sách món và tổng tiền tính từ server
 * - POST   /api/pos/orders/:id/items     Thêm món vào đơn hàng mở (cộng dồn số lượng tối đa 99)
 * - POST   /api/pos/orders/:id/pay       Thanh toán đơn hàng (chặn đơn rỗng bằng 400, tích điểm cho khách)
 */

const express = require('express');
const { query } = require('../db');
const { verifyToken } = require('../middleware/auth');
const { isPositiveInt, sendBadRequest } = require('../utils/validators');

const router = express.Router();

// Toàn bộ router POS yêu cầu xác thực đăng nhập
router.use(verifyToken);

/**
 * GET /api/pos/tables
 * Lấy danh sách toàn bộ bàn, kèm trạng thái Free/Occupied và thông tin đơn mở (nếu có)
 */
router.get('/tables', async (req, res) => {
  try {
    const sql = `
      SELECT 
        t.Id,
        t.Name,
        t.Seats,
        o.Id AS OpenOrderId,
        ISNULL(o.Total, 0) AS OpenTotal,
        o.CustomerId AS OpenCustomerId,
        c.FullName AS CustomerName,
        c.Phone AS CustomerPhone
      FROM dbo.DiningTables t
      LEFT JOIN dbo.Orders o ON o.TableId = t.Id AND o.Status = 'Open'
      LEFT JOIN dbo.Customers c ON c.Id = o.CustomerId
      ORDER BY t.Id ASC;
    `;

    const result = await query(sql);
    const tables = result.recordset.map(row => ({
      id: Number(row.Id),
      name: row.Name,
      seats: Number(row.Seats),
      status: row.OpenOrderId ? 'Occupied' : 'Free',
      openOrderId: row.OpenOrderId ? Number(row.OpenOrderId) : null,
      openTotal: Number(row.OpenTotal || 0),
      customerId: row.OpenCustomerId ? Number(row.OpenCustomerId) : null,
      customerName: row.CustomerName || null,
      customerPhone: row.CustomerPhone || null
    }));

    return res.json({
      success: true,
      data: tables
    });
  } catch (err) {
    console.error('[POS] Lỗi GET /tables:', err);
    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi lấy danh sách bàn.'
    });
  }
});

/**
 * GET /api/pos/menu
 * Lấy danh mục món ăn / đồ uống
 * Admin có thể truyền ?all=1 để xem cả món ngừng phục vụ (IsActive = 0)
 */
router.get('/menu', async (req, res) => {
  try {
    const isStaff = !req.user || req.user.role !== 'Admin';
    const showAll = !isStaff && req.query.all === '1';

    let sql = `
      SELECT Id, Name, Price, IsActive
      FROM dbo.MenuItems
    `;
    if (!showAll) {
      sql += ' WHERE IsActive = 1';
    }
    sql += ' ORDER BY Name ASC;';

    const result = await query(sql);
    const menuItems = result.recordset.map(row => ({
      id: Number(row.Id),
      name: row.Name,
      price: Number(row.Price),
      isActive: Boolean(row.IsActive)
    }));

    return res.json({
      success: true,
      data: menuItems
    });
  } catch (err) {
    console.error('[POS] Lỗi GET /menu:', err);
    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi lấy danh mục thực đơn.'
    });
  }
});

/**
 * POST /api/pos/orders
 * Mở đơn hàng mới cho bàn: { tableId, customerId? }
 * Nếu bàn đang có đơn 'Open', trả về HTTP 409
 */
router.post('/orders', async (req, res) => {
  try {
    const { tableId, customerId } = req.body;

    if (!isPositiveInt(tableId)) {
      return sendBadRequest(res, 'Mã bàn (tableId) phải là số nguyên dương.');
    }

    // 1. Kiểm tra bàn có tồn tại không
    const tableCheck = await query('SELECT Id, Name FROM dbo.DiningTables WHERE Id = @tableId', {
      tableId: Number(tableId)
    });
    if (tableCheck.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Bàn không tồn tại.'
      });
    }

    // 2. Nếu có customerId, kiểm tra khách hàng
    let validCustomerId = null;
    if (customerId !== undefined && customerId !== null && customerId !== '') {
      if (!isPositiveInt(customerId)) {
        return sendBadRequest(res, 'Mã khách hàng (customerId) không hợp lệ.');
      }
      const customerCheck = await query('SELECT Id FROM dbo.Customers WHERE Id = @customerId', {
        customerId: Number(customerId)
      });
      if (customerCheck.recordset.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Khách hàng không tồn tại.'
        });
      }
      validCustomerId = Number(customerId);
    }

    // 3. Kiểm tra xem bàn đã có đơn Open chưa
    const openCheck = await query(
      "SELECT Id FROM dbo.Orders WHERE TableId = @tableId AND Status = 'Open'",
      { tableId: Number(tableId) }
    );
    if (openCheck.recordset.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Bàn đang có đơn chưa thanh toán'
      });
    }

    // 4. Tạo đơn mới
    const createdBy = req.user && req.user.id ? req.user.id : null;
    const insertSql = `
      INSERT INTO dbo.Orders (TableId, CustomerId, Status, Total, CreatedBy, CreatedAt)
      VALUES (@tableId, @customerId, 'Open', 0, @createdBy, GETDATE());
      SELECT SCOPE_IDENTITY() AS Id;
    `;

    try {
      const insertResult = await query(insertSql, {
        tableId: Number(tableId),
        customerId: validCustomerId,
        createdBy
      });

      const newId = Number(insertResult.recordset[0].Id);
      return res.status(201).json({
        success: true,
        message: 'Mở đơn gọi món cho bàn thành công.',
        data: {
          id: newId,
          tableId: Number(tableId),
          customerId: validCustomerId,
          status: 'Open',
          total: 0
        }
      });
    } catch (insertErr) {
      // Bắt lỗi vi phạm chỉ mục UX_Orders_OpenTable (Mã lỗi SQL 2601 hoặc 2627)
      if (
        insertErr.number === 2601 ||
        insertErr.number === 2627 ||
        (insertErr.message && insertErr.message.includes('UX_Orders_OpenTable'))
      ) {
        return res.status(409).json({
          success: false,
          message: 'Bàn đang có đơn chưa thanh toán'
        });
      }
      throw insertErr;
    }
  } catch (err) {
    console.error('[POS] Lỗi POST /orders:', err);
    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi tạo đơn hàng mới.'
    });
  }
});

/**
 * GET /api/pos/orders/:id
 * Xem thông tin đơn hàng, danh sách món và tổng tiền (tính tại server)
 */
router.get('/orders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!isPositiveInt(id)) {
      return sendBadRequest(res, 'Mã đơn hàng không hợp lệ.');
    }

    const orderSql = `
      SELECT 
        o.Id,
        o.TableId,
        t.Name AS TableName,
        t.Seats AS TableSeats,
        o.CustomerId,
        c.FullName AS CustomerName,
        c.Phone AS CustomerPhone,
        c.Points AS CustomerPoints,
        o.Status,
        o.Total,
        o.CreatedBy,
        u.FullName AS CreatedByName,
        o.CreatedAt,
        o.PaidAt
      FROM dbo.Orders o
      JOIN dbo.DiningTables t ON t.Id = o.TableId
      LEFT JOIN dbo.Customers c ON c.Id = o.CustomerId
      LEFT JOIN dbo.Users u ON u.Id = o.CreatedBy
      WHERE o.Id = @id;
    `;

    const orderRes = await query(orderSql, { id: Number(id) });
    if (orderRes.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Đơn hàng không tồn tại.'
      });
    }

    const row = orderRes.recordset[0];

    // Lấy chi tiết các món trong đơn
    const itemsSql = `
      SELECT 
        oi.Id,
        oi.MenuItemId,
        m.Name AS MenuItemName,
        oi.Quantity,
        oi.UnitPrice,
        (oi.Quantity * oi.UnitPrice) AS LineTotal
      FROM dbo.OrderItems oi
      JOIN dbo.MenuItems m ON m.Id = oi.MenuItemId
      WHERE oi.OrderId = @id
      ORDER BY oi.Id ASC;
    `;
    const itemsRes = await query(itemsSql, { id: Number(id) });

    const items = itemsRes.recordset.map(item => ({
      id: Number(item.Id),
      menuItemId: Number(item.MenuItemId),
      name: item.MenuItemName,
      quantity: Number(item.Quantity),
      unitPrice: Number(item.UnitPrice),
      lineTotal: Number(item.LineTotal)
    }));

    // Luôn tính lại tổng tiền tại server để đảm bảo dữ liệu nhất quán
    const calculatedTotal = items.reduce((sum, it) => sum + it.lineTotal, 0);

    return res.json({
      success: true,
      data: {
        id: Number(row.Id),
        tableId: Number(row.TableId),
        tableName: row.TableName,
        seats: Number(row.TableSeats),
        customerId: row.CustomerId ? Number(row.CustomerId) : null,
        customerName: row.CustomerName || null,
        customerPhone: row.CustomerPhone || null,
        customerPoints: row.CustomerPoints !== null ? Number(row.CustomerPoints) : null,
        status: row.Status,
        total: calculatedTotal,
        createdBy: row.CreatedBy ? Number(row.CreatedBy) : null,
        createdByName: row.CreatedByName || null,
        createdAt: row.CreatedAt,
        paidAt: row.PaidAt,
        items
      }
    });
  } catch (err) {
    console.error('[POS] Lỗi GET /orders/:id:', err);
    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi lấy chi tiết đơn hàng.'
    });
  }
});

/**
 * POST /api/pos/orders/:id/items
 * Thêm món vào đơn hàng mở: { menuItemId, quantity (1-99) }
 * Nếu món đã có trong đơn, cộng dồn số lượng (tổng không quá 99)
 */
router.post('/orders/:id/items', async (req, res) => {
  try {
    const { id } = req.params;
    const { menuItemId, quantity } = req.body;

    if (!isPositiveInt(id)) {
      return sendBadRequest(res, 'Mã đơn hàng không hợp lệ.');
    }
    if (!isPositiveInt(menuItemId)) {
      return sendBadRequest(res, 'Mã món (menuItemId) không hợp lệ.');
    }
    if (!isPositiveInt(quantity) || Number(quantity) > 99) {
      return sendBadRequest(res, 'Số lượng món phải là số nguyên từ 1 đến 99.');
    }

    // 1. Kiểm tra đơn hàng: phải tồn tại và đang ở trạng thái 'Open'
    const orderRes = await query('SELECT Id, Status FROM dbo.Orders WHERE Id = @id', {
      id: Number(id)
    });
    if (orderRes.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Đơn hàng không tồn tại.'
      });
    }
    if (orderRes.recordset[0].Status !== 'Open') {
      return res.status(400).json({
        success: false,
        message: 'Chỉ có thể thêm món vào đơn hàng đang mở.'
      });
    }

    // 2. Kiểm tra món ăn: phải tồn tại và đang bán (IsActive = 1)
    const menuRes = await query('SELECT Id, Name, Price, IsActive FROM dbo.MenuItems WHERE Id = @menuItemId', {
      menuItemId: Number(menuItemId)
    });
    if (menuRes.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Món ăn không tồn tại.'
      });
    }
    const menuItem = menuRes.recordset[0];
    if (!menuItem.IsActive) {
      return res.status(400).json({
        success: false,
        message: 'Món ăn này hiện đang ngừng phục vụ.'
      });
    }

    const unitPrice = Number(menuItem.Price);
    const addQty = Number(quantity);

    // 3. Kiểm tra xem món này đã có trong đơn chưa
    const existingRes = await query(
      'SELECT Id, Quantity FROM dbo.OrderItems WHERE OrderId = @orderId AND MenuItemId = @menuItemId',
      { orderId: Number(id), menuItemId: Number(menuItemId) }
    );

    if (existingRes.recordset.length > 0) {
      const existingItem = existingRes.recordset[0];
      const newQty = Number(existingItem.Quantity) + addQty;
      if (newQty > 99) {
        return res.status(400).json({
          success: false,
          message: 'Tổng số lượng cho món này trong đơn vượt quá 99.'
        });
      }

      await query(
        'UPDATE dbo.OrderItems SET Quantity = @quantity WHERE Id = @itemId',
        { quantity: newQty, itemId: Number(existingItem.Id) }
      );
    } else {
      await query(
        'INSERT INTO dbo.OrderItems (OrderId, MenuItemId, Quantity, UnitPrice) VALUES (@orderId, @menuItemId, @quantity, @unitPrice)',
        {
          orderId: Number(id),
          menuItemId: Number(menuItemId),
          quantity: addQty,
          unitPrice
        }
      );
    }

    // 4. Tính lại và cập nhật Total của đơn hàng trên CSDL
    await query(
      `UPDATE dbo.Orders
       SET Total = (SELECT ISNULL(SUM(Quantity * UnitPrice), 0) FROM dbo.OrderItems WHERE OrderId = @orderId)
       WHERE Id = @orderId;`,
      { orderId: Number(id) }
    );

    return res.json({
      success: true,
      message: 'Thêm món vào đơn hàng thành công.'
    });
  } catch (err) {
    console.error('[POS] Lỗi POST /orders/:id/items:', err);
    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi thêm món vào đơn hàng.'
    });
  }
});

/**
 * POST /api/pos/orders/:id/pay
 * Thanh toán đơn hàng:
 * - Đơn phải đang ở trạng thái 'Open'
 * - Phải có ít nhất 1 món trong đơn; nếu đơn rỗng trả về HTTP 400
 * - Tự động tính lại Total = SUM(Quantity * UnitPrice) ở server
 * - Cập nhật Status = 'Paid', PaidAt = GETDATE()
 * - Nếu có CustomerId, tích lũy điểm thưởng = FLOOR(Total / 10000)
 * - Toàn bộ được thực thi trong một batch T-SQL với Transaction
 */
router.post('/orders/:id/pay', async (req, res) => {
  try {
    const { id } = req.params;
    if (!isPositiveInt(id)) {
      return sendBadRequest(res, 'Mã đơn hàng không hợp lệ.');
    }

    // 1. Kiểm tra đơn hàng
    const orderRes = await query('SELECT Id, Status, CustomerId FROM dbo.Orders WHERE Id = @id', {
      id: Number(id)
    });
    if (orderRes.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Đơn hàng không tồn tại.'
      });
    }
    const order = orderRes.recordset[0];
    if (order.Status !== 'Open') {
      return res.status(400).json({
        success: false,
        message: 'Đơn hàng không ở trạng thái mở hoặc đã thanh toán trước đó.'
      });
    }

    // 2. Kiểm tra số lượng món trong đơn (Đơn rỗng -> HTTP 400)
    const itemsCheck = await query(
      'SELECT COUNT(*) AS ItemCount FROM dbo.OrderItems WHERE OrderId = @id',
      { id: Number(id) }
    );
    const itemCount = itemsCheck.recordset[0] ? Number(itemsCheck.recordset[0].ItemCount) : 0;
    if (itemCount === 0) {
      return res.status(400).json({
        success: false,
        message: 'Đơn hàng chưa có món nào, không thể thanh toán.'
      });
    }

    // 3. Thực thi thanh toán và tích điểm trong 1 batch giao dịch T-SQL
    const paySql = `
      SET XACT_ABORT ON;
      BEGIN TRAN;

      DECLARE @calcTotal INT;
      SELECT @calcTotal = ISNULL(SUM(Quantity * UnitPrice), 0)
      FROM dbo.OrderItems
      WHERE OrderId = @orderId;

      UPDATE dbo.Orders
      SET Status = 'Paid',
          PaidAt = GETDATE(),
          Total = @calcTotal
      WHERE Id = @orderId;

      DECLARE @targetCustomerId INT;
      SELECT @targetCustomerId = CustomerId FROM dbo.Orders WHERE Id = @orderId;

      IF @targetCustomerId IS NOT NULL AND @calcTotal >= 10000
      BEGIN
        DECLARE @pointsEarned INT = FLOOR(@calcTotal / 10000);
        UPDATE dbo.Customers
        SET Points = Points + @pointsEarned
        WHERE Id = @targetCustomerId;
      END

      COMMIT;

      SELECT o.Id, o.TableId, o.CustomerId, o.Status, o.Total, o.PaidAt
      FROM dbo.Orders o
      WHERE o.Id = @orderId;
    `;

    const payResult = await query(paySql, { orderId: Number(id) });
    const paidOrder = payResult.recordset[0];

    return res.json({
      success: true,
      message: 'Thanh toán đơn hàng thành công.',
      data: {
        id: Number(paidOrder.Id),
        tableId: Number(paidOrder.TableId),
        customerId: paidOrder.CustomerId ? Number(paidOrder.CustomerId) : null,
        status: paidOrder.Status,
        total: Number(paidOrder.Total),
        paidAt: paidOrder.PaidAt
      }
    });
  } catch (err) {
    console.error('[POS] Lỗi POST /orders/:id/pay:', err);
    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi thanh toán đơn hàng.'
    });
  }
});

module.exports = router;
