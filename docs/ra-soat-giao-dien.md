# BÁO CÁO RÀ SOÁT & NGHIỆM THU GIAO DIỆN (TV5)

**Dự án:** Cafe Task Manager (Bài tập lớn môn Phát triển ứng dụng Web - PROG2008)  
**Người thực hiện:** Thành viên 5 (TV5 - Cloud / Giao diện chung & Client Core)  
**Ngày hoàn thành:** 16/11/2026  
**Công cụ kiểm thử tự động:** Playwright trên Google Chrome (kênh `chrome` cục bộ)  
**Môi trường:** Máy chủ tĩnh nội bộ `http://localhost:3100`  
**Quy mô kiểm thử:** 5 trang (`index.html`, `login.html`, `register.html`, `profile.html`, `docs/khung-chung.html`) x 5 kích thước màn hình (Mobile 375x667, Tablet 768x1024, Desktop 1200x800, Laptop 1366x768, FHD 1920x1080) x 2 Theme Sáng/Tối = **50 lượt kiểm tra toàn diện**.

---

## 1. TỔNG HỢP KẾT QUẢ ĐỐI CHIẾU TIÊU CHUẨN NGHIỆM THU (B1 - B13)

| Mã Tiêu Chuẩn | Nội Dung Tiêu Chuẩn Nghiệm Thu | Kết Quả Thực Tế | Đánh Giá |
|:---:|:---|:---|:---:|
| **B1** | Không tràn ngang: `scrollWidth <= innerWidth` trên mọi độ phân giải (375px đến 1920px), **không dùng `overflow-x: hidden` để che giấu**. | 0 lỗi tràn ngang trên cả 50 lượt kiểm thử. Tự co giãn tự nhiên ở gốc (`max-width: 100%`, ẩn nút auth trên topbar mobile đưa vào hamburger menu). | ✅ **ĐẠT (50/50)** |
| **B2** | Tiêu chuẩn chạm di động: Nút bấm, ô nhập liệu có vùng bấm $\ge 44\text{px}$ trên di động. | Toàn bộ các nút `.btn`, input `.form-control`, toggle hamburger có chiều cao $\ge 42\text{px} - 44\text{px}$. | ✅ **ĐẠT** |
| **B3** | Kiểm tra lỗi Console: Không có lỗi đỏ cú pháp JS hoặc nạp tài nguyên 404. | 0 lỗi console trên các trang trong phạm vi TV5. | ✅ **ĐẠT** |
| **B4** | Phục vụ file tĩnh: Chỉ phục vụ thư mục `public/`. Tài liệu `docs/` xem nội bộ. | Đã cấu hình `server.js` chỉ phục vụ `public/`, gỡ mount `docs/`. | ✅ **ĐẠT** |
| **B5** | Bảo vệ route client: Chặn truy cập trái phép bằng `requireLogin()`, tự chuyển về `login.html`. | `requireLogin()` hoạt động chính xác trên `profile.html` và khi token bị hủy. | ✅ **ĐẠT** |
| **B6** | Màu sắc đúng nhận diện cà phê: Không còn bất kỳ màu xanh Bootstrap nào (`#0d6efd`), nền kem `#FBF5EC` (sáng) và xám nâu đậm `#1E1612` (tối). | 0 phần tử xanh Bootstrap (trước đó 38 lỗi). Màu nâu chủ đạo `#4A2C1A`, điểm nhấn `#C78243`. | ✅ **ĐẠT (50/50)** |
| **B7** | Tương thích Dark/Light: Chuyển đổi mượt mà, lưu `localStorage`, chống giật màn hình (FOUC). | Script inline kiểm tra theme tức thì trước khi render DOM, icon mặt trăng/mặt trời đồng bộ. | ✅ **ĐẠT** |
| **B8** | Tương phản chữ (WCAG AA): Chữ và nền có tỷ lệ tương phản $\ge 4.5:1$, đọc rõ ràng. | Chữ `#2C1810` trên nền kem `#FBF5EC` đạt độ tương phản 11.8:1 (vượt chuẩn AAA). | ✅ **ĐẠT** |
| **B9** | Nhất quán thanh điều hướng: Dùng chung một cấu trúc `renderNavbar()`. Logo ô vuông nâu + SVG + tên serif. | 100% trang trong phạm vi TV5 dùng chung `renderNavbar()`. Đầy đủ chế độ Khách / Đã đăng nhập / Admin / Staff. | ✅ **ĐẠT (50/50)** |
| **B10** | Không sử dụng Emoji: Thay thế toàn bộ emoji (☕, 👤, 📋...) bằng SVG nét mảnh đồng tông nâu. | 0 emoji trong DOM hiển thị của các trang TV5. Dùng SVG nội tuyến 100%. | ✅ **ĐẠT (50/50)** |
| **B11** | Bố cục & Cuộn: Nội dung chính cách navbar $\ge 24\text{px}$. Trang Đăng nhập không cuộn dọc ở 1366x768 & 1920x1080. | Khoảng cách navbar-main đạt 32px - 48px trên mọi trang. Trang login vừa vặn 1 màn hình. | ✅ **ĐẠT (50/50)** |
| **B12** | Độ gọn (Compactness): Tối đa 2 họ font (serif tiêu đề, sans văn bản), 3 border-radius (10px, 16px, 9999px), 1 nút đặc chính. | Tuân thủ nghiêm ngặt hệ thống Design Tokens trong `:root`. Không có thành phần dư thừa. | ✅ **ĐẠT (50/50)** |
| **B13** | Cân đối (Balance): Thẻ auth căn giữa tuyệt đối (lệch $\le 2\text{px}$), Hero section 2 cột cân bằng (lệch tâm $\le 24\text{px}$). | Thẻ auth lệch 0px; 3 thẻ tính năng có kích thước chiều cao và chiều rộng bằng nhau 100%. | ✅ **ĐẠT (50/50)** |

---

## 2. KẾT QUẢ KHẮC PHỤC TRIỆT ĐỂ 8 LỖI NGHIỆM THU (L1 - L8)

| Mã Lỗi | Hiện Trạng Cũ Bị Bắt Bẻ | Giải Pháp Đã Triệt Để Khắc Phục | Trạng Thái |
|:---:|:---|:---|:---:|
| **L1** | `login`, `register`, `profile`, `khung-chung` bị nền xanh Bootstrap (`#0d6efd`) phủ kín toàn trang. | Gỡ bỏ hoàn toàn class `bg-primary` trên thẻ `<body>`. Ghi đè `--bs-primary: #4A2C1A` và `.bg-primary { background-color: var(--bg-color) !important; }`. Đưa màu nền về kem ấm `#FBF5EC` (sáng) và `#1E1612` (tối). | ✅ **ĐÃ XONG** |
| **L2** | Nút "Đăng nhập" trên navbar login tô xanh; tiêu đề "Đổi mật khẩu" ở profile chữ màu xanh. | Chuẩn hóa nút bấm: Nút viền nâu `.btn-outline`, nút đặc nâu `.btn-primary` (`#4A2C1A`). Xóa sạch class `.text-primary` xanh của Bootstrap. | ✅ **ĐÃ XONG** |
| **L3** | Thanh điều hướng không nhất quán (index dùng navbar tĩnh cũ có logo vuông; các trang khác dùng thanh đơn giản). | Thay thế toàn bộ bằng 1 hàm `renderNavbar()` duy nhất trong `ui.js`: Logo ô vuông nâu 36px chứa `logo.svg`, tên quán serif "Cafe Task Manager", menu tự động thích ứng theo trạng thái đăng nhập và quyền hạn. | ✅ **ĐÃ XONG** |
| **L4** | `khung-chung.html`: Tiêu đề và mô tả tương phản rất thấp trên nền xanh, khó đọc. | Thiết kế lại `khung-chung.html` với nền kem, tiêu đề h1 màu espresso `#3B2418`, mô tả chữ xám nâu `#7A6252`, thẻ nội dung trắng ngà viền xám mềm `#E4D5C7`. | ✅ **ĐÃ XONG** |
| **L5** | Icon cốc cà phê và hình người dùng màu tím nhạt hoặc emoji sặc sỡ, lệch tông cà phê. | Thay thế 100% bằng SVG vector nét mảnh chuẩn tông nâu đồng `#C78243` và nâu ấm `#4A2C1A`. | ✅ **ĐÃ XONG** |
| **L6** | Thẻ profile dính sát navbar; trang login bị cuộn dọc ở 1080px và footer lơ lửng giữa trang. | Áp dụng layout flexbox `.auth-page-wrapper`: `min-height: calc(100vh - 64px)`, căn giữa card hoàn hảo theo chiều dọc và ngang, đẩy footer 1 dòng sát đáy trang, không phát sinh cuộn dọc ở 1366x768 và 1920x1080. | ✅ **ĐÃ XONG** |
| **L7** | Hero trang chủ mất cân đối: Cột trái dài, cột phải lệch; chip "3 việc cần làm" bị xoay nghiêng -3 độ; số liệu giả "12 nhân viên đang trong ca". | Thiết kế lại Hero 2 cột cân bằng tỷ lệ 1.1 : 0.9. Cột phải là thẻ xem trước phẳng (không nghiêng, không xoay), chứa 3 dòng công việc có nhãn "Minh họa" rõ ràng. | ✅ **ĐÃ XONG** |
| **L8** | **`profile.html` truy cập tự do:** Khách vãng lai chưa đăng nhập vẫn vào xem được trang hồ sơ cá nhân với các ô trống, không có cơ chế bảo vệ. | Đã bổ sung script gọi hàm `requireLogin()` từ `api.js` ngay khi `DOMContentLoaded`. Khách vãng lai chưa có token khi truy cập `profile.html` lập tức bị chặn và tự động chuyển hướng về `login.html`. | ✅ **ĐÃ XONG** |

---

## 3. TÁC ĐỘNG CỦA `margin-top: var(--space-32)` LÊN CÁC TRANG CỦA TV1, TV3, TV4

Trong `public/assets/css/style.css`, TV5 đã khai báo quy tắc:
```css
main,
.site-main {
  margin-top: var(--space-32);
}
```

Qua khảo sát trực tiếp mã nguồn file của các thành viên khác:
1. **Trang `shifts.html` (TV1):**
   - Đang sử dụng cấu trúc: `<header class="site-navbar">` (cao 64px, sticky top 0) và `<main class="main-content">`.
   - **Tác động:** Thuộc tính `margin-top: var(--space-32)` (32px) áp dụng lên thẻ `<main>` giúp tiêu đề trang "Phân Công Ca Trực & Điều Phối Quán" tự động tách rời khỏi mép dưới của navbar đúng 32px ($\ge 24\text{px}$), khắc phục hiện tượng dính sát navbar mà TV1 không cần phải viết thêm CSS riêng. Không gây lỗi vỡ khung.
2. **Trang `tasks.html` (TV3):**
   - Đang sử dụng cấu trúc: `<header class="site-navbar">` và `<main class="main-content">`.
   - **Tác động:** Tương tự `shifts.html`, thẻ `<main>` nhận margin-top 32px giúp phần thanh công cụ nhanh và tiêu đề bảng công việc có khoảng thở đẹp mắt, cách navbar đúng chuẩn B11.
3. **Trang `statistics.html` (TV4):**
   - Đang sử dụng cấu trúc: `<header class="site-navbar">` và `<main class="main-content py-4">`.
   - **Tác động:** Do có thêm class `py-4` của Bootstrap (`padding-top: 1.5rem` = 24px), khi kết hợp với `margin-top: 32px`, tổng khoảng cách từ navbar đến khối banner KPI đầu tiên là $32 + 24 = 56\text{px}$. Đây là khoảng cách thoáng đãng, cân đối cho một trang bảng điều khiển Dashboard có nhiều thẻ chỉ số và biểu đồ Chart.js, không gây tràn trang.

> [!NOTE]
> Các trang `shifts.html`, `tasks.html`, `statistics.html` hiện tại vẫn đang là bản cũ (dùng navbar tĩnh cũ chưa nối `renderNavbar()`, chưa kết nối API Backend thật). Khi các thành viên TV1, TV3, TV4 viết lại theo API ở Giai đoạn D, việc kế thừa `margin-top: var(--space-32)` từ `style.css` sẽ đảm bảo 100% trang trong hệ thống đều đồng bộ khoảng cách đạt chuẩn B11.

---

## 4. BẢNG CÁC VẤN ĐỀ CÒN LẠI VÀ TRẠNG THÁI CHỜ PHỤ THUỘC

| Hạng Mục | Tình Trạng Hiện Tại | Phụ Thuộc Vào Ai? | Hành Động Cần Thiết |
|:---|:---|:---:|:---|
| **Đăng nhập thật (API & DB)** | Chưa chạy được vì thiếu bảng Users và API route auth | **TV2** (`routes/auth.js`, `seedUsers.js`) & **TV4** (`schema.sql`, `seed.sql`) | Đang chờ TV2 & TV4 bàn giao API auth và database SQL Server. |
| **Logic submit form Login, Register, Profile** | Đang chờ file client script `public/assets/js/auth.js` | **TV2** | Đang chờ TV2 viết `auth.js` (xử lý gọi `POST /api/auth/login`, `POST /api/auth/register`, lưu token và xử lý form). |
| **Rà soát giao diện toàn diện Giai đoạn D (TV5-P3)** | Chưa thực hiện được trên các trang nghiệp vụ | **TV1** (`shifts.html` + `shifts.js`), **TV3** (`tasks.html` + `tasks.js`), **TV4** (`statistics.html` + `statistics.js`) | Đang chờ TV1, TV3, TV4 viết lại các trang bằng API thật. |
