# AI_CONTEXT – Cafe Task Manager

BỐI CẢNH
Nhóm 5 sinh viên làm bài tập lớn môn Phát triển ứng dụng Web: ứng dụng Cafe Task Manager quản lý công việc và ca làm của quán cafe. Chỉ có 5 ngày nên code phải ĐƠN GIẢN, dễ đọc, chạy được ngay, có chú thích tiếng Việt ngắn. Người dùng phải hiểu code để trả lời vấn đáp, nên khi giải thích hãy dùng ngôn ngữ đơn giản.

YÊU CẦU BẮT BUỘC CỦA ĐỀ
Frontend + Backend + CSDL; đăng ký, đăng nhập, đăng xuất; quản lý tài khoản; CRUD qua Backend lưu CSDL (không dùng dữ liệu giả cố định, không dùng LocalStorage để lưu dữ liệu nghiệp vụ); tìm kiếm; lọc; phân trang; phân quyền ít nhất 2 vai trò; thống kê; mật khẩu phải băm; kiểm tra dữ liệu ở cả Client và Server; xử lý lỗi; không lộ thông tin kết nối CSDL; giao diện responsive.

CÔNG NGHỆ
Node.js 18+, Express, mssql (SQL Server chạy ở localhost), bcryptjs, jsonwebtoken, dotenv, cors, express-rate-limit. Frontend: HTML5, CSS3, JavaScript thuần (fetch), Bootstrap 5 và Chart.js qua CDN. Express phục vụ luôn thư mục public/ nên chỉ cần một lệnh npm start. Không dùng framework Frontend, TypeScript hay ORM.

CẤU TRÚC THƯ MỤC (ĐÃ CÓ SẴN TRONG REPO, không tạo thư mục hay file ngoài cấu trúc này)
server/: server.js, db.js, seedUsers.js, .env.example, package.json
server/middleware/: auth.js (verifyToken, requireRole), errorHandler.js
server/routes/: auth.js, me.js, users.js, tasks.js, categories.js, shifts.js, stats.js
server/utils/: validators.js
database/: schema.sql, seed.sql
public/: index.html, login.html, register.html, profile.html, tasks.html, shifts.html, statistics.html
public/assets/css/style.css
public/assets/js/: api.js, ui.js, auth.js, tasks.js, shifts.js, statistics.js
docs/: bao-cao/, ai-log/, tests/, slide/, video/, test-cases.md
README.md, AI_CONTEXT.md, .gitignore

CSDL tên CafeTaskManager (SQL Server), 5 bảng, cột chữ dùng NVARCHAR:
- Roles(Id PK identity, Name unique: 'Admin' hoặc 'Staff')
- Users(Id PK, FullName, Email unique, PasswordHash, RoleId FK->Roles, CreatedAt)
- Categories(Id PK, Name unique)
- Shifts(Id PK, Name, StartTime TIME, EndTime TIME, Note null)
- Tasks(Id PK, Title not null, Description null, Status chỉ nhận 'Pending'|'InProgress'|'Done', Priority chỉ nhận 'Low'|'Medium'|'High', Deadline DATE null, CategoryId FK null, ShiftId FK null, AssigneeId FK->Users null, CreatedAt). Các FK của Tasks dùng ON DELETE SET NULL.

HỢP ĐỒNG db.js
query(sql, params = {}) nhận params là object thường, ví dụ { id: 5 } ứng với @id trong câu SQL; trả về result của mssql (dùng result.recordset và result.rowsAffected). Mọi truy vấn phải tham tham số hóa, không nối chuỗi. Cột TIME của mssql trả về kiểu Date: khi trả JSON phải đổi sang chuỗi 'HH:mm'.

ĐỊNH DẠNG PHẢN HỒI API
- Thành công: { success: true, data: ..., message: '...' }
- Danh sách: { success: true, data: [...], pagination: { page, pageSize, total, totalPages } }
- Lỗi: { success: false, message: '...', errors: [tùy chọn] } với mã 400/401/403/404/409/500.
- Xác thực: header Authorization: Bearer <JWT>. JWT chứa { id, email, role }, hạn 8 giờ. Frontend lưu token vào localStorage khóa 'token' và thông tin người dùng khóa 'user'.

ENDPOINT (dùng đúng tên này, không đổi)
- POST /api/auth/register {fullName,email,password} -> tạo tài khoản Staff
- POST /api/auth/login {email,password} -> data { token, user: {id,fullName,email,role} }
- POST /api/auth/logout (cần token)
- GET, PUT /api/me (PUT: fullName, tùy chọn currentPassword + newPassword)
- GET /api/users (đã đăng nhập; chỉ trả id, fullName, role)
- GET /api/categories
- GET /api/tasks?search=&status=&priority=&categoryId=&shiftId=&page=1&pageSize=10
- GET /api/tasks/:id ; POST /api/tasks ; PUT /api/tasks/:id (Admin) ; PATCH /api/tasks/:id/status {status} ; DELETE /api/tasks/:id (Admin)
- GET /api/shifts ; POST /api/shifts ; PUT, DELETE /api/shifts/:id (chỉ Admin)
- GET /api/stats -> data { totals: {total,pending,inProgress,done,overdue,completionRate}, byStatus: [{label,count}], byPriority: [...], byCategory: [...] }

PHÂN QUYỀN
Admin làm được tất cả. Staff: xem mọi thứ, tạo task, đổi trạng thái task (PATCH), sửa hồ sơ của mình; KHÔNG được sửa toàn bộ hoặc xóa task, KHÔNG được thêm/sửa/xóa ca.

HÀM DÙNG CHUNG Ở FRONTEND (api.js và ui.js do TV5 viết, mọi trang dùng đúng tên này)
- api.js: apiFetch(path, options) trả về JSON, tự gắn Bearer token, gặp 401 thì xóa token và chuyển về login.html, lỗi thì throw Error(message); getUser(); isAdmin(); requireLogin(); logout().
- ui.js: showToast(message, type) với type là 'success'|'danger'|'warning'; renderNavbar(); renderPagination(containerEl, pagination, onPageChange); showEmpty(containerEl, text); escapeHtml(str); showLoading(el); hideLoading(el); validateField(inputEl, rules).

QUY TẮC CODE
Viết code đầy đủ chạy được (không để '...', không viết tắt); không hard-code mật khẩu hay chuỗi kết nối (dùng .env); SQL tham số hóa; render dữ liệu lên HTML phải dùng escapeHtml; mỗi lần chỉ làm đúng phần được yêu cầu.

QUY TẮC LÀM VIỆC TRÊN REPO (agent bắt buộc tuân thủ)
1. Đọc các file liên quan trong repo trước khi viết. Sửa trực tiếp file đã có đúng đường dẫn; không tạo bản sao (_v2, _new, copy) và không tạo thư mục mới.
2. Chỉ tạo, sửa, xóa file nằm trong dòng FILE ĐƯỢC SỬA của prompt. Cần đụng file khác thì DỪNG, nói rõ file nào, sửa gì, vì sao; không tự làm.
3. Trước khi ghi, liệt kê file sẽ tạo, sửa, xóa.
4. Không chạy git commit, push, merge, reset, checkout. Không đọc, ghi hay in nội dung file .env thật; không hỏi mật khẩu; không ghi mật khẩu vào file nào được Git theo dõi.
5. Chạy được lệnh kiểm tra (npm start, request .http) thì chạy và báo kết quả thật. Không chạy được thì nói rõ, không khẳng định đã chạy.
6. Máy dùng Windows PowerShell. Test API bằng file .http (REST Client) trong docs/tests/, không dùng curl.
7. Tên file, endpoint, hàm, id HTML trong tài liệu này là hợp đồng giữa 5 người; không đổi. Muốn đổi thì dừng và báo.
8. Cuối mỗi lần làm, liệt kê: file đã đổi, cách kiểm tra, việc tôi phải làm tay.
