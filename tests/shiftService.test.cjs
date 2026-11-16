const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const source = fs.readFileSync(path.join(__dirname, '..', 'assets', 'js', 'shiftService.js'), 'utf8');

function setup() {
  let time = +new Date('2026-11-16T04:00:00');
  class Clock extends Date {
    constructor(...args) { super(...(args.length ? args : [time])); }
    static now() { return time; }
  }
  const storage = new Map();
  const window = { crypto: { randomUUID }, dispatchEvent() {}, localStorage: {
    getItem: key => storage.has(key) ? storage.get(key) : null,
    setItem: (key, value) => storage.set(key, value)
  } };
  vm.runInNewContext(source, { window, Date: Clock, CustomEvent: class {} });
  const service = window.ShiftService;
  const cashier = service.addEmployee({ name: 'Thu ngân A', role: 'Thu ngân' });
  const barista = service.addEmployee({ name: 'Pha chế B', role: 'Barista' });
  const receiver = service.addEmployee({ name: 'Nhận ca C', role: 'Bảo vệ' });
  const input = { name: 'Ca sáng', start: '2026-11-16T06:30', end: '2026-11-16T14:30', employeeIds: [cashier.id, barista.id], openingCash: 500000 };
  const shift = service.saveShift(input);
  return { service, window, storage, cashier, barista, receiver, input, shift, at: value => { time = +new Date(value); } };
}
function handover(fixture, extra = {}) {
  return { senderId: fixture.cashier.id, receiverId: fixture.receiver.id, countedCash: 500000, cashChecked: true, revenueChecked: true, equipmentChecked: true, equipment: 'Máy pha và máy xay hoạt động bình thường', ...extra };
}

test('schedule rejects overlaps, allows adjacent shifts and overnight work, preserves assignments on invalid edit', () => {
  const f = setup();
  assert.throws(() => f.service.saveShift({ ...f.input, start: '2026-11-16T14:29', end: '2026-11-16T18:00' }), /trùng/);
  const adjacent = f.service.saveShift({ ...f.input, start: '2026-11-16T14:30', end: '2026-11-16T22:30' });
  const overnight = f.service.saveShift({ ...f.input, start: '2026-11-16T22:30', end: '2026-11-17T06:30' });
  assert.ok(overnight.end > overnight.start);
  assert.throws(() => f.service.saveShift({ ...f.input, end: '2026-11-16T15:00' }, f.shift.id), /trùng/);
  assert.equal(f.service.getData().shifts.find(item => item.id === f.shift.id).end, f.shift.end);
  f.service.deleteShift(adjacent.id);
  assert.equal(f.service.getData().shifts.length, 2);
});

test('schedule validates employees, money, time range and inactive employees', () => {
  const f = setup();
  for (const patch of [{ employeeIds: [] }, { employeeIds: ['missing'] }, { openingCash: -1 }, { openingCash: '' }, { openingCash: 0.5 }, { end: f.input.start }, { end: '2026-11-18T06:30' }, { start: '2026-11-16T03:00' }, { start: '2027-02-30T06:30', end: '2027-02-30T14:30' }]) {
    assert.throws(() => f.service.saveShift({ ...f.input, ...patch }, f.shift.id));
  }
  f.service.deactivateEmployee(f.receiver.id);
  assert.throws(() => f.service.saveShift({ ...f.input, employeeIds: [f.receiver.id] }, f.shift.id), /ngừng/);
  assert.throws(() => f.service.deactivateEmployee(f.cashier.id), /chưa kết thúc/);
});

test('attendance enforces early boundary, single open session and one completed attendance per shift', () => {
  const f = setup();
  f.at('2026-11-16T05:59:59');
  assert.throws(() => f.service.clockIn(f.shift.id, f.cashier.id), /30 phút/);
  f.at('2026-11-16T06:00:00');
  f.service.clockIn(f.shift.id, f.cashier.id);
  assert.throws(() => f.service.clockIn(f.shift.id, f.cashier.id), /đã chấm công/);
  assert.throws(() => f.service.clockIn(f.shift.id, f.receiver.id), /không được phân/);
  assert.throws(() => f.service.saveShift(f.input, f.shift.id), /chấm công/);
  assert.throws(() => f.service.deleteShift(f.shift.id), /vận hành/);
  f.at('2026-11-16T05:59:59');
  assert.throws(() => f.service.clockOut(f.shift.id, f.cashier.id), /Đồng hồ/);
  f.at('2026-11-16T14:30:17');
  f.service.clockOut(f.shift.id, f.cashier.id);
  const entry = f.service.getData().attendance[0];
  assert.equal(new Date(entry.clockOut) - new Date(entry.clockIn), (8 * 3600 + 30 * 60 + 17) * 1000);
  assert.throws(() => f.service.clockOut(f.shift.id, f.cashier.id), /Không có/);
  assert.throws(() => f.service.clockIn(f.shift.id, f.barista.id), /30 phút/);
});

test('one employee cannot clock into adjacent shift before clocking out of previous shift', () => {
  const f = setup();
  const next = f.service.saveShift({ ...f.input, start: '2026-11-16T14:30', end: '2026-11-16T22:30' });
  f.at('2026-11-16T06:30'); f.service.clockIn(f.shift.id, f.cashier.id);
  f.at('2026-11-16T14:15');
  assert.throws(() => f.service.clockIn(next.id, f.cashier.id), /ca khác/);
  f.service.clockOut(f.shift.id, f.cashier.id);
  f.service.clockIn(next.id, f.cashier.id);
  assert.equal(f.service.getData().attendance.length, 2);
});

test('payments require clocked-in cashier and reconcile cash separately from transfers', () => {
  const f = setup(), payment = { shiftId: f.shift.id, employeeId: f.cashier.id, amount: 29000, method: 'cash', tableId: 'T01' };
  assert.throws(() => f.service.recordPayment(payment), /thu ngân/);
  f.at('2026-11-16T06:30'); f.service.clockIn(f.shift.id, f.cashier.id); f.service.clockIn(f.shift.id, f.barista.id);
  assert.throws(() => f.service.recordPayment({ ...payment, employeeId: f.barista.id }), /thu ngân/);
  assert.throws(() => f.service.recordPayment({ ...payment, method: 'invalid' }), /Phương thức/);
  assert.throws(() => f.service.recordPayment({ ...payment, amount: 0 }), /lớn hơn/);
  f.service.recordPayment(payment);
  f.service.recordPayment({ ...payment, amount: 50000, method: 'transfer' });
  const totals = f.service.reconcile(f.shift.id);
  assert.equal(totals.cash, 29000); assert.equal(totals.transfer, 50000); assert.equal(totals.revenue, 79000); assert.equal(totals.expectedCash, 529000); assert.equal(totals.paymentCount, 2);
  f.service.clockOut(f.shift.id, f.cashier.id);
  assert.throws(() => f.service.recordPayment(payment), /thu ngân/);
});

test('handover requires completed attendance, checklist, distinct receiver and variance explanation; closing locks records', () => {
  const f = setup();
  assert.throws(() => f.service.closeShift(f.shift.id, handover(f)), /chấm công/);
  f.at('2026-11-16T06:30'); f.service.clockIn(f.shift.id, f.cashier.id);
  assert.throws(() => f.service.closeShift(f.shift.id, handover(f)), /ra ca/);
  f.at('2026-11-16T14:30'); f.service.clockOut(f.shift.id, f.cashier.id);
  for (const patch of [{ cashChecked: false }, { revenueChecked: false }, { equipmentChecked: false }, { equipment: ' ' }, { countedCash: 490000 }, { receiverId: f.cashier.id }, { senderId: f.barista.id }]) {
    assert.throws(() => f.service.closeShift(f.shift.id, handover(f, patch)));
  }
  const record = f.service.closeShift(f.shift.id, handover(f, { countedCash: 490000, explanation: 'Thiếu 10.000, chờ quản lý xử lý' }));
  assert.equal(record.difference, -10000);
  assert.equal(f.service.getData().shifts[0].handover.equipment, record.equipment);
  assert.throws(() => f.service.closeShift(f.shift.id, handover(f)), /đã được bàn giao/);
  assert.throws(() => f.service.deleteShift(f.shift.id), /vận hành/);
  assert.throws(() => f.service.recordPayment({ shiftId: f.shift.id, employeeId: f.cashier.id, amount: 29000, method: 'cash' }), /thu ngân/);
});

test('successful writes persist across service reloads; storage failure and corruption are explicit', () => {
  const f = setup();
  const anotherWindow = { ...f.window };
  vm.runInNewContext(source, { window: anotherWindow });
  assert.equal(anotherWindow.ShiftService.getData().shifts[0].id, f.shift.id);
  f.window.localStorage.setItem = () => { throw new Error('Quota exceeded'); };
  assert.throws(() => f.service.addEmployee({ name: 'Không lưu được', role: 'Barista' }), /Quota/);
  assert.equal(f.service.getData().employees.length, 3);
  f.storage.set('CAFE_HR_V1', '{broken');
  assert.throws(() => f.service.getData());
  assert.equal(f.storage.get('CAFE_HR_V1'), '{broken');
});
