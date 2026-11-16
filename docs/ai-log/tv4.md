# NHẬT KÝ SỬ DỤNG CÔNG CỤ AI (AI LOG) - THÀNH VIÊN TV4
## DỰ ÁN: CAFE TASK MANAGER
- **Thành viên:** TV4
- **Vai trò chuyên trách:** Cơ sở dữ liệu, Thống kê, Kiểm thử hệ thống
- **Công cụ AI sử dụng:** Antigravity (Agent AI tích hợp trong VS Code)
- **Mục tiêu:** Ghi nhận trung thực các tác vụ phối hợp với AI trong 5 ngày thực hiện dự án môn Lập trình ứng dụng Web (PROG2008).

---

## Bảng Chi Tiết Nhật Ký Sử Dụng AI

| Ngày / Mốc | Thành viên | Công cụ AI | Việc nhờ AI (Mã Prompt) | Cách kiểm chứng thực tế | Chỗ tôi (TV4) đã chỉnh sửa / Tinh chỉnh lại |
|:---:|:---:|:---:|:---|:---|:---|
| **Ngày 1 (Mốc 1A)** | TV4 | Antigravity | **TV4-P1:** Thiết kế script tạo bảng `database/schema.sql` và dữ liệu mẫu `database/seed.sql` cho SQL Server | Chạy script trực tiếp trong SSMS và Azure Data Studio. Chạy lệnh `SELECT COUNT(*) FROM Tasks` ra đúng 30; thử chạy lệnh INSERT task có `Status = 'InvalidStatus'` để kiểm tra ràng buộc `CHECK` từ chối | Tinh chỉnh lại câu lệnh tính ngày `Deadline` bằng `DATEADD(DAY, n, CAST(GETDATE() AS DATE))` để các công việc quá hạn luôn luôn đúng mốc thời gian dù chạy vào ngày nào; bổ sung tiền tố `N'...'` cho toàn bộ văn bản tiếng Việt để tránh lỗi hiển thị font. Thêm chính sách `ON DELETE SET NULL` cho 3 khóa ngoại của bảng `Tasks`. |
| **Ngày 2 (Mốc 2A)** | TV4 | Antigravity | **TV4-P2:** Viết Backend Router `server/routes/stats.js` (GET `/api/stats`), xây dựng bảng 26 ca kiểm thử `docs/test-cases.md`, và tạo file `docs/tests/tv4.http` | Gửi request qua tiện ích REST Client trong VS Code với token Admin và Staff. Chạy các câu truy vấn `GROUP BY` trực tiếp trong SSMS để đối chiếu kết quả trả về của API khớp 100% | Bổ sung mệnh đề `COALESCE(c.Name, N'Chưa phân loại')` trong truy vấn danh mục để không bỏ sót các công việc chưa gắn danh mục; thêm logic tính tỷ lệ hoàn thành làm tròn 1 chữ số thập phân (`completionRate`). Bổ sung kiểm thử ca biên cho các ký tự đặc biệt trong bảng test cases. |
| **Ngày 3 (Mốc 3A)** | TV4 | Antigravity | **TV4-P3:** Tái cấu trúc trang `public/statistics.html` và viết lại `public/assets/js/statistics.js`, kết nối API thật, loại bỏ hoàn toàn LocalStorage và `taskService.js` | Mở trang `statistics.html` trên trình duyệt sau khi khởi động server Node.js. Kiểm tra hiển thị 6 thẻ KPI, kiểm tra độ mượt của 3 biểu đồ Chart.js; bấm thử nút "Làm mới số liệu" và in PDF | Thêm hàm `destroyAllCharts()` để hủy instance Chart.js cũ trước khi vẽ lại, khắc phục triệt để lỗi "Canvas is already in use" khi người dùng bấm làm mới liên tục; cấu hình chuyển trục `indexAxis: 'y'` cho biểu đồ danh mục để tên các nhóm việc hiển thị rõ ràng, không bị che khuất. |
| **Ngày 4 (Mốc 4A)** | TV4 | Antigravity | **TV4-P4:** Soạn thảo báo cáo kỹ thuật `docs/bao-cao/tv4.md` gồm sơ đồ Mermaid ERD, mô tả chi tiết 5 bảng, phân tích toàn vẹn dữ liệu, tổng kết kiểm thử và định hướng mở rộng | Đưa mã Mermaid lên trang `mermaid.live` để kiểm tra cú pháp và render sơ đồ trực quan; rà soát từng thuộc tính bảng khớp chính xác với `schema.sql` thực tế | Bổ sung phần đối chiếu chi tiết giữa file `SQLQuery1.sql` cũ của giữa kỳ và cấu trúc mới; phân tích lý do nghiệp vụ của việc chọn `ON DELETE SET NULL` thay vì Cascade; bổ sung 6 phân hệ mở rộng thực tế cho quán cafe (POS, KDS, VietQR, BOM kho, Loyalty, Chấm công). |
| **Ngày 5 (Mốc 5A & 5B)** | TV4 | Antigravity | **TV4-P5 & TV4-P6:** Chạy lại toàn bộ 26 test cases trên bản clone sạch, cập nhật báo cáo và chuẩn bị bộ câu hỏi ôn tập vấn đáp môn học | Chạy toàn bộ luồng chức năng từ giao diện và REST Client trên thư mục clone mới; tự trả lời 10 câu hỏi vấn đáp mô phỏng với các chủ đề Web cốt lõi | Bổ sung các câu hỏi chuyên sâu về cơ chế chống SQL Injection qua tham số hóa truy vấn của thư viện `mssql`, giải thích chi tiết luồng dữ liệu bất đồng bộ từ fetch qua API đến CSDL và vẽ lại giao diện Chart.js. |

---

## Đánh Giá Chung Về Việc Ứng Dụng AI Của TV4
- **Điểm mạnh khi dùng AI:** Giúp sinh mã SQL mẫu nhanh chóng, chuẩn hóa cú pháp Mermaid ERD, tạo khung kiểm thử REST Client chuyên nghiệp và cấu trúc báo cáo học thuật chuẩn mực.
- **Vai trò then chốt của con người (TV4):**
  - Trực tiếp kiểm thử, chạy thực tế mã SQL trên hệ quản trị CSDL SQL Server để xác minh tính đúng đắn.
  - Tinh chỉnh nghiệp vụ thực tế của ngành F&B (xử lý công việc quá hạn, bảo toàn lịch sử công việc khi xóa danh mục).
  - Nắm vững bản chất mã nguồn để làm chủ hệ thống và sẵn sàng giải trình thuyết phục trong buổi vấn đáp bảo vệ đồ án.
