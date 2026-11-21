import type { DoseEventWithMedication } from '@/db/repositories/doseEventRepository';
import { addDays, startOfLocalDay, toLocalDateKey } from '@/utils/date';

/** Gom cữ thuốc 7 ngày gần nhất theo ngày + đếm theo trạng thái (hàm thuần — có unit test). */

export const HISTORY_DAYS = 7;

export interface DoseCounts {
  /** Đã uống (kể cả uống trễ). */
  taken: number;
  late: number;
  skipped: number;
  missed: number;
  paused: number;
  /** Cữ đã đến giờ hoặc đã có thao tác (không tính tạm dừng và cữ chưa tới giờ). */
  due: number;
}

export interface HistoryDay {
  dateKey: string;
  date: Date;
  doses: DoseEventWithMedication[];
  counts: DoseCounts;
}

export function emptyCounts(): DoseCounts {
  return { taken: 0, late: 0, skipped: 0, missed: 0, paused: 0, due: 0 };
}

export function countDoses(doses: readonly DoseEventWithMedication[], now: Date): DoseCounts {
  const counts = emptyCounts();
  const nowIso = now.toISOString();
  for (const dose of doses) {
    switch (dose.status) {
      case 'taken':
        counts.taken += 1;
        break;
      case 'taken_late':
        counts.taken += 1;
        counts.late += 1;
        break;
      case 'skipped':
        counts.skipped += 1;
        break;
      case 'missed':
        counts.missed += 1;
        break;
      case 'paused':
        counts.paused += 1;
        break;
      case 'pending':
      case 'snoozed':
        break;
    }
    // "Đã đến giờ": giờ uống đã qua, hoặc người dùng đã thao tác (VD uống sớm hơn giờ dự kiến).
    const acted = dose.status !== 'pending' && dose.status !== 'snoozed';
    if (dose.status !== 'paused' && (acted || dose.scheduledAt <= nowIso)) counts.due += 1;
  }
  return counts;
}

/** Khoảng thời gian cần đọc: từ 00:00 của 6 ngày trước tới hết hôm nay. */
export function historyRange(now: Date): { from: Date; to: Date } {
  const today = startOfLocalDay(now);
  return { from: addDays(today, -(HISTORY_DAYS - 1)), to: addDays(today, 1) };
}

/** Các ngày (mới nhất trước), mỗi ngày gồm cữ sắp theo giờ và số đếm. */
export function buildDoseHistory(doses: readonly DoseEventWithMedication[], now: Date): HistoryDay[] {
  const today = startOfLocalDay(now);
  const byDay = new Map<string, DoseEventWithMedication[]>();
  for (const dose of doses) {
    const key = toLocalDateKey(new Date(dose.scheduledAt));
    const list = byDay.get(key) ?? [];
    list.push(dose);
    byDay.set(key, list);
  }
  return Array.from({ length: HISTORY_DAYS }, (_, index) => {
    const date = addDays(today, -index);
    const dateKey = toLocalDateKey(date);
    const dayDoses = (byDay.get(dateKey) ?? []).sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
    return { dateKey, date, doses: dayDoses, counts: countDoses(dayDoses, now) };
  });
}

/** Tổng của nhiều ngày. */
export function sumCounts(days: readonly HistoryDay[]): DoseCounts {
  return days.reduce((total, day) => {
    const next = { ...total };
    for (const key of Object.keys(next) as (keyof DoseCounts)[]) next[key] += day.counts[key];
    return next;
  }, emptyCounts());
}
