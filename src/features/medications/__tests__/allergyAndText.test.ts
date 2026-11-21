import { describe, expect, it } from '@jest/globals';

import { findAllergyMatches, normalizeForMatch } from '../allergyCheck';
import { describeDays, describeSchedule, describeSchedules } from '../scheduleText';

import { makeAllergy, makeSchedule } from './fixtures';

describe('đối chiếu dị ứng', () => {
  it('bỏ dấu tiếng Việt khi so khớp', () => {
    expect(normalizeForMatch('Đường Glucose (tiêm)')).toBe('duong glucose tiem');
  });

  it('nhắc khi tên thuốc / hoạt chất có chữ trùng dị ứng đã ghi', () => {
    const allergies = [makeAllergy('Penicillin'), makeAllergy('Hải sản (tôm, cua)')];
    expect(findAllergyMatches(['Penicillin V 400 mg', null], allergies).map((a) => a.substance)).toEqual([
      'Penicillin',
    ]);
    expect(findAllergyMatches(['Thuốc B', 'ibuprofen'], [makeAllergy('IBUPROFEN')])).toHaveLength(1);
  });

  it('không báo nhầm với từ ngắn hoặc dị ứng đã xóa', () => {
    expect(findAllergyMatches(['Thuốc mg'], [makeAllergy('mg')])).toEqual([]);
    expect(
      findAllergyMatches(['Aspirin'], [makeAllergy('Aspirin', { deletedAt: '2026-11-01T00:00:00.000Z' })]),
    ).toEqual([]);
    expect(findAllergyMatches(['Amoxicillin'], [makeAllergy('Hải sản (tôm, cua)')])).toEqual([]);
  });
});

describe('mô tả lịch uống', () => {
  it('theo sinh hoạt, giờ cố định, cách đều', () => {
    const routine = (anchor: 'breakfast' | 'bedtime' | 'wake_up', offsetMinutes: number) =>
      makeSchedule({ scheduleType: 'routine_anchor', timeOfDay: null, anchor, offsetMinutes });
    expect(describeSchedule(routine('breakfast', 30))).toBe('Sau ăn sáng 30 phút');
    expect(describeSchedule(routine('breakfast', -15))).toBe('Trước ăn sáng 15 phút');
    expect(describeSchedule(routine('bedtime', -30))).toBe('Trước khi đi ngủ 30 phút');
    expect(describeSchedule(routine('wake_up', 0))).toBe('Khi thức dậy');
    expect(describeSchedule(makeSchedule({ timeOfDay: '07:05' }))).toBe('07:05');
    expect(
      describeSchedule(makeSchedule({ scheduleType: 'interval', timeOfDay: '06:00', intervalHours: 8 })),
    ).toBe('Mỗi 8 giờ, từ 06:00');
  });

  it('sắp theo thứ tự trong ngày và mô tả ngày uống', () => {
    const schedules = [makeSchedule({ id: 'b', timeOfDay: '19:00' }), makeSchedule({ id: 'a', timeOfDay: '07:00' })];
    expect(describeSchedules(schedules)).toBe('07:00 · 19:00');
    expect(describeDays(schedules)).toBe('Mỗi ngày');
    expect(describeDays([makeSchedule({ daysOfWeek: '0,1,3,5' })])).toBe('T2, T4, T6, CN');
  });
});
