Kế hoạch bổ sung ở docs/ke-hoach-mo-rong.md; luật LIÊN-TV và luật test áp dụng cho mọi tác vụ.

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


KIỂM THỬ TỰ ĐỘNG (BẮT BUỘC SAU MỖI LẦN LÀM XONG MỘT PHẦN)
Phạm vi của mỗi người = các file ghi trong mục "Phân công và file sở hữu" của tài liệu kế hoạch (cột file code và file tài liệu của người đó). Làm xong code hoặc giao diện thì phải tự test phần thuộc phạm vi mình trước khi báo xong. Chưa chạy thì ghi "chưa kiểm tra", không được khẳng định đã đạt.

A. Công cụ và nơi lưu
- Mọi script, ảnh chụp, log của test nằm trong thư mục .local-test/ ở gốc repo. Thư mục này nằm trong .gitignore và KHÔNG BAO GIỜ git add.
- Dùng Playwright cài riêng trong .local-test/ (npm init -y; npm i -D playwright; mở Chrome có sẵn bằng channel 'chrome' để khỏi tải trình duyệt). Không thêm gì vào server/package.json. Không có Playwright thì dùng browser agent của Antigravity, nhưng vẫn phải chụp ảnh và đo.
- Tự bật server (npm start trong server/) trước khi test, tắt sau khi xong. Không đọc .env thật. Dùng tài khoản mẫu admin@cafe.com và staff@cafe.com.
- Dữ liệu tạo khi test có tiền tố TEST_ và phải xóa lại; không xóa hay sửa dữ liệu seed.
- Được dùng mock API (page.route) để test giao diện khi backend chưa có, nhưng mock chỉ tồn tại trong .local-test/, không đưa vào mã nguồn, và báo cáo phải ghi rõ "test bằng mock".
- File văn bản trong repo phải là UTF-8. Cấm ghi file bằng '>' hoặc Out-File của PowerShell 5; dùng Node (writeFileSync) hoặc editor.
- Sau khi ghi file, kiểm tra byte đầu không phải FF FE.

B. Test giao diện cho MỌI trang thuộc phạm vi, ở 5 cỡ 375x667, 768x1024, 1200x800, 1366x768, 1920x1080, cả chế độ sáng và tối
1. Không tràn ngang: document.documentElement.scrollWidth <= window.innerWidth. Liệt kê phần tử có getBoundingClientRect().right > innerWidth (bỏ qua phần tử nằm trong khối cố ý cuộn ngang overflow-x:auto).
2. Không dính, không chồng: mọi nút, ô nhập, liên kết nhìn thấy được không giao nhau (trừ quan hệ cha-con); hai phần tử tương tác cạnh nhau cách nhau ít nhất 8px; ở 375px vùng chạm cao ít nhất 40px.
3. Chữ không bị cắt ngoài ý muốn (scrollWidth > clientWidth ở phần tử overflow:hidden không do text-overflow có chủ ý). Nhập chuỗi 80 ký tự không dấu cách vào mọi ô nhập và tên hiển thị: bố cục không vỡ.
4. Thanh điều hướng: ở 375px thu gọn; bấm nút mở menu thì hiện đủ mục; bấm từng liên kết đến đúng trang; mục của trang hiện tại có trạng thái active.
5. Không lỗi console; không request 4xx hoặc 5xx ngoài dự kiến (404 file tĩnh là lỗi).
6. Màu: (1) lấy màu nền hiệu lực (computed background-color, đi ngược lên phần tử cha cho tới khi có màu đặc) của body, main và mọi khối chiếm trên 20% diện tích viewport: không được là #0d6efd hoặc gần nó (mỗi kênh RGB lệch tối đa 40); (2) đếm pixel trên ảnh chụp từng trang: quá 2% pixel gần #0d6efd (mỗi kênh lệch tối đa 25) là LỖI; (3) nút, liên kết, tiêu đề phụ, viền focus, trạng thái active và hover không được là xanh Bootstrap; (4) tỷ lệ tương phản WCAG của mọi đoạn chữ và nút so với nền hiệu lực tối thiểu 4.5 (chữ cỡ lớn tối thiểu 3), cả chế độ sáng và tối.
7. Chụp ảnh từng trang x từng cỡ vào .local-test/screenshots/ và PHẢI tự xem ảnh để nhận xét bằng mắt (số đo đạt chưa đủ).
8. Trạng thái rỗng, đang tải và lỗi hiển thị đúng ở trang có các trạng thái đó.
9. Nhất quán giữa các trang: navbar của mọi trang cùng cấu trúc DOM, font-family, chiều cao, logo, thứ tự mục (chỉ khác theo trạng thái đăng nhập và vai trò); script so sánh giữa các trang, lệch là LỖI. Chưa đăng nhập: navbar chỉ có Trang chủ, Đăng nhập, Đăng ký. Tiêu đề h1, h2 cùng một bộ font.
10. Icon và hình minh họa thuộc bảng màu nâu của dự án (không có tím hoặc màu mặc định của emoji); kiểm bằng ảnh chụp và ghi nhận xét từng ảnh vào baseline.md.
11. Khoảng cách và bố cục: nội dung chính cách navbar ít nhất 24px; login.html và register.html không cuộn dọc ở 1366x768 và 1920x1080 và footer nằm ở đáy trang; mọi cặp phần tử tương tác nằm cạnh nhau (nút, liên kết) cách nhau ít nhất 8px, tính bằng getBoundingClientRect cho TẤT CẢ cặp cùng hàng (script cũ bỏ sót cặp nút-liên kết ở index); h1 và h2 dùng text-wrap: balance, dòng cuối của tiêu đề nhiều dòng phải có từ 2 từ trở lên.
12. Gọn (mỗi trang, mỗi chế độ sáng hoặc tối): tối đa 2 họ font; tối đa 8 cỡ chữ khác nhau; tối đa 3 giá trị border-radius khác nhau; tối đa 2 kiểu box-shadow; tối đa 6 màu nền khác nhau (không tính trắng, đen, trong suốt); không còn emoji trong DOM hiển thị; đúng 1 nút đặc (nền nâu đậm) trong vùng nội dung chính, không tính navbar.
13. Cân đối: ở trang auth, thẻ căn giữa (chênh lệch lề trái và lề phải tối đa 2px; khoảng trống trên và dưới thẻ chênh tối đa 15% nếu trang không cuộn); ở hero hai cột trên 992px, tâm dọc hai cột lệch nhau tối đa 24px; các thẻ tính năng cùng hàng có cùng chiều cao và cùng chiều rộng (sai lệch tối đa 2px); lề trái logo navbar thẳng hàng với lề trái nội dung chính (sai lệch tối đa 2px).

C. Test luồng nghiệp vụ thật thuộc phạm vi mình (chạy thật qua trình duyệt hoặc file .http với server và CSDL thật)
- TV1: xem ca; Admin thêm, sửa, xóa ca; Staff không thấy và không gọi được thao tác quản trị; xóa ca thì công việc còn.
- TV2: đăng ký (đúng, trùng email, sai định dạng), đăng nhập đúng và sai, sửa hồ sơ, đổi mật khẩu, đăng xuất, giới hạn đăng nhập sai, mật khẩu trong CSDL đã băm.
- TV3: thêm, sửa, xóa, đổi trạng thái công việc; tìm kiếm, lọc, phân trang; xóa hết bản ghi ở trang cuối thì lùi trang; Staff bị 403 khi sửa và xóa.
- TV4: số liệu /api/stats khớp truy vấn GROUP BY trong SSMS; trang thống kê hiện đúng và có trạng thái chưa có dữ liệu; schema.sql và seed.sql chạy lại nhiều lần được.
- TV5: đăng ký hiện lỗi validation tiếng Việt từng ô; đăng nhập sai hiện lỗi trong #formError; navbar đổi theo trạng thái đăng nhập và vai trò; trang cần đăng nhập mà chưa đăng nhập thì về login.html; đăng xuất xóa token và user trong localStorage rồi về login.html; gặp 401 thì tự đăng xuất; đổi tên ở hồ sơ thì navbar cập nhật; trang chủ đổi nút theo trạng thái đăng nhập.
Luồng cần file hoặc API của người khác mà chưa có thật trên main thì DỪNG phần đó và nhắc: "ĐANG CHỜ: <file> của <TV>"; chỉ test giao diện bằng mock rồi ghi rõ.

D. Test ngoài phạm vi của mình
Được chạy để phát hiện lỗi, nhưng script, ảnh, log của chúng chỉ nằm trong .local-test/, không git add. Không sửa file của người khác để test đạt: ghi lỗi vào bảng (người sở hữu | file | lỗi | mức độ | cách sửa) để tôi gửi chủ file.

E. Ghi kết quả và báo cáo
- Kết quả test thuộc phạm vi của mình được tóm tắt thành bảng (Mã | Trang hoặc luồng | Cỡ màn hình | Kết quả thực tế | Đạt? | Ghi chú) vào file tài liệu thuộc phạm vi của mình (TV5: docs/ra-soat-giao-dien.md); file này được commit.
- Lỗi trong file của mình: sửa rồi chạy lại, tối đa 3 vòng; còn lỗi thì báo rõ.
- Trước khi đưa lệnh git cho tôi: chạy git status --short, bảo đảm .local-test/, node_modules, .env không nằm trong danh sách chuẩn bị add.

=== PHẦN MỞ RỘNG (9 tính năng bổ sung) ===
Mọi bảng, endpoint, hàm ở phần trên giữ nguyên; chỉ THÊM. Định dạng phản hồi, xác thực, phân quyền, quy tắc code: như phần trên.

FILE MỚI (chỉ chủ file được sửa)
database/ (TV4): schema-mo-rong.sql, seed-mo-rong.sql
server/routes/: schedule.js (TV1), templates.js (TV3), ingredients.js (TV4), customers.js (TV2), pos.js (TV5)
public/ và public/assets/js/ (cùng tên trang và tên js): schedule (TV1), templates (TV3), inventory (TV4), customers (TV2), my-tasks (TV5), pos (TV5)
docs/: ke-hoach-mo-rong.md, ra-soat-mo-rong.md (TV1). Thư mục .local-test/ chỉ ở máy, nằm trong .gitignore.
Trang mới dùng khung docs/khung-chung.html, có nav id='navbar', nạp script theo thứ tự: bootstrap bundle, api.js, ui.js, <tên-trang>.js; gọi requireLogin() khi tải trang.
Server đã gắn sẵn /api/schedule, /api/templates, /api/ingredients, /api/customers, /api/pos; chủ router ghi đè file khung. Router cũ được mở rộng: shifts.js (TV1), tasks.js (TV3), stats.js (TV4).

BẢNG MỚI (schema-mo-rong.sql xóa rồi tạo lại CHỈ các bảng này; chữ dùng NVARCHAR)
ShiftLogs(Id PK, ShiftId FK->Shifts CASCADE, UserId FK->Users CASCADE, LogDate DATE, StartedAt DATETIME2, EndedAt DATETIME2 null, HandoverNote NVARCHAR(500) null)
ShiftAssignments(Id PK, ShiftId FK->Shifts CASCADE, UserId FK->Users CASCADE, WorkDate DATE, UNIQUE(ShiftId,UserId,WorkDate))
TaskTemplates(Id PK, Title NVARCHAR(200), Description NVARCHAR(500) null, Priority 'Low'|'Medium'|'High', CategoryId FK->Categories SET NULL null, ShiftId FK->Shifts CASCADE, IsActive BIT default 1)
TaskLogs(Id PK, TaskId FK->Tasks CASCADE, UserId FK->Users SET NULL null, Action 'created'|'updated'|'status'|'comment', OldValue NVARCHAR(50) null, NewValue NVARCHAR(50) null, Comment NVARCHAR(500) null, CreatedAt default GETDATE())
Ingredients(Id PK, Name NVARCHAR(100) unique, Unit NVARCHAR(20), Quantity DECIMAL(10,2) default 0 CHECK>=0, MinQuantity DECIMAL(10,2) default 0 CHECK>=0, UpdatedAt)
Customers(Id PK, FullName NVARCHAR(100), Phone NVARCHAR(15) unique, Points INT default 0 CHECK>=0, CreatedAt)
DiningTables(Id PK, Name NVARCHAR(30) unique, Seats INT CHECK 1..20)
MenuItems(Id PK, Name NVARCHAR(100) unique, Price INT CHECK>=0, IsActive BIT default 1)
Orders(Id PK, TableId FK->DiningTables, CustomerId FK->Customers SET NULL null, Status 'Open'|'Paid'|'Cancelled', Total INT default 0, CreatedBy FK->Users SET NULL null, CreatedAt, PaidAt null); UNIQUE INDEX có điều kiện UX_Orders_OpenTable ON Orders(TableId) WHERE Status='Open'
OrderItems(Id PK, OrderId FK->Orders CASCADE, MenuItemId FK->MenuItems, Quantity INT CHECK 1..99, UnitPrice INT)
Dữ liệu mẫu (seed-mo-rong.sql, tiếng Việt, tham chiếu ca và danh mục theo TÊN, không gõ cứng Id): 6 mẫu việc (2 mỗi ca), 8 nguyên liệu (ít nhất 2 loại Quantity <= MinQuantity), 5 khách, 8 bàn, 10 món.

ENDPOINT MỚI (tất cả cần verifyToken; [Admin] = requireRole Admin)
TV3 /api/tasks: GET / thêm assigneeId=<số>|me và overdue=1; GET /:id/logs; POST /:id/comments {comment} (mọi vai trò)
TV1 /api/shifts: POST /:id/start; POST /:id/end {handoverNote?}; GET /logs?date=&shiftId=; GET /:id/handover (mọi vai trò). Đặt /logs trước /:id.
TV1 /api/schedule: GET /?from=&to=; GET /mine?from=&to= (đặt /mine trước /:id); POST / {shiftId,userId,workDate} [Admin]; DELETE /:id [Admin]
TV3 /api/templates: GET /?shiftId= (mọi vai trò); POST /, PUT /:id, DELETE /:id [Admin]; POST /generate {shiftId, date?} [Admin]
TV4 /api/stats: GET /by-user; GET /by-shift; GET /weekly?weeks=8 (mọi vai trò); GET /export.csv [Admin]
TV4 /api/ingredients: GET /?search=&lowOnly=1&page=&pageSize=; GET /:id; PATCH /:id/stock {delta} (mọi vai trò); POST /, PUT /:id, DELETE /:id [Admin]
TV2 /api/customers: GET /?search=&page=&pageSize=; GET /:id; POST /; POST /:id/earn {amount}; POST /:id/redeem {points} (mọi vai trò); PUT /:id, DELETE /:id [Admin]
TV5 /api/pos: GET /tables; GET /menu; POST /orders {tableId, customerId?}; GET /orders/:id; POST /orders/:id/items {menuItemId, quantity}; PATCH /orders/:id/items/:itemId {quantity}; DELETE /orders/:id/items/:itemId; POST /orders/:id/pay; POST /orders/:id/cancel (mọi vai trò); POST, PUT /:id, DELETE /:id của /tables và /menu [Admin]

QUY TẮC NGHIỆP VỤ
- Quá hạn: Deadline < CAST(GETDATE() AS DATE) AND Status <> 'Done'.
- assigneeId=me lấy req.user.id; giá trị khác số nguyên dương hoặc 'me' trả 400.
- Ghi TaskLogs (TV3, trong tasks.js): POST tạo việc -> 'created'; PATCH status -> 'status' kèm OldValue, NewValue; PUT -> 'status' nếu Status đổi, 'updated' nếu trường khác đổi; bình luận -> 'comment'. Lỗi ghi log chỉ ghi console, không làm hỏng thao tác chính.
- Tạo việc từ mẫu: Status 'Pending', AssigneeId NULL, Deadline = date; bỏ qua mẫu nếu đã có Tasks cùng Title + ShiftId + Deadline.
- Cảnh báo kho: sau PATCH stock, nếu Quantity <= MinQuantity và chưa có Tasks Title = N'Nhập hàng: ' + Name với Status <> 'Done' thì TV4 INSERT thẳng vào bảng Tasks (Priority 'High', Status 'Pending', Deadline hôm nay, danh mục 'Kho và mua hàng' lấy theo tên). Không sửa tasks.js.
- Điểm tích lũy: điểm = FLOOR(số tiền / 10000). Hạng tính khi trả về, không lưu: Points < 100 'Đồng', 100–299 'Bạc', từ 300 'Vàng'. Đổi điểm không được làm Points âm.
- POS: một bàn chỉ có một đơn Open; Total do server tính lại từ OrderItems, không tin client; UnitPrice chốt theo MenuItems.Price lúc thêm món; thanh toán xong thì đơn 'Paid', bàn trống; nếu đơn có CustomerId và bảng Customers có dữ liệu thì cộng điểm theo công thức trên trong cùng một batch.
- Mã lỗi: 400 dữ liệu sai, 401 chưa đăng nhập, 403 thiếu quyền, 404 không tìm thấy, 409 trùng hoặc xung đột trạng thái.

### 0.1 Luật LIÊN-TV: khi cần phần của thành viên khác

Áp dụng cho mọi tác vụ. Khi tác vụ cần một hàm, endpoint, bảng hoặc file do thành viên khác sở hữu:

- Kiểm tra trước: mở file đó trong repo, đối chiếu với hợp đồng (tên hàm, endpoint, cột đúng từng chữ).

- Đã có và đúng: chỉ ĐỌC và gọi nó. Không sao chép logic sang file của mình, không sửa file đó.

- Chưa có hoặc lệch hợp đồng: DỪNG riêng phần phụ thuộc đó, không tự viết thay, không tạo bản tạm trùng tên. Vẫn làm tiếp phần không phụ thuộc.

- Cần sửa file của người khác, dù chỉ 1 dòng: dừng, không sửa.

- Ở trường hợp 3 và 4, cuối báo cáo soạn sẵn “TIN NHẮN GỬI TVk” theo mẫu: [TVa → TVk] File: ... Cần: ... (hàm, endpoint hoặc cột). Lý do: ... Hạn: Mốc Xn.

- Báo cáo cuối của mọi tác vụ có đủ các mục: file đã đổi, cách kiểm tra, việc tôi làm tay, “Phần của TV khác đã dùng”, “Tin nhắn cần gửi” (ghi “không có” nếu trống).

### 0.2 Luật test của nhóm

Làm xong thì tự test phần thuộc tác vụ của mình trước khi báo xong:

- Giao diện: không tràn ngang, không dính hay chồng chữ ở 375px, 768px, 1200px.

- Luồng nghiệp vụ thật qua API và CSDL, thử cả Admin và Staff, cả trường hợp lỗi (dữ liệu sai, thiếu quyền, id không tồn tại).

- File test tạm, ảnh chụp, log test thuộc phần của thành viên khác: chỉ lưu trong thư mục .local-test/ trên máy (đã nằm trong .gitignore), không đưa lên GitHub. File docs/tests/tvN.http của tác vụ mình là file được sửa nên đưa lên bình thường.

- Chưa chạy thì nói rõ là chưa chạy, không khẳng định đã chạy.
