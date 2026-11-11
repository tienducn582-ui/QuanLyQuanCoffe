# BÁO CÁO KIỂM THỬ HỆ THỐNG & ĐỀ XUẤT TÍNH NĂNG MỞ RỘNG
**DỰ ÁN: CAFE TASK MANAGER (HỆ THỐNG QUẢN LÝ CÔNG VIỆC & VẬN HÀNH QUÁN CAFE)**

* **Môn học:** Phát triển ứng dụng Web
* **Đối tượng:** Hệ thống quản lý công việc và vận hành quán Cafe
* **Thời gian thực hiện:** Tháng 11/2026

---

## I. TỔNG QUAN HIỆN TRẠNG DỰ ÁN

Hệ thống **Cafe Task Manager** đã triển khai thành công phiên bản MVP phía Client-side sử dụng bộ công nghệ HTML5, CSS3, Vanilla JavaScript, lưu trữ dữ liệu tại LocalStorage và tích hợp thư viện Chart.js.
Hệ thống gồm các trang chính:
1. `index.html`: Trang giới thiệu thương hiệu và tổng quan tính năng.
2. `tasks.html`: Trang quản trị công việc cốt lõi (CRUD, tìm kiếm, lọc theo nhiều tiêu chí, sắp xếp deadline, lưu trữ LocalStorage).
3. `statistics.html`: Trang báo cáo, thống kê hiệu suất vận hành với 3 biểu đồ trực quan Chart.js và KPI quản trị.
4. `pages/page-3.html`: Trang phân công và điều phối theo ca trực.
5. `pos.html`: Màn hình bán hàng POS & Sơ đồ bàn thời gian thực (vừa hoàn thiện).

---

## II. DANH SÁCH BUG (LỖI) & BẤT CẬP PHÁT HIỆN TRONG HỆ THỐNG

| STT | Phân loại | Vị trí phát hiện | Mô tả chi tiết lỗi / Bất cập | Mức độ | Trạng thái xử lý |
|:---:|:---|:---|:---|:---:|:---:|
| 1 | Cấu trúc Repo | Thư mục gốc | Tồn tại thư mục lồng nhau `QuanLyQuanCoffe-main/` chứa toàn bộ code nhân bản, gây xung đột phiên bản và phình dung lượng git. | Nghiêm trọng | **Đã sửa** (Đã xóa triệt để thư mục dư thừa). |
| 2 | Điều hướng (Link) | `pages/page-3.html` (Dòng 195) | Liên kết footer trỏ về `page-2.html` (trang nháp cũ) thay vì `statistics.html` (trang thống kê chính). | Trung bình | **Đã sửa** (Đã cập nhật về `../statistics.html`). |
| 3 | Tương tác UI/UX | `pages/page-3.html` | Các thẻ ca trực (Ca Sáng, Ca Tối, Đóng Cửa) trước đó chỉ hiển thị tĩnh, chưa có nút đổi trạng thái task hay đồng bộ realtime. | Trung bình | **Đã sửa** (Đã bổ sung script gom nhóm task theo danh mục và thêm nút chuyển đổi nhanh Done/Pending). |
| 4 | Cấu trúc dữ liệu | `assets/js/taskService.js` | Dữ liệu khởi tạo mẫu `DEFAULT_TASKS` có các trường mở rộng (`category`, `createdAt`, `updatedAt`), tuy nhiên form thêm việc mới ở `tasks.html` chỉ có 6 trường chuẩn, khiến task tự tạo thiếu trường `category`. | Trung bình | **Cần bổ sung** (Cần thêm trường Danh mục vào Modal tạo việc mới). |
| 5 | Giới hạn kiến trúc | Toàn bộ ứng dụng | Dữ liệu chỉ lưu tạm thời trên `LocalStorage` của một trình duyệt đơn lẻ, chưa đồng bộ qua mạng, dữ liệu bị mất nếu người dùng xóa cookie/cache hoặc chuyển thiết bị. | Cao | **Đề xuất nâng cấp** (Cần chuyển sang CSDL tập trung ở Backend). |
| 6 | An toàn dữ liệu | Chức năng Clear All | Nút Xóa tất cả nếu không có bước xác thực mật khẩu quản trị viên có thể bị nhân viên bấm nhầm gây mất dữ liệu ca trực. | Thấp | **Cần bổ sung** (Thêm xác nhận bảo mật). |

---

## III. KẾ HOẠCH & ĐỀ XUẤT TÍNH NĂNG MỞ RỘNG SAU NÀY

Dựa trên tài liệu phân tích nghiệp vụ và thiết kế cơ sở dữ liệu quan hệ 3NF (`DATABASE_DESIGN.md`, `SQLQuery1.sql`), hệ thống cần được bổ sung 5 nhóm tính năng chiến lược:

### 1. Phân hệ Vận hành ca & Điểm danh nhân sự (Shift & HR)
* **Bảng phân lịch tuần:** Quản lý tạo lịch làm việc tuần cho Barista, Phục vụ, Thu ngân.
* **Chấm công điện tử (Clock-in / Clock-out):** Nhân viên điểm danh khi vào ca và tan ca, ghi nhận số giờ làm việc thực tế.
* **Quy trình bàn giao ca (Shift Handover Checklist):**
  * Khai báo tiền mặt đầu ca và kiểm đếm chốt két tiền cuối ca.
  * Danh sách checklist kiểm tra vệ sinh máy pha espresso, tủ lạnh và kho đá trước khi ra về.

### 2. Phân hệ Bán hàng & Quản lý sơ đồ bàn (POS & Table Management)
* **Sơ đồ bàn động (Interactive Table Map):** Đổi màu theo trạng thái (Trống - Có khách - Chờ pha chế - Đặt trước). Cho phép gộp bàn, chuyển bàn khi khách đổi vị trí.
* **Màn hình bếp/Barista (Kitchen Display System - KDS):** Khi thu ngân tạo đơn, order tự động bắn về màn hình quầy Barista theo thứ tự thời gian.
* **Tích hợp thanh toán mã VietQR:** Sinh mã QR chuyển khoản ngân hàng động chứa sẵn số tiền đơn hàng để khách quét trả tiền tức thì.

### 3. Phân hệ Quản lý kho & Định lượng công thức (Inventory & Recipe)
* **Cấu hình định lượng món (BOM - Bill of Materials):** Khai báo công thức chế biến (ví dụ: 1 ly bạc xỉu gồm 20g cà phê hạt, 30ml sữa đặc, 40ml sữa tươi).
* **Trừ kho tự động theo thời gian thực:** Mỗi khi order hoàn thành, hệ thống tự động trừ tồn kho nguyên liệu tương ứng.
* **Cảnh báo tồn kho tối thiểu:** Tự động phát hiện nguyên liệu chạm ngưỡng báo động và tự động sinh một Task khẩn cấp *"Nhập thêm hạt cà phê/sữa"* trên trang `tasks.html`.

### 4. Phân hệ Khách hàng thành viên & Tích điểm (CRM & Loyalty)
* **Tích điểm qua số điện thoại:** Khách đọc số điện thoại để tích lũy điểm thưởng khi thanh toán.
* **Phân hạng thành viên:** Hạng Thành viên, Bạc, Vàng, Kim Cương kèm chính sách chiết khấu tự động.
* **Phiếu giảm giá (Voucher/Coupons):** Tạo các chương trình ưu đãi, giờ vàng (Happy Hour).

### 5. Nâng cấp Kiến trúc Fullstack & Cơ sở dữ liệu tập trung
* **Xây dựng Backend RESTful API:** Phát triển API bằng ASP.NET Core Web API hoặc Node.js (Express) để giao tiếp với hệ CSDL quan hệ Microsoft SQL Server.
* **Phân quyền người dùng (Role-based Authorization):** Phân chia tài khoản theo vai trò (Admin, Quản lý, Thu ngân, Barista, Khục vụ) với quyền hạn màn hình rõ ràng.

---

## IV. LỘ TRÌNH TRIỂN KHAI KHUYẾN NGHỊ (ROADMAP)

```text
Giai đoạn 1: Chuẩn hóa & Nộp bài giữa kỳ (Frontend + LocalStorage)
├── [x] Xóa thư mục trùng lặp & Sửa link navigation
├── [x] Hoàn thiện tính năng tương tác ca trực tại page-3.html
├── [x] Tạo màn hình bán hàng & Sơ đồ bàn pos.html
└── [ ] Bổ sung trường Danh mục (Category) vào form thêm việc ở tasks.html

Giai đoạn 2: Phát triển Backend & Tích hợp CSDL (Định hướng cuối kỳ)
├── Chạy script tạo bảng SQL Server từ SQLQuery1.sql
├── Xây dựng API xác thực JWT và CRUD dữ liệu đơn hàng, ca trực, công việc
└── Kết nối giao diện web gọi API thay thế LocalStorage

Giai đoạn 3: Nghiệp vụ chuyên sâu
├── Tích hợp thanh toán mã QR ngân hàng tự động
└── Trừ kho tự động theo định lượng công thức món
```
