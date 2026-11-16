/*
    He thong quan ly quan cafe - SQL Server
    Chay script trong SQL Server Management Studio (SSMS).
    Script khong xoa database/bang hien co; du lieu mau duoc them khi bang rong.
*/
SET NOCOUNT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET ARITHABORT ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET NUMERIC_ROUNDABORT OFF;
GO

IF DB_ID(N'QuanLyQuanCafe') IS NULL
BEGIN
    EXEC(N'CREATE DATABASE [QuanLyQuanCafe];');
END;
GO

USE [QuanLyQuanCafe];
GO

IF OBJECT_ID(N'dbo.Roles', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Roles
    (
        RoleID       INT IDENTITY(1,1) NOT NULL,
        RoleName     NVARCHAR(50) NOT NULL,
        Description  NVARCHAR(250) NULL,
        CONSTRAINT PK_Roles PRIMARY KEY (RoleID),
        CONSTRAINT UQ_Roles_RoleName UNIQUE (RoleName)
    );
END;
GO

IF OBJECT_ID(N'dbo.MenuCategories', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.MenuCategories
    (
        CategoryID    INT IDENTITY(1,1) NOT NULL,
        CategoryName  NVARCHAR(80) NOT NULL,
        Description   NVARCHAR(250) NULL,
        IsActive      BIT NOT NULL CONSTRAINT DF_MenuCategories_IsActive DEFAULT (1),
        CONSTRAINT PK_MenuCategories PRIMARY KEY (CategoryID),
        CONSTRAINT UQ_MenuCategories_CategoryName UNIQUE (CategoryName)
    );
END;
GO

IF OBJECT_ID(N'dbo.MenuItems', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.MenuItems
    (
        MenuItemID  INT IDENTITY(1,1) NOT NULL,
        ItemCode    NVARCHAR(20) NOT NULL,
        CategoryID  INT NOT NULL,
        ItemName    NVARCHAR(120) NOT NULL,
        UnitPrice   DECIMAL(12,2) NOT NULL,
        IsAvailable BIT NOT NULL CONSTRAINT DF_MenuItems_IsAvailable DEFAULT (1),
        CONSTRAINT PK_MenuItems PRIMARY KEY (MenuItemID),
        CONSTRAINT UQ_MenuItems_ItemCode UNIQUE (ItemCode),
        CONSTRAINT FK_MenuItems_MenuCategories
            FOREIGN KEY (CategoryID) REFERENCES dbo.MenuCategories (CategoryID),
        CONSTRAINT CK_MenuItems_UnitPrice CHECK (UnitPrice >= 0)
    );
END;
GO

IF OBJECT_ID(N'dbo.CafeTables', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.CafeTables
    (
        CafeTableID INT IDENTITY(1,1) NOT NULL,
        TableCode   NVARCHAR(20) NOT NULL,
        Capacity    TINYINT NOT NULL,
        IsActive    BIT NOT NULL CONSTRAINT DF_CafeTables_IsActive DEFAULT (1),
        Notes       NVARCHAR(250) NULL,
        CONSTRAINT PK_CafeTables PRIMARY KEY (CafeTableID),
        CONSTRAINT UQ_CafeTables_TableCode UNIQUE (TableCode),
        CONSTRAINT CK_CafeTables_Capacity CHECK (Capacity BETWEEN 1 AND 20)
    );
END;
GO

IF OBJECT_ID(N'dbo.Employees', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Employees
    (
        EmployeeID    INT IDENTITY(1,1) NOT NULL,
        EmployeeCode  NVARCHAR(20) NOT NULL,
        RoleID        INT NOT NULL,
        FullName      NVARCHAR(120) NOT NULL,
        Phone         NVARCHAR(20) NOT NULL,
        Email         NVARCHAR(254) NOT NULL,
        HireDate      DATE NOT NULL CONSTRAINT DF_Employees_HireDate DEFAULT (CONVERT(DATE, GETDATE())),
        IsActive      BIT NOT NULL CONSTRAINT DF_Employees_IsActive DEFAULT (1),
        CONSTRAINT PK_Employees PRIMARY KEY (EmployeeID),
        CONSTRAINT UQ_Employees_EmployeeCode UNIQUE (EmployeeCode),
        CONSTRAINT UQ_Employees_Email UNIQUE (Email),
        CONSTRAINT FK_Employees_Roles
            FOREIGN KEY (RoleID) REFERENCES dbo.Roles (RoleID)
    );
END;
GO

IF OBJECT_ID(N'dbo.Customers', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Customers
    (
        CustomerID    INT IDENTITY(1,1) NOT NULL,
        CustomerCode  NVARCHAR(20) NOT NULL,
        CustomerType  VARCHAR(10) NOT NULL,
        FullName      NVARCHAR(120) NOT NULL,
        Phone         NVARCHAR(20) NULL,
        Email         NVARCHAR(254) NULL,
        PasswordHash  NVARCHAR(255) NULL,
        CreatedAt     DATETIME2(0) NOT NULL CONSTRAINT DF_Customers_CreatedAt DEFAULT (SYSDATETIME()),
        CONSTRAINT PK_Customers PRIMARY KEY (CustomerID),
        CONSTRAINT UQ_Customers_CustomerCode UNIQUE (CustomerCode),
        CONSTRAINT CK_Customers_CustomerType CHECK (CustomerType IN ('Member', 'Guest')),
        CONSTRAINT CK_Customers_MemberAccount CHECK
        (
            (CustomerType = 'Member' AND Email IS NOT NULL AND PasswordHash IS NOT NULL)
            OR
            (CustomerType = 'Guest' AND PasswordHash IS NULL)
        )
    );
END;
GO

IF NOT EXISTS
(
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID(N'dbo.Customers')
      AND name = N'UX_Customers_Email'
)
BEGIN
    CREATE UNIQUE INDEX UX_Customers_Email
        ON dbo.Customers (Email)
        WHERE Email IS NOT NULL;
END;
GO

IF OBJECT_ID(N'dbo.Orders', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Orders
    (
        OrderID       INT IDENTITY(1,1) NOT NULL,
        OrderNumber   NVARCHAR(24) NOT NULL,
        CustomerID    INT NULL,
        EmployeeID    INT NOT NULL,
        CafeTableID   INT NULL,
        OrderType     VARCHAR(10) NOT NULL,
        OrderStatus   VARCHAR(12) NOT NULL CONSTRAINT DF_Orders_OrderStatus DEFAULT ('Pending'),
        PaymentStatus VARCHAR(10) NOT NULL CONSTRAINT DF_Orders_PaymentStatus DEFAULT ('Unpaid'),
        PaymentMethod VARCHAR(12) NULL,
        OrderDate     DATETIME2(0) NOT NULL CONSTRAINT DF_Orders_OrderDate DEFAULT (SYSDATETIME()),
        CONSTRAINT PK_Orders PRIMARY KEY (OrderID),
        CONSTRAINT UQ_Orders_OrderNumber UNIQUE (OrderNumber),
        CONSTRAINT FK_Orders_Customers
            FOREIGN KEY (CustomerID) REFERENCES dbo.Customers (CustomerID),
        CONSTRAINT FK_Orders_Employees
            FOREIGN KEY (EmployeeID) REFERENCES dbo.Employees (EmployeeID),
        CONSTRAINT FK_Orders_CafeTables
            FOREIGN KEY (CafeTableID) REFERENCES dbo.CafeTables (CafeTableID),
        CONSTRAINT CK_Orders_OrderType CHECK (OrderType IN ('DineIn', 'TakeAway')),
        CONSTRAINT CK_Orders_OrderStatus CHECK
            (OrderStatus IN ('Pending', 'Preparing', 'Completed', 'Cancelled')),
        CONSTRAINT CK_Orders_PaymentStatus CHECK
            (PaymentStatus IN ('Unpaid', 'Paid', 'Refunded')),
        CONSTRAINT CK_Orders_PaymentMethod CHECK
            (PaymentMethod IS NULL OR PaymentMethod IN ('Cash', 'Card', 'Transfer', 'EWallet')),
        CONSTRAINT CK_Orders_TableMatchesType CHECK
        (
            (OrderType = 'DineIn' AND CafeTableID IS NOT NULL)
            OR
            (OrderType = 'TakeAway' AND CafeTableID IS NULL)
        ),
        CONSTRAINT CK_Orders_PaidHasMethod CHECK
            (PaymentStatus <> 'Paid' OR PaymentMethod IS NOT NULL)
    );
END;
GO

IF OBJECT_ID(N'dbo.OrderDetails', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.OrderDetails
    (
        OrderID       INT NOT NULL,
        LineNumber    SMALLINT NOT NULL,
        MenuItemID    INT NOT NULL,
        Quantity      SMALLINT NOT NULL,
        UnitPrice     DECIMAL(12,2) NOT NULL,
        CONSTRAINT PK_OrderDetails PRIMARY KEY (OrderID, LineNumber),
        CONSTRAINT FK_OrderDetails_Orders
            FOREIGN KEY (OrderID) REFERENCES dbo.Orders (OrderID),
        CONSTRAINT FK_OrderDetails_MenuItems
            FOREIGN KEY (MenuItemID) REFERENCES dbo.MenuItems (MenuItemID),
        CONSTRAINT CK_OrderDetails_LineNumber CHECK (LineNumber > 0),
        CONSTRAINT CK_OrderDetails_Quantity CHECK (Quantity > 0),
        CONSTRAINT CK_OrderDetails_UnitPrice CHECK (UnitPrice >= 0)
    );
END;
GO

/*
    Seed data: exactly 5 sample rows per table on a fresh database.
    PasswordHash values below are placeholders for demonstration only.
    Replace them with hashes produced by the application's authentication layer.
*/
SET XACT_ABORT ON;
BEGIN TRY
    BEGIN TRANSACTION;

    IF NOT EXISTS (SELECT 1 FROM dbo.Roles)
    BEGIN
        INSERT INTO dbo.Roles (RoleName, Description)
        VALUES
            (N'Admin',       N'Quản trị hệ thống và cấu hình chung'),
            (N'Manager',     N'Quản lý hoạt động và nhân sự quán'),
            (N'Cashier',     N'Tạo đơn hàng và xử lý thanh toán'),
            (N'Barista',     N'Pha chế và chuẩn bị món'),
            (N'Accountant',  N'Đối soát và theo dõi số liệu kế toán');
    END;

    IF NOT EXISTS (SELECT 1 FROM dbo.MenuCategories)
    BEGIN
        INSERT INTO dbo.MenuCategories (CategoryName, Description)
        VALUES
            (N'Cà phê',       N'Các món cà phê pha máy và cà phê truyền thống'),
            (N'Trà',          N'Trà trái cây và trà pha nóng'),
            (N'Đá xay',       N'Thức uống xay lạnh'),
            (N'Bánh ngọt',    N'Bánh dùng kèm thức uống'),
            (N'Nước ép',      N'Nước ép trái cây tươi');
    END;

    IF NOT EXISTS (SELECT 1 FROM dbo.MenuItems)
    BEGIN
        INSERT INTO dbo.MenuItems (ItemCode, CategoryID, ItemName, UnitPrice)
        SELECT v.ItemCode, c.CategoryID, v.ItemName, v.UnitPrice
        FROM
        (
            VALUES
                (N'CF001',   N'Cà phê',    N'Cà phê sữa đá',       CONVERT(DECIMAL(12,2), 32000)),
                (N'CF002',   N'Cà phê',    N'Bạc xỉu',             CONVERT(DECIMAL(12,2), 35000)),
                (N'TEA001',  N'Trà',       N'Trà đào cam sả',      CONVERT(DECIMAL(12,2), 42000)),
                (N'CAKE001', N'Bánh ngọt', N'Bánh croissant',      CONVERT(DECIMAL(12,2), 39000)),
                (N'JUICE01', N'Nước ép',   N'Nước ép cam tươi',    CONVERT(DECIMAL(12,2), 45000))
        ) AS v (ItemCode, CategoryName, ItemName, UnitPrice)
        INNER JOIN dbo.MenuCategories AS c ON c.CategoryName = v.CategoryName;
    END;

    IF NOT EXISTS (SELECT 1 FROM dbo.CafeTables)
    BEGIN
        INSERT INTO dbo.CafeTables (TableCode, Capacity, IsActive, Notes)
        VALUES
            (N'T01', 2, 1, N'Bàn đôi gần cửa sổ'),
            (N'T02', 2, 1, N'Bàn đôi khu vực trung tâm'),
            (N'T03', 4, 1, N'Bàn nhóm'),
            (N'T04', 4, 1, N'Bàn gần quầy'),
            (N'T05', 6, 0, N'Bàn tạm ngưng để bảo trì');
    END;

    IF NOT EXISTS (SELECT 1 FROM dbo.Employees)
    BEGIN
        INSERT INTO dbo.Employees (EmployeeCode, RoleID, FullName, Phone, Email, HireDate)
        SELECT v.EmployeeCode, r.RoleID, v.FullName, v.Phone, v.Email, v.HireDate
        FROM
        (
            VALUES
                (N'NV001', N'Admin',      N'Nguyễn Minh Anh',  N'0901000001', N'admin@cafedemo.vn',      CONVERT(DATE, '2023-01-10')),
                (N'NV002', N'Manager',    N'Trần Quốc Bảo',    N'0901000002', N'manager@cafedemo.vn',    CONVERT(DATE, '2023-03-15')),
                (N'NV003', N'Cashier',    N'Lê Thu Hà',        N'0901000003', N'cashier@cafedemo.vn',    CONVERT(DATE, '2024-02-01')),
                (N'NV004', N'Barista',    N'Phạm Hoàng Nam',   N'0901000004', N'barista@cafedemo.vn',    CONVERT(DATE, '2024-05-20')),
                (N'NV005', N'Accountant', N'Đỗ Ngọc Linh',     N'0901000005', N'accountant@cafedemo.vn', CONVERT(DATE, '2024-08-12'))
        ) AS v (EmployeeCode, RoleName, FullName, Phone, Email, HireDate)
        INNER JOIN dbo.Roles AS r ON r.RoleName = v.RoleName;
    END;

    IF NOT EXISTS (SELECT 1 FROM dbo.Customers)
    BEGIN
        INSERT INTO dbo.Customers
            (CustomerCode, CustomerType, FullName, Phone, Email, PasswordHash)
        VALUES
            (N'KH001', 'Member', N'Nguyễn Khánh Vy',  N'0912000001', N'vy@example.vn',   N'demo-hash-placeholder-001'),
            (N'KH002', 'Member', N'Trần Đức Long',    N'0912000002', N'long@example.vn', N'demo-hash-placeholder-002'),
            (N'KH003', 'Member', N'Lê Mỹ Duyên',      N'0912000003', N'duyen@example.vn',N'demo-hash-placeholder-003'),
            (N'KH004', 'Guest',  N'Khách vãng lai A', NULL,          NULL,                NULL),
            (N'KH005', 'Guest',  N'Khách vãng lai B', NULL,          NULL,                NULL);
    END;

    IF NOT EXISTS (SELECT 1 FROM dbo.Orders)
    BEGIN
        INSERT INTO dbo.Orders
            (OrderNumber, CustomerID, EmployeeID, CafeTableID, OrderType,
             OrderStatus, PaymentStatus, PaymentMethod, OrderDate)
        SELECT
            v.OrderNumber,
            c.CustomerID,
            e.EmployeeID,
            t.CafeTableID,
            v.OrderType,
            v.OrderStatus,
            v.PaymentStatus,
            v.PaymentMethod,
            DATEADD(HOUR, -v.HoursAgo, SYSDATETIME())
        FROM
        (
            VALUES
                (N'CF-2026-0001', N'KH001', N'NV003', N'T01', 'DineIn',   'Completed', 'Paid',   'Cash',     5),
                (N'CF-2026-0002', NULL,     N'NV003', N'T02', 'DineIn',   'Completed', 'Paid',   'EWallet',  4),
                (N'CF-2026-0003', N'KH002', N'NV004', N'T03', 'DineIn',   'Preparing', 'Unpaid', NULL,       2),
                (N'CF-2026-0004', N'KH004', N'NV003', N'T04', 'DineIn',   'Completed', 'Paid',   'Card',     1),
                (N'CF-2026-0005', NULL,     N'NV003', NULL,  'TakeAway', 'Completed', 'Paid',   'Transfer', 0)
        ) AS v (OrderNumber, CustomerCode, EmployeeCode, TableCode, OrderType,
                OrderStatus, PaymentStatus, PaymentMethod, HoursAgo)
        LEFT JOIN dbo.Customers AS c ON c.CustomerCode = v.CustomerCode
        INNER JOIN dbo.Employees AS e ON e.EmployeeCode = v.EmployeeCode
        LEFT JOIN dbo.CafeTables AS t ON t.TableCode = v.TableCode;
    END;

    IF NOT EXISTS (SELECT 1 FROM dbo.OrderDetails)
    BEGIN
        INSERT INTO dbo.OrderDetails (OrderID, LineNumber, MenuItemID, Quantity, UnitPrice)
        SELECT o.OrderID, 1, m.MenuItemID, v.Quantity, m.UnitPrice
        FROM
        (
            VALUES
                (N'CF-2026-0001', N'CF001',   CONVERT(SMALLINT, 2)),
                (N'CF-2026-0002', N'TEA001',  CONVERT(SMALLINT, 1)),
                (N'CF-2026-0003', N'CF002',   CONVERT(SMALLINT, 1)),
                (N'CF-2026-0004', N'CAKE001', CONVERT(SMALLINT, 2)),
                (N'CF-2026-0005', N'JUICE01', CONVERT(SMALLINT, 1))
        ) AS v (OrderNumber, ItemCode, Quantity)
        INNER JOIN dbo.Orders AS o ON o.OrderNumber = v.OrderNumber
        INNER JOIN dbo.MenuItems AS m ON m.ItemCode = v.ItemCode;
    END;

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION;
    THROW;
END CATCH;
GO

CREATE OR ALTER VIEW dbo.vw_OrderTotals
AS
    SELECT
        o.OrderID,
        o.OrderNumber,
        o.OrderDate,
        o.OrderStatus,
        o.PaymentStatus,
        COALESCE
        (
            SUM(CONVERT(DECIMAL(14,2), d.Quantity * d.UnitPrice)),
            CONVERT(DECIMAL(14,2), 0)
        ) AS OrderTotal
    FROM dbo.Orders AS o
    LEFT JOIN dbo.OrderDetails AS d ON d.OrderID = o.OrderID
    GROUP BY o.OrderID, o.OrderNumber, o.OrderDate, o.OrderStatus, o.PaymentStatus;
GO

SELECT N'Roles' AS TableName, COUNT_BIG(*) AS SampleRowCount FROM dbo.Roles
UNION ALL SELECT N'MenuCategories', COUNT_BIG(*) FROM dbo.MenuCategories
UNION ALL SELECT N'MenuItems', COUNT_BIG(*) FROM dbo.MenuItems
UNION ALL SELECT N'CafeTables', COUNT_BIG(*) FROM dbo.CafeTables
UNION ALL SELECT N'Employees', COUNT_BIG(*) FROM dbo.Employees
UNION ALL SELECT N'Customers', COUNT_BIG(*) FROM dbo.Customers
UNION ALL SELECT N'Orders', COUNT_BIG(*) FROM dbo.Orders
UNION ALL SELECT N'OrderDetails', COUNT_BIG(*) FROM dbo.OrderDetails;
GO
