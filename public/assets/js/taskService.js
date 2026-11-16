/**
 * ====================================================================
 * DỰ ÁN: CAFE TASK MANAGER (HỆ THỐNG QUẢN LÝ CÔNG VIỆC QUÁN CAFE)
 * TẦNG DỮ LIỆU LOCALSTORAGE & QUẢN LÝ CÔNG VIỆC
 * File: assets/js/taskService.js
 * Phụ trách: Người 1 (Leader / Frontend & System Core)
 * ====================================================================
 * Mô tả:
 * - Module độc lập quản lý CRUD công việc quán Cafe trên LocalStorage.
 * - Tuân thủ Quy ước kỹ thuật chung (Data Contract) của nhóm 5 người:
 *   Key LocalStorage: 'CAFE_TASKS'
 *   Task object: { id, title, description, deadline, priority, status }
 * - Tự động tạo 5 công việc mẫu chuẩn khi sử dụng lần đầu tiên.
 * - Phân biệt rõ giữa lần đầu truy cập và trạng thái người dùng chủ động Clear All.
 * - Cung cấp đầy đủ các hàm: getAllTasks, getTaskById, addTask, updateTask,
 *   deleteTask, toggleStatus, clearAll, exportJSON, importJSON.
 * - Xử lý an toàn Export JSON & Import JSON với kiểm tra cấu trúc dữ liệu.
 * - Phát sự kiện 'tasks:changed' để các trang và thành phần cập nhật phản ứng.
 * ====================================================================
 */

(function (window) {
  'use strict';

  // Khóa lưu trữ LocalStorage chính thức theo quy ước nhóm
  const STORAGE_KEY = 'CAFE_TASKS';
  const LEGACY_STORAGE_KEY = 'cafe_tasks_data';
  const INIT_FLAG_KEY = 'CAFE_TASKS_INITIALIZED';

  // 5 công việc mẫu ban đầu liên quan đến hoạt động vận hành quán Cafe
  // Tuân thủ đầy đủ 6 trường dữ liệu theo quy ước Data Contract
  const DEFAULT_TASKS = [
    {
      id: 'CF-17100001',
      title: 'Kiểm tra nguyên liệu cà phê và sữa',
      description: 'Kiểm tra hạn sử dụng, số lượng tồn kho hạt Robusta, Arabica và lượng sữa tươi thanh trùng đầu ca.',
      deadline: '2026-10-25',
      priority: 'High',
      status: 'Done',
      category: 'Kho & Nguyên liệu',
      createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 2).toISOString()
    },
    {
      id: 'CF-17100002',
      title: 'Vệ sinh máy pha cà phê',
      description: 'Chạy chu trình rửa họng pha espresso (backflush) bằng thuốc vệ sinh máy chuyên dụng, xả vòi đánh sữa.',
      deadline: '2026-10-24',
      priority: 'High',
      status: 'Pending',
      category: 'Kỹ thuật & Máy móc',
      createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 1).toISOString()
    },
    {
      id: 'CF-17100003',
      title: 'Chuẩn bị trà và topping',
      description: 'Ủ cốt trà đen, cốt trà ô long và nấu mẻ trân châu đường đen, chuẩn bị thạch phô mai cho ca chiều.',
      deadline: '2026-10-26',
      priority: 'Medium',
      status: 'Pending',
      category: 'Pha chế',
      createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 2).toISOString()
    },
    {
      id: 'CF-17100004',
      title: 'Kiểm tra vệ sinh khu vực phục vụ',
      description: 'Lau dọn bàn ghế, kiểm tra menu tại bàn, châm thêm khăn giấy và bảo đảm sàn quán luôn khô ráo sạch sẽ.',
      deadline: '2026-10-23',
      priority: 'Medium',
      status: 'Done',
      category: 'Phục vụ',
      createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 3).toISOString()
    },
    {
      id: 'CF-17100005',
      title: 'Kiểm kê ly và dụng cụ pha chế',
      description: 'Rà soát số lượng ly mang về (take-away), nắp đậy, ống hút giấy và thìa khuấy trong quầy bar.',
      deadline: '2026-10-27',
      priority: 'Low',
      status: 'Pending',
      category: 'Quầy bar',
      createdAt: new Date(Date.now() - 3600000 * 1).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 1).toISOString()
    }
  ];

  /**
   * Tạo định danh (ID) duy nhất cho công việc theo định dạng CF-XXXXXX
   */
  function generateId() {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(100 + Math.random() * 900);
    return `CF-${timestamp}${random}`;
  }

  /**
   * Chuẩn hóa giá trị Priority về "Low" | "Medium" | "High"
   */
  function normalizePriority(val) {
    if (!val) return 'Medium';
    const s = String(val).trim().toLowerCase();
    if (s === 'high') return 'High';
    if (s === 'low') return 'Low';
    return 'Medium';
  }

  /**
   * Chuẩn hóa giá trị Status về "Pending" | "Done"
   */
  function normalizeStatus(val) {
    if (!val) return 'Pending';
    const s = String(val).trim().toLowerCase();
    if (s === 'done' || s === 'completed') return 'Done';
    return 'Pending';
  }

  /**
   * Kiểm tra khả năng hoạt động của LocalStorage
   */
  function isStorageAvailable() {
    try {
      const test = '__storage_test__';
      window.localStorage.setItem(test, test);
      window.localStorage.removeItem(test);
      return true;
    } catch (e) {
      console.error('[TaskService] LocalStorage không khả dụng:', e);
      return false;
    }
  }

  /**
   * Phát Custom Event thông báo dữ liệu thay đổi
   */
  function emitChange(action, tasks) {
    try {
      const event = new CustomEvent('tasks:changed', {
        detail: { action: action, tasks: tasks || [] }
      });
      window.dispatchEvent(event);
    } catch (e) {
      console.warn('[TaskService] Không thể phát sự kiện tasks:changed:', e);
    }
  }

  /* ------------------------------------------------------------------
     MODULE TASK SERVICE
     ------------------------------------------------------------------ */
  const TaskService = {
    /**
     * Khởi tạo dữ liệu ban đầu: Tự động nạp 5 công việc mẫu nếu là lần đầu chạy ứng dụng.
     * Nếu người dùng đã chủ động Clear All thì không tự ý nạp lại khi tải lại trang!
     */
    init: function () {
      if (!isStorageAvailable()) return;

      const isInitialized = window.localStorage.getItem(INIT_FLAG_KEY) || 
                            window.localStorage.getItem('cafe_tasks_initialized');
      const existingData = window.localStorage.getItem(STORAGE_KEY) || 
                           window.localStorage.getItem(LEGACY_STORAGE_KEY);

      // Nếu có dữ liệu cũ ở legacy key, di chuyển sang key chuẩn 'CAFE_TASKS'
      if (existingData && !window.localStorage.getItem(STORAGE_KEY)) {
        try {
          window.localStorage.setItem(STORAGE_KEY, existingData);
        } catch (e) {
          console.warn('[TaskService] Lỗi đồng bộ key cũ:', e);
        }
      }

      // Chỉ khởi tạo 5 task mẫu nếu chưa từng khởi tạo ứng dụng trước đó
      if (!isInitialized && !existingData) {
        this.saveTasks(DEFAULT_TASKS, false);
        window.localStorage.setItem(INIT_FLAG_KEY, 'true');
        window.localStorage.setItem('cafe_tasks_initialized', 'true');
        emitChange('init', DEFAULT_TASKS);
      }
    },

    /**
     * Lấy toàn bộ danh sách công việc từ LocalStorage
     * Theo đúng quy ước nhóm: TaskService.getAllTasks()
     * @returns {Array} Mảng các object công việc
     */
    getAllTasks: function () {
      if (!isStorageAvailable()) return [];

      try {
        let raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) {
          raw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
        }
        if (!raw) return [];

        const tasks = JSON.parse(raw);
        if (!Array.isArray(tasks)) {
          console.warn('[TaskService] Dữ liệu trong LocalStorage không phải là mảng.');
          return [];
        }

        // Đảm bảo tương thích ngược: hỗ trợ cả status/priority hoa lẫn thường
        return tasks.map(t => ({
          ...t,
          priority: normalizePriority(t.priority),
          status: normalizeStatus(t.status)
        }));
      } catch (err) {
        console.error('[TaskService] Lỗi phân tích JSON từ LocalStorage:', err);
        return [];
      }
    },

    /**
     * Alias tương thích ngược cho getAllTasks
     */
    getTasks: function () {
      return this.getAllTasks();
    },

    /**
     * Lấy chi tiết một công việc theo ID
     * @param {string} id 
     * @returns {Object|null}
     */
    getTaskById: function (id) {
      if (!id) return null;
      const tasks = this.getAllTasks();
      return tasks.find(t => t.id === id) || null;
    },

    /**
     * Lưu mảng công việc vào LocalStorage
     * @param {Array} tasks Mảng công việc cần ghi
     * @param {boolean} triggerEvent Có phát sự kiện thay đổi hay không (mặc định: true)
     * @returns {boolean} Thành công hay thất bại
     */
    saveTasks: function (tasks, triggerEvent = true) {
      if (!isStorageAvailable()) return false;

      if (!Array.isArray(tasks)) {
        console.error('[TaskService] saveTasks yêu cầu tham số là một mảng!');
        return false;
      }

      try {
        const jsonStr = JSON.stringify(tasks);
        window.localStorage.setItem(STORAGE_KEY, jsonStr);
        // Đồng bộ legacy key cho tương thích
        window.localStorage.setItem(LEGACY_STORAGE_KEY, jsonStr);
        window.localStorage.setItem(INIT_FLAG_KEY, 'true');
        window.localStorage.setItem('cafe_tasks_initialized', 'true');

        if (triggerEvent) {
          emitChange('save', tasks);
        }
        return true;
      } catch (err) {
        console.error('[TaskService] Lỗi khi ghi dữ liệu vào LocalStorage:', err);
        return false;
      }
    },

    /**
     * Thêm một công việc mới
     * @param {Object} taskData { title, description, deadline, priority, status, category }
     * @returns {Object|null} Công việc vừa được tạo
     */
    addTask: function (taskData) {
      if (!taskData || !taskData.title || typeof taskData.title !== 'string' || taskData.title.trim() === '') {
        console.error('[TaskService] addTask thất bại: Tiêu đề công việc là bắt buộc!');
        return null;
      }

      const tasks = this.getAllTasks();
      const now = new Date().toISOString();
      const todayStr = now.split('T')[0];

      const newTask = {
        id: taskData.id && !tasks.some(t => t.id === taskData.id) ? String(taskData.id) : generateId(),
        title: taskData.title.trim(),
        description: (taskData.description || '').trim(),
        deadline: taskData.deadline || todayStr,
        priority: normalizePriority(taskData.priority),
        status: normalizeStatus(taskData.status),
        category: (taskData.category || 'Chung').trim(),
        createdAt: taskData.createdAt || now,
        updatedAt: now
      };

      tasks.unshift(newTask); // Đưa công việc mới lên đầu danh sách
      const success = this.saveTasks(tasks);
      if (success) {
        emitChange('add', tasks);
        return newTask;
      }
      return null;
    },

    /**
     * Cập nhật thông tin công việc theo ID
     * @param {string} id 
     * @param {Object} updateData 
     * @returns {Object|null}
     */
    updateTask: function (id, updateData) {
      if (!id || !updateData) return null;

      const tasks = this.getAllTasks();
      const index = tasks.findIndex(t => t.id === id);

      if (index === -1) {
        console.warn(`[TaskService] Không tìm thấy công việc với ID: ${id}`);
        return null;
      }

      const current = tasks[index];
      const updated = {
        ...current,
        title: updateData.title !== undefined ? String(updateData.title).trim() : current.title,
        description: updateData.description !== undefined ? String(updateData.description).trim() : current.description,
        deadline: updateData.deadline !== undefined ? String(updateData.deadline).trim() : (current.deadline || ''),
        priority: updateData.priority !== undefined ? normalizePriority(updateData.priority) : current.priority,
        status: updateData.status !== undefined ? normalizeStatus(updateData.status) : current.status,
        category: updateData.category !== undefined ? String(updateData.category).trim() : current.category,
        updatedAt: new Date().toISOString()
      };

      tasks[index] = updated;
      const success = this.saveTasks(tasks);
      if (success) {
        emitChange('update', tasks);
        return updated;
      }
      return null;
    },

    /**
     * Đổi nhanh trạng thái giữa "Pending" và "Done"
     * @param {string} id 
     * @returns {Object|null}
     */
    toggleStatus: function (id) {
      if (!id) return null;
      const task = this.getTaskById(id);
      if (!task) return null;

      const nextStatus = task.status === 'Done' ? 'Pending' : 'Done';
      const updated = this.updateTask(id, { status: nextStatus });
      if (updated) {
        emitChange('toggle', this.getAllTasks());
      }
      return updated;
    },

    /**
     * Xóa một công việc theo ID
     * @param {string} id 
     * @returns {boolean}
     */
    deleteTask: function (id) {
      if (!id) return false;

      const tasks = this.getAllTasks();
      const filtered = tasks.filter(t => t.id !== id);

      if (filtered.length === tasks.length) {
        return false; // Không tìm thấy để xóa
      }

      const success = this.saveTasks(filtered);
      if (success) {
        emitChange('delete', filtered);
        return true;
      }
      return false;
    },

    /**
     * Xóa toàn bộ công việc (Clear All).
     * Theo đúng quy ước nhóm: TaskService.clearAll()
     * Chỉ xóa dữ liệu công việc trong phạm vi ứng dụng, tuyệt đối không dùng localStorage.clear()
     * để bảo vệ theme và các thiết lập khác.
     * Đảm bảo sau khi xóa, tải lại trang sẽ KHÔNG tự động tạo lại 5 công việc mẫu!
     * @returns {boolean}
     */
    clearAll: function () {
      if (!isStorageAvailable()) return false;

      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
        window.localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify([]));
        window.localStorage.setItem(INIT_FLAG_KEY, 'true');
        window.localStorage.setItem('cafe_tasks_initialized', 'true');
        emitChange('clear', []);
        return true;
      } catch (err) {
        console.error('[TaskService] Lỗi khi Clear All:', err);
        return false;
      }
    },

    /**
     * Alias tương thích ngược cho clearAll
     */
    clearAllTasks: function () {
      return this.clearAll();
    },

    /**
     * Khởi tạo lại dữ liệu mẫu một cách chủ động (phục vụ nút Reset Demo)
     */
    resetDefaultTasks: function () {
      this.saveTasks(DEFAULT_TASKS);
      window.localStorage.setItem(INIT_FLAG_KEY, 'true');
      window.localStorage.setItem('cafe_tasks_initialized', 'true');
      emitChange('reset', DEFAULT_TASKS);
      return DEFAULT_TASKS;
    },

    /**
     * Xuất toàn bộ dữ liệu công việc ra file JSON tải về máy tính
     * Theo quy ước tên file: cafe-tasks.json
     * @returns {Object} { success: boolean, count: number, filename: string }
     */
    exportJSON: function () {
      try {
        const tasks = this.getAllTasks();
        const exportData = {
          app: 'CafeTaskManager',
          version: '1.0.0',
          exportedAt: new Date().toISOString(),
          totalTasks: tasks.length,
          tasks: tasks
        };

        const jsonString = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
        const filename = 'cafe-tasks.json';

        // Kích hoạt tải về trên trình duyệt nếu có document
        if (typeof document !== 'undefined' && typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
          const link = document.createElement('a');
          const url = URL.createObjectURL(blob);
          link.setAttribute('href', url);
          link.setAttribute('download', filename);
          link.style.display = 'none';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }

        return { success: true, count: tasks.length, filename: filename };
      } catch (err) {
        console.error('[TaskService] Lỗi Export JSON:', err);
        return { success: false, error: err.message };
      }
    },

    /**
     * Nhập dữ liệu từ file JSON máy tính người dùng.
     * Hỗ trợ cả cú pháp Promise lẫn callback: TaskService.importJSON(file, callback)
     * Kiểm tra cấu trúc nghiêm ngặt trước khi ghi để bảo vệ dữ liệu hiện có!
     * @param {File} file Đối tượng File nhận từ thẻ <input type="file">
     * @param {Function} [callback] Hàm callback tuỳ chọn: callback(error, result)
     * @returns {Promise<Object>} Trả về Promise chứa kết quả hoặc báo lỗi
     */
    importJSON: function (file, callback) {
      const promise = new Promise((resolve, reject) => {
        if (!file) {
          return reject(new Error('Vui lòng chọn một file JSON hợp lệ!'));
        }

        if (!file.name.endsWith('.json') && file.type !== 'application/json') {
          return reject(new Error('Định dạng tệp không hợp lệ! Vui lòng chọn tệp .json'));
        }

        const reader = new FileReader();

        reader.onload = (e) => {
          try {
            const content = e.target.result;
            const parsed = JSON.parse(content);

            // Hỗ trợ cả 2 định dạng: mảng trực tiếp [task1, task2] hoặc object { tasks: [...] }
            let importedTasks = [];
            if (Array.isArray(parsed)) {
              importedTasks = parsed;
            } else if (parsed && Array.isArray(parsed.tasks)) {
              importedTasks = parsed.tasks;
            } else {
              return reject(new Error('Cấu trúc file JSON không hợp lệ! Không tìm thấy mảng danh sách công việc.'));
            }

            // Kiểm tra tính hợp lệ của từng công việc trong tệp
            const validTasks = [];
            const existingTasks = this.getAllTasks();
            const existingIds = new Set(existingTasks.map(t => t.id));
            const todayStr = new Date().toISOString().split('T')[0];

            for (let i = 0; i < importedTasks.length; i++) {
              const item = importedTasks[i];
              if (!item || typeof item !== 'object' || !item.title || typeof item.title !== 'string' || item.title.trim() === '') {
                // Bỏ qua item rỗng hoặc thiếu tiêu đề
                continue;
              }

              // Xử lý chống trùng lặp ID: Nếu ID đã tồn tại thì tự cấp phát ID mới
              let validId = item.id;
              if (!validId || existingIds.has(validId)) {
                validId = generateId();
              }
              existingIds.add(validId);

              validTasks.push({
                id: validId,
                title: item.title.trim(),
                description: typeof item.description === 'string' ? item.description.trim() : '',
                deadline: item.deadline || todayStr,
                priority: normalizePriority(item.priority),
                status: normalizeStatus(item.status),
                category: typeof item.category === 'string' && item.category.trim() ? item.category.trim() : 'Chung',
                createdAt: item.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString()
              });
            }

            if (validTasks.length === 0) {
              return reject(new Error('Tệp JSON không chứa công việc hợp lệ nào để nhập!'));
            }

            // Ghi đè an toàn dữ liệu hợp lệ và phát sự kiện cập nhật
            const success = this.saveTasks(validTasks);
            if (success) {
              emitChange('import', validTasks);
              return resolve({ success: true, count: validTasks.length });
            } else {
              return reject(new Error('Không thể lưu dữ liệu vào LocalStorage (có thể do quá dung lượng).'));
            }
          } catch (err) {
            console.error('[TaskService] Lỗi xử lý Import JSON:', err);
            return reject(new Error('Lỗi cú pháp JSON! Tệp được chọn bị lỗi định dạng.'));
          }
        };

        reader.onerror = () => {
          reject(new Error('Lỗi khi đọc tệp từ máy tính!'));
        };

        reader.readAsText(file);
      });

      if (typeof callback === 'function') {
        promise.then(res => callback(null, res)).catch(err => callback(err, null));
      }

      return promise;
    }
  };

  // Khởi chạy kiểm tra dữ liệu ban đầu
  TaskService.init();

  // Đăng ký TaskService vào phạm vi toàn cục window
  window.TaskService = TaskService;

})(window);
