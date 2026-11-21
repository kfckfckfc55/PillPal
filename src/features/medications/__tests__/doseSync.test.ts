import { describe, expect, it } from '@jest/globals';

import { planDoseSync, type ExistingDoseEvent, type PlanDoseSyncInput } from '../doseSync';
import { DEFAULT_ROUTINE_CONFIG, generateOccurrences } from '../scheduling';

import { local, makeMedication, makeSchedule } from './fixtures';

const NOW = local(2026, 11, 21, 10, 0);
const WINDOW_START = local(2026, 11, 21);
const FIRST_DAY = '2026-11-21';
const LONG_AGO = '2026-01-01T00:00:00.000Z';

function desiredFor(timeOfDay: string, scheduleId = 'schedule-1') {
  return generateOccurrences({
    medications: [makeMedication()],
    schedules: [makeSchedule({ id: scheduleId, timeOfDay })],
    configs: new Map([['profile-1', DEFAULT_ROUTINE_CONFIG]]),
    from: WINDOW_START,
    days: 3,
  });
}

function input(overrides: Partial<PlanDoseSyncInput>): PlanDoseSyncInput {
  return {
    desired: [],
    existing: [],
    windowStart: WINDOW_START,
    firstDayKey: FIRST_DAY,
    scheduleCreatedAt: new Map([['schedule-1', LONG_AGO]]),
    ...overrides,
  };
}

function event(overrides: Partial<ExistingDoseEvent>): ExistingDoseEvent {
  return {
    id: 'event-1',
    medicationId: 'med-1',
    scheduleId: 'schedule-1',
    slotKey: '2026-11-21#0',
    scheduledAt: local(2026, 11, 21, 8, 0).toISOString(),
    status: 'pending',
    ...overrides,
  };
}

describe('planDoseSync', () => {
  it('tạo cữ cho hôm nay + 2 ngày tới khi chưa có gì', () => {
    const plan = planDoseSync(input({ desired: desiredFor('08:00') }));
    expect(plan.inserts.map((item) => item.slotKey)).toEqual([
      '2026-11-21#0',
      '2026-11-22#0',
      '2026-11-23#0',
    ]);
    expect(plan.updates).toEqual([]);
    expect(plan.removals).toEqual([]);
  });

  it('không tạo cữ trước thời điểm lịch uống được tạo (thêm thuốc lúc 09:00 → bỏ cữ 08:00 hôm nay)', () => {
    const plan = planDoseSync(
      input({
        desired: desiredFor('08:00'),
        scheduleCreatedAt: new Map([['schedule-1', local(2026, 11, 21, 9, 0).toISOString()]]),
      }),
    );
    expect(plan.inserts.map((item) => item.slotKey)).toEqual(['2026-11-22#0', '2026-11-23#0']);
  });

  it('đổi giờ: cữ chưa xác nhận được dời sang giờ mới', () => {
    const plan = planDoseSync(input({ desired: desiredFor('09:00').slice(0, 1), existing: [event({})] }));
    expect(plan.updates).toEqual([
      expect.objectContaining({
        id: 'event-1',
        scheduledAt: local(2026, 11, 21, 9, 0).toISOString(),
        slotKey: '2026-11-21#0',
      }),
    ]);
    expect(plan.inserts).toEqual([]);
  });

  it('đổi giờ: cữ đã uống giữ nguyên và KHÔNG sinh thêm cữ trong ngày (tránh uống trùng liều)', () => {
    const taken = event({ status: 'taken' });
    const plan = planDoseSync(input({ desired: desiredFor('20:00').slice(0, 1), existing: [taken] }));
    expect(plan).toEqual({ inserts: [], updates: [], removals: [] });
  });

  it('bỏ lịch: xóa cữ chưa xác nhận, giữ cữ đã có thao tác', () => {
    const plan = planDoseSync(
      input({
        desired: [],
        existing: [
          event({ id: 'pending-today' }),
          event({ id: 'skipped-tomorrow', slotKey: '2026-11-22#0', status: 'skipped' }),
        ],
      }),
    );
    expect(plan.removals).toEqual(['pending-today']);
  });

  it('không đụng tới lịch sử ngày hôm qua (kể cả cữ sau nửa đêm của ô hôm qua)', () => {
    const plan = planDoseSync(
      input({
        desired: [],
        existing: [
          event({ id: 'yesterday', slotKey: '2026-11-20#0', scheduledAt: local(2026, 11, 20, 8).toISOString() }),
          event({ id: 'after-midnight', slotKey: '2026-11-20#0', scheduledAt: local(2026, 11, 21, 0, 30).toISOString() }),
        ],
      }),
    );
    expect(plan.removals).toEqual([]);
  });

  it('cữ cũ chưa gắn ô: nhận ô nếu trùng giờ, xóa nếu không còn trong lịch', () => {
    const plan = planDoseSync(
      input({
        desired: desiredFor('08:00').slice(0, 1),
        existing: [
          event({ id: 'legacy-match', slotKey: null }),
          event({
            id: 'legacy-stale',
            slotKey: null,
            scheduledAt: local(2026, 11, 21, 13, 0).toISOString(),
          }),
        ],
      }),
    );
    expect(plan.updates).toEqual([expect.objectContaining({ id: 'legacy-match', slotKey: '2026-11-21#0' })]);
    expect(plan.removals).toEqual(['legacy-stale']);
    expect(plan.inserts).toEqual([]);
  });

  it('chạy lại khi không có gì thay đổi → không làm gì (idempotent)', () => {
    const desired = desiredFor('08:00');
    const existing = desired.map((item, index) =>
      event({ id: `e${index}`, slotKey: item.slotKey, scheduledAt: item.scheduledAt.toISOString() }),
    );
    expect(planDoseSync(input({ desired, existing }))).toEqual({ inserts: [], updates: [], removals: [] });
  });

  it('không tạo cữ trùng giờ với cữ đang có của cùng thuốc + lịch', () => {
    const desired = desiredFor('08:00').slice(0, 1);
    const plan = planDoseSync(
      input({
        desired,
        existing: [event({ id: 'other-slot', slotKey: '2026-11-21#9', status: 'taken' })],
      }),
    );
    expect(plan.inserts).toEqual([]);
  });

  it('thời điểm "bây giờ" không ảnh hưởng: cữ đã qua hôm nay vẫn được tạo cho lịch cũ', () => {
    // Mở app lúc 10:00 sáng ngày mới → cữ 08:00 hiện "Chưa xác nhận" để người dùng ghi lại.
    expect(NOW.getHours()).toBe(10);
    const plan = planDoseSync(input({ desired: desiredFor('08:00').slice(0, 1) }));
    expect(plan.inserts).toHaveLength(1);
  });
});

describe('planDoseSync + tạm dừng', () => {
  const pausedDesired = () => desiredFor('08:00').map((item) => ({ ...item, paused: true }));

  it('cữ mới trong thời gian tạm dừng được tạo ở trạng thái tạm dừng', () => {
    const plan = planDoseSync(input({ desired: pausedDesired() }));
    expect(plan.inserts.every((item) => item.paused)).toBe(true);
  });

  it('bắt đầu tạm dừng: cữ chưa xác nhận → tạm dừng; kết thúc tạm dừng: tạm dừng → chưa xác nhận', () => {
    const toPaused = planDoseSync(input({ desired: pausedDesired().slice(0, 1), existing: [event({})] }));
    expect(toPaused.updates).toEqual([expect.objectContaining({ id: 'event-1', status: 'paused' })]);

    const resumed = planDoseSync(
      input({ desired: desiredFor('08:00').slice(0, 1), existing: [event({ status: 'paused' })] }),
    );
    expect(resumed.updates).toEqual([expect.objectContaining({ id: 'event-1', status: 'pending' })]);
  });

  it('cữ đã uống không bị chuyển sang tạm dừng', () => {
    const plan = planDoseSync(input({ desired: pausedDesired().slice(0, 1), existing: [event({ status: 'taken' })] }));
    expect(plan).toEqual({ inserts: [], updates: [], removals: [] });
  });
});
