import { describe, expect, it } from '@jest/globals';

import type { DoseEventWithMedication } from '@/db/repositories/doseEventRepository';

import { describeDoseStatus, getDayProgress, getNextDose } from '../doseDisplay';

const at = (hour: number, minute = 0) => new Date(2026, 10, 21, hour, minute).toISOString();

function dose(overrides: Partial<DoseEventWithMedication>): DoseEventWithMedication {
  return {
    id: 'd',
    profileId: 'p',
    medicationId: 'm',
    scheduleId: 's',
    scheduledAt: at(8),
    slotKey: null,
    status: 'pending',
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
    ...overrides,
  };
}

describe('trạng thái cữ trên màn hình Hôm nay', () => {
  it('nhắc lại: trước giờ nhắc → "Nhắc lại lúc…", qua giờ nhắc → đến giờ uống', () => {
    const snoozed = dose({ status: 'snoozed', snoozeUntil: at(8, 15) });
    expect(describeDoseStatus(snoozed, new Date(2026, 10, 21, 8, 10)).label).toBe('Nhắc lại lúc 08:15');
    expect(describeDoseStatus(snoozed, new Date(2026, 10, 21, 8, 20)).label).toBe('Đến giờ uống (đã nhắc lại)');
  });

  it('bỏ qua kèm lý do', () => {
    expect(describeDoseStatus(dose({ status: 'skipped', skipReason: 'Hết thuốc' }), new Date()).label).toBe(
      'Đã bỏ qua · Hết thuốc',
    );
  });

  it('cữ tiếp theo tính theo giờ nhắc lại; tiến độ không tính cữ bỏ qua / tạm dừng', () => {
    const doses = [
      dose({ id: 'a', status: 'snoozed', scheduledAt: at(7), snoozeUntil: at(9) }),
      dose({ id: 'b', scheduledAt: at(8) }),
      dose({ id: 'c', status: 'skipped' }),
      dose({ id: 'd', status: 'paused' }),
      dose({ id: 'e', status: 'taken', takenAt: at(7) }),
    ];
    expect(getNextDose(doses)?.id).toBe('b');
    expect(getDayProgress(doses)).toEqual({ taken: 1, total: 3 });
  });
});
