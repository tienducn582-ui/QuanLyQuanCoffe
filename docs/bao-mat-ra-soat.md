# BÁO CÁO RÀ SOÁT BẢO MẬT MÃ NGUỒN (SECURITY AUDIT)

- **Dự án:** Cafe Task Manager
- **Thành viên thực hiện rà soát:** TV2 (Xác thực, Phân quyền & Bảo mật)
- **Phạm vi rà soát (chỉ đọc đối với file của thành viên khác):** Toàn bộ các tệp trong `server/` và `public/assets/js/` hiện có trên nhánh `main`.
- **Các tiêu chí kiểm tra:**
  1. Thiếu middleware xác thực `verifyToken` hoặc phân quyền `requireRole('Admin')`.
  2. Nguy cơ SQL Injection do nối chuỗi trực tiếp thay vì truy vấn tham số hóa (`@param`).
  3. Thiếu kiểm tra dữ liệu đầu vào (validation) ở Client và Server.
  4. Nguy cơ XSS (Cross-Site Scripting) do chèn dữ liệu vào `innerHTML` mà không qua `escapeHtml`.
  5. Nguy cơ lộ `PasswordHash`, chuỗi kết nối CSDL hoặc thông tin nhạy cảm trong phản hồi API.

---

## 1. Bảng Kết Quả Rà Soát Các Vấn Đề Cần Khắc Phục / Hoàn Thiện

| Người sở hữu | File | Dòng | Lỗi / Điểm rủi ro phát hiện | Cách sửa khuyến nghị |
|:---:|:---|:---:|:---|:---|
| **TV1** | `server/routes/shifts.js` | `8 - 14` | File trên nhánh `main` đang ở trạng thái router khung (`router.get('/', ...)`), chưa gắn `verifyToken` và chưa có các route `POST`, `PUT`, `DELETE` gắn `requireRole('Admin')` cũng như kiểm tra giờ `isTimeHHmm`. | Bổ sung `verifyToken` cho `GET /api/shifts`; gắn `verifyToken, requireRole('Admin')` cho `POST /`, `PUT /:id`, `DELETE /:id` và kiểm tra đầu vào bằng `server/utils/validators.js` (merge từ nhánh `feature/tv1`). |
| **TV1** | `server/middleware/auth.js` | `19` | Biến `secret` có giá trị chuỗi dự phòng cố định (`'cafe_task_manager_super_secret_jwt_key_2026_xyz'`) khi `process.env.JWT_SECRET` chưa được thiết lập. | Đảm bảo luôn khai báo `JWT_SECRET` đủ mạnh (≥ 32 ký tự) trong file `server/.env` khi vận hành thực tế và không commit `.env` lên Git. |
| **TV1** | `public/assets/js/shifts.js` | `19, 69` | Dòng 19 render `<option>${role}</option>` và dòng 69 render `value="${person.id}"` trực tiếp vào `innerHTML` chưa bọc qua hàm `escape()`. | Bọc `${escape(role)}` và `value="${escape(person.id)}"` đồng bộ như cách đã làm ở dòng 63 để phòng ngừa DOM XSS tuyệt đối. |
| **TV3** | `server/routes/categories.js` | `8 - 14` | Đang là router khung mẫu, chưa gắn middleware `verifyToken` để yêu cầu người dùng đăng nhập trước khi lấy danh mục. | Gắn `verifyToken` vào `router.get('/', verifyToken, ...)` và truy vấn bảng `dbo.Categories` bằng `query()` của `server/db.js`. |
| **TV3** | `server/routes/tasks.js` | `8 - 14` | Đang là router khung mẫu trên nhánh `main`; chưa gắn `verifyToken` cho các route xem/tạo/đổi trạng thái, chưa gắn `requireRole('Admin')` cho `PUT /:id` và `DELETE /:id`, chưa validate đầu vào. | Gắn `verifyToken` cho toàn bộ router `/api/tasks`, gắn thêm `requireRole('Admin')` cho `PUT /:id` và `DELETE /:id`, dùng `validators.js` kiểm tra dữ liệu và tham số hóa mọi câu lệnh SQL qua `db.js`. |
| **TV3** | `public/assets/js/tasks.js` | `1 - 1115` | File `public/assets/js/tasks.js` hiện tại vẫn đang gọi `window.TaskService` (LocalStorage của bản MVP cũ) thay vì gọi REST API `/api/tasks` qua `apiFetch` và kiểm tra đăng nhập `requireLogin()`. | Cập nhật `public/assets/js/tasks.js` sang gọi `apiFetch('/api/tasks')`, gọi `requireLogin()` khi tải trang và ẩn nút Sửa/Xóa nếu `!isAdmin()`. |

---

## 2. Các Điểm Đã Đạt Chuẩn An Toàn Bảo Mật Trên Nhánh Hiện Tại

| Thành viên | File | Nội dung kiểm tra đạt chuẩn |
|:---:|:---|:---|
| **TV1** | `server/db.js` (dòng `28 - 44`, `77 - 90`) | Đọc cấu hình kết nối từ `process.env` (`dotenv`), hỗ trợ truyền tham số an toàn qua `request.input(key, value)` giúp chống SQL Injection. |
| **TV1** | `server/middleware/errorHandler.js` (dòng `19 - 35`) | Tự động ẩn chi tiết lỗi SQL Server (`err.name === 'MSSQLError'`) và lỗi 500, không để lộ chuỗi kết nối hay stack trace ra phản hồi JSON. |
| **TV2** | `server/utils/validators.js`, `server/routes/auth.js`, `server/routes/me.js`, `server/routes/users.js`, `server/seedUsers.js`, `public/assets/js/auth.js` | Đã kiểm tra dữ liệu hai lớp (Client + Server), băm mật khẩu bằng `bcryptjs` (10 rounds), giới hạn đăng nhập sai bằng `express-rate-limit` (20 lần / 15 phút), truy vấn tham số hóa 100%, và loại bỏ hoàn toàn `PasswordHash` khỏi mọi phản hồi API. |
| **TV4** | `server/routes/stats.js` (dòng `23 - 130`), `public/assets/js/statistics.js` | Đã gắn `verifyToken` cho `GET /api/stats`, câu lệnh SQL an toàn, bắt lỗi không lộ thông tin nhạy cảm, phía client có `safeRequireLogin()`. |
| **TV5** | `public/assets/js/api.js`, `public/assets/js/ui.js` | Tự động gắn `Bearer <token>`, tự động xóa phiên và chuyển về `login.html` khi gặp `401`, cung cấp hàm `escapeHtml()` và `validateField()` chuẩn cho toàn hệ thống. |
