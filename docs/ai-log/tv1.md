# Nhật ký AI – TV1 (Trưởng nhóm, tích hợp)

| Ngày | Prompt | Công việc thực hiện | Kết quả kiểm chứng | Ghi chú & Tự chỉnh sửa |
| :--- | :--- | :--- | :--- | :--- |
| Ngày 0 | TV1-P0 | Khảo sát thư mục, lập bảng di chuyển file, tạo AI_CONTEXT.md, cấu trúc thư mục chuẩn | `git status` sạch, cấu trúc thư mục mới nằm gọn trong `public/`, `database/`, `server/`, `docs/` | Đã gắn tag `v0-giuaky`, tạo nhánh `dev` và `feature/tv1` |
| Ngày 1 | TV1-P1 | Tạo Khung Backend (Express, db.js, auth middleware, errorHandler, 7 router khung, package.json, .env.example) | Chạy `npm install` thành công, kiểm tra nạp `server.js` chạy tốt tại port 3000 | Cấu hình tham số hóa SQL, export query và pool theo đúng hợp đồng |
| Ngày 2 | TV1-P2 | Xây dựng API ca làm việc (routes/shifts.js) và giao diện ca làm (public/shifts.html, assets/js/shifts.js), kèm test docs/tests/tv1.http | Kiểm tra cấu trúc router shifts đầy đủ GET, POST, PUT, DELETE có phân quyền Admin/Staff; định dạng TIME sang 'HH:mm'; nối API vào trang shifts.html | Dùng đúng API contract, hiển thị danh sách task theo ca, hỗ trợ đổi trạng thái task ngay trên ca |
