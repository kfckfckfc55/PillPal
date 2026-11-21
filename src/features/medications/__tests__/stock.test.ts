import { describe, expect, it } from '@jest/globals';

import { dailyUsage, getCourseProgress, getStockStatus } from '../stock';

import { local, makeMedication, makeSchedule } from './fixtures';

const TODAY = local(2026, 11, 21, 9, 0);

describe('tiến độ liệu trình', () => {
  it('"Ngày 4/7" khi bắt đầu từ 3 ngày trước', () => {
    const medication = makeMedication({ startDate: '2026-11-18', durationDays: 7 });
    expect(getCourseProgress(medication, TODAY)).toEqual({
      day: 4,
      totalDays: 7,
      remainingDaysAfterToday: 3,
      finished: false,
    });
  });

  it('thuốc dài hạn hoặc chưa bắt đầu → không có tiến độ', () => {
    expect(getCourseProgress(makeMedication(), TODAY)).toBeNull();
    expect(getCourseProgress(makeMedication({ startDate: '2026-11-25', durationDays: 5 }), TODAY)).toBeNull();
  });

  it('đã qua ngày cuối → finished', () => {
    const progress = getCourseProgress(makeMedication({ startDate: '2026-11-01', durationDays: 5 }), TODAY);
    expect(progress?.finished).toBe(true);
    expect(progress?.day).toBe(5);
  });
});

describe('tồn kho', () => {
  const twiceDaily = [makeSchedule({ id: 'a', timeOfDay: '07:00' }), makeSchedule({ id: 'b', timeOfDay: '19:00' })];

  it('lượng dùng mỗi ngày tính cả liều riêng của từng lịch', () => {
    const medication = makeMedication({ doseAmount: 1 });
    expect(dailyUsage(medication, [...twiceDaily, makeSchedule({ id: 'c', doseAmount: 0.5 })])).toBe(2.5);
  });

  it('thuốc dài hạn: sắp hết khi số ngày còn ≤ ngưỡng', () => {
    const low = makeMedication({ quantityOnHand: 6, lowStockThresholdDays: 3 });
    expect(getStockStatus(low, twiceDaily, TODAY)).toMatchObject({ daysLeft: 3, isLow: true });
    const ok = makeMedication({ quantityOnHand: 10, lowStockThresholdDays: 3 });
    expect(getStockStatus(ok, twiceDaily, TODAY)?.isLow).toBe(false);
  });

  it('thuốc theo liệu trình: chỉ cảnh báo khi không đủ cho các ngày còn lại', () => {
    const enough = makeMedication({ startDate: '2026-11-18', durationDays: 7, quantityOnHand: 6 });
    expect(getStockStatus(enough, twiceDaily, TODAY)?.isLow).toBe(false);
    const short = makeMedication({ startDate: '2026-11-18', durationDays: 7, quantityOnHand: 4 });
    expect(getStockStatus(short, twiceDaily, TODAY)?.isLow).toBe(true);
  });

  it('không theo dõi số lượng → null', () => {
    expect(getStockStatus(makeMedication(), twiceDaily, TODAY)).toBeNull();
  });
});
