import { describe, expect, it } from '@jest/globals';

import { DEFAULT_ROUTINE_CONFIG } from '@/features/medications/scheduling';

import { invalidDayTypes, isRoutineOrderValid, routineFormFromConfig } from '../routineForm';

const valid = { wake_up: '06:00', breakfast: '06:30', lunch: '11:30', dinner: '18:30', bedtime: '22:00' };

describe('giờ sinh hoạt', () => {
  it('đúng thứ tự trong ngày', () => {
    expect(isRoutineOrderValid(valid)).toBe(true);
  });

  it('cho phép đi ngủ sau nửa đêm', () => {
    expect(isRoutineOrderValid({ ...valid, bedtime: '00:30' })).toBe(true);
  });

  it('báo sai khi ăn trưa trước ăn sáng hoặc đi ngủ giữa ngày', () => {
    expect(isRoutineOrderValid({ ...valid, lunch: '06:15' })).toBe(false);
    expect(isRoutineOrderValid({ ...valid, bedtime: '15:00' })).toBe(false);
  });

  it('form khởi tạo đủ 3 loại ngày + ngày đổi riêng', () => {
    const values = routineFormFromConfig(
      { ...DEFAULT_ROUTINE_CONFIG, overrides: { '2026-11-21': 'shift' } },
      '2026-11-21',
      '2026-11-22',
    );
    expect(Object.keys(values.times).sort()).toEqual(['day_off', 'shift', 'workday']);
    expect(values.todayOverride).toBe('shift');
    expect(values.tomorrowOverride).toBeNull();
    expect(invalidDayTypes(values)).toEqual([]);
  });
});
