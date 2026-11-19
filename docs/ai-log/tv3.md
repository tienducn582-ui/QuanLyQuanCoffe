# Nhật ký AI – TV3 (Công việc)

Công cụ AI: Claude Code (agent chạy trên repo, phiên ngày 19/11/2026). Agent được giao làm lần lượt các prompt TV3-P1 đến TV3-P4 trong kế hoạch 5 ngày, chỉ sửa các file thuộc dòng FILE ĐƯỢC SỬA của TV3, không commit vào nhánh của người khác.

| Ngày | Prompt | Việc nhờ AI | Cách kiểm chứng | Chỗ đã chỉnh sửa / ghi chú |
| :--- | :--- | :--- | :--- | :--- |
| 19/11 | TV3-P1 | Viết `server/routes/tasks.js`: GET danh sách, GET `/:id`, POST, PUT (Admin), PATCH `/:id/status`, DELETE (Admin), JOIN lấy `categoryName`, `shiftName`, `assigneeName`. `categories.js` đã có sẵn (TV1 viết hộ, đã có `verifyToken`) nên giữ nguyên. | Chạy `schema.sql`, `seed.sql`, `npm run seed:users` trên SQL Server 2022 (Docker) rồi gọi API thật: thêm, sửa, đổi trạng thái, xóa đều thấy dữ liệu đổi trong bảng `Tasks`; Staff gọi PUT/DELETE nhận 403. | Bỏ cách lấy id bằng `SCOPE_IDENTITY()` trong ví dụ của `db.js`, dùng `OUTPUT INSERTED.Id` cho gọn. Cột `DATE` của mssql trả kiểu Date nên phải đổi sang chuỗi `YYYY-MM-DD` (`formatDate`). |
| 19/11 | TV3-P2 | Thêm tìm kiếm (LIKE có escape `[ % _`), lọc 4 điều kiện, phân trang OFFSET/FETCH + COUNT riêng, sắp xếp hạn chót tăng dần và NULL cuối. Viết lại `tasks.html`, `tasks.js` dùng API, bỏ hoàn toàn `taskService.js` và LocalStorage; xóa `public/assets/js/taskService.js`. | Tìm "50%" chỉ ra đúng việc có chữ "50%"; lọc `shiftId=1` khớp trang Ca làm của TV1; trang 3 có các việc không hạn chót ở cuối. Kiểm tra trang bằng trình duyệt tự động ở 1280px và 375px. | Ảnh chụp đầu tiên cho thấy ô chọn trạng thái bị cắt chữ và ở 375px tên + mô tả bị tách thành 2 cột. Đã sửa: đặt `min-width` cho ô chọn và bọc nội dung mỗi ô trong một `<div>`. |
| 19/11 | TV3-P3 | Áp `validators.js` (`isString`, `isPositiveInt`, `isISODate`, `isOneOf`, `sendBadRequest`) cho GET, POST, PUT, PATCH; kiểm tra khóa ngoại tồn tại; Frontend giữ bộ lọc + trang sau thao tác, tự lùi trang khi xóa hết trang cuối, khóa nút khi đang gửi, toast cho mọi thao tác. Viết `docs/tests/tv3.http` (39 request, 20 ca biên). | Chạy toàn bộ `tv3.http` với server thật: 39/39 đúng mã mong đợi. Thử trên trình duyệt: tạo một việc để có trang 4, xóa nó, trang tự lùi về 3/3. Thử chuỗi `<b>xss</b>` trong tên việc: hiển thị dạng chữ, không thành thẻ HTML. | Quyết định cho `page` vượt tổng số trang trả 200 với `data: []` (không trả 400) để Frontend tự lùi trang. |
| 19/11 | TV3-P4 | Viết `docs/bao-cao/tv3.md`: mô tả chức năng, bảng API đối chiếu code thật, danh sách 18 ảnh chụp cần có. | Đối chiếu bảng API với từng `router.get/post/put/patch/delete` trong `server/routes/*.js` và mã lỗi `res.status(...)` trong từng file. | Phần ghi chú cho thành viên khác chỉ liệt kê, không tự sửa file của TV1, TV5. |
| — | TV3-P5 | (Chưa làm) Luyện vấn đáp: dùng prompt vấn đáp ở mục 11 với các file `routes/tasks.js`, `public/assets/js/tasks.js`, `public/tasks.html`. | — | Prompt này phải tự trả lời từng câu nên TV3 tự làm. |

## Việc TV3 vẫn phải tự làm

1. Đọc và tự giải thích được từng hàm trong `server/routes/tasks.js` và `public/assets/js/tasks.js` (vấn đáp hỏi riêng từng người).
2. Chạy lại `docs/tests/tv3.http` trên máy mình (Windows, SQL Server thật) và mở `tasks.html` bằng cả hai tài khoản.
3. Chụp 18 ảnh theo mục 3 của `docs/bao-cao/tv3.md`.
4. Điền họ tên, MSSV vào đầu `docs/bao-cao/tv3.md`.
