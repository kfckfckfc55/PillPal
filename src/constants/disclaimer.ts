/** Nội dung miễn trừ trách nhiệm y khoa — dùng thống nhất trong toàn app. */
export const MEDICAL_DISCLAIMER =
  'Kề Bên chỉ là công cụ hỗ trợ ghi nhớ, chuẩn bị và quản lý thông tin sức khỏe cá nhân. ' +
  'Ứng dụng không thay thế chẩn đoán, kê đơn hay chỉ định của bác sĩ, dược sĩ. ' +
  'Khi có dấu hiệu bất thường hoặc khẩn cấp, hãy liên hệ cơ sở y tế gần nhất hoặc gọi 115.';

/**
 * Phiên bản các văn bản người dùng phải đồng ý (ghi vào bảng `consents`).
 * Khi sửa nội dung quan trọng của văn bản → tăng phiên bản để hỏi lại người dùng.
 */
export const LEGAL_DOCUMENT_VERSIONS = {
  medical_disclaimer: '2026-11.1',
  data_processing_notice: '2026-11.1',
  /** Thông báo xử lý số điện thoại khi người thân tạo tài khoản (máy chủ ghi lại phiên bản + thời điểm). */
  caregiver_account: '2026-11.1',
} as const;

/** Bản rút gọn để hiển thị ở chân màn hình. */
export const MEDICAL_DISCLAIMER_SHORT =
  'Kề Bên chỉ hỗ trợ ghi nhớ, không thay thế chỉ định của bác sĩ, dược sĩ. Khẩn cấp: gọi 115.';
