# Báo Cáo Cá Nhân – Thành Viên 3 (TV3)
**Họ và tên:** [Tên sinh viên TV3]  
**MSSV:** [Mã số sinh viên]  
**Vai trò:** Quản lý Công việc (API `/api/tasks`, `/api/categories`, trang `tasks.html`)  
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
| Xem chi tiết | Admin, Staff | `GET /api/tasks/:id`; `checkIdParam` trả 400 nếu id không phải số nguyên dương, router trả 404 nếu không có bản ghi. |
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

### 1.2. Tìm kiếm

- Ô `#searchInput` dùng **debounce 300 ms**: chỉ gọi API khi người dùng ngừng gõ 300 ms, tránh gửi một request cho mỗi phím.
- Server tìm bằng `LIKE` trên `Title` và `Description`. Hàm `escapeLike()` đổi `[` → `[[]`, `%` → `[%]`, `_` → `[_]`, nên người dùng gõ `50%` sẽ tìm đúng chuỗi "50%" thay vì khớp mọi thứ. Dấu `'` không cần xử lý vì giá trị đi qua tham số `@search` nên không thể gây SQL injection.

### 1.3. Lọc

- Bốn bộ lọc: Trạng thái, Ưu tiên, Danh mục, Ca làm. Danh sách Danh mục và Ca lấy từ `GET /api/categories`, `GET /api/shifts` (không còn danh mục cố định trong HTML như bản cũ).
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
| GET | `/api/tasks` | Admin, Staff | Danh sách có `search`, `status`, `priority`, `categoryId`, `shiftId`, `page`, `pageSize` | 400, 401, 500 |
| GET | `/api/tasks/:id` | Admin, Staff | Chi tiết công việc | 400, 401, 404, 500 |
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

- `docs/tests/tv3.http` có 39 request (đăng nhập, CRUD, tìm kiếm, lọc, phân trang và 20 ca biên), mỗi request ghi mã mong đợi. Token được lấy tự động từ request đăng nhập (`# @name loginAdmin`), không phải dán tay.
- Đã chạy toàn bộ file trên SQL Server 2022 với `schema.sql` và `seed.sql` của TV4: 39/39 đúng mã mong đợi.
- Đã chạy thử trang `tasks.html` bằng trình duyệt tự động (Playwright) với cả hai vai trò: lọc, tìm kiếm, trạng thái rỗng, chuyển trang, thêm, sửa, đổi trạng thái, xóa, tự lùi trang, Staff không thấy nút Sửa/Xóa, không cuộn ngang ở 375px, không có lỗi console.

---

## 3. Danh sách ảnh chụp màn hình cần có

Đặt tên ảnh đúng cột "Tên ảnh", lưu vào `docs/bao-cao/anh/` khi ghép báo cáo. Chụp sau khi chạy `schema.sql`, `seed.sql` và `npm run seed:users`.

| STT | Tên ảnh | Trang | Tài khoản | Trạng thái cần chụp | Ghi chú chú thích |
| :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `tv3-01-danh-sach-admin.png` | tasks.html | Admin | Trang 1, không lọc, thấy cột Thao tác có nút Sửa/Xóa | Danh sách công việc lấy từ CSDL, 10 việc/trang |
| 2 | `tv3-02-danh-sach-staff.png` | tasks.html | Staff | Trang 1, cột Thao tác chỉ có dấu "—" | Staff không có quyền sửa/xóa |
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
| TV1, TV2, TV4 | `docs/ra-soat-toan-du-an.md`, `docs/bao-mat-ra-soat.md`, `docs/bao-cao/kiem-tra-ghep.md` | Các dòng "Đang chờ TV3" về `routes/tasks.js`, `tasks.js`, `tv3.md` đã hoàn thành, có thể cập nhật trạng thái. |
