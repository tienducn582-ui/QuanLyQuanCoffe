/**
 * public/assets/js/templates.js - Logic trang Mẫu việc theo ca / checklist mở - đóng ca (public/templates.html)
 * Thành viên phụ trách: TV3 (tác vụ TV3-X3)
 *
 * Trang chỉ dành cho Admin. Mọi dữ liệu lấy và lưu qua API (/api/templates, /api/shifts, /api/categories),
 * KHÔNG dùng LocalStorage cho dữ liệu nghiệp vụ.
 * Dùng các hàm chung: apiFetch, isAdmin, requireLogin (api.js)
 * và showToast, showEmpty, escapeHtml, showLoading, hideLoading, validateField (ui.js).
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Bắt buộc đăng nhập; chỉ Admin được vào trang này
  if (!requireLogin()) return;
  if (!isAdmin()) {
    document.getElementById('templatesMain').innerHTML = '';
    showToast('Chỉ Admin được vào trang này', 'danger');
    setTimeout(() => { window.location.href = 'tasks.html'; }, 1500);
    return;
  }

  const PRIORITY_LABELS = { Low: 'Thấp', Medium: 'Trung bình', High: 'Cao' };
  const PRIORITY_BADGE = { Low: 'bg-secondary', Medium: 'bg-info text-dark', High: 'bg-danger' };
  const TITLE_RULES = { required: true, maxLength: 200, label: 'Tên mẫu việc' };
  const DESC_RULES = { maxLength: 500, label: 'Mô tả' };
  const SHIFT_RULES = { required: true, label: 'Ca làm' };

  // 2. Lấy các phần tử DOM
  const el = {
    filterShift: document.getElementById('filterShift'),
    summary: document.getElementById('templatesSummary'),
    loading: document.getElementById('templatesLoading'),
    empty: document.getElementById('templatesEmpty'),
    tableWrap: document.getElementById('templatesTableWrap'),
    tableBody: document.getElementById('templatesTableBody'),
    btnAdd: document.getElementById('btnAddTemplate'),
    // Khối tạo việc cho ngày
    generateForm: document.getElementById('generateForm'),
    generateShift: document.getElementById('generateShift'),
    generateDate: document.getElementById('generateDate'),
    btnGenerate: document.getElementById('btnGenerate'),
    // Modal thêm / sửa
    modalEl: document.getElementById('templateModal'),
    modalTitle: document.getElementById('templateModalTitle'),
    form: document.getElementById('templateForm'),
    formError: document.getElementById('templateFormError'),
    id: document.getElementById('templateId'),
    title: document.getElementById('templateTitle'),
    description: document.getElementById('templateDescription'),
    shift: document.getElementById('templateShift'),
    category: document.getElementById('templateCategory'),
    priority: document.getElementById('templatePriority'),
    active: document.getElementById('templateActive'),
    btnSave: document.getElementById('btnSaveTemplate')
  };
  const modal = window.bootstrap ? new bootstrap.Modal(el.modalEl) : null;

  let currentTemplates = [];
  let saving = false;
  let generating = false;
  let loadCounter = 0;

  /* ------------------------------------------------------------------
     TIỆN ÍCH
     ------------------------------------------------------------------ */

  // Ngày hôm nay dạng YYYY-MM-DD theo giờ máy người dùng (tự ghép chuỗi, không dùng toISOString để khỏi lệch múi giờ)
  function todayString() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function formatDateVi(dateStr) {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  }

  // Đổ <option> vào select, giữ lại option đầu tiên ("Tất cả" / "Chọn ca")
  function fillSelect(selectEl, items, getLabel) {
    const first = selectEl.options[0].outerHTML;
    selectEl.innerHTML = first + items
      .map(item => `<option value="${escapeHtml(item.id)}">${escapeHtml(getLabel(item))}</option>`)
      .join('');
  }

  // Dữ liệu gửi lên PUT/POST từ một mẫu (dùng cho công tắc bật/tắt)
  function toPayload(tpl, overrides = {}) {
    return {
      title: tpl.title,
      description: tpl.description || null,
      priority: tpl.priority,
      shiftId: tpl.shiftId,
      categoryId: tpl.categoryId || null,
      isActive: tpl.isActive,
      ...overrides
    };
  }

  /* ------------------------------------------------------------------
     TẢI DỮ LIỆU CHO CÁC Ô CHỌN (Ca, Danh mục)
     ------------------------------------------------------------------ */
  async function loadLookups() {
    const [shifts, categories] = await Promise.allSettled([
      apiFetch('/api/shifts'),
      apiFetch('/api/categories')
    ]);

    if (shifts.status === 'fulfilled') {
      const label = s => `${s.name} (${s.startTime} - ${s.endTime})`;
      [el.filterShift, el.generateShift, el.shift].forEach(sel => fillSelect(sel, shifts.value.data, label));
    }
    if (categories.status === 'fulfilled') {
      fillSelect(el.category, categories.value.data, c => c.name);
    }
    if (shifts.status === 'rejected' || categories.status === 'rejected') {
      showToast('Không tải được danh sách ca hoặc danh mục.', 'warning');
    }
  }

  /* ------------------------------------------------------------------
     DANH SÁCH MẪU
     ------------------------------------------------------------------ */
  async function loadTemplates() {
    const myLoad = ++loadCounter;
    el.loading.classList.remove('d-none');
    try {
      const shiftId = el.filterShift.value;
      const result = await apiFetch(`/api/templates${shiftId ? `?shiftId=${encodeURIComponent(shiftId)}` : ''}`);
      if (myLoad !== loadCounter) return;
      currentTemplates = result.data || [];
      renderTable(currentTemplates);
      const activeCount = currentTemplates.filter(t => t.isActive).length;
      el.summary.textContent = currentTemplates.length > 0
        ? `${currentTemplates.length} mẫu · ${activeCount} đang bật`
        : 'Chưa có mẫu nào.';
    } catch (err) {
      if (myLoad !== loadCounter) return;
      currentTemplates = [];
      el.tableBody.innerHTML = '';
      el.summary.textContent = 'Không tải được dữ liệu.';
      showToast(err.message, 'danger');
    } finally {
      if (myLoad === loadCounter) el.loading.classList.add('d-none');
    }
  }

  function renderTable(templates) {
    if (templates.length === 0) {
      el.tableWrap.classList.add('d-none');
      el.empty.classList.remove('d-none');
      showEmpty(el.empty, 'Chưa có mẫu việc nào');
      return;
    }
    el.empty.classList.add('d-none');
    el.tableWrap.classList.remove('d-none');

    el.tableBody.innerHTML = templates.map(tpl => `
      <tr class="${tpl.isActive ? '' : 'opacity-75'}">
        <td data-label="Mẫu việc">
          <div>
            <strong>${escapeHtml(tpl.title)}</strong>
            ${tpl.description ? `<div class="tpl-muted small">${escapeHtml(tpl.description)}</div>` : ''}
          </div>
        </td>
        <td data-label="Ca">${escapeHtml(tpl.shiftName)}</td>
        <td data-label="Danh mục">${escapeHtml(tpl.categoryName || 'Chưa phân loại')}</td>
        <td data-label="Ưu tiên"><span class="badge ${PRIORITY_BADGE[tpl.priority] || 'bg-secondary'}">${escapeHtml(PRIORITY_LABELS[tpl.priority] || tpl.priority)}</span></td>
        <td data-label="Đang bật">
          <div class="form-check form-switch tpl-switch mb-0">
            <input class="form-check-input" type="checkbox" role="switch" data-action="toggle" data-id="${tpl.id}"
                   ${tpl.isActive ? 'checked' : ''} aria-label="Bật/tắt mẫu ${escapeHtml(tpl.title)}">
          </div>
        </td>
        <td data-label="Thao tác" class="text-end text-nowrap">
          <div>
            <button type="button" class="btn btn-outline btn-sm" data-action="edit" data-id="${tpl.id}">Sửa</button>
            <button type="button" class="btn btn-danger btn-sm" data-action="delete" data-id="${tpl.id}">Xóa</button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  el.filterShift.addEventListener('change', loadTemplates);

  /* ------------------------------------------------------------------
     MODAL THÊM / SỬA
     ------------------------------------------------------------------ */
  function hideFormError() {
    el.formError.classList.add('d-none');
    el.formError.textContent = '';
  }

  function resetValidation() {
    [el.title, el.description, el.shift].forEach(input => validateField(input, {}));
    hideFormError();
  }

  function openModal(tpl) {
    if (!modal) {
      showToast('Không tải được thư viện Bootstrap, không mở được biểu mẫu.', 'danger');
      return;
    }
    el.form.reset();
    if (tpl) {
      el.id.value = tpl.id;
      el.title.value = tpl.title;
      el.description.value = tpl.description || '';
      el.shift.value = tpl.shiftId;
      el.category.value = tpl.categoryId || '';
      el.priority.value = tpl.priority;
      el.active.checked = tpl.isActive;
      el.modalTitle.textContent = 'Sửa mẫu việc';
    } else {
      el.id.value = '';
      el.priority.value = 'Medium';
      el.active.checked = true;
      // Đang lọc theo ca nào thì gợi ý sẵn ca đó
      el.shift.value = el.filterShift.value || '';
      el.modalTitle.textContent = 'Thêm mẫu việc';
    }
    resetValidation();
    modal.show();
  }

  el.btnAdd.addEventListener('click', () => openModal(null));
  el.title.addEventListener('input', () => validateField(el.title, TITLE_RULES));

  el.form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (saving) return;
    hideFormError();
    const ok = [
      validateField(el.title, TITLE_RULES),
      validateField(el.description, DESC_RULES),
      validateField(el.shift, SHIFT_RULES)
    ].every(Boolean);
    if (!ok) return;

    const id = el.id.value;
    const payload = {
      title: el.title.value.trim(),
      description: el.description.value.trim() || null,
      priority: el.priority.value,
      shiftId: Number(el.shift.value),
      categoryId: el.category.value ? Number(el.category.value) : null,
      isActive: el.active.checked
    };

    saving = true;
    showLoading(el.btnSave);
    try {
      if (id) {
        await apiFetch(`/api/templates/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
        showToast('Cập nhật mẫu việc thành công', 'success');
      } else {
        await apiFetch('/api/templates', { method: 'POST', body: JSON.stringify(payload) });
        showToast('Thêm mẫu việc thành công', 'success');
      }
      modal.hide();
      await loadTemplates();
    } catch (err) {
      el.formError.textContent = err.errors ? err.errors.join(' ') : err.message;
      el.formError.classList.remove('d-none');
      showToast(err.message, 'danger');
    } finally {
      saving = false;
      hideLoading(el.btnSave);
    }
  });

  /* ------------------------------------------------------------------
     THAO TÁC TRÊN DÒNG: bật/tắt, sửa, xóa
     ------------------------------------------------------------------ */
  el.tableBody.addEventListener('change', async (e) => {
    const toggle = e.target.closest('input[data-action="toggle"]');
    if (!toggle) return;
    const tpl = currentTemplates.find(t => t.id === Number(toggle.dataset.id));
    if (!tpl) return;

    toggle.disabled = true;
    try {
      await apiFetch(`/api/templates/${tpl.id}`, {
        method: 'PUT',
        body: JSON.stringify(toPayload(tpl, { isActive: toggle.checked }))
      });
      showToast(toggle.checked ? `Đã bật mẫu "${tpl.title}"` : `Đã tắt mẫu "${tpl.title}"`, 'success');
    } catch (err) {
      showToast(err.message, 'danger');
    }
    await loadTemplates(); // luôn hiển thị đúng giá trị thật trong CSDL
  });

  el.tableBody.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const tpl = currentTemplates.find(t => t.id === Number(btn.dataset.id));
    if (!tpl) return;

    if (btn.dataset.action === 'edit') {
      openModal(tpl);
      return;
    }

    if (btn.dataset.action === 'delete') {
      if (!confirm(`Bạn có chắc muốn xóa mẫu "${tpl.title}"? Các công việc đã tạo trước đó vẫn giữ nguyên.`)) return;
      showLoading(btn);
      try {
        await apiFetch(`/api/templates/${tpl.id}`, { method: 'DELETE' });
        showToast('Xóa mẫu việc thành công', 'success');
        await loadTemplates();
      } catch (err) {
        showToast(err.message, 'danger');
        hideLoading(btn);
      }
    }
  });

  /* ------------------------------------------------------------------
     TẠO VIỆC CHO NGÀY (POST /api/templates/generate)
     ------------------------------------------------------------------ */
  el.generateDate.value = todayString();

  el.generateForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (generating) return;
    const ok = [
      validateField(el.generateShift, SHIFT_RULES),
      validateField(el.generateDate, {
        required: true,
        label: 'Ngày',
        pattern: /^\d{4}-\d{2}-\d{2}$/,
        patternMessage: 'Ngày phải hợp lệ.'
      })
    ].every(Boolean);
    if (!ok) return;

    const shiftName = el.generateShift.options[el.generateShift.selectedIndex].text;
    generating = true;
    showLoading(el.btnGenerate);
    try {
      const result = await apiFetch('/api/templates/generate', {
        method: 'POST',
        body: JSON.stringify({ shiftId: Number(el.generateShift.value), date: el.generateDate.value })
      });
      const { created, skipped } = result.data;
      showToast(`Đã tạo ${created} việc, bỏ qua ${skipped}`, created > 0 ? 'success' : 'warning');
      if (created === 0 && skipped === 0) {
        showToast(`${shiftName} chưa có mẫu nào đang bật.`, 'warning');
      } else if (created > 0) {
        el.summary.textContent = `Vừa tạo ${created} việc cho ${shiftName} ngày ${formatDateVi(el.generateDate.value)}.`;
      }
    } catch (err) {
      showToast(err.message, 'danger');
    } finally {
      generating = false;
      hideLoading(el.btnGenerate);
    }
  });

  el.generateShift.addEventListener('change', () => validateField(el.generateShift, SHIFT_RULES));

  /* ------------------------------------------------------------------
     KHỞI ĐỘNG TRANG
     ------------------------------------------------------------------ */
  (async () => {
    await loadLookups();
    await loadTemplates();
  })();
});
