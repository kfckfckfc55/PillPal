import { describe, expect, it } from '@jest/globals';

import {
  formatUtcOffset,
  hasTimeZoneChanged,
  resolveTimeZoneChoice,
  scheduleShiftMinutes,
  type TimeZoneState,
} from '../timeZone';
import { DEFAULT_ROUTINE_CONFIG, generateOccurrences } from '../scheduling';

import { local, makeMedication, makeSchedule } from './fixtures';

const VIETNAM = { name: 'Asia/Ho_Chi_Minh', offsetMinutes: 420 };
const TOKYO = { name: 'Asia/Tokyo', offsetMinutes: 540 };

describe('đổi múi giờ', () => {
  it('nhận biết theo tên (hoặc theo độ lệch khi không có tên)', () => {
    expect(hasTimeZoneChanged(VIETNAM, TOKYO)).toBe(true);
    expect(hasTimeZoneChanged(VIETNAM, { ...VIETNAM })).toBe(false);
    expect(hasTimeZoneChanged({ name: null, offsetMinutes: 420 }, { name: null, offsetMinutes: 540 })).toBe(true);
    expect(hasTimeZoneChanged({ name: 'Asia/Bangkok', offsetMinutes: 420 }, VIETNAM)).toBe(true);
  });

  it('theo giờ nơi mới → không dịch giờ; giữ như giờ cũ → cộng độ lệch', () => {
    const start: TimeZoneState = { lastSeen: VIETNAM, mode: 'local', referenceOffsetMinutes: 420 };
    const local = resolveTimeZoneChoice(start, TOKYO, 'local');
    expect(scheduleShiftMinutes(local, 540)).toBe(0);
    const keep = resolveTimeZoneChoice(start, TOKYO, 'keep_interval');
    expect(keep).toEqual({ lastSeen: TOKYO, mode: 'keep_interval', referenceOffsetMinutes: 420 });
    expect(scheduleShiftMinutes(keep, 540)).toBe(120);
    // Đi tiếp sang nơi khác vẫn giữ múi giờ gốc ban đầu.
    const next = resolveTimeZoneChoice(keep, { name: 'Europe/Paris', offsetMinutes: 60 }, 'keep_interval');
    expect(scheduleShiftMinutes(next, 60)).toBe(-360);
  });

  it('định dạng GMT', () => {
    expect(formatUtcOffset(420)).toBe('GMT+7');
    expect(formatUtcOffset(330)).toBe('GMT+5:30');
    expect(formatUtcOffset(-180)).toBe('GMT-3');
    expect(formatUtcOffset(0)).toBe('GMT');
  });

  it('dịch giờ uống khi giữ khoảng cách: 08:00 giờ cũ → 10:00 giờ hiện tại', () => {
    const [occurrence] = generateOccurrences({
      medications: [makeMedication()],
      schedules: [makeSchedule({ timeOfDay: '08:00' })],
      configs: new Map([['profile-1', DEFAULT_ROUTINE_CONFIG]]),
      from: local(2026, 11, 21),
      days: 1,
      shiftMinutes: 120,
    });
    expect(occurrence?.scheduledAt).toEqual(local(2026, 11, 21, 10, 0));
    expect(occurrence?.slotKey).toBe('2026-11-21#0');
  });
});
