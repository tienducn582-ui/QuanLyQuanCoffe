/**
 * ====================================================================
 * CAFE TASK MANAGER - LOGIC TRANG THỐNG KÊ & BÁO CÁO (STATISTICS)
 * Thành viên phụ trách: TV4 (Cơ sở dữ liệu, Thống kê, Kiểm thử)
 * Module: public/assets/js/statistics.js
 * ====================================================================
 * Bao gồm:
 * - 6 thẻ KPI tổng quan: total, pending, inProgress, done, overdue, completionRate
 * - 3 biểu đồ cốt lõi: Doughnut (Trạng thái), Bar (Ưu tiên), Horizontal Bar (Danh mục)
 * - Tác vụ mở rộng [TV4-X6]:
 *     1. Bảng thống kê hiệu suất theo nhân viên (/api/stats/by-user)
 *     2. Biểu đồ cột theo ca làm việc (/api/stats/by-shift)
 *     3. Biểu đồ đường tiến độ theo tuần (/api/stats/weekly?weeks=)
 *     4. Nút Xuất CSV toàn bộ công việc (/api/stats/export.csv) có xác thực và phân quyền Admin
 */

// Biến lưu trữ 5 đối tượng biểu đồ Chart.js để hủy khi làm mới (chống memory leak)
let chartStatusInstance = null;
let chartPriorityInstance = null;
let chartCategoryInstance = null;
let chartShiftInstance = null;
let chartWeeklyInstance = null;

// Khai báo fallback nếu chưa tải kịp api.js hoặc ui.js từ TV5
const safeApiFetch = async (path, options = {}) => {
  if (typeof apiFetch === 'function') {
    return await apiFetch(path, options);
  }
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
    return false;
  }
  return true;
};

const safeIsAdmin = () => {
  if (typeof isAdmin === 'function') {
    return isAdmin();
  }
  try {
    const userStr = localStorage.getItem('user');
    if (!userStr) return false;
    const user = JSON.parse(userStr);
    return user && user.role === 'Admin';
  } catch (e) {
    return false;
  }
};

const safeShowToast = (message, type = 'info') => {
  if (typeof showToast === 'function') {
    showToast(message, type);
  } else {
    console.log(`[Toast ${type}]: ${message}`);
  }
};

const safeEscapeHtml = (str) => {
  if (typeof escapeHtml === 'function') {
    return escapeHtml(str);
  }
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

/**
 * Khởi tạo trang Thống kê khi toàn bộ DOM đã sẵn sàng
 */
document.addEventListener('DOMContentLoaded', async () => {
  if (!safeRequireLogin()) return;

  // 1. Phân quyền hiển thị nút Xuất CSV (Chỉ Admin)
  const btnExportCsv = document.getElementById('btn-export-csv');
  if (btnExportCsv) {
    if (safeIsAdmin()) {
      btnExportCsv.style.display = 'inline-flex';
      btnExportCsv.addEventListener('click', handleExportCsv);
    } else {
      btnExportCsv.style.display = 'none';
    }
  }

  // 2. Gắn sự kiện nút Làm mới
  const btnRefresh = document.getElementById('btn-refresh-stats');
  if (btnRefresh) {
    btnRefresh.addEventListener('click', () => {
      loadAllStatistics(true);
    });
  }

  // 3. Gắn sự kiện nút In báo cáo
  const btnPrint = document.getElementById('btn-print-report');
  if (btnPrint) {
    btnPrint.addEventListener('click', () => {
      window.print();
    });
  }

  // 4. Gắn sự kiện thay đổi số tuần thống kê
  const selectWeeks = document.getElementById('select-weekly-weeks');
  if (selectWeeks) {
    selectWeeks.addEventListener('change', () => {
      loadWeeklyStats(selectWeeks.value);
    });
  }

  // 5. Nạp toàn bộ dữ liệu thống kê
  await loadAllStatistics();
});

/**
 * Xử lý tải và tải về file CSV cho Admin
 */
async function handleExportCsv() {
  const btnExportCsv = document.getElementById('btn-export-csv');
  try {
    if (btnExportCsv) btnExportCsv.disabled = true;
    safeShowToast('Đang tạo và chuẩn bị file CSV...', 'info');

    const token = localStorage.getItem('token');
    const response = await fetch('/api/stats/export.csv', {
      method: 'GET',
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    });

    if (!response.ok) {
      if (response.status === 403) {
        throw new Error('Bạn không có quyền thực hiện xuất file CSV (Yêu cầu tài khoản Admin)');
      }
      if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'login.html';
        throw new Error('Phiên đăng nhập đã hết hạn');
      }
      throw new Error('Không thể tải file CSV từ máy chủ');
    }

    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = 'tasks-export.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);

    safeShowToast('Đã xuất file CSV thành công!', 'success');
  } catch (err) {
    console.error('[Export CSV Error]:', err);
    safeShowToast(err.message || 'Lỗi khi xuất file CSV', 'danger');
  } finally {
    if (btnExportCsv) btnExportCsv.disabled = false;
  }
}

/**
 * Tải toàn bộ dữ liệu thống kê: KPI, Trạng thái, Ưu tiên, Danh mục, Nhân viên, Ca làm, Tuần
 */
async function loadAllStatistics(isManualRefresh = false) {
  const loadingEl = document.getElementById('loading-spinner');
  const emptyStateEl = document.getElementById('stats-empty-state');
  const chartsRowEl = document.getElementById('stats-charts-row');
  const btnRefresh = document.getElementById('btn-refresh-stats');

  try {
    if (loadingEl) loadingEl.style.display = 'flex';
    if (btnRefresh) btnRefresh.disabled = true;

    // 1. Nạp thống kê tổng quan (GET /api/stats)
    const statsRes = await safeApiFetch('/api/stats');
    const { totals, byStatus, byPriority, byCategory } = statsRes.data || {};

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
      const tbodyByUser = document.getElementById('table-by-user-body');
      if (tbodyByUser) {
        tbodyByUser.innerHTML = '<tr><td colspan="5" class="text-center py-3 text-secondary">Chưa có dữ liệu phân công nhân sự</td></tr>';
      }
      destroyAllCharts();
      if (isManualRefresh) {
        safeShowToast('Hệ thống chưa có công việc nào để thống kê', 'warning');
      }
      return;
    }

    if (emptyStateEl) emptyStateEl.style.display = 'none';
    if (chartsRowEl) chartsRowEl.style.display = 'flex';

    renderKpiCards(totals);
    renderChartStatus(byStatus);
    renderChartPriority(byPriority);
    renderChartCategory(byCategory);

    // 2. Nạp song song các chỉ số nâng cao (by-user, by-shift, weekly)
    const selectWeeks = document.getElementById('select-weekly-weeks');
    const currentWeeks = selectWeeks ? selectWeeks.value : 8;

    await Promise.all([
      loadByUserStats(),
      loadByShiftStats(),
      loadWeeklyStats(currentWeeks)
    ]);

    if (isManualRefresh) {
      safeShowToast('Đã làm mới toàn bộ số liệu thống kê thành công!', 'success');
    }
  } catch (error) {
    console.error('[Statistics Error]:', error);
    safeShowToast(error.message || 'Không thể tải dữ liệu thống kê từ máy chủ', 'danger');
  } finally {
    if (loadingEl) loadingEl.style.display = 'none';
    if (btnRefresh) btnRefresh.disabled = false;
  }
}

/**
 * Nạp thống kê theo nhân viên: GET /api/stats/by-user
 */
async function loadByUserStats() {
  const tbody = document.getElementById('table-by-user-body');
  if (!tbody) return;

  try {
    const res = await safeApiFetch('/api/stats/by-user');
    const list = res.data || [];

    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center py-3 text-secondary">Chưa có dữ liệu phân công nhân sự</td></tr>`;
      return;
    }

    tbody.innerHTML = list.map(item => {
      const total = Number(item.total || 0);
      const done = Number(item.done || 0);
      const overdue = Number(item.overdue || 0);
      const rate = total > 0 ? Math.round((done / total) * 1000) / 10 : 0;
      const isUnassigned = !item.userId;

      return `
        <tr>
          <td>
            <div class="d-flex align-items-center gap-2">
              <div class="rounded-circle d-flex align-items-center justify-content-center text-white" 
                   style="width: 32px; height: 32px; background: ${isUnassigned ? '#6c757d' : 'var(--primary)'}; font-size: 0.8rem; font-weight: 700;">
                ${isUnassigned ? '?' : safeEscapeHtml(item.fullName.charAt(0).toUpperCase())}
              </div>
              <div>
                <strong class="d-block ${isUnassigned ? 'text-secondary fst-italic' : 'text-dark'}">
                  ${safeEscapeHtml(item.fullName)}
                </strong>
                ${isUnassigned ? '<small class="text-muted">Chưa giao cụ thể</small>' : '<small class="text-muted">Nhân viên ca trực</small>'}
              </div>
            </div>
          </td>
          <td class="text-center fw-semibold">${total}</td>
          <td class="text-center text-success fw-semibold">${done}</td>
          <td class="text-center ${overdue > 0 ? 'text-danger fw-bold' : 'text-secondary'}">${overdue}</td>
          <td class="text-center">
            <div class="d-flex align-items-center justify-content-center gap-2">
              <div class="progress flex-grow-1" style="height: 6px; max-width: 80px;">
                <div class="progress-bar bg-success" role="progressbar" style="width: ${rate}%;"></div>
              </div>
              <span class="small fw-bold text-dark">${rate}%</span>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error('[Stats by-user Error]:', err);
    tbody.innerHTML = `<tr><td colspan="5" class="text-center py-3 text-danger">Không thể tải dữ liệu nhân viên</td></tr>`;
  }
}

/**
 * Nạp thống kê theo ca làm: GET /api/stats/by-shift
 */
async function loadByShiftStats() {
  const canvas = document.getElementById('chartShift');
  if (!canvas || typeof Chart === 'undefined') return;

  try {
    const res = await safeApiFetch('/api/stats/by-shift');
    const list = res.data || [];

    if (chartShiftInstance) {
      chartShiftInstance.destroy();
      chartShiftInstance = null;
    }

    const labels = list.map(item => item.shiftName);
    const totalData = list.map(item => item.total);
    const doneData = list.map(item => item.done);

    chartShiftInstance = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: labels.length ? labels : ['Chưa có ca'],
        datasets: [
          {
            label: 'Tổng công việc',
            data: totalData.length ? totalData : [0],
            backgroundColor: '#3498DB',
            borderRadius: 6,
            maxBarThickness: 36
          },
          {
            label: 'Đã hoàn thành',
            data: doneData.length ? doneData : [0],
            backgroundColor: '#2A9D8F',
            borderRadius: 6,
            maxBarThickness: 36
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: { boxWidth: 12, font: { family: "'Be Vietnam Pro', sans-serif" } }
          },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.dataset.label}: ${ctx.raw} việc`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { stepSize: 1, precision: 0 }
          },
          x: { grid: { display: false } }
        }
      }
    });
  } catch (err) {
    console.error('[Stats by-shift Error]:', err);
  }
}

/**
 * Nạp thống kê tiến độ theo tuần: GET /api/stats/weekly?weeks=8
 */
async function loadWeeklyStats(weeks = 8) {
  const canvas = document.getElementById('chartWeekly');
  if (!canvas || typeof Chart === 'undefined') return;

  try {
    const res = await safeApiFetch(`/api/stats/weekly?weeks=${weeks}`);
    const list = res.data || [];

    if (chartWeeklyInstance) {
      chartWeeklyInstance.destroy();
      chartWeeklyInstance = null;
    }

    const labels = list.map(item => {
      // Định dạng ngày ngắn gọn dd/MM
      const parts = item.weekStart.split('-');
      if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
      return item.weekStart;
    });
    const totalData = list.map(item => item.total);
    const doneData = list.map(item => item.done);

    chartWeeklyInstance = new Chart(canvas, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Tổng công việc',
            data: totalData,
            borderColor: '#E67E22',
            backgroundColor: 'rgba(230, 126, 34, 0.1)',
            fill: true,
            tension: 0.3,
            borderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6
          },
          {
            label: 'Đã hoàn thành',
            data: doneData,
            borderColor: '#2A9D8F',
            backgroundColor: 'rgba(42, 157, 143, 0.1)',
            fill: true,
            tension: 0.3,
            borderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: { boxWidth: 12, font: { family: "'Be Vietnam Pro', sans-serif" } }
          },
          tooltip: {
            callbacks: {
              title: (ctx) => `Tuần bắt đầu từ thứ Hai: ${list[ctx[0].dataIndex]?.weekStart}`,
              label: (ctx) => ` ${ctx.dataset.label}: ${ctx.raw} việc`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { stepSize: 1, precision: 0 }
          },
          x: { grid: { display: false } }
        }
      }
    });
  } catch (err) {
    console.error('[Stats weekly Error]:', err);
  }
}

/**
 * Hiển thị 6 thẻ chỉ số KPI chính
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

  const elTotal = document.getElementById('stat-total-tasks');
  if (elTotal) elTotal.textContent = total;

  const elDone = document.getElementById('stat-done-tasks');
  if (elDone) elDone.textContent = done;

  const elDonePct = document.getElementById('stat-done-pct');
  if (elDonePct) elDonePct.textContent = `${completionRate}%`;

  const elInProgress = document.getElementById('stat-inprogress-tasks');
  if (elInProgress) elInProgress.textContent = inProgress;

  const elPending = document.getElementById('stat-pending-tasks');
  if (elPending) elPending.textContent = pending;

  const elOverdue = document.getElementById('stat-overdue-tasks');
  if (elOverdue) elOverdue.textContent = overdue;

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
 * Hủy toàn bộ 5 biểu đồ cũ để tránh lỗi vẽ đè hoặc rò rỉ bộ nhớ
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
  if (chartShiftInstance) {
    chartShiftInstance.destroy();
    chartShiftInstance = null;
  }
  if (chartWeeklyInstance) {
    chartWeeklyInstance.destroy();
    chartWeeklyInstance = null;
  }
}

/**
 * Biểu đồ 1: Doughnut Chart theo Trạng thái
 */
function renderChartStatus(byStatus = []) {
  const canvas = document.getElementById('chartStatus');
  if (!canvas || typeof Chart === 'undefined') return;

  if (chartStatusInstance) {
    chartStatusInstance.destroy();
  }

  const labelMap = {
    'Pending': 'Đang chờ xử lý',
    'InProgress': 'Đang thực hiện',
    'Done': 'Đã hoàn thành'
  };

  const labels = byStatus.map(item => labelMap[item.label] || item.label);
  const data = byStatus.map(item => item.count);
  const backgroundColors = ['#E67E22', '#3498DB', '#2A9D8F'];

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
 * Biểu đồ 2: Bar Chart theo Mức độ ưu tiên
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
  const colors = ['#6c757d', '#DDA266', '#E76F51'];

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
        x: { grid: { display: false } }
      }
    }
  });
}

/**
 * Biểu đồ 3: Horizontal Bar Chart theo Danh mục công việc
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
        backgroundColor: '#6F4E37',
        borderRadius: 6,
        maxBarThickness: 28
      }]
    },
    options: {
      indexAxis: 'y',
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
        y: { grid: { display: false } }
      }
    }
  });
}
