import type { IconName } from '@/components/ui/AppIcon';
import type { BadgeTone } from '@/components/ui/Badge';
import { strings } from '@/constants/strings.vi';
import type { DoseEventWithMedication } from '@/db/repositories/doseEventRepository';
import { effectiveDueAt } from '@/features/medications/doseActions';
import { formatTime } from '@/utils/format';

/** Hàm thuần để hiển thị cữ thuốc trên màn hình Hôm nay. */

export type DayPeriod = 'morning' | 'noon' | 'afternoon' | 'evening' | 'night';

const PERIOD_ORDER: readonly DayPeriod[] = ['night', 'morning', 'noon', 'afternoon', 'evening'];

/** Khung giờ theo cách người Việt hay gọi. */
export function getDayPeriod(date: Date): DayPeriod {
  const hour = date.getHours();
  if (hour < 4) return 'night';
  if (hour < 11) return 'morning';
  if (hour < 14) return 'noon';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

export interface DoseGroup {
  period: DayPeriod;
  doses: DoseEventWithMedication[];
}

/** Nhóm cữ thuốc theo khung giờ, giữ thứ tự thời gian trong ngày. */
export function groupDosesByPeriod(doses: readonly DoseEventWithMedication[]): DoseGroup[] {
  const groups = new Map<DayPeriod, DoseEventWithMedication[]>();
  for (const dose of doses) {
    const period = getDayPeriod(new Date(dose.scheduledAt));
    const list = groups.get(period) ?? [];
    list.push(dose);
    groups.set(period, list);
  }
  return PERIOD_ORDER.filter((period) => groups.has(period)).map((period) => ({
    period,
    doses: (groups.get(period) ?? []).sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)),
  }));
}

export interface DoseStatusDisplay {
  tone: BadgeTone;
  label: string;
  icon: IconName;
}

/** Sau bao lâu kể từ giờ uống thì coi là "chưa xác nhận" (phút). */
export const OVERDUE_AFTER_MINUTES = 30;

/** Nhãn trạng thái của một cữ — luôn có icon + chữ (không chỉ dùng màu). */
export function describeDoseStatus(dose: DoseEventWithMedication, now: Date): DoseStatusDisplay {
  const copy = strings.today.doseStatus;
  switch (dose.status) {
    case 'taken':
      return {
        tone: 'success',
        label: copy.taken(dose.takenAt ? formatTime(dose.takenAt) : ''),
        icon: 'checkmark-circle',
      };
    case 'taken_late':
      return {
        tone: 'warning',
        label: copy.takenLate(dose.takenAt ? formatTime(dose.takenAt) : ''),
        icon: 'time',
      };
    case 'missed':
      return { tone: 'danger', label: copy.missed, icon: 'close-circle' };
    case 'skipped':
      return {
        tone: 'neutral',
        label: dose.skipReason ? copy.skippedWithReason(dose.skipReason) : copy.skipped,
        icon: 'remove-circle',
      };
    case 'paused':
      return { tone: 'neutral', label: copy.paused, icon: 'pause-circle' };
    case 'snoozed': {
      if (dose.snoozeUntil && now.getTime() >= new Date(dose.snoozeUntil).getTime()) {
        return { tone: 'warning', label: copy.snoozedDue, icon: 'notifications' };
      }
      return {
        tone: 'info',
        label: copy.snoozed(dose.snoozeUntil ? formatTime(dose.snoozeUntil) : ''),
        icon: 'alarm',
      };
    }
    case 'pending': {
      const minutesLate = (now.getTime() - new Date(dose.scheduledAt).getTime()) / 60_000;
      if (minutesLate >= OVERDUE_AFTER_MINUTES) {
        return { tone: 'warning', label: copy.overdue, icon: 'alert-circle' };
      }
      if (minutesLate >= 0) {
        return { tone: 'info', label: copy.due, icon: 'notifications' };
      }
      return { tone: 'neutral', label: copy.upcoming, icon: 'time-outline' };
    }
  }
}

export function isDoseTaken(dose: DoseEventWithMedication): boolean {
  return dose.status === 'taken' || dose.status === 'taken_late';
}

export interface DayProgress {
  taken: number;
  /** Tổng cữ cần uống (không tính cữ tạm dừng / bỏ qua). */
  total: number;
}

export function getDayProgress(doses: readonly DoseEventWithMedication[]): DayProgress {
  const counted = doses.filter((dose) => dose.status !== 'paused' && dose.status !== 'skipped');
  return { taken: counted.filter(isDoseTaken).length, total: counted.length };
}

/**
 * Cữ tiếp theo cần uống: cữ đang chờ / nhắc lại sớm nhất (kể cả cữ đã quá giờ chưa xác nhận).
 * Cữ đang nhắc lại tính theo giờ nhắc lại.
 */
export function getNextDose(doses: readonly DoseEventWithMedication[]): DoseEventWithMedication | null {
  return (
    [...doses]
      .filter((dose) => dose.status === 'pending' || dose.status === 'snoozed')
      .sort((a, b) => effectiveDueAt(a).localeCompare(effectiveDueAt(b)))[0] ?? null
  );
}
