# Báo Cáo Cá Nhân – Thành Viên 1 (TV1)
**Họ và tên:** [Tên sinh viên TV1]  
**MSSV:** [Mã số sinh viên]  
**Vai trò:** Trưởng nhóm, Thiết kế kiến trúc & Tích hợp hệ thống  
**Môn học:** Phát triển ứng dụng Web (PROG2008)  

---

## 1. Giới thiệu đề tài và mục tiêu

### 1.1. Bối cảnh đề tài
Trong mô hình vận hành quán cà phê thực tế, việc quản lý và phân công công việc hàng ngày giữa các ca trực (ca sáng, ca tối, ca đóng cửa) thường gặp nhiều bất cập nếu chỉ quản lý qua sổ sách hoặc tin nhắn rời rạc. Tình trạng sót việc bàn giao, không rõ tiến độ hoàn thành, thiếu minh bạch về trách nhiệm công việc giữa các nhân viên là nguyên nhân chính dẫn đến giảm sút chất lượng phục vụ và thất thoát nguyên vật liệu.

### 1.2. Mục tiêu dự án
Dự án **Cafe Task Manager** được xây dựng nhằm cung cấp một giải pháp quản lý công việc và điều phối ca làm việc tinh gọn, hiệu quả và hiện đại cho các quán cà phê vừa và nhỏ:
- **Tự động hóa luồng phân công**: Giao việc theo ca làm, phân loại danh mục (pha chế, phục vụ, vệ sinh, kho vận, thu ngân).
- **Phân quyền người dùng rõ ràng**: Phân tách vai trò Quản lý (Admin) và Nhân viên (Staff).
- **Giám sát thời gian thực**: Trực quan hóa tiến độ bằng báo cáo KPI, biểu đồ trực quan và cập nhật trạng thái tức thời.
- **Tuân thủ chuẩn phát triển Web**: Mô hình 3 tầng (3-tier Architecture), RESTful API, bảo mật dữ liệu, kiểm soát kiểm thử và đáp ứng giao diện đa thiết bị (Responsive).

---

## 2. Khảo sát và phân tích yêu cầu hệ thống

Hệ thống được thiết kế đáp ứng đầy đủ các yêu cầu chức năng (FR) và phi chức năng (NFR), đồng thời bao phủ 100% các nhóm tiêu chuẩn bắt buộc của môn học.

### 2.1. Ma trận đối chiếu 10 nhóm chức năng cốt lõi

| STT | Nhóm chức năng bắt buộc | Mô tả chi tiết | File / Endpoint cài đặt |
| :---: | :--- | :--- | :--- |
| 1 | **Đăng ký tài khoản** | Tạo mới tài khoản nhân viên, kiểm tra trùng lặp email, băm mật khẩu bảo mật | `POST /api/auth/register`<br>`public/register.html` |
| 2 | **Đăng nhập hệ thống** | Xác thực danh tính, cấp phát JWT thời hạn 8 giờ, lưu phiên đăng nhập an toàn | `POST /api/auth/login`<br>`public/login.html` |
| 3 | **Đăng xuất hệ thống** | Hủy phiên làm việc phía máy chủ và xóa sạch token/thông tin người dùng ở client | `POST /api/auth/logout`<br>`public/assets/js/api.js` |
| 4 | **Quản lý tài khoản (Profile)** | Xem thông tin cá nhân, cập nhật họ tên, đổi mật khẩu bảo mật (kiểm tra mật khẩu cũ) | `GET /api/me`<br>`PUT /api/me`<br>`public/profile.html` |
| 5 | **Quản lý dữ liệu nghiệp vụ (CRUD)** | Quản lý toàn diện Công việc (`Tasks`), Ca làm việc (`Shifts`) và Danh mục (`Categories`) lưu trữ CSDL SQL Server | `routes/tasks.js`<br>`routes/shifts.js`<br>`routes/categories.js` |
| 6 | **Tìm kiếm dữ liệu** | Tìm kiếm theo tiêu đề và mô tả công việc (chống SQL Injection và escape ký tự wildcard) | `GET /api/tasks?search=...`<br>`public/tasks.html` |
| 7 | **Lọc dữ liệu** | Bộ lọc đa tiêu chí kết hợp: theo trạng thái, mức độ ưu tiên, danh mục và ca làm việc | `GET /api/tasks?status=...&priority=...` |
| 8 | **Phân trang dữ liệu** | Phân trang danh sách công việc ở tầng CSDL bằng `OFFSET ... FETCH`, trả về thông tin phân trang chuẩn | `GET /api/tasks?page=1&pageSize=10` |
| 9 | **Phân quyền người dùng (RBAC)** | Phân quyền 2 cấp: Admin (toàn quyền quản trị, CRUD ca và việc) và Staff (chỉ xem, nhận việc, đổi trạng thái việc) | `middleware/auth.js` (`requireRole`)<br>`shifts.js`, `tasks.js` |
| 10 | **Thống kê & Báo cáo** | Thống kê số lượng theo trạng thái, tỷ lệ hoàn thành, việc quá hạn và biểu đồ trực quan hóa dữ liệu | `GET /api/stats`<br>`public/statistics.html` |

---

## 3. Thiết kế kiến trúc hệ thống

### 3.1. Mô hình kiến trúc 3 tầng (3-Tier Architecture)
Hệ thống áp dụng mô hình 3 tầng phân tách độc lập nhằm đảm bảo tính module hóa, dễ bảo trì và mở rộng:

1. **Tầng Trình bày (Presentation Tier - Frontend)**:
   - Xây dựng bằng HTML5, CSS3, JavaScript thuần (Vanilla JS ES6+).
   - Tận dụng Bootstrap 5 CDN cho layout responsive và Chart.js cho biểu đồ thống kê.
   - Giao tiếp với tầng máy chủ hoàn toàn thông qua phương thức `fetch()` bất đồng bộ (AJAX/REST).
2. **Tầng Xử lý Nghiệp vụ (Application / Business Logic Tier - Backend)**:
   - Máy chủ Node.js với nền tảng Express.js đóng vai trò REST API Gateway.
   - Quản lý pipeline thông qua chuỗi Middleware: CORS, JSON Parser, Static Serving, Rate Limiting, Authentication (`verifyToken`), Authorization (`requireRole`) và Global Error Handler.
   - Xử lý business rules, xác thực dữ liệu đầu vào và điều phối giao tác.
3. **Tầng Dữ liệu (Data Tier - Database)**:
   - Hệ quản trị cơ sở dữ liệu Microsoft SQL Server lưu trữ dữ liệu bền vững.
   - Kết nối thông qua Connection Pool được cấu hình tối ưu trong `server/db.js`, sử dụng truy vấn tham số hóa (Parameterized Queries) ngăn chặn triệt để SQL Injection.

### 3.2. Sơ đồ kiến trúc luồng dữ liệu (Mermaid)

```mermaid
flowchart TD
    subgraph Client ["Tầng Trình Bày (Client / Frontend)"]
        UI["Giao diện người dùng<br>(HTML5 / Bootstrap 5 / Vanilla JS)"]
        APIService["api.js<br>(apiFetch, Token Storage)"]
        UI --> APIService
    end

    subgraph Server ["Tầng Ứng Dụng (Node.js & Express API)"]
        MW_CORS["CORS & Static Files"]
        MW_RateLimit["Express Rate Limit"]
        MW_Auth["Auth Middleware<br>(verifyToken / requireRole)"]
        Routers["Express Routers<br>(auth, me, tasks, shifts, stats, categories)"]
        DB_Module["db.js<br>(Connection Pool & Query Helper)"]
        MW_Err["Global Error Handler<br>(errorHandler.js)"]

        APIService -->|HTTP/HTTPS REST Request + JWT| MW_CORS
        MW_CORS --> MW_RateLimit
        MW_RateLimit --> MW_Auth
        MW_Auth --> Routers
        Routers -->|Gọi truy vấn tham số hóa| DB_Module
        Routers -.->|Bắt lỗi ngoại lệ| MW_Err
    end

    subgraph Database ["Tầng Dữ Liệu (SQL Server)"]
        SQLDB[("Database: CafeTaskManager<br>Tables: Users, Roles, Tasks, Shifts, Categories")]
        DB_Module <-->|mssql driver (TCP/IP 1433)| SQLDB
    end

    MW_Err -->|JSON Error Response| Client
    Routers -->|JSON Success Response| Client
```

### 3.3. Luồng xử lý một yêu cầu tiêu biểu (Ví dụ: Thao tác Lưu Ca Làm Việc)
1. **Người dùng tương tác**: Admin nhập thông tin ca làm (Tên, Giờ bắt đầu, Giờ kết thúc, Ghi chú) vào Modal trên trang `shifts.html` và nhấn "Lưu ca làm".
2. **Kiểm tra sơ bộ tại Client (`shifts.js`)**: Kiểm tra bắt buộc các trường, so sánh logic `StartTime < EndTime`.
3. **Gửi yêu cầu REST (`api.js`)**: Hàm `apiFetch('/api/shifts', { method: 'POST', body: ... })` tự động trích xuất Bearer JWT token từ `localStorage` và gửi qua HTTP Header.
4. **Xác thực và phân quyền (`middleware/auth.js`)**:
   - `verifyToken`: Giải mã chữ ký JWT. Nếu không hợp lệ hoặc hết hạn -> trả 401 Unauthorized.
   - `requireRole('Admin')`: Kiểm tra thuộc tính `role === 'Admin'`. Nếu là Staff -> chặn và trả 403 Forbidden.
5. **Xử lý tại Router (`routes/shifts.js`)**: Kiểm tra dữ liệu chuyên sâu (độ dài chuỗi, regex giờ `HH:mm`).
6. **Thực thi CSDL (`db.js`)**: Thực thi lệnh `INSERT INTO Shifts ... OUTPUT INSERTED.Id ...` với tham số `@name, @startTime, @endTime, @note`.
7. **Phản hồi**: Trả về mã HTTP 201 Created kèm dữ liệu ca vừa tạo dạng JSON.
8. **Cập nhật giao diện**: Client nhận phản hồi, đóng Modal, gọi `showToast('Thêm ca làm việc thành công', 'success')` và tự động re-render danh sách ca.

---

## 4. Hướng dẫn cài đặt và sử dụng hệ thống

### 4.1. Yêu cầu môi trường
- **Node.js**: Phiên bản 18.x trở lên.
- **Hệ quản trị CSDL**: Microsoft SQL Server 2017+ (hoặc Express/Developer edition).
- **Công cụ hỗ trợ**: SQL Server Management Studio (SSMS) hoặc Azure Data Studio, VS Code.

### 4.2. Các bước triển khai cài đặt

1. **Khởi tạo Cơ sở dữ liệu**:
   - Mở SSMS, kết nối tới SQL Server localhost.
   - Mở và chạy file `database/schema.sql` để tạo cấu trúc cơ sở dữ liệu `CafeTaskManager`.
   - Chạy tiếp file `database/seed.sql` để nạp danh mục, ca làm việc và 30 công việc mẫu thực tế.

2. **Cấu hình biến môi trường**:
   - Di chuyển vào thư mục `server/`.
   - Sao chép file `.env.example` thành `.env`:
     ```bash
     cp .env.example .env
     ```
   - Điền thông tin kết nối SQL Server của máy tính vào file `.env`:
     ```env
     PORT=3000
     DB_SERVER=localhost
     DB_PORT=1433
     DB_NAME=CafeTaskManager
     DB_USER=cafe_app
     DB_PASSWORD=<Mật_Khẩu_SQL_Của_Bạn>
     DB_ENCRYPT=false
     DB_TRUST_CERT=true
     JWT_SECRET=super_secret_jwt_key_cafe_task_manager_2026
     ```

3. **Cài đặt thư viện và khởi tạo tài khoản**:
   - Tại thư mục `server/`, thực hiện lệnh cài đặt:
     ```bash
     npm install
     ```
   - Khởi tạo 2 tài khoản mẫu (đã được băm mật khẩu chuẩn):
     ```bash
     npm run seed:users
     ```
     *Tài khoản Admin:* `admin@cafe.com` / `Admin@123`  
     *Tài khoản Staff:* `staff@cafe.com` / `Staff@123`

4. **Khởi động ứng dụng**:
   - Chạy lệnh khởi động máy chủ:
     ```bash
     npm start
     ```
   - Truy cập vào ứng dụng tại trình duyệt web: `http://localhost:3000`

### 4.3. Hướng dẫn sử dụng theo vai trò

- **Dành cho Quản trị viên (Admin)**:
  - Đăng nhập bằng tài khoản `admin@cafe.com`.
  - Có toàn quyền: Thêm/Sửa/Xóa các Ca làm việc (`shifts.html`), phân công ca cho nhân viên.
  - Có toàn quyền: Thêm mới công việc, chỉnh sửa mọi thông tin, đổi trạng thái và xóa công việc (`tasks.html`).
  - Theo dõi toàn bộ chỉ số KPI, hiệu suất nhân viên và biểu đồ trực quan tại trang Thống kê (`statistics.html`).
- **Dành cho Nhân viên (Staff)**:
  - Đăng nhập bằng tài khoản `staff@cafe.com` (hoặc tài khoản tự đăng ký mới).
  - Xem danh sách ca trực và các việc cần làm trong ca của mình.
  - Được phép tạo công việc mới và cập nhật trạng thái tiến độ (`Pending` -> `InProgress` -> `Done`).
  - Không nhìn thấy và bị chặn thao tác sửa đổi cấu trúc ca, sửa chi tiết hoặc xóa công việc.
  - Tự cập nhật hồ sơ cá nhân và đổi mật khẩu tại trang Hồ sơ (`profile.html`).
