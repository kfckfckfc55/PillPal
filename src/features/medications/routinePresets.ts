import type { RoutineAnchorKind } from '@/types/models';

/**
 * Các "lúc uống" theo sinh hoạt hiển thị trên form (mục 6.1 của đặc tả):
 * mỗi lựa chọn = mốc sinh hoạt + độ lệch mặc định (VD "Sau ăn trưa" = giờ ăn trưa + 30 phút).
 */

export type RoutinePresetId =
  | 'wake_up'
  | 'before_breakfast'
  | 'after_breakfast'
  | 'before_lunch'
  | 'after_lunch'
  | 'before_dinner'
  | 'after_dinner'
  | 'before_bed';

export interface RoutinePreset {
  id: RoutinePresetId;
  anchor: RoutineAnchorKind;
  offsetMinutes: number;
}

/** Độ lệch mặc định so với bữa ăn / giờ ngủ (phút). */
export const MEAL_OFFSET_MINUTES = 30;

export const ROUTINE_PRESETS: readonly RoutinePreset[] = [
  { id: 'wake_up', anchor: 'wake_up', offsetMinutes: 0 },
  { id: 'before_breakfast', anchor: 'breakfast', offsetMinutes: -MEAL_OFFSET_MINUTES },
  { id: 'after_breakfast', anchor: 'breakfast', offsetMinutes: MEAL_OFFSET_MINUTES },
  { id: 'before_lunch', anchor: 'lunch', offsetMinutes: -MEAL_OFFSET_MINUTES },
  { id: 'after_lunch', anchor: 'lunch', offsetMinutes: MEAL_OFFSET_MINUTES },
  { id: 'before_dinner', anchor: 'dinner', offsetMinutes: -MEAL_OFFSET_MINUTES },
  { id: 'after_dinner', anchor: 'dinner', offsetMinutes: MEAL_OFFSET_MINUTES },
  { id: 'before_bed', anchor: 'bedtime', offsetMinutes: -MEAL_OFFSET_MINUTES },
];

/**
 * Lựa chọn trên form tương ứng với một lịch theo sinh hoạt bất kỳ (kể cả độ lệch tự đặt, VD sau ăn 15 phút):
 * mốc thức dậy / đi ngủ → 1 lựa chọn; bữa ăn → "Trước" nếu độ lệch âm, ngược lại "Sau".
 */
export function presetIdFor(anchor: RoutineAnchorKind, offsetMinutes: number): RoutinePresetId {
  switch (anchor) {
    case 'wake_up':
      return 'wake_up';
    case 'bedtime':
      return 'before_bed';
    case 'breakfast':
      return offsetMinutes < 0 ? 'before_breakfast' : 'after_breakfast';
    case 'lunch':
      return offsetMinutes < 0 ? 'before_lunch' : 'after_lunch';
    case 'dinner':
      return offsetMinutes < 0 ? 'before_dinner' : 'after_dinner';
  }
}

export function getRoutinePreset(id: RoutinePresetId): RoutinePreset {
  const preset = ROUTINE_PRESETS.find((item) => item.id === id);
  if (!preset) throw new Error(`Không có lựa chọn giờ uống "${id}"`);
  return preset;
}
