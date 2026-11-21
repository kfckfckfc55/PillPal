import { describe, expect, it } from '@jest/globals';

import { buildDoseReminderContent, type DoseReminderInput } from '../reminderContent';
import {
  MAX_SCHEDULED_REMINDERS,
  buildReminderPlan,
  diffReminders,
  doseReminderIdentifier,
  type ReminderCandidate,
} from '../reminderPlan';

const at = (day: number, hour: number, minute = 0) => new Date(2026, 10, day, hour, minute);

function input(overrides: Partial<DoseReminderInput> = {}): DoseReminderInput {
  return {
    doseId: 'd1',
    profileId: 'p1',
    profileName: 'Bố',
    showProfileName: false,
    medicationName: 'Thuốc A',
    strength: '500 mg',
    doseAmount: 1,
    doseUnit: 'viên',
    mealRelation: 'after_meal',
    fireAt: at(21, 8),
    isSnooze: false,
    hideMedicationNames: false,
    ...overrides,
  };
}

describe('nội dung thông báo', () => {
  it('giờ · tên thuốc · liều · cách uống', () => {
    expect(buildDoseReminderContent(input())).toEqual({
      title: '08:00 — Đến giờ uống thuốc',
      body: 'Thuốc A 500 mg · 1 viên · Sau ăn',
      data: { kind: 'dose', doseId: 'd1', profileId: 'p1' },
    });
  });

  it('nhiều hồ sơ → ghi tên hồ sơ; nhắc lại có tiêu đề riêng', () => {
    expect(buildDoseReminderContent(input({ showProfileName: true, isSnooze: true })).title).toBe(
      'Bố · 08:00 — Nhắc lại: đến giờ uống thuốc',
    );
  });

  it('ẩn tên thuốc → nội dung không chứa tên / liều', () => {
    const content = buildDoseReminderContent(input({ hideMedicationNames: true }));
    expect(content.body).toBe('Mở Kề Bên để xem thuốc cần uống.');
    expect(`${content.title} ${content.body}`).not.toContain('Thuốc A');
  });
});

describe('lên lịch cuốn chiếu', () => {
  const now = at(21, 9);
  const candidate = (id: string, fireAt: Date, body = 'B'): ReminderCandidate => ({
    doseId: id,
    profileId: 'p1',
    fireAt,
    title: 'T',
    body,
  });
  const continuity = { title: 'Kề Bên', body: 'Hãy mở app' };

  it('bỏ cữ đã qua, sắp theo giờ, thêm 1 thông báo "hãy mở app" sau cữ cuối', () => {
    const plan = buildReminderPlan({
      candidates: [candidate('late', at(21, 20)), candidate('past', at(21, 8)), candidate('early', at(21, 12))],
      now,
      continuity,
    });
    expect(plan.map((item) => item.doseId)).toEqual(['early', 'late', null]);
    expect(plan[2]?.kind).toBe('continuity');
    expect(plan[2]?.fireAt).toEqual(at(21, 20, 30));
  });

  it('không vượt giới hạn 64 của iOS (tối đa 60, gồm 1 thông báo "hãy mở app")', () => {
    const many = Array.from({ length: 100 }, (_, index) => candidate(`d${index}`, new Date(now.getTime() + (index + 1) * 3_600_000)));
    const plan = buildReminderPlan({ candidates: many, now, continuity });
    expect(plan).toHaveLength(MAX_SCHEDULED_REMINDERS);
    expect(plan.filter((item) => item.kind === 'dose')).toHaveLength(MAX_SCHEDULED_REMINDERS - 1);
  });

  it('không có cữ nào → không lên lịch gì', () => {
    expect(buildReminderPlan({ candidates: [], now, continuity })).toEqual([]);
  });

  it('đổi giờ hoặc nội dung → định danh mới', () => {
    const base = candidate('d', at(21, 12));
    expect(doseReminderIdentifier(base)).toBe(doseReminderIdentifier({ ...base }));
    expect(doseReminderIdentifier(base)).not.toBe(doseReminderIdentifier({ ...base, fireAt: at(21, 13) }));
    expect(doseReminderIdentifier(base)).not.toBe(doseReminderIdentifier({ ...base, body: 'Ẩn tên' }));
  });

  it('chỉ hủy / đặt phần khác nhau, không đụng thông báo không phải của Kề Bên', () => {
    const plan = buildReminderPlan({ candidates: [candidate('a', at(21, 12)), candidate('b', at(21, 13))], now, continuity });
    const [first] = plan;
    const changes = diffReminders(plan, [first!.identifier, 'keben-dose-old-1-x', 'app-khac-123']);
    expect(changes.toCancel).toEqual(['keben-dose-old-1-x']);
    expect(changes.toSchedule.map((item) => item.doseId)).toEqual(['b', null]);
  });
});
