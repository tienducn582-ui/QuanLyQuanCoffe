-- =====================================================================
-- CAFE TASK MANAGER - DATABASE SEED DATA MỞ RỘNG (10 BẢNG BỔ SUNG)
-- Tác vụ: TV4-E0 (Dữ liệu mẫu mở rộng)
-- Database name: CafeTaskManager
-- =====================================================================

USE [CafeTaskManager];
GO

SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO

-- 1. Xóa dữ liệu cũ của 10 bảng mở rộng theo thứ tự khóa ngoại để có thể chạy lại nhiều lần
DELETE FROM dbo.OrderItems;
DELETE FROM dbo.Orders;
DELETE FROM dbo.MenuItems;
DELETE FROM dbo.DiningTables;
DELETE FROM dbo.Customers;
DELETE FROM dbo.Ingredients;
DELETE FROM dbo.TaskLogs;
DELETE FROM dbo.TaskTemplates;
DELETE FROM dbo.ShiftAssignments;
DELETE FROM dbo.ShiftLogs;
GO

-- 2. Nạp 6 mẫu công việc (TaskTemplates) - 2 mẫu cho mỗi ca
-- Lấy ShiftId và CategoryId bằng truy vấn theo Tên, không gõ cứng Id
INSERT INTO dbo.TaskTemplates (Title, Description, Priority, CategoryId, ShiftId, IsActive)
SELECT 
    N'Khởi động máy pha espresso và test shot chuẩn',
    N'Xả họng pha, kiểm tra áp suất nồi hơi 9 bar, cân đong chiết xuất shot cà phê chuẩn đầu ca.',
    N'High',
    c.Id,
    s.Id,
    1
FROM dbo.Shifts s, dbo.Categories c
WHERE s.Name = N'Ca Sáng' AND c.Name = N'Pha chế';

INSERT INTO dbo.TaskTemplates (Title, Description, Priority, CategoryId, ShiftId, IsActive)
SELECT 
    N'Kiểm kê tiền lẻ và chuẩn bị két thu ngân đầu ngày',
    N'Đếm đủ 2.000.000đ tiền mặt tiền lẻ các mệnh giá trong ngăn kéo thu ngân.',
    N'Medium',
    c.Id,
    s.Id,
    1
FROM dbo.Shifts s, dbo.Categories c
WHERE s.Name = N'Ca Sáng' AND c.Name = N'Thu ngân';

INSERT INTO dbo.TaskTemplates (Title, Description, Priority, CategoryId, ShiftId, IsActive)
SELECT 
    N'Kiểm tra và bổ sung nguyên liệu quầy bar ca chiều tối',
    N'Châm đầy các hũ hạt cà phê, khay đá bi, các chai siro vani và sốt socola trước giờ cao điểm.',
    N'High',
    c.Id,
    s.Id,
    1
FROM dbo.Shifts s, dbo.Categories c
WHERE s.Name = N'Ca Tối' AND c.Name = N'Kho và mua hàng';

INSERT INTO dbo.TaskTemplates (Title, Description, Priority, CategoryId, ShiftId, IsActive)
SELECT 
    N'Lau dọn sảnh chính và sắp xếp lại bàn ghế khu vực ban công',
    N'Lau sạch mặt bàn gỗ, kiểm tra menu để bàn và nạp khăn giấy tại các bàn số 1 đến 8.',
    N'Medium',
    c.Id,
    s.Id,
    1
FROM dbo.Shifts s, dbo.Categories c
WHERE s.Name = N'Ca Tối' AND c.Name = N'Phục vụ';

INSERT INTO dbo.TaskTemplates (Title, Description, Priority, CategoryId, ShiftId, IsActive)
SELECT 
    N'Ngâm tẩy rửa họng máy pha và vòi đánh sữa bằng bột Cafiza',
    N'Vệ sinh cối xay, tháo phin mù sục rửa grouphead, xả sạch vòi hơi steam wand.',
    N'High',
    c.Id,
    s.Id,
    1
FROM dbo.Shifts s, dbo.Categories c
WHERE s.Name = N'Đóng cửa vệ sinh' AND c.Name = N'Vệ sinh';

INSERT INTO dbo.TaskTemplates (Title, Description, Priority, CategoryId, ShiftId, IsActive)
SELECT 
    N'Kiểm đếm doanh thu cuối ngày, đối soát két và khóa két sắt',
    N'In báo cáo kết ca từ máy POS, đối chiếu tiền mặt thực tế và bàn giao két tiền cho quản lý.',
    N'High',
    c.Id,
    s.Id,
    1
FROM dbo.Shifts s, dbo.Categories c
WHERE s.Name = N'Đóng cửa vệ sinh' AND c.Name = N'Thu ngân';
GO

-- 3. Nạp 8 nguyên liệu (Ingredients) - ít nhất 2 loại có Quantity <= MinQuantity
INSERT INTO dbo.Ingredients (Name, Unit, Quantity, MinQuantity, UpdatedAt) VALUES
(N'Cà phê hạt Robusta rang mộc', N'kg', 15.50, 5.00, GETDATE()),
(N'Sữa tươi thanh trùng Dalat Milk', N'hộp', 2.00, 6.00, GETDATE()), -- Cảnh báo sắp hết (2 <= 6)
(N'Đường cát trắng tinh luyện', N'kg', 12.00, 4.00, GETDATE()),
(N'Trà đen đặc sản Phúc Long', N'gói', 1.00, 3.00, GETDATE()),     -- Cảnh báo sắp hết (1 <= 3)
(N'Ly nhựa mang đi 500ml kèm nắp', N'cái', 350.00, 100.00, GETDATE()),
(N'Ống hút giấy bọc màng', N'cái', 400.00, 100.00, GETDATE()),
(N'Siro Vani Monin chai 700ml', N'chai', 4.00, 2.00, GETDATE()),
(N'Kem béo Whipping Anchor 1L', N'hộp', 5.00, 2.00, GETDATE());
GO

-- 4. Nạp 5 khách hàng (Customers) - SĐT 10 số khác nhau, điểm từ 0 đến 350
INSERT INTO dbo.Customers (FullName, Phone, Points, CreatedAt) VALUES
(N'Nguyễn Văn An', N'0901234561', 50, GETDATE()),   -- Hạng Đồng (<100)
(N'Trần Thị Bích', N'0901234562', 120, GETDATE()),  -- Hạng Bạc (100-299)
(N'Lê Hoàng Cường', N'0901234563', 250, GETDATE()), -- Hạng Bạc (100-299)
(N'Phạm Thu Dung', N'0901234564', 320, GETDATE()),  -- Hạng Vàng (>=300)
(N'Đỗ Minh Đức', N'0901234565', 0, GETDATE());     -- Hạng Đồng (<100)
GO

-- 5. Nạp 8 bàn quán cafe (DiningTables) - Bàn 1 đến Bàn 8, sức chứa 1..20
INSERT INTO dbo.DiningTables (Name, Seats) VALUES
(N'Bàn 1', 2),
(N'Bàn 2', 2),
(N'Bàn 3', 4),
(N'Bàn 4', 4),
(N'Bàn 5', 4),
(N'Bàn 6', 6),
(N'Bàn 7', 6),
(N'Bàn 8', 8);
GO

-- 6. Nạp 10 món đồ uống (MenuItems) - giá từ 20000 đến 55000
INSERT INTO dbo.MenuItems (Name, Price, IsActive) VALUES
(N'Cà phê đen đá', 22000, 1),
(N'Cà phê sữa đá', 25000, 1),
(N'Bạc xỉu truyền thống', 29000, 1),
(N'Espresso đúp shot', 30000, 1),
(N'Americano đá', 32000, 1),
(N'Trà đào cam sả', 38000, 1),
(N'Trà vải hoa hồng', 42000, 1),
(N'Cappuccino nóng', 45000, 1),
(N'Latte hạnh nhân vani', 48000, 1),
(N'Matcha đá xay kem tuyết', 55000, 1);
GO

-- 7. Truy vấn đếm số lượng bản ghi của 10 bảng mở rộng để đối chiếu
SELECT N'ShiftLogs' AS TableName, COUNT(*) AS [RowCount] FROM dbo.ShiftLogs
UNION ALL SELECT N'ShiftAssignments', COUNT(*) FROM dbo.ShiftAssignments
UNION ALL SELECT N'TaskTemplates', COUNT(*) FROM dbo.TaskTemplates
UNION ALL SELECT N'TaskLogs', COUNT(*) FROM dbo.TaskLogs
UNION ALL SELECT N'Ingredients', COUNT(*) FROM dbo.Ingredients
UNION ALL SELECT N'Customers', COUNT(*) FROM dbo.Customers
UNION ALL SELECT N'DiningTables', COUNT(*) FROM dbo.DiningTables
UNION ALL SELECT N'MenuItems', COUNT(*) FROM dbo.MenuItems
UNION ALL SELECT N'Orders', COUNT(*) FROM dbo.Orders
UNION ALL SELECT N'OrderItems', COUNT(*) FROM dbo.OrderItems;
GO
