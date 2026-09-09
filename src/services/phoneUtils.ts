/**
 * Tiện ích chuẩn hóa và xử lý Số điện thoại / ID Khách hàng
 */

/**
 * Chuẩn hóa số điện thoại:
 * - Loại bỏ các ký tự không phải số (khoảng trắng, dấu gạch ngang, chấm, ngoặc đơn, +)
 * - Nếu bắt đầu bằng 84 (ví dụ: +84943882109 hoặc 84943882109), chuyển thành 0943882109
 * - Nếu có 9 chữ số và không bắt đầu bằng 0, thêm 0 vào đầu
 * - Kết quả là chuỗi chữ số chuẩn (10 số, bắt đầu bằng 0)
 */
export function normalizePhone(rawPhone: string): string {
  if (!rawPhone) return '';
  // Giữ lại chỉ các chữ số
  let clean = String(rawPhone).replace(/\D/g, '');
  
  // Xử lý mã quốc gia +84
  if (clean.startsWith('84') && clean.length >= 10) {
    clean = '0' + clean.slice(2);
  } else if (!clean.startsWith('0') && clean.length === 9) {
    clean = '0' + clean;
  }
  return clean;
}

/**
 * Định dạng hiển thị số điện thoại đẹp mắt (VD: 0943 882 109)
 */
export function formatPhoneDisplay(rawPhone: string): string {
  const norm = normalizePhone(rawPhone);
  if (norm.length === 10) {
    return `${norm.slice(0, 4)} ${norm.slice(4, 7)} ${norm.slice(7)}`;
  }
  if (norm.length === 11) {
    return `${norm.slice(0, 4)} ${norm.slice(4, 7)} ${norm.slice(7)}`;
  }
  return rawPhone || '';
}

/**
 * Kiểm tra xem số điện thoại có hợp lệ không (ít nhất 9-11 số)
 */
export function isValidPhone(rawPhone: string): boolean {
  const norm = normalizePhone(rawPhone);
  return norm.length >= 9 && norm.length <= 11 && norm.startsWith('0');
}

/**
 * ID Khách hàng được gắn theo Số điện thoại chuẩn hóa
 * Ví dụ: SĐT 0943882109 -> ID_KH: 0943882109
 */
export function generateCustomerIdFromPhone(rawPhone: string): string {
  const norm = normalizePhone(rawPhone);
  if (norm) return norm;
  return 'KH_' + Math.random().toString(36).substring(2, 9).toUpperCase();
}
