# Nhật Ký Sử Dụng Công Cụ AI (AI Log) – Thành Viên 2 (TV2)

- **Dự án:** Cafe Task Manager (`PROG2008`)
- **Thành viên:** TV2 (Xác thực, Phân quyền, Bảo mật & Khách hàng tích điểm)
- **Công cụ AI sử dụng:** Antigravity

---

| Mốc / Ngày | Mã Prompt | Việc nhờ AI | Cách kiểm chứng | Chỗ tôi đã chỉnh / Ghi chú |
|:---:|:---|:---|:---|:---|
| Giai đoạn lõi (Ngày 2–3) | `TV2-P1`, `TV2-P2`, `TV2-P3` | Xây dựng `validators.js`, `seedUsers.js`, API `/api/auth`, `/api/me`, `/api/users`, giao diện `auth.js`, bộ test `docs/tests/tv2.http`, ma trận quyền và rà soát bảo mật toàn dự án | Đối chiếu schema `Users`/`Roles`, kiểm tra băm `bcryptjs`, giới hạn đăng nhập `express-rate-limit` và chạy thử các luồng xác thực | Chuẩn hóa thông báo lỗi tiếng Việt đồng bộ với `ui.js`, đảm bảo không trả `PasswordHash` trong mọi phản hồi API |
| Mở rộng (`[TV2-X8]`) | `TV2-X8` | Thêm `isPhone(v)` vào `server/utils/validators.js`; triển khai `server/routes/customers.js`, `public/customers.html`, `public/assets/js/customers.js`; bổ sung test `docs/tests/tv2.http` và cập nhật `docs/bao-mat-ma-tran-quyen.md` | Chạy `schema.sql`, `seed.sql`, `schema-mo-rong.sql`, `seed-mo-rong.sql` và `seedUsers.js` trên SQL Server thật; chạy 18 ca kiểm thử tích hợp API (`/api/customers`, race-condition đổi điểm song song) và kiểm thử E2E trên Edge qua `.local-test/` ở `1200x800`, `768x1024`, `375x667` | Bổ sung chặn tràn số nguyên 32-bit SQL `INT` (`2147483647`), bắt mã lỗi SQL trùng khóa (`2627`/`2601`) trả `409`, cập nhật trừ điểm nguyên tử `WHERE Id = @id AND Points >= @points`. Sau khi xem ảnh chụp màn hình `375px`, bọc `<span><strong>...</strong> điểm</span>` để số điểm không bị tách khỏi chữ `điểm` trong flex card |
| Tổng hợp (`[TV2-XD]`) | `TV2-XD` | Tạo `docs/bao-cao/tv2.md` (ghép Use Case, bảo mật, phần `[TV2-X8]`, bảng test mở rộng, ảnh cần chụp) và `docs/ai-log/tv2.md`; cập nhật đầy đủ bảng phân quyền mở rộng hiện có (`TV2-X8`, `TV4-X6`, `TV4-X7`) trong `docs/bao-mat-ma-tran-quyen.md` | Đọc đối chiếu trực tiếp các router `server/routes/customers.js`, `stats.js`, `ingredients.js` trên nhánh `feature/tv2` và điền kết quả kiểm thử thật từ CSDL + Edge | Hoàn thiện toàn bộ 6 dòng bảng `Test mở rộng` đạt 6/6 và lưu ảnh chụp minh chứng trong `.local-test/screenshots/` |
