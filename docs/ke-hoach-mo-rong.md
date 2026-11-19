# Kế hoạch bổ sung: 9 tính năng mở rộng và bộ prompt Antigravity – Cafe Task Manager

Nhóm 5 người · PROG2008 · Tháng 11/2026 · Bổ sung cho “Kế hoạch 5 ngày và bộ prompt AI”. Không thay thế các tác vụ P0–P7 đã có, chỉ thêm tác vụ mã E và X.

## 0. Dành cho AI Agent: đọc phần này trước

Tài liệu này được tải lên cùng AI_CONTEXT.md. Mỗi tác vụ có nhãn dạng [TV3-X5]. Cách lọc và làm việc:

- Người dùng nói “Tôi là TVn”. Chỉ làm tác vụ có nhãn [TVn-...]. Tác vụ mang nhãn TV khác: không làm, không sửa file của chúng, kể cả khi thấy lỗi (ghi lại để báo cho người dùng).

- Mỗi lượt chỉ làm đúng MỘT tác vụ, khi người dùng gọi tên mã. Làm xong thì dừng, báo cáo, chờ.

- Mỗi tác vụ có: FILE ĐƯỢC SỬA (chỉ được tạo hoặc sửa các file này), CHỈ ĐỌC, PHỤ THUỘC, các bước, XONG KHI.

- Mục 3 “Hợp đồng mở rộng” là hợp đồng giữa 5 người, có hiệu lực như AI_CONTEXT.md. Tên bảng, cột, endpoint, mã lỗi, tên file không được đổi. Muốn đổi thì dừng và báo.

- Toàn bộ 8 quy tắc làm việc trên repo trong AI_CONTEXT.md (kể cả luật về git) vẫn áp dụng cho mọi tác vụ ở đây.

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

### 0.3 Prompt khởi động (mỗi thành viên dán một lần khi bắt đầu phiên)

Đọc AI_CONTEXT.md và ke-hoach-mo-rong.md (kế hoạch bổ sung). Tôi là TV[n], nhánh feature/tv[n].
Chưa làm gì cả. Hãy:
1. Liệt kê MỌI tác vụ có nhãn [TV[n]-...] trong kế hoạch: mã, tên, mốc, nhóm ưu tiên, FILE ĐƯỢC SỬA, PHỤ THUỘC.
2. Với từng PHỤ THUỘC, kiểm tra trong repo hiện tại file hoặc endpoint đó đã có và đúng hợp đồng chưa; báo: đã có, chưa có, hoặc có nhưng lệch hợp đồng.
3. Đề xuất thứ tự làm của tôi theo mốc. Không đụng tới tác vụ của TV khác. Chờ tôi gọi tên mã tác vụ.

## 1. Tổng quan

| Mã | Tính năng | Người làm | Nhóm ưu tiên | Mốc | Phụ thuộc chính |
| --- | --- | --- | --- | --- | --- |
| X1 | Việc của tôi + huy hiệu quá hạn | TV5 | 1 | X1 | TV3-X5 phần 1 |
| X2 | Bàn giao ca | TV1 | 1 | X1 | TV4-E0 |
| X3 | Checklist mở/đóng ca (mẫu việc) | TV3 | 2 | X2 | TV4-E0, ca làm của TV1 |
| X4 | Lịch phân ca tuần | TV1 | 2 | X2 | TV4-E0, /api/users của TV2 |
| X5 | Lịch sử và bình luận công việc, bộ lọc me/overdue | TV3 | 1 | X1 | TV4-E0, validators.js của TV2 |
| X6 | Thống kê nâng cao + xuất CSV | TV4 | 1 | X1 | dữ liệu có sẵn |
| X7 | Kho tối giản + cảnh báo sắp hết | TV4 | 2 | X2 | TV4-E0, bảng Tasks |
| X8 | Khách hàng tích điểm | TV2 | 3 | X1–X2 | TV4-E0, ui.js của TV5 |
| X9 | POS + sơ đồ bàn (tùy chọn) | TV5 | 3 | X2 | TV4-E0, TV2-X8 (tùy chọn) |

Tác vụ chung (ảnh hưởng cả nhóm): **TV1-E0** (chép hợp đồng vào AI_CONTEXT.md, tạo router khung, gắn vào server), **TV4-E0** (bảng CSDL mới), **TV5-XU** (liên kết navbar), **TV1-XR** (rà soát mở rộng), **TVn-XD** (báo cáo, test, nhật ký AI của từng người).

Nhóm ưu tiên 1 làm chắc trước, rồi nhóm 2, rồi nhóm 3. Thứ tự này cũng là thứ tự giữ lại khi gần hạn chốt mà chưa xong (xem mục 7). Khi chưa có hạn chốt thì làm tuần tự, không cần vội.

## 2. Lịch làm

Nhóm có nhiều thời gian hơn dự kiến ban đầu, nên lịch dưới đây tính theo thứ tự phụ thuộc, không theo giờ cố định. Hạn chốt đóng băng v1.1 do nhóm thống nhất và thông báo riêng; khi chưa có thông báo thì không có hạn cứng.

| Mốc | Thời điểm | Tác vụ | Điều kiện bắt đầu | Bàn giao |
| --- | --- | --- | --- | --- |
| X0 | Ngay sau khi 2A đã merge vào dev | TV1-E0 và TV4-E0, song song | 2A đã merge | Hợp đồng nằm trong AI_CONTEXT.md, 10 bảng mới, 5 router khung. Merge dev ngay, cả nhóm pull và chạy 2 file SQL mở rộng |
| X1 | Sau khi X0 đã merge vào dev, các tác vụ chạy song song | TV3-X5 (phần 1 push đầu tiên), TV5-X1, TV4-X6, TV1-X2; TV2-X8 làm khi xong 3A | X0 đã merge | Các tính năng nhóm 1 |
| X2 | Sau khi xong việc nhóm 1 của mình, không có hạn cứng theo giờ | TV3-X3, TV1-X4, TV4-X7, TV5-X9; TV2-X8 nếu chưa xong | Xong việc nhóm 1 của mình | Các tính năng nhóm 2 và 3 |
| X3 | Khi các tính năng định giữ lại đã merge vào dev | TV5-XU, TV1-XR | Các tính năng làm xong đã merge vào dev | Navbar đủ liên kết, docs/ra-soat-mo-rong.md, tag v1.1-freeze |
| X4 | Sau khi đã đóng băng v1.1 | TVn-XD (cả 5 người), rồi 4A–5B của kế hoạch gốc | Đã đóng băng v1.1 | Báo cáo, bảng test, nhật ký AI |

Ghi chú:

- Tag v1.0-freeze giữ nguyên như kế hoạch gốc (đã gắn). Đó là điểm quay lại an toàn nếu tính năng mở rộng làm hỏng bản nộp.

- Tính năng mở rộng không được đổi hành vi của 10 nhóm chức năng bắt buộc. Ngoại lệ duy nhất: TV3-X5 (thêm tham số lọc và ghi log cho tasks.js) và TV5-X1, TV5-XU (navbar).

- Đến hạn chốt đóng băng v1.1 mà nhóm đã thông báo, tính năng nào chưa chạy trọn luồng thì bỏ (chưa có thông báo hạn chốt thì chưa bỏ gì): không đưa vào báo cáo, TV1 gỡ router khung khỏi server.js và TV5 không thêm liên kết (xem TV1-XR).

## 3. Hợp đồng mở rộng

TV1 chép nguyên khối dưới đây vào cuối AI_CONTEXT.md (tác vụ TV1-E0). Mọi tác vụ phía sau bám vào khối này.

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

## 4. Tác vụ chung bắt buộc trước (Mốc X0)

### [TV1-E0] Chép hợp đồng, tạo router khung, gắn vào server

Mốc X0 · Làm một mình trước khi người khác bắt đầu mốc X1. Phụ thuộc: không (điều kiện: 2A đã merge vào dev).

Đọc AI_CONTEXT.md và ke-hoach-mo-rong.md. Tôi là TV1, nhánh feature/tv1. Tác vụ [TV1-E0].
FILE ĐƯỢC SỬA: AI_CONTEXT.md, server/server.js, server/routes/schedule.js, templates.js, ingredients.js, customers.js, pos.js (chỉ tạo khung nếu chưa có), .gitignore, docs/ke-hoach-mo-rong.md.
1. Chép nguyên văn khối '=== PHẦN MỞ RỘNG ===' ở mục 3 của ke-hoach-mo-rong.md vào CUỐI AI_CONTEXT.md. Không sửa dòng nào của phần cũ.
2. Chép nguyên văn hai mục 0.1 (luật LIÊN-TV) và 0.2 (luật test) vào cuối AI_CONTEXT.md, và thêm một dòng ngay đầu AI_CONTEXT.md: 'Kế hoạch bổ sung ở docs/ke-hoach-mo-rong.md; luật LIÊN-TV và luật test áp dụng cho mọi tác vụ.'
3. Nếu docs/ke-hoach-mo-rong.md chưa có thì tạo bằng cách chép đúng file kế hoạch này.
4. Tạo 5 router khung giống khung ở TV1-P1: module.exports = router, một route GET / trả { success: true, data: [] }, chú thích tiếng Việt nói rõ chủ file sẽ ghi đè.
5. server.js: gắn 5 router vào /api/schedule, /api/templates, /api/ingredients, /api/customers, /api/pos, đặt TRƯỚC notFound và errorHandler; giữ nguyên mọi thứ khác.
6. .gitignore: thêm dòng .local-test/ (giữ node_modules và .env).
7. Chạy npm start. GET /api/health vẫn thành công; GET /api/schedule kèm token trả { success: true, data: [] }. Chưa chạy được thì nói rõ.
Cuối cùng báo cáo theo mục 0.1 điều 6.

**Việc làm tay:** commit và push theo quy ước nhóm, merge vào dev ngay, nhắn cả nhóm: “Hợp đồng mở rộng đã vào AI_CONTEXT.md, pull dev và chạy 2 file SQL của TV4”. **Xong khi:** npm start không lỗi, 5 đường dẫn /api mới trả khung rỗng.

### [TV4-E0] Bảng CSDL mở rộng

Mốc X0 · Song song với TV1-E0. Phụ thuộc: schema.sql và seed.sql đã chạy trên máy.

Đọc AI_CONTEXT.md (gồm PHẦN MỞ RỘNG) và ke-hoach-mo-rong.md. Tôi là TV4, nhánh feature/tv4. Tác vụ [TV4-E0].
FILE ĐƯỢC SỬA: database/schema-mo-rong.sql, database/seed-mo-rong.sql. CHỈ ĐỌC: database/schema.sql, database/seed.sql.
1. schema-mo-rong.sql: USE CafeTaskManager; xóa các bảng mở rộng theo thứ tự OrderItems, Orders, MenuItems, DiningTables, Customers, Ingredients, TaskLogs, TaskTemplates, ShiftAssignments, ShiftLogs (IF OBJECT_ID(...) IS NOT NULL DROP TABLE); rồi tạo lại theo thứ tự ngược lại, đúng từng cột, kiểu, CHECK, UNIQUE, FK và ON DELETE trong PHẦN MỞ RỘNG, kèm UNIQUE INDEX có điều kiện UX_Orders_OpenTable. KHÔNG đụng 5 bảng cũ. Cột chữ dùng NVARCHAR, CreatedAt có DEFAULT GETDATE().
2. seed-mo-rong.sql: dữ liệu tiếng Việt dùng N'...'. 6 mẫu việc (2 mỗi ca, lấy ShiftId và CategoryId bằng truy vấn theo Name, không gõ cứng Id); 8 nguyên liệu (cà phê hạt, sữa tươi, đường, trà đen, ly nhựa, ống hút, siro vani, kem whipping), ít nhất 2 loại có Quantity <= MinQuantity; 5 khách (SĐT 10 số khác nhau, điểm từ 0 đến 350); 8 bàn 'Bàn 1' đến 'Bàn 8'; 10 món đồ uống giá từ 20000 đến 55000.
3. Cả hai file chạy lại nhiều lần không lỗi. Cuối file seed có truy vấn đếm số dòng từng bảng mới.
Cuối cùng báo cáo theo mục 0.1 điều 6.

**Việc làm tay:** chạy hai file trong SSMS và đối chiếu số đếm; thử INSERT hai đơn Open cho cùng một bàn để thấy lỗi unique; push, merge dev ngay, báo cả nhóm chạy hai file trên máy mình. **Xong khi:** cả nhóm có đủ 10 bảng mới và dữ liệu mẫu.

## 5. Tác vụ theo tính năng (Mốc X1 trước, X2 sau)

### [TV3-X5] Lịch sử, bình luận công việc và bộ lọc me/overdue

Mốc X1 · Nhóm 1 · **Phần 1 phải push đầu tiên** vì TV5-X1 chờ. Phụ thuộc: TaskLogs (TV4-E0), validators.js (TV2, đã có từ Ngày 2).

Đọc AI_CONTEXT.md (gồm PHẦN MỞ RỘNG) và ke-hoach-mo-rong.md. Tôi là TV3, nhánh feature/tv3. Tác vụ [TV3-X5].
FILE ĐƯỢC SỬA: server/routes/tasks.js, public/tasks.html, public/assets/js/tasks.js, docs/tests/tv3.http. CHỈ ĐỌC: server/utils/validators.js, db.js, api.js, ui.js.
Phần 1 (push ngay):
1. GET /api/tasks thêm hai tham số: assigneeId (số nguyên dương hoặc 'me' = req.user.id; giá trị khác thì 400) và overdue=1 (điều kiện quá hạn trong PHẦN MỞ RỘNG). Kết hợp bằng AND với bộ lọc cũ; câu COUNT dùng đúng cùng điều kiện WHERE để pagination vẫn chính xác.
2. Thêm ít nhất 4 request vào docs/tests/tv3.http: assigneeId=me, assigneeId=abc (400), overdue=1, kết hợp với status.
Phần 2:
3. Trong tasks.js viết hàm cục bộ addLog(taskId, userId, action, oldValue, newValue, comment) và ghi TaskLogs theo đúng QUY TẮC NGHIỆP VỤ (POST, PUT, PATCH). Lỗi ghi log chỉ console.error, không làm thất bại thao tác chính.
4. GET /:id/logs trả mảng { id, action, oldValue, newValue, comment, userName, createdAt }, mới nhất trước; 404 nếu việc không tồn tại. POST /:id/comments { comment 1-500 ký tự } trả 201; dùng validators.js; Admin và Staff đều được.
5. Frontend: thêm nút 'Chi tiết' ở mỗi dòng của tasks.html; modal hiển thị dòng thời gian từ /logs (escapeHtml mọi chuỗi), ô bình luận và nút Gửi (khóa nút khi đang gửi), toast thành công hoặc lỗi.
6. Viết request cho cả hai vai trò vào tv3.http, gồm bình luận rỗng và quá 500 ký tự (400).
PHỤ THUỘC: bảng TaskLogs của TV4-E0; hàm validators của TV2. Làm đúng luật LIÊN-TV nếu thiếu.
Cuối cùng báo cáo theo mục 0.1 điều 6.

**Việc làm tay:** đổi trạng thái một việc rồi xem dòng thời gian; bình luận bằng tài khoản Staff; bình luận chứa thẻ script phải hiển thị thành chữ. **Xong khi:** mọi thay đổi trạng thái đều có log, bộ lọc me và overdue trả đúng.

### [TV5-X1] Việc của tôi và huy hiệu quá hạn

Mốc X1 · Nhóm 1. Phụ thuộc: TV3-X5 phần 1 (GET /api/tasks hỗ trợ assigneeId=me và overdue=1).

Đọc AI_CONTEXT.md (gồm PHẦN MỞ RỘNG) và ke-hoach-mo-rong.md. Tôi là TV5, nhánh feature/tv5. Tác vụ [TV5-X1].
FILE ĐƯỢC SỬA: public/my-tasks.html, public/assets/js/my-tasks.js, public/assets/js/ui.js, public/assets/css/style.css, docs/ra-soat-giao-dien.md. CHỈ ĐỌC: routes/tasks.js, docs/khung-chung.html.
1. ui.js: thêm hàm updateOverdueBadge(): gọi apiFetch('/api/tasks?assigneeId=me&overdue=1&pageSize=1'), lấy pagination.total; nếu lớn hơn 0 thì hiện badge đỏ (class badge bg-danger, id overdueBadge) cạnh liên kết 'Việc của tôi'; lỗi thì ẩn badge, không hiện toast. Gọi hàm này ở cuối renderNavbar() khi đã đăng nhập, không đổi chữ ký renderNavbar. Thêm liên kết 'Việc của tôi' (my-tasks.html) vào navbar sau 'Công việc'.
2. my-tasks.html theo docs/khung-chung.html: select trạng thái, checkbox 'Chỉ việc quá hạn', bảng dùng lớp .table-cards để thành thẻ ở dưới 576px, phân trang bằng renderPagination, nạp script theo thứ tự trong hợp đồng.
3. my-tasks.js: requireLogin(); tải GET /api/tasks?assigneeId=me&status=&overdue=&page=&pageSize=10; mỗi dòng hiện tiêu đề, độ ưu tiên (badge), deadline (chữ đỏ nếu quá hạn), tên ca và nút chuyển Pending -> InProgress -> Done bằng PATCH /api/tasks/:id/status; sau mỗi lần đổi thì tải lại và gọi updateOverdueBadge(). Danh sách rỗng thì showEmpty('Bạn chưa có công việc nào'). Dùng escapeHtml cho mọi chuỗi.
4. style.css: kiểu cho badge, dòng quá hạn; kiểm tra ở 375px, 768px, 1200px và ghi vào docs/ra-soat-giao-dien.md.
PHỤ THUỘC: GET /api/tasks?assigneeId=me&overdue=1 của TV3-X5. Chưa có thì làm các bước 2 đến 4 với dữ liệu thật hiện có, bọc updateOverdueBadge trong try/catch, và soạn tin nhắn cho TV3 theo luật LIÊN-TV; KHÔNG tự sửa tasks.js.
Cuối cùng báo cáo theo mục 0.1 điều 6.

**Việc làm tay:** gán vài việc cho staff@cafe.com (sửa trong trang công việc của TV3 hoặc SSMS), đăng nhập Staff: badge hiện đúng số việc quá hạn và giảm khi chuyển một việc sang Done. **Xong khi:** trang chạy bằng API thật, navbar có badge đúng.

### [TV4-X6] Thống kê nâng cao và xuất CSV

Mốc X1 · Nhóm 1. Phụ thuộc: dữ liệu bảng Tasks, Users, Shifts có sẵn; không chờ ai.

Đọc AI_CONTEXT.md (gồm PHẦN MỞ RỘNG) và ke-hoach-mo-rong.md. Tôi là TV4, nhánh feature/tv4. Tác vụ [TV4-X6].
FILE ĐƯỢC SỬA: server/routes/stats.js, public/statistics.html, public/assets/js/statistics.js, docs/tests/tv4.http. CHỈ ĐỌC: schema.sql, db.js, middleware/auth.js, api.js, ui.js.
1. GET /by-user (mọi vai trò) trả [{ userId, fullName, total, done, overdue }]; việc chưa giao (AssigneeId NULL) gom thành một dòng fullName 'Chưa giao', userId null.
2. GET /by-shift trả [{ shiftId, shiftName, total, done, completionRate }], completionRate làm tròn 1 chữ số, 0 nếu total = 0; việc không có ca gom thành 'Chưa gán ca'.
3. GET /weekly?weeks=8 (weeks nguyên từ 1 đến 26, mặc định 8, sai thì 400) trả [{ weekStart: 'YYYY-MM-DD', total, done }] theo tuần của Deadline (việc không có Deadline bỏ qua), tuần bắt đầu thứ Hai (dùng SET DATEFIRST 1 trong cùng batch), đủ các tuần kể cả tuần bằng 0.
4. GET /export.csv chỉ Admin: cột Id, Tiêu đề, Trạng thái, Ưu tiên, Hạn, Danh mục, Ca, Người thực hiện; Content-Type text/csv; charset=utf-8 có BOM để Excel đọc đúng tiếng Việt; Content-Disposition attachment. Bọc trường trong dấu nháy kép, nhân đôi dấu nháy kép bên trong, và chống CSV injection: trường bắt đầu bằng =, +, - hoặc @ thì thêm dấu nháy đơn phía trước.
5. statistics.html và statistics.js: GIỮ NGUYÊN 6 thẻ KPI và 3 biểu đồ hiện có; thêm bảng 'Theo nhân viên', biểu đồ cột 'Theo ca', biểu đồ đường 'Theo tuần' (select 4, 8, 12 tuần). Hủy biểu đồ cũ trước khi vẽ lại. Nút 'Xuất CSV' chỉ hiện khi isAdmin(); vì apiFetch trả JSON nên dùng fetch kèm header Authorization với token trong localStorage, nhận blob rồi tải về; lỗi thì showToast.
6. tv4.http: request cho Admin và Staff (Staff gọi export.csv phải 403), weeks=0 và weeks=abc (400).
Cuối cùng báo cáo theo mục 0.1 điều 6.

**Việc làm tay:** chạy truy vấn GROUP BY tương ứng trong SSMS và đối chiếu số liệu; mở file CSV bằng Excel xem tiếng Việt không vỡ. **Xong khi:** 3 khối mới hiển thị đúng và khớp CSDL.

### [TV1-X2] Bàn giao ca

Mốc X1 · Nhóm 1. Phụ thuộc: bảng ShiftLogs (TV4-E0); validators.js của TV2 (đã có từ Ngày 2).

Đọc AI_CONTEXT.md (gồm PHẦN MỞ RỘNG) và ke-hoach-mo-rong.md. Tôi là TV1, nhánh feature/tv1. Tác vụ [TV1-X2].
FILE ĐƯỢC SỬA: server/routes/shifts.js, public/shifts.html, public/assets/js/shifts.js, docs/tests/tv1.http. CHỈ ĐỌC: schema-mo-rong.sql, routes/tasks.js, validators.js, api.js, ui.js.
1. shifts.js: thêm 4 endpoint đúng hợp đồng, đặt GET /logs TRƯỚC mọi route /:id.
 - POST /:id/start: ca không tồn tại 404; người dùng đang có ShiftLogs chưa kết thúc (EndedAt IS NULL) ở bất kỳ ca nào thì 409 'Bạn đang trong một ca chưa kết thúc'; tạo log với LogDate = hôm nay, StartedAt = SYSDATETIME(); trả 201.
 - POST /:id/end { handoverNote }: handoverNote tùy chọn, tối đa 500 ký tự (dùng validators.js); tìm log chưa kết thúc của CHÍNH người dùng ở ca :id, không có thì 404; đặt EndedAt và HandoverNote.
 - GET /logs?date=&shiftId=: date dạng YYYY-MM-DD (mặc định hôm nay, sai định dạng 400), shiftId tùy chọn; trả tối đa 100 dòng kèm shiftName, userName, startedAt, endedAt, handoverNote.
 - GET /:id/handover: trả { lastLog, openTasks }. lastLog là log đã kết thúc gần nhất của ca ({ userName, endedAt, handoverNote }) hoặc null; openTasks là các việc của ca có Status khác 'Done' (id, title, priority, status, deadline), truy vấn trực tiếp bảng Tasks bằng SQL tham số hóa, không gọi lại API tasks.
2. shifts.html và shifts.js: mỗi thẻ ca có nút 'Nhận ca' hoặc 'Kết thúc ca' tùy người dùng có log đang mở ở ca đó (lấy từ /logs?date=hôm nay); 'Kết thúc ca' mở modal Bootstrap nhập ghi chú bàn giao; mỗi thẻ có khối 'Bàn giao từ ca trước' (ghi chú, người ghi, giờ, danh sách việc còn dở) gọi /:id/handover; thêm bảng 'Nhật ký ca hôm nay' bên dưới. GIỮ NGUYÊN chức năng cũ (CRUD ca của Admin, đổi trạng thái việc). Mọi chuỗi qua escapeHtml; khóa nút khi đang gửi.
3. tv1.http: start thành công, start lần hai (409), end khi không có log mở (404), ghi chú quá 500 ký tự (400), logs sai ngày (400), handover ca không tồn tại (404).
PHỤ THUỘC: ShiftLogs của TV4-E0; validators.js của TV2. Thiếu gì thì làm đúng luật LIÊN-TV.
Cuối cùng báo cáo theo mục 0.1 điều 6.

**Việc làm tay:** Staff nhận ca rồi kết thúc kèm ghi chú; đăng nhập Admin xem nhật ký; thử nhận ca khi đang trong một ca khác. **Xong khi:** ghi chú bàn giao của ca trước hiện ở ca sau cùng danh sách việc còn dở.

### [TV3-X3] Checklist mở/đóng ca (mẫu việc)

Mốc X2 · Nhóm 2. Phụ thuộc: TaskTemplates (TV4-E0); GET /api/shifts của TV1; categories (có sẵn).

Đọc AI_CONTEXT.md (gồm PHẦN MỞ RỘNG) và ke-hoach-mo-rong.md. Tôi là TV3, nhánh feature/tv3. Tác vụ [TV3-X3].
FILE ĐƯỢC SỬA: server/routes/templates.js, public/templates.html, public/assets/js/templates.js, docs/tests/tv3.http. CHỈ ĐỌC: routes/shifts.js, routes/categories.js, validators.js, api.js, ui.js, docs/khung-chung.html.
1. templates.js (ghi đè khung), verifyToken toàn router, truy vấn tham số hóa:
 - GET /?shiftId=: danh sách mẫu kèm shiftName, categoryName.
 - POST /, PUT /:id, DELETE /:id [Admin]: Title 1-200, Description tối đa 500, Priority hợp lệ, ShiftId tồn tại, CategoryId tồn tại hoặc null, IsActive đúng/sai; không thấy thì 404.
 - POST /generate { shiftId, date? } [Admin]: date dạng YYYY-MM-DD, mặc định hôm nay; lấy các mẫu IsActive = 1 của ca; với mỗi mẫu INSERT vào Tasks (Title, Description, Status 'Pending', Priority, Deadline = date, CategoryId, ShiftId, AssigneeId NULL) TRỪ KHI đã có Tasks cùng Title + ShiftId + Deadline; trả { created, skipped }. Ca không tồn tại 404; ca chưa có mẫu thì created = 0. Ghi thẳng vào bảng Tasks bằng SQL ở đây là được phép.
2. templates.html + templates.js: trang chỉ cho Admin (người khác thì toast 'Chỉ Admin được vào trang này' rồi chuyển về tasks.html). Bộ lọc theo ca, bảng mẫu, modal thêm/sửa (select ca và danh mục lấy từ /api/shifts và /api/categories), công tắc bật/tắt IsActive, nút xóa có confirm; khối 'Tạo việc cho ngày' (chọn ca, chọn ngày, nút Tạo) hiện toast 'Đã tạo x việc, bỏ qua y'.
3. tv3.http: Staff gọi POST và generate phải 403; generate hai lần liên tiếp thì lần hai created = 0; ca không tồn tại 404; date sai 400.
PHỤ THUỘC: TaskTemplates của TV4-E0; GET /api/shifts của TV1. Thiếu gì thì làm đúng luật LIÊN-TV.
Cuối cùng báo cáo theo mục 0.1 điều 6.

**Việc làm tay:** tạo việc cho ca hôm nay rồi mở tasks.html kiểm tra đủ việc; bấm lại thì không trùng. **Xong khi:** việc sinh ra đúng ca, đúng ngày, không trùng.

### [TV1-X4] Lịch phân ca tuần

Mốc X2 · Nhóm 2. Phụ thuộc: ShiftAssignments (TV4-E0); GET /api/users của TV2 (có sẵn); GET /api/shifts của mình.

Đọc AI_CONTEXT.md (gồm PHẦN MỞ RỘNG) và ke-hoach-mo-rong.md. Tôi là TV1, nhánh feature/tv1. Tác vụ [TV1-X4].
FILE ĐƯỢC SỬA: server/routes/schedule.js, public/schedule.html, public/assets/js/schedule.js, docs/tests/tv1.http. CHỈ ĐỌC: routes/users.js, routes/shifts.js, schema-mo-rong.sql, validators.js, api.js, ui.js, docs/khung-chung.html.
1. schedule.js (ghi đè khung), verifyToken toàn router, truy vấn tham số hóa:
 - GET /?from=&to=: from và to dạng YYYY-MM-DD, from <= to, khoảng tối đa 31 ngày, sai thì 400; trả [{ id, shiftId, shiftName, userId, userName, workDate }] (workDate là chuỗi YYYY-MM-DD).
 - GET /mine?from=&to=: như trên nhưng chỉ của req.user.id. Đặt /mine TRƯỚC /:id.
 - POST / { shiftId, userId, workDate } [Admin]: ca và người dùng phải tồn tại (404), ngày hợp lệ (400), trùng bộ ba ca + người + ngày thì 409; trả 201.
 - DELETE /:id [Admin]: không thấy 404.
2. schedule.html + schedule.js: lưới tuần, hàng là các ca, cột là Thứ Hai đến Chủ Nhật, nút tuần trước và tuần sau. Mỗi ô liệt kê tên nhân viên; ô của chính người đăng nhập (so userId với getUser().id) tô đậm. Admin thấy nút '+' (modal chọn nhân viên từ /api/users) và nút xóa từng người; Staff chỉ xem. Dưới 576px đổi thành danh sách theo ngày. Tính ngày bằng JavaScript theo giờ địa phương, tự ghép chuỗi YYYY-MM-DD, KHÔNG dùng toISOString (lệch múi giờ). Mọi chuỗi qua escapeHtml.
3. tv1.http: xếp trùng (409), khoảng ngày quá 31 (400), Staff gọi POST và DELETE phải 403, ca không tồn tại (404).
PHỤ THUỘC: ShiftAssignments của TV4-E0; GET /api/users của TV2 (chỉ trả id, fullName, role). Thiếu gì thì làm đúng luật LIÊN-TV.
Cuối cùng báo cáo theo mục 0.1 điều 6.

**Việc làm tay:** Admin xếp hai người vào một ca, Staff đăng nhập thấy ô của mình tô đậm, thử xếp trùng. **Xong khi:** lưới tuần đúng ngày, đúng người, phân quyền đúng.

### [TV4-X7] Kho tối giản và cảnh báo sắp hết

Mốc X2 · Nhóm 2. Phụ thuộc: Ingredients (TV4-E0, của chính mình); bảng Tasks và danh mục 'Kho và mua hàng' (có trong seed.sql).

Đọc AI_CONTEXT.md (gồm PHẦN MỞ RỘNG) và ke-hoach-mo-rong.md. Tôi là TV4, nhánh feature/tv4. Tác vụ [TV4-X7].
FILE ĐƯỢC SỬA: server/routes/ingredients.js, public/inventory.html, public/assets/js/inventory.js, docs/tests/tv4.http. CHỈ ĐỌC: schema.sql, seed.sql, schema-mo-rong.sql, routes/tasks.js (chỉ để biết cột bảng Tasks), db.js, middleware/auth.js, api.js, ui.js.
1. ingredients.js (ghi đè khung), verifyToken toàn router, truy vấn tham số hóa:
 - GET /?search=&lowOnly=1&page=&pageSize= (search escape % _ [; lowOnly lọc Quantity <= MinQuantity; pagination chuẩn; mỗi dòng có cờ isLow). GET /:id (404 nếu không thấy).
 - POST /, PUT /:id, DELETE /:id [Admin]: Name 1-100 (trùng 409), Unit 1-20, Quantity và MinQuantity là số từ 0 đến 1000000.
 - PATCH /:id/stock { delta } (Admin và Staff): delta là số khác 0, |delta| <= 100000; kết quả Quantity < 0 thì 400 'Tồn kho không đủ'. Gộp trong MỘT lần gọi query() một batch T-SQL có SET XACT_ABORT ON và BEGIN TRAN: UPDATE Ingredients; rồi nếu Quantity <= MinQuantity và chưa có Tasks với Title = N'Nhập hàng: ' + Name có Status khác 'Done' thì INSERT vào Tasks (Description N'Tự tạo từ cảnh báo kho', Status 'Pending', Priority 'High', Deadline = hôm nay, CategoryId của danh mục 'Kho và mua hàng' lấy bằng truy vấn theo tên); rồi COMMIT. Trả { ingredient, autoTaskCreated }. Chỉ được INSERT vào bảng Tasks; không sửa tasks.js, không ghi TaskLogs.
2. inventory.html + inventory.js: bảng tồn kho; dòng isLow tô đỏ kèm badge 'Sắp hết'; nút 'Nhập' và 'Xuất' mở modal nhập số lượng; khi autoTaskCreated = true thì thêm toast 'Đã tạo việc Nhập hàng'; tìm kiếm, bộ lọc 'Chỉ sắp hết', phân trang; Admin có thêm Thêm, Sửa, Xóa. Mọi chuỗi qua escapeHtml.
3. tv4.http: Staff gọi POST và DELETE là 403; xuất quá tồn kho là 400; xuất để chạm ngưỡng thì có việc 'Nhập hàng' mới, gọi lần hai không tạo trùng; delta = 0 là 400.
PHỤ THUỘC: việc tự tạo có AssigneeId NULL và nằm trong bảng Tasks của TV3: soạn TIN NHẮN GỬI TV3 để biết (không sửa file của TV3).
Cuối cùng báo cáo theo mục 0.1 điều 6.

**Việc làm tay:** xuất kho một nguyên liệu đến mức chạm ngưỡng, mở trang công việc kiểm tra có việc 'Nhập hàng: ...' (đúng một việc). **Xong khi:** cảnh báo đúng ngưỡng, không tạo việc trùng.

### [TV2-X8] Khách hàng tích điểm

Mốc X1–X2 · Nhóm 3 (làm khi xong 3A). Phụ thuộc: Customers (TV4-E0); validateField, renderPagination của TV5 (có sẵn).

Đọc AI_CONTEXT.md (gồm PHẦN MỞ RỘNG) và ke-hoach-mo-rong.md. Tôi là TV2, nhánh feature/tv2. Tác vụ [TV2-X8].
FILE ĐƯỢC SỬA: server/routes/customers.js, server/utils/validators.js, public/customers.html, public/assets/js/customers.js, docs/tests/tv2.http, docs/bao-mat-ma-tran-quyen.md. CHỈ ĐỌC: schema-mo-rong.sql, db.js, middleware/auth.js, api.js, ui.js, docs/khung-chung.html.
1. validators.js: thêm isPhone(v) (chuỗi 9 đến 11 chữ số, chỉ gồm 0-9), có chú thích tiếng Việt và ví dụ; không đổi các hàm cũ.
2. customers.js (ghi đè khung), verifyToken toàn router, truy vấn tham số hóa:
 - GET /?search=&page=&pageSize= (tìm theo tên hoặc SĐT, escape % _ [; pageSize tối đa 50; sắp theo FullName) trả pagination, mỗi khách có thêm rank. GET /:id (404 nếu không thấy).
 - POST / (Admin và Staff): FullName 2-100, Phone qua isPhone, SĐT trùng 409. PUT /:id và DELETE /:id [Admin].
 - POST /:id/earn { amount } (Admin và Staff): amount nguyên từ 10000 đến 1000000000; cộng FLOOR(amount / 10000) điểm; trả khách sau cập nhật kèm pointsAdded.
 - POST /:id/redeem { points }: points nguyên dương; dùng UPDATE ... WHERE Points >= @points, rowsAffected = 0 thì 400 'Không đủ điểm'. Không bao giờ để Points âm.
 - Hạng tính trong một hàm getRank(points): dưới 100 'Đồng', từ 100 đến 299 'Bạc', từ 300 'Vàng'.
3. customers.html + customers.js: bảng khách (tìm kiếm debounce 300ms, phân trang, hạng hiện bằng badge), modal thêm/sửa dùng validateField với lỗi tiếng Việt, nút 'Cộng điểm' (nhập số tiền hóa đơn và hiện trước số điểm sẽ cộng) và 'Đổi điểm'. Staff không thấy nút Sửa và Xóa. Mọi chuỗi qua escapeHtml.
4. tv2.http và ma trận quyền: Staff gọi PUT và DELETE là 403; SĐT trùng 409; SĐT 'abc' là 400; redeem quá số điểm 400; earn dưới 10000 là 400. Cập nhật docs/bao-mat-ma-tran-quyen.md cho mọi endpoint mở rộng của cả nhóm hiện có trong code.
PHỤ THUỘC: Customers của TV4-E0; validateField, renderPagination của TV5. Thiếu gì thì làm đúng luật LIÊN-TV.
Cuối cùng báo cáo theo mục 0.1 điều 6.

**Việc làm tay:** cộng điểm cho một khách đến khi lên hạng Bạc, đổi điểm vượt số điểm hiện có để thấy lỗi. **Xong khi:** điểm không bao giờ âm, hạng đổi đúng ngưỡng.

### [TV5-X9] POS và sơ đồ bàn (tùy chọn, làm sau cùng)

Mốc X2 · Nhóm 3. Phụ thuộc: 4 bảng POS (TV4-E0); routes/customers.js của TV2-X8 chỉ là tùy chọn.

Đọc AI_CONTEXT.md (gồm PHẦN MỞ RỘNG) và ke-hoach-mo-rong.md. Tôi là TV5, nhánh feature/tv5. Tác vụ [TV5-X9]. Đây là tác vụ TÙY CHỌN; nếu gần hạn chốt mà chưa xong thì chỉ làm MỨC TỐI THIỂU ghi ở cuối.
FILE ĐƯỢC SỬA: server/routes/pos.js, public/pos.html, public/assets/js/pos.js, public/assets/css/style.css (chỉ thêm lớp .pos-*), docs/ra-soat-giao-dien.md. CHỈ ĐỌC: schema-mo-rong.sql, routes/customers.js (nếu đã có), db.js, middleware/auth.js, validators.js, api.js, ui.js.
Lưu ý: pos.html cũ đã bị xóa ở bước P0. Làm trang mới từ đầu, dữ liệu qua API và CSDL, không dùng LocalStorage.
1. pos.js (ghi đè khung), verifyToken toàn router, truy vấn tham số hóa, lỗi đúng định dạng chuẩn:
 - GET /tables: [{ id, name, seats, status: 'Free'|'Occupied', openOrderId, openTotal }] (status suy ra từ đơn Open của bàn). POST /tables, PUT /tables/:id, DELETE /tables/:id [Admin]; xóa bàn đã có đơn thì 409.
 - GET /menu (Admin thêm ?all=1 để thấy món IsActive = 0). POST, PUT, DELETE /menu [Admin]; xóa món đã nằm trong đơn thì 409 và gợi ý đặt IsActive = 0.
 - POST /orders { tableId, customerId? }: bàn đã có đơn Open thì 409; khách (nếu có) phải tồn tại; trả 201 kèm id đơn.
 - GET /orders/:id: đơn + items [{ id, menuItemId, name, quantity, unitPrice, lineTotal }] + total tính tại server.
 - POST /orders/:id/items { menuItemId, quantity 1-99 }: chỉ đơn Open; món phải IsActive = 1; món đã có trong đơn thì cộng dồn (tổng không quá 99); UnitPrice lấy từ MenuItems.Price lúc thêm. PATCH và DELETE /orders/:id/items/:itemId tương tự.
 - POST /orders/:id/pay: chỉ đơn Open và có ít nhất một món (rỗng thì 400); tính lại Total = SUM(Quantity * UnitPrice) ở server (không tin client), đặt Status 'Paid', PaidAt; nếu có CustomerId và bảng Customers có dữ liệu thì cộng Points = FLOOR(Total / 10000); tất cả trong MỘT batch T-SQL có SET XACT_ABORT ON và BEGIN TRAN ... COMMIT.
 - POST /orders/:id/cancel: chỉ đơn Open, đặt 'Cancelled'.
2. pos.html + pos.js: lưới bàn (xanh = trống, cam = có khách, hiện tổng tiền tạm tính); bấm bàn trống thì tạo đơn, bấm bàn có khách thì mở đơn; panel đơn (cột phải từ 768px, modal toàn màn hình dưới 768px) gồm lưới món bấm để thêm, danh sách món với nút tăng giảm xóa, tổng tiền (toLocaleString('vi-VN') + ' đ'), nút Thanh toán và Hủy đơn có confirm, ô nhập SĐT để gắn khách (tìm bằng GET /api/customers?search=; API chưa có thì ẩn ô này). Admin có modal quản lý bàn và menu. Tải lại sau mỗi thao tác, khóa nút khi đang gửi, escapeHtml mọi chuỗi.
MỨC TỐI THIỂU (chỉ khi gần hạn chốt mà chưa xong): GET /tables, GET /menu, POST /orders, GET /orders/:id, POST items, POST pay. Bỏ khách hàng, hủy đơn, sửa số lượng, quản lý bàn và menu (dùng dữ liệu seed).
PHỤ THUỘC: bảng POS của TV4-E0; routes/customers.js của TV2-X8 là TÙY CHỌN: kiểm tra, chưa có thì bỏ qua mọi thứ về khách hàng, KHÔNG tự tạo bảng hay endpoint của TV2. Thiếu gì thì làm đúng luật LIÊN-TV.
Cuối cùng báo cáo theo mục 0.1 điều 6.

**Việc làm tay:** mở đơn ở hai bàn, thêm món, thanh toán một đơn, rồi SELECT bảng Orders kiểm tra Status và Total khớp; thử mở đơn thứ hai cho bàn đang có đơn (phải 409). **Xong khi:** luồng mở bàn, gọi món, thanh toán chạy trọn qua CSDL.

## 6. Tác vụ chung kết thúc (Mốc X3 và X4)

### [TV5-XU] Liên kết navbar cho các trang mới

Mốc X3 · Chạy SAU khi các thành viên báo đã merge tính năng vào dev.

Đọc AI_CONTEXT.md (gồm PHẦN MỞ RỘNG) và ke-hoach-mo-rong.md. Tôi là TV5, nhánh feature/tv5. Tác vụ [TV5-XU].
FILE ĐƯỢC SỬA: public/assets/js/ui.js, public/assets/css/style.css, docs/ra-soat-giao-dien.md. CHỈ ĐỌC: toàn bộ public/ và server/routes/.
1. Liệt kê các trang có thật trong public/: my-tasks, schedule, templates, inventory, customers, pos (.html). Với mỗi trang kiểm tra file .js tương ứng tồn tại và router tương ứng trong server/routes KHÔNG còn là khung rỗng (còn mỗi route GET / trả data: [] nghĩa là chưa làm).
2. Sửa renderNavbar() trong ui.js: chỉ thêm liên kết cho trang có thật và đã làm xong. 'Việc của tôi' đứng cạnh 'Công việc'; các trang Lịch ca, Kho, Khách hàng, POS gom vào dropdown 'Mở rộng' để navbar không tràn ở 375px; 'Mẫu việc' (templates.html) chỉ hiện khi isAdmin(). Không đổi chữ ký các hàm đang có.
3. Kiểm tra liên kết chết, tiêu đề trang không thống nhất, navbar ở 375px, 768px, 1200px. Lỗi ở file của người khác thì KHÔNG sửa, ghi bảng: người sở hữu | file | lỗi | cách sửa vào docs/ra-soat-giao-dien.md.
Cuối cùng báo cáo theo mục 0.1 điều 6.

### [TV1-XR] Rà soát toàn bộ phần mở rộng

Mốc X3 · Làm sau TV5-XU. Kết thúc bằng tag v1.1-freeze.

Đọc AI_CONTEXT.md (gồm PHẦN MỞ RỘNG) và ke-hoach-mo-rong.md. Tôi là TV1, nhánh feature/tv1. Tác vụ [TV1-XR].
FILE ĐƯỢC SỬA: docs/ra-soat-mo-rong.md, README.md, server/server.js và các file thuộc TV1 (shifts.js, schedule.js, shifts.html, schedule.html, js tương ứng). File khác CHỈ ĐỌC.
1. Đối chiếu từng endpoint mở rộng trong code với PHẦN MỞ RỘNG: đường dẫn, phương thức, quyền (verifyToken, requireRole), mã lỗi, route /logs và /mine đặt trước /:id, truy vấn tham số hóa, escapeHtml khi render, không dùng LocalStorage cho dữ liệu nghiệp vụ, các file .http còn chạy được.
2. Với mỗi router mở rộng còn là khung rỗng hoặc trang tương ứng chưa có: ghi 'chưa làm'. Gỡ dòng gắn router đó khỏi server.js nếu và chỉ nếu tính năng bị bỏ, rồi soạn tin nhắn cho TV5 không thêm liên kết.
3. Ghi bảng lỗi (người sở hữu | file | lỗi | mức độ | cách sửa) vào docs/ra-soat-mo-rong.md. Sửa lỗi thuộc file của TV1; lỗi file khác để chủ file tự sửa.
4. README.md: thêm bước chạy database/schema-mo-rong.sql và seed-mo-rong.sql, danh sách tính năng mở rộng ĐÃ LÀM và API mới. Chỉ ghi điều có thật.
Cuối cùng báo cáo theo mục 0.1 điều 6.

**Việc làm tay:** merge dev, tự chạy hết các luồng bằng cả hai vai trò, gắn tag v1.1-freeze rồi báo nhóm. Từ đây chỉ nhận sửa lỗi, không thêm tính năng.

### [TVn-XD] Báo cáo, test và nhật ký AI (mỗi người một lần, Mốc X4)

Mỗi thành viên dùng chung khuôn này, điền mã tính năng mình đã làm xong và đã merge vào dev.

Đọc AI_CONTEXT.md và ke-hoach-mo-rong.md. Tôi là TV[n], nhánh feature/tv[n]. Tác vụ [TV[n]-XD].
FILE ĐƯỢC SỬA: docs/bao-cao/tv[n].md, docs/ai-log/tv[n].md. File khác CHỈ ĐỌC.
Tôi đã làm xong và merge: [LIỆT KÊ MÃ, ví dụ TV3-X5, TV3-X3]. Chỉ mô tả các tính năng này, dựa trên code thật trong repo; tính năng nào router còn là khung hoặc chưa có thì KHÔNG đưa vào.
1. Với mỗi tính năng, thêm mục 'Tính năng mở rộng: [tên]' vào docs/bao-cao/tv[n].md: mục đích nghiệp vụ, ai được dùng, luồng Frontend gọi API rồi truy vấn CSDL, bảng CSDL liên quan, file cài đặt, quyền Admin và Staff. Tiếng Việt học thuật, ngắn gọn.
2. Thêm mục 'Test mở rộng': bảng gồm Mã | Chức năng | Các bước | Kết quả mong đợi | Kết quả thực tế | Đạt?, từ 6 dòng cho mỗi tính năng, gồm cả trường hợp lỗi và thiếu quyền; hai cột cuối để trống.
3. Thêm mục 'Ảnh chụp cần có': tên ảnh, trang, trạng thái cần chụp (có cả giao diện điện thoại và trường hợp lỗi).
4. docs/ai-log/tv[n].md: thêm một dòng cho mỗi prompt đã dùng (mã prompt, việc nhờ AI, cách kiểm chứng, chỗ tôi đã chỉnh), ghi trung thực kể cả chỗ AI sai.
5. Mục nào cần số liệu hay kết quả chạy thật mà tôi chưa cung cấp thì để trống, không bịa.

Riêng **TV4** thêm vào FILE ĐƯỢC SỬA: docs/test-cases.md. Đọc mục 'Test mở rộng' trong docs/bao-cao/tv1.md đến tv5.md, gộp thành các dòng mới có mã TC-X01 trở đi, không trùng với 25 dòng cũ.

## 7. Khi gần hạn chốt và checklist

**Thứ tự cắt khi gần hạn chốt mà chưa xong:** X9, rồi X8, X4, X7, X3. X1, X2, X5, X6 giữ đến cùng. Cắt nghĩa là: không đưa vào báo cáo, TV1 gỡ router khung khỏi server.js, TV5 không thêm liên kết (xem TV1-XR). Riêng X9 nếu cố giữ thì làm mức tối thiểu.

**Câu vấn đáp có thể gặp (mỗi người ôn phần mình):**

| Tính năng | Câu hỏi |
| --- | --- |
| X1 | Vì sao huy hiệu chỉ gọi pageSize=1 mà vẫn biết tổng số việc quá hạn? |
| X2 | Vì sao một người không thể có hai ca mở cùng lúc, kiểm tra ở đâu? |
| X3 | Làm sao bấm tạo việc hai lần không sinh việc trùng? |
| X4 | Vì sao tính ngày không dùng toISOString, và ràng buộc UNIQUE chặn lỗi nào? |
| X5 | Vì sao lỗi ghi log không làm thất bại thao tác chính? Bình luận có chứa script thì xử lý sao? |
| X6 | CSV injection là gì và đã chặn thế nào? Vì sao dùng fetch thay apiFetch để tải CSV? |
| X7 | Vì sao UPDATE kho và INSERT việc nằm chung một giao dịch? |
| X8 | Vì sao đổi điểm viết bằng UPDATE ... WHERE Points >= @points thay vì đọc rồi trừ? |
| X9 | Vì sao Total do server tính lại, và chỉ mục duy nhất có điều kiện bảo vệ điều gì? |

**Checklist hoàn thành phần mở rộng:**

- ☐ Cả nhóm đã chạy schema-mo-rong.sql và seed-mo-rong.sql; AI_CONTEXT.md có PHẦN MỞ RỘNG

- ☐ Mỗi tính năng làm xong chạy trọn luồng bằng cả Admin và Staff, có request trong .http và có dòng trong bảng test mở rộng

- ☐ Không còn router khung nào gắn trong server.js mà tính năng đã bỏ

- ☐ Không có liên kết chết trên navbar; giao diện ổn ở 375px, 768px, 1200px

- ☐ Tag v1.1-freeze đã gắn; báo cáo chỉ mô tả tính năng có thật; nhật ký AI đủ cho mọi prompt đã dùng

- ☐ Mỗi người trả lời được câu vấn đáp về phần mở rộng của mình
