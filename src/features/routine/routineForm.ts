import {
  DAY_TYPES,
  ROUTINE_ANCHORS,
  resolveRoutineTimes,
  type RoutineConfig,
} from '@/features/medications/scheduling';
import type { DayType, RoutineAnchorKind } from '@/types/models';
import { parseTimeOfDay } from '@/utils/date';

/** Trạng thái & kiểm tra màn hình Giờ sinh hoạt (hàm thuần — có unit test). */

export type RoutineTimesByDayType = Record<DayType, Record<RoutineAnchorKind, string>>;

export interface RoutineFormValues {
  times: RoutineTimesByDayType;
  weekPattern: DayType[];
  /** Đổi riêng hôm nay / ngày mai; null = theo lịch tuần. */
  todayOverride: DayType | null;
  tomorrowOverride: DayType | null;
}

export function routineFormFromConfig(
  config: RoutineConfig,
  todayKey: string,
  tomorrowKey: string,
): RoutineFormValues {
  const times = Object.fromEntries(
    DAY_TYPES.map((dayType) => [dayType, resolveRoutineTimes(dayType, config)]),
  ) as RoutineTimesByDayType;
  return {
    times,
    weekPattern: [...config.weekPattern],
    todayOverride: config.overrides[todayKey] ?? null,
    tomorrowOverride: config.overrides[tomorrowKey] ?? null,
  };
}

/**
 * Giờ sinh hoạt hợp lệ khi: thức dậy < ăn sáng < ăn trưa < ăn tối,
 * và đi ngủ sau bữa tối hoặc sau nửa đêm (trước giờ thức dậy).
 */
export function isRoutineOrderValid(times: Readonly<Record<RoutineAnchorKind, string>>): boolean {
  let minutes: Record<RoutineAnchorKind, number>;
  try {
    minutes = Object.fromEntries(
      ROUTINE_ANCHORS.map((anchor) => [anchor, parseTimeOfDay(times[anchor])]),
    ) as Record<RoutineAnchorKind, number>;
  } catch {
    return false;
  }
  const ordered =
    minutes.wake_up < minutes.breakfast &&
    minutes.breakfast < minutes.lunch &&
    minutes.lunch < minutes.dinner;
  const bedtimeOk = minutes.bedtime > minutes.dinner || minutes.bedtime < minutes.wake_up;
  return ordered && bedtimeOk;
}

/** Các loại ngày có giờ sinh hoạt sai thứ tự. */
export function invalidDayTypes(values: RoutineFormValues): DayType[] {
  return DAY_TYPES.filter((dayType) => !isRoutineOrderValid(values.times[dayType]));
}
