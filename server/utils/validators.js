/**
 * server/utils/validators.js - Bộ hàm kiểm tra dữ liệu đầu vào dùng chung phía Server
 * Thành viên phụ trách: TV2 (Xác thực, Phân quyền & Bảo mật)
 */

// Kiểm tra chuỗi hợp lệ sau khi cắt khoảng trắng có độ dài từ min đến max ký tự. Ví dụ: isString('Nguyễn Văn A', 2, 100) -> true
function isString(v, min = 1, max = 255) {
  if (typeof v !== 'string') return false;
  const len = v.trim().length;
  return len >= min && len <= max;
}

// Kiểm tra chuỗi có đúng định dạng email chuẩn hay không. Ví dụ: isEmail('staff@cafe.com') -> true
function isEmail(v) {
  if (typeof v !== 'string') return false;
  const trimmed = v.trim();
  if (trimmed.length < 5 || trimmed.length > 100) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed);
}

// Kiểm tra mật khẩu mạnh: từ 8 ký tự trở lên, gồm cả chữ cái và chữ số. Ví dụ: isStrongPassword('Password123') -> true
function isStrongPassword(v) {
  if (typeof v !== 'string') return false;
  if (v.length < 8 || v.length > 100) return false;
  return /[A-Za-z]/.test(v) && /\d/.test(v);
}

// Kiểm tra giá trị có phải là số nguyên dương (>= 1) hay không. Ví dụ: isPositiveInt(5) -> true, isPositiveInt('12') -> true
function isPositiveInt(v) {
  if (typeof v === 'number') {
    return Number.isInteger(v) && v >= 1;
  }
  if (typeof v === 'string' && /^[1-9]\d*$/.test(v.trim())) {
    const num = Number(v.trim());
    return Number.isSafeInteger(num) && num >= 1;
  }
  return false;
}

// Kiểm tra chuỗi ngày đúng chuẩn YYYY-MM-DD và là ngày có thật trên lịch. Ví dụ: isISODate('2026-11-16') -> true, isISODate('2026-02-30') -> false
function isISODate(v) {
  if (typeof v !== 'string') return false;
  const trimmed = v.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return false;

  const [yearStr, monthStr, dayStr] = trimmed.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);

  if (month < 1 || month > 12 || day < 1 || day > 31) return false;

  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

// Kiểm tra chuỗi thời gian đúng định dạng 24 giờ HH:mm (00:00 - 23:59). Ví dụ: isTimeHHmm('06:30') -> true
function isTimeHHmm(v) {
  if (typeof v !== 'string') return false;
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(v.trim());
}

// Kiểm tra số điện thoại hợp lệ: chuỗi từ 9 đến 11 chữ số (0-9). Ví dụ: isPhone('0901234567') -> true, isPhone('abc') -> false
function isPhone(v) {
  if (typeof v !== 'string') return false;
  return /^[0-9]{9,11}$/.test(v.trim());
}

// Kiểm tra giá trị v có nằm trong danh sách cho phép hay không. Ví dụ: isOneOf('High', ['Low', 'Medium', 'High']) -> true
function isOneOf(v, list) {
  if (!Array.isArray(list)) return false;
  return list.includes(v);
}

// Trả về phản hồi lỗi HTTP 400 Bad Request theo đúng định dạng chuẩn kèm mảng errors. Ví dụ: sendBadRequest(res, ['Email không hợp lệ'])
function sendBadRequest(res, errors) {
  const errList = Array.isArray(errors) ? errors : [String(errors || 'Dữ liệu đầu vào không hợp lệ.')];
  const firstMsg = typeof errList[0] === 'string'
    ? errList[0]
    : (errList[0] && errList[0].message) || 'Dữ liệu đầu vào không hợp lệ.';

  return res.status(400).json({
    success: false,
    message: firstMsg,
    errors: errList
  });
}

module.exports = {
  isString,
  isEmail,
  isStrongPassword,
  isPositiveInt,
  isISODate,
  isTimeHHmm,
  isPhone,
  isOneOf,
  sendBadRequest
};
