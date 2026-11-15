-- =====================================================================
-- CAFE TASK MANAGER - DATABASE SCHEMA (SQL SERVER)
-- Thành viên phụ trách: TV4 (Cơ sở dữ liệu, Thống kê, Kiểm thử)
-- Database name: CafeTaskManager
-- =====================================================================

-- 1. Tạo cơ sở dữ liệu nếu chưa tồn tại
IF DB_ID(N'CafeTaskManager') IS NULL
BEGIN
    CREATE DATABASE [CafeTaskManager];
END;
GO

USE [CafeTaskManager];
GO

-- 2. Xóa các bảng theo thứ tự phụ thuộc (khóa ngoại) nếu đã tồn tại
-- Thứ tự: Tasks -> Users -> Shifts -> Categories -> Roles
IF OBJECT_ID(N'dbo.Tasks', N'U') IS NOT NULL DROP TABLE dbo.Tasks;
IF OBJECT_ID(N'dbo.Users', N'U') IS NOT NULL DROP TABLE dbo.Users;
IF OBJECT_ID(N'dbo.Shifts', N'U') IS NOT NULL DROP TABLE dbo.Shifts;
IF OBJECT_ID(N'dbo.Categories', N'U') IS NOT NULL DROP TABLE dbo.Categories;
IF OBJECT_ID(N'dbo.Roles', N'U') IS NOT NULL DROP TABLE dbo.Roles;
GO

-- 3. Tạo bảng Roles (Vai trò người dùng: Admin, Staff)
CREATE TABLE dbo.Roles (
    Id INT IDENTITY(1,1) NOT NULL,
    Name NVARCHAR(50) NOT NULL,
    CONSTRAINT PK_Roles PRIMARY KEY (Id),
    CONSTRAINT UQ_Roles_Name UNIQUE (Name)
);
GO

-- 4. Tạo bảng Users (Tài khoản người dùng hệ thống)
CREATE TABLE dbo.Users (
    Id INT IDENTITY(1,1) NOT NULL,
    FullName NVARCHAR(100) NOT NULL,
    Email NVARCHAR(100) NOT NULL,
    PasswordHash NVARCHAR(255) NOT NULL,
    RoleId INT NOT NULL,
    CreatedAt DATETIME NOT NULL CONSTRAINT DF_Users_CreatedAt DEFAULT GETDATE(),
    CONSTRAINT PK_Users PRIMARY KEY (Id),
    CONSTRAINT UQ_Users_Email UNIQUE (Email),
    CONSTRAINT FK_Users_Roles FOREIGN KEY (RoleId) REFERENCES dbo.Roles (Id)
);
GO

-- 5. Tạo bảng Categories (Danh mục công việc quán cafe)
CREATE TABLE dbo.Categories (
    Id INT IDENTITY(1,1) NOT NULL,
    Name NVARCHAR(100) NOT NULL,
    CONSTRAINT PK_Categories PRIMARY KEY (Id),
    CONSTRAINT UQ_Categories_Name UNIQUE (Name)
);
GO

-- 6. Tạo bảng Shifts (Ca làm việc tại quán cafe)
CREATE TABLE dbo.Shifts (
    Id INT IDENTITY(1,1) NOT NULL,
    Name NVARCHAR(50) NOT NULL,
    StartTime TIME NOT NULL,
    EndTime TIME NOT NULL,
    Note NVARCHAR(255) NULL,
    CONSTRAINT PK_Shifts PRIMARY KEY (Id)
);
GO

-- 7. Tạo bảng Tasks (Công việc của quán cafe)
-- Ràng buộc:
--   - Status: chỉ nhận 'Pending', 'InProgress', 'Done'
--   - Priority: chỉ nhận 'Low', 'Medium', 'High'
--   - Khóa ngoại dùng ON DELETE SET NULL để khi xóa danh mục, ca làm hoặc người dùng thì công việc không bị mất
CREATE TABLE dbo.Tasks (
    Id INT IDENTITY(1,1) NOT NULL,
    Title NVARCHAR(200) NOT NULL,
    Description NVARCHAR(MAX) NULL,
    Status NVARCHAR(20) NOT NULL 
        CONSTRAINT DF_Tasks_Status DEFAULT ('Pending')
        CONSTRAINT CK_Tasks_Status CHECK (Status IN (N'Pending', N'InProgress', N'Done')),
    Priority NVARCHAR(20) NOT NULL 
        CONSTRAINT DF_Tasks_Priority DEFAULT ('Medium')
        CONSTRAINT CK_Tasks_Priority CHECK (Priority IN (N'Low', N'Medium', N'High')),
    Deadline DATE NULL,
    CategoryId INT NULL,
    ShiftId INT NULL,
    AssigneeId INT NULL,
    CreatedAt DATETIME NOT NULL CONSTRAINT DF_Tasks_CreatedAt DEFAULT GETDATE(),
    CONSTRAINT PK_Tasks PRIMARY KEY (Id),
    CONSTRAINT FK_Tasks_Categories FOREIGN KEY (CategoryId) REFERENCES dbo.Categories (Id) ON DELETE SET NULL,
    CONSTRAINT FK_Tasks_Shifts FOREIGN KEY (ShiftId) REFERENCES dbo.Shifts (Id) ON DELETE SET NULL,
    CONSTRAINT FK_Tasks_Users FOREIGN KEY (AssigneeId) REFERENCES dbo.Users (Id) ON DELETE SET NULL
);
GO

-- 8. Tạo Indexes tối ưu hiệu năng truy vấn cho bảng Tasks
-- Chỉ mục Status phục vụ lọc theo trạng thái và thống kê tỷ lệ
CREATE NONCLUSTERED INDEX IX_Tasks_Status ON dbo.Tasks (Status);
GO

-- Chỉ mục Deadline phục vụ sắp xếp thời hạn và tính toán công việc quá hạn
CREATE NONCLUSTERED INDEX IX_Tasks_Deadline ON dbo.Tasks (Deadline);
GO
