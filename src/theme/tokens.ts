/**
 * Design tokens màu của Kề Bên — màu chủ đạo xanh navy.
 *
 * Quy tắc:
 * - Component KHÔNG được hardcode mã màu; luôn lấy qua `useTheme().colors`.
 * - Mọi cặp chữ/nền dưới đây đã kiểm tra tương phản WCAG AA (≥ 4.5:1 cho chữ thường).
 * - Thêm token mới: giữ tông navy và kiểm tra lại tương phản.
 */

export type ColorSchemeName = 'light' | 'dark';

/** Lựa chọn của người dùng trong Cài đặt. */
export type ThemePreference = 'system' | 'light' | 'dark';

export interface ColorTokens {
  /** Nút chính, tab đang chọn, link, focus. */
  primary: string;
  /** Chữ/icon trên nền `primary`. */
  onPrimary: string;
  /** Nền chip, badge, thẻ nổi bật. */
  primaryContainer: string;
  /** Chữ trên `primaryContainer`. */
  onPrimaryContainer: string;
  /** Nền màn hình. */
  background: string;
  /** Card, bottom sheet, modal, tab bar, header. */
  surface: string;
  /** Ô nhập liệu, nền nhóm. */
  surfaceVariant: string;
  /** Chữ chính. */
  textPrimary: string;
  /** Chữ phụ, chú thích. */
  textSecondary: string;
  /** Viền, đường kẻ, lưới biểu đồ. */
  border: string;
  /** Đã uống, chỉ số trong ngưỡng. */
  success: string;
  /** Trễ cữ, sắp hết thuốc, sắp đến lịch khám. */
  warning: string;
  /** Dị ứng, vượt ngưỡng, xóa dữ liệu. */
  danger: string;
  /** Thông tin, gợi ý. */
  info: string;
  /** Chữ/icon trên nền success/warning/danger/info đặc. */
  onStatus: string;
  /** Lớp phủ tối phía sau bảng thao tác / hộp thoại (có độ trong suốt). */
  scrim: string;
}

/** Thang màu navy gốc — dùng cho cấu hình native (splash, icon) và tham chiếu. */
export const navyPalette = {
  navy950: '#0A1426',
  navy900: '#0F2547',
  navy800: '#12203A',
  navy700: '#1B3A6B',
  navy600: '#1E3A66',
  navy500: '#2A3B5C',
  navy200: '#8FB3FF',
  navy100: '#DCE6F5',
  navy50: '#EEF3FA',
} as const;

const light: ColorTokens = {
  primary: '#1B3A6B',
  onPrimary: '#FFFFFF',
  primaryContainer: '#DCE6F5',
  onPrimaryContainer: '#0F2547',
  background: '#F5F7FB',
  surface: '#FFFFFF',
  surfaceVariant: '#EAF0F8',
  textPrimary: '#0F1B2D',
  textSecondary: '#4A5568',
  border: '#D5DEEA',
  success: '#17794C',
  warning: '#975A16',
  danger: '#C53030',
  info: '#2B6CB0',
  onStatus: '#FFFFFF',
  scrim: 'rgba(15, 37, 71, 0.5)',
};

const dark: ColorTokens = {
  primary: '#8FB3FF',
  onPrimary: '#0A1426',
  primaryContainer: '#1E3A66',
  onPrimaryContainer: '#DCE6F5',
  background: '#0A1426',
  surface: '#12203A',
  surfaceVariant: '#1A2C4D',
  textPrimary: '#E8EEF8',
  textSecondary: '#A9B6CC',
  border: '#2A3B5C',
  success: '#4CC38A',
  warning: '#F2B84B',
  danger: '#FF7B7B',
  info: '#7CB8FF',
  onStatus: '#0A1426',
  scrim: 'rgba(0, 0, 0, 0.6)',
};

export const colorTokens: Record<ColorSchemeName, ColorTokens> = { light, dark };

/** Tên các token màu — dùng cho prop `color` của component. */
export type ColorTokenName = keyof ColorTokens;

/** Các tông trạng thái dùng cho Badge/Chip. */
export type StatusTone = 'success' | 'warning' | 'danger' | 'info';
