(function (window) {
  'use strict';
  const KEY = 'CAFE_HR_V1';
  const roles = ['Barista', 'Thu ngân', 'Phục vụ', 'Bảo vệ'];
  const check = (condition, message) => { if (!condition) throw new Error(message); };
  const id = () => window.crypto.randomUUID();
  const now = () => new Date().toISOString();
  const money = value => {
    check(value !== '' && value !== null && value !== undefined, 'Vui lòng nhập số tiền.');
    const amount = Number(value);
    check(Number.isSafeInteger(amount) && amount >= 0, 'Số tiền phải là số nguyên VND không âm.');
    return amount;
  };
  function read() {
    const raw = window.localStorage.getItem(KEY);
    if (raw === null) return { version: 1, employees: [], shifts: [], attendance: [], payments: [] };
    const data = JSON.parse(raw);
    check(data.version === 1 && ['employees', 'shifts', 'attendance', 'payments'].every(key => Array.isArray(data[key])), 'Dữ liệu nhân sự không hợp lệ. Không thể tiếp tục.');
    return data;
  }
  function mutate(action) {
    const data = read();
    const result = action(data);
    window.localStorage.setItem(KEY, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent('shifts:changed'));
    return result;
  }
  function employee(data, employeeId) {
    const person = data.employees.find(item => item.id === employeeId && item.active);
    check(person, 'Nhân viên không tồn tại hoặc đã ngừng làm việc.');
    return person;
  }
  function shift(data, shiftId) {
    const item = data.shifts.find(entry => entry.id === shiftId);
    check(item, 'Ca làm việc không tồn tại.');
    return item;
  }
  function schedule(data, input, existingId) {
    const name = String(input.name || '').trim();
    check(name.length > 0 && name.length <= 100, 'Tên ca phải có từ 1 đến 100 ký tự.');
    check(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(input.start) && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(input.end), 'Ngày giờ ca không hợp lệ.');
    const start = new Date(input.start), end = new Date(input.end);
    check(Number.isFinite(+start) && end > start && end - start <= 24 * 3600000, 'Ca phải dài hơn 0 và không quá 24 giờ (có thể qua đêm).');
    [input.start, input.end].forEach(value => {
      const [year, month, day, hour, minute] = value.split(/[-T:]/).map(Number);
      const parsed = new Date(value);
      check(parsed.getFullYear() === year && parsed.getMonth() + 1 === month && parsed.getDate() === day && parsed.getHours() === hour && parsed.getMinutes() === minute, 'Ngày giờ ca không tồn tại trong múi giờ thiết bị.');
    });
    check(+start > Date.now(), 'Chỉ phân lịch cho ca chưa bắt đầu.');
    const employeeIds = [...new Set(input.employeeIds || [])];
    check(employeeIds.length > 0, 'Cần chọn ít nhất một nhân viên.');
    employeeIds.forEach(personId => employee(data, personId));
    check(!data.shifts.some(item => item.id !== existingId && +new Date(item.start) < +end && +new Date(item.end) > +start && item.employeeIds.some(personId => employeeIds.includes(personId))), 'Nhân viên đã có lịch trùng thời gian ca này.');
    return { name, start: start.toISOString(), end: end.toISOString(), employeeIds, openingCash: money(input.openingCash) };
  }
  function reconciliation(data, shiftId) {
    const item = shift(data, shiftId);
    const payments = data.payments.filter(payment => payment.shiftId === shiftId);
    const cash = payments.filter(payment => payment.method === 'cash').reduce((sum, payment) => sum + payment.amount, 0);
    const transfer = payments.filter(payment => payment.method === 'transfer').reduce((sum, payment) => sum + payment.amount, 0);
    check(Number.isSafeInteger(cash + transfer + item.openingCash), 'Tổng tiền vượt giới hạn tính toán.');
    return { cash, transfer, revenue: cash + transfer, expectedCash: item.openingCash + cash, paymentCount: payments.length };
  }
  window.ShiftService = {
    roles, getData: read,
    addEmployee(input) {
      return mutate(data => {
        const name = String(input.name || '').trim();
        check(name.length > 0 && name.length <= 100 && roles.includes(input.role), 'Họ tên hoặc vai trò nhân viên không hợp lệ.');
        const person = { id: id(), name, role: input.role, active: true };
        data.employees.push(person);
        return person;
      });
    },
    deactivateEmployee(employeeId) {
      return mutate(data => {
        const person = employee(data, employeeId);
        check(!data.attendance.some(item => item.employeeId === employeeId && !item.clockOut), 'Nhân viên đang chấm công trong ca.');
        check(!data.shifts.some(item => !item.handover && +new Date(item.end) > Date.now() && item.employeeIds.includes(employeeId)), 'Hãy bỏ nhân viên khỏi các ca chưa kết thúc trước khi ngừng làm việc.');
        person.active = false;
      });
    },
    saveShift(input, shiftId) {
      return mutate(data => {
        if (shiftId) {
          const item = shift(data, shiftId);
          check(!item.handover && +new Date(item.start) > Date.now() && !data.attendance.some(entry => entry.shiftId === shiftId), 'Không thể sửa ca đã bắt đầu hoặc có chấm công.');
          Object.assign(item, schedule(data, input, shiftId));
          return item;
        }
        const item = { id: id(), ...schedule(data, input), handover: null };
        data.shifts.push(item);
        return item;
      });
    },
    deleteShift(shiftId) {
      return mutate(data => {
        const item = shift(data, shiftId);
        check(!item.handover && !data.attendance.some(entry => entry.shiftId === shiftId) && !data.payments.some(entry => entry.shiftId === shiftId), 'Không thể xóa ca đã có dữ liệu vận hành.');
        data.shifts = data.shifts.filter(entry => entry.id !== shiftId);
      });
    },
    clockIn(shiftId, employeeId) {
      return mutate(data => {
        employee(data, employeeId);
        const item = shift(data, shiftId), time = now();
        check(!item.handover && item.employeeIds.includes(employeeId), 'Nhân viên không được phân vào ca hoặc ca đã chốt.');
        check(+new Date(time) >= +new Date(item.start) - 30 * 60000 && +new Date(time) < +new Date(item.end), 'Chỉ vào ca từ 30 phút trước giờ bắt đầu đến trước giờ kết thúc.');
        check(!data.attendance.some(entry => entry.employeeId === employeeId && (!entry.clockOut || entry.shiftId === shiftId)), 'Nhân viên đang trong ca khác hoặc đã chấm công ca này.');
        data.attendance.push({ id: id(), shiftId, employeeId, clockIn: time, clockOut: null });
      });
    },
    clockOut(shiftId, employeeId) {
      return mutate(data => {
        const entry = data.attendance.find(item => item.shiftId === shiftId && item.employeeId === employeeId && !item.clockOut);
        check(entry, 'Không có lượt vào ca đang mở.');
        const time = now();
        check(time >= entry.clockIn, 'Đồng hồ thiết bị đang trước giờ vào ca.');
        entry.clockOut = time;
      });
    },
    recordPayment(input) {
      return mutate(data => {
        const item = shift(data, input.shiftId);
        const person = employee(data, input.employeeId);
        check(!item.handover && person.role === 'Thu ngân' && data.attendance.some(entry => entry.shiftId === item.id && entry.employeeId === person.id && !entry.clockOut), 'Cần thu ngân đã vào ca và chưa ra ca để thanh toán.');
        check(['cash', 'transfer'].includes(input.method), 'Phương thức thanh toán không hợp lệ.');
        const amount = money(input.amount);
        check(amount > 0, 'Giá trị thanh toán phải lớn hơn 0.');
        const payment = { id: id(), shiftId: item.id, employeeId: person.id, method: input.method, amount, tableId: String(input.tableId || ''), paidAt: now() };
        data.payments.push(payment);
        reconciliation(data, item.id);
        return payment;
      });
    },
    reconcile(shiftId) { return reconciliation(read(), shiftId); },
    closeShift(shiftId, input) {
      return mutate(data => {
        const item = shift(data, shiftId);
        check(!item.handover, 'Ca đã được bàn giao, không thể chốt lại.');
        check(data.attendance.some(entry => entry.shiftId === shiftId) && !data.attendance.some(entry => entry.shiftId === shiftId && !entry.clockOut), 'Cần có chấm công và tất cả nhân viên phải ra ca trước khi bàn giao.');
        employee(data, input.receiverId);
        check(input.receiverId !== input.senderId && data.attendance.some(entry => entry.shiftId === shiftId && entry.employeeId === input.senderId), 'Người giao phải đã làm ca; người nhận phải khác người giao.');
        check(input.cashChecked === true && input.revenueChecked === true && input.equipmentChecked === true, 'Cần hoàn tất cả ba mục checklist.');
        const totals = reconciliation(data, shiftId), countedCash = money(input.countedCash);
        const difference = countedCash - totals.expectedCash;
        const explanation = String(input.explanation || '').trim();
        const equipment = String(input.equipment || '').trim();
        check(equipment.length > 0, 'Cần mô tả tình trạng máy móc.');
        check(difference === 0 || explanation.length > 0, 'Cần giải trình chênh lệch tiền mặt.');
        item.handover = { ...totals, countedCash, difference, explanation, equipment, senderId: input.senderId, receiverId: input.receiverId, cashChecked: true, revenueChecked: true, equipmentChecked: true, closedAt: now() };
        return item.handover;
      });
    }
  };
})(window);
