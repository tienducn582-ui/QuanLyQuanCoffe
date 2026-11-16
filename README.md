# Cafe Task Manager - Hệ Thống Quản Lý Công Việc & Vận Hành Quán Cafe

Ứng dụng web quản lý quy trình công việc và vận hành quán Cafe xây dựng bằng HTML5, CSS3 và Vanilla JavaScript thuần. Dự án được thiết kế theo chuẩn phân tầng, giao diện Responsive hiện đại, hỗ trợ Dark/Light Mode và lưu trữ bền vững bằng LocalStorage.

## Quản lý ca làm việc & nhân sự

Mở [Phân công ca trực](pages/page-3.html) để sử dụng phân hệ nhân sự. Logic dữ liệu nằm trong [shiftService.js](assets/js/shiftService.js), giao diện trong [shifts.js](assets/js/shifts.js). Dữ liệu thật ban đầu để trống, không tạo chấm công hoặc doanh thu mẫu.

1. Thêm nhân viên thuộc Barista, Thu ngân, Phục vụ hoặc Bảo vệ. Có thể ngừng làm việc khi không còn ca đang mở hoặc lịch chưa kết thúc; lịch sử được giữ lại.
2. Phân ca với ngày giờ bắt đầu/kết thúc, tiền mặt đầu ca và danh sách nhân viên. Lịch tuần bắt đầu thứ Hai, hiển thị theo từng nhân viên. Hỗ trợ ca qua đêm tối đa 24 giờ; ngăn một nhân viên được phân hai ca trùng giờ. Chỉ sửa ca chưa bắt đầu và chưa chấm công, chỉ xóa ca chưa có dữ liệu vận hành.
3. Clock-in từ 30 phút trước giờ bắt đầu đến trước giờ kết thúc; Clock-out ghi giờ thực tế, kể cả khi làm quá giờ. Mỗi nhân viên có một cặp vào/ra mỗi ca và chỉ được có một lượt đang mở. Báo cáo tuần tính số ca phân công, đã vào, hoàn thành, giờ thực tế và phút đi muộn. Ca qua đêm được tính vào tuần chứa ngày bắt đầu; giờ hiển thị làm tròn hai chữ số, timestamp gốc giữ đến mili giây.
4. Tại [POS](pos.html), chọn thu ngân đang chấm công và phương thức tiền mặt/chuyển khoản. Chỉ xóa giỏ sau khi lưu thanh toán thành công. Lựa chọn chuyển khoản là xác nhận thủ công đã nhận tiền, chưa tích hợp ngân hàng/VietQR. Các giao dịch mới được gắn ca; đơn mẫu và thanh toán trước khi có phân hệ không được tính ngược thành doanh thu thật.
5. Sau khi tất cả lượt chấm công trong ca đã ra, chọn người giao đã làm ca và người nhận đang hoạt động (hai người khác nhau). Kiểm kê két, đối soát doanh thu, mô tả máy móc và tích đủ ba mục checklist. Tiền phải có = tiền đầu ca + doanh thu tiền mặt; chuyển khoản chỉ cộng doanh thu, không cộng két. Mọi chênh lệch cần giải trình. Xác nhận tạo biên bản có thời gian và khóa ca, không cho sửa hoặc thêm thanh toán.

Phạm vi hiện tại không ghi nhận thu/chi két, hoàn tiền hay tách thanh toán. Các mục công việc ca sáng/tối bên dưới vẫn là nhóm việc theo danh mục, độc lập với ca nhân sự. Bảng SQL hiện có chưa kết nối ứng dụng; phân hệ dùng khóa LocalStorage `CAFE_HR_V1`, không thay dữ liệu công việc/theme. Không xóa dữ liệu site nếu cần giữ lịch sử. Dùng Live Server cùng một origin cho các trang để chia sẻ dữ liệu; không nên dựa vào cơ chế LocalStorage của URL `file:`.

Đây là ứng dụng một trình duyệt, chưa xác thực danh tính/quyền quản lý. Chấm công dùng đồng hồ thiết bị, chưa phải bằng chứng chống sửa giờ; không xử lý ghi đồng thời giữa nhiều tab/máy. Các tab cùng origin cập nhật khi nhận sự kiện storage, nhưng nên chỉ thao tác ghi trên một tab tại một thời điểm. Triển khai thực tế cần backend xác thực, thời gian máy chủ và transaction cơ sở dữ liệu.

Kiểm thử nghiệp vụ bằng Node.js (không cần cài dependency):

```powershell
node --test tests\shiftService.test.cjs
```

---

# PHẦN 1: CHUẨN HÓA 6 BƯỚC LÀM BÀI TẬP GIỮA KỲ (TỪ ĐẦU ĐẾN CUỐI)

### 🚀 BƯỚC 1: Phát biểu bài toán & Xác định yêu cầu nghiệp vụ
- **Thống nhất đề tài:** Hệ thống Quản lý Công việc & Vận hành Quán Cafe (Cafe Task Manager).
- **Xác định đối tượng sử dụng:**
  - **Quản lý quán:** Giao việc, kiểm tra tiến độ, xem thống kê báo cáo.
  - **Nhân viên Barista / Phục vụ:** Xem danh sách việc cần làm trong ca, cập nhật trạng thái hoàn thành.
- **Xác định các chức năng cốt lõi (MVP):**
  - Quản lý đầu việc trong quán (CRUD: Thêm, Xem, Sửa, Xóa, Đánh dấu Hoàn thành / Chưa hoàn thành).
  - Tìm kiếm theo tên / mô tả công việc; Lọc theo Trạng thái (Pending / Done) và Độ ưu tiên (Low / Medium / High); Sắp xếp theo Hạn chót (Deadline).
  - Kiểm tra dữ liệu đầu vào (Validation realtime) và lưu trữ bền vững trên trình duyệt bằng LocalStorage.

---

### 📐 BƯỚC 2: Thiết kế Cơ sở dữ liệu & Luồng hệ thống (Phục vụ Báo cáo)
*Thực hiện đúng yêu cầu trong file `phát triển web.txt` để đưa vào Báo cáo / Slide thuyết trình:*
- **Xác định thực thể & Chuẩn hóa 3NF:**
  - Xác định các bảng thực thể (Roles, Users, Categories, Tasks).
  - Chỉ rõ khóa chính (PK), thuộc tính và các mối quan hệ (1-N, N-N).
  - Giải thích chi tiết quá trình tách bảng từ 1NF qua 2NF lên chuẩn 3NF.
- **Vẽ ERD & Sinh dữ liệu mẫu:**
  - Đưa thiết kế vào Microsoft SQL Server để tạo Database Diagram (ERD).
  - Viết SQL script tạo bảng và chèn đủ **5 dòng dữ liệu mẫu cho MỖI TRẠNG THÁI** của từng bảng.
- **Thiết kế luồng hoạt động (UML Activity Diagram):**
  - Mô tả bằng lời các bước kiểm tra điều kiện ràng buộc (khi thêm, sửa, xóa task).
  - Sử dụng công cụ vẽ sơ đồ UML Activity Diagram mô tả luồng xử lý nghiệp vụ.

---

### ⚙️ BƯỚC 3: Khởi tạo Khung Dự án (Project Structure) & Data Model
- **Cấu trúc thư mục chuẩn của dự án:**

```text
📦 cafe-task-manager
 ┣ 📂 assets
 ┃ ┣ 📂 css
 ┃ ┃ ┗ 📜 style.css          # Biến màu sắc chủ đạo quán cafe, Dark/Light mode, style chung
 ┃ ┣ 📂 js
 ┃ ┃ ┣ 📜 main.js            # Xử lý Navbar, chuyển đổi Dark/Light mode, hàm thông báo Toast
 ┃ ┃ ┣ 📜 taskService.js     # Tầng dữ liệu: Đọc/ghi LocalStorage, nạp 5 việc mẫu, Export/Import JSON
 ┃ ┃ ┣ 📜 tasks.js           # Tầng xử lý: Sự kiện CRUD, Validation, Search, Filter, Sort
 ┃ ┃ ┗ 📜 stats.js           # Tầng thống kê: Tính toán số liệu và vẽ biểu đồ Chart.js
 ┃ ┗ 📂 img                  # Logo quán cafe, ảnh banner, icon
 ┣ 📜 index.html             # Trang chủ giới thiệu quán & điều hướng nhanh
 ┣ 📜 tasks.html             # Trang quản lý công việc chính
 ┗ 📜 statistics.html        # Trang thống kê biểu đồ & thông tin liên hệ nhóm
```

- **Chuẩn hóa cấu trúc đối tượng Task trong LocalStorage (Bắt buộc đủ 6 trường theo đề bài):**
```javascript
{
  id: "CF-17100001",    // Chuỗi mã định danh tự sinh duy nhất
  title: "...",         // Chuỗi tiêu đề công việc (không được để trống)
  description: "...",   // Chuỗi mô tả công việc (tối thiểu 10 ký tự)
  deadline: "YYYY-MM-DD", // Định dạng ngày chuẩn, >= ngày hiện tại
  priority: "High",     // CHỈ nhận 1 trong 3 giá trị: "Low" | "Medium" | "High"
  status: "Pending"     // CHỈ nhận 1 trong 2 giá trị: "Pending" | "Done"
}
```

---

### 🎨 BƯỚC 4: Xây dựng Giao diện (UI/UX) & Đổ dữ liệu mẫu
- **Tích hợp thư viện được phép:** Nhúng Bootstrap 5 (hoặc TailwindCSS), FontAwesome (icon), Google Fonts, SweetAlert2 (popup xác nhận) và jQuery.
- **Thiết kế 3 trang Responsive:** Đảm bảo hiển thị hoàn hảo trên Mobile (có Hamburger menu & Mobile drawer), Tablet và Desktop, không tràn ngang màn hình.
- **Hiển thị danh sách (Read):** Render dữ liệu mẫu từ `taskService.js` ra bảng (Table) hoặc thẻ (Card). Định dạng trực quan:
  - Task có trạng thái `Done`: Đổi màu xanh lá / gạch ngang chữ.
  - Độ ưu tiên `Priority`: `High` gắn nhãn đỏ, `Medium` gắn nhãn vàng, `Low` gắn nhãn xám.

---

### 🧠 BƯỚC 5: Lập trình Logic Nghiệp vụ (CRUD, Filter, Sort & LocalStorage)
- **Tầng Dữ liệu (`taskService.js`):**
  - Viết các hàm thao tác trực tiếp với `localStorage.getItem('CAFE_TASKS')` và `localStorage.setItem(...)`.
  - Tự động nạp 5 công việc mẫu của quán Cafe khi ứng dụng chưa có dữ liệu.
  - Lập trình chức năng **Clear All** (xóa tất cả công việc an toàn, không mất theme), **Export JSON** và **Import JSON**.
- **Tầng Giao diện & Sự kiện (`tasks.js`):**
  - Mở Modal Popup khi bấm "Thêm công việc" hoặc "Sửa".
  - Bấm "Xóa" hiện hộp thoại xác nhận (Confirm) trước khi xóa.
  - Bấm nút tích chọn để đổi nhanh trạng thái giữa `Pending` <-> `Done`.
  - Viết hàm lọc kết hợp đồng thời: Từ khóa tìm kiếm + Dropdown Status + Dropdown Priority + Sắp xếp theo ngày Deadline gần nhất / xa nhất.

---

### 🧪 BƯỚC 6: Kiểm thử Validation, Tích hợp Bonus & Đóng gói Nộp bài
- **Bắt lỗi nhập liệu (Validation realtime):**
  - Title: Không được để trống.
  - Description: Tối thiểu 10 ký tự.
  - Deadline: Không được nhỏ hơn ngày hiện tại.
  - Hiển thị lỗi trực tiếp dưới ô input (realtime khi gõ) và hiện Toast thông báo, tuyệt đối không làm reload lại trang.
- **Hoàn thiện tính năng Cộng điểm (Bonus +10đ):**
  - Vẽ biểu đồ thống kê bằng **Chart.js** tại trang `statistics.html`.
  - Kiểm tra đồng bộ chế độ Dark Mode / Light Mode trên cả 3 trang.
- **Đóng gói Deliverables:**
  - Đẩy toàn bộ code sạch lên GitHub repository.
  - Hoàn thiện Slide báo cáo thuyết trình.
  - Quay Video Demo 3 phút thực hiện đầy đủ 7 thao tác bắt buộc của đề bài.

---

# PHẦN 2: BẢNG PHÂN CÔNG NHIỆM VỤ CHUẨN HÓA (NHÓM 5 NGƯỜI)

Bảng phân công dưới đây đảm bảo tách biệt rõ các file code để không bị xung đột (conflict) khi gộp code trên GitHub, đồng thời chia đều cả việc Code Web lẫn việc Viết Báo Cáo & Quay Video:

| Thành viên | Vai trò & Nhiệm vụ chính | File Code phụ trách | Nhiệm vụ Báo cáo / Demo |
| :--- | :--- | :--- | :--- |
| **Người 1 (Leader)** | **Khung hệ thống + Tầng dữ liệu LocalStorage** | `assets/css/style.css`<br>`assets/js/main.js`<br>`assets/js/taskService.js` | • Dựng khung Header (Navbar responsive), Footer và nút chuyển đổi Dark/Light Mode dùng chung cho 3 trang.<br>• Viết trọn bộ hàm đọc/ghi LocalStorage, tự động nạp 5 công việc mẫu của quán Cafe nếu trình duyệt chưa có dữ liệu.<br>• Lập trình tính năng Clear All, Export JSON và Import JSON.<br>• Quản lý GitHub, kiểm tra và gộp code (Merge Pull Request) của cả nhóm. |
| **Người 2** | **Chức năng CRUD & Kiểm tra dữ liệu (Validation)** | `tasks.html` *(Phần khung danh sách & Modal Form)*<br>`assets/js/tasks.js` *(Phần CRUD & Validate)* | • Thiết kế bảng/thẻ hiển thị danh sách công việc (phân biệt rõ giao diện giữa trạng thái Pending và Done) và Modal Popup Thêm/Sửa.<br>• Lập trình logic Create (Thêm), Read (Hiển thị), Update (Sửa), Delete (Xóa có popup Confirm), Toggle Done.<br>• Lập trình Validation realtime (Title không rỗng, Description ≥ 10 ký tự, Deadline ≥ ngày hiện tại) và hiển thị thông báo Toast/Alert.<br>• *Báo cáo:* Phụ trách mục "Thiết kế giao diện" (tìm web mẫu tham khảo trên mạng, chụp màn hình, mô tả chức năng, nội dung, kích thước ảnh của 3 trang để đưa vào báo cáo). |
| **Người 3** | **Tìm kiếm, Bộ lọc, Sắp xếp & Thiết kế UML** | `tasks.html` *(Phần thanh công cụ Search/Filter)*<br>`assets/js/tasks.js` *(Phần Search, Filter, Sort, Pagination)* | • Thiết kế thanh công cụ Tìm kiếm, Lọc và Sắp xếp trên trang `tasks.html`.<br>• Lập trình logic Search (theo Title/Description), Filter kết hợp (Status + Priority), Sort (theo Deadline gần nhất/xa nhất) và Phân trang (Pagination).<br>• *Báo cáo:* Viết mô tả luồng hoạt động hệ thống và vẽ sơ đồ UML Activity Diagram (theo yêu cầu file `phát triển web.txt`). |
| **Người 4** | **Trang Chủ + Thiết kế CSDL (ERD & Chuẩn hóa 3NF)** | `index.html`<br>`assets/css/home.css` | • Thiết kế Trang chủ (`index.html`) theo phong cách Quán Cafe: Banner giới thiệu hệ thống vận hành quán, các khối tính năng nổi bật, nút điều hướng sang trang Quản lý công việc, hiệu ứng chuyển động nhẹ (Animate.css).<br>• *Báo cáo:* Phụ trách mục 1 & mục 2 trong file `phát triển web.txt` (Phát biểu bài toán với đủ các vai trò: Admin, Khách hàng có tài khoản, Khách hàng không có tài khoản, Nhân viên/Kế toán; xác định thực thể, chuẩn hóa 3NF qua từng bước 1NF-2NF-3NF, vẽ ERD trên SQL Server và chụp ảnh 5 dòng dữ liệu mẫu cho mỗi trạng thái). |
| **Người 5** | **Trang Thống kê (Bonus Chart.js), Giới thiệu & Quay Demo** | `statistics.html`<br>`assets/js/stats.js` | • Thiết kế trang Thống kê & Giới thiệu (`statistics.html`): Hiển thị các thẻ tổng hợp số liệu (Tổng số việc, số việc Done vs Pending, số việc theo Priority).<br>• Sử dụng thư viện Chart.js vẽ biểu đồ trực quan từ dữ liệu thực trong LocalStorage (lấy trọn điểm Bonus) + Phần giới thiệu thành viên & liên hệ quán.<br>• *Báo cáo:* Tổng hợp nội dung làm Slide thuyết trình và quay Video Demo 3 phút thực hiện đủ 7 thao tác bắt buộc của đề bài. |

### 📌 LỊCH TRÌNH ĐỀ XUẤT ĐỂ LEADER ĐIỀU PHỐI NHÓM:
1. **Giai đoạn 1 (1 - 2 ngày đầu):** Người 1 (Leader) hoàn thành bộ khung `style.css`, `main.js` và đặc biệt là `taskService.js` (có sẵn 5 công việc mẫu trong LocalStorage) rồi đẩy lên GitHub. Trong lúc đó, Người 3 & Người 4 làm phần Báo cáo (CSDL 3NF, ERD, UML).
2. **Giai đoạn 2 (3 - 4 ngày tiếp theo):** Người 2, Người 3, Người 4, Người 5 kéo (pull) bộ khung của Leader về để code giao diện và ghép các hàm từ `taskService.js` vào trang của mình.
3. **Giai đoạn 3 (1 - 2 ngày cuối):** Người 1 gộp toàn bộ code, cả nhóm kiểm tra chéo (test responsive bằng cách thu nhỏ trình duyệt, bấm F5 xem dữ liệu còn không), sau đó Người 5 tổng hợp Slide báo cáo và quay Video Demo 3 phút thực hiện đủ 7 thao tác bắt buộc của đề bài. Cuối cùng, Người 1 kiểm tra toàn bộ repo trên GitHub trước khi nộp.

---

# PHẦN 3: QUY ƯỚC KỸ THUẬT CHUNG (BẮT BUỘC CẢ 5 THÀNH VIÊN TUÂN THỦ)

### 1. Quy ước Cấu trúc Dữ liệu Task (Data Contract)
Tất cả các thành viên thống nhất sử dụng đúng tên thuộc tính và giá trị chuỗi (phân biệt chữ hoa/thường) như sau để không bị lệch khi ghép code:
- **Key lưu danh sách công việc trong LocalStorage:** `'CAFE_TASKS'`
- **Key lưu chế độ giao diện sáng/tối:** `'CAFE_THEME'` (nhận giá trị `'light'` hoặc `'dark'`)
- **Cấu trúc 1 đối tượng Task chuẩn:**
```json
{
  "id": "CF-17100001",
  "title": "Kiểm kê kho hạt Arabica",
  "description": "Kiểm tra số lượng tồn kho và hạn sử dụng hạt cà phê đầu ca sáng",
  "deadline": "2026-10-25",
  "priority": "High",
  "status": "Pending"
}
```
*Chi tiết các trường dữ liệu:*
- `id`: Chuỗi định danh duy nhất (ví dụ: `"CF-17100001"`).
- `title`: Chuỗi tên công việc (bắt buộc, không được để trống).
- `description`: Chuỗi mô tả công việc (tối thiểu 10 ký tự).
- `deadline`: Định dạng ngày chuẩn `YYYY-MM-DD` (phải ≥ ngày hiện tại khi tạo mới).
- `priority`: CHỈ nhận 1 trong 3 giá trị: `"Low"` | `"Medium"` | `"High"`.
- `status`: CHỈ nhận 1 trong 2 giá trị: `"Pending"` | `"Done"`.

---

### 2. Quy ước Tên hàm trong `assets/js/taskService.js` (Do Người 1 cung cấp)
Các thành viên (Người 2, 3, 4, 5) gọi trực tiếp các hàm sau từ đối tượng toàn cục `window.TaskService`:

| Tên hàm | Tham số | Giá trị trả về | Mô tả chức năng |
| :--- | :--- | :--- | :--- |
| `TaskService.getAllTasks()` | *không có* | `Array` | Trả về mảng danh sách toàn bộ Task hiện có. |
| `TaskService.getTaskById(id)` | `id` (string) | `Object` \| `null` | Trả về 1 đối tượng Task tương ứng với ID. |
| `TaskService.addTask(taskObj)` | `taskObj` (Object) | `Object` \| `null` | Thêm Task mới, gán ID tự sinh và lưu vào LocalStorage. |
| `TaskService.updateTask(id, updatedFields)` | `id`, `updatedFields` | `Object` \| `null` | Cập nhật các trường thông tin của Task theo ID. |
| `TaskService.deleteTask(id)` | `id` (string) | `boolean` | Xóa 1 Task theo ID khỏi danh sách. |
| `TaskService.toggleStatus(id)` | `id` (string) | `Object` \| `null` | Chuyển đổi trạng thái nhanh giữa `"Pending"` và `"Done"`. |
| `TaskService.clearAll()` | *không có* | `boolean` | Xóa toàn bộ Task (an toàn, giữ nguyên theme cài đặt). |
| `TaskService.exportJSON()` | *không có* | `Object` | Xuất và tải xuống tệp dữ liệu `cafe-tasks.json`. |
| `TaskService.importJSON(file, callback)` | `file` (File), `callback?` | `Promise` | Đọc tệp JSON, kiểm tra định dạng và ghi vào LocalStorage. |

*Lắng nghe sự kiện dữ liệu thay đổi:*
```javascript
window.addEventListener('tasks:changed', function (event) {
  console.log('Hành động vừa thực hiện:', event.detail.action); // 'add' | 'update' | 'delete' | 'clear' | 'import' | 'toggle'
  console.log('Danh sách task cập nhật:', event.detail.tasks);
});
```

---

### 3. Quy tắc tránh xung đột Git (Merge Conflict) giữa Người 2 và Người 3
- **Trong file `tasks.html`:** Chia rõ 2 khu vực bằng thẻ comment HTML:
  ```html
  <!-- ========================================== -->
  <!-- KHU VỰC NGƯỜI 3: SEARCH / FILTER / SORT    -->
  <!-- ========================================== -->
  <section class="toolbar-section">
    <!-- Thanh tìm kiếm, dropdown status, dropdown priority, sort deadline -->
  </section>

  <!-- ========================================== -->
  <!-- KHU VỰC NGƯỜI 2: DANH SÁCH TASK & MODAL    -->
  <!-- ========================================== -->
  <section class="task-list-section">
    <!-- Bảng / thẻ danh sách task, nút Thêm việc, Modal popup CRUD -->
  </section>
  ```
  *Quy tắc vàng:* Ai phụ trách khu vực nào chỉ chỉnh sửa đúng trong khu vực đó, không sửa sang khu vực của thành viên khác.
- **Tách bạch hàm hiển thị:**
  - Người 2 viết hàm toàn cục `window.renderTaskList(tasksToRender)` để vẽ danh sách ra giao diện.
  - Khi Người 3 thực hiện tìm kiếm, lọc hoặc sắp xếp, lấy mảng kết quả sau lọc và gọi:
    ```javascript
    if (typeof window.renderTaskList === 'function') {
      window.renderTaskList(filteredTasks);
    }
    ```
- **Quy trình phân nhánh Git:**
  - Mỗi thành viên làm việc trên nhánh (branch) riêng của mình:
    - `feat/leader-core` (Người 1)
    - `feat/nguoi2-crud` (Người 2)
    - `feat/nguoi3-filter` (Người 3)
    - `feat/nguoi4-home` (Người 4)
    - `feat/nguoi5-stats` (Người 5)
  - Tạo Pull Request để Người 1 (Leader) review code và merge vào nhánh `main`.

---

### 4. Lưu ý bổ sung cho phần Báo cáo (`phát triển web.txt`)
- **Người 2 (Bổ sung nhiệm vụ Báo cáo):** Phụ trách mục *"Thiết kế giao diện"* trong báo cáo (tìm web mẫu tham khảo trên mạng, chụp màn hình, mô tả chức năng, nội dung, kích thước ảnh của 3 trang để đưa vào báo cáo).
- **Người 4 (Lưu ý mục CSDL & Phát biểu bài toán):**
  - Phần phát biểu bài toán cần liệt kê đầy đủ các vai trò: **Admin**, **Khách hàng có tài khoản**, **Khách hàng không có tài khoản**, **Nhân viên / Kế toán**.
  - Ở bước đầu xác định thực thể từ bài toán: Chỉ liệt kê Thực thể, Khóa chính và Thuộc tính (không đưa khóa ngoại vào ở bước đầu tiên này), sau đó mới trình bày bước chuyển sang 2NF (thêm khóa ngoại) và 3NF (tách bảng trung gian).
  - Dữ liệu mẫu trên SQL Server: Đảm bảo sinh đủ **5 dòng dữ liệu mẫu cho MỖI TRẠNG THÁI** của từng bảng.

---

# PHẦN 4: 5 CÔNG VIỆC MẪU BAN ĐẦU CỦA QUÁN CAFE

Khi ứng dụng chạy lần đầu trên trình duyệt và chưa có dữ liệu, `TaskService` tự động khởi tạo 5 công việc mẫu theo đúng định dạng chuẩn:

1. **Kiểm tra nguyên liệu cà phê và sữa**
   - Hạn chót: `2026-10-25` | Độ ưu tiên: `High` | Trạng thái: `Done`
2. **Vệ sinh máy pha cà phê**
   - Hạn chót: `2026-10-24` | Độ ưu tiên: `High` | Trạng thái: `Pending`
3. **Chuẩn bị trà và topping**
   - Hạn chót: `2026-10-26` | Độ ưu tiên: `Medium` | Trạng thái: `Pending`
4. **Kiểm tra vệ sinh khu vực phục vụ**
   - Hạn chót: `2026-10-23` | Độ ưu tiên: `Medium` | Trạng thái: `Done`
5. **Kiểm kê ly và dụng cụ pha chế**
   - Hạn chót: `2026-10-27` | Độ ưu tiên: `Low` | Trạng thái: `Pending`

*Lưu ý:* Khi bấm **Clear All**, ứng dụng xóa sạch danh sách công việc và **không tự động tạo lại** 5 công việc mẫu khi F5/reload trang. Người dùng có thể chủ động bấm *"Nạp lại việc mẫu"* khi cần.

---

# PHẦN 5: HƯỚNG DẪN CHẠY THỬ VÀ KIỂM THỬ

1. Mở thư mục dự án trong **VS Code**.
2. Nhấp chuột phải vào `index.html` chọn **Open with Live Server** (hoặc mở trực tiếp file `index.html` trong trình duyệt Google Chrome / Microsoft Edge).
3. Kiểm tra các chức năng:
   - Chuyển đổi Dark / Light Mode trên thanh Navbar (lưu trạng thái khi F5).
   - Menu responsive trên Mobile (thu nhỏ cửa sổ < 768px để kiểm tra nút Hamburger).
   - Kiểm tra các hàm của `TaskService` trong Console trình duyệt (`F12`):
     ```javascript
     TaskService.getAllTasks();
     TaskService.toggleStatus('CF-17100002');
     ```