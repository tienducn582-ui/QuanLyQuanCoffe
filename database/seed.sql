-- =====================================================================
-- CAFE TASK MANAGER - DATABASE SEED DATA (SQL SERVER)
-- Thành viên phụ trách: TV4 (Cơ sở dữ liệu, Thống kê, Kiểm thử)
-- Database name: CafeTaskManager
-- =====================================================================

USE [CafeTaskManager];
GO

-- 1. Nạp dữ liệu bảng Roles
SET IDENTITY_INSERT dbo.Roles ON;
INSERT INTO dbo.Roles (Id, Name) VALUES
(1, N'Admin'),
(2, N'Staff');
SET IDENTITY_INSERT dbo.Roles OFF;
GO

-- 2. Nạp dữ liệu bảng Categories (5 danh mục đặc thù quán cafe)
SET IDENTITY_INSERT dbo.Categories ON;
INSERT INTO dbo.Categories (Id, Name) VALUES
(1, N'Pha chế'),
(2, N'Phục vụ'),
(3, N'Vệ sinh'),
(4, N'Kho và mua hàng'),
(5, N'Thu ngân');
SET IDENTITY_INSERT dbo.Categories OFF;
GO

-- 3. Nạp dữ liệu bảng Shifts (3 ca làm việc tiêu chuẩn)
SET IDENTITY_INSERT dbo.Shifts ON;
INSERT INTO dbo.Shifts (Id, Name, StartTime, EndTime, Note) VALUES
(1, N'Ca Sáng', '06:00:00', '14:00:00', N'Mở cửa, chuẩn bị quầy bar và phục vụ điểm tâm'),
(2, N'Ca Tối', '14:00:00', '22:00:00', N'Ca cao điểm chiều tối, phục vụ khách tại bàn và mang đi'),
(3, N'Đóng cửa vệ sinh', '22:00:00', '23:30:00', N'Tẩy rửa máy pha, vệ sinh sàn, đối soát két và bàn giao');
SET IDENTITY_INSERT dbo.Shifts OFF;
GO

-- 4. Nạp 30 công việc mẫu thực tế cho quán cafe
-- Phân bố:
-- - Trạng thái: 10 Pending, 8 InProgress, 12 Done
-- - Mức độ ưu tiên: 8 Low, 14 Medium, 8 High
-- - Danh mục: Trải đều 5 danh mục (Pha chế, Phục vụ, Vệ sinh, Kho và mua hàng, Thu ngân)
-- - Ca: Trải đều Ca 1, Ca 2, Ca 3
-- - AssigneeId: NULL (tài khoản nhân viên được nạp sau qua script seedUsers.js)
-- - Deadline: Dùng DATEADD(DAY, n, CAST(GETDATE() AS DATE))
--   * Có 6 việc quá hạn chưa hoàn thành (n < 0 và Status != 'Done')
--   * Có 3 việc không có Deadline (NULL)
--   * Các việc còn lại có hạn hôm nay hoặc tương lai gần

INSERT INTO dbo.Tasks (Title, Description, Status, Priority, Deadline, CategoryId, ShiftId, AssigneeId)
VALUES
-- === NHÓM 1: CÔNG VIỆC QUÁ HẠN CHƯA HOÀN THÀNH (6 việc: n < 0, Status != 'Done') ===
(N'Kiểm định định kỳ máy lọc nước RO quầy bar', N'Liên hệ kỹ thuật viên bên lọc nước thay lõi số 1, 2, 3 quá hạn 3 ngày.', N'Pending', N'High', DATEADD(DAY, -3, CAST(GETDATE() AS DATE)), 1, 1, NULL),
(N'Bảo dưỡng và tra dầu máy xay hạt cà phê Eureka', N'Máy phát ra tiếng rít khi xay espresso mịn, cần tháo cối vệ sinh và căn chỉnh lưỡi dao.', N'InProgress', N'High', DATEADD(DAY, -2, CAST(GETDATE() AS DATE)), 1, 1, NULL),
(N'Đối soát chênh lệch hóa đơn bàn 04 ca tối', N'Đơn thanh toán chuyển khoản Momo bàn 04 thiếu 45.000đ so với POS, cần kiểm tra camera.', N'Pending', N'Medium', DATEADD(DAY, -2, CAST(GETDATE() AS DATE)), 5, 2, NULL),
(N'Giặt sấy đồng phục nhân viên dự phòng', N'Đem 10 bộ tạp dề và áo polo dự phòng đi tiệm giặt ủi sấy khô.', N'InProgress', N'Low', DATEADD(DAY, -1, CAST(GETDATE() AS DATE)), 3, 3, NULL),
(N'Nhập bổ sung 5 thùng sữa tươi thanh trùng Barista', N'Sữa tươi thanh trùng sắp cạn kho, cần nhập gấp từ nhà phân phối Đà Lạt Milk.', N'Pending', N'High', DATEADD(DAY, -1, CAST(GETDATE() AS DATE)), 4, 1, NULL),
(N'Thay bóng đèn rọi ray khu vực ban công tầng 2', N'Bóng đèn rọi số 3 và số 5 bị chập chờn gây tối khu bàn ngoài trời.', N'Pending', N'Medium', DATEADD(DAY, -4, CAST(GETDATE() AS DATE)), 3, 2, NULL),

-- === NHÓM 2: CÔNG VIỆC ĐANG CHỜ XỬ LÝ (PENDING) CÓ HẠN HOẶC KHÔNG HẠN (7 việc) ===
(N'Chuẩn bị 5 lít syrup đường đen nấu mới', N'Nấu đường đen theo công thức tỉ lệ 1:1, để nguội và đóng chai thủy tinh vô trùng.', N'Pending', N'Medium', DATEADD(DAY, 0, CAST(GETDATE() AS DATE)), 1, 1, NULL),
(N'Sắp xếp và lau bụi kệ sách truyện tầng lửng', N'Xếp gọn các đầu sách kỹ năng và tiểu thuyết theo thứ tự chữ cái.', N'Pending', N'Low', DATEADD(DAY, 1, CAST(GETDATE() AS DATE)), 2, 2, NULL),
(N'In lại menu giấy gập 3 mẫu mới tháng 11', N'Lấy 50 bản in menu từ tiệm in ấn về đóng góc mica.', N'Pending', N'Medium', DATEADD(DAY, 2, CAST(GETDATE() AS DATE)), 5, 1, NULL),
(N'Lập danh sách mua văn phòng phẩm và giấy in bill K80', N'Kiểm kê cuộn giấy in nhiệt máy POS và bút dạ quang ghi order.', N'Pending', N'Low', DATEADD(DAY, 3, CAST(GETDATE() AS DATE)), 4, 3, NULL),
(N'Vệ sinh khử khuẩn tủ lạnh bảo quản bánh ngọt', N'Dọn sạch các ngăn tủ mát trưng bày mousse, cheesecake, lau bằng dung dịch cồn thực phẩm.', N'Pending', N'Medium', DATEADD(DAY, 1, CAST(GETDATE() AS DATE)), 3, 3, NULL),
(N'Cập nhật playlist nhạc Acoustic nhẹ nhàng buổi sáng', N'Tạo danh sách phát Spotify 100 bài không lời cho không gian làm việc.', N'Pending', N'Low', NULL, 2, 1, NULL),
(N'Đề xuất mẫu ly giáng sinh phiên bản giới hạn', N'Tìm báo giá 3 đơn vị cung cấp ly sứ in logo Noel 2026.', N'Pending', N'Medium', NULL, 4, 2, NULL),

-- === NHÓM 3: CÔNG VIỆC ĐANG THỰC HIỆN (IN PROGRESS) (6 việc) ===
(N'Ủ lạnh 10 bình Cold Brew Arabica Cầu Đất', N'Ngâm ủ bột cà phê tỉ lệ 1:8 trong tủ mát nhiệt độ 4-6 độ C đủ 18 tiếng.', N'InProgress', N'High', DATEADD(DAY, 0, CAST(GETDATE() AS DATE)), 1, 1, NULL),
(N'Kiểm tra và khử cặn canxi máy pha cà phê La Marzocco', N'Chạy bột vệ sinh Cafiza qua họng grouphead 1 và 2, xả sạch vòi hơi steam wand.', N'InProgress', N'High', DATEADD(DAY, 0, CAST(GETDATE() AS DATE)), 1, 3, NULL),
(N'Chăm sóc và tỉa cây cảnh khu vực giếng trời', N'Tưới nước cây trầu bà, bón phân vi sinh cho chậu bàng Singapore sảnh chính.', N'InProgress', N'Low', DATEADD(DAY, 1, CAST(GETDATE() AS DATE)), 3, 1, NULL),
(N'Đóng gói 20 hộp cà phê hạt rang mộc gửi bưu điện', N'Đóng gói cà phê Robusta Honey và Arabica hạt cho khách đặt qua Fanpage.', N'InProgress', N'Medium', DATEADD(DAY, 1, CAST(GETDATE() AS DATE)), 5, 2, NULL),
(N'Kiểm đếm hạn sử dụng siro Monin và sốt Torani trong kho', N'Kiểm tra tem nhãn hạn dùng siro Vani, Hạt dẻ, Bạc hà, dán nhãn ưu tiên dùng trước.', N'InProgress', N'Medium', DATEADD(DAY, 2, CAST(GETDATE() AS DATE)), 4, 2, NULL),
(N'Khảo sát ý kiến khách hàng về món Trà mãng cầu xiêm mới', N'Nhờ 15 khách hàng thân thiết thử vị và chấm điểm phiếu khảo sát.', N'InProgress', N'Low', DATEADD(DAY, 3, CAST(GETDATE() AS DATE)), 2, 2, NULL),

-- === NHÓM 4: CÔNG VIỆC ĐÃ HOÀN THÀNH (DONE) (11 việc) ===
(N'Khởi động máy espresso và test shot chiết xuất chuẩn', N'Cân đong 18g in - 36g out thời gian 27 giây, crema nâu vàng sánh mịn đạt chuẩn.', N'Done', N'High', DATEADD(DAY, 0, CAST(GETDATE() AS DATE)), 1, 1, NULL),
(N'Lau dọn và sát khuẩn toàn bộ bàn ghế tầng trệt ca sáng', N'Dùng khăn lau chuyên dụng cồn 70 độ sát khuẩn 12 bàn gỗ và ghế sofa.', N'Done', N'Medium', DATEADD(DAY, 0, CAST(GETDATE() AS DATE)), 3, 1, NULL),
(N'Kiểm kê tiền mặt đầu ca và chuẩn bị tiền lẻ thối', N'Đếm đủ 2.000.000đ tiền mặt trong két lẻ với các mệnh giá 1k, 2k, 5k, 10k, 20k.', N'Done', N'High', DATEADD(DAY, 0, CAST(GETDATE() AS DATE)), 5, 1, NULL),
(N'Nhập 20kg đá bi sạch từ nhà máy đá tinh khiết', N'Tiếp nhận đá, đổ vào thùng xốp giữ nhiệt quầy bar, kiểm tra chứng nhận an toàn.', N'Done', N'High', DATEADD(DAY, 0, CAST(GETDATE() AS DATE)), 4, 1, NULL),
(N'Châm đầy khay đường gói, ống hút cỏ bàng và khăn giấy', N'Nạp đầy đủ đồ dùng tiện ích tại bàn trung tâm phục vụ khách.', N'Done', N'Low', DATEADD(DAY, 0, CAST(GETDATE() AS DATE)), 2, 1, NULL),
(N'Thay bình nước rửa chén và xà phòng rửa tay WC', N'Thay túi refill xà phòng Lifebuoy phòng vệ sinh nam và nữ.', N'Done', N'Low', DATEADD(DAY, -1, CAST(GETDATE() AS DATE)), 3, 3, NULL),
(N'Sơ chế 5kg đào ngâm và 3kg dâu tây tươi', N'Cắt lát đào, nấu nước ngâm đường phèn; dâu tây rửa nước muối khử khuẩn bảo quản mát.', N'Done', N'Medium', DATEADD(DAY, -1, CAST(GETDATE() AS DATE)), 1, 1, NULL),
(N'In bảng mã VietQR thanh toán để bàn cho 10 bàn mới', N'In mã QR tài khoản ngân hàng quán cafe kèm số bàn dán góc phải mặt kính.', N'Done', N'Medium', DATEADD(DAY, -2, CAST(GETDATE() AS DATE)), 5, 2, NULL),
(N'Thu gom rác hữu cơ bã cà phê giao cho vườn ươm làm phân', N'Đóng gói 3 bao bã cà phê khô gửi cho đơn vị tái chế nông nghiệp sạch.', N'Done', N'Low', DATEADD(DAY, -3, CAST(GETDATE() AS DATE)), 3, 3, NULL),
(N'Thanh toán hóa đơn tiền điện và tiền nước tháng 10', N'Nộp tiền điện lực EVN và nước sạch Sawaco qua app ngân hàng đúng hạn.', N'Done', N'High', DATEADD(DAY, -5, CAST(GETDATE() AS DATE)), 5, 1, NULL),
(N'Phân bổ ca làm việc tuần tới cho 6 nhân viên part-time', N'Lên lịch phân ca sáng, tối theo lịch đăng ký học của các bạn sinh viên.', N'Done', N'Medium', DATEADD(DAY, -4, CAST(GETDATE() AS DATE)), 2, 2, NULL);
GO
