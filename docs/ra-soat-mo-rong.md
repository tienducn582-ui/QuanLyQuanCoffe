# Rà Soát Toàn Bộ Phần Mở Rộng Hệ Thống (TV1-XR)

- **Người thực hiện:** Thành viên 1 (TV1 - Trưởng nhóm & Tích hợp)
- **Môn học:** Phát triển ứng dụng Web (PROG2008)
- **Dự án:** Cafe Task Manager
- **Mốc hoàn thành:** Mốc X3 · Chuẩn bị đóng băng phiên bản v1.1 (`v1.1-freeze`)

---

## 1. Mục Đích & Phạm Vi Rà Soát

Tài liệu này tổng hợp kết quả rà soát, kiểm chứng kỹ thuật và đối chiếu toàn bộ **9 tính năng mở rộng (X1 – X9)** cùng các tác vụ chung (E0, XU, XR, XD) đối chiếu trực tiếp với:
1. **Hợp đồng mở rộng** tại Mục 3 trong `AI_CONTEXT.md` và `docs/ke-hoach-mo-rong.md`.
2. **Quy tắc bảo mật:** Tham số hóa 100% câu lệnh SQL, chống SQL Injection, phân quyền RBAC (Admin/Staff), chống rò rỉ dữ liệu nhạy cảm, chống XSS qua `escapeHtml()`, chống CSV Injection, không dùng LocalStorage cho dữ liệu nghiệp vụ.
3. **Quy chuẩn định tuyến:** Các route tĩnh hoặc route con đặc biệt (`/logs`, `/mine`, `/export.csv`, `/by-user`, `/by-shift`, `/weekly`) **bắt buộc phải đặt trước** các route động chứa tham số `/:id`.

---

## 2. Bảng Đối Chiếu Chi Tiết 9 Tính Năng Mở Rộng

| Mã | Tính năng | Thành viên phụ trách | Router / File cài đặt | Giao diện HTML / JS | Trạng thái kỹ thuật | Đánh giá |
|:---|:---|:---:|:---|:---|:---:|:---:|
| **X1** | Việc của tôi + Huy hiệu quá hạn | TV5 | `server/routes/tasks.js` | `my-tasks.html`<br>`assets/js/my-tasks.js` | Hoàn thiện 100% API `assigneeId=me&overdue=1`, huy hiệu đỏ `#overdueBadge` trên navbar tự cập nhật | ✅ ĐẠT |
| **X2** | Bàn giao ca | TV1 | `server/routes/shifts.js` | `shifts.html`<br>`assets/js/shifts.js` | Hoàn thiện `/logs` (trước `/:id`), `/:id/start`, `/:id/end`, `/:id/handover`; modal bàn giao; bảng nhật ký | ✅ ĐẠT |
| **X3** | Checklist mở/đóng ca (Mẫu việc) | TV3 | `server/routes/templates.js` | `templates.html`<br>`assets/js/templates.js` | Hoàn thiện CRUD mẫu việc cho Admin, `/generate` tạo việc cho ngày không trùng lặp | ✅ ĐẠT |
| **X4** | Lịch phân ca tuần | TV1 | `server/routes/schedule.js` | `schedule.html`<br>`assets/js/schedule.js` | Hoàn thiện `/mine` (trước `/:id`), `GET /`, `POST /`, `DELETE /:id`; lưới tuần 7 ngày, đổi sang thẻ dưới 576px | ✅ ĐẠT |
| **X5** | Lịch sử & bình luận, bộ lọc | TV3 | `server/routes/tasks.js` | `tasks.html`<br>`assets/js/tasks.js` | Hoàn thiện `addLog` tự động, `/:id/logs`, `/:id/comments`, lọc `assigneeId=me` và `overdue=1` | ✅ ĐẠT |
| **X6** | Thống kê nâng cao + Xuất CSV | TV4 | `server/routes/stats.js` | `statistics.html`<br>`assets/js/statistics.js` | Hoàn thiện `/by-user`, `/by-shift`, `/weekly`, `/export.csv` (UTF-8 BOM, chống CSV injection) | ✅ ĐẠT |
| **X7** | Kho tối giản + Cảnh báo hết | TV4 | `server/routes/ingredients.js` | `inventory.html`<br>`assets/js/inventory.js` | Hoàn thiện `/stock`, lọc `lowOnly=1`, tự động INSERT task "Nhập hàng" trong cùng transaction | ✅ ĐẠT |
| **X8** | Khách hàng tích điểm | TV2 | `server/routes/customers.js` | `customers.html`<br>`assets/js/customers.js` | Hoàn thiện `/earn` (10k=1đ), `/redeem` nguyên tử không âm điểm, xếp hạng `Đồng`/`Bạc`/`Vàng` | ✅ ĐẠT |
| **X9** | POS + Sơ đồ bàn | TV5 | `server/routes/pos.js` | `pos.html`<br>`assets/js/pos.js` | Hoàn thiện quản lý bàn, menu, mở đơn, gọi món, thanh toán, hủy đơn; cập nhật điểm khách | ✅ ĐẠT |

---

## 3. Rà Soát Chi Tiết Tiêu Chuẩn Kỹ Thuật Từng Endpoint Mở Rộng

### 3.1. Phân hệ Ca làm việc & Bàn giao ca (`/api/shifts` - TV1-X2)
- `GET /api/shifts/logs?date=&shiftId=`:
  - Đã đặt TRƯỚC `GET /api/shifts/:id` trong `server/routes/shifts.js`.
  - Validate tham số `date` bằng `isISODate()`, mặc định hôm nay nếu để trống (400 nếu sai).
  - Trả tối đa 100 dòng mới nhất, kèm tên nhân viên và ca làm việc.
- `POST /api/shifts/:id/start`:
  - Kiểm tra ca tồn tại (404).
  - Kiểm tra người dùng hiện tại có ca nào đang mở (`EndedAt IS NULL`) hay không -> Trả 409 nếu có.
  - Tạo mới `ShiftLogs` với `LogDate = CAST(GETDATE() AS DATE)`, `StartedAt = SYSDATETIME()`.
- `POST /api/shifts/:id/end`:
  - Body `{ handoverNote? }` kiểm tra độ dài tối đa 500 ký tự (400 nếu vượt).
  - Tìm ca chưa kết thúc của chính người dùng tại ca `:id` (404 nếu không thấy).
  - Cập nhật `EndedAt = SYSDATETIME()` và `HandoverNote`.
- `GET /api/shifts/:id/handover`:
  - Trả `{ lastLog, openTasks }`.
  - `lastLog`: Log kết thúc gần nhất của ca này kèm ghi chú và người thực hiện.
  - `openTasks`: Các công việc có `ShiftId = :id` và `Status <> 'Done'`.

### 3.2. Phân hệ Lịch phân ca tuần (`/api/schedule` - TV1-X4)
- `GET /api/schedule/mine?from=&to=`:
  - Đã đặt TRƯỚC mọi route `/:id`.
  - Validate khoảng ngày: `from <= to`, tối đa không quá 31 ngày (400 nếu sai).
  - Lọc chính xác theo `UserId = req.user.id`.
- `GET /api/schedule?from=&to=`:
  - Lấy toàn bộ lịch phân ca của quán trong khoảng ngày yêu cầu.
- `POST /api/schedule`:
  - Quyền Admin (`requireRole('Admin')`).
  - Validate `shiftId`, `userId`, `workDate` hợp lệ (400).
  - Kiểm tra ca và người dùng tồn tại (404).
  - Kiểm tra trùng lặp bộ ba `(ShiftId, UserId, WorkDate)` -> Trả 409 Conflict.
- `DELETE /api/schedule/:id`:
  - Quyền Admin.
  - Xóa lịch phân công (404 nếu không tìm thấy).

### 3.3. Phân hệ Mẫu công việc (`/api/templates` - TV3-X3)
- `GET /api/templates?shiftId=`: Danh sách mẫu theo ca (Mọi vai trò).
- `POST /`, `PUT /:id`, `DELETE /:id`: Quản lý mẫu việc (Chỉ Admin).
- `POST /api/templates/generate`: Tạo công việc hàng ngày từ mẫu việc đang kích hoạt (`IsActive = 1`). Kiểm tra trùng lặp theo `Title + ShiftId + Deadline` để không tạo việc trùng.

### 3.4. Phân hệ Kho nguyên liệu (`/api/ingredients` - TV4-X7)
- `GET /api/ingredients?search=&lowOnly=1`: Tìm kiếm an toàn với `%`, `_`, `[`; cờ `isLow` chính xác khi `Quantity <= MinQuantity`.
- `PATCH /api/ingredients/:id/stock`: Cập nhật tồn kho theo `delta`. Chặn âm kho (400). Khi chạm ngưỡng tồn kho tối thiểu, tự động tạo việc `Nhập hàng: <Tên>` trong cùng batch transaction.

### 3.5. Phân hệ Khách hàng tích điểm (`/api/customers` - TV2-X8)
- `POST /api/customers/:id/earn`: Cộng điểm theo công thức `FLOOR(amount / 10000)`.
- `POST /api/customers/:id/redeem`: Đổi điểm bằng câu lệnh nguyên tử `UPDATE Customers SET Points = Points - @points WHERE Id = @id AND Points >= @points`. Chặn điểm âm an toàn tuyệt đối.
- `getRank(points)`: Tính động thứ hạng `Đồng` (< 100), `Bạc` (100–299), `Vàng` (>= 300) khi trả về, không lưu cứng vào CSDL.

### 3.6. Phân hệ POS & Sơ đồ bàn (`/api/pos` - TV5-X9)
- Ràng buộc: Mỗi bàn chỉ có duy nhất 1 đơn `Open` (được bảo vệ bởi chỉ mục có điều kiện `UX_Orders_OpenTable`).
- Tổng tiền `Total` được server tính toán lại từ các dòng `OrderItems` lúc thanh toán, không tin tưởng số tiền từ client.
- Khi thanh toán thành công, đơn chuyển `Paid`, giải phóng bàn về `Free`, đồng thời tự động tích điểm cho khách hàng nếu có `CustomerId`.

---

## 4. Rà Soát Giao Diện & Navbar (TV5-XU)

- Toàn bộ 6 trang chức năng mở rộng (`my-tasks.html`, `schedule.html`, `templates.html`, `inventory.html`, `customers.html`, `pos.html`) đều hoạt động với API thật và CSDL thật, không sử dụng Mock Data hoặc LocalStorage cho dữ liệu nghiệp vụ.
- **Thanh điều hướng Navbar (`renderNavbar()` trong `ui.js`):**
  - Đã tích hợp dropdown **"Mở rộng"** chứa các liên kết: Lịch phân ca, Quản lý kho, Khách hàng, POS Bán hàng và Mẫu công việc (chỉ Admin).
  - Không bị tràn ngang màn hình (`scrollWidth <= innerWidth`) ở cả 3 kích thước: `375px`, `768px`, `1200px`.
  - Không có bất kỳ liên kết chết (Dead Links) nào.

---

## 5. Bảng Ghi Nhận Lỗi & Đã Khắc Phục (Defect Log)

| Người sở hữu | File | Mô tả lỗi phát hiện | Mức độ | Cách khắc phục đã thực hiện |
|:---:|:---|:---|:---:|:---|
| **TV1** | `server/routes/shifts.js` | Endpoint `/logs` ban đầu có thể bị trùng với `/:id` nếu đặt sai thứ tự | Cao | Đặt `GET /logs` lên trước `GET /:id` để Express ưu tiên định tuyến chính xác. |
| **TV1** | `server/routes/schedule.js` | Endpoint `/mine` cần tránh xung đột với `/:id` | Cao | Đặt `GET /mine` lên trước mọi route động `/:id`. |
| **TV1** | `public/assets/js/schedule.js` | Tính ngày trong tuần bằng `toISOString()` gây lệch múi giờ UTC+7 | Trung bình | Tự tính toán cộng trừ ngày theo Date cục bộ và ghép chuỗi `YYYY-MM-DD` chuẩn. |
| **TV5** | `public/assets/js/ui.js` | Navbar có thể bị tràn khi thêm quá nhiều mục liên kết mới | Trung bình | Gom các trang mở rộng vào dropdown "Mở rộng" với CSS responsive tối ưu. |

---

## 6. Kết Luận & Quyết Định Đóng Băng Code v1.1

- **Tổng số tính năng mở rộng:** 9 / 9 tính năng hoàn thiện trọn luồng.
- **Tổng số router mở rộng:** 5 / 5 router đã gắn vào `server.js` và hoạt động hoàn chỉnh (không còn router khung rỗng).
- **Bộ kiểm thử API (`docs/tests/`):** Đầy đủ các file `tv1.http`, `tv2.http`, `tv3.http`, `tv4.http` bao phủ ca thành công, ca biên, phân quyền 403 và dữ liệu không hợp lệ 400.
- **Hệ thống sẵn sàng gắn nhãn `v1.1-freeze`.**
