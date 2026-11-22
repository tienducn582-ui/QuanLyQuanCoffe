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
| **TC-X23** | [TV1-X2] Bắt đầu nhận ca làm việc | Đăng nhập Staff, mở `shifts.html`, bấm nút "Nhận ca" ở Ca Sáng | Server tạo bản ghi `ShiftLogs`, trả về `201 Created`, nút đổi thành "Kết thúc ca" | Tạo log thành công, giao diện cập nhật ngay lập tức | Đạt |
| **TC-X24** | [TV1-X2] Chặn nhận 2 ca cùng lúc | Khi đang có ca mở, thử gọi `POST /api/shifts/2/start` | Server từ chối bằng `409 Conflict` với thông báo "Bạn đang trong một ca chưa kết thúc" | Trả về 409 Conflict chuẩn hợp đồng | Đạt |
| **TC-X25** | [TV1-X2] Kết thúc ca kèm ghi chú | Bấm "Kết thúc ca", nhập ghi chú bàn giao hợp lệ <= 500 ký tự | Cập nhật `EndedAt` và `HandoverNote`, trả về `200 OK`, xuất hiện trong bảng nhật ký | Cập nhật thành công, modal đóng và hiện toast | Đạt |
| **TC-X26** | [TV1-X2] Chặn ghi chú quá 500 ký tự | Gửi `POST /api/shifts/1/end` với ghi chú dài hơn 500 ký tự | Server trả về `400 Bad Request` kèm thông báo lỗi cụ thể | Trả về 400 Bad Request | Đạt |
| **TC-X27** | [TV1-X2] Xem thông tin bàn giao ca | Gọi `GET /api/shifts/1/handover` | Trả về `lastLog` gần nhất và mảng `openTasks` còn dở dang | Hiển thị đầy đủ ghi chú ca trước và các task chưa xong | Đạt |
| **TC-X28** | [TV1-X2] Lấy nhật ký ca hôm nay | Gọi `GET /api/shifts/logs` | Trả về danh sách tối đa 100 log trực ban trong ngày, xếp theo giờ bắt đầu giảm dần | Trả về đúng danh sách log và render vào bảng | Đạt |
| **TC-X29** | [TV1-X4] Xem lịch phân ca tuần | Đăng nhập tài khoản bất kỳ, mở trang `schedule.html` | Hiển thị lưới 7 ngày từ Thứ Hai đến Chủ Nhật, hiển thị đầy đủ ca và nhân sự | Lưới hiển thị chuẩn xác, đúng ngày địa phương | Đạt |
| **TC-X30** | [TV1-X4] Tô đậm ca trực của tôi | Đăng nhập tài khoản Staff đã được phân ca, mở `schedule.html` | Thẻ phân công của chính nhân viên đó được tô đậm màu chủ đạo (`.is-me`) | Hiển thị nổi bật, dễ nhận biết | Đạt |
| **TC-X31** | [TV1-X4] Admin phân công ca mới | Admin mở modal, chọn Ca Chiều, nhân viên Staff, ngày làm hợp lệ, bấm Lưu | Tạo bản ghi `ShiftAssignments`, trả về `201 Created`, xuất hiện ngay trên lưới | Phân công thành công, xuất hiện tức thì | Đạt |
| **TC-X32** | [TV1-X4] Chặn phân công trùng lặp | Admin phân công cùng một nhân viên vào cùng 1 ca trong cùng 1 ngày | Server chặn bằng `409 Conflict`: "Nhân viên đã được phân công ca làm việc này trong ngày" | Trả về 409 Conflict | Đạt |
| **TC-X33** | [TV1-X4] Phân quyền: Staff phân ca | Tài khoản Staff gửi `POST /api/schedule` hoặc `DELETE /api/schedule/:id` | Server từ chối bằng `403 Forbidden` | Trả về 403 Forbidden, Staff không có nút phân công | Đạt |
| **TC-X34** | [TV1-X4] Responsive di động < 576px | Mở `schedule.html` ở độ phân giải 375px (Mobile) | Lưới bảng tự động ẩn, chuyển thành danh sách thẻ theo từng ngày không bị tràn ngang | Bố cục dạng thẻ mượt mà, không tràn màn hình | Đạt |
| **TC-X35** | [TV2-X8] Tạo khách hàng mới | Gửi `POST /api/customers` với `fullName` 2–100 ký tự và `phone` 10 số | Trả về 201 Created, `points: 0`, `rank: 'Đồng'`, hiển thị trên bảng | Tạo khách thành công | Đạt |
| **TC-X36** | [TV2-X8] Chặn trùng SĐT khách hàng | Gửi `POST /api/customers` với SĐT đã có trong hệ thống | Bị từ chối bằng `409 Conflict` | Trả về 409 Conflict | Đạt |
| **TC-X37** | [TV2-X8] Tích điểm theo hóa đơn | Gọi `POST /api/customers/:id/earn` với `amount: 1250000` | Cộng thêm 125 điểm, trả về 200 OK, tự động chuyển hạng `Bạc` | Điểm và hạng cập nhật đúng công thức | Đạt |
| **TC-X38** | [TV2-X8] Đổi điểm và chống âm điểm | Gọi `POST /api/customers/:id/redeem` với `points: 999999` vượt số dư | Server chặn bằng `400 Bad Request` "Không đủ điểm", điểm CSDL không âm | Điểm không âm, trả về 400 | Đạt |
| **TC-X39** | [TV2-X8] Staff xóa khách hàng | Staff gửi `DELETE /api/customers/:id` | Bị từ chối bằng `403 Forbidden` | Trả về 403 Forbidden | Đạt |
| **TC-X40** | [TV2-X8] Tìm kiếm khách theo tên/SĐT | Nhập từ khóa tên hoặc SĐT trên `customers.html` | Lọc chính xác bản ghi sau debounce 300ms, không lỗi với `%`, `_` | Tìm kiếm chính xác, an toàn SQLi | Đạt |
| **TC-X41** | [TV3-X5] Lọc việc quá hạn & của tôi | Gửi `GET /api/tasks?assigneeId=me&overdue=1` | Trả về danh sách các việc của chính mình có Deadline < hôm nay và chưa Done | Trả về đúng tập việc quá hạn | Đạt |
| **TC-X42** | [TV3-X5] Ghi log tự động khi đổi status | Đổi trạng thái việc từ Pending sang InProgress | Bảng `TaskLogs` tự động ghi nhận bản ghi với `Action = 'status'`, lưu OldValue và NewValue | Log được ghi đầy đủ và hiển thị trên dòng thời gian | Đạt |
| **TC-X43** | [TV3-X5] Gửi bình luận công việc | Gửi `POST /api/tasks/:id/comments` với comment hợp lệ (1-500 ký tự) | Trả về 201 Created, bình luận xuất hiện ngay trên modal chi tiết | Tạo bình luận thành công | Đạt |
| **TC-X44** | [TV3-X5] Chống XSS trong bình luận | Gửi comment chứa thẻ `<script>alert('xss')</script>` | Hiển thị dạng chuỗi văn bản đã qua `escapeHtml()`, không thực thi script | Văn bản an toàn, chống XSS triệt để | Đạt |
| **TC-X45** | [TV3-X3] Tạo việc từ mẫu định kỳ | Admin gọi `POST /api/templates/generate` cho Ca Sáng ngày hôm nay | Tự động tạo các task tương ứng với mẫu IsActive=1, gán Deadline là ngày chọn | Tạo đủ số lượng việc theo mẫu | Đạt |
| **TC-X46** | [TV3-X3] Chặn tạo trùng lặp từ mẫu | Gọi tiếp `POST /api/templates/generate` lần hai cho cùng ca và ngày | Số lượng `created = 0`, `skipped = N`, không sinh task thừa | Không tạo trùng task | Đạt |
| **TC-X47** | [TV5-X1] Huy hiệu quá hạn Navbar | Đăng nhập tài khoản có việc quá hạn, quan sát Navbar | `#overdueBadge` màu đỏ hiển thị đúng số lượng; tự động cập nhật khi đổi việc sang Done | Huy hiệu hoạt động chuẩn xác | Đạt |
| **TC-X48** | [TV5-X1] Responsive thẻ việc cá nhân | Mở `my-tasks.html` ở 375px màn hình nhỏ | Bảng chuyển sang dạng thẻ `.table-cards`, không tràn ngang | Bố cục thẻ đẹp mắt, responsive tốt | Đạt |
| **TC-X49** | [TV5-X9] Xem sơ đồ bàn POS | Truy cập `pos.html`, quan sát danh sách bàn | Bàn trống màu xanh (Free), bàn có khách màu cam (Occupied) | Hiển thị trực quan trạng thái bàn | Đạt |
| **TC-X50** | [TV5-X9] Mở đơn bàn và gọi món | Chọn Bàn 1 trống, bấm mở đơn, chọn 2 món nước trong menu | Mở đơn thành công, Bàn 1 chuyển sang Occupied, tính đúng tổng tiền tạm tính | Đơn mở thành công | Đạt |
| **TC-X51** | [TV5-X9] Chặn mở 2 đơn trên cùng 1 bàn | Gửi lệnh `POST /api/pos/orders` vào bàn đang có đơn Open | Server chặn bằng mã lỗi `409 Conflict` (bảo vệ bởi UX_Orders_OpenTable) | Trả về 409 Conflict | Đạt |
| **TC-X52** | [TV5-X9] Thanh toán và giải phóng bàn | Bấm "Thanh toán hóa đơn" tại bàn đang có khách | Server tính lại Total từ các items, đơn chuyển `Paid`, bàn quay về `Free` | Thanh toán chuẩn xác, bàn trở lại trống | Đạt |
| **TC-X53** | [TV5-X9] Tích điểm khách hàng qua POS | Mở đơn bàn gắn SĐT khách hàng, thanh toán hóa đơn 150.000đ | Hóa đơn thanh toán thành công, khách hàng được tích lũy 15 điểm | Điểm khách hàng tăng chính xác | Đạt |
| **TC-X54** | [TV5-X9] Hủy đơn hàng đang mở | Bấm "Hủy đơn hàng này" có xác nhận confirm | Đơn chuyển trạng thái `Cancelled`, bàn được giải phóng về Free | Đơn hủy thành công | Đạt |

---

## TỔNG HỢP TOÀN DỰ ÁN
- **Tổng số test case thực hiện:** 80 (26 ca cốt lõi + 54 ca mở rộng X1–X9)
- **Số test case ĐẠT (Pass):** 80 / 80 (100%)
- **Số test case KHÔNG ĐẠT (Fail):** 0
- **Kết luận:** Toàn bộ 10 nhóm chức năng cốt lõi và 9 tính năng mở rộng của cả nhóm hoạt động ổn định, bảo mật cao, đạt tiêu chuẩn chất lượng và nhất quán theo chuẩn hợp đồng API. Sẵn sàng đóng băng v1.1 (`v1.1-freeze`).
