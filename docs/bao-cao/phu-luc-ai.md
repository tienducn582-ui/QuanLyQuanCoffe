# Phụ Lục: Sử Dụng Công Cụ Trợ Lý AI Trong Dự Án (TV1 Tổng Hợp)

**Nhóm thực hiện:** Nhóm 5 thành viên – Môn Phát triển ứng dụng Web (PROG2008)  
**Công cụ AI sử dụng chính:** Antigravity (Agent trong VS Code), GitHub Copilot  

---

## 1. Mục đích và nguyên tắc ứng dụng AI trong dự án

Trong suốt quá trình 5 ngày triển khai dự án **Cafe Task Manager**, nhóm 5 thành viên đã ứng dụng công cụ AI một cách có phương pháp, trung thực và kiểm soát chặt chẽ:
- **Nguyên tắc hỗ trợ, không thay thế**: Thành viên nhóm là người nắm giữ vai trò thiết kế kiến trúc, làm chủ mã nguồn và kiểm chứng logic nghiệp vụ. AI được sử dụng để sinh mã khung (boilerplate), tối ưu hóa cú pháp SQL, gợi ý test cases và hỗ trợ chuẩn hóa tài liệu báo cáo.
- **Quy tắc làm việc trên Git**: AI không được phép tự động commit, push, hay tự ý thay đổi file ngoài phạm vi phân công của từng thành viên. Toàn bộ code trước khi đưa vào hệ thống đều phải được thành viên xem xét qua `git diff` và chạy thử nghiệm thực tế.
- **Bảo mật thông tin**: Tuyệt đối không đưa thông tin mật khẩu, chuỗi kết nối thật hay khóa bí mật vào prompt của AI hoặc lưu trữ trên mã nguồn Git.

---

## 2. Bảng tổng hợp nhật ký sử dụng AI của các thành viên

Dưới đây là bảng tổng hợp từ nhật ký trung thực tại thư mục `docs/ai-log/`:

| Thành viên | Vai trò | Công cụ AI | Công việc nhờ AI hỗ trợ | Cách thức nhóm kiểm chứng & Chỉnh sửa |
| :---: | :--- | :---: | :--- | :--- |
| **TV1** | Trưởng nhóm, Tích hợp | Antigravity | • Lập kế hoạch cấu trúc thư mục chuẩn (TV1-P0)<br>• Viết khung Backend Express, db.js, auth middleware (TV1-P1)<br>• Viết API Shifts và nối giao diện ca làm (TV1-P2)<br>• Áp dụng validators, rà soát toàn dự án, viết README và báo cáo (TV1-P3, P4) | • Chạy thử máy chủ tại `http://localhost:3000`<br>• Dùng REST Client chạy 14 ca kiểm thử trong `docs/tests/tv1.http`<br>• Trực tiếp thao tác giao diện phân công ca trực bằng cả vai trò Admin và Staff<br>• Chỉnh sửa xử lý định dạng kiểu TIME của SQL Server |
| **TV2** | Tài khoản, Bảo mật | Antigravity | • Viết API đăng ký, đăng nhập, hồ sơ cá nhân (TV2-P1)<br>• Xây dựng bộ thư viện `validators.js`<br>• Soạn tài liệu ma trận phân quyền và rà soát bảo mật (TV2-P2, P3) | • Chạy 4 kịch bản trong `docs/tests/tv2.http`<br>• Kiểm tra trực tiếp trong CSDL đảm bảo mật khẩu đã được băm bằng bcryptjs (10 rounds)<br>• Thử nghiệm chặn đăng nhập brute-force (rate-limit 20 lần/15 phút) |
| **TV3** | Nghiệp vụ Công việc | Antigravity | • Khung CRUD công việc, tìm kiếm LIKE, phân trang OFFSET...FETCH (TV3-P1, P2)<br>• Xây dựng các ca biên và xử lý sự kiện giao diện (TV3-P3) | • Dùng `docs/tests/tv3.http` kiểm tra phân quyền (Staff gọi DELETE bị 403)<br>• Kiểm tra khử ký tự đặc biệt `%`, `_` trong tìm kiếm |
| **TV4** | CSDL, Thống kê, Test | Antigravity | • Thiết kế `schema.sql`, `seed.sql` 30 công việc mẫu thực tế (TV4-P1)<br>• Viết API thống kê `stats.js` và bảng 25 Test Cases (TV4-P2)<br>• Báo cáo kiểm thử CSDL và ERD (TV4-P4) | • Chạy script trong Azure Data Studio/SSMS<br>• Chạy thử lệnh chèn sai CHECK constraint để kiểm chứng CSDL từ chối<br>• Chạy 25 ca kiểm thử thực tế và ghi nhận kết quả |
| **TV5** | Giao diện chung | Antigravity | • Thiết kế CSS nâu cafe responsive (TV5-P1)<br>• Xây dựng module `api.js`, `ui.js` và 3 trang auth (TV5-P2)<br>• Rà soát responsive ở 375px, 768px, 1200px (TV5-P3)<br>• Dàn ý slide và kịch bản video demo (TV5-P4) | • Mở DevTools kiểm tra trên các kích thước màn hình điện thoại<br>• Kiểm tra hoạt động của Toast, Navbar toggle và Modal trên trình duyệt thực |

---

## 3. Những hạn chế của AI và bài học kinh nghiệm

Trong quá trình đồng hành cùng AI, nhóm đã phát hiện và xử lý nhiều điểm hạn chế quan trọng:
1. **Kiểu dữ liệu đặc thù của SQL Server**: Khi truy vấn cột kiểu `TIME` từ SQL Server bằng thư viện `mssql`, kết quả trả về là một đối tượng `Date` UTC (thay vì chuỗi). Nếu không có sự can thiệp của thành viên để viết hàm format sang chuỗi `'HH:mm'`, Frontend sẽ bị hiển thị sai lệch giờ.
2. **Xung đột mã nguồn khi làm việc song song**: Khi nhiều thành viên cùng nhờ AI sinh mã, việc trùng lặp tên hàm hoặc đường dẫn tĩnh có thể xảy ra. Nhóm đã kịp thời thống nhất hợp đồng kỹ thuật tại [AI_CONTEXT.md](file:///c:/Users/NgTienDuc/Project/QuanLyQuanCoffe-main/AI_CONTEXT.md) từ Ngày 0 để làm kim chỉ nam xuyên suốt.
3. **Ý nghĩa học tập**: Việc hiểu tường tận từng dòng code do AI gợi ý giúp các thành viên tự tin giải trình trong các buổi vấn đáp trực tiếp với giảng viên, nắm vững các kiến thức cốt lõi từ cơ chế bất đồng bộ của JavaScript, chu trình Middleware trong Express cho đến thiết kế chuẩn hóa cơ sở dữ liệu quan hệ.
