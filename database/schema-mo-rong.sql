-- =====================================================================
-- CAFE TASK MANAGER - DATABASE SCHEMA MỞ RỘNG (10 BẢNG BỔ SUNG)
-- Tác vụ: TV4-E0 (Cơ sở dữ liệu mở rộng)
-- Database name: CafeTaskManager
-- =====================================================================

USE [CafeTaskManager];
GO

SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO

-- 1. Xóa các bảng mở rộng theo đúng thứ tự phụ thuộc khóa ngoại nếu đã tồn tại
IF OBJECT_ID(N'dbo.OrderItems', N'U') IS NOT NULL DROP TABLE dbo.OrderItems;
IF OBJECT_ID(N'dbo.Orders', N'U') IS NOT NULL DROP TABLE dbo.Orders;
IF OBJECT_ID(N'dbo.MenuItems', N'U') IS NOT NULL DROP TABLE dbo.MenuItems;
IF OBJECT_ID(N'dbo.DiningTables', N'U') IS NOT NULL DROP TABLE dbo.DiningTables;
IF OBJECT_ID(N'dbo.Customers', N'U') IS NOT NULL DROP TABLE dbo.Customers;
IF OBJECT_ID(N'dbo.Ingredients', N'U') IS NOT NULL DROP TABLE dbo.Ingredients;
IF OBJECT_ID(N'dbo.TaskLogs', N'U') IS NOT NULL DROP TABLE dbo.TaskLogs;
IF OBJECT_ID(N'dbo.TaskTemplates', N'U') IS NOT NULL DROP TABLE dbo.TaskTemplates;
IF OBJECT_ID(N'dbo.ShiftAssignments', N'U') IS NOT NULL DROP TABLE dbo.ShiftAssignments;
IF OBJECT_ID(N'dbo.ShiftLogs', N'U') IS NOT NULL DROP TABLE dbo.ShiftLogs;
GO

-- 2. Tạo bảng ShiftLogs (Nhật ký ca làm & bàn giao)
CREATE TABLE dbo.ShiftLogs (
    Id INT IDENTITY(1,1) NOT NULL,
    ShiftId INT NOT NULL,
    UserId INT NOT NULL,
    LogDate DATE NOT NULL,
    StartedAt DATETIME2 NOT NULL,
    EndedAt DATETIME2 NULL,
    HandoverNote NVARCHAR(500) NULL,
    CONSTRAINT PK_ShiftLogs PRIMARY KEY (Id),
    CONSTRAINT FK_ShiftLogs_Shifts FOREIGN KEY (ShiftId) REFERENCES dbo.Shifts (Id) ON DELETE CASCADE,
    CONSTRAINT FK_ShiftLogs_Users FOREIGN KEY (UserId) REFERENCES dbo.Users (Id) ON DELETE CASCADE
);
GO

-- 3. Tạo bảng ShiftAssignments (Phân công ca làm theo tuần)
CREATE TABLE dbo.ShiftAssignments (
    Id INT IDENTITY(1,1) NOT NULL,
    ShiftId INT NOT NULL,
    UserId INT NOT NULL,
    WorkDate DATE NOT NULL,
    CONSTRAINT PK_ShiftAssignments PRIMARY KEY (Id),
    CONSTRAINT FK_ShiftAssignments_Shifts FOREIGN KEY (ShiftId) REFERENCES dbo.Shifts (Id) ON DELETE CASCADE,
    CONSTRAINT FK_ShiftAssignments_Users FOREIGN KEY (UserId) REFERENCES dbo.Users (Id) ON DELETE CASCADE,
    CONSTRAINT UQ_ShiftAssignments_Shift_User_Date UNIQUE (ShiftId, UserId, WorkDate)
);
GO

-- 4. Tạo bảng TaskTemplates (Mẫu công việc định kỳ theo ca)
CREATE TABLE dbo.TaskTemplates (
    Id INT IDENTITY(1,1) NOT NULL,
    Title NVARCHAR(200) NOT NULL,
    Description NVARCHAR(500) NULL,
    Priority NVARCHAR(20) NOT NULL,
    CategoryId INT NULL,
    ShiftId INT NOT NULL,
    IsActive BIT NOT NULL CONSTRAINT DF_TaskTemplates_IsActive DEFAULT (1),
    CONSTRAINT PK_TaskTemplates PRIMARY KEY (Id),
    CONSTRAINT CK_TaskTemplates_Priority CHECK (Priority IN (N'Low', N'Medium', N'High')),
    CONSTRAINT FK_TaskTemplates_Categories FOREIGN KEY (CategoryId) REFERENCES dbo.Categories (Id) ON DELETE SET NULL,
    CONSTRAINT FK_TaskTemplates_Shifts FOREIGN KEY (ShiftId) REFERENCES dbo.Shifts (Id) ON DELETE CASCADE
);
GO

-- 5. Tạo bảng TaskLogs (Lịch sử thao tác & bình luận công việc)
CREATE TABLE dbo.TaskLogs (
    Id INT IDENTITY(1,1) NOT NULL,
    TaskId INT NOT NULL,
    UserId INT NULL,
    Action NVARCHAR(20) NOT NULL,
    OldValue NVARCHAR(50) NULL,
    NewValue NVARCHAR(50) NULL,
    Comment NVARCHAR(500) NULL,
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_TaskLogs_CreatedAt DEFAULT (GETDATE()),
    CONSTRAINT PK_TaskLogs PRIMARY KEY (Id),
    CONSTRAINT CK_TaskLogs_Action CHECK (Action IN ('created', 'updated', 'status', 'comment')),
    CONSTRAINT FK_TaskLogs_Tasks FOREIGN KEY (TaskId) REFERENCES dbo.Tasks (Id) ON DELETE CASCADE,
    CONSTRAINT FK_TaskLogs_Users FOREIGN KEY (UserId) REFERENCES dbo.Users (Id) ON DELETE SET NULL
);
GO

-- 6. Tạo bảng Ingredients (Kho nguyên vật liệu tối giản)
CREATE TABLE dbo.Ingredients (
    Id INT IDENTITY(1,1) NOT NULL,
    Name NVARCHAR(100) NOT NULL,
    Unit NVARCHAR(20) NOT NULL,
    Quantity DECIMAL(10,2) NOT NULL CONSTRAINT DF_Ingredients_Quantity DEFAULT (0),
    MinQuantity DECIMAL(10,2) NOT NULL CONSTRAINT DF_Ingredients_MinQuantity DEFAULT (0),
    UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_Ingredients_UpdatedAt DEFAULT (GETDATE()),
    CONSTRAINT PK_Ingredients PRIMARY KEY (Id),
    CONSTRAINT UQ_Ingredients_Name UNIQUE (Name),
    CONSTRAINT CK_Ingredients_Quantity CHECK (Quantity >= 0),
    CONSTRAINT CK_Ingredients_MinQuantity CHECK (MinQuantity >= 0)
);
GO

-- 7. Tạo bảng Customers (Khách hàng tích điểm)
CREATE TABLE dbo.Customers (
    Id INT IDENTITY(1,1) NOT NULL,
    FullName NVARCHAR(100) NOT NULL,
    Phone NVARCHAR(15) NOT NULL,
    Points INT NOT NULL CONSTRAINT DF_Customers_Points DEFAULT (0),
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Customers_CreatedAt DEFAULT (GETDATE()),
    CONSTRAINT PK_Customers PRIMARY KEY (Id),
    CONSTRAINT UQ_Customers_Phone UNIQUE (Phone),
    CONSTRAINT CK_Customers_Points CHECK (Points >= 0)
);
GO

-- 8. Tạo bảng DiningTables (Sơ đồ bàn quán cafe)
CREATE TABLE dbo.DiningTables (
    Id INT IDENTITY(1,1) NOT NULL,
    Name NVARCHAR(30) NOT NULL,
    Seats INT NOT NULL,
    CONSTRAINT PK_DiningTables PRIMARY KEY (Id),
    CONSTRAINT UQ_DiningTables_Name UNIQUE (Name),
    CONSTRAINT CK_DiningTables_Seats CHECK (Seats >= 1 AND Seats <= 20)
);
GO

-- 9. Tạo bảng MenuItems (Danh mục món nước / đồ uống)
CREATE TABLE dbo.MenuItems (
    Id INT IDENTITY(1,1) NOT NULL,
    Name NVARCHAR(100) NOT NULL,
    Price INT NOT NULL,
    IsActive BIT NOT NULL CONSTRAINT DF_MenuItems_IsActive DEFAULT (1),
    CONSTRAINT PK_MenuItems PRIMARY KEY (Id),
    CONSTRAINT UQ_MenuItems_Name UNIQUE (Name),
    CONSTRAINT CK_MenuItems_Price CHECK (Price >= 0)
);
GO

-- 10. Tạo bảng Orders (Đơn gọi món tại bàn)
CREATE TABLE dbo.Orders (
    Id INT IDENTITY(1,1) NOT NULL,
    TableId INT NOT NULL,
    CustomerId INT NULL,
    Status NVARCHAR(20) NOT NULL,
    Total INT NOT NULL CONSTRAINT DF_Orders_Total DEFAULT (0),
    CreatedBy INT NULL,
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Orders_CreatedAt DEFAULT (GETDATE()),
    PaidAt DATETIME2 NULL,
    CONSTRAINT PK_Orders PRIMARY KEY (Id),
    CONSTRAINT CK_Orders_Status CHECK (Status IN ('Open', 'Paid', 'Cancelled')),
    CONSTRAINT FK_Orders_DiningTables FOREIGN KEY (TableId) REFERENCES dbo.DiningTables (Id),
    CONSTRAINT FK_Orders_Customers FOREIGN KEY (CustomerId) REFERENCES dbo.Customers (Id) ON DELETE SET NULL,
    CONSTRAINT FK_Orders_Users FOREIGN KEY (CreatedBy) REFERENCES dbo.Users (Id) ON DELETE SET NULL
);
GO

-- Chỉ mục duy nhất có điều kiện: Mỗi bàn chỉ có duy nhất 1 đơn trạng thái 'Open'
CREATE UNIQUE NONCLUSTERED INDEX UX_Orders_OpenTable
    ON dbo.Orders (TableId)
    WHERE Status = 'Open';
GO

-- 11. Tạo bảng OrderItems (Chi tiết món trong đơn gọi món)
CREATE TABLE dbo.OrderItems (
    Id INT IDENTITY(1,1) NOT NULL,
    OrderId INT NOT NULL,
    MenuItemId INT NOT NULL,
    Quantity INT NOT NULL,
    UnitPrice INT NOT NULL,
    CONSTRAINT PK_OrderItems PRIMARY KEY (Id),
    CONSTRAINT FK_OrderItems_Orders FOREIGN KEY (OrderId) REFERENCES dbo.Orders (Id) ON DELETE CASCADE,
    CONSTRAINT FK_OrderItems_MenuItems FOREIGN KEY (MenuItemId) REFERENCES dbo.MenuItems (Id),
    CONSTRAINT CK_OrderItems_Quantity CHECK (Quantity >= 1 AND Quantity <= 99)
);
GO
