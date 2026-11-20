# Bảng Kế Hoạch và Kết Quả Kiểm Thử Hệ Thống (Test Cases)

- **Dự án:** Cafe Task Manager
- **Thành viên phụ trách:** TV4 (Cơ sở dữ liệu, Thống kê, Quản lý kho, Kiểm thử)
- **Tài liệu đối chiếu:** `AI_CONTEXT.md` (gồm PHẦN MỞ RỘNG), `ke-hoach-mo-rong.md`, Các router Backend và Giao diện Frontend
- **Thời gian thực hiện kiểm thử:** Tháng 11/2026
- **Môi trường:** Node.js 18+, SQL Server Developer 2022 (localhost), Chrome 130+

---

## PHẦN 1: 26 CA KIỂM THỬ TÍNH NĂNG CỐT LÕI (TC01 - TC26)

| Mã | Chức năng | Các bước hoặc đầu vào | Kết quả mong đợi | Kết quả thực tế | Đạt? |
|:---|:---|:---|:---|:---|:---:|
| **TC01** | Đăng ký tài khoản Staff hợp lệ | Nhập Họ tên: "Nguyễn Văn A", Email: "nguyenvana@cafe.com", Password: "Password@123" | Server tạo User mới vai trò Staff, băm bcrypt, trả về 201 Created | Tạo tài khoản thành công, mật khẩu trong CSDL được băm an toàn | Đạt |
| **TC02** | Đăng ký trùng Email | Nhập Email đã tồn tại: "admin@cafe.com" | Server từ chối, trả về 409 Conflict với thông báo email đã tồn tại | Trả về 409: "Email đã tồn tại trong hệ thống" | Đạt |
| **TC03** | Validation mật khẩu yếu | Nhập Password: "123" (dưới 8 ký tự, không có chữ) | Báo lỗi tại Client và Server chặn trả về 400 Bad Request | Form báo đỏ "Mật khẩu tối thiểu 8 ký tự gồm chữ và số" | Đạt |
| **TC04** | Đăng nhập hệ thống thành công | Nhập Email: "admin@cafe.com", Password: "Admin@123" | Trả về JWT token (hạn 8h), thông tin user; lưu localStorage và chuyển trang | Nhận được token, lưu vào localStorage, chuyển vào trang `tasks.html` | Đạt |
| **TC05** | Đăng nhập sai mật khẩu | Nhập Email: "admin@cafe.com", Password: "WrongPassword" | Trả về 401 Unauthorized với thông báo "Email hoặc mật khẩu không đúng" | Trả về 401, không làm lộ chi tiết sai email hay mật khẩu | Đạt |
| **TC06** | Giới hạn đăng nhập sai (Rate Limit) | Gửi đăng nhập sai liên tiếp hơn 20 lần trong 15 phút từ 1 IP | Server chặn bằng HTTP 429 Too Many Requests | Sau lần 20 trả về 429: "Quá nhiều yêu cầu, vui lòng thử lại sau" | Đạt |
| **TC07** | Đăng xuất người dùng | Bấm nút "Đăng xuất" trên thanh Navbar | Gọi `POST /api/auth/logout`, xóa token và user trong localStorage, về `login.html` | Token bị xóa hoàn toàn khỏi localStorage, chuyển về `login.html` | Đạt |
| **TC08** | Xem thông tin hồ sơ | Gọi `GET /api/me` với Bearer Token | Trả về id, fullName, email, role của người dùng hiện tại; không có hash | Trả về 200 OK với đúng thông tin người dùng đang đăng nhập | Đạt |
| **TC09** | Đổi mật khẩu cá nhân | Gọi `PUT /api/me` với currentPassword đúng và newPassword hợp lệ | Mật khẩu mới được cập nhật và băm lại, trả về 200 OK | Đổi mật khẩu thành công, dùng mật khẩu mới đăng nhập bình thường | Đạt |
| **TC10** | Tạo mới công việc (Admin & Staff) | Nhập Title: "Kiểm tra nhiệt độ sữa", Status: "Pending", Priority: "High" | Tạo công việc thành công, lưu vào CSDL, trả về 201 Created | Công việc xuất hiện ngay trên danh sách và có trong CSDL | Đạt |
| **TC11** | Tạo công việc thiếu Tiêu đề | Gửi `POST /api/tasks` với `{ title: "" }` | Server chặn trả về 400 Bad Request kèm mảng errors | Trả về 400: "Tiêu đề không được để trống" | Đạt |
| **TC12** | Admin sửa toàn bộ công việc | Admin gọi `PUT /api/tasks/:id` sửa Title, Description, Deadline, ShiftId | Dữ liệu cập nhật thành công, trả về 200 OK | Thông tin công việc được cập nhật đầy đủ | Đạt |
| **TC13** | Phân quyền: Staff sửa toàn bộ công việc | Staff gọi `PUT /api/tasks/:id` | Bị từ chối bằng HTTP 403 Forbidden | Trả về 403: "Bạn không có quyền thực hiện thao tác này" | Đạt |
| **TC14** | Staff cập nhật trạng thái (PATCH) | Staff gọi `PATCH /api/tasks/:id/status` với `{ status: "Done" }` | Cập nhật trạng thái thành công, trả về 200 OK | Trạng thái chuyển thành "Done", badge đổi màu xanh | Đạt |
| **TC15** | Admin xóa công việc | Admin gọi `DELETE /api/tasks/:id` (có xác nhận confirm) | Xóa bản ghi trong CSDL, trả về 200 OK | Bản ghi bị xóa khỏi bảng Tasks | Đạt |
| **TC16** | Phân quyền: Staff xóa công việc | Staff gọi `DELETE /api/tasks/:id` | Bị từ chối bằng HTTP 403 Forbidden | Trả về 403 Forbidden, Staff không thể xóa | Đạt |
| **TC17** | Tìm kiếm công việc (Debounce + Ký tự đặc biệt) | Nhập từ khóa: "máy pha", "RO", hoặc ký tự đặc biệt "%", "_" | Tìm kiếm chính xác không lỗi cú pháp SQL, chỉ trả task thỏa mãn | Danh sách lọc tức thì sau 300ms, không gây lỗi SQL Injection | Đạt |
| **TC18** | Lọc đa tiêu chí | Chọn Status="Pending", Priority="High", Category="Pha chế" | Danh sách chỉ hiện các task thỏa mãn đồng thời 3 điều kiện | Kết quả hiển thị chính xác các task lọc theo điều kiện | Đạt |
| **TC19** | Phân trang danh sách | Chuyển giữa Trang 1, Trang 2 với pageSize=10 | API trả đúng 10 bản ghi/trang kèm metadata totalPages, page | Phân trang mượt mà, bấm chuyển trang hiển thị đúng bản ghi tiếp theo | Đạt |
| **TC20** | Xem danh sách ca làm việc | Gọi `GET /api/shifts` có token | Trả về danh sách ca kèm `taskCount` số việc thuộc ca, giờ dạng "HH:mm" | Hiển thị 3 ca làm việc chuẩn, giờ hiển thị đúng định dạng HH:mm | Đạt |
| **TC21** | Phân quyền: Staff thêm ca làm | Staff gửi `POST /api/shifts` | Bị chặn bằng HTTP 403 Forbidden | Trả về 403 Forbidden, chỉ Admin mới được tạo ca | Đạt |
| **TC22** | Lấy dữ liệu thống kê (Stats API) | Gọi `GET /api/stats` với token hợp lệ | Trả về totals (6 chỉ số), byStatus, byPriority, byCategory | Trả về 200 OK với đầy đủ 6 chỉ số KPI và dữ liệu 3 biểu đồ | Đạt |
| **TC23** | Trạng thái danh sách rỗng (Empty State) | Tìm kiếm với từ khóa không tồn tại "XYZ123456" | Ẩn bảng, hiển thị khối Empty State "Không tìm thấy công việc" | Hiển thị icon và thông báo Empty State rõ ràng, thân thiện | Đạt |
| **TC24** | Responsive trên Mobile 375px | Thu nhỏ màn hình trình duyệt về chiều rộng 375px (iPhone SE) | Navbar co lại dạng Hamburger, bảng chuyển thẻ/cuộn ngang, không vỡ layout | Giao diện hiển thị tốt, các nút bấm vừa ngón tay, không tràn ngang | Đạt |
| **TC25** | Xử lý sự cố mất kết nối CSDL | Tắt dịch vụ SQL Server rồi gọi API | Server trả về 500 "Lỗi hệ thống", không lộ connection string hay password | Trả về 500 JSON chuẩn, console server ghi lỗi kỹ thuật an toàn | Đạt |
| **TC26** | Ràng buộc khóa ngoại ON DELETE SET NULL | Admin xóa một ca làm việc đang có task liên kết | Ca bị xóa, cột ShiftId của các task liên kết tự chuyển về NULL (không mất task) | Xóa ca thành công, các task thuộc ca đó vẫn còn nguyên và ShiftId = NULL | Đạt |

---

## PHẦN 2: 22 CA KIỂM THỬ TÍNH NĂNG MỞ RỘNG (TC-X01 - TC-X22)

| Mã | Chức năng | Các bước hoặc đầu vào | Kết quả mong đợi | Kết quả thực tế | Đạt? |
|:---|:---|:---|:---|:---|:---:|
| **TC-X01** | Thống kê theo nhân viên | Gọi `GET /api/stats/by-user` có token | Trả về 200 OK, danh sách nhân viên kèm total, done, overdue; việc chưa giao gom thành "Chưa giao" (userId: null) | Trả về mảng nhân viên và dòng "Chưa giao" chính xác | Đạt |
| **TC-X02** | Thống kê theo ca làm việc | Gọi `GET /api/stats/by-shift` có token | Trả về 200 OK, danh sách ca kèm completionRate làm tròn 1 chữ số; việc không ca gom thành "Chưa gán ca" | Trả về 3 ca chuẩn và số liệu hoàn thành chính xác | Đạt |
| **TC-X03** | Thống kê theo tuần mặc định | Gọi `GET /api/stats/weekly?weeks=8` | Trả về 200 OK, đủ 8 tuần bắt đầu thứ Hai (YYYY-MM-DD), kể cả tuần có 0 việc | Trả về đủ 8 tuần theo thứ Hai, không khuyết tuần | Đạt |
| **TC-X04** | Thống kê tuần với weeks = 0 | Gọi `GET /api/stats/weekly?weeks=0` | Trả về 400 Bad Request: "Tham số weeks phải nằm trong khoảng từ 1 đến 26" | Trả về 400 đúng thông báo lỗi chuẩn | Đạt |
| **TC-X05** | Thống kê tuần với weeks chữ | Gọi `GET /api/stats/weekly?weeks=abc` | Trả về 400 Bad Request: "Tham số weeks phải là số nguyên" | Server bắt lỗi tham số và trả về 400 | Đạt |
| **TC-X06** | Admin xuất dữ liệu CSV | Admin gọi `GET /api/stats/export.csv` | Trả về 200 OK, Content-Type text/csv, file có BOM UTF-8, chống CSV injection với các ký tự = + - @ | Trình duyệt tải về file tasks-export.csv hiển thị đúng tiếng Việt trong Excel | Đạt |
| **TC-X07** | Staff gọi xuất CSV | Staff gọi `GET /api/stats/export.csv` | Bị từ chối bằng HTTP 403 Forbidden | Trả về 403 Forbidden, Staff không thể xuất | Đạt |
| **TC-X08** | Lấy danh sách nguyên liệu | Gọi `GET /api/ingredients?page=1&pageSize=10` | Trả về 200 OK kèm danh sách và metadata pagination (page, pageSize, total, totalPages) | Trả về 8 nguyên liệu mẫu, có cờ isLow chuẩn | Đạt |
| **TC-X09** | Lọc nguyên liệu sắp hết | Gọi `GET /api/ingredients?lowOnly=1` | Danh sách chỉ hiện các nguyên liệu có Quantity <= MinQuantity | Chỉ trả về Sữa tươi và Trà đen (2 nguyên liệu sắp hết) | Đạt |
| **TC-X10** | Tìm kiếm tên nguyên liệu | Gọi `GET /api/ingredients?search=cà phê` | Danh sách chỉ hiện các mục chứa từ khóa tìm kiếm (đã escape ký tự đặc biệt) | Trả về đúng bản ghi "Cà phê hạt Robusta" | Đạt |
| **TC-X11** | Lấy chi tiết nguyên liệu | Gọi `GET /api/ingredients/1` | Trả về 200 OK với đầy đủ thông tin chi tiết của nguyên liệu Id=1 | Trả về 200 OK thông tin nguyên liệu | Đạt |
| **TC-X12** | Xem nguyên liệu không tồn tại | Gọi `GET /api/ingredients/99999` | Trả về 404 Not Found: "Nguyên liệu không tồn tại" | Trả về 404 Not Found | Đạt |
| **TC-X13** | Admin thêm nguyên liệu mới | Admin gửi `POST /api/ingredients` dữ liệu hợp lệ | Thêm mới thành công, lưu CSDL, trả về 201 Created | Bản ghi mới xuất hiện trong kho | Đạt |
| **TC-X14** | Staff thêm nguyên liệu | Staff gửi `POST /api/ingredients` | Bị từ chối bằng HTTP 403 Forbidden | Trả về 403 Forbidden, Staff không có quyền | Đạt |
| **TC-X15** | Thêm nguyên liệu trùng tên | Admin gửi `POST /api/ingredients` tên đã có | Bị từ chối bằng HTTP 409 Conflict | Trả về 409 Conflict: "Tên nguyên liệu đã tồn tại" | Đạt |
| **TC-X16** | Admin cập nhật nguyên liệu | Admin gửi `PUT /api/ingredients/:id` | Cập nhật thành công thông tin, trả về 200 OK | Thông tin nguyên liệu được cập nhật trong CSDL | Đạt |
| **TC-X17** | Điều chỉnh kho với delta = 0 | Gửi `PATCH /api/ingredients/1/stock` với `{ delta: 0 }` | Bị từ chối bằng HTTP 400 Bad Request: "Số lượng thay đổi phải khác 0" | Trả về 400 Bad Request | Đạt |
| **TC-X18** | Xuất quá số lượng tồn kho | Gửi `PATCH /api/ingredients/1/stock` với `{ delta: -999999 }` | Giao dịch ROLLBACK, trả về 400 Bad Request: "Tồn kho không đủ" | Trả về 400: Tồn kho không đủ để xuất | Đạt |
| **TC-X19** | Xuất kho chạm ngưỡng tối thiểu | Gửi `PATCH /api/ingredients/:id/stock` làm Quantity <= MinQuantity | Tồn kho giảm, tự động INSERT 1 bản ghi mới vào bảng Tasks với Title="Nhập hàng: ...", autoTaskCreated=true | Tạo thành công Task "Nhập hàng", hiển thị toast cảnh báo | Đạt |
| **TC-X20** | Xuất kho khi task đã tồn tại | Gửi tiếp `PATCH` trừ kho nguyên liệu đang có task chưa Done | Tồn kho giảm bình thường, KHÔNG tạo trùng Task mới, autoTaskCreated=false | Tồn kho cập nhật và không sinh thêm task thừa | Đạt |
| **TC-X21** | Staff xóa nguyên liệu | Staff gửi `DELETE /api/ingredients/:id` | Bị từ chối bằng HTTP 403 Forbidden | Trả về 403 Forbidden | Đạt |
| **TC-X22** | Admin xóa nguyên liệu | Admin gửi `DELETE /api/ingredients/:id` | Xóa bản ghi thành công khỏi CSDL, trả về 200 OK | Bản ghi bị xóa khỏi bảng Ingredients | Đạt |

---

## TỔNG HỢP TOÀN DỰ ÁN
- **Tổng số test case thực hiện:** 48 (26 ca cốt lõi + 22 ca mở rộng)
- **Số test case ĐẠT (Pass):** 48 / 48 (100%)
- **Số test case KHÔNG ĐẠT (Fail):** 0
- **Kết luận:** Toàn bộ các phân hệ cốt lõi và mở rộng của TV4 hoạt động ổn định, bảo mật cao và nhất quán theo chuẩn hợp đồng API.
