(function () {
  'use strict';
  const service = window.ShiftService;
  const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const dateKey = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const localTime = value => { const date = new Date(value); return `${dateKey(date)}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`; };
  const display = value => new Date(value).toLocaleString('vi-VN');
  const money = value => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  let week = new Date();
  week.setHours(0, 0, 0, 0);
  week.setDate(week.getDate() - (week.getDay() + 6) % 7);
  let editingId = null;
  let selectedShift = '';
  const root = document.getElementById('hr-app');
  root.innerHTML = `
    <p class="hr-note">Dữ liệu lưu trên trình duyệt này. Chấm công dùng giờ thiết bị, chưa xác thực danh tính hoặc đồng bộ nhiều máy.</p>
    <div id="hr-message" role="status" aria-live="polite" hidden></div>
    <section class="hr-panel"><h2>Nhân viên</h2>
      <form id="employee-form" class="hr-form"><label>Họ tên<input name="name" maxlength="100" required></label><label>Vai trò<select name="role">${service.roles.map(role => `<option>${role}</option>`).join('')}</select></label><button class="btn btn-primary">Thêm nhân viên</button></form>
      <div id="employee-list" class="hr-scroll"></div>
    </section>
    <section class="hr-panel"><h2>Lịch làm việc theo tuần</h2>
      <div class="hr-tools"><button type="button" class="btn btn-secondary" id="previous-week">Tuần trước</button><label>Tuần chứa ngày<input type="date" id="week-date" required></label><button type="button" class="btn btn-secondary" id="next-week">Tuần sau</button></div>
      <div id="weekly-schedule" class="hr-scroll"></div>
      <h3 id="schedule-title">Thêm ca làm việc</h3>
      <form id="schedule-form" class="hr-form">
        <label>Tên ca<input name="name" maxlength="100" required placeholder="Ca sáng"></label>
        <label>Bắt đầu<input name="start" type="datetime-local" required></label><label>Kết thúc<input name="end" type="datetime-local" required></label>
        <label>Tiền mặt đầu ca (VND)<input name="openingCash" type="number" min="0" step="1" required value="0"></label>
        <fieldset><legend>Nhân viên trong ca</legend><div id="schedule-employees"></div></fieldset>
        <button class="btn btn-primary">Lưu ca</button><button type="button" id="cancel-edit" class="btn btn-secondary" hidden>Hủy sửa</button>
      </form>
    </section>
    <section class="hr-panel"><h2>Chấm công điện tử</h2><p class="hr-note">Cho phép vào ca sớm tối đa 30 phút. Mỗi nhân viên có một lượt vào/ra cho mỗi ca. Giờ thực tế chỉ cộng khi đã ra ca; số ca và giờ dưới đây tính theo ca bắt đầu trong tuần đang xem.</p><div id="attendance-list" class="hr-scroll"></div><div id="attendance-summary" class="hr-scroll"></div></section>
    <section class="hr-panel"><h2>Bàn giao &amp; đối soát ca</h2>
      <div class="hr-tools"><label>Chọn ca<select id="handover-shift"></select></label></div>
      <div id="reconciliation" class="hr-record"></div>
      <div id="shift-payments" class="hr-scroll"></div>
      <form id="handover-form" class="hr-form">
        <label>Người giao<select name="senderId" required></select></label><label>Người nhận<select name="receiverId" required></select></label>
        <label>Tiền thực đếm trong két (VND)<input name="countedCash" type="number" min="0" step="1" required></label>
        <label>Tình trạng máy móc<textarea name="equipment" required maxlength="2000" placeholder="Máy pha, máy xay, tủ lạnh; lỗi cần theo dõi..."></textarea></label>
        <label>Giải trình chênh lệch<textarea name="explanation" maxlength="2000"></textarea></label>
        <fieldset><legend>Checklist bắt buộc</legend><label class="hr-check"><input name="cashChecked" type="checkbox" required>Đã kiểm kê két tiền</label><label class="hr-check"><input name="revenueChecked" type="checkbox" required>Đã đối soát doanh thu</label><label class="hr-check"><input name="equipmentChecked" type="checkbox" required>Đã kiểm tra máy móc</label></fieldset>
        <button class="btn btn-primary">Xác nhận bàn giao &amp; khóa ca</button>
      </form><div id="handover-history"></div>
    </section>`;
  const $ = selector => root.querySelector(selector);
  function message(text, error = false) {
    const element = $('#hr-message');
    element.hidden = false;
    element.className = error ? 'hr-error' : '';
    element.textContent = text;
    if (error) element.scrollIntoView({ block: 'nearest' });
  }
  function run(action, text) {
    try { action(); render(); message(text); } catch (error) { console.error('[ShiftHR]', error); message(error.message, true); }
  }
  function weekShifts(data) {
    const end = new Date(week); end.setDate(end.getDate() + 7);
    return data.shifts.filter(item => new Date(item.start) >= week && new Date(item.start) < end).sort((a, b) => a.start.localeCompare(b.start));
  }
  function options(people) { return people.map(person => `<option value="${escape(person.id)}">${escape(person.name)} (${escape(person.role)})</option>`).join(''); }
  function render() {
    const data = service.getData(), active = data.employees.filter(person => person.active), shifts = weekShifts(data);
    const personName = personId => data.employees.find(person => person.id === personId)?.name || 'Không xác định';
    $('#employee-list').innerHTML = `<table class="hr-table"><thead><tr><th>Họ tên</th><th>Vai trò</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>${data.employees.map(person => `<tr><td>${escape(person.name)}</td><td>${escape(person.role)}</td><td>${person.active ? 'Đang làm việc' : 'Đã ngừng'}</td><td>${person.active ? `<button type="button" class="btn btn-secondary" data-deactivate="${person.id}">Ngừng làm việc</button>` : ''}</td></tr>`).join('')}</tbody></table>`;
    const checkedIds = [...root.querySelectorAll('[name="employeeIds"]:checked')].map(input => input.value);
    $('#schedule-employees').innerHTML = active.length ? active.map(person => `<label class="hr-check"><input type="checkbox" name="employeeIds" value="${person.id}" ${checkedIds.includes(person.id) ? 'checked' : ''}>${escape(person.name)} (${escape(person.role)})</label>`).join('') : 'Thêm nhân viên trước khi phân ca.';
    $('#week-date').value = dateKey(week);
    const days = Array.from({ length: 7 }, (_, index) => { const day = new Date(week); day.setDate(day.getDate() + index); return day; });
    $('#weekly-schedule').innerHTML = `<table class="hr-table hr-week"><caption>Tuần ${dateKey(days[0])} – ${dateKey(days[6])} (ca qua đêm hiển thị tại ngày bắt đầu)</caption><thead><tr><th>Nhân viên</th>${days.map(day => `<th>${day.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' })}</th>`).join('')}</tr></thead><tbody>${data.employees.filter(person => person.active || shifts.some(item => item.employeeIds.includes(person.id))).map(person => `<tr><th>${escape(person.name)}<br><small>${escape(person.role)}</small></th>${days.map(day => `<td>${shifts.filter(item => item.employeeIds.includes(person.id) && dateKey(new Date(item.start)) === dateKey(day)).map(item => `<div class="hr-shift"><strong>${escape(item.name)}</strong><br>${new Date(item.start).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} – ${new Date(item.end).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}${dateKey(new Date(item.start)) !== dateKey(new Date(item.end)) ? ' (+1 ngày)' : ''}<br>${item.handover ? 'Đã chốt' : 'Chưa chốt'}<br>${!item.handover && !data.attendance.some(entry => entry.shiftId === item.id) ? `<button type="button" data-edit="${item.id}">Sửa</button><button type="button" data-delete="${item.id}">Xóa</button>` : ''}</div>`).join('') || '—'}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    $('#attendance-list').innerHTML = `<table class="hr-table"><thead><tr><th>Ca / nhân viên</th><th>Vào ca</th><th>Ra ca</th><th>Thực tế</th><th>Thao tác</th></tr></thead><tbody>${shifts.flatMap(item => item.employeeIds.map(personId => {
      const entry = data.attendance.find(record => record.shiftId === item.id && record.employeeId === personId);
      const late = entry ? Math.max(0, Math.floor((new Date(entry.clockIn) - new Date(item.start)) / 60000)) : 0;
      return `<tr><td>${escape(item.name)}<br>${display(item.start)}<br>${escape(personName(personId))}</td><td>${entry ? display(entry.clockIn) + (late ? `<br>Muộn ${late} phút` : '') : '—'}</td><td>${entry?.clockOut ? display(entry.clockOut) : '—'}</td><td>${entry?.clockOut ? ((new Date(entry.clockOut) - new Date(entry.clockIn)) / 3600000).toFixed(2) + ' giờ' : entry ? 'Đang làm' : 'Chưa vào ca'}</td><td>${!item.handover && !entry?.clockOut ? `<button type="button" class="btn btn-secondary" data-clock="${entry ? 'out' : 'in'}" data-shift="${item.id}" data-person="${personId}">${entry ? 'Clock-out' : 'Clock-in'}</button>` : ''}</td></tr>`;
    })).join('') || '<tr><td colspan="5">Chưa có ca trong tuần.</td></tr>'}</tbody></table>`;
    $('#attendance-summary').innerHTML = `<table class="hr-table"><caption>Tổng hợp tuần theo nhân viên</caption><thead><tr><th>Nhân viên</th><th>Ca phân công</th><th>Đã vào</th><th>Hoàn thành</th><th>Giờ thực tế</th></tr></thead><tbody>${data.employees.map(person => {
      const assigned = shifts.filter(item => item.employeeIds.includes(person.id));
      const entries = data.attendance.filter(entry => entry.employeeId === person.id && assigned.some(item => item.id === entry.shiftId));
      const done = entries.filter(entry => entry.clockOut);
      return `<tr><td>${escape(person.name)}</td><td>${assigned.length}</td><td>${entries.length}</td><td>${done.length}</td><td>${(done.reduce((sum, entry) => sum + (new Date(entry.clockOut) - new Date(entry.clockIn)), 0) / 3600000).toFixed(2)}</td></tr>`;
    }).join('')}</tbody></table>`;
    const allShifts = [...data.shifts].sort((a, b) => b.start.localeCompare(a.start));
    if (!allShifts.some(item => item.id === selectedShift)) selectedShift = allShifts[0]?.id || '';
    $('#handover-shift').innerHTML = allShifts.length ? allShifts.map(item => `<option value="${item.id}">${escape(item.name)} — ${display(item.start)}${item.handover ? ' (Đã chốt)' : ''}</option>`).join('') : '<option value="">Chưa có ca</option>';
    $('#handover-shift').value = selectedShift;
    renderHandover(data);
  }
  function renderHandover(data) {
    const item = data.shifts.find(entry => entry.id === selectedShift), form = $('#handover-form');
    form.hidden = !item || !!item.handover;
    $('#handover-history').textContent = '';
    $('#shift-payments').replaceChildren();
    if (!item) { $('#reconciliation').textContent = 'Chọn hoặc tạo ca để đối soát.'; return; }
    const totals = service.reconcile(item.id);
    $('#reconciliation').textContent = `Tiền đầu ca: ${money(item.openingCash)} | ${totals.paymentCount} giao dịch\nDoanh thu tiền mặt: ${money(totals.cash)} | Chuyển khoản: ${money(totals.transfer)}\nTổng doanh thu: ${money(totals.revenue)} | Tiền mặt phải có: ${money(totals.expectedCash)}`;
    $('#shift-payments').innerHTML = `<table class="hr-table"><caption>Giao dịch để đối soát ca</caption><thead><tr><th>Thời gian / mã giao dịch</th><th>Bàn</th><th>Thu ngân</th><th>Phương thức</th><th>Số tiền</th></tr></thead><tbody>${data.payments.filter(payment => payment.shiftId === item.id).map(payment => `<tr><td>${display(payment.paidAt)}<br><small>${escape(payment.id)}</small></td><td>${escape(payment.tableId)}</td><td>${escape(data.employees.find(person => person.id === payment.employeeId)?.name || 'Không xác định')}</td><td>${payment.method === 'cash' ? 'Tiền mặt' : 'Chuyển khoản'}</td><td>${money(payment.amount)}</td></tr>`).join('') || '<tr><td colspan="5">Chưa có giao dịch.</td></tr>'}</tbody></table>`;
    const sender = form.elements.senderId.value, receiver = form.elements.receiverId.value;
    form.elements.senderId.innerHTML = options(data.employees.filter(person => data.attendance.some(entry => entry.shiftId === item.id && entry.employeeId === person.id)));
    form.elements.receiverId.innerHTML = options(data.employees.filter(person => person.active));
    if ([...form.elements.senderId.options].some(option => option.value === sender)) form.elements.senderId.value = sender;
    if ([...form.elements.receiverId.options].some(option => option.value === receiver)) form.elements.receiverId.value = receiver;
    if (item.handover) {
      const record = item.handover;
      const name = personId => data.employees.find(person => person.id === personId)?.name || 'Không xác định';
      $('#handover-history').className = 'hr-record';
      $('#handover-history').textContent = `Đã khóa ca lúc ${display(record.closedAt)}\nNgười giao: ${name(record.senderId)} → Người nhận: ${name(record.receiverId)}\nĐã kiểm kê két / đối soát doanh thu / kiểm tra máy móc\nThực đếm: ${money(record.countedCash)} | Chênh lệch: ${money(record.difference)}\nGiải trình: ${record.explanation || 'Không có chênh lệch'}\nMáy móc: ${record.equipment}`;
    }
  }
  function cancelEdit() { editingId = null; $('#schedule-form').reset(); $('#schedule-title').textContent = 'Thêm ca làm việc'; $('#cancel-edit').hidden = true; }
  $('#employee-form').addEventListener('submit', event => {
    event.preventDefault();
    run(() => { service.addEmployee(Object.fromEntries(new FormData(event.target))); event.target.reset(); }, 'Đã thêm nhân viên.');
  });
  $('#schedule-form').addEventListener('submit', event => {
    event.preventDefault();
    run(() => { const fields = new FormData(event.target); service.saveShift({ ...Object.fromEntries(fields), employeeIds: fields.getAll('employeeIds') }, editingId); cancelEdit(); }, 'Đã lưu lịch ca.');
  });
  $('#cancel-edit').addEventListener('click', cancelEdit);
  $('#handover-form').addEventListener('submit', event => {
    event.preventDefault();
    if (!window.confirm('Xác nhận bàn giao? Ca sẽ bị khóa, không thể sửa chấm công hay thêm thanh toán.')) return;
    run(() => { const fields = Object.fromEntries(new FormData(event.target)); ['cashChecked', 'revenueChecked', 'equipmentChecked'].forEach(key => { fields[key] = event.target.elements[key].checked; }); service.closeShift(selectedShift, fields); event.target.reset(); }, 'Đã bàn giao và khóa ca.');
  });
  $('#handover-shift').addEventListener('change', event => { selectedShift = event.target.value; $('#handover-form').reset(); run(() => {}, 'Đã chọn ca.'); });
  $('#week-date').addEventListener('change', event => run(() => { const day = new Date(`${event.target.value}T00:00:00`); if (!Number.isFinite(+day)) throw new Error('Ngày không hợp lệ.'); day.setDate(day.getDate() - (day.getDay() + 6) % 7); week = day; }, 'Đã chuyển tuần.'));
  ['previous-week', 'next-week'].forEach(buttonId => $(`#${buttonId}`).addEventListener('click', () => run(() => week.setDate(week.getDate() + (buttonId === 'next-week' ? 7 : -7)), 'Đã chuyển tuần.')));
  root.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    const attr = button.dataset;
    if (attr.clock) run(() => service[attr.clock === 'in' ? 'clockIn' : 'clockOut'](attr.shift, attr.person), attr.clock === 'in' ? 'Đã ghi nhận giờ vào ca.' : 'Đã ghi nhận giờ ra ca.');
    if (attr.delete && window.confirm('Xóa ca chưa có dữ liệu vận hành này?')) run(() => { service.deleteShift(attr.delete); if (editingId === attr.delete) cancelEdit(); }, 'Đã xóa ca.');
    if (attr.deactivate && window.confirm('Ngừng làm việc nhân viên này? Lịch sử vẫn được giữ lại.')) run(() => service.deactivateEmployee(attr.deactivate), 'Đã cập nhật nhân viên.');
    if (attr.edit) run(() => {
      const item = service.getData().shifts.find(entry => entry.id === attr.edit);
      if (!item) throw new Error('Ca không còn tồn tại.');
      editingId = item.id;
      const form = $('#schedule-form');
      form.elements.name.value = item.name;
      form.elements.start.value = localTime(item.start);
      form.elements.end.value = localTime(item.end);
      form.elements.openingCash.value = item.openingCash;
      root.querySelectorAll('[name="employeeIds"]').forEach(input => { input.checked = item.employeeIds.includes(input.value); });
      $('#schedule-title').textContent = 'Sửa ca làm việc'; $('#cancel-edit').hidden = false;
      form.scrollIntoView({ block: 'center' });
    }, 'Đang sửa lịch ca.');
  });
  window.addEventListener('storage', event => { if (event.key === 'CAFE_HR_V1' || event.key === null) run(() => {}, 'Dữ liệu đã cập nhật từ tab khác.'); });
  run(() => {}, 'Sẵn sàng phân lịch và chấm công.');
})();
