# Báo Cáo Rà Soát Toàn Dự Án (TV1 - Trưởng Nhóm)

**Ngày thực hiện:** 17/11/2026  
**Người thực hiện:** Thành viên 1 (Kiến trúc & Tích hợp hệ thống)  
**Tình trạng chung:** Hệ thống đã đồng bộ toàn diện giữa 5 thành viên (TV1, TV2, TV4, TV5 và khung TV3).

---

## 1. Bảng rà soát chi tiết các thành phần trong dự án

| Người sở hữu | File / Module | Vấn đề rà soát | Mức độ | Trạng thái & Cách sửa |
| :--- | :--- | :--- | :---: | :--- |
| **TV1** | `server/routes/shifts.js` | Áp dụng `validators.js` cho mọi endpoint nhận tham số (`id`, `name`, `startTime`, `endTime`) | Cao | **Đã sửa**: Sử dụng `isString`, `isTimeHHmm`, `isPositiveInt`, `sendBadRequest`. |
| **TV1** | `server/middleware/auth.js` | Kiểm tra định dạng lỗi JSON khi thiếu hoặc sai token | Trung bình | **Đã chuẩn hóa**: Trả về 401 khi token sai/hết hạn; 403 khi không đủ role. |
| **TV1** | `server/middleware/errorHandler.js` | Không để lộ stack trace hay cấu hình kết nối CSDL | Cao | **Đã chuẩn hóa**: Log chi tiết ra server console; chỉ trả `{ success: false, message: 'Lỗi hệ thống' }` mã 500 ra client. |
| **TV2** | `server/routes/auth.js`, `me.js` | Kiểm tra băm mật khẩu bcrypt, JWT expiration, rate-limiting | Cao | **Hoàn thành tốt**: Có rate-limit 20 lần/15 phút cho login, băm 10 rounds, không lộ PasswordHash. |
| **TV3** | `server/routes/tasks.js` | Cần hoàn thiện CRUD công việc, tìm kiếm LIKE escape, phân trang OFFSET...FETCH | Cao | **Đang chờ TV3**: TV3 sẽ triển khai chi tiết dựa trên CSDL của TV4 và router khung. |
| **TV4** | `database/schema.sql`, `seed.sql`, `stats.js` | Kiểm tra ràng buộc CSDL, index và API thống kê | Cao | **Hoàn thành xuất sắc**: Schema chuẩn 5 bảng, ON DELETE SET NULL, index hiệu năng, 30 công việc mẫu với DATEADD. |
| **TV5** | `public/assets/js/api.js`, `ui.js`, `style.css` | Khung giao diện responsive, các hàm tiện ích UI chuẩn | Trung bình | **Hoàn thành tốt**: Navbar tự co giãn, toast notification, validateField hỗ trợ hiển thị lỗi tiếng Việt. |

---

## 2. Kiểm tra tính tuân thủ các quy tắc cốt lõi
1. **Không lộ chuỗi kết nối / mật khẩu**: Tất cả cấu hình nhạy cảm được đưa vào `.env` (được chặn trong `.gitignore`). `.env.example` chỉ chứa placeholder mẫu.
2. **Không dùng LocalStorage cho nghiệp vụ**: Nghiệp vụ ca làm và thống kê đều đã chuyển sang dùng `apiFetch()` gọi trực tiếp từ backend CSDL.
3. **Chống SQL Injection**: 100% các câu truy vấn trong `shifts.js`, `categories.js`, `auth.js`, `stats.js` đều dùng cú pháp `@param` qua helper `query()`.
4. **Phân quyền người dùng (RBAC)**: Đã được thực thi ở cả tầng Backend (`requireRole('Admin')`) và ẩn/hiện nút bấm tương ứng ở tầng Frontend.
