import { describe, expect, it } from '@jest/globals';

import {
  DEFAULT_ROUTINE_CONFIG,
  anchorMinutes,
  averageDosesPerDay,
  generateOccurrences,
  isMedicationScheduledOn,
  resolveDayType,
  resolveRoutineTimes,
  scheduleOccurrencesForDay,
  serializeDaysOfWeek,
  type RoutineConfig,
} from '../scheduling';

import { local, makeMedication, makeSchedule } from './fixtures';

// 21/11/2026 là Thứ Bảy, 23/11/2026 là Thứ Hai.
const SATURDAY = local(2026, 11, 21);
const MONDAY = local(2026, 11, 23);

const config: RoutineConfig = {
  anchors: {
    workday: { wake_up: '06:00', breakfast: '07:00', lunch: '12:00', dinner: '19:00', bedtime: '22:30' },
    day_off: { breakfast: '08:30', bedtime: '00:30' },
  },
  weekPattern: DEFAULT_ROUTINE_CONFIG.weekPattern,
  overrides: {},
};

describe('loại ngày & giờ sinh hoạt', () => {
  it('mặc định Thứ Bảy là ngày nghỉ, Thứ Hai là ngày làm việc', () => {
    expect(resolveDayType(SATURDAY, config)).toBe('day_off');
    expect(resolveDayType(MONDAY, config)).toBe('workday');
  });

  it('ngày được đổi riêng thắng lịch tuần', () => {
    expect(resolveDayType(MONDAY, { ...config, overrides: { '2026-11-23': 'shift' } })).toBe('shift');
  });

  it('mốc thiếu lấy theo ngày làm việc rồi theo mặc định', () => {
    const times = resolveRoutineTimes('day_off', config);
    expect(times.breakfast).toBe('08:30');
    expect(times.lunch).toBe('12:00');
    expect(resolveRoutineTimes('shift', DEFAULT_ROUTINE_CONFIG).dinner).toBe('18:30');
  });

  it('giờ đi ngủ sau nửa đêm được tính sang đêm đó (+24 giờ)', () => {
    const times = resolveRoutineTimes('day_off', config);
    expect(anchorMinutes(times, 'bedtime')).toBe(24 * 60 + 30);
    expect(anchorMinutes(resolveRoutineTimes('workday', config), 'bedtime')).toBe(22 * 60 + 30);
  });
});

describe('cữ của một lịch trong một ngày', () => {
  const medication = makeMedication();

  it('giờ cố định', () => {
    const [occurrence] = scheduleOccurrencesForDay(medication, makeSchedule(), SATURDAY, config);
    expect(occurrence?.scheduledAt).toEqual(local(2026, 11, 21, 8, 0));
    expect(occurrence?.slotKey).toBe('2026-11-21#0');
  });

  it('theo sinh hoạt: "sau ăn sáng 30 phút" đổi giờ theo loại ngày', () => {
    const schedule = makeSchedule({
      scheduleType: 'routine_anchor',
      timeOfDay: null,
      anchor: 'breakfast',
      offsetMinutes: 30,
    });
    expect(scheduleOccurrencesForDay(medication, schedule, SATURDAY, config)[0]?.scheduledAt).toEqual(
      local(2026, 11, 21, 9, 0),
    );
    expect(scheduleOccurrencesForDay(medication, schedule, MONDAY, config)[0]?.scheduledAt).toEqual(
      local(2026, 11, 23, 7, 30),
    );
  });

  it('"trước khi ngủ" sau nửa đêm vẫn thuộc ô của ngày hôm trước', () => {
    const schedule = makeSchedule({
      scheduleType: 'routine_anchor',
      timeOfDay: null,
      anchor: 'bedtime',
      offsetMinutes: -30,
    });
    const [occurrence] = scheduleOccurrencesForDay(medication, schedule, SATURDAY, config);
    expect(occurrence?.scheduledAt).toEqual(local(2026, 11, 22, 0, 0));
    expect(occurrence?.slotKey).toBe('2026-11-21#0');
  });

  it('cách đều 8 giờ từ 06:00 → 3 cữ', () => {
    const schedule = makeSchedule({ scheduleType: 'interval', timeOfDay: '06:00', intervalHours: 8 });
    const times = scheduleOccurrencesForDay(medication, schedule, SATURDAY, config).map((item) =>
      item.scheduledAt.getHours(),
    );
    expect(times).toEqual([6, 14, 22]);
  });

  it('cách đều 6 giờ từ 08:00 → cữ thứ 4 lúc 02:00 sáng hôm sau, cùng ô ngày', () => {
    const schedule = makeSchedule({ scheduleType: 'interval', timeOfDay: '08:00', intervalHours: 6 });
    const occurrences = scheduleOccurrencesForDay(medication, schedule, SATURDAY, config);
    expect(occurrences).toHaveLength(4);
    expect(occurrences[3]?.scheduledAt).toEqual(local(2026, 11, 22, 2, 0));
    expect(occurrences[3]?.slotKey).toBe('2026-11-21#3');
  });

  it('chỉ uống trong thời gian liệu trình', () => {
    const course = makeMedication({ startDate: '2026-11-19', durationDays: 3 });
    expect(isMedicationScheduledOn(course, local(2026, 11, 18))).toBe(false);
    expect(isMedicationScheduledOn(course, local(2026, 11, 19, 23, 59))).toBe(true);
    expect(isMedicationScheduledOn(course, SATURDAY)).toBe(true);
    expect(isMedicationScheduledOn(course, local(2026, 11, 22))).toBe(false);
  });

  it('chỉ uống vào các thứ đã chọn và đúng loại ngày', () => {
    const someDays = makeSchedule({ daysOfWeek: '1,3,5' });
    expect(scheduleOccurrencesForDay(medication, someDays, MONDAY, config)).toHaveLength(1);
    expect(scheduleOccurrencesForDay(medication, someDays, SATURDAY, config)).toHaveLength(0);

    const workdayOnly = makeSchedule({ dayType: 'workday' });
    expect(scheduleOccurrencesForDay(medication, workdayOnly, SATURDAY, config)).toHaveLength(0);
    expect(scheduleOccurrencesForDay(medication, workdayOnly, MONDAY, config)).toHaveLength(1);
  });

  it('lịch đã xóa không sinh cữ', () => {
    const deleted = makeSchedule({ deletedAt: '2026-11-20T00:00:00.000Z' });
    expect(scheduleOccurrencesForDay(medication, deleted, SATURDAY, config)).toHaveLength(0);
  });
});

describe('sinh cữ cho nhiều ngày', () => {
  it('bỏ qua thuốc đã ngừng, sắp theo giờ', () => {
    const active = makeMedication();
    const stopped = makeMedication({ id: 'med-2', isActive: false });
    const occurrences = generateOccurrences({
      medications: [active, stopped],
      schedules: [
        makeSchedule({ id: 's-evening', timeOfDay: '20:00' }),
        makeSchedule({ id: 's-morning', timeOfDay: '07:00' }),
        makeSchedule({ id: 's-stopped', medicationId: 'med-2' }),
      ],
      configs: new Map([['profile-1', config]]),
      from: local(2026, 11, 21, 15, 0),
      days: 3,
    });
    expect(occurrences).toHaveLength(6);
    expect(occurrences.every((item) => item.medicationId === 'med-1')).toBe(true);
    expect(occurrences[0]?.scheduledAt).toEqual(local(2026, 11, 21, 7, 0));
    expect(occurrences[5]?.scheduledAt).toEqual(local(2026, 11, 23, 20, 0));
  });
});

describe('tiện ích', () => {
  it('số cữ trung bình mỗi ngày', () => {
    expect(averageDosesPerDay(makeSchedule({ scheduleType: 'interval', intervalHours: 8 }))).toBe(3);
    expect(averageDosesPerDay(makeSchedule({ daysOfWeek: '1,3,5' }))).toBeCloseTo(3 / 7);
  });

  it('lưu ngày trong tuần', () => {
    expect(serializeDaysOfWeek([5, 1, 3, 3])).toBe('1,3,5');
    expect(serializeDaysOfWeek([0, 1, 2, 3, 4, 5, 6])).toBeNull();
    expect(serializeDaysOfWeek([])).toBeNull();
  });
});
