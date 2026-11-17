# Báo Cáo Rà Soát & Hướng Dẫn Ghép Báo Cáo Toàn Đội (TV1 - Trưởng Nhóm)

**Ngày thực hiện:** 17/11/2026  
**Người thực hiện:** Thành viên 1 (Trưởng nhóm, tích hợp hệ thống)  
**Tài liệu đối chiếu:** `docs/bao-cao/tv1.md`, `tv4.md`, `tv5.md`, `docs/test-cases.md`, `README.md`, `AI_CONTEXT.md`

---

## 1. Bảng rà soát chi tiết các phần báo cáo cá nhân

| Thành viên | File báo cáo | Nội dung phụ trách | Đánh giá & Chỗ cần chỉnh sửa | Mức độ |
| :---: | :--- | :--- | :--- | :---: |
| **TV1** | `docs/bao-cao/tv1.md` | Giới thiệu, Yêu cầu, Kiến trúc 3 tầng (Mermaid), Hướng dẫn sử dụng | **Đã hoàn thiện đầy đủ**. Đúng 10 nhóm chức năng, sơ đồ Mermaid chuẩn, luồng xử lý thực tế từ Client qua API đến SQL Server. | Chuẩn |
| **TV2** | `docs/bao-cao/tv2.md` | Use Case (PlantUML), 5 Use Case chính, Ma trận bảo mật & phân quyền | **Cần bổ sung file**: TV2 đã push `docs/bao-mat-ma-tran-quyen.md`, `docs/bao-mat-ra-soat.md` nhưng chưa ghép thành `tv2.md`. Đề xuất TV2 dùng nội dung từ 2 file bảo mật ghép sang `tv2.md`. | Trung bình |
| **TV3** | `docs/bao-cao/tv3.md` | Mô tả chức năng CRUD công việc, Danh sách API, Danh sách ảnh chụp màn hình | **Đang chờ TV3**: Cần hoàn thiện API `tasks.js` và cập nhật danh sách ảnh chụp màn hình (trạng thái rỗng, tìm kiếm/lọc, phân trang, giao diện di động). | Cao |
| **TV4** | `docs/bao-cao/tv4.md` | Thiết kế CSDL (Mermaid ERD), Ràng buộc 5 bảng, Tổng kết kiểm thử, Hướng phát triển | **Đã hoàn thiện xuất sắc**: Có ERD chi tiết, giải thích khóa chính/ngoại, UNIQUE, CHECK, ON DELETE SET NULL và bảng đánh giá 25 test case. | Chuẩn |
| **TV5** | `docs/bao-cao/tv5.md` | Giao diện người dùng, Bố cục Responsive (375px, 768px, 1200px), Toast, Validation Client | **Đã hoàn thiện tốt**: Phân tích chi tiết hệ màu cafe, bảng responsive dạng card trên mobile, các hàm tiện ích UI. | Chuẩn |

---

## 2. Đề xuất mục lục chuẩn và trình tự ghép báo cáo tổng hợp (Word / PDF)

Báo cáo tổng hợp của cả nhóm nên được trình bày theo cấu trúc 8 chương khoa học như sau:

- **TRANG BÌA & THÔNG TIN NHÓM**
  - Tên đề tài: Hệ Thống Quản Lý Công Việc & Ca Làm Quán Cà Phê (Cafe Task Manager)
  - Danh sách 5 thành viên, MSSV và phần trăm đóng góp
- **LỜI MỞ ĐẦU & MỤC LỤC**
- **CHƯƠNG 1: GIỚI THIỆU ĐỀ TÀI & KHẢO SÁT BÀI TOÁN** *(Trích từ `tv1.md`)*
  - 1.1. Bối cảnh và lý do chọn đề tài
  - 1.2. Mục tiêu nghiên cứu và xây dựng hệ thống
- **CHƯƠNG 2: PHÂN TÍCH YÊU CẦU HỆ THỐNG** *(Trích từ `tv1.md` và `tv2.md`)*
  - 2.1. Yêu cầu chức năng (Đối chiếu 10 nhóm tiêu chuẩn của đề tài)
  - 2.2. Yêu cầu phi chức năng (Hiệu năng, bảo mật, tính tương thích)
  - 2.3. Sơ đồ Use Case tổng quan và đặc tả 5 Use Case chính
- **CHƯƠNG 3: THIẾT KẾ CƠ SỞ DỮ LIỆU & KIẾN TRÚC** *(Trích từ `tv1.md` và `tv4.md`)*
  - 3.1. Thiết kế kiến trúc 3 tầng (3-tier Architecture) & Sơ đồ luồng dữ liệu
  - 3.2. Sơ đồ quan hệ thực thể (ERD) 5 bảng
  - 3.3. Chi tiết cấu trúc các bảng dữ liệu và ràng buộc toàn vẹn
- **CHƯƠNG 4: THIẾT KẾ GIAO DIỆN & TRẢI NGHIỆM NGƯỜI DÙNG** *(Trích từ `tv5.md`)*
  - 4.1. Phong cách thiết kế tông màu cà phê và hệ thống Typography
  - 4.2. Thiết kế giao diện đa thiết bị (Responsive Design 375px - 768px - 1200px)
  - 4.3. Tương tác người dùng: Thông báo Toast, Validation form, Trạng thái Loading và Empty State
- **CHƯƠNG 5: CÀI ĐẶT HỆ THỐNG VÀ DANH SÁCH API** *(Trích từ `tv1.md`, `tv3.md`, `README.md`)*
  - 5.1. Công nghệ cài đặt (Node.js, Express, SQL Server, Vanilla JS)
  - 5.2. Danh sách và đặc tả các RESTful API endpoints
  - 5.3. Hướng dẫn cài đặt, cấu hình CSDL và khởi chạy môi trường
- **CHƯƠNG 6: BẢO MẬT HỆ THỐNG & PHÂN QUYỀN** *(Trích từ `tv2.md` và `tv1.md`)*
  - 6.1. Xác thực người dùng bằng JWT (JSON Web Token)
  - 6.2. Phân quyền truy cập theo vai trò (RBAC - Admin & Staff)
  - 6.3. Phòng chống tấn công Brute-force (Rate Limit), SQL Injection và XSS
- **CHƯƠNG 7: KẾT QUẢ THỰC NGHIỆM & KIỂM THỬ HỆ THỐNG** *(Trích từ `tv4.md`, `docs/test-cases.md`)*
  - 7.1. Kịch bản kiểm thử (Test Cases) và kết quả thực tế
  - 7.2. Hình ảnh minh chứng các chức năng chạy thực tế trên hệ thống
- **CHƯƠNG 8: KẾT LUẬN & HƯỚNG PHÁT TRIỂN** *(Trích từ `tv4.md` và `tv1.md`)*
  - 8.1. Đánh giá mức độ hoàn thành so với yêu cầu
  - 8.2. Các hướng nâng cấp trong tương lai (Màn hình bếp KDS, Tích hợp thanh toán VietQR, Quản lý kho định lượng BOM)
- **TÀI LIỆU THAM KHẢO**
- **PHỤ LỤC: NHẬT KÝ SỬ DỤNG CÔNG CỤ AI TRONG DỰ ÁN** *(Trích từ `docs/bao-cao/phu-luc-ai.md`)*
