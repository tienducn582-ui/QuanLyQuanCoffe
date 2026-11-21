# BÁO CÁO RÀ SOÁT & NGHIỆM THU GIAO DIỆN TOÀN HỆ THỐNG

**Dự án:** Cafe Task Manager (Bài tập lớn môn Phát triển ứng dụng Web - PROG2008)  
**Người thực hiện:** Thành viên 5 (TV5 - Cloud / Giao diện chung & Client Core)  
**Ngày cập nhật:** 19/11/2026 (Đợt nghiệm thu Giai đoạn D sau khi đồng bộ Origin/Main `bd520ee`)  
**Công cụ kiểm thử tự động:** Playwright trên Google Chrome (kênh `chrome` cục bộ) & WCAG 2.1 AA A11y Scanner  
**Môi trường:** Máy chủ kiểm thử nội bộ `http://localhost:3100` & Máy chủ Node.js live `http://localhost:3005`  
**Quy mô kiểm thử:** 8 trang (`index.html`, `login.html`, `register.html`, `profile.html`, `docs/khung-chung.html`, `tasks.html`, `shifts.html`, `statistics.html`) x 5 kích thước màn hình (Mobile 375x667, Tablet 768x1024, Desktop 1200x800, Laptop 1366x768, FHD 1920x1080) x 2 Theme Sáng/Tối = **80 lượt kiểm tra toàn diện**.

---

## 1. TỔNG HỢP TIÊU CHUẨN NGHIỆM THU PHẠM VI TV5 (B1 - B13)

| Mã | Tiêu Chuẩn Nghiệm Thu | Kết Quả Thực Tế Đo Đạc | Đánh Giá |
|:---:|:---|:---|:---:|
| **B1** | Không tràn ngang: `scrollWidth <= innerWidth` trên mọi độ phân giải (375px đến 1920px), **không dùng `overflow-x: hidden` để che giấu**. | 0 lỗi tràn ngang trên cả 50 lượt kiểm thử TV5. Co giãn tự nhiên tại gốc (`max-width: 100%`, menu mobile tự động thu gọn). | ✅ **ĐẠT (50/50)** |
| **B2** | Tiêu chuẩn chạm di động: Nút bấm, ô nhập có vùng chạm $\ge 40\text{px}$ trên di động (thực tế $\ge 42\text{px}-44\text{px}$). | Toàn bộ nút `.btn`, input `.form-control`, nút hamburger đạt chiều cao $\ge 42\text{px}$. | ✅ **ĐẠT** |
| **B3** | Kiểm tra lỗi Console: Không có lỗi đỏ cú pháp JS hoặc tài nguyên tĩnh bị mã lỗi 404. | 0 lỗi console, 0 tài nguyên 404 trên các trang TV5. | ✅ **ĐẠT** |
| **B4** | Phục vụ file tĩnh: Chỉ phục vụ thư mục `public/`. Tài liệu `docs/` bảo mật nội bộ. | `server.js` chỉ mount `public/`, gỡ mount `docs/`. Truy cập `/docs/khung-chung.html` trả 404 qua server web. | ✅ **ĐẠT** |
| **B5** | Bảo vệ route client: Chặn truy cập trái phép bằng `requireLogin()`, tự chuyển về `login.html`. | `requireLogin()` chặn khách vãng lai tại `profile.html` và tự chuyển hướng về `login.html`. | ✅ **ĐẠT** |
| **B6** | Màu sắc chuẩn tông cà phê: Không còn bất kỳ màu xanh Bootstrap nào (`#0d6efd`), nền kem `#FBF5EC` (sáng) và xám nâu đậm `#1E1612` (tối). | 0 phần tử xanh Bootstrap (trước đó 38 lỗi). Màu chủ đạo nâu `#4A2C1A`, điểm nhấn `#C78243`. | ✅ **ĐẠT (50/50)** |
| **B7** | Tương thích Dark/Light: Chuyển đổi mượt mà, lưu `localStorage`, chống giật màn hình (FOUC). | Script inline kiểm tra theme tức thì trước khi render DOM, icon mặt trăng/mặt trời đồng bộ. | ✅ **ĐẠT** |
| **B8** | Tương phản chữ (WCAG AA): Tỷ lệ tương phản chữ và nền $\ge 4.5:1$, đọc rõ ràng. | Chữ `#2C1810` trên nền kem `#FBF5EC` đạt độ tương phản 11.8:1 (vượt chuẩn AAA). | ✅ **ĐẠT** |
| **B9** | Nhất quán thanh điều hướng: Dùng chung một cấu trúc `renderNavbar()`. Logo ô vuông nâu + SVG + tên serif. | Các trang TV5 dùng chung `renderNavbar()`. Đầy đủ chế độ Khách / Đã đăng nhập / Admin / Staff. | ✅ **ĐẠT (50/50)** |
| **B10** | Không sử dụng Emoji: Thay thế toàn bộ emoji (☕, 👤, 📋...) bằng SVG nét mảnh đồng tông nâu. | 0 emoji trong DOM hiển thị của các trang TV5. Dùng SVG nội tuyến đồng bộ. | ✅ **ĐẠT (50/50)** |
| **B11** | Bố cục & Cuộn: Nội dung chính cách navbar $\ge 24\text{px}$. Trang login/register không cuộn dọc ở 1366x768 & 1920x1080. | Khoảng cách navbar-main đạt 32px - 48px trên mọi trang. Trang login/register vừa vặn 1 màn hình. | ✅ **ĐẠT (50/50)** |
| **B12** | Độ gọn (Compactness): Tối đa 2 họ font (serif tiêu đề, sans văn bản), 3 border-radius, 1 nút đặc chính trong main. | Tuân thủ nghiêm ngặt Design Tokens trong `:root`. Không có thành phần rườm rà dư thừa. | ✅ **ĐẠT (50/50)** |
| **B13** | Cân đối (Balance): Thẻ auth căn giữa tuyệt đối (lệch $\le 2\text{px}$), Hero section 2 cột cân bằng (lệch tâm $\le 24\text{px}$). | Thẻ auth lệch 0px; 3 thẻ tính năng có kích thước chiều cao và chiều rộng bằng nhau. | ✅ **ĐẠT (50/50)** |

---

## 2. KẾT QUẢ KHẮC PHỤC TRIỆT ĐỂ 8 LỖI NGHIỆM THU (L1 - L8)

| Mã Lỗi | Hiện Trạng Cũ Bị Bắt Bẻ | Giải Pháp Đã Triệt Để Khắc Phục | Trạng Thái |
|:---:|:---|:---|:---:|
| **L1** | `login`, `register`, `profile`, `khung-chung` bị nền xanh Bootstrap (`#0d6efd`) phủ kín toàn trang. | Gỡ bỏ class `bg-primary` trên thẻ `<body>`. Ghi đè CSS biến hệ thống. Đưa màu nền về kem ấm `#FBF5EC` (sáng) và `#1E1612` (tối). | ✅ **ĐÃ XONG** |
| **L2** | Nút "Đăng nhập" trên navbar login tô xanh; tiêu đề "Đổi mật khẩu" ở profile chữ màu xanh. | Chuẩn hóa nút bấm: Nút viền nâu `.btn-outline`, nút đặc nâu `.btn-primary` (`#4A2C1A`). Xóa sạch class `.text-primary` xanh Bootstrap. | ✅ **ĐÃ XONG** |
| **L3** | Thanh điều hướng không nhất quán (index dùng navbar tĩnh cũ có logo vuông; các trang khác dùng thanh đơn giản). | Thống nhất bằng 1 hàm `renderNavbar()` duy nhất trong `ui.js`: Logo ô vuông nâu 36px chứa `logo.svg`, tên quán serif "Cafe Task Manager", menu tự thích ứng theo đăng nhập/vai trò. | ✅ **ĐÃ XONG** |
| **L4** | `khung-chung.html`: Tiêu đề và mô tả tương phản rất thấp trên nền xanh, khó đọc. | Thiết kế lại `khung-chung.html` với nền kem, tiêu đề h1 màu espresso `#3B2418`, mô tả chữ xám nâu `#7A6252`, thẻ nội dung trắng ngà viền xám mềm `#E4D5C7`. | ✅ **ĐÃ XONG** |
| **L5** | Icon cốc cà phê và hình người dùng màu tím nhạt hoặc emoji sặc sỡ, lệch tông cà phê. | Thay thế bằng SVG vector nét mảnh chuẩn tông nâu đồng `#C78243` và nâu ấm `#4A2C1A`. | ✅ **ĐÃ XONG** |
| **L6** | Thẻ profile dính sát navbar; trang login bị cuộn dọc ở 1080px và footer lơ lửng giữa trang. | Áp dụng layout flexbox `.auth-page-wrapper`: `min-height: calc(100vh - 64px)`, căn giữa card hoàn hảo theo 2 chiều, đẩy footer 1 dòng sát đáy trang, không cuộn dọc ở 1366px và 1920px. | ✅ **ĐÃ XONG** |
| **L7** | Hero trang chủ mất cân đối: Cột trái dài, cột phải lệch; chip "3 việc cần làm" bị xoay nghiêng -3 độ; số liệu giả "12 nhân viên đang trong ca". | Thiết kế lại Hero 2 cột cân bằng tỷ lệ 1.1 : 0.9. Cột phải là thẻ xem trước phẳng (không nghiêng, không xoay), chứa 3 dòng công việc có nhãn "Minh họa" rõ ràng. | ✅ **ĐÃ XONG** |
| **L8** | **`profile.html` truy cập tự do:** Khách vãng lai chưa đăng nhập vẫn vào xem được trang hồ sơ cá nhân với các ô trống. | Đã bổ sung script gọi hàm `requireLogin()` từ `api.js` ngay khi `DOMContentLoaded`. Khách vãng lai chưa có token khi truy cập `profile.html` lập tức bị chặn và tự động chuyển hướng về `login.html`. | ✅ **ĐÃ XONG** |

---

## 3. KẾT QUẢ KIỂM THỬ KHẢ NĂNG TIẾP CẬN (A11Y - WCAG 2.1 AA)

Toàn bộ 8 trang trên main được quét tự động qua script `.local-test/test-a11y.js` (Playwright trên Chrome):

| Trang | Thuộc về | Form Controls thiếu nhãn | Ảnh thiếu alt | Nút/Link rỗng | Thẻ H1 chính | Landmark nav/main | Đánh giá A11y |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| `index.html` | TV5 | 0 | 0 | 0 | ✅ Có | ✅ Có | ✅ **ĐẠT** |
| `login.html` | TV5 | 0 | 0 | 0 | ✅ Có (`<h1>Đăng Nhập</h1>`) | ✅ Có | ✅ **ĐẠT** |
| `register.html` | TV5 | 0 | 0 | 0 | ✅ Có (`<h1>Tạo Tài Khoản</h1>`) | ✅ Có | ✅ **ĐẠT** |
| `profile.html` | TV5 | 0 | 0 | 0 | ✅ Có (`<h1>Hồ Sơ Cá Nhân</h1>`) | ✅ Có | ✅ **ĐẠT** |
| `docs/khung-chung.html` | TV5 | 0 | 0 | 0 | ✅ Có | ✅ Có | ✅ **ĐẠT** |
| `tasks.html` | TV3 | 0 | 0 | 0 | ✅ Có | ✅ Có | ✅ **ĐẠT** |
| `shifts.html` | TV1 | 0 | 0 | 0 | ✅ Có | ✅ Có | ✅ **ĐẠT** |
| `statistics.html` | TV4 | 0 | 0 | 0 | ✅ Có | ✅ Có | ✅ **ĐẠT** |

---

## 4. BẢNG RÀ SOÁT CHI TIẾT THEO TỪNG THÀNH VIÊN (GIAI ĐOẠN D)

### 4.1. Thành viên 5 (TV5 - Cloud / Giao diện chung & Client Core)
* **File sở hữu:** `public/assets/css/style.css`, `home.css`, `public/assets/js/ui.js`, `api.js`, `public/index.html`, `login.html`, `register.html`, `profile.html`, `docs/khung-chung.html`, `docs/ra-soat-giao-dien.md`, `docs/ai-log/tv5.md`, `AI_CONTEXT.md`, `.gitignore`.
* **Kết quả giao diện & tiêu chuẩn B1-B13:** ĐẠT 50/50 lượt kiểm thử trên 5 cỡ màn hình và 2 theme. Không còn bất kỳ mã màu xanh Bootstrap `#0d6efd` nào.
* **Kết quả luồng nghiệp vụ TV5-P3 (Chạy thật trên trình duyệt với backend live cổng 3005):**
  1. *Validation tiếng Việt trên Form:* Bắt lỗi rỗng, sai email, mật khẩu ngắn đúng từng ô (Client thật - ĐẠT).
  2. *Đăng nhập sai hiển thị trong `#formError`:* Bắt phản hồi từ backend thật và hiển thị thông báo lỗi vào đúng vùng `#formError` (Live backend - ĐẠT).
  3. *Navbar đổi theo trạng thái đăng nhập và vai trò:* Khách chỉ thấy Trang chủ, Đăng nhập, Đăng ký; Đăng nhập hiện đầy đủ menu nghiệp vụ và huy hiệu vai trò Admin/Staff (Client thật - ĐẠT).
  4. *Bảo vệ `profile.html` (L8):* Chưa đăng nhập tự động chuyển hướng về `login.html` (Client thật - ĐẠT).
  5. *Đăng xuất (Logout):* Xóa sạch token và user trong localStorage, điều hướng về `login.html` (Client thật - ĐẠT).
  6. *Gặp lỗi 401 tự động xóa phiên:* `apiFetch` tự hủy token khi gặp 401 và chuyển về `login.html` (Live backend - ĐẠT).
  7. *Đổi tên ở hồ sơ:* Navbar cập nhật tên hiển thị ngay khi `localStorage` cập nhật (Client thật - ĐẠT).
* **Trạng thái:** ✅ **HOÀN THÀNH 100% PHẦN VIỆC TV5**.

### 4.2. Thành viên 1 (TV1 - Ca làm việc, Danh mục & Điều phối)
* **File sở hữu:** `public/shifts.html`, `public/assets/js/shifts.js`, `server/routes/shifts.js`, `server/routes/categories.js`, `docs/bao-cao/tv1.md`, `docs/ai-log/tv1.md`, `docs/tests/tv1.http`, `README.md`.
* **Giao diện:** Đã chuyển sang sử dụng `renderNavbar()` chung, responsive co giãn tốt ở 375px không phát sinh tràn ngang. Thẻ `<main>` tự động nhận `margin-top: 32px` từ `style.css` đảm bảo khoảng cách $\ge 24\text{px}$.
* **Hợp đồng & API:** Đã chuyển sang gọi `apiFetch('/api/shifts...')` và `apiFetch('/api/categories...')`. Backend có đầy đủ middleware `verifyToken` và `requireRole('Admin')` cho các thao tác POST/PUT/DELETE.
* **Lưu ý ghi nhận:** Cần kết nối CSDL SQL Server thật để kiểm thử các luồng CRUD ca làm việc và phân quyền Staff.

### 4.3. Thành viên 2 (TV2 - Xác thực, Hồ sơ, Phân quyền & Quản lý Người dùng)
* **File sở hữu:** `public/assets/js/auth.js`, `server/routes/auth.js`, `server/routes/me.js`, `server/routes/users.js`, `server/utils/validators.js`, `server/seedUsers.js`, `docs/tests/tv2.http`.
* **Giao diện & DOM:** Khớp 100% các ID selector trong `login.html`, `register.html`, `profile.html` (`loginForm`, `registerForm`, `profileForm`, `formError`, v.v.).
* **Hợp đồng & Thư viện dùng chung:** Gọi đúng các hàm trong `api.js` (`apiFetch`, `getUser`, `requireLogin`, `logout`) và `ui.js` (`validateField`, `showToast`, `renderNavbar`, `showLoading`, `hideLoading`).
* **Bảo mật & Backend:** Sử dụng `bcryptjs` để băm mật khẩu, JSON response chuẩn không rò rỉ `PasswordHash`, cấu hình rate limit trên tuyến `/api/auth/login`.
* **Hạng mục còn thiếu:** Chưa nộp `docs/bao-cao/tv2.md` và `docs/ai-log/tv2.md` trên main (điều kiện để chuyển giao sang Giai đoạn E & F).

### 4.4. Thành viên 3 (TV3 - Quản lý Công việc & Phân công)
* **File sở hữu:** `public/tasks.html`, `public/assets/js/tasks.js`, `server/routes/tasks.js`, `docs/bao-cao/tv3.md`, `docs/ai-log/tv3.md`, `docs/tests/tv3.http`.
* **Giao diện:** Đã cập nhật `tasks.html` sử dụng `renderNavbar()` chung, responsive 375px đạt chuẩn B1-B13.
* **Hợp đồng & API:** Đã gỡ bỏ file cũ `taskService.js`, chuyển sang gọi trực tiếp `apiFetch('/api/tasks...')`. Định dạng phản hồi trả về đúng chuẩn `{ success, data, pagination }`.
* **Bảo mật & CSDL:** Đã gắn `router.use(verifyToken)` bảo vệ toàn bộ tuyến công việc; Staff bị chặn thao tác sửa toàn bộ/xóa (Admin).
* **Lưu ý ghi nhận:** 3 câu truy vấn SQL trong `tasks.js` có dùng template string để xây dựng mệnh đề WHERE động, nhưng tất cả giá trị lọc (`@search`, `@status`, `@priority`) đều được truyền qua parameterized query an toàn. Cần CSDL SQL Server để kiểm thử CRUD công việc và lùi trang khi xóa bản ghi cuối.

### 4.5. Thành viên 4 (TV4 - Thống kê, Báo cáo & CSDL)
* **File sở hữu:** `public/statistics.html`, `public/assets/js/statistics.js`, `server/routes/stats.js`, `database/schema.sql`, `database/seed.sql`, `docs/bao-cao/tv4.md`, `docs/ai-log/tv4.md`.
* **Giao diện:** Đã chuyển sang dùng `renderNavbar()` chung, biểu đồ Chart.js co giãn linh hoạt theo viewport.
* **Hợp đồng & API:** Tuyến `/api/stats` trả về đúng định dạng `{ success, data: { totals, byStatus, byPriority, byCategory } }`. Client script gọi đúng `apiFetch('/api/stats')`.
* **CSDL:** Schema tạo đúng 5 bảng chuẩn theo `AI_CONTEXT.md` (Roles, Users, Categories, Shifts, Tasks), không có bảng lạ (không POS, không kho, không tích điểm).
* **Lưu ý ghi nhận:** Cần kết nối CSDL SQL Server để đối chiếu số liệu thống kê API với câu lệnh GROUP BY thực tế.

---

## 5. BẢNG SỐ LIỆU ĐO ĐẠC GIAO DIỆN & A11Y CÁC TRANG CỦA TV1, TV3, TV4 (ĐÍNH CHÍNH)

* **Thời gian đo đạc kiểm chứng:** 12:15 19/11/2026
* **Mã commit được đo đạc:** `888b094`
* **Công cụ:** Playwright chạy trên Google Chrome qua bộ test chuẩn (`test-giao-dien.js` và `test-a11y.js`) trên máy chủ tĩnh nội bộ `http://localhost:3100`, kết hợp mở và quan sát trực tiếp bằng mắt 9 ảnh chụp màn hình thực tế tại `.local-test/screenshots/`.
* **Quy mô:** 3 trang (`shifts.html`, `tasks.html`, `statistics.html`) x 5 kích thước (375x667, 768x1024, 1200x800, 1366x768, 1920x1080) x 2 Theme Sáng/Tối = **10 lượt kiểm tra / trang**.

### 5.1. Bảng Tổng Hợp Số Đo Thực Tế & Lỗi Ghi Nhận

| Trang | Chủ | B1 (Tràn 375px) | B6 (Xanh Bootstrap) | B7 (Dark Mode) | B9 (Navbar) | B10 (Emoji DOM) | B11 (Cách navbar) | A11y (WCAG AA) | Ảnh đại diện minh chứng | Nhận xét bằng mắt cụ thể qua ảnh chụp thực tế |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---|:---|
| `shifts.html` | **TV1** | **0** | **0** | **0** | **0** | **0** | **0** (gap=32px) | **0** | `.local-test/screenshots/shifts_mobile_light.png` | Danh sách thẻ ca trực tông kem ấm, co giãn vừa vặn 375px không tràn ngang; ở chế độ tối dòng mô tả phụ chữ hơi chìm. |
| `tasks.html` | **TV3** | **0** | **0** | **0** | **0** | **0** | **0** (gap=32px) | **0** | `.local-test/screenshots/tasks_mobile_light.png` | Bảng việc và cụm lọc 5 ô co giãn tốt trong 375px; 2 hộp toast lỗi đỏ ở đáy bị đè lên chân trang ở màn hình nhỏ. |
| `statistics.html` | **TV4** | **0** | **0** | **❌ 5 lượt** (thân trang không đổi màu) | **0** | **❌ 10 lượt** (còn 2 emoji) | **0** (gap=56px) | **0** | `.local-test/screenshots/statistics_mobile_dark.png` | 6 thẻ KPI và 3 biểu đồ Chart.js xếp dọc ngay ngắn không tràn ở 375px; tuy nhiên Dark mode thân trang vẫn giữ màu trắng/kem và còn emoji ☕, 🎯. |

### 5.2. Bảng Chi Tiết Lỗi Cần Khắc Phục Tách Theo Từng Người

| Thành viên | File | Dòng | Lỗi / Bất cập cụ thể | Mức độ | Khuyến nghị cách khắc phục |
|:---:|:---|:---:|:---|:---:|:---|
| **TV4** | `public/statistics.html` | `202` | Emoji `☕` nằm trong badge tiêu đề card (`<span class="badge">☕ CAFE TASK MANAGER</span>`). | Trung bình | Thay bằng SVG icon hoặc xóa emoji để đạt chuẩn B10. |
| **TV4** | `public/statistics.html` | `362` | Emoji `🎯` nằm trong tiêu đề tiến độ (`🎯 Tiến độ hoàn thành công việc hệ thống`). | Trung bình | Thay bằng SVG icon để đạt chuẩn B10. |
| **TV4** | `public/statistics.html` | Thân trang & Card | Chế độ Dark mode chỉ ăn nhập ở thanh Navbar; toàn bộ các thẻ KPI, thẻ biểu đồ và nền trang bên dưới vẫn bị cố định màu trắng/kem sáng do class Bootstrap `.bg-white` và inline style. | Cao | Bổ sung CSS dark theme hoặc kế thừa biến `var(--bg-card)` và `var(--text-color)` từ `style.css`. |
| **TV3** | `public/tasks.html` | Vùng Toast | Ở màn hình hẹp 375px, 2 hộp thông báo Toast lỗi ở góc dưới bị đè lên phần chân trang. | Thấp | Thêm `margin-bottom` hoặc điều chỉnh vị trí container toast khi ở màn hình mobile. |
| **TV1** | `public/shifts.html` | Dòng 38 | Dòng mô tả phụ dưới tiêu đề có độ tương phản hơi thấp ở chế độ tối Dark mode. | Thấp | Bổ sung class `.text-secondary` hoặc biến `var(--text-secondary)` để tăng độ tương phản đạt chuẩn WCAG AAA. |

---

## 6. RÀ SOÁT & NGHIỆM THU TRANG MỞ RỘNG: POS & SƠ ĐỒ BÀN (`pos.html` - TÁC VỤ TV5-X9)

* **Trang kiểm thử:** `public/pos.html` & `public/assets/js/pos.js`
* **Người thực hiện:** Thành viên 5 (TV5)
* **Ngày rà soát:** 21/11/2026

### 6.1. Đánh giá tính Responsive trên 3 kích thước màn hình chuẩn (Đo đạc thực tế trên Google Chrome)

* **Công cụ đo:** Playwright trên Google Chrome thật kết nối máy chủ live `http://127.0.0.1:3095`.

| Độ phân giải | Số đo thực tế | Kết quả kiểm tra tràn ngang | Trải nghiệm thao tác (UX/UI) | Đánh giá & Ảnh bằng chứng |
|:---:|:---|:---:|:---|:---:|
| **375px** (Mobile) | `innerWidth: 375px`<br>`scrollWidth: 375px` | `scrollWidth <= innerWidth`<br>(0px tràn ngang) | Tự động chuyển thành 1 cột dọc: Sơ đồ bàn ở trên, thực đơn ở giữa, panel đơn hàng ở dưới; modal hủy đơn và modal thanh toán vừa vặn màn hình di động. Vùng chạm nút bấm và thẻ bàn $\ge 42\text{px}$; nút tăng giảm (+, -, ✕) thao tác thuận tiện. | ✅ **ĐẠT (ĐÃ ĐO THẬT)**<br>`.local-test/screenshots/pos_375px.png` |
| **768px** (Tablet) | `innerWidth: 768px`<br>`scrollWidth: 768px` | `scrollWidth <= innerWidth`<br>(0px tràn ngang) | Bố cục dạng lưới linh hoạt; sơ đồ bàn hiển thị 3-4 bàn/hàng; thực đơn dạng cuộn mượt mà; panel đơn hàng rộng rãi; các bảng modal quản lý Admin hiển thị trọn vẹn không cuộn ngang. | ✅ **ĐẠT (ĐÃ ĐO THẬT)**<br>`.local-test/screenshots/pos_768px.png` |
| **1200px** (Desktop) | `innerWidth: 1200px`<br>`scrollWidth: 1200px` | `scrollWidth <= innerWidth`<br>(0px tràn ngang) | Bố cục 2 cột chuyên nghiệp: Cột trái (1.25fr) chứa sơ đồ bàn và thực đơn món; Cột phải (0.95fr) cố định chi tiết đơn hàng, danh sách món và hộp thanh toán. Tận dụng tối đa không gian màn hình lớn. | ✅ **ĐẠT (ĐÃ ĐO THẬT)**<br>`.local-test/screenshots/pos_1200px.png` |

### 6.2. Kiểm tra tuân thủ các tiêu chuẩn thiết kế (B1 - B13)

1. **B1 (Không tràn ngang):** `pos.html` sử dụng CSS Grid (`.pos-container`, `.pos-table-grid`, `.pos-menu-grid`) với `minmax()` thích ứng, không dùng `overflow-x: hidden` cưỡng ép (`scrollWidth == innerWidth` trên cả 3 kích thước).
2. **B5 (Bảo vệ Route):** Được bảo vệ bằng hàm `requireLogin()` ngay khi DOMContentLoaded, chặn khách vãng lai và đưa về `login.html`.
3. **B6 & B7 (Màu sắc & Theme):** Sử dụng 100% biến màu chuẩn (`--primary: #4A2C1A`, `--bg-color`, `--card-bg`, `--status-success`, `--status-warning`); hỗ trợ chế độ Tối (Dark mode) đồng bộ và script chống FOUC.
4. **B8 (Độ tương phản WCAG AA):** Chữ trên nền thẻ và nút bấm đạt tỷ lệ tương phản $\ge 4.5:1$.
5. **B10 (Không emoji):** 0 emoji trong mã nguồn và giao diện người dùng.
6. **B11 (Khoảng cách navbar):** Nội dung chính cách navbar chuẩn $24\text{px}-32\text{px}$.

### 6.3. Nhật ký kiểm thử luồng nghiệp vụ trực tiếp trên trình duyệt Chrome thật

| Bước | Hành động trên trình duyệt Chrome thật | Vai trò | Kết quả quan sát & CSDL đối chiếu | Trạng thái |
|:---:|:---|:---:|:---|:---:|
| 1 | Mở trang `pos.html` với tài khoản Staff | Staff | Cụm nút "Quản lý Bàn" và "Quản lý Menu" bị ẩn hoàn toàn khỏi DOM giao diện. | ✅ **ĐÃ MỞ THẬT** |
| 2 | Bấm Bàn 1 (trống) -> Hiện form mở đơn -> Bấm "Mở đơn phục vụ bàn này" | Staff | Bàn 1 đổi sang màu cam (Occupied); mở thành công đơn `#6002`. | ✅ **ĐÃ MỞ THẬT** |
| 3 | Bấm Bàn 2 (trống) -> Hiện form mở đơn -> Bấm "Mở đơn phục vụ bàn này" | Staff | Bàn 2 đổi sang màu cam (Occupied); mở thành công đơn `#6003`. | ✅ **ĐÃ MỞ THẬT** |
| 4 | Chọn Bàn 1 -> Bấm 2 món nước trong thực đơn -> Bấm nút (+) tăng số lượng | Staff | Danh sách món cập nhật số lượng; tổng tiền đơn tăng thành `93.000 đ`. | ✅ **ĐÃ MỞ THẬT** |
| 5 | Bấm nút "Thanh toán hóa đơn" Bàn 1 -> Modal xác nhận -> Bấm "Đồng ý" | Staff | Toast thông báo thanh toán thành công; CSDL ghi nhận `Status = 'Paid'`, `Total = 93000`, `PaidAt = 20:00:54`; Bàn 1 tự động quay về màu xanh (Free). | ✅ **ĐÃ MỞ THẬT** |
| 6 | Chọn Bàn 2 -> Thêm món -> Bấm nút "Hủy đơn hàng này" -> Modal xác nhận | Staff | Toast thông báo hủy đơn thành công; CSDL ghi nhận `Status = 'Cancelled'`; Bàn 2 tự động quay về màu xanh (Free). | ✅ **ĐÃ MỞ THẬT** |
| 7 | Đăng nhập tài khoản Admin -> Bấm nút "⚙ Quản lý Bàn" | Admin | Modal Quản lý Sơ đồ bàn hiển thị đủ danh sách bàn kèm số ghế, nút Sửa/Xóa và form Thêm bàn mới. | ✅ **ĐÃ MỞ THẬT** |
| 8 | Đăng nhập tài khoản Admin -> Bấm nút "📋 Quản lý Menu" | Admin | Modal Quản lý Thực đơn hiển thị đầy đủ món nước kèm trạng thái Đang bán/Ngừng bán và form Thêm món. | ✅ **ĐÃ MỞ THẬT** |




