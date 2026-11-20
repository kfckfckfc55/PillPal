/** Khoảng cách theo bội số 4. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

/** Bo góc: 8 ô nhập, 12 card, 16 sheet, pill cho nút chính. */
export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

/** Vùng chạm tối thiểu (dp). Sick-Day Mode dùng vùng chạm lớn hơn cho nút chính. */
export const touchTarget = {
  normal: { min: 48, primary: 48 },
  sickDay: { min: 48, primary: 56 },
} as const;

/** Breakpoint & giới hạn chiều rộng nội dung. */
export const layout = {
  tabletBreakpoint: 768,
  /** Chiều rộng tối đa của vùng đọc để nội dung không bị kéo giãn trên tablet. */
  contentMaxWidth: 720,
  /** Chiều cao thanh tab (chưa gồm safe area) — mặc định 49 không đủ chỗ cho chữ tiếng Việt có dấu. */
  tabBarHeight: 60,
} as const;

export type Spacing = typeof spacing;
export type Radius = typeof radius;
