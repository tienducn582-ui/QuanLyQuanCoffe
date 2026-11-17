/**
 * ====================================================================
 * CAFE TASK MANAGER - LOGIC TRANG THỐNG KÊ & BÁO CÁO (STATISTICS)
 * Thành viên phụ trách: TV4 (Cơ sở dữ liệu, Thống kê, Kiểm thử)
 * Module: public/assets/js/statistics.js
 * ====================================================================
 * Mô tả:
 * - Gọi GET /api/stats thông qua hàm chuẩn apiFetch(path, options)
 * - Hiển thị 6 thẻ KPI tổng quan: total, pending, inProgress, done, overdue, completionRate
 * - Vẽ 3 biểu đồ trực quan hóa Chart.js:
 *     1. Biểu đồ Doughnut theo Trạng thái (Pending, InProgress, Done)
 *     2. Biểu đồ Bar theo Mức độ ưu tiên (Low, Medium, High)
 *     3. Biểu đồ Bar theo Danh mục công việc (Pha chế, Phục vụ, Vệ sinh, v.v.)
 * - Hủy (destroy) biểu đồ cũ trước khi vẽ lại để tránh rò rỉ bộ nhớ (memory leak)
 * - Tự động kiểm tra đăng nhập bằng requireLogin()
 * - Quản lý trạng thái Spinner loading và Empty state
 */

// Biến lưu trữ đối tượng biểu đồ Chart.js hiện hành để hủy khi làm mới
let chartStatusInstance = null;
let chartPriorityInstance = null;
let chartCategoryInstance = null;

// Khai báo fallback nếu chưa tải kịp api.js hoặc ui.js từ TV5
const safeApiFetch = async (path, options = {}) => {
  if (typeof apiFetch === 'function') {
    return await apiFetch(path, options);
  }
  // Dự phòng tiêu chuẩn nếu api.js chưa load
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };
  const response = await fetch(path, { ...options, headers });
  if (response.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
    throw new Error('Phiên đăng nhập đã hết hạn');
  }
  const json = await response.json();
  if (!response.ok || !json.success) {
    throw new Error(json.message || 'Lỗi khi gọi API');
  }
  return json;
};

const safeRequireLogin = () => {
  if (typeof requireLogin === 'function') {
    return requireLogin();
  }
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = 'login.html';
  }
};

const safeShowToast = (message, type = 'info') => {
  if (typeof showToast === 'function') {
    showToast(message, type);
  } else {
    console.log(`[Toast ${type}]: ${message}`);
  }
};

/**
 * Khởi tạo trang Thống kê khi toàn bộ DOM đã sẵn sàng
 */
document.addEventListener('DOMContentLoaded', async () => {
  // 1. Kiểm tra xác thực người dùng
  safeRequireLogin();

  // 2. Render Navbar dùng chung nếu có ui.js
  if (typeof renderNavbar === 'function') {
    renderNavbar();
  }

  // 3. Gắn sự kiện nút chức năng
  const btnRefresh = document.getElementById('btn-refresh-stats');
  if (btnRefresh) {
    btnRefresh.addEventListener('click', () => {
      loadStatisticsData(true);
    });
  }

  const btnPrint = document.getElementById('btn-print-report');
  if (btnPrint) {
    btnPrint.addEventListener('click', () => {
      window.print();
    });
  }

  // 4. Nạp dữ liệu thống kê từ API lần đầu
  await loadStatisticsData();
});

/**
 * Tải dữ liệu từ Backend Endpoint: GET /api/stats
 * @param {boolean} isManualRefresh - Có phải người dùng bấm nút làm mới hay không
 */
async function loadStatisticsData(isManualRefresh = false) {
  const loadingEl = document.getElementById('loading-spinner');
  const emptyStateEl = document.getElementById('stats-empty-state');
  const chartsRowEl = document.getElementById('stats-charts-row');
  const btnRefresh = document.getElementById('btn-refresh-stats');

  try {
    // Bật hiệu ứng đang tải
    if (loadingEl) loadingEl.style.display = 'flex';
    if (btnRefresh) btnRefresh.disabled = true;

    // Gọi API Backend
    const response = await safeApiFetch('/api/stats');
    const { totals, byStatus, byPriority, byCategory } = response.data || {};

    // Cập nhật mốc thời gian làm mới
    const lastUpdatedEl = document.getElementById('last-updated-time');
    if (lastUpdatedEl) {
      const now = new Date();
      lastUpdatedEl.textContent = now.toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
    }

    // Kiểm tra dữ liệu rỗng (Nếu quán chưa có công việc nào)
    if (!totals || totals.total === 0) {
      if (emptyStateEl) emptyStateEl.style.display = 'block';
      if (chartsRowEl) chartsRowEl.style.display = 'none';
      renderKpiCards({
        total: 0,
        pending: 0,
        inProgress: 0,
        done: 0,
        overdue: 0,
        completionRate: 0
      });
      destroyAllCharts();
      if (isManualRefresh) {
        safeShowToast('Hệ thống chưa có công việc nào để thống kê', 'warning');
      }
      return;
    }

    // Hiển thị khung biểu đồ nếu có dữ liệu
    if (emptyStateEl) emptyStateEl.style.display = 'none';
    if (chartsRowEl) chartsRowEl.style.display = 'flex';

    // 1. Cập nhật 6 thẻ KPI
    renderKpiCards(totals);

    // 2. Vẽ 3 biểu đồ Chart.js
    renderChartStatus(byStatus);
    renderChartPriority(byPriority);
    renderChartCategory(byCategory);

    if (isManualRefresh) {
      safeShowToast('Đã làm mới số liệu thống kê thành công!', 'success');
    }
  } catch (error) {
    console.error('[Statistics Error]:', error);
    safeShowToast(error.message || 'Không thể tải dữ liệu thống kê từ máy chủ', 'danger');
  } finally {
    // Tắt hiệu ứng đang tải
    if (loadingEl) loadingEl.style.display = 'none';
    if (btnRefresh) btnRefresh.disabled = false;
  }
}

/**
 * Hiển thị 6 thẻ chỉ số KPI chính
 * @param {Object} totals - { total, pending, inProgress, done, overdue, completionRate }
 */
function renderKpiCards(totals) {
  const {
    total = 0,
    pending = 0,
    inProgress = 0,
    done = 0,
    overdue = 0,
    completionRate = 0
  } = totals;

  // Thẻ 1: Tổng số công việc
  const elTotal = document.getElementById('stat-total-tasks');
  if (elTotal) elTotal.textContent = total;

  // Thẻ 2: Đã hoàn thành (Done)
  const elDone = document.getElementById('stat-done-tasks');
  if (elDone) elDone.textContent = done;

  const elDonePct = document.getElementById('stat-done-pct');
  if (elDonePct) elDonePct.textContent = `${completionRate}%`;

  // Thẻ 3: Đang thực hiện (InProgress)
  const elInProgress = document.getElementById('stat-inprogress-tasks');
  if (elInProgress) elInProgress.textContent = inProgress;

  // Thẻ 4: Đang chờ xử lý (Pending)
  const elPending = document.getElementById('stat-pending-tasks');
  if (elPending) elPending.textContent = pending;

  // Thẻ 5: Quá hạn chưa hoàn thành (Overdue)
  const elOverdue = document.getElementById('stat-overdue-tasks');
  if (elOverdue) elOverdue.textContent = overdue;

  // Thẻ 6: Tỷ lệ hoàn thành tổng thể & Thanh tiến độ
  const elRate = document.getElementById('stat-completion-rate');
  if (elRate) elRate.textContent = `${completionRate}%`;

  const elBar = document.getElementById('stat-progress-bar');
  if (elBar) elBar.style.width = `${Math.min(completionRate, 100)}%`;

  const elDesc = document.getElementById('stat-progress-desc');
  if (elDesc) {
    elDesc.textContent = `Đã hoàn thành ${done}/${total} đầu việc (${completionRate}%)`;
  }
}

/**
 * Hủy toàn bộ biểu đồ cũ để tránh lỗi vẽ đè hoặc rò rỉ bộ nhớ
 */
function destroyAllCharts() {
  if (chartStatusInstance) {
    chartStatusInstance.destroy();
    chartStatusInstance = null;
  }
  if (chartPriorityInstance) {
    chartPriorityInstance.destroy();
    chartPriorityInstance = null;
  }
  if (chartCategoryInstance) {
    chartCategoryInstance.destroy();
    chartCategoryInstance = null;
  }
}

/**
 * Biểu đồ 1: Doughnut Chart theo Trạng thái (Pending, InProgress, Done)
 * @param {Array} byStatus - [ { label, count } ]
 */
function renderChartStatus(byStatus = []) {
  const canvas = document.getElementById('chartStatus');
  if (!canvas || typeof Chart === 'undefined') return;

  if (chartStatusInstance) {
    chartStatusInstance.destroy();
  }

  // Chuẩn hóa tên nhãn tiếng Việt dễ nhìn
  const labelMap = {
    'Pending': 'Đang chờ xử lý',
    'InProgress': 'Đang thực hiện',
    'Done': 'Đã hoàn thành'
  };

  const labels = byStatus.map(item => labelMap[item.label] || item.label);
  const data = byStatus.map(item => item.count);

  // Bảng màu nhận diện thương hiệu Cafe (Nâu đất, Cam hổ phách, Xanh cổ vịt)
  const backgroundColors = [
    '#E67E22', // Pending: Cam ấm
    '#3498DB', // InProgress: Xanh dương
    '#2A9D8F'  // Done: Xanh ngọc ấm
  ];

  chartStatusInstance = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: labels.length ? labels : ['Chưa có dữ liệu'],
      datasets: [{
        data: data.length ? data : [0],
        backgroundColor: backgroundColors,
        borderWidth: 2,
        borderColor: '#ffffff',
        hoverOffset: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            boxWidth: 14,
            padding: 16,
            font: { family: "'Be Vietnam Pro', sans-serif", size: 12 }
          }
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              const val = context.raw || 0;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const pct = total > 0 ? Math.round((val / total) * 100) : 0;
              return ` ${context.label}: ${val} việc (${pct}%)`;
            }
          }
        }
      },
      cutout: '65%'
    }
  });
}

/**
 * Biểu đồ 2: Bar Chart theo Mức độ ưu tiên (Low, Medium, High)
 * @param {Array} byPriority - [ { label, count } ]
 */
function renderChartPriority(byPriority = []) {
  const canvas = document.getElementById('chartPriority');
  if (!canvas || typeof Chart === 'undefined') return;

  if (chartPriorityInstance) {
    chartPriorityInstance.destroy();
  }

  const labelMap = {
    'Low': 'Ưu tiên thấp (Low)',
    'Medium': 'Ưu tiên vừa (Medium)',
    'High': 'Ưu tiên cao (High)'
  };

  const labels = byPriority.map(item => labelMap[item.label] || item.label);
  const data = byPriority.map(item => item.count);

  const colors = [
    '#6c757d', // Low: Xám thanh lịch
    '#DDA266', // Medium: Nâu vàng cafe
    '#E76F51'  // High: Đỏ đất nung
  ];

  chartPriorityInstance = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Số lượng công việc',
        data: data,
        backgroundColor: colors,
        borderRadius: 8,
        borderSkipped: false,
        maxBarThickness: 46
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => ` Số lượng: ${ctx.raw} công việc`
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { stepSize: 1, precision: 0 }
        },
        x: {
          grid: { display: false }
        }
      }
    }
  });
}

/**
 * Biểu đồ 3: Horizontal Bar Chart theo Danh mục công việc
 * @param {Array} byCategory - [ { label, count } ]
 */
function renderChartCategory(byCategory = []) {
  const canvas = document.getElementById('chartCategory');
  if (!canvas || typeof Chart === 'undefined') return;

  if (chartCategoryInstance) {
    chartCategoryInstance.destroy();
  }

  const labels = byCategory.map(item => item.label);
  const data = byCategory.map(item => item.count);

  chartCategoryInstance = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Số công việc thuộc nhóm',
        data: data,
        backgroundColor: '#6F4E37', // Nâu cà phê đậm chủ đạo
        borderRadius: 6,
        maxBarThickness: 28
      }]
    },
    options: {
      indexAxis: 'y', // Biểu đồ dạng thanh nằm ngang dễ đọc tên danh mục dài
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${ctx.dataset.label}: ${ctx.raw} việc`
          }
        }
      },
      scales: {
        x: {
          beginAtZero: true,
          ticks: { stepSize: 1, precision: 0 }
        },
        y: {
          grid: { display: false }
        }
      }
    }
  });
}
