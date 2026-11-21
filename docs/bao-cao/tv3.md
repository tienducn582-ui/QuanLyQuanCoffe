# Báo Cáo Cá Nhân – Thành Viên 3 (TV3)
**Họ và tên:** Vũ Hoàng Anh  
**MSSV:** bit250020  
**Vai trò:** Quản lý Công việc (API `/api/tasks`, `/api/categories`, trang `tasks.html`); phần mở rộng: lịch sử và bình luận công việc (TV3-X5), mẫu việc theo ca (TV3-X3, API `/api/templates`, trang `templates.html`)  
**Môn học:** Phát triển ứng dụng Web (PROG2008)  

---

## 1. Mô tả các chức năng đã xây dựng

Phần này chỉ mô tả những gì có trong mã nguồn: `server/routes/tasks.js`, `server/routes/categories.js`, `public/tasks.html`, `public/assets/js/tasks.js`, cùng các trang dùng chung API công việc (`shifts.js`, `statistics.js`, `auth.js`).

Mọi chức năng đi theo cùng một luồng ba tầng:

```
Trình duyệt (tasks.js)  --fetch + Bearer JWT-->  Express (routes/tasks.js)  --query(sql, params)-->  SQL Server (bảng Tasks)
        ^                                                |                                                   |
        └──────────── JSON { success, data, pagination } ┘ <──────────── result.recordset ─────────────────┘
```

Hàm `apiFetch` (TV5) tự gắn token; middleware `verifyToken` (TV1) giải mã token thành `req.user = { id, email, role }`; router gọi `query()` của `db.js` với tham số dạng `@ten`, không nối chuỗi.

### 1.1. Quản lý công việc (CRUD)

| Thao tác | Ai được dùng | Luồng xử lý |
| :--- | :--- | :--- |
| Xem danh sách | Admin, Staff | `loadTasks()` gọi `GET /api/tasks?...` → router kiểm tra tham số, chạy truy vấn `COUNT(*)` và truy vấn lấy trang có `LEFT JOIN` Categories, Shifts, Users để trả thêm `categoryName`, `shiftName`, `assigneeName` → `renderTable()` vẽ bảng bằng `escapeHtml`. |
| Xem chi tiết | Admin, Staff | `GET /api/tasks/:id`; `checkIdParam` trả 400 nếu id không phải số nguyên dương, router trả 404 nếu không có bản ghi. Từ phần mở rộng, mỗi dòng có nút **Chi tiết** mở modal lịch sử và bình luận (xem mục 5). |
| Thêm | Admin, Staff | Nút **+ Thêm công việc** mở modal Bootstrap. `validateForm()` kiểm tra phía client (tên bắt buộc, ≤ 200 ký tự; mô tả ≤ 2000; hạn chót đúng dạng ngày). Gửi `POST /api/tasks`; server kiểm tra lại bằng `validateTaskBody()` (dùng `validators.js`) và `checkReferences()` (danh mục, ca, người thực hiện phải tồn tại), rồi `INSERT ... OUTPUT INSERTED.Id`, trả 201. |
| Sửa toàn bộ | Chỉ Admin | Nút **Sửa** chỉ hiện khi `isAdmin()`; modal được điền sẵn dữ liệu dòng đó. Gửi `PUT /api/tasks/:id`; server chặn Staff bằng `requireRole('Admin')` (403) và kiểm tra dữ liệu như khi thêm. |
| Đổi trạng thái | Admin, Staff | Ô chọn trạng thái trên mỗi dòng gọi `PATCH /api/tasks/:id/status` với `{ status }`; chỉ nhận `Pending`, `InProgress`, `Done`. Trang Ca làm (TV1) cũng dùng endpoint này. |
| Xóa | Chỉ Admin | Nút **Xóa** chỉ hiện với Admin, có hộp `confirm()` xác nhận. Gửi `DELETE /api/tasks/:id`; Staff gọi trực tiếp API sẽ nhận 403. |

Các chi tiết trải nghiệm người dùng:
- Sau khi thêm, sửa, xóa hoặc đổi trạng thái, danh sách được tải lại theo đối tượng `state` nên **giữ nguyên bộ lọc và trang hiện tại**.
- Nếu xóa bản ghi cuối cùng của trang cuối, API trả `data: []` kèm `totalPages` mới; `loadTasks()` thấy `page > totalPages` thì **tự lùi về trang cuối còn dữ liệu**.
- Nút Lưu và nút Xóa bị khóa bằng `showLoading()` trong lúc gửi, form có thêm cờ `saving` để **chống bấm hai lần**.
- Mọi thao tác đều có `showToast` báo thành công hoặc lỗi; lỗi từ server (mảng `errors`) hiện trong khung `#taskFormError` của modal.
- Việc có hạn chót nhỏ hơn hôm nay và chưa `Done` được gắn nhãn đỏ **Quá hạn**.
- Từ phần mở rộng (TV3-X5), thêm, sửa và đổi trạng thái đều được ghi vào bảng `TaskLogs` (xem mục 5).

### 1.2. Tìm kiếm

- Ô `#searchInput` dùng **debounce 300 ms**: chỉ gọi API khi người dùng ngừng gõ 300 ms, tránh gửi một request cho mỗi phím.
- Server tìm bằng `LIKE` trên `Title` và `Description`. Hàm `escapeLike()` đổi `[` → `[[]`, `%` → `[%]`, `_` → `[_]`, nên người dùng gõ `50%` sẽ tìm đúng chuỗi "50%" thay vì khớp mọi thứ. Dấu `'` không cần xử lý vì giá trị đi qua tham số `@search` nên không thể gây SQL injection.

### 1.3. Lọc

- Bốn bộ lọc trên giao diện: Trạng thái, Ưu tiên, Danh mục, Ca làm. API còn nhận thêm `assigneeId` (số hoặc `me`) và `overdue=1` từ phần mở rộng (mục 5); hai tham số này dành cho trang "Việc của tôi" của TV5, chưa có ô chọn trên `tasks.html`. Danh sách Danh mục và Ca lấy từ `GET /api/categories`, `GET /api/shifts` (không còn danh mục cố định trong HTML như bản cũ).
- Đổi bộ lọc thì quay về trang 1. Nút **Xóa bộ lọc** đưa mọi điều kiện về mặc định.
- Server chỉ ghép các đoạn điều kiện cố định (`t.Status = @status`, ...); giá trị sai (vd. `status=Started`, `categoryId=-1`) bị từ chối với mã 400.

### 1.4. Phân trang

- Tham số `page` (mặc định 1) và `pageSize` (mặc định 10, tối đa 50). Sai giá trị → 400.
- Server dùng một truy vấn `COUNT(*)` riêng để biết tổng số, và `OFFSET (page-1)*pageSize ROWS FETCH NEXT pageSize ROWS ONLY` để lấy đúng một trang.
- Thứ tự: hạn chót tăng dần, việc **không có hạn chót xếp cuối** (`ORDER BY CASE WHEN Deadline IS NULL THEN 1 ELSE 0 END, Deadline, Id DESC`).
- Phản hồi có `pagination: { page, pageSize, total, totalPages }`; Frontend vẽ thanh trang bằng `renderPagination()` của TV5.

### 1.5. Danh mục

`GET /api/categories` (cần đăng nhập) trả `[{ id, name }]` theo thứ tự Id, dùng cho bộ lọc và ô chọn trong modal.

### 1.6. Các chức năng khác dùng API công việc

| Chức năng | Người phụ trách | Cách dùng API công việc |
| :--- | :--- | :--- |
| Quản lý ca làm (`shifts.html`) | TV1 | Gọi `GET /api/tasks?shiftId=...&pageSize=50` để liệt kê việc trong từng ca và `PATCH /api/tasks/:id/status` để đổi trạng thái. |
| Thống kê (`statistics.html`) | TV4 | `GET /api/stats` đọc trực tiếp bảng `Tasks` (tổng, theo trạng thái, ưu tiên, danh mục, quá hạn). |
| Tài khoản (`login`, `register`, `profile`) | TV2 | Cấp JWT mà toàn bộ `/api/tasks` dùng; `GET /api/users` cung cấp danh sách người thực hiện cho modal công việc. |
| Mẫu việc theo ca (`templates.html`) | TV3 (X3) | `POST /api/templates/generate` chèn thẳng các việc mới vào bảng `Tasks` (Pending, chưa giao), xem mục 6. |
| Kho (`inventory.html`) | TV4 (X7) | Khi tồn kho chạm ngưỡng, `PATCH /api/ingredients/:id/stock` tự chèn việc "Nhập hàng: ..." vào bảng `Tasks` (chưa giao, không ghi `TaskLogs`). |
| Việc của tôi (`my-tasks.html`) | TV5 (X1) | Sẽ gọi `GET /api/tasks?assigneeId=me&overdue=1`; tại thời điểm viết báo cáo trang này chưa có trong repo. |

---

## 2. Danh sách API

Đối chiếu với `server/server.js` và `server/routes/*.js`. Mọi lỗi theo định dạng `{ success: false, message, errors? }`; lỗi CSDL hoặc lỗi không lường trước đi qua `errorHandler` và trả 500 không lộ chi tiết.

| Phương thức | Đường dẫn | Vai trò được phép | Mô tả | Mã lỗi có thể trả |
| :--- | :--- | :--- | :--- | :--- |
| GET | `/api/health` | Công khai | Kiểm tra server và kết nối CSDL (`SELECT 1`) | 503 |
| POST | `/api/auth/register` | Công khai | Đăng ký tài khoản Staff | 400, 409, 500 |
| POST | `/api/auth/login` | Công khai | Đăng nhập, trả JWT 8 giờ (giới hạn 20 lần/15 phút) | 400, 401, 429, 500 |
| POST | `/api/auth/logout` | Đã đăng nhập | Đăng xuất | 401 |
| GET | `/api/me` | Đã đăng nhập | Xem hồ sơ của mình | 401, 404, 500 |
| PUT | `/api/me` | Đã đăng nhập | Sửa họ tên, đổi mật khẩu | 400, 401, 404, 500 |
| GET | `/api/users` | Đã đăng nhập | Danh sách người dùng (id, fullName, role) | 401, 500 |
| GET | `/api/categories` | Admin, Staff | Danh sách danh mục | 401, 500 |
| GET | `/api/tasks` | Admin, Staff | Danh sách có `search`, `status`, `priority`, `categoryId`, `shiftId`, `assigneeId` (số hoặc `me`), `overdue=1`, `page`, `pageSize` | 400, 401, 500 |
| GET | `/api/tasks/:id` | Admin, Staff | Chi tiết công việc | 400, 401, 404, 500 |
| GET | `/api/tasks/:id/logs` | Admin, Staff | Lịch sử thao tác và bình luận, mới nhất trước (X5) | 400, 401, 404, 500 |
| POST | `/api/tasks/:id/comments` | Admin, Staff | Thêm bình luận 1–500 ký tự, trả 201 (X5) | 400, 401, 404, 500 |
| POST | `/api/tasks` | Admin, Staff | Tạo công việc, trả 201 | 400, 401, 500 |
| PUT | `/api/tasks/:id` | Admin | Sửa toàn bộ công việc | 400, 401, 403, 404, 500 |
| PATCH | `/api/tasks/:id/status` | Admin, Staff | Đổi trạng thái | 400, 401, 404, 500 |
| DELETE | `/api/tasks/:id` | Admin | Xóa công việc | 400, 401, 403, 404, 500 |
| GET | `/api/shifts` | Admin, Staff | Danh sách ca kèm `taskCount` | 401, 500 |
| GET | `/api/shifts/:id` | Admin, Staff | Chi tiết ca | 400, 401, 404, 500 |
| POST | `/api/shifts` | Admin | Thêm ca | 400, 401, 403, 500 |
| PUT | `/api/shifts/:id` | Admin | Sửa ca | 400, 401, 403, 404, 500 |
| DELETE | `/api/shifts/:id` | Admin | Xóa ca (công việc của ca được `SET NULL`) | 400, 401, 403, 404, 500 |
| GET | `/api/stats` | Admin, Staff | Số liệu thống kê | 401, 500 |
| GET | `/api/templates` | Admin, Staff | Danh sách mẫu việc, lọc `shiftId` (X3) | 400, 401, 500 |
| POST | `/api/templates` | Admin | Thêm mẫu, trả 201 (X3) | 400, 401, 403, 404, 500 |
| PUT | `/api/templates/:id` | Admin | Sửa mẫu, bật/tắt `isActive` (X3) | 400, 401, 403, 404, 500 |
| DELETE | `/api/templates/:id` | Admin | Xóa mẫu (X3) | 400, 401, 403, 404, 500 |
| POST | `/api/templates/generate` | Admin | Sinh việc cho ngày từ mẫu đang bật, trả `{ created, skipped }` (X3) | 400, 401, 403, 404, 500 |

Bảng trên gồm các endpoint cơ bản và endpoint mở rộng của TV3. Endpoint mở rộng của TV1, TV2, TV4, TV5 (`/api/shifts/...` mới, `/api/schedule`, `/api/stats/...` mới, `/api/ingredients`, `/api/customers`, `/api/pos`) xem trong báo cáo của từng người và `docs/bao-mat-ma-tran-quyen.md`.

Dữ liệu một công việc trả về:

```json
{
  "id": 31, "title": "Kiểm tra máy pha 50% công suất", "description": "...",
  "status": "Pending", "priority": "High", "deadline": "2026-12-01",
  "categoryId": 1, "categoryName": "Pha chế",
  "shiftId": 1, "shiftName": "Ca Sáng",
  "assigneeId": 2, "assigneeName": "Nhân Viên Pha Chế",
  "createdAt": "2026-11-19T00:54:35.607Z"
}
```

### Kiểm thử phần API công việc

- `docs/tests/tv3.http` có 39 request (đăng nhập, CRUD, tìm kiếm, lọc, phân trang và 20 ca biên), mỗi request ghi mã mong đợi. Token được lấy tự động từ request đăng nhập bằng biến `{{loginAdmin.response.body.$.data.token}}` của REST Client, không phải dán tay (phải gửi 2 request đăng nhập trước).
- Đã chạy toàn bộ file bằng công cụ dòng lệnh httpyac trên SQL Server 2022 với `schema.sql` và `seed.sql` của TV4: 39/39 đúng mã mong đợi.
- Đã thử thêm 34 ca biên khó (page cực lớn, id vượt kiểu INT, tham số lặp dạng mảng, body rỗng, body là mảng, JSON hỏng, tiêu đề đúng 200 ký tự, ngày 29/02 năm nhuận, emoji, `<script>`): không ca nào gây lỗi 500.
- Đã chạy thử trang `tasks.html` bằng trình duyệt tự động (Playwright) với cả hai vai trò: lọc, tìm kiếm, trạng thái rỗng, chuyển trang, thêm, sửa, đổi trạng thái, xóa, tự lùi trang, Staff không thấy nút Sửa/Xóa, chưa đăng nhập bị chuyển về `login.html`, debounce (gõ 5 ký tự chỉ gọi API 1 lần), bấm Lưu 3 lần liên tiếp chỉ gửi 1 request, phản hồi chậm của bộ lọc cũ không ghi đè kết quả mới, lỗi 400 từ server hiện trong form. Không trang nào bị cuộn ngang ở 375, 768, 992, 1200, 1280, 1440px; từ 1200px bảng nằm gọn, nhỏ hơn thì bảng cuộn ngang trong khung riêng (dưới 576px chuyển sang dạng thẻ).
- Phần mở rộng có thêm mục 5, 6, 7 trong `tv3.http` (bộ lọc X5, lịch sử và bình luận X5, mẫu việc X3); bảng test mở rộng ở mục 7 của báo cáo này.
- Đã kiểm tra trang Ca làm (TV1) hiển thị đúng công việc theo ca qua `GET /api/tasks?shiftId=...` và trang Thống kê (TV4) không lỗi sau khi có dữ liệu thật.

---

## 3. Danh sách ảnh chụp màn hình cần có

Đặt tên ảnh đúng cột "Tên ảnh", lưu vào `docs/bao-cao/anh/` khi ghép báo cáo. Chụp sau khi chạy `schema.sql`, `seed.sql` và `npm run seed:users`.

| STT | Tên ảnh | Trang | Tài khoản | Trạng thái cần chụp | Ghi chú chú thích |
| :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `tv3-01-danh-sach-admin.png` | tasks.html | Admin | Trang 1, không lọc, thấy cột Thao tác có nút Sửa/Xóa | Danh sách công việc lấy từ CSDL, 10 việc/trang |
| 2 | `tv3-02-danh-sach-staff.png` | tasks.html | Staff | Trang 1, cột Thao tác chỉ có nút "Chi tiết" (không có Sửa/Xóa) | Staff không có quyền sửa/xóa |
| 3 | `tv3-03-tim-kiem.png` | tasks.html | Staff | Gõ "cà phê" vào ô tìm kiếm | Tìm theo tên và mô tả (5 kết quả với seed) |
| 4 | `tv3-04-loc-ket-hop.png` | tasks.html | Staff | Ưu tiên = Cao, Danh mục = Pha chế | Lọc kết hợp nhiều điều kiện |
| 5 | `tv3-05-phan-trang.png` | tasks.html | Staff | Bấm sang trang 3, thấy "Hiển thị 21 - 30 / 30" | Phân trang phía server, việc không có hạn chót ở cuối |
| 6 | `tv3-06-qua-han.png` | tasks.html | Staff | Dòng có nhãn đỏ "Quá hạn" | Việc quá hạn được đánh dấu |
| 7 | `tv3-07-rong.png` | tasks.html | Staff | Gõ "xyz123" vào ô tìm kiếm | Trạng thái rỗng "Không tìm thấy công việc" |
| 8 | `tv3-08-modal-them.png` | tasks.html | Staff | Mở modal Thêm, chọn Danh mục/Ca/Người thực hiện | Ô chọn lấy từ API, không cố định |
| 9 | `tv3-09-loi-validation.png` | tasks.html | Staff | Bấm Lưu khi để trống tên | Kiểm tra phía client, viền đỏ và thông báo tiếng Việt |
| 10 | `tv3-10-them-thanh-cong.png` | tasks.html | Staff | Ngay sau khi lưu, toast xanh "Thêm công việc thành công" | Thêm qua API, dữ liệu vào SQL Server |
| 11 | `tv3-11-sua.png` | tasks.html | Admin | Modal "Sửa công việc #..." đã điền sẵn | Chỉ Admin sửa toàn bộ |
| 12 | `tv3-12-doi-trang-thai.png` | tasks.html | Staff | Đổi ô trạng thái sang "Hoàn thành", thấy toast | Staff đổi trạng thái bằng PATCH |
| 13 | `tv3-13-xac-nhan-xoa.png` | tasks.html | Admin | Hộp xác nhận xóa | Xóa có xác nhận |
| 14 | `tv3-14-staff-delete-403.png` | VS Code | Staff | Kết quả request 4.19 trong `tv3.http` | API trả 403 khi Staff xóa |
| 15 | `tv3-15-ca-bien-400.png` | VS Code | Staff | Kết quả request 4.14 (status và priority lạ) | Server kiểm tra lại dữ liệu, trả mảng errors |
| 16 | `tv3-16-csdl.png` | SSMS | — | `SELECT TOP 5 * FROM Tasks ORDER BY Id DESC` sau khi thêm | Dữ liệu được lưu thật trong SQL Server |
| 17 | `tv3-17-dien-thoai.png` | tasks.html | Staff | Chế độ thiết bị 375px (F12 → Toggle device) | Bảng chuyển thành dạng thẻ (`.table-cards`) |
| 18 | `tv3-18-loi-ket-noi.png` | tasks.html | Staff | Tắt server rồi bấm sang trang khác | Toast đỏ "Không thể kết nối đến máy chủ" |

---

## 4. Ghi chú cho các thành viên khác

| Người sở hữu | File | Nội dung |
| :--- | :--- | :--- |
| TV1 / TV5 | `public/assets/js/main.js`, `theme.js`, `shiftService.js` | Sau khi viết lại `tasks.html`, không còn trang nào nạp `main.js` và `theme.js`; `main.js` vẫn tham chiếu `window.TaskService` (đã xóa). `shiftService.js` chỉ còn được `tests/shiftService.test.cjs` dùng. Đề nghị chủ file xem xét xóa để đạt mục checklist "không còn taskService.js hay LocalStorage cho dữ liệu nghiệp vụ". |
| TV5 | `public/assets/css/style.css` | Ở 375px, nhãn `td::before` của `.table-cards` bị co lại khi nội dung ô dài (vd. chữ "Công việc" xuống dòng). Có thể thêm `flex-shrink: 0; margin-right: 1rem;` cho `.table-cards td::before`. |
| TV5 | `public/assets/css/style.css`, `ui.js` | Ở giao diện tối: chữ của mục đang chọn trên navbar gần như không thấy (nền và chữ cùng tông nâu); placeholder của ô nhập (`.form-control`) quá tối. Lớp `text-muted` của Bootstrap cũng khó đọc trên nền tối, `shifts.html` (TV1) đang dùng lớp này; trang công việc đã tránh bằng lớp riêng `task-muted` dùng biến `--text-secondary`. |
| TV1 | `server/middleware/errorHandler.js` | Gửi JSON hỏng (vd. `{title:`) trả 400 nhưng `message` là thông báo tiếng Anh của Node ("Expected property name..."). Có thể bắt `err.type === 'entity.parse.failed'` để trả "Dữ liệu JSON không hợp lệ." |
| TV5 | `public/assets/js/ui.js` | (Phần mở rộng) Khi làm TV5-XU, thêm liên kết "Mẫu việc" (`templates.html`) chỉ hiện với `isAdmin()`. `GET /api/tasks?assigneeId=me&overdue=1` đã có trên `main` cho TV5-X1. |
| TV1, TV2, TV4 | `docs/ra-soat-toan-du-an.md`, `docs/bao-mat-ra-soat.md`, `docs/bao-cao/kiem-tra-ghep.md` | Các dòng "Đang chờ TV3" về `routes/tasks.js`, `tasks.js`, `tv3.md` đã hoàn thành, có thể cập nhật trạng thái. |

---

## 5. Tính năng mở rộng: Lịch sử, bình luận công việc và bộ lọc me/overdue (`[TV3-X5]`)

**Mục đích nghiệp vụ.** Trong quán, một việc thường qua tay nhiều người: Admin giao, nhân viên ca sáng làm dở, ca tối làm tiếp. Trước đây bảng `Tasks` chỉ giữ trạng thái hiện tại nên không biết ai đã đổi gì, lúc nào. Tính năng này ghi lại lịch sử thao tác và cho phép trao đổi ngay trên từng công việc. Hai bộ lọc mới `assigneeId` và `overdue` giúp mỗi nhân viên xem nhanh việc của mình và việc đã trễ hạn (trang "Việc của tôi" và huy hiệu quá hạn của TV5-X1 dùng đúng hai bộ lọc này).

**Ai được dùng.** Admin và Staff đều được xem lịch sử, bình luận và dùng bộ lọc. Quyền sửa toàn bộ (PUT) và xóa vẫn chỉ Admin như cũ.

**Luồng xử lý.**

```
tasks.js (nút "Chi tiết")
   ├─ GET  /api/tasks/:id/logs      -> SELECT TaskLogs LEFT JOIN Users ... ORDER BY CreatedAt DESC
   └─ POST /api/tasks/:id/comments  -> INSERT TaskLogs ... SELECT ... WHERE EXISTS (Tasks.Id = @taskId)

POST / PUT / PATCH /api/tasks       -> thao tác chính trên Tasks, sau đó addLog() ghi TaskLogs
GET /api/tasks?assigneeId=me&overdue=1
                                    -> WHERE t.AssigneeId = @assigneeId
                                       AND (t.Deadline < CAST(GETDATE() AS DATE) AND t.Status <> 'Done')
```

- **Bộ lọc:** `assigneeId` nhận số nguyên dương hoặc `me` (server thay bằng `req.user.id` lấy từ JWT, client không tự gửi id của mình); giá trị khác trả 400. `overdue` nhận `1` hoặc `0`. Hai điều kiện được ghép bằng AND với bộ lọc cũ vào cùng một biến `where`, và câu `COUNT(*)` dùng lại đúng biến đó nên `pagination.total` luôn khớp với danh sách.
- **Ghi lịch sử:** hàm cục bộ `addLog(taskId, userId, action, oldValue, newValue, comment)` trong `routes/tasks.js`:
  - POST tạo việc ghi `created`.
  - PATCH status ghi `status` kèm giá trị cũ và mới. Giá trị cũ lấy bằng `OUTPUT DELETED.Status` ngay trong câu UPDATE nên không cần đọc trước rồi mới sửa. Chọn lại đúng trạng thái đang có thì không ghi.
  - PUT ghi `status` nếu Status đổi, và ghi `updated` nếu trường khác đổi. Cột `NewValue` của dòng `updated` liệt kê mã ngắn các trường đã đổi (`title`, `desc`, `prio`, `deadline`, `cat`, `shift`, `assignee`) để vừa cột NVARCHAR(50); Frontend đổi sang chữ tiếng Việt.
  - `addLog` bọc trong `try/catch`: lỗi ghi log chỉ `console.error`, không làm thất bại thao tác chính vì thao tác chính đã thành công trước đó.
- **Bình luận** là thao tác chính nên lỗi CSDL được trả về người dùng. Kiểm tra 1–500 ký tự bằng `isString` của `validators.js`; việc không tồn tại trả 404.
- **Giờ của lịch sử:** `createdAt` trả dạng chuỗi `YYYY-MM-DD HH:mm:ss` (đổi bằng `CONVERT(VARCHAR(19), CreatedAt, 120)` trong SQL). Lý do: driver mssql coi DATETIME2 là giờ UTC, nếu trả kiểu Date thì trên máy Windows giờ Việt Nam sẽ bị lệch 7 tiếng.
- **Giao diện:** mỗi dòng của `tasks.html` có nút "Chi tiết" (cả Admin và Staff). Modal hiển thị thông tin việc, ô bình luận có đếm ký tự, nút Gửi bị khóa khi đang gửi, và dòng thời gian mới nhất trước. Mọi chuỗi (tên người, nội dung bình luận, giá trị cũ/mới) đều qua `escapeHtml` nên bình luận chứa `<script>` chỉ hiện thành chữ.

**Bảng CSDL liên quan.** `TaskLogs` (TV4 tạo trong `schema-mo-rong.sql`), `Tasks`, `Users`.

**File cài đặt.** `server/routes/tasks.js`, `public/tasks.html`, `public/assets/js/tasks.js`, `docs/tests/tv3.http` (mục 5 và 6).

**Phân quyền.**

| Endpoint | Admin | Staff |
| :--- | :---: | :---: |
| `GET /api/tasks?assigneeId=&overdue=` | Có | Có |
| `GET /api/tasks/:id/logs` | Có | Có |
| `POST /api/tasks/:id/comments` | Có | Có |
| Chưa đăng nhập (mọi endpoint trên) | 401 | 401 |

---

## 6. Tính năng mở rộng: Checklist mở/đóng ca – mẫu việc (`[TV3-X3]`)

**Mục đích nghiệp vụ.** Mỗi ca có những việc lặp lại hằng ngày (bật máy pha, kiểm két, vệ sinh máy cuối ngày...). Thay vì Admin gõ lại từng việc mỗi ngày, Admin soạn mẫu một lần cho từng ca, rồi mỗi ngày bấm "Tạo việc" để sinh các công việc thật vào bảng `Tasks`. Các việc sinh ra hiện ngay ở trang Công việc và trang Ca làm như mọi việc khác.

**Ai được dùng.** Xem danh sách mẫu: Admin và Staff (API). Thêm, sửa, bật/tắt, xóa mẫu và tạo việc: chỉ Admin. Trang `templates.html` chỉ cho Admin; Staff mở trang sẽ thấy thông báo "Chỉ Admin được vào trang này" rồi bị chuyển về `tasks.html` (server vẫn chặn bằng `requireRole('Admin')`, trang chỉ là lớp bảo vệ thứ hai).

**Luồng xử lý.**

```
templates.js
   ├─ GET  /api/shifts, /api/categories   -> đổ ô chọn ca, danh mục
   ├─ GET  /api/templates?shiftId=        -> SELECT TaskTemplates JOIN Shifts LEFT JOIN Categories
   ├─ POST / PUT / DELETE /api/templates  -> kiểm tra dữ liệu, ca và danh mục tồn tại, rồi ghi TaskTemplates
   └─ POST /api/templates/generate        -> một batch T-SQL:
          SET XACT_ABORT ON; BEGIN TRAN;
          INSERT INTO Tasks (...) SELECT ... FROM TaskTemplates
            WHERE ShiftId = @shiftId AND IsActive = 1
              AND NOT EXISTS (SELECT 1 FROM Tasks WITH (UPDLOCK, HOLDLOCK)
                              WHERE Title = ... AND ShiftId = ... AND Deadline = @d)
          COMMIT;  -> trả { created, skipped }
```

- **Kiểm tra dữ liệu mẫu:**
  - Tên 1–200 ký tự, mô tả tối đa 500, ưu tiên Low/Medium/High.
  - Ca bắt buộc và phải tồn tại; danh mục tồn tại hoặc để trống. Ca hoặc danh mục không tồn tại trả 404.
  - `isActive` nhận true/false.
  - Id mẫu không tồn tại trả 404.
- **Tạo việc cho ngày:**
  - `date` dạng YYYY-MM-DD, phải là ngày có thật (`isISODate`), sai thì 400. Không gửi thì mặc định hôm nay theo đồng hồ SQL Server, cùng mốc với quy tắc "quá hạn".
  - Việc sinh ra có Status `Pending`, chưa giao người (AssigneeId NULL), hạn chót bằng ngày đã chọn.
  - Bỏ qua mẫu nếu đã có việc cùng tên, cùng ca, cùng ngày, nên bấm hai lần không sinh trùng (lần hai trả `created = 0`). Khóa `UPDLOCK, HOLDLOCK` giữ đúng điều này cả khi hai Admin bấm cùng lúc.
  - Mẫu trùng tên trong cùng ca chỉ sinh một việc (`ROW_NUMBER`).
  - Ca chưa có mẫu đang bật trả `created = 0, skipped = 0`; ca không tồn tại trả 404.
  - Sau khi sinh, server ghi thêm log `created` vào `TaskLogs` cho từng việc mới. Lỗi ở bước này chỉ ghi console, không ảnh hưởng kết quả.
- **Giao diện:**
  - Bộ lọc theo ca và bảng mẫu (dưới 576px chuyển thành thẻ).
  - Modal thêm/sửa có kiểm tra phía client bằng `validateField`.
  - Công tắc bật/tắt `IsActive` gọi PUT; sau mỗi lần bấm trang tải lại từ CSDL.
  - Nút xóa có hộp xác nhận.
  - Khối "Tạo việc cho ngày" (chọn ca, chọn ngày) hiện toast "Đã tạo x việc, bỏ qua y". Ngày mặc định được ghép từ giờ máy, không dùng `toISOString` để khỏi lệch múi giờ.

**Bảng CSDL liên quan.** `TaskTemplates` (TV4 tạo), `Tasks`, `Shifts`, `Categories`, `TaskLogs`.

**File cài đặt.** `server/routes/templates.js` (ghi đè file khung của TV1-E0), `public/templates.html`, `public/assets/js/templates.js`, `docs/tests/tv3.http` (mục 7).

**Phân quyền.**

| Endpoint | Admin | Staff |
| :--- | :---: | :---: |
| `GET /api/templates?shiftId=` | Có | Có |
| `POST /api/templates` | Có | 403 |
| `PUT /api/templates/:id` | Có | 403 |
| `DELETE /api/templates/:id` | Có | 403 |
| `POST /api/templates/generate` | Có | 403 |
| Trang `templates.html` | Có | Bị chuyển về `tasks.html` |

---

## 7. Test mở rộng

Hai cột cuối để trống, điền sau khi tự chạy trên máy (SQL Server thật, đã chạy `schema-mo-rong.sql` và `seed-mo-rong.sql`). Số thứ tự request ghi trong cột "Các bước" là số trong `docs/tests/tv3.http`.

### 7.1. TV3-X5

| Mã | Chức năng | Các bước | Kết quả mong đợi | Kết quả thực tế | Đạt? |
| :--- | :--- | :--- | :--- | :--- | :--- |
| X5-01 | Lọc việc của tôi | Admin giao 2 việc cho staff; đăng nhập Staff gọi request 5.1 `GET /api/tasks?assigneeId=me` | 200, chỉ có việc có `assigneeId` = id của staff, `pagination.total` = 2 | | |
| X5-02 | assigneeId sai | Request 5.2 `assigneeId=abc` và 5.3 `assigneeId=0` | 400 "assigneeId phải là số nguyên dương hoặc 'me'." | | |
| X5-03 | Lọc quá hạn | Request 5.5 `overdue=1`; chạy trong SSMS `SELECT COUNT(*) FROM Tasks WHERE Deadline < CAST(GETDATE() AS DATE) AND Status <> 'Done'` | `pagination.total` bằng số đếm SSMS; không có việc Done | | |
| X5-04 | Kết hợp bộ lọc | Request 5.7 `overdue=1&status=Pending` và 5.8 `overdue=1&status=Done` | 5.7 chỉ việc Pending quá hạn; 5.8 `total = 0` | | |
| X5-05 | overdue sai | Request 5.6 `overdue=yes` | 400 "overdue chỉ nhận 1 (chỉ việc quá hạn) hoặc 0." | | |
| X5-06 | Ghi log khi tạo, đổi trạng thái, sửa | Chạy 6.1, 6.2, 6.3 rồi 6.6 | Lịch sử có (mới nhất trước): `updated` (`assignee`), `status` InProgress→Done, `status` Pending→InProgress, `created` | | |
| X5-07 | Không ghi log khi trạng thái không đổi | Request 6.15 (PATCH về đúng trạng thái hiện tại), rồi 6.6 | 200; số dòng `status` không tăng | | |
| X5-08 | Staff bình luận | Trên `tasks.html` đăng nhập Staff, bấm "Chi tiết", nhập bình luận, bấm Gửi | Toast "Đã thêm bình luận", bình luận nằm đầu dòng thời gian kèm tên staff | | |
| X5-09 | Bình luận chứa script | Bình luận `<script>alert(1)</script>` rồi xem dòng thời gian | Hiện nguyên văn dạng chữ, không bật hộp thoại alert | | |
| X5-10 | Bình luận rỗng hoặc quá dài | Request 6.8 (chỉ khoảng trắng), 6.10 (501 ký tự); trên giao diện bấm Gửi khi ô trống | API trả 400; giao diện viền đỏ "Bình luận không được để trống." | | |
| X5-11 | Việc không tồn tại | Request 6.11 và 6.12 (id 999999); 6.13 (id `abc`) | 6.11, 6.12: 404 "Không tìm thấy công việc."; 6.13: 400 | | |
| X5-12 | Chưa đăng nhập | Request 6.14 (không có token) | 401 | | |

### 7.2. TV3-X3

| Mã | Chức năng | Các bước | Kết quả mong đợi | Kết quả thực tế | Đạt? |
| :--- | :--- | :--- | :--- | :--- | :--- |
| X3-01 | Danh sách mẫu | Request 7.1 (Staff), 7.2 `shiftId=1` (Admin) | 200; 7.1 có 6 mẫu seed kèm `shiftName`, `categoryName`; 7.2 chỉ mẫu ca 1 | | |
| X3-02 | Staff không được sửa mẫu | Request 7.4 (POST), 7.10 (PUT), 7.20 (DELETE), 7.12 (generate) bằng token Staff | Tất cả 403 | | |
| X3-03 | Staff mở trang mẫu việc | Đăng nhập Staff, gõ `templates.html` trên thanh địa chỉ | Toast "Chỉ Admin được vào trang này", sau khoảng 1,5 giây chuyển về `tasks.html` | | |
| X3-04 | Admin thêm, sửa, tắt mẫu | Trên `templates.html`: thêm mẫu cho Ca Sáng, sửa ưu tiên, gạt công tắc tắt | Toast thành công từng bước; SSMS `SELECT * FROM TaskTemplates` thấy dữ liệu và `IsActive = 0` | | |
| X3-05 | Dữ liệu mẫu sai | Request 7.6; trên giao diện bấm Lưu khi để trống tên và ca | API 400 với 4 lỗi; giao diện viền đỏ ở ô Tên và Ca | | |
| X3-06 | Ca hoặc danh mục không tồn tại | Request 7.7, 7.8, 7.11 | 404 kèm thông báo tương ứng | | |
| X3-07 | Tạo việc cho ngày | Khối "Tạo việc cho ngày": chọn Ca Sáng, ngày hôm nay, bấm Tạo; mở `tasks.html` lọc Ca Sáng | Toast "Đã tạo x việc, bỏ qua 0" (x = số mẫu đang bật); các việc mới Pending, hạn hôm nay, chưa giao | | |
| X3-08 | Không sinh việc trùng | Bấm Tạo lần hai với cùng ca, cùng ngày (hoặc request 7.13 rồi 7.14) | Lần hai "Đã tạo 0 việc, bỏ qua x"; SSMS đếm số việc theo Title + ShiftId + Deadline không có bản trùng | | |
| X3-09 | Mẫu đã tắt không được dùng | Tắt một mẫu của ca, tạo việc cho một ngày mới | `created` = số mẫu đang bật (không tính mẫu đã tắt) | | |
| X3-10 | Ca không tồn tại hoặc ngày sai khi tạo việc | Request 7.16, 7.17, 7.18, 7.19 | 7.16: 404; 7.17, 7.18, 7.19: 400 | | |
| X3-11 | Xóa mẫu | Bấm Xóa ở một mẫu, chọn OK; request 7.21 gọi hai lần | Toast "Xóa mẫu việc thành công"; lần gọi thứ hai trả 404; các việc đã sinh trước đó vẫn còn trong `Tasks` | | |
| X3-12 | Lịch sử của việc sinh từ mẫu | Sau X3-07, mở "Chi tiết" một việc vừa sinh | Dòng thời gian có "đã tạo công việc" với tên Admin | | |

---

## 8. Ảnh chụp cần có (phần mở rộng)

Đặt tên ảnh đúng cột "Tên ảnh", lưu cùng thư mục với ảnh ở mục 3.

| STT | Tên ảnh | Trang | Tài khoản | Trạng thái cần chụp | Ghi chú chú thích |
| :---: | :--- | :--- | :--- | :--- | :--- |
| 19 | `tv3-x5-01-nut-chi-tiet.png` | tasks.html | Staff | Danh sách có nút "Chi tiết" ở mỗi dòng | Staff cũng xem được lịch sử |
| 20 | `tv3-x5-02-dong-thoi-gian.png` | tasks.html | Admin | Modal Chi tiết của một việc đã đổi trạng thái, đã sửa và có bình luận | Dòng thời gian mới nhất trước, mỗi loại một màu chấm |
| 21 | `tv3-x5-03-binh-luan-script.png` | tasks.html | Staff | Bình luận `<script>alert(1)</script>` hiện thành chữ | Chống XSS bằng `escapeHtml` |
| 22 | `tv3-x5-04-binh-luan-rong.png` | tasks.html | Staff | Bấm Gửi khi ô bình luận trống, viền đỏ | Kiểm tra phía client |
| 23 | `tv3-x5-05-dien-thoai.png` | tasks.html | Staff | Modal Chi tiết ở 375px (toàn màn hình) | Giao diện điện thoại |
| 24 | `tv3-x5-06-api-loc.png` | VS Code | Staff | Kết quả request 5.9 `assigneeId=me&overdue=1&pageSize=1` | `pagination.total` = số việc quá hạn của tôi |
| 25 | `tv3-x5-07-api-400.png` | VS Code | Staff | Kết quả request 5.2 `assigneeId=abc` | Server kiểm tra tham số |
| 26 | `tv3-x5-08-csdl-tasklogs.png` | SSMS | — | `SELECT TOP 10 * FROM TaskLogs ORDER BY Id DESC` | Lịch sử được lưu thật trong SQL Server |
| 27 | `tv3-x3-01-trang-mau.png` | templates.html | Admin | Trang đầy đủ ở 1200px | Bảng mẫu theo ca, công tắc bật/tắt |
| 28 | `tv3-x3-02-modal-them.png` | templates.html | Admin | Modal thêm mẫu đã chọn ca và danh mục | Ô chọn lấy từ API |
| 29 | `tv3-x3-03-tao-viec.png` | templates.html | Admin | Toast "Đã tạo x việc, bỏ qua 0" | Sinh việc từ mẫu |
| 30 | `tv3-x3-04-khong-trung.png` | templates.html | Admin | Bấm Tạo lần hai, toast "Đã tạo 0 việc, bỏ qua x" | Không sinh việc trùng |
| 31 | `tv3-x3-05-viec-sinh-ra.png` | tasks.html | Admin | Lọc theo ca vừa tạo, thấy các việc mới Pending, chưa giao | Việc sinh ra nằm trong bảng `Tasks` |
| 32 | `tv3-x3-06-staff-bi-chan.png` | templates.html | Staff | Toast "Chỉ Admin được vào trang này" | Phân quyền ở trang |
| 33 | `tv3-x3-07-api-403.png` | VS Code | Staff | Kết quả request 7.12 (Staff gọi generate) | API trả 403 |
| 34 | `tv3-x3-08-dien-thoai.png` | templates.html | Admin | Trang ở 375px, bảng mẫu dạng thẻ | Giao diện điện thoại |
| 35 | `tv3-x3-09-loi-validation.png` | templates.html | Admin | Bấm Lưu khi để trống tên và ca | Viền đỏ, thông báo tiếng Việt |

---

## 9. Câu vấn đáp phần mở rộng (tự ôn)

| Tính năng | Câu hỏi | Ý chính cần trả lời |
| :--- | :--- | :--- |
| X5 | Vì sao lỗi ghi log không làm thất bại thao tác chính? | Log là thao tác phụ, chạy SAU khi thao tác chính đã thành công; `addLog` bọc `try/catch`, lỗi chỉ `console.error`. Nếu để lỗi log trả 500 thì người dùng tưởng thao tác thất bại và bấm lại, trong khi dữ liệu đã đổi. |
| X5 | Bình luận có chứa script thì xử lý sao? | Server lưu nguyên văn (không sửa dữ liệu người dùng); khi hiển thị, mọi chuỗi qua `escapeHtml` nên `<` thành `&lt;`, trình duyệt hiện thành chữ chứ không chạy. |
| X5 | Vì sao `assigneeId=me` lại an toàn? | Server lấy id từ JWT đã ký (`req.user.id`), client không tự gửi id của mình nên không giả mạo được. |
| X3 | Làm sao bấm tạo việc hai lần không sinh việc trùng? | Câu INSERT có điều kiện `NOT EXISTS` theo Title + ShiftId + Deadline, nằm trong một giao dịch có khóa `UPDLOCK, HOLDLOCK` nên cả hai Admin bấm cùng lúc cũng không trùng. |
| X3 | Vì sao sinh việc bằng một batch T-SQL thay vì lặp từng mẫu trong JavaScript? | Một lần gọi CSDL, có giao dịch: hoặc tạo đủ hoặc không tạo gì; không có khoảng hở giữa bước kiểm tra và bước chèn. |
