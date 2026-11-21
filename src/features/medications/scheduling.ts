import type { DayType, Medication, MedicationSchedule, RoutineAnchorKind } from '@/types/models';
import { addDays, parseLocalDateKey, parseTimeOfDay, startOfLocalDay, toLocalDateKey } from '@/utils/date';

/**
 * Tính giờ các cữ thuốc (hàm thuần, không đọc DB — có unit test).
 *
 * Ba kiểu lịch uống:
 * - fixed_time: giờ cố định mỗi ngày (VD 07:00).
 * - routine_anchor: theo giờ sinh hoạt của hồ sơ + độ lệch (VD "Sau ăn sáng" = giờ ăn sáng + 30 phút).
 *   Giờ sinh hoạt phụ thuộc loại ngày (ngày làm / ngày nghỉ / làm ca).
 * - interval: cách đều N giờ, bắt đầu từ một giờ trong ngày (VD mỗi 8 giờ từ 06:00 → 06:00, 14:00, 22:00).
 *
 * Mỗi cữ có "ô" (slot) = "<ngày sinh hoạt>#<thứ tự trong ngày>" để đối chiếu với cữ đã lưu.
 */

export const DAY_TYPES: readonly DayType[] = ['workday', 'day_off', 'shift'];

export const ROUTINE_ANCHORS: readonly RoutineAnchorKind[] = [
  'wake_up',
  'breakfast',
  'lunch',
  'dinner',
  'bedtime',
];

/** Giờ sinh hoạt mặc định khi hồ sơ chưa tự đặt. */
export const DEFAULT_ROUTINE_TIMES: Readonly<Record<RoutineAnchorKind, string>> = {
  wake_up: '06:30',
  breakfast: '07:00',
  lunch: '11:30',
  dinner: '18:30',
  bedtime: '22:00',
};

/** Loại ngày mặc định theo thứ (chỉ số 0 = Chủ nhật … 6 = Thứ Bảy). */
export const DEFAULT_WEEK_PATTERN: readonly DayType[] = [
  'day_off',
  'workday',
  'workday',
  'workday',
  'workday',
  'workday',
  'day_off',
];

/** Các khoảng cách cho lịch "cách đều" (ước của 24 để lịch lặp lại giống nhau mỗi ngày). */
export const INTERVAL_HOURS_OPTIONS = [4, 6, 8, 12] as const;

export type RoutineTimes = Partial<Record<RoutineAnchorKind, string>>;

export interface RoutineConfig {
  /** Giờ sinh hoạt theo loại ngày (có thể thiếu mốc → lấy theo ngày làm việc, rồi mặc định). */
  anchors: Partial<Record<DayType, RoutineTimes>>;
  /** Loại ngày theo thứ, độ dài 7. */
  weekPattern: readonly DayType[];
  /** Đổi loại ngày cho riêng từng ngày: "YYYY-MM-DD" → loại ngày. */
  overrides: Readonly<Record<string, DayType>>;
}

export const DEFAULT_ROUTINE_CONFIG: RoutineConfig = {
  anchors: {},
  weekPattern: DEFAULT_WEEK_PATTERN,
  overrides: {},
};

/** "HH:mm" → số phút; giá trị hỏng thì dùng `fallback` (không làm sập cả lịch vì một ô dữ liệu lỗi). */
function minutesOrFallback(value: string | null | undefined, fallback: string): number {
  if (value) {
    try {
      return parseTimeOfDay(value);
    } catch {
      // dùng giá trị dự phòng bên dưới
    }
  }
  return parseTimeOfDay(fallback);
}

/** Loại ngày của một ngày: ưu tiên ngày được đổi riêng, sau đó theo thứ trong tuần. */
export function resolveDayType(day: Date, config: RoutineConfig): DayType {
  const weekday = day.getDay();
  return (
    config.overrides[toLocalDateKey(day)] ??
    config.weekPattern[weekday] ??
    DEFAULT_WEEK_PATTERN[weekday] ??
    'workday'
  );
}

/** Đủ 5 mốc sinh hoạt của một loại ngày: thiếu mốc nào thì lấy theo ngày làm việc, rồi theo mặc định. */
export function resolveRoutineTimes(
  dayType: DayType,
  config: RoutineConfig,
): Record<RoutineAnchorKind, string> {
  const own = config.anchors[dayType] ?? {};
  const workday = config.anchors.workday ?? {};
  return {
    wake_up: own.wake_up ?? workday.wake_up ?? DEFAULT_ROUTINE_TIMES.wake_up,
    breakfast: own.breakfast ?? workday.breakfast ?? DEFAULT_ROUTINE_TIMES.breakfast,
    lunch: own.lunch ?? workday.lunch ?? DEFAULT_ROUTINE_TIMES.lunch,
    dinner: own.dinner ?? workday.dinner ?? DEFAULT_ROUTINE_TIMES.dinner,
    bedtime: own.bedtime ?? workday.bedtime ?? DEFAULT_ROUTINE_TIMES.bedtime,
  };
}

/**
 * Số phút của một mốc sinh hoạt tính từ 00:00 của ngày sinh hoạt.
 * Giờ đi ngủ sớm hơn giờ thức dậy (VD người làm đêm ngủ lúc 01:00) → hiểu là sau nửa đêm (+24 giờ).
 */
export function anchorMinutes(
  times: Readonly<Record<RoutineAnchorKind, string>>,
  anchor: RoutineAnchorKind,
): number {
  const minutes = minutesOrFallback(times[anchor], DEFAULT_ROUTINE_TIMES[anchor]);
  if (anchor === 'bedtime') {
    const wakeUp = minutesOrFallback(times.wake_up, DEFAULT_ROUTINE_TIMES.wake_up);
    if (minutes < wakeUp) return minutes + 1440;
  }
  return minutes;
}

/** "1,3,5" → {1,3,5}; null / rỗng → null (mọi ngày). */
export function parseDaysOfWeek(value: string | null): Set<number> | null {
  if (!value) return null;
  const days = value
    .split(',')
    .map((part) => Number(part.trim()))
    .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6);
  return days.length > 0 ? new Set(days) : null;
}

/** {1,3,5} → "1,3,5"; mọi ngày (hoặc rỗng) → null. */
export function serializeDaysOfWeek(days: Iterable<number> | null): string | null {
  if (!days) return null;
  const unique = [...new Set(days)].filter((day) => day >= 0 && day <= 6).sort((a, b) => a - b);
  if (unique.length === 0 || unique.length === 7) return null;
  return unique.join(',');
}

/** Ngày cuối của liệu trình (tính cả ngày đó); null = dùng dài hạn. */
export function medicationEndDate(medication: Medication): Date | null {
  if (medication.durationDays === null) return null;
  return addDays(parseLocalDateKey(medication.startDate), medication.durationDays - 1);
}

/** Thuốc có cần uống trong ngày `day` không (theo ngày bắt đầu & số ngày liệu trình). */
export function isMedicationScheduledOn(medication: Medication, day: Date): boolean {
  let start: Date;
  try {
    start = parseLocalDateKey(medication.startDate);
  } catch {
    return false;
  }
  const dayStart = startOfLocalDay(day);
  if (dayStart.getTime() < start.getTime()) return false;
  const end = medicationEndDate(medication);
  return end === null || dayStart.getTime() <= end.getTime();
}

/** Số cữ mỗi ngày của một lịch kiểu cách đều. */
export function intervalOccurrencesPerDay(intervalHours: number | null): number {
  if (!intervalHours || intervalHours <= 0 || intervalHours > 24) return 0;
  return Math.floor(24 / intervalHours);
}

/** Số cữ trung bình mỗi ngày của một lịch (tính cả lịch chỉ uống vài ngày trong tuần). */
export function averageDosesPerDay(schedule: MedicationSchedule): number {
  const perDay =
    schedule.scheduleType === 'interval' ? intervalOccurrencesPerDay(schedule.intervalHours) : 1;
  const days = parseDaysOfWeek(schedule.daysOfWeek);
  return days ? (perDay * days.size) / 7 : perDay;
}

export interface DoseOccurrence {
  profileId: string;
  medicationId: string;
  scheduleId: string;
  /** "<ngày sinh hoạt YYYY-MM-DD>#<thứ tự trong ngày>" */
  slotKey: string;
  scheduledAt: Date;
  /** Rơi vào thời gian tạm dừng thuốc → không nhắc, không tính là quên. */
  paused: boolean;
}

/** Khoảng tạm dừng của một thuốc: [startAt, endAt) — endAt null = đến khi người dùng bật lại. */
export interface PauseWindow {
  medicationId: string;
  /** ISO UTC */
  startAt: string;
  endAt: string | null;
}

/** Thời điểm `at` của thuốc có nằm trong một khoảng tạm dừng không. */
export function isPausedAt(medicationId: string, at: Date, pauses: readonly PauseWindow[]): boolean {
  const iso = at.toISOString();
  return pauses.some(
    (pause) =>
      pause.medicationId === medicationId &&
      pause.startAt <= iso &&
      (pause.endAt === null || iso < pause.endAt),
  );
}

/** Date tại `day` 00:00 + số phút (tự sang ngày hôm sau nếu ≥ 24 giờ). */
function atMinutesOfDay(day: Date, minutes: number): Date {
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, minutes, 0, 0);
}

/** Các cữ của một lịch uống trong một ngày sinh hoạt. */
export function scheduleOccurrencesForDay(
  medication: Medication,
  schedule: MedicationSchedule,
  day: Date,
  config: RoutineConfig,
): DoseOccurrence[] {
  if (schedule.deletedAt !== null || schedule.medicationId !== medication.id) return [];
  if (!isMedicationScheduledOn(medication, day)) return [];

  const days = parseDaysOfWeek(schedule.daysOfWeek);
  if (days && !days.has(day.getDay())) return [];

  const dayType = resolveDayType(day, config);
  if (schedule.dayType !== null && schedule.dayType !== dayType) return [];

  const dateKey = toLocalDateKey(day);
  const make = (index: number, minutes: number): DoseOccurrence => ({
    profileId: medication.profileId,
    medicationId: medication.id,
    scheduleId: schedule.id,
    slotKey: `${dateKey}#${index}`,
    scheduledAt: atMinutesOfDay(day, minutes),
    paused: false,
  });

  switch (schedule.scheduleType) {
    case 'fixed_time': {
      if (!schedule.timeOfDay) return [];
      return [make(0, minutesOrFallback(schedule.timeOfDay, '08:00') + schedule.offsetMinutes)];
    }
    case 'routine_anchor': {
      if (!schedule.anchor) return [];
      const times = resolveRoutineTimes(dayType, config);
      return [make(0, anchorMinutes(times, schedule.anchor) + schedule.offsetMinutes)];
    }
    case 'interval': {
      const count = intervalOccurrencesPerDay(schedule.intervalHours);
      if (count === 0 || schedule.intervalHours === null) return [];
      const start = minutesOrFallback(schedule.timeOfDay, '00:00') + schedule.offsetMinutes;
      const step = schedule.intervalHours * 60;
      return Array.from({ length: count }, (_, index) => make(index, start + index * step));
    }
  }
}

export interface GenerateOccurrencesInput {
  medications: readonly Medication[];
  schedules: readonly MedicationSchedule[];
  /** Cấu hình sinh hoạt theo hồ sơ (thiếu → mặc định). */
  configs: ReadonlyMap<string, RoutineConfig>;
  /** Ngày đầu tiên (giờ trong ngày bị bỏ qua). */
  from: Date;
  /** Số ngày cần tính (≥ 1). */
  days: number;
  /** Các khoảng tạm dừng (cữ rơi vào đó được đánh dấu `paused`). */
  pauses?: readonly PauseWindow[];
}

/** Toàn bộ cữ dự kiến của các thuốc đang dùng trong `days` ngày kể từ `from`, sắp theo giờ. */
export function generateOccurrences(input: GenerateOccurrencesInput): DoseOccurrence[] {
  const firstDay = startOfLocalDay(input.from);
  const schedulesByMedication = new Map<string, MedicationSchedule[]>();
  for (const schedule of input.schedules) {
    const list = schedulesByMedication.get(schedule.medicationId) ?? [];
    list.push(schedule);
    schedulesByMedication.set(schedule.medicationId, list);
  }

  const result: DoseOccurrence[] = [];
  for (const medication of input.medications) {
    if (!medication.isActive || medication.deletedAt !== null) continue;
    const config = input.configs.get(medication.profileId) ?? DEFAULT_ROUTINE_CONFIG;
    for (const schedule of schedulesByMedication.get(medication.id) ?? []) {
      for (let offset = 0; offset < input.days; offset += 1) {
        for (const occurrence of scheduleOccurrencesForDay(
          medication,
          schedule,
          addDays(firstDay, offset),
          config,
        )) {
          occurrence.paused = isPausedAt(medication.id, occurrence.scheduledAt, input.pauses ?? []);
          result.push(occurrence);
        }
      }
    }
  }
  return result.sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
}
