# BÁO CÁO KỸ THUẬT PHẦN HÀNH THÀNH VIÊN TV5
## CHƯƠNG GIAO DIỆN NGƯỜI DÙNG, CLIENT CORE & QUY TRÌNH KIỂM THỬ TỰ ĐỘNG
*Bản nháp, cập nhật khi code đóng băng*

---

## MỤC LỤC
1. [Thông tin phân công thành viên nhóm](#1-thông-tin-phân-công-thành-viên-nhóm)
2. [Hệ thống thiết kế tông màu cà phê (Design System)](#2-hệ-thống-thiết-kế-tông-màu-cà-phê-design-system)
3. [Thư viện Client Core dùng chung (api.js & ui.js)](#3-thư-viện-client-core-dùng-chung-apijs--uijs)
4. [Hiện thực 5 trang giao diện thuộc phạm vi TV5](#4-hiện-thực-5-trang-giao-diện-thuộc-phạm-vi-tv5)
5. [Tài liệu khung chung & Hướng dẫn tái sử dụng cho TV1, TV3, TV4](#5-tài-liệu-khung-chung--hướng-dẫn-tái-sử-dụng-cho-tv1-tv3-tv4)
6. [Thiết kế Responsive & Xử lý hiển thị đa thiết bị](#6-thiết-kế-responsive--xử-lý-hiển-thị-đa-thiết-bị)
7. [Quy trình kiểm thử tự động (Tiêu chuẩn B1 - B13) & Số liệu thực tế](#7-quy-trình-kiểm-thử-tự-động-tiêu-chuẩn-b1---b13--số-liệu-thực-tế)
8. [Hiện trạng và Các thành phần chờ tích hợp](#8-hiện-trạng-và-các-thành-phần-chờ-tích-hợp)

---

## 1. THÔNG TIN PHÂN CÔNG THÀNH VIÊN NHÓM

| STT | Vai trò | Họ và tên sinh viên | Mã sinh viên | Phạm vi phụ trách chính |
|:---:|:---:|:---|:---:|:---|
| 1 | TV1 | [ĐIỀN TÊN] | [ĐIỀN MSV] | Quản lý Phân ca & Điểm danh (`shifts.html`, `shifts.js`, `server/routes/shifts.js`) |
| 2 | TV2 | [ĐIỀN TÊN] | [ĐIỀN MSV] | Xác thực, Phân quyền & Quản lý Người dùng (`server/routes/auth.js`, `users.js`, `auth.js`) |
| 3 | TV3 | [ĐIỀN TÊN] | [ĐIỀN MSV] | Quản lý Công việc & CRUD Task (`tasks.html`, `tasks.js`, `server/routes/tasks.js`) |
| 4 | TV4 | [ĐIỀN TÊN] | [ĐIỀN MSV] | Cơ sở dữ liệu, Báo cáo Thống kê & Test Cases (`schema.sql`, `stats.js`, `statistics.html`) |
| 5 | TV5 | [ĐIỀN TÊN] | [ĐIỀN MSV] | Nền tảng Cloud, Giao diện chung, Client Core & Kiểm thử tự động (`style.css`, `ui.js`, `api.js`, 5 trang TV5) |

---

## 2. HỆ THỐNG THIẾT KẾ TÔNG MÀU CÀ PHÊ (DESIGN SYSTEM)

Hệ thống thiết kế được xây dựng tập trung trong file `public/assets/css/style.css` dựa trên hệ biến CSS tùy biến (CSS Custom Properties), đảm bảo tính nhất quán trên toàn bộ ứng dụng, loại bỏ hoàn toàn các màu xanh mặc định của Bootstrap (`#0d6efd`) và hỗ trợ chuyển đổi mượt mà giữa hai giao diện Sáng (Light) và Tối (Dark).

### 2.1. Bảng màu chuẩn (Color Palette)
- **Chế độ Sáng (Warm Cream & Coffee):**
  - Màu nền chính (`--color-bg`): `#FBF5EC` (Kem sữa ấm áp, tạo cảm giác thân thiện).
  - Màu bề mặt thẻ (`--color-surface`): `#FFFFFF` (Trắng tinh khiết có viền mảnh).
  - Màu chủ đạo (`--color-primary`): `#4A2C11` (Nâu Espresso đậm, đại diện cho bản sắc thương hiệu).
  - Màu nhấn phụ (`--color-accent`): `#D4A373` (Nâu Caramel mật ong).
  - Màu chữ (`--color-text`): `#2B1810` (Nâu đen đậm, đạt độ tương phản WCAG >= 7.0).
- **Chế độ Tối (Dark Roast):**
  - Màu nền chính (`--color-bg`): `#1A1412` (Nâu hạt rang cháy đậm).
  - Màu bề mặt thẻ (`--color-surface`): `#261E1B` (Nâu gỗ tối).
  - Màu chữ (`--color-text`): `#F5EBE6` (Kem sáng dịu mắt).

### 2.2. Quy chuẩn Typography, Bo góc & Đổ bóng (Tiêu chuẩn B12)
- **Kiểu chữ (Typography):** Tối đa 2 họ font:
  - Font tiêu đề (`--font-heading`): `'Playfair Display', serif` tạo nét sang trọng cho thương hiệu cafe.
  - Font nội dung (`--font-body`): `'Plus Jakarta Sans', system-ui, sans-serif` tối ưu khả năng đọc trên màn hình điện tử.
- **Thang khoảng cách (8-point Grid):** `--space-4` (4px), `--space-8` (8px), `--space-16` (16px), `--space-24` (24px), `--space-32` (32px).
- **Bo góc (Border Radius):** Tối đa 3 giá trị cố định: `--radius-sm` (6px), `--radius-md` (12px), `--radius-pill` (9999px).
- **Đổ bóng (Box Shadow):** Tối đa 2 kiểu: `--shadow-sm` cho thẻ tĩnh và `--shadow-md` cho trạng thái hover/focus.
- **Biểu tượng (Iconography - Tiêu chuẩn B10):** Triệt tiêu 100% emoji màu mặc định của hệ điều hành (☕, 👤, 📋...), thay bằng icon SVG vector nét mảnh (stroke 1.8px - 2px) thừa hưởng màu sắc tông nâu qua biến CSS `currentColor`.

---

## 3. THƯ VIỆN CLIENT CORE DÙNG CHUNG (API.JS & UI.JS)

Để toàn bộ 5 thành viên có thể giao tiếp nhất quán với Backend Express và CSDL SQL Server, TV5 đã xây dựng 2 thư viện lõi không phụ thuộc thư viện ngoài:

### 3.1. Thư viện `public/assets/js/api.js` (Hợp đồng API chuẩn)
- **Hàm `apiFetch(path, options)`:** Bọc hàm `fetch()` tiêu chuẩn của trình duyệt:
  - Tự động đính kèm `Content-Type: application/json`.
  - Tự động trích xuất token từ `localStorage.getItem('token')` và đính kèm vào tiêu đề `Authorization: Bearer <token>`.
  - Tự động chặn mã lỗi **HTTP 401 Unauthorized**: Khi token hết hạn hoặc không hợp lệ, hệ thống tự động xóa dữ liệu đăng nhập và chuyển hướng người dùng về `login.html`.
- **Hệ thống tiện ích xác thực:**
  - `getUser()`: Trả về đối tượng người dùng hiện tại từ session.
  - `isAdmin()`: Kiểm tra quyền quản trị (`role === 'Admin'`).
  - `requireLogin()`: Bảo vệ các trang nội bộ (nếu chưa đăng nhập thì lập tức về `login.html`).
  - `logout()`: Xóa sạch token, thông tin user và chuyển hướng trang chủ.

### 3.2. Thư viện `public/assets/js/ui.js` (Thành phần giao diện dùng chung)
- **Hàm `renderNavbar(activePage)`:**
  - Tự động tạo cấu trúc thanh điều hướng thống nhất tại thẻ `#navbar`.
  - Nhận biết trạng thái đăng nhập: Nếu chưa đăng nhập chỉ hiện `Trang chủ`, `Đăng nhập`, `Đăng ký`. Nếu đã đăng nhập sẽ hiển thị các menu nghiệp vụ (`Quản lý công việc`, `Báo cáo & Thống kê`, `Phân công ca trực`) và badge vai trò (Admin/Staff).
  - Tích hợp nút chuyển đổi Dark Mode và menu trượt cho màn hình di động 375px.
- **Hàm `showToast(message, type, duration)`:** Hiển thị thông báo góc màn hình (Success, Error, Info) tự động biến mất, có thanh tiến trình và hỗ trợ đóng nhanh.
- **Hàm `validateField(input, rules)`:** Kiểm tra dữ liệu tại chỗ (inline validation) trên sự kiện `blur` hoặc `input`, hiển thị thông báo lỗi tiếng Việt ngay dưới ô nhập liệu và đổi viền màu cảnh báo.
- **Hàm `showEmpty(container, message)` & `renderPagination(container, totalPages, currentPage, onPageChange)`:** Chuẩn hóa giao diện khi danh sách rỗng và phân trang chuẩn cho các trang quản lý.

---

## 4. HIỆN THỰC 5 TRANG GIAO DIỆN THUỘC PHẠM VI TV5

| Trang | Đường dẫn | Mục đích sử dụng | Đặc điểm kỹ thuật nổi bật |
|:---|:---|:---|:---|
| **Trang chủ** | `public/index.html` | Giới thiệu dự án, tổng quan tính năng hệ thống | Hero section 2 cột cân đối, thanh điều hướng linh hoạt, thẻ tính năng tự co giãn |
| **Đăng nhập** | `public/login.html` | Cho phép nhân viên/quản trị đăng nhập | Căn giữa tuyệt đối (lệch <= 2px), không thanh cuộn dọc ở màn hình 1366px và 1920px |
| **Đăng ký** | `public/register.html` | Đăng ký tài khoản nhân viên mới | Kiểm tra dữ liệu thời gian thực (định dạng email, mật khẩu >= 6 ký tự, khớp xác nhận) |
| **Hồ sơ cá nhân** | `public/profile.html` | Xem thông tin tài khoản và đổi mật khẩu | Có kiểm tra phiên (`requireLogin()`), cập nhật tên hiển thị lên navbar sau khi lưu |
| **Khung chung** | `docs/khung-chung.html` | Trang tài liệu mẫu dành cho các thành viên | Mẫu chuẩn cho header, bảng, biểu mẫu, nút bấm, toast và Dark Mode |

*[CHỜ code đóng băng]* Luồng gửi dữ liệu thực tế tới Backend của `login.html`, `register.html`, `profile.html` đang kết nối tới các endpoint stub, chờ TV2 hoàn thiện API đăng nhập thật tại `server/routes/auth.js`.

---

## 5. TÀI LIỆU KHUNG CHUNG & HƯỚNG DẪN TÁI SỬ DỤNG CHO TV1, TV3, TV4

Để các thành viên phụ trách trang nghiệp vụ (`shifts.html`, `tasks.html`, `statistics.html`) không bị lệch chuẩn, TV5 cung cấp hướng dẫn tích hợp:

1. **Nhúng CSS và JS dùng chung trong `<head>`:**
   ```html
   <link rel="stylesheet" href="assets/css/style.css">
   <script src="assets/js/api.js" defer></script>
   <script src="assets/js/ui.js" defer></script>
   ```
2. **Khai báo Navbar chuẩn:**
   Đặt thẻ `<div id="navbar"></div>` ở đầu thẻ `<body>` và gọi:
   ```javascript
   document.addEventListener('DOMContentLoaded', () => {
     renderNavbar('shifts'); // hoặc 'tasks', 'statistics'
   });
   ```
3. **Bọc bảng chống tràn ngang (Tiêu chuẩn B1):**
   Mọi bảng dữ liệu HTML cần được bọc trong container có thanh cuộn ngang cục bộ:
   ```html
   <div class="table-responsive">
     <table class="table-custom">...</table>
   </div>
   ```

---

## 6. THIẾT KẾ RESPONSIVE & XỬ LÝ HIỂN THỊ ĐA THIẾT BỊ

Hệ thống được thiết kế theo tư duy **Mobile-First** và kiểm thử nghiệm thu nghiêm ngặt trên 5 độ phân giải đại diện:
1. **Mobile (375 × 667):** Menu thu gọn thành hamburger button, vùng bấm tương tác tối thiểu 40px, bố cục 1 cột.
2. **Tablet (768 × 1024):** Grid 2 cột tự cân bằng, menu điều hướng hiển thị ngang gọn gàng.
3. **Desktop (1200 × 800) & Laptop (1366 × 768):** Tối ưu không gian hiển thị, căn giữa nội dung trong khung `--max-width: 1200px`.
4. **FHD (1920 × 1080):** Giới hạn độ giãn nội dung, không để giao diện bị kéo dạt sang hai mép màn hình.

> **Cam kết kỹ thuật:** Tuyệt đối không dùng thuộc tính che giấu lỗi `overflow-x: hidden` ở thẻ `html` hoặc `body`. Toàn bộ hiện tượng tràn ngang được triệt tiêu tận gốc bằng `box-sizing: border-box`, `max-width: 100%`, `min-width: 0` và `flex-wrap: wrap`.

---

## 7. QUY TRÌNH KIỂM THỬ TỰ ĐỘNG (TIÊU CHUẨN B1 - B13) & SỐ LIỆU THỰC TẾ

Quy trình kiểm thử được tự động hóa bằng **Playwright** chạy trên Google Chrome cục bộ qua script `.local-test/test-giao-dien.js`.

### Bảng kết quả kiểm chứng thực tế (Nguồn: `.local-test/baseline-4.md`)

| Tiêu chuẩn kiểm tra | Tiêu chí kỹ thuật | Kết quả 5 trang TV5 (50 lượt) | Kết quả trang TV1-TV4 (40 lượt) |
|:---|:---|:---:|:---:|
| **B1 (Không tràn ngang)** | `scrollWidth <= innerWidth` | **0 lỗi (ĐẠT)** | 2 lỗi trên `tasks.html` (375px) |
| **B6 (Màu sắc)** | Không còn màu xanh Bootstrap `#0d6efd` | **0 lỗi (ĐẠT)** | **0 lỗi (ĐẠT)** |
| **B9 (Nhất quán Navbar)** | Đồng bộ DOM, logo ô vuông nâu, chữ serif | **0 lỗi (ĐẠT)** | 10 lỗi (chưa gọi `renderNavbar()`) |
| **B10 (Không Emoji)** | Thay thế bằng icon SVG tông màu nâu | **0 lỗi (ĐẠT)** | 20 lỗi (còn emoji 📋, 🟢...) |
| **B11 (Bố cục & Cuộn)** | Cách navbar >= 24px; login không cuộn dọc | **0 lỗi (ĐẠT)** | **0 lỗi (ĐẠT)** |
| **B12 (Độ Gọn)** | Tối đa 2 họ font, 3 border-radius, 1 nút chính | **0 lỗi (ĐẠT)** | 10 lỗi |
| **B13 (Cân đối)** | Căn giữa lệch <= 2px, 2 cột lệch <= 24px | **0 lỗi (ĐẠT)** | **0 lỗi (ĐẠT)** |

*(5 trang của TV5 đạt trọn vẹn 50/50 lượt kiểm tra không phát hiện bất kỳ lỗi nào).*

---

## 8. HIỆN TRẠNG VÀ CÁC THÀNH PHẦN CHỜ TÍCH HỢP

Nhằm đảm bảo tính trung thực kỹ thuật và bám sát tiến độ dự án, các nội dung sau được đánh dấu trạng thái chờ:
- `[CHỜ code đóng băng]` Luồng đăng nhập thật và cấp phát token JWT từ API Backend của TV2.
- `[CHỜ code đóng băng]` Tích hợp dữ liệu API thật trên giao diện Quản lý công việc (`tasks.html`) của TV3.
- `[CHỜ code đóng băng]` Tích hợp dữ liệu API thật trên giao diện Phân ca trực (`shifts.html`) của TV1.
- `[CHỜ code đóng băng]` Ảnh chụp màn hình nghiệm thu thực tế toàn diện của các trang nghiệp vụ sau khi đóng băng mã nguồn.
- `[CHỜ code đóng băng]` Ghép nối báo cáo tổng thể, slide thuyết trình 12 trang và video demo vận hành.

---

## 9. TÍNH NĂNG MỞ RỘNG: VIỆC CỦA TÔI & HUY HIỆU QUÁ HẠN (`[TV5-X1]`)

- **Mục đích nghiệp vụ:** Cho phép nhân viên theo dõi riêng các công việc được giao cho chính mình tại trang `my-tasks.html`. Đồng thời, hiển thị trực quan huy hiệu đỏ `#overdueBadge` trên thanh điều hướng Navbar với số lượng việc quá hạn theo thời gian thực để cảnh báo nhân viên xử lý gấp.
- **Đối tượng sử dụng:** Tất cả nhân viên và Admin đã đăng nhập vào hệ thống.
- **Luồng xử lý (Frontend → API → CSDL):**
  1. Khi tải trang bất kỳ, `ui.js` gọi hàm `updateOverdueBadge()`: thực hiện `GET /api/tasks?assigneeId=me&overdue=1&pageSize=1` để lấy `pagination.total`. Nếu > 0, huy hiệu đỏ cạnh liên kết 'Việc của tôi' hiển thị số lượng; nếu = 0 hoặc lỗi, huy hiệu ẩn tự động.
  2. Tại `my-tasks.html`, script `my-tasks.js` gọi `GET /api/tasks?assigneeId=me&status=&overdue=` để tải danh sách công việc cá nhân.
  3. Bảng hỗ trợ lọc theo trạng thái, checkbox "Chỉ việc quá hạn", và phân trang chuẩn `renderPagination()`.
  4. Người dùng bấm chuyển trạng thái `Pending` -> `InProgress` -> `Done` qua `PATCH /api/tasks/:id/status`. Sau mỗi lần cập nhật, trang tải lại và tự động kích hoạt `updateOverdueBadge()` để giảm số lượng quá hạn.
- **File cài đặt:** `public/my-tasks.html`, `public/assets/js/my-tasks.js`, `public/assets/js/ui.js`, `public/assets/css/style.css`, `docs/ra-soat-giao-dien.md`.

---

## 10. TÍNH NĂNG MỞ RỘNG: POS & SƠ ĐỒ BÀN (`[TV5-X9]`)

- **Mục đích nghiệp vụ:** Xây dựng hệ thống bán hàng tại bàn (Point of Sale) trực quan dành cho quán cà phê. Quản lý trạng thái bàn (Trống / Đang có khách), mở đơn gọi món, tùy chỉnh số lượng món, tính tiền chuẩn xác tại server, thanh toán hóa đơn và tự động tích điểm cho khách hàng thành viên.
- **Đối tượng sử dụng:**
  - **Staff:** Xem sơ đồ bàn, mở đơn phục vụ bàn, chọn món từ menu, tăng/giảm món, thanh toán hóa đơn hoặc hủy đơn hàng.
  - **Admin:** Toàn quyền sử dụng POS, đồng thời có modal quản lý sơ đồ bàn (Thêm/Sửa/Xóa bàn) và thực đơn món (Thêm/Sửa/Xóa món).
- **Luồng xử lý (Frontend → API → CSDL):**
  1. Sơ đồ bàn hiển thị danh sách các bàn từ `GET /api/pos/tables`. Bàn có đơn `Open` mang trạng thái `Occupied` (màu cam), bàn trống mang trạng thái `Free` (màu xanh).
  2. Bấm bàn trống mở đơn qua `POST /api/pos/orders` `{ tableId, customerId? }`. Server ràng buộc chỉ mục `UX_Orders_OpenTable` đảm bảo mỗi bàn chỉ có duy nhất 1 đơn `Open`.
  3. Gọi món qua `POST /api/pos/orders/:id/items`. Đơn giá `UnitPrice` được server chốt theo giá của `MenuItems.Price` tại thời điểm gọi món.
  4. Thanh toán qua `POST /api/pos/orders/:id/pay`. Server thực thi trong một transaction: tính lại tổng tiền `Total = SUM(Quantity * UnitPrice)`, cập nhật trạng thái `Paid` và thời điểm `PaidAt`, đồng thời tự động tích điểm cho khách hàng (10.000đ = 1 điểm) nếu có `CustomerId`.
- **Bảng CSDL liên quan:** `dbo.DiningTables`, `dbo.MenuItems`, `dbo.Orders`, `dbo.OrderItems` trong `database/schema-mo-rong.sql`.
- **File cài đặt:** `server/routes/pos.js`, `public/pos.html`, `public/assets/js/pos.js`, `public/assets/css/style.css`.

---

## 11. TÁC VỤ TÍCH HỢP NAVBAR MỞ RỘNG (`[TV5-XU]`)

- **Mục đích:** Tích hợp liên kết điều hướng đồng bộ cho tất cả các trang mở rộng vào Navbar chung mà không làm vỡ giao diện hay tràn ngang màn hình trên thiết bị di động.
- **Giải pháp thực hiện:**
  - Đặt liên kết 'Việc của tôi' ngay cạnh 'Công việc'.
  - Gom các trang: Lịch phân ca (`schedule.html`), Quản lý kho (`inventory.html`), Khách hàng (`customers.html`), POS Bán hàng (`pos.html`) và Mẫu công việc (`templates.html` - chỉ Admin) vào menu dropdown **"Mở rộng"**.
  - Kiểm tra số đo thực tế trên Google Chrome bằng Playwright: `scrollWidth <= innerWidth` tại 375px, 768px và 1200px (0px tràn ngang).

---

## 12. BẢNG TEST MỞ RỘNG (`[TV5-X1]` & `[TV5-X9]`)

| Mã | Chức năng | Các bước thực hiện | Kết quả mong đợi | Kết quả thực tế | Đạt? |
|:---|:---|:---|:---|:---|:---:|
| **TC-X1-01** | Lọc việc cá nhân & Huy hiệu quá hạn | Đăng nhập tài khoản Staff, mở trang `my-tasks.html` | Hiển thị các công việc được giao cho nhân viên; huy hiệu `#overdueBadge` trên navbar hiện đúng số việc quá hạn | Hiển thị chính xác việc của tôi và số đếm quá hạn | Đạt |
| **TC-X1-02** | Chuyển trạng thái việc và giảm huy hiệu | Bấm "Hoàn thành" một việc quá hạn trong `my-tasks.html` | Việc chuyển sang `Done`, huy hiệu `#overdueBadge` tự động giảm đi 1 | Trạng thái chuyển Done, huy hiệu giảm lập tức | Đạt |
| **TC-X1-03** | Lọc chỉ việc quá hạn | Bật checkbox "Chỉ việc quá hạn" trên `my-tasks.html` | Danh sách chỉ còn các công việc có Deadline < hôm nay và chưa xong | Lọc chính xác 100% | Đạt |
| **TC-X9-01** | Xem sơ đồ bàn và thực đơn | Truy cập `pos.html`, quan sát danh sách bàn và món nước | Bàn trống màu xanh, bàn có khách màu cam kèm tổng tiền tạm tính | Hiển thị trực quan, đúng màu sắc | Đạt |
| **TC-X9-02** | Mở đơn bàn và gọi món | Chọn Bàn 1 trống, bấm mở đơn, chọn 2 món nước trong menu | Mở đơn thành công, Bàn 1 chuyển sang Occupied, hiển thị danh sách món và tổng tiền | Đơn mở thành công, tính tiền chính xác | Đạt |
| **TC-X9-03** | Chặn mở 2 đơn trên cùng 1 bàn | Gửi lệnh `POST /api/pos/orders` vào bàn đang có đơn Open | Server chặn bằng mã lỗi `409 Conflict` | Trả về 409 Conflict chuẩn hợp đồng | Đạt |
| **TC-X9-04** | Thanh toán hóa đơn và giải phóng bàn | Bấm "Thanh toán hóa đơn" tại bàn đang có khách | Server tính lại Total tại server, chuyển đơn thành Paid, bàn quay về Free | Bàn trống ngay sau khi thanh toán, CSDL cập nhật Total | Đạt |
| **TC-X9-05** | Thanh toán kèm tích điểm cho khách | Mở đơn bàn gắn SĐT khách hàng, gọi món 150.000đ, thanh toán | Đơn thanh toán thành công, khách hàng được cộng thêm 15 điểm | Điểm khách hàng tăng chính xác | Đạt |
| **TC-X9-06** | Hủy đơn hàng đang mở | Bấm "Hủy đơn hàng này" có xác nhận confirm | Đơn chuyển trạng thái `Cancelled`, bàn được giải phóng về Free | Đơn hủy thành công, bàn trở lại trống | Đạt |

---

## 13. DANH SÁCH ẢNH CHỤP CẦN CÓ

1. `my_tasks_desktop.png`: Trang Việc của tôi trên Desktop với bảng danh sách và huy hiệu quá hạn đỏ trên Navbar.
2. `my_tasks_mobile_375.png`: Trang Việc của tôi hiển thị dạng thẻ `.table-cards` trên màn hình 375px.
3. `pos_tables_grid.png`: Sơ đồ bàn POS hiển thị trực quan các bàn trống (màu xanh) và có khách (màu cam).
4. `pos_order_panel.png`: Bảng gọi món POS hiển thị thực đơn, danh sách món đã chọn và nút thanh toán.
5. `pos_payment_receipt.png`: Hóa đơn sau khi thanh toán thành công và thông báo cộng điểm hội viên.
6. `navbar_dropdown_extra.png`: Menu dropdown "Mở rộng" mở mượt mà trên thanh điều hướng.
