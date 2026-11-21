import type { TextStyle } from 'react-native';

/**
 * Thang chữ của Kề Bên.
 * - Chế độ thường: body 16, bodySmall 14, title 20, display 28.
 * - Sick-Day Mode: body 20, bodySmall 18, title 24, display 32 — không có chữ < 18px.
 * Dùng font hệ thống (không tải font ngoài) để nhẹ và hỗ trợ tiếng Việt đầy đủ.
 */

export type TextVariant = 'display' | 'title' | 'subtitle' | 'body' | 'bodySmall' | 'label';

export type TextVariantStyle = Required<Pick<TextStyle, 'fontSize' | 'lineHeight' | 'fontWeight'>>;

export type TypographyScale = Record<TextVariant, TextVariantStyle>;

const normal: TypographyScale = {
  display: { fontSize: 28, lineHeight: 36, fontWeight: '700' },
  title: { fontSize: 20, lineHeight: 28, fontWeight: '700' },
  subtitle: { fontSize: 17, lineHeight: 24, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400' },
  bodySmall: { fontSize: 14, lineHeight: 20, fontWeight: '400' },
  label: { fontSize: 16, lineHeight: 22, fontWeight: '600' },
};

const sickDay: TypographyScale = {
  display: { fontSize: 32, lineHeight: 40, fontWeight: '700' },
  title: { fontSize: 24, lineHeight: 32, fontWeight: '700' },
  subtitle: { fontSize: 22, lineHeight: 30, fontWeight: '600' },
  body: { fontSize: 20, lineHeight: 28, fontWeight: '400' },
  bodySmall: { fontSize: 18, lineHeight: 26, fontWeight: '400' },
  label: { fontSize: 20, lineHeight: 26, fontWeight: '700' },
};

export const typographyScales = { normal, sickDay } as const;

/**
 * Chữ của thanh tab dưới. Tab bar chỉ hiển thị ở chế độ thường;
 * khi bật Sick-Day Mode (bước 1C) màn hình chuyển sang giao diện tối giản riêng.
 */
export const navigationTypography = {
  // lineHeight đủ cao để không cắt dấu tiếng Việt (VD: "Đợt điều trị", "Sức khỏe").
  tabLabel: { fontSize: 12, lineHeight: 16, fontWeight: '600' },
} as const satisfies Record<string, Pick<TextStyle, 'fontSize' | 'lineHeight' | 'fontWeight'>>;
