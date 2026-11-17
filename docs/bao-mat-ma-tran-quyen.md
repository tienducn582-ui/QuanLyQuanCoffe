# MA TRẬN PHÂN QUYỀN HỆ THỐNG CAFE TASK MANAGER

- **Dự án:** Cafe Task Manager – Hệ thống quản lý công việc và ca làm quán cafe
- **Thành viên phụ trách:** TV2 (Xác thực, Phân quyền & Bảo mật)
- **Tài liệu căn cứ:** `AI_CONTEXT.md`, `server/middleware/auth.js` (`verifyToken`, `requireRole`)

---

## 1. Cơ Chế Xác Thực & Phân Quyền Hai Lớp

1. **Xác thực (Authentication – `verifyToken`):**
   - Kiểm tra header `Authorization: Bearer <JWT>`.
   - Token hợp lệ được giải mã lấy `{ id, email, role }` (thời hạn 8 giờ) và gắn vào `req.user`.
   - Nếu thiếu hoặc token hết hạn/sai chữ ký → trả về **`401 Unauthorized`**.
2. **Phân quyền theo vai trò (Authorization – `requireRole(...roles)`):**
   - Kiểm tra `req.user.role` có thuộc danh sách vai trò được phép (`Admin`, `Staff`) hay không.
   - Nếu đã đăng nhập nhưng không đủ quyền → trả về **`403 Forbidden`**.

---

## 2. Bảng Ma Trận Phân Quyền Toàn Bộ Endpoint

| STT | Nhóm | Phương thức & Endpoint | Mô tả nghiệp vụ | Chưa đăng nhập | Staff (Nhân viên) | Admin (Quản trị viên) |
|:---:|:---|:---|:---|:---:|:---:|:---:|
| 1 | **Hệ thống** | `GET /api/health` | Kiểm tra trạng thái server & kết nối CSDL | `200 OK` | `200 OK` | `200 OK` |
| 2 | **Xác thực** | `POST /api/auth/register` | Đăng ký tài khoản mới (mặc định gán vai trò `Staff`) | `201 Created` *(hoặc `400`/`409`)* | `201 Created` | `201 Created` |
| 3 | **Xác thực** | `POST /api/auth/login` | Đăng nhập cấp phát JWT (giới hạn 20 lần / 15 phút) | `200 OK` *(sai: `401`, quá ngưỡng: `429`)* | `200 OK` | `200 OK` |
| 4 | **Xác thực** | `POST /api/auth/logout` | Đăng xuất phiên làm việc hiện tại | `401 Unauthorized` | `200 OK` | `200 OK` |
| 5 | **Hồ sơ** | `GET /api/me` | Xem thông tin tài khoản đang đăng nhập (ẩn `PasswordHash`) | `401 Unauthorized` | `200 OK` *(hoặc `404`)* | `200 OK` *(hoặc `404`)* |
| 6 | **Hồ sơ** | `PUT /api/me` | Cập nhật họ tên cá nhân và đổi mật khẩu của chính mình | `401 Unauthorized` | `200 OK` *(sai dữ liệu: `400`)* | `200 OK` *(sai dữ liệu: `400`)* |
| 7 | **Người dùng** | `GET /api/users` | Lấy danh sách nhân sự (`id`, `fullName`, `role`) để giao việc | `401 Unauthorized` | `200 OK` | `200 OK` |
| 8 | **Danh mục** | `GET /api/categories` | Lấy danh sách danh mục công việc quán cafe | `401 Unauthorized` | `200 OK` | `200 OK` |
| 9 | **Công việc** | `GET /api/tasks` | Tìm kiếm, lọc đa tiêu chí và phân trang danh sách công việc | `401 Unauthorized` | `200 OK` | `200 OK` |
| 10 | **Công việc** | `GET /api/tasks/:id` | Xem chi tiết một công việc theo ID | `401 Unauthorized` | `200 OK` *(không có: `404`)* | `200 OK` *(không có: `404`)* |
| 11 | **Công việc** | `POST /api/tasks` | Tạo mới công việc trong ca làm | `401 Unauthorized` | `201 Created` *(sai dữ liệu: `400`)* | `201 Created` *(sai dữ liệu: `400`)* |
| 12 | **Công việc** | `PUT /api/tasks/:id` | Chỉnh sửa toàn bộ thông tin công việc | `401 Unauthorized` | `403 Forbidden` | `200 OK` *(không có: `404`)* |
| 13 | **Công việc** | `PATCH /api/tasks/:id/status` | Đổi nhanh trạng thái công việc (`Pending` / `InProgress` / `Done`) | `401 Unauthorized` | `200 OK` *(không có: `404`)* | `200 OK` *(không có: `404`)* |
| 14 | **Công việc** | `DELETE /api/tasks/:id` | Xóa công việc khỏi hệ thống | `401 Unauthorized` | `403 Forbidden` | `200 OK` *(không có: `404`)* |
| 15 | **Ca làm việc** | `GET /api/shifts` | Xem danh sách ca làm việc kèm số lượng công việc | `401 Unauthorized` | `200 OK` | `200 OK` |
| 16 | **Ca làm việc** | `POST /api/shifts` | Tạo ca làm việc mới | `401 Unauthorized` | `403 Forbidden` | `201 Created` *(sai dữ liệu: `400`)* |
| 17 | **Ca làm việc** | `PUT /api/shifts/:id` | Cập nhật thông tin ca làm việc | `401 Unauthorized` | `403 Forbidden` | `200 OK` *(không có: `404`)* |
| 18 | **Ca làm việc** | `DELETE /api/shifts/:id` | Xóa ca làm việc (công việc thuộc ca chuyển `ShiftId = NULL`) | `401 Unauthorized` | `403 Forbidden` | `200 OK` *(không có: `404`)* |
| 19 | **Thống kê** | `GET /api/stats` | Xem báo cáo thống kê tổng quan KPI và dữ liệu biểu đồ | `401 Unauthorized` | `200 OK` | `200 OK` |

---

## 3. Tóm Tắt Quyền Hạn Theo Vai Trò

- **Chưa đăng nhập (Guest):** Chỉ được truy cập trang chủ `index.html`, trang `login.html`, `register.html` và gọi `POST /api/auth/login`, `POST /api/auth/register`, `GET /api/health`. Mọi truy cập vào trang nghiệp vụ hoặc API khác đều bị chặn (`401 Unauthorized` và tự động chuyển hướng về `login.html`).
- **Nhân viên (`Staff`):** Được xem toàn bộ công việc, ca làm, danh mục, danh sách nhân sự và thống kê; được tạo công việc mới (`POST /api/tasks`), cập nhật trạng thái công việc (`PATCH /api/tasks/:id/status`) và tự cập nhật hồ sơ/mật khẩu của mình (`PUT /api/me`). **Không** được sửa toàn bộ hoặc xóa công việc (`403 Forbidden`), **không** được thêm/sửa/xóa ca làm việc (`403 Forbidden`).
- **Quản trị viên (`Admin`):** Có toàn quyền của `Staff`, đồng thời có quyền chỉnh sửa toàn bộ hoặc xóa công việc (`PUT/DELETE /api/tasks/:id`) và thêm/sửa/xóa ca làm việc (`POST/PUT/DELETE /api/shifts`).
