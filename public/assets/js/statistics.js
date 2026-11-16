/**
 * ====================================================================
 * DỰ ÁN: CAFE TASK MANAGER (HỆ THỐNG QUẢN LÝ CÔNG VIỆC QUÁN CAFE)
 * TẦNG THỐNG KÊ, LOGIC TÍNH TOÁN & TRỰC QUAN HÓA BIỂU ĐỒ CHART.JS
 * File: assets/js/stats.js
 * Phụ trách: Người 5 (Senior Frontend Developer & UI/UX Designer)
 * ====================================================================
 * Mô tả chức năng:
 * - Thu thập và tính toán dữ liệu công việc từ LocalStorage qua TaskService.
 * - Chuẩn hóa chữ hoa/thường cho status (Pending/Done) và priority (Low/Medium/High).
 * - Tính toán chính xác 4 chỉ số KPI: Tổng số việc, Đã xong, Đang chờ, Việc khẩn cấp/quá hạn.
 * - Cập nhật thanh tiến độ tổng thể (Overall Progress Bar) của ca làm việc.
 * - Khởi tạo & cập nhật 2 biểu đồ Chart.js (Doughnut Chart & Grouped Bar Chart)
 *   với cơ chế hủy instance (.destroy()) tránh lỗi chồng đè và responsive 100%.
 * - Tự động thích ứng màu sắc Dark Mode / Light Mode theo theme.js thời gian thực.
 * - Đồng bộ tức thì (Realtime Sync) khi dữ liệu LocalStorage thay đổi (Storage Event & tasks:changed).
 * - Render bảng 5 đầu việc cần chú ý nhất tại quán kèm nút đổi trạng thái nhanh.
 * ====================================================================
 */

(function (window, document) {
  'use strict';

  // Khóa lưu trữ LocalStorage theo quy ước hệ thống
  const STORAGE_KEY = 'CAFE_TASKS';
  const LEGACY_STORAGE_KEY = 'cafe_tasks_data';

  // Biến lưu trữ Chart.js instances để gọi .destroy() trước khi vẽ lại
  let statusChartInstance = null;
  let priorityChartInstance = null;

  /* ------------------------------------------------------------------
     1. TIỆN ÍCH CHUẨN HÓA DỮ LIỆU & KIỂM TRA THỜI GIAN
     ------------------------------------------------------------------ */

  /**
   * Chuẩn hóa trạng thái công việc về "Done" hoặc "Pending"
   * @param {string} val 
   * @returns {"Done" | "Pending"}
   */
  function normalizeStatus(val) {
    if (!val) return 'Pending';
    const s = String(val).trim().toLowerCase();
    if (s === 'done' || s === 'completed') return 'Done';
    return 'Pending';
  }

  /**
   * Chuẩn hóa mức độ ưu tiên về "Low", "Medium", hoặc "High"
   * @param {string} val 
   * @returns {"Low" | "Medium" | "High"}
   */
  function normalizePriority(val) {
    if (!val) return 'Medium';
    const s = String(val).trim().toLowerCase();
    if (s === 'high') return 'High';
    if (s === 'low') return 'Low';
    return 'Medium';
  }

  /**
   * Lấy chuỗi ngày hiện tại định dạng YYYY-MM-DD ở mốc 00:00:00 địa phương
   * @returns {string}
   */
  function getTodayDateString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * So sánh deadline với ngày hiện tại
   * @param {string} deadlineStr 
   * @returns {"overdue" | "today" | "future" | "none"}
   */
  function checkDeadlineStatus(deadlineStr) {
    if (!deadlineStr) return 'none';
    const today = getTodayDateString();
    if (deadlineStr < today) return 'overdue';
    if (deadlineStr === today) return 'today';
    return 'future';
  }

  /**
   * Mã hóa HTML chống XSS khi render nội dung
   * @param {string} str 
   * @returns {string}
   */
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /* ------------------------------------------------------------------
     2. ĐỌC DỮ LIỆU TỪ TASKSERVICE / LOCALSTORAGE
     ------------------------------------------------------------------ */
  function getTasksFromStorage() {
    // 1. Thử lấy qua TaskService của Người 1
    if (window.TaskService && typeof window.TaskService.getAllTasks === 'function') {
      try {
        const tasks = window.TaskService.getAllTasks();
        if (Array.isArray(tasks)) {
          return tasks.map(t => ({
            ...t,
            status: normalizeStatus(t.status),
            priority: normalizePriority(t.priority)
          }));
        }
      } catch (e) {
        console.warn('[Stats] Lỗi khi gọi TaskService.getAllTasks():', e);
      }
    }

    // 2. Fallback đọc trực tiếp từ LocalStorage
    try {
      let raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        raw = localStorage.getItem(LEGACY_STORAGE_KEY);
      }
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed.map(t => ({
            ...t,
            status: normalizeStatus(t.status),
            priority: normalizePriority(t.priority)
          }));
        }
      }
    } catch (err) {
      console.error('[Stats] Lỗi phân tích JSON từ LocalStorage:', err);
    }

    return [];
  }

  /* ------------------------------------------------------------------
     3. TÍNH TOÁN CÁC CHỈ SỐ VẬN HÀNH (METRICS & KPIS)
     ------------------------------------------------------------------ */
  function computeStatistics(tasks) {
    const totalTasks = tasks.length;
    let doneCount = 0;
    let pendingCount = 0;

    // Thống kê chi tiết theo từng mức ưu tiên: Low / Medium / High
    const priorityStats = {
      Low: { done: 0, pending: 0, total: 0 },
      Medium: { done: 0, pending: 0, total: 0 },
      High: { done: 0, pending: 0, total: 0 }
    };

    let urgentCount = 0; // High priority Pending HOẶC quá hạn / hôm nay mà Pending
    const todayStr = getTodayDateString();

    tasks.forEach(task => {
      const status = normalizeStatus(task.status);
      const priority = normalizePriority(task.priority);

      // Đếm trạng thái chung
      if (status === 'Done') {
        doneCount++;
        priorityStats[priority].done++;
      } else {
        pendingCount++;
        priorityStats[priority].pending++;

        // Kiểm tra xem có phải việc khẩn cấp không:
        // 1. Độ ưu tiên High nhưng đang Pending
        // 2. HOẶC có deadline <= ngày hôm nay nhưng đang Pending
        const isHigh = priority === 'High';
        const isOverdueOrToday = task.deadline && (task.deadline <= todayStr);
        if (isHigh || isOverdueOrToday) {
          urgentCount++;
        }
      }

      priorityStats[priority].total++;
    });

    const completionRate = totalTasks > 0 ? Math.round((doneCount / totalTasks) * 100) : 0;

    return {
      totalTasks,
      doneCount,
      pendingCount,
      completionRate,
      urgentCount,
      priorityStats
    };
  }

  /* ------------------------------------------------------------------
     4. CẬP NHẬT GIAO DIỆN: 4 THẺ KPI & THANH TIẾN ĐỘ TỔNG THỂ
     ------------------------------------------------------------------ */
  function updateSummaryUI(metrics) {
    // 1. Thẻ 1: Tổng số công việc
    const elTotal = document.getElementById('stat-total-tasks');
    if (elTotal) elTotal.textContent = metrics.totalTasks;

    // 2. Thẻ 2: Đã hoàn thành (Done) & Tỷ lệ %
    const elDone = document.getElementById('stat-done-tasks');
    const elDonePct = document.getElementById('stat-done-pct');
    if (elDone) elDone.textContent = metrics.doneCount;
    if (elDonePct) elDonePct.textContent = `${metrics.completionRate}%`;

    // 3. Thẻ 3: Đang chờ xử lý (Pending)
    const elPending = document.getElementById('stat-pending-tasks');
    if (elPending) elPending.textContent = metrics.pendingCount;

    // 4. Thẻ 4: Cần ưu tiên cao / Sắp đến hạn
    const elUrgent = document.getElementById('stat-urgent-tasks');
    if (elUrgent) elUrgent.textContent = metrics.urgentCount;

    // 5. Thanh tiến độ tổng thể (Overall Progress Bar)
    const elRate = document.getElementById('stat-completion-rate');
    const elProgressBar = document.getElementById('stat-progress-bar');
    const elProgressDesc = document.getElementById('stat-progress-desc');

    if (elRate) elRate.textContent = `${metrics.completionRate}%`;
    if (elProgressBar) elProgressBar.style.width = `${metrics.completionRate}%`;

    if (elProgressDesc) {
      if (metrics.totalTasks === 0) {
        elProgressDesc.textContent = 'Chưa có công việc nào trong ca làm.';
      } else if (metrics.completionRate === 100) {
        elProgressDesc.textContent = 'Tuyệt vời! Ca làm đã hoàn tất 100% tất cả các đầu việc!';
      } else if (metrics.completionRate >= 80) {
        elProgressDesc.textContent = `Đạt ${metrics.completionRate}% — Tiến độ xuất sắc, quán đang vận hành rất trơn tru.`;
      } else if (metrics.completionRate >= 50) {
        elProgressDesc.textContent = `Đã xong ${metrics.doneCount}/${metrics.totalTasks} việc — Đạt một nửa chặng đường ca trực.`;
      } else {
        elProgressDesc.textContent = `Còn ${metrics.pendingCount} việc đang chờ — Quản lý cần theo dõi đôn đốc nhân viên.`;
      }
    }

    // 6. Cập nhật thời gian làm mới
    const elLastUpdated = document.getElementById('last-updated-time');
    if (elLastUpdated) {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      elLastUpdated.textContent = `${timeStr} (Hôm nay)`;
    }
  }

  /* ------------------------------------------------------------------
     5. CẤU HÌNH MÀU SẮC BIỂU ĐỒ THEO DARK / LIGHT MODE (TƯƠNG THÍCH THEME.JS)
     ------------------------------------------------------------------ */
  function getChartThemeColors() {
    const isDark = (document.documentElement.getAttribute('data-theme') === 'dark') ||
                   (document.body && (document.body.classList.contains('dark-theme') || document.body.classList.contains('dark-mode'))) ||
                   document.documentElement.classList.contains('dark-theme') ||
                   document.documentElement.classList.contains('dark-mode');

    return {
      isDark,
      textColor: isDark ? '#F5EFEB' : '#2C1810',
      textSecondary: isDark ? '#B8ABA2' : '#6E5D53',
      textMuted: isDark ? '#83746B' : '#9E8E84',
      surfaceColor: isDark ? '#221B17' : '#FFFFFF',
      gridColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(44, 24, 16, 0.08)',
      tooltipBg: isDark ? 'rgba(30, 23, 19, 0.96)' : 'rgba(255, 255, 255, 0.96)',
      tooltipText: isDark ? '#FFFDF9' : '#1A0E08',
      tooltipBorder: isDark ? 'rgba(221, 162, 106, 0.35)' : '#E6DCCE',
      fontFamily: "'Be Vietnam Pro', -apple-system, BlinkMacSystemFont, sans-serif"
    };
  }

  /* ------------------------------------------------------------------
     6. KHỞI TẠO & CẬP NHẬT CHART.JS (DOUGHNUT & BAR CHARTS)
     ------------------------------------------------------------------ */
  function renderCharts(metrics) {
    const emptyState = document.getElementById('stats-empty-state');
    const chartsRow = document.getElementById('stats-charts-row');

    // Nếu không có công việc nào (0 tasks) -> Hiện Empty State thân thiện
    if (metrics.totalTasks === 0) {
      if (emptyState) emptyState.style.display = 'flex';
      if (chartsRow) chartsRow.style.display = 'none';

      // Hủy chart cũ nếu đang tồn tại
      if (statusChartInstance) {
        statusChartInstance.destroy();
        statusChartInstance = null;
      }
      if (priorityChartInstance) {
        priorityChartInstance.destroy();
        priorityChartInstance = null;
      }
      return;
    }

    // Nếu có công việc -> Ẩn Empty State và hiện Chart
    if (emptyState) emptyState.style.display = 'none';
    if (chartsRow) chartsRow.style.display = 'flex';

    if (typeof Chart === 'undefined') {
      console.warn('[Stats] Thư viện Chart.js chưa được tải!');
      return;
    }

    const theme = getChartThemeColors();

    /* ----------------------------------------------------------------
       6.1. BIỂU ĐỒ TRÒN (DOUGHNUT CHART): DONE VS PENDING
       Kèm Center Text Plugin vẽ % hoàn thành ở tâm vòng tròn
       ---------------------------------------------------------------- */
    const ctxStatus = document.getElementById('chartStatus');
    if (ctxStatus) {
      // BẮT BUỘC: Hủy instance cũ trước khi vẽ lại để tránh lỗi đè biểu đồ
      if (statusChartInstance) {
        statusChartInstance.destroy();
        statusChartInstance = null;
      }

      // Plugin vẽ % tỷ lệ ở tâm biểu đồ
      const centerTextPlugin = {
        id: 'doughnutCenterText',
        afterDraw(chart) {
          const { ctx } = chart;
          const meta = chart.getDatasetMeta(0);
          if (!meta || !meta.data || !meta.data[0]) return;
          const centerX = meta.data[0].x;
          const centerY = meta.data[0].y;

          ctx.save();
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          // Chữ % lớn
          ctx.font = `800 28px ${theme.fontFamily}`;
          ctx.fillStyle = theme.textColor;
          ctx.fillText(`${metrics.completionRate}%`, centerX, centerY - 6);

          // Phụ đề chữ nhỏ
          ctx.font = `700 10px ${theme.fontFamily}`;
          ctx.fillStyle = theme.textMuted;
          ctx.letterSpacing = '0.08em';
          ctx.fillText('HOÀN THÀNH', centerX, centerY + 18);

          ctx.restore();
        }
      };

      statusChartInstance = new Chart(ctxStatus, {
        type: 'doughnut',
        data: {
          labels: ['Đã hoàn thành (Done)', 'Đang chờ xử lý (Pending)'],
          datasets: [{
            data: [metrics.doneCount, metrics.pendingCount],
            backgroundColor: [
              '#2A9D8F', // Xanh Matcha (Done)
              '#E76F51'  // Đỏ Cam (Pending)
            ],
            hoverBackgroundColor: [
              '#228579',
              '#D95D3E'
            ],
            borderColor: theme.surfaceColor,
            borderWidth: 3,
            hoverOffset: 6
          }]
        },
        plugins: [centerTextPlugin],
        options: {
          responsive: true,
          maintainAspectRatio: false, // Bắt buộc cho responsive chuẩn
          cutout: '70%',              // Tạo khoảng rỗng tâm thanh lịch
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                color: theme.textColor,
                font: {
                  family: theme.fontFamily,
                  size: 13,
                  weight: '600'
                },
                padding: 16,
                usePointStyle: true,
                pointStyle: 'circle'
              }
            },
            tooltip: {
              backgroundColor: theme.tooltipBg,
              titleColor: theme.tooltipText,
              bodyColor: theme.tooltipText,
              borderColor: theme.tooltipBorder,
              borderWidth: 1,
              padding: 12,
              boxPadding: 6,
              usePointStyle: true,
              callbacks: {
                label: function (context) {
                  const val = context.raw || 0;
                  const pct = metrics.totalTasks > 0 ? Math.round((val / metrics.totalTasks) * 100) : 0;
                  return ` ${context.label}: ${val} việc (${pct}%)`;
                }
              }
            }
          },
          animation: {
            animateScale: true,
            animateRotate: true,
            duration: 750
          }
        }
      });
    }

    /* ----------------------------------------------------------------
       6.2. BIỂU ĐỒ CỘT (BAR CHART): PHÂN BỔ MỨC ĐỘ ƯU TIÊN
       Chia rõ 2 cột cho mỗi mức: Đã hoàn thành (Done) & Đang chờ (Pending)
       ---------------------------------------------------------------- */
    const ctxPriority = document.getElementById('chartPriority');
    if (ctxPriority) {
      // BẮT BUỘC: Hủy instance cũ trước khi vẽ lại
      if (priorityChartInstance) {
        priorityChartInstance.destroy();
        priorityChartInstance = null;
      }

      const pStats = metrics.priorityStats;

      priorityChartInstance = new Chart(ctxPriority, {
        type: 'bar',
        data: {
          labels: ['Ưu tiên Thấp (Low)', 'Trung bình (Medium)', 'Ưu tiên Cao (High)'],
          datasets: [
            {
              label: 'Đã hoàn thành',
              data: [pStats.Low.done, pStats.Medium.done, pStats.High.done],
              backgroundColor: '#2A9D8F', // Xanh Matcha
              borderColor: '#2A9D8F',
              borderWidth: 1,
              borderRadius: 6,
              maxBarThickness: 34
            },
            {
              label: 'Đang chờ xử lý',
              data: [pStats.Low.pending, pStats.Medium.pending, pStats.High.pending],
              backgroundColor: '#D4A373', // Vàng Caramel ấm áp
              borderColor: '#D4A373',
              borderWidth: 1,
              borderRadius: 6,
              maxBarThickness: 34
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false, // Bắt buộc cho responsive chuẩn
          plugins: {
            legend: {
              position: 'top',
              labels: {
                color: theme.textColor,
                font: {
                  family: theme.fontFamily,
                  size: 12,
                  weight: '600'
                },
                padding: 14,
                usePointStyle: true,
                pointStyle: 'rectRounded'
              }
            },
            tooltip: {
              backgroundColor: theme.tooltipBg,
              titleColor: theme.tooltipText,
              bodyColor: theme.tooltipText,
              borderColor: theme.tooltipBorder,
              borderWidth: 1,
              padding: 12,
              boxPadding: 6,
              usePointStyle: true
            }
          },
          scales: {
            x: {
              grid: {
                display: false
              },
              ticks: {
                color: theme.textColor,
                font: {
                  family: theme.fontFamily,
                  size: 12,
                  weight: '500'
                }
              }
            },
            y: {
              beginAtZero: true,
              ticks: {
                stepSize: 1, // Đảm bảo số lượng nguyên vẹn
                color: theme.textMuted,
                font: {
                  family: theme.fontFamily,
                  size: 12
                }
              },
              grid: {
                color: theme.gridColor
              }
            }
          },
          animation: {
            duration: 750
          }
        }
      });
    }
  }

  /* ------------------------------------------------------------------
     7. RENDER BẢNG: CÁC ĐẦU VIỆC CẦN CHÚ Ý NGAY TẠI QUÁN
     - Lọc tối đa 5 việc Pending có Priority High hoặc Deadline gần nhất / quá hạn
     ------------------------------------------------------------------ */
  function renderUrgentTasksTable(tasks) {
    const tableBody = document.getElementById('urgent-tasks-table-body');
    const emptyNotice = document.getElementById('urgent-tasks-empty');
    if (!tableBody) return;

    const todayStr = getTodayDateString();

    // 1. Chỉ lọc các việc đang ở trạng thái 'Pending'
    const pendingTasks = tasks.filter(t => normalizeStatus(t.status) === 'Pending');

    // 2. Lọc và chấm điểm mức độ khẩn cấp để sắp xếp
    const sortedTasks = [...pendingTasks].sort((a, b) => {
      const aPriority = normalizePriority(a.priority);
      const bPriority = normalizePriority(b.priority);
      const aDeadline = a.deadline || '9999-99-99';
      const bDeadline = b.deadline || '9999-99-99';

      const aIsOverdue = aDeadline < todayStr;
      const bIsOverdue = bDeadline < todayStr;

      // Quá hạn xếp trước
      if (aIsOverdue && !bIsOverdue) return -1;
      if (!aIsOverdue && bIsOverdue) return 1;

      // Đến hạn hôm nay xếp tiếp
      const aIsToday = aDeadline === todayStr;
      const bIsToday = bDeadline === todayStr;
      if (aIsToday && !bIsToday) return -1;
      if (!aIsToday && bIsToday) return 1;

      // Priority High xếp trước Medium, Medium xếp trước Low
      const weight = { High: 3, Medium: 2, Low: 1 };
      if (weight[aPriority] !== weight[bPriority]) {
        return weight[bPriority] - weight[aPriority];
      }

      // Cuối cùng so sánh deadline ngày nào sớm hơn
      return aDeadline.localeCompare(bDeadline);
    });

    // 3. Lấy tối đa 5 việc khẩn cấp nhất
    const urgentTop5 = sortedTasks.slice(0, 5);

    if (urgentTop5.length === 0) {
      tableBody.innerHTML = '';
      if (emptyNotice) emptyNotice.style.display = 'block';
      return;
    }

    if (emptyNotice) emptyNotice.style.display = 'none';

    // 4. Render HTML các hàng
    tableBody.innerHTML = urgentTop5.map((task, index) => {
      const priority = normalizePriority(task.priority);
      const deadlineStatus = checkDeadlineStatus(task.deadline);

      // Badge Deadline
      let deadlineBadge = '';
      if (deadlineStatus === 'overdue') {
        deadlineBadge = `<span class="badge bg-danger-subtle text-danger border border-danger-subtle"><i class="fa-solid fa-triangle-exclamation me-1"></i> Quá hạn (${task.deadline})</span>`;
      } else if (deadlineStatus === 'today') {
        deadlineBadge = `<span class="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle"><i class="fa-regular fa-clock me-1"></i> Hôm nay (${task.deadline})</span>`;
      } else if (task.deadline) {
        deadlineBadge = `<span class="text-secondary small"><i class="fa-regular fa-calendar me-1"></i> ${task.deadline}</span>`;
      } else {
        deadlineBadge = `<span class="text-muted small">Không đặt</span>`;
      }

      // Badge Priority
      let priorityBadge = '';
      if (priority === 'High') {
        priorityBadge = `<span class="badge bg-danger-subtle text-danger"><i class="fa-solid fa-fire me-1"></i> Ưu tiên cao</span>`;
      } else if (priority === 'Medium') {
        priorityBadge = `<span class="badge bg-warning-subtle text-warning-emphasis"><i class="fa-solid fa-bolt me-1"></i> Trung bình</span>`;
      } else {
        priorityBadge = `<span class="badge bg-secondary-subtle text-secondary-emphasis"><i class="fa-solid fa-arrow-down me-1"></i> Thấp</span>`;
      }

      return `
        <tr>
          <td class="text-muted fw-bold">#${index + 1}</td>
          <td>
            <div class="fw-bold" style="color: var(--text-primary); font-size: 0.95rem;">${escapeHtml(task.title)}</div>
            ${task.description ? `<small class="text-secondary d-none d-md-inline-block" style="max-width: 320px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(task.description)}</small>` : ''}
          </td>
          <td>${deadlineBadge}</td>
          <td>${priorityBadge}</td>
          <td>
            <span class="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle">
              <i class="fa-solid fa-hourglass-half me-1"></i> Chờ làm
            </span>
          </td>
          <td class="text-end">
            <button type="button" class="btn btn-sm btn-outline-success btn-quick-done" data-id="${escapeHtml(task.id)}" title="Đánh dấu đã hoàn thành ngay">
              <i class="fa-solid fa-check me-1"></i> Xong
            </button>
          </td>
        </tr>
      `;
    }).join('');

    // 5. Gắn sự kiện click nút "Xong" nhanh
    tableBody.querySelectorAll('.btn-quick-done').forEach(btn => {
      btn.addEventListener('click', function () {
        const taskId = this.getAttribute('data-id');
        if (!taskId) return;

        if (window.TaskService && typeof window.TaskService.toggleStatus === 'function') {
          const updated = window.TaskService.toggleStatus(taskId);
          if (updated) {
            if (typeof window.showToast === 'function') {
              window.showToast('Đã đánh dấu hoàn thành công việc khẩn cấp!', 'success');
            }
          }
        } else {
          // Fallback cập nhật LocalStorage trực tiếp
          const tasks = getTasksFromStorage();
          const target = tasks.find(t => t.id === taskId);
          if (target) {
            target.status = 'Done';
            target.updatedAt = new Date().toISOString();
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
              updateAllStatistics();
              if (typeof window.showToast === 'function') {
                window.showToast('Đã đánh dấu hoàn thành công việc!', 'success');
              }
            } catch (e) {
              console.error(e);
            }
          }
        }
      });
    });
  }

  /* ------------------------------------------------------------------
     8. HÀM ĐIỀU PHỐI CHÍNH: LÀM MỚI TOÀN BỘ SỐ LIỆU & BIỂU ĐỒ
     ------------------------------------------------------------------ */
  function updateAllStatistics() {
    const tasks = getTasksFromStorage();
    const metrics = computeStatistics(tasks);

    // 1. Cập nhật 4 thẻ KPI và thanh tiến độ
    updateSummaryUI(metrics);

    // 2. Vẽ lại 2 biểu đồ Chart.js
    renderCharts(metrics);

    // 3. Render bảng các đầu việc cần chú ý ngay
    renderUrgentTasksTable(tasks);
  }

  /* ------------------------------------------------------------------
     9. KHỞI TẠO TẤT CẢ SỰ KIỆN TƯƠNG TÁC & REALTIME SYNC
     ------------------------------------------------------------------ */
  function registerEventListeners() {
    // 9.1. Lắng nghe CustomEvent 'tasks:changed' do TaskService phát ra
    window.addEventListener('tasks:changed', function (e) {
      console.log('[Stats] Dữ liệu thay đổi từ TaskService, làm mới biểu đồ...');
      updateAllStatistics();
    });

    // 9.2. Lắng nghe Storage Event khi người dùng thêm/sửa/xóa task ở tab khác
    window.addEventListener('storage', function (e) {
      if (e.key === STORAGE_KEY || e.key === LEGACY_STORAGE_KEY || e.key === 'CAFE_THEME' || e.key === 'theme') {
        console.log('[Stats] Phát hiện thay đổi trong LocalStorage từ tab khác, đồng bộ...');
        updateAllStatistics();
      }
    });

    // 9.3. Lắng nghe sự kiện themechange từ theme.js
    window.addEventListener('themechange', function () {
      setTimeout(updateAllStatistics, 50);
    });

    // 9.4. Tự động đổi màu biểu đồ khi bật/tắt Dark Mode
    const themeButtons = document.querySelectorAll('.theme-toggle-btn, #theme-toggle');
    themeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        setTimeout(updateAllStatistics, 120);
      });
    });

    // Dùng MutationObserver theo dõi thuộc tính data-theme và class trên <html> và <body>
    const observer = new MutationObserver(function (mutations) {
      for (const mutation of mutations) {
        if (mutation.type === 'attributes' && (mutation.attributeName === 'data-theme' || mutation.attributeName === 'class')) {
          updateAllStatistics();
          break;
        }
      }
    });
    observer.observe(document.documentElement, { attributes: true });
    if (document.body) {
      observer.observe(document.body, { attributes: true });
    }

    // 9.5. Nút "Làm mới số liệu" trên Header
    const refreshBtn = document.getElementById('btn-refresh-stats');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', function () {
        const icon = this.querySelector('i');
        if (icon) icon.classList.add('fa-spin');

        updateAllStatistics();

        setTimeout(() => {
          if (icon) icon.classList.remove('fa-spin');
          if (typeof window.showToast === 'function') {
            window.showToast('Đã làm mới số liệu và cập nhật biểu đồ thành công!', 'info');
          }
        }, 400);
      });
    }

    // 9.6. Nút "In / Xuất PDF"
    const printBtn = document.getElementById('btn-print-report');
    if (printBtn) {
      printBtn.addEventListener('click', function () {
        window.print();
      });
    }

    // 9.7. Form gửi phản hồi vận hành
    const contactForm = document.getElementById('cafe-contact-form');
    if (contactForm) {
      contactForm.addEventListener('submit', function (e) {
        e.preventDefault();
        const nameInput = document.getElementById('feedback-name');
        const name = nameInput ? nameInput.value.trim() : 'Quý khách';

        if (typeof window.showToast === 'function') {
          window.showToast(`Cảm ơn bạn ${name}! Ý kiến phản hồi đã được gửi đến ban quản lý quán.`, 'success');
        } else {
          alert(`Cảm ơn bạn ${name}! Ý kiến phản hồi đã được gửi thành công.`);
        }

        contactForm.reset();
      });
    }
  }

  /* ------------------------------------------------------------------
     10. KHỞI CHẠY KHI TẢI XONG TRANG
     ------------------------------------------------------------------ */
  document.addEventListener('DOMContentLoaded', function () {
    // Đảm bảo TaskService đã khởi tạo nếu có
    if (window.TaskService && typeof window.TaskService.init === 'function') {
      window.TaskService.init();
    }

    updateAllStatistics();
    registerEventListeners();
  });

  // Xuất hàm ra window để dễ dàng kiểm thử hoặc trigger thủ công
  window.refreshCafeStats = updateAllStatistics;

})(window, document);
