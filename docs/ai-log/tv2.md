# Nhật Ký Sử Dụng Công Cụ AI (AI Log) – Thành Viên 2 (TV2)

- **Dự án:** Cafe Task Manager (`PROG2008`)
- **Thành viên:** TV2 (Xác thực, Phân quyền, Bảo mật & Khách hàng tích điểm)
- **Công cụ AI sử dụng:** Antigravity

---

| Mốc / Ngày | Mã Prompt | Việc nhờ AI | Cách kiểm chứng | Chỗ tôi đã chỉnh / Ghi chú |
|:---:|:---|:---|:---|:---|
| Giai đoạn lõi (Ngày 2–3) | `TV2-P1`, `TV2-P2`, `TV2-P3` | Xây dựng `validators.js`, `seedUsers.js`, API `/api/auth`, `/api/me`, `/api/users`, giao diện `auth.js`, bộ test `docs/tests/tv2.http`, ma trận quyền và rà soát bảo mật toàn dự án | Đối chiếu schema `Users`/`Roles`, kiểm tra băm `bcryptjs`, giới hạn đăng nhập `express-rate-limit` và chạy thử các luồng xác thực | Chuẩn hóa thông báo lỗi tiếng Việt đồng bộ với `ui.js`, đảm bảo không trả `PasswordHash` trong mọi phản hồi API |
| Mở rộng (`[TV2-X8]`) | `TV2-X8` | Thêm `isPhone(v)` vào `server/utils/validators.js`; triển khai `server/routes/customers.js`, `public/customers.html`, `public/assets/js/customers.js`; bổ sung test `docs/tests/tv2.http` và cập nhật `docs/bao-mat-ma-tran-quyen.md` | Đối chiếu từng cột của bảng `dbo.Customers` trong `database/schema-mo-rong.sql` và các hàm `validateField`, `renderPagination` trong `public/assets/js/ui.js`; kiểm tra encoding UTF-8 và `git status --short` | Bổ sung chặn tràn số nguyên 32-bit SQL `INT` (`2147483647`), bắt mã lỗi SQL trùng khóa (`2627`/`2601`) trả `409`, cập nhật trừ điểm nguyên tử `WHERE Id = @id AND Points >= @points`. Chưa chạy được test API/UI thực tế trên môi trường không có Node/SQL Server |
| Tổng hợp (`[TV2-XD]`) | `TV2-XD` | Tạo `docs/bao-cao/tv2.md` (ghép Use Case, bảo mật, phần `[TV2-X8]`, bảng test mở rộng, ảnh cần chụp) và `docs/ai-log/tv2.md`; cập nhật đầy đủ bảng phân quyền mở rộng hiện có (`TV2-X8`, `TV4-X6`, `TV4-X7`) trong `docs/bao-mat-ma-tran-quyen.md` | Đọc đối chiếu trực tiếp các router `server/routes/customers.js`, `stats.js`, `ingredients.js` trong nhánh `feature/tv2` | Để trống cột `Kết quả thực tế` và `Đạt?` trong bảng `Test mở rộng` do chưa chạy kiểm thử trực tiếp với SQL Server và trình duyệt |
