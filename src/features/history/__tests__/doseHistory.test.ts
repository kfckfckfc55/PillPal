import { describe, expect, it } from '@jest/globals';

import type { DoseEventWithMedication } from '@/db/repositories/doseEventRepository';
import type { DoseStatus } from '@/types/models';

import { buildDoseHistory, countDoses, historyRange, sumCounts } from '../doseHistory';

const local = (day: number, hour: number) => new Date(2026, 10, day, hour, 0, 0, 0);
const NOW = local(21, 12);

function dose(id: string, at: Date, status: DoseStatus): DoseEventWithMedication {
  return {
    id,
    profileId: 'p',
    medicationId: 'm',
    scheduleId: 's',
    scheduledAt: at.toISOString(),
    slotKey: null,
    status,
    takenAt: null,
    snoozeUntil: null,
    skipReason: null,
    note: null,
    stockDeducted: null,
    remoteId: null,
    syncedAt: null,
    createdAt: '',
    updatedAt: '',
    deletedAt: null,
    medicationName: 'Thuốc A',
    strength: null,
    form: 'tablet',
    doseAmount: 1,
    doseUnit: 'viên',
    mealRelation: 'any',
    causesDrowsiness: false,
    causesDizziness: false,
  };
}

describe('lịch sử 7 ngày', () => {
  it('khoảng đọc: 00:00 sáu ngày trước → hết hôm nay', () => {
    expect(historyRange(NOW)).toEqual({ from: local(15, 0), to: local(22, 0) });
  });

  it('đếm theo trạng thái; cữ chưa tới giờ và tạm dừng không tính vào "đã đến giờ"', () => {
    const counts = countDoses(
      [
        dose('a', local(21, 8), 'taken'),
        dose('b', local(21, 9), 'taken_late'),
        dose('c', local(21, 10), 'pending'),
        dose('d', local(21, 20), 'pending'),
        dose('e', local(21, 21), 'taken'), // uống sớm trước giờ → vẫn tính
        dose('f', local(21, 11), 'paused'),
      ],
      NOW,
    );
    expect(counts).toEqual({ taken: 3, late: 1, skipped: 0, missed: 0, paused: 1, due: 4 });
  });

  it('gom theo ngày, mới nhất trước, đủ 7 ngày kể cả ngày trống', () => {
    const days = buildDoseHistory(
      [dose('x', local(20, 8), 'missed'), dose('y', local(21, 8), 'taken'), dose('z', local(15, 8), 'skipped')],
      NOW,
    );
    expect(days.map((day) => day.dateKey)).toEqual([
      '2026-11-21',
      '2026-11-20',
      '2026-11-19',
      '2026-11-18',
      '2026-11-17',
      '2026-11-16',
      '2026-11-15',
    ]);
    expect(sumCounts(days)).toEqual({ taken: 1, late: 0, skipped: 1, missed: 1, paused: 0, due: 3 });
  });
});
