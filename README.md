# Cafe Task Manager – Hệ Thống Quản Lý Công Việc & Ca Trực Quán Cà Phê

Ứng dụng Web quản lý toàn diện công việc, phân công ca trực và thống kê hiệu suất vận hành quán cà phê. Xây dựng theo kiến trúc 3 tầng (3-tier Architecture) với RESTful API chuẩn mực, phân quyền người dùng (Role-Based Access Control) và giao diện Responsive.

> **Môn học:** Phát triển ứng dụng Web (PROG2008)  
> **Nhóm thực hiện:** Nhóm 5 thành viên  

---

## 1. Yêu cầu hệ thống & Công nghệ sử dụng

- **Môi trường Backend:** Node.js (v18.x trở lên), Express.js
- **Cơ sở dữ liệu:** Microsoft SQL Server (2017 trở lên / Express / Developer)
- **Bảo mật & Tiện ích:** `bcryptjs` (băm mật khẩu 10 salt rounds), `jsonwebtoken` (JWT hạn 8 giờ), `express-rate-limit` (chống brute-force), `cors`, `dotenv`
- **Giao diện Frontend:** HTML5, CSS3, JavaScript thuần (Vanilla ES6+ Fetch API), Bootstrap 5 CDN, Chart.js CDN

---

## 2. Cấu trúc thư mục dự án

```text
QuanLyQuanCoffe-main/
├── .gitignore                       # Chặn node_modules, .env
├── AI_CONTEXT.md                    # Bản hợp đồng kỹ thuật và quy tắc dự án
├── README.md                        # Hướng dẫn cài đặt và vận hành hệ thống
├── database/
│   ├── schema.sql                   # Khởi tạo CSDL CafeTaskManager (5 bảng, ràng buộc, index)
│   └── seed.sql                     # Dữ liệu mẫu thực tế (Roles, Categories, Shifts, 30 Tasks)
├── server/
│   ├── server.js                    # Entry point máy chủ Express, cấu hình middleware
│   ├── db.js                        # Module kết nối SQL Server Connection Pool & hàm query()
│   ├── seedUsers.js                 # Script khởi tạo tài khoản mẫu Admin và Staff có băm mật khẩu
│   ├── .env.example                 # Mẫu khai báo biến môi trường kết nối
│   ├── middleware/
│   │   ├── auth.js                  # Middleware verifyToken và requireRole
│   │   └── errorHandler.js          # Xử lý lỗi tập trung 404 và 500 bảo mật
│   ├── routes/
│   │   ├── auth.js                  # Đăng ký, đăng nhập (rate-limit), đăng xuất
│   │   ├── me.js                    # Xem hồ sơ, sửa tên, đổi mật khẩu
│   │   ├── users.js                 # Lấy danh sách người dùng cho phân công việc
│   │   ├── categories.js            # Danh mục công việc
│   │   ├── tasks.js                 # CRUD công việc, tìm kiếm, lọc, phân trang
│   │   ├── shifts.js                # Quản lý ca làm việc và công việc trong ca
│   │   └── stats.js                 # API thống kê tổng quan và biểu đồ
│   └── utils/
│       └── validators.js            # Bộ thư viện kiểm tra dữ liệu đầu vào chuẩn
├── public/                          # Thư mục tĩnh phục vụ Frontend
│   ├── index.html                   # Trang chủ giới thiệu
│   ├── login.html                   # Trang đăng nhập
│   ├── register.html                # Trang đăng ký nhân viên
│   ├── profile.html                 # Trang quản lý hồ sơ cá nhân
│   ├── tasks.html                   # Trang quản lý công việc (bảng, lọc, phân trang)
│   ├── shifts.html                  # Trang phân công ca làm việc
│   ├── statistics.html              # Trang dashboard báo cáo & thống kê biểu đồ
│   └── assets/                      # CSS và JavaScript dùng chung
└── docs/                            # Tài liệu kiểm thử, báo cáo cá nhân và nhật ký AI
```

---

## 3. Hướng dẫn cài đặt và khởi chạy (Từng bước)

### Bước 1: Khởi tạo Cơ sở dữ liệu trên SQL Server
1. Mở **SQL Server Management Studio (SSMS)** hoặc **Azure Data Studio**.
2. Mở file [database/schema.sql](file:///c:/Users/NgTienDuc/Project/QuanLyQuanCoffe-main/database/schema.sql) và nhấn **Execute** để tạo CSDL `CafeTaskManager` cùng 5 bảng chuẩn (`Roles`, `Users`, `Categories`, `Shifts`, `Tasks`).
3. Mở file [database/seed.sql](file:///c:/Users/NgTienDuc/Project/QuanLyQuanCoffe-main/database/seed.sql) và nhấn **Execute** để nạp sẵn dữ liệu mẫu cốt lõi.
4. **Nạp CSDL tính năng mở rộng (Phiên bản v1.1):**
   - Mở file [database/schema-mo-rong.sql](file:///c:/Users/NgTienDuc/Project/QuanLyQuanCoffe-main/database/schema-mo-rong.sql) và nhấn **Execute** để tạo 10 bảng mới: `ShiftLogs`, `ShiftAssignments`, `TaskTemplates`, `TaskLogs`, `Ingredients`, `Customers`, `DiningTables`, `MenuItems`, `Orders`, `OrderItems`.
   - Mở file [database/seed-mo-rong.sql](file:///c:/Users/NgTienDuc/Project/QuanLyQuanCoffe-main/database/seed-mo-rong.sql) và nhấn **Execute** để nạp dữ liệu mẫu 6 mẫu việc, 8 nguyên liệu, 5 khách hàng, 8 bàn và 10 món thực đơn.

### Bước 2: Cấu hình biến môi trường (.env)
Vào thư mục `server/`, sao chép file `.env.example` thành `.env`:
```powershell
cd server
copy .env.example .env
```
Mở file `.env` vừa tạo và chỉnh sửa thông tin đăng nhập SQL Server trên máy bạn:
```env
PORT=3000
DB_SERVER=localhost
DB_PORT=1433
DB_NAME=CafeTaskManager
DB_USER=cafe_app
DB_PASSWORD=<Mật_Khẩu_SQL_Server_Của_Bạn>
DB_ENCRYPT=false
DB_TRUST_CERT=true
JWT_SECRET=super_secret_jwt_key_cafe_task_manager_2026
```

### Bước 3: Cài đặt thư viện và Khởi tạo tài khoản mẫu
Tại thư mục `server/`, chạy lệnh:
```powershell
npm install
npm run seed:users
```

### Bước 4: Khởi động máy chủ
```powershell
npm start
```
Máy chủ sẽ lắng nghe tại: `http://localhost:3000`. Truy cập trình duyệt để sử dụng ứng dụng!

---

## 4. Tài khoản mẫu kiểm thử hệ thống

| Vai trò | Email đăng nhập | Mật khẩu | Quyền hạn chính |
| :--- | :--- | :--- | :--- |
| **Quản trị viên (Admin)** | `admin@cafe.com` | `Admin@123` | Toàn quyền CRUD ca làm việc, công việc, danh mục, xem thống kê |
| **Nhân viên (Staff)** | `staff@cafe.com` | `Staff@123` | Xem ca, nhận việc, tạo việc, đổi trạng thái việc, quản lý hồ sơ của mình |

---

## 5. Danh sách RESTful API chính & Mở rộng (v1.1)

### 5.1. Các API Cốt Lõi
| Phương thức | Đường dẫn API | Xác thực / Quyền | Chức năng |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/health` | Public | Kiểm tra kết nối máy chủ và CSDL |
| `POST` | `/api/auth/register` | Public | Đăng ký tài khoản nhân viên mới |
| `POST` | `/api/auth/login` | Public (Rate limit) | Đăng nhập hệ thống, nhận JWT token |
| `POST` | `/api/auth/logout` | Đã đăng nhập | Đăng xuất |
| `GET`, `PUT` | `/api/me` | Đã đăng nhập | Xem và cập nhật thông tin cá nhân, đổi mật khẩu |
| `GET` | `/api/users` | Đã đăng nhập | Lấy danh sách nhân viên phục vụ giao việc |
| `GET` | `/api/categories` | Đã đăng nhập | Lấy danh mục công việc |
| `GET` | `/api/shifts` | Đã đăng nhập | Lấy danh sách ca làm việc kèm số lượng việc |
| `POST`, `PUT`, `DELETE` | `/api/shifts/:id` | **Chỉ Admin** | Thêm, sửa, xóa ca làm việc |
| `GET` | `/api/tasks` | Đã đăng nhập | Tìm kiếm, lọc đa tiêu chí, phân trang công việc |
| `POST` | `/api/tasks` | Đã đăng nhập | Tạo công việc mới |
| `PATCH` | `/api/tasks/:id/status` | Đã đăng nhập | Cập nhật nhanh trạng thái công việc (`Pending`, `InProgress`, `Done`) |
| `PUT`, `DELETE` | `/api/tasks/:id` | **Chỉ Admin** | Sửa chi tiết hoặc xóa công việc |
| `GET` | `/api/stats` | Đã đăng nhập | Tổng hợp KPI, tỷ lệ hoàn thành và dữ liệu biểu đồ |

### 5.2. Các API Tính Năng Mở Rộng (v1.1)
| Phương thức | Đường dẫn API | Xác thực / Quyền | Chức năng mở rộng |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/tasks?assigneeId=me&overdue=1` | Đã đăng nhập | [X1] Lọc việc của tôi và việc quá hạn (kèm huy hiệu Navbar) |
| `GET`, `POST` | `/api/tasks/:id/logs`, `/comments` | Đã đăng nhập | [X5] Lịch sử thao tác (TaskLogs) và gửi bình luận công việc |
| `GET` | `/api/shifts/logs?date=&shiftId=` | Đã đăng nhập | [X2] Nhật ký ca làm và bàn giao trong ngày |
| `POST` | `/api/shifts/:id/start`, `/:id/end` | Đã đăng nhập | [X2] Nhận ca và kết thúc ca làm việc kèm ghi chú bàn giao |
| `GET` | `/api/shifts/:id/handover` | Đã đăng nhập | [X2] Lấy thông tin bàn giao ca trước và danh sách việc còn dở |
| `GET` | `/api/schedule?from=&to=`, `/mine` | Đã đăng nhập | [X4] Lấy lịch phân ca tuần của quán hoặc của cá nhân |
| `POST`, `DELETE` | `/api/schedule`, `/api/schedule/:id` | **Chỉ Admin** | [X4] Phân công ca cho nhân viên hoặc hủy phân công |
| `GET`, `POST` | `/api/templates`, `POST /generate` | Đã đăng nhập / Admin | [X3] Checklist mẫu việc theo ca & Tự động sinh task cho ngày |
| `GET` | `/api/stats/by-user`, `/by-shift`, `/weekly` | Đã đăng nhập | [X6] Thống kê nâng cao theo nhân sự, theo ca và theo tuần |
| `GET` | `/api/stats/export.csv` | **Chỉ Admin** | [X6] Xuất dữ liệu công việc ra file CSV (UTF-8 BOM, an toàn injection) |
| `GET`, `PATCH` | `/api/ingredients`, `/:id/stock` | Đã đăng nhập | [X7] Quản lý tồn kho nguyên liệu, cảnh báo và tự tạo task nhập hàng |
| `GET`, `POST` | `/api/customers`, `/:id/earn`, `/:id/redeem` | Đã đăng nhập | [X8] Khách hàng thành viên, tích điểm (10k=1đ), đổi điểm không âm |
| `GET`, `POST` | `/api/pos/tables`, `/menu`, `/orders` | Đã đăng nhập | [X9] Hệ thống POS bán hàng, sơ đồ bàn, gọi món và thanh toán |

---

## 6. Tổng quan 9 tính năng mở rộng đã hoàn thiện (v1.1)

1. **[TV5-X1] Việc của tôi & Huy hiệu quá hạn:** Trang `my-tasks.html` lọc công việc được giao cho chính mình; huy hiệu `#overdueBadge` màu đỏ trên thanh điều hướng tự động hiển thị số việc quá hạn.
2. **[TV1-X2] Bàn giao ca:** Bắt đầu ca (`/start`), kết thúc ca (`/end`) với ghi chú bàn giao, xem thông tin bàn giao từ ca trước kèm danh sách công việc chưa hoàn thành (`/handover`) và bảng nhật ký ca hôm nay.
3. **[TV3-X3] Checklist mở/đóng ca (Mẫu việc):** Quản lý các mẫu công việc định kỳ theo ca (`templates.html`), tạo tự động hàng loạt công việc cho ngày làm việc mà không bị trùng lặp.
4. **[TV1-X4] Lịch phân ca tuần:** Lưới phân ca tuần (`schedule.html`) 7 ngày từ Thứ Hai đến Chủ Nhật, hiển thị nhân sự trực từng ca, tô đậm ca của chính mình, tự động chuyển thành danh sách thẻ theo ngày trên thiết bị di động (< 576px).
5. **[TV3-X5] Lịch sử và bình luận công việc:** Ghi nhật ký tự động (`TaskLogs`) khi tạo việc, sửa việc, đổi trạng thái; nhân viên và Admin có thể trao đổi thảo luận ngay dưới từng công việc.
6. **[TV4-X6] Thống kê nâng cao & Xuất CSV:** Biểu đồ hoàn thành theo nhân sự, theo ca làm và theo tuần; chức năng xuất file CSV tiếng Việt chuẩn UTF-8 có BOM và chống CSV Injection.
7. **[TV4-X7] Quản lý kho tối giản & Cảnh báo sắp hết:** Quản lý số lượng tồn kho nguyên liệu (`inventory.html`), khi xuất kho chạm ngưỡng tối thiểu sẽ tự động kích hoạt tạo việc "Nhập hàng" trong cùng giao dịch CSDL.
8. **[TV2-X8] Khách hàng tích điểm:** Quản lý hội viên quán (`customers.html`), tích điểm hóa đơn (10.000đ = 1 điểm), đổi điểm trừ nguyên tử an toàn tuyệt đối, tự động phân hạng Đồng, Bạc, Vàng.
9. **[TV5-X9] POS Bán hàng & Sơ đồ bàn:** Trực quan hóa trạng thái bàn (Trống / Có khách), mở đơn bàn, chọn món từ thực đơn, tính toán tổng tiền chặt chẽ tại server, thanh toán và tự động tích điểm cho khách.

---

## 7. Xử lý sự cố thường gặp (Troubleshooting)

1. **Lỗi kết nối CSDL (ConnectionError: Failed to connect to localhost:1433)**:
   - Mở **SQL Server Configuration Manager** -> **SQL Server Network Configuration** -> Chọn **Protocols for MSSQLSERVER** -> Bật (Enable) giao thức **TCP/IP**.
   - Kiểm tra dịch vụ SQL Server Browser và SQL Server đang ở trạng thái **Running**.
   - Đảm bảo SQL Server đang bật chế độ **SQL Server and Windows Authentication mode**.
2. **Lỗi 401 Unauthorized khi gọi API**:
   - Token JWT trong `localStorage` đã hết hạn (sau 8 giờ) hoặc không hợp lệ. Đăng nhập lại để nhận token mới.
3. **Lỗi 403 Forbidden khi thêm/sửa/xóa ca**:
   - Hành động yêu cầu quyền Admin. Hãy đăng nhập bằng tài khoản `admin@cafe.com`.
