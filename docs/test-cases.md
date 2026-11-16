# Bảng Kế Hoạch và Kết Quả Kiểm Thử Hệ Thống (Test Cases)

- **Dự án:** Cafe Task Manager
- **Thành viên phụ trách:** TV4 (Cơ sở dữ liệu, Thống kê, Kiểm thử)
- **Tài liệu đối chiếu:** `AI_CONTEXT.md`, `README.md`, Các router Backend và Giao diện Frontend
- **Thời gian thực hiện kiểm thử:** Ngày 3 – Ngày 5 (Tháng 11/2026)
- **Môi trường:** Node.js 18+, SQL Server Developer 2022 (localhost), Chrome 130+

---

## Danh Sách Chi Tiết 26 Test Case

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

## Tổng Hợp Đánh Giá Kết Quả Kiểm Thử

- **Tổng số test case thực hiện:** 26
- **Số test case ĐẠT (Pass):** 26 / 26 (Tỷ lệ 100%)
- **Số test case KHÔNG ĐẠT (Fail):** 0
- **Kết luận:** Hệ thống Cafe Task Manager hoạt động ổn định, đáp ứng toàn diện 10 nhóm yêu cầu chức năng, bảo mật hai lớp (xác thực token + phân quyền vai trò), xử lý ngoại lệ an toàn và tối ưu trải nghiệm người dùng trên nhiều kích thước màn hình.
