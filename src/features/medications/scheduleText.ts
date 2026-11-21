import { strings } from '@/constants/strings.vi';
import type { MedicationSchedule, RoutineAnchorKind } from '@/types/models';
import { formatTimeOfDay, parseTimeOfDay } from '@/utils/date';

import { parseDaysOfWeek } from './scheduling';

/** Mô tả lịch uống bằng lời (hàm thuần — có unit test). */

const copy = strings.medications.summary;

/** "Sau ăn sáng 30 phút", "Khi thức dậy", "Trước khi đi ngủ 30 phút". */
export function describeRoutineAnchor(anchor: RoutineAnchorKind, offsetMinutes: number): string {
  const minutes = Math.abs(offsetMinutes);
  switch (anchor) {
    case 'wake_up':
      return offsetMinutes > 0 ? copy.afterWakeUp(minutes) : copy.wakeUp;
    case 'bedtime':
      return offsetMinutes < 0 ? copy.beforeBedtime(minutes) : copy.atBedtime;
    case 'breakfast':
    case 'lunch':
    case 'dinner': {
      const meal = copy.meals[anchor];
      if (offsetMinutes < 0) return copy.beforeMeal(meal, minutes);
      if (offsetMinutes === 0) return copy.withMeal(meal);
      return copy.afterMeal(meal, minutes);
    }
  }
}

/** Mô tả một lịch: "07:00", "Sau ăn sáng 30 phút", "Mỗi 8 giờ, từ 06:00". */
export function describeSchedule(schedule: MedicationSchedule): string {
  switch (schedule.scheduleType) {
    case 'fixed_time': {
      if (!schedule.timeOfDay) return '';
      try {
        return formatTimeOfDay(parseTimeOfDay(schedule.timeOfDay) + schedule.offsetMinutes);
      } catch {
        return schedule.timeOfDay;
      }
    }
    case 'routine_anchor':
      return schedule.anchor ? describeRoutineAnchor(schedule.anchor, schedule.offsetMinutes) : '';
    case 'interval':
      return schedule.intervalHours
        ? copy.everyHours(schedule.intervalHours, schedule.timeOfDay ?? '00:00')
        : '';
  }
}

/** Thứ tự hiển thị: giờ cố định theo giờ; theo sinh hoạt theo thứ tự trong ngày. */
const ANCHOR_ORDER: Record<RoutineAnchorKind, number> = {
  wake_up: 0,
  breakfast: 1,
  lunch: 2,
  dinner: 3,
  bedtime: 4,
};

function sortKey(schedule: MedicationSchedule): number {
  if (schedule.scheduleType === 'routine_anchor' && schedule.anchor) {
    return ANCHOR_ORDER[schedule.anchor] * 10_000 + schedule.offsetMinutes;
  }
  try {
    return parseTimeOfDay(schedule.timeOfDay ?? '00:00');
  } catch {
    return 0;
  }
}

/** "Sau ăn sáng 30 phút · Sau ăn tối 30 phút" */
export function describeSchedules(schedules: readonly MedicationSchedule[]): string {
  return [...schedules]
    .filter((schedule) => schedule.deletedAt === null)
    .sort((a, b) => sortKey(a) - sortKey(b))
    .map(describeSchedule)
    .filter((text) => text !== '')
    .join(' · ');
}

/** "Mỗi ngày" hoặc "T2, T4, T6" (theo lịch đầu tiên — form lưu cùng ngày cho mọi lịch của một thuốc). */
export function describeDays(schedules: readonly MedicationSchedule[]): string {
  const first = schedules.find((schedule) => schedule.deletedAt === null);
  const days = first ? parseDaysOfWeek(first.daysOfWeek) : null;
  if (!days) return copy.everyDay;
  // Hiển thị từ Thứ Hai → Chủ nhật.
  return [1, 2, 3, 4, 5, 6, 0]
    .filter((day) => days.has(day))
    .map((day) => strings.format.weekdaysShort[day] ?? '')
    .join(', ');
}
