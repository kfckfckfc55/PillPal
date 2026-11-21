import { strings } from '@/constants/strings.vi';
import type { MedicationInput, ScheduleInput } from '@/db/repositories/medicationRepository';
import type {
  MealRelation,
  Medication,
  MedicationForm,
  MedicationSchedule,
  RoutineAnchorKind,
} from '@/types/models';
import { parseLocalDateKey, parseTimeOfDay, toLocalDateKey } from '@/utils/date';

import { getRoutinePreset, presetIdFor, type RoutinePresetId } from './routinePresets';
import { INTERVAL_HOURS_OPTIONS, parseDaysOfWeek, serializeDaysOfWeek } from './scheduling';

/**
 * Trạng thái & kiểm tra form Thêm / Sửa thuốc (hàm thuần — có unit test).
 * Màn hình chỉ giữ `MedicationFormValues` và gọi các hàm ở đây.
 */

export type TimingMode = 'routine' | 'fixed' | 'interval';

export interface RoutineSlotDraft {
  /** Id lịch đã lưu (khi sửa); null = lịch mới. */
  id: string | null;
  anchor: RoutineAnchorKind;
  offsetMinutes: number;
}

export interface FixedSlotDraft {
  /** Khóa React ổn định cho từng dòng. */
  key: string;
  id: string | null;
  time: string;
}

export interface IntervalDraft {
  id: string | null;
  intervalHours: number;
  startTime: string;
}

export interface MedicationFormValues {
  name: string;
  strength: string;
  activeIngredient: string;
  form: MedicationForm;
  doseAmount: string;
  doseUnit: string;
  mealRelation: MealRelation;
  timing: TimingMode;
  routineSlots: RoutineSlotDraft[];
  fixedSlots: FixedSlotDraft[];
  interval: IntervalDraft;
  everyDay: boolean;
  daysOfWeek: number[];
  startDate: string;
  longTerm: boolean;
  durationDays: string;
  trackStock: boolean;
  quantityOnHand: string;
  lowStockThresholdDays: string;
  causesDrowsiness: boolean;
  causesDizziness: boolean;
  instructions: string;
}

export type MedicationFormField =
  | 'name'
  | 'doseAmount'
  | 'doseUnit'
  | 'schedules'
  | 'daysOfWeek'
  | 'startDate'
  | 'durationDays'
  | 'quantityOnHand'
  | 'lowStockThresholdDays';

export type MedicationFormErrors = Partial<Record<MedicationFormField, string>>;

/** Đơn vị mặc định theo dạng thuốc. */
export const DEFAULT_DOSE_UNITS: Readonly<Record<MedicationForm, string>> = {
  tablet: 'viên',
  capsule: 'viên',
  liquid: 'ml',
  powder: 'gói',
  injection: 'mũi',
  drops: 'giọt',
  spray: 'lần xịt',
  cream: 'lần bôi',
  other: 'lần',
};

export const MEDICATION_FORMS: readonly MedicationForm[] = [
  'tablet',
  'capsule',
  'liquid',
  'powder',
  'drops',
  'spray',
  'cream',
  'injection',
  'other',
];

export const MEAL_RELATIONS: readonly MealRelation[] = ['before_meal', 'after_meal', 'with_meal', 'any'];

export const DEFAULT_FIXED_TIME = '08:00';
export const DEFAULT_LOW_STOCK_DAYS = 3;

let draftKeyCounter = 0;
/** Khóa tạm cho dòng giờ uống mới trên form (không lưu vào DB). */
export function nextDraftKey(): string {
  draftKeyCounter += 1;
  return `draft-${draftKeyCounter}`;
}

/** Form trống cho thuốc mới. */
export function createEmptyFormValues(today: Date): MedicationFormValues {
  return {
    name: '',
    strength: '',
    activeIngredient: '',
    form: 'tablet',
    doseAmount: '1',
    doseUnit: DEFAULT_DOSE_UNITS.tablet,
    mealRelation: 'any',
    timing: 'routine',
    routineSlots: [],
    fixedSlots: [],
    interval: { id: null, intervalHours: 8, startTime: '06:00' },
    everyDay: true,
    daysOfWeek: [1, 2, 3, 4, 5, 6, 0],
    startDate: toLocalDateKey(today),
    longTerm: true,
    durationDays: '',
    trackStock: false,
    quantityOnHand: '',
    lowStockThresholdDays: String(DEFAULT_LOW_STOCK_DAYS),
    causesDrowsiness: false,
    causesDizziness: false,
    instructions: '',
  };
}

/** 1 → "1", 0.5 → "0,5" (hiển thị trong ô nhập kiểu Việt Nam). */
export function formatDecimalInput(value: number): string {
  return String(Math.round(value * 100) / 100).replace('.', ',');
}

/** "1,5" hoặc "1.5" → 1.5 · rỗng → null · sai → NaN. */
export function parseDecimalInput(value: string): number | null {
  const trimmed = value.trim().replace(',', '.');
  if (trimmed === '') return null;
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return Number.NaN;
  return Number(trimmed);
}

/** Đổ dữ liệu thuốc đã lưu vào form. */
export function formValuesFromMedication(
  medication: Medication,
  schedules: readonly MedicationSchedule[],
): MedicationFormValues {
  const active = schedules.filter((schedule) => schedule.deletedAt === null);
  const base = createEmptyFormValues(new Date());
  const interval = active.find((schedule) => schedule.scheduleType === 'interval');
  const routine = active.filter((schedule) => schedule.scheduleType === 'routine_anchor');
  const fixed = active.filter((schedule) => schedule.scheduleType === 'fixed_time');
  // Lịch do form tạo luôn cùng một kiểu; nếu dữ liệu lẫn nhiều kiểu thì ưu tiên: cách đều > sinh hoạt > cố định.
  const timing: TimingMode = interval ? 'interval' : routine.length > 0 ? 'routine' : 'fixed';
  const days = active[0] ? parseDaysOfWeek(active[0].daysOfWeek) : null;

  return {
    ...base,
    name: medication.name,
    strength: medication.strength ?? '',
    activeIngredient: medication.activeIngredient ?? '',
    form: medication.form,
    doseAmount: formatDecimalInput(medication.doseAmount),
    doseUnit: medication.doseUnit,
    mealRelation: medication.mealRelation,
    timing,
    routineSlots: routine
      .filter((schedule) => schedule.anchor !== null)
      .map((schedule) => ({
        id: schedule.id,
        anchor: schedule.anchor as RoutineAnchorKind,
        offsetMinutes: schedule.offsetMinutes,
      })),
    fixedSlots: fixed
      .filter((schedule) => schedule.timeOfDay !== null)
      .map((schedule) => ({ key: nextDraftKey(), id: schedule.id, time: schedule.timeOfDay as string }))
      .sort((a, b) => a.time.localeCompare(b.time)),
    interval: interval
      ? {
          id: interval.id,
          intervalHours: interval.intervalHours ?? 8,
          startTime: interval.timeOfDay ?? '00:00',
        }
      : base.interval,
    everyDay: days === null,
    daysOfWeek: days ? [...days] : base.daysOfWeek,
    startDate: medication.startDate,
    longTerm: medication.durationDays === null,
    durationDays: medication.durationDays === null ? '' : String(medication.durationDays),
    trackStock: medication.quantityOnHand !== null,
    quantityOnHand:
      medication.quantityOnHand === null ? '' : formatDecimalInput(medication.quantityOnHand),
    lowStockThresholdDays: String(medication.lowStockThresholdDays),
    causesDrowsiness: medication.causesDrowsiness,
    causesDizziness: medication.causesDizziness,
    instructions: medication.instructions ?? '',
  };
}

/** Bật / tắt một lựa chọn "lúc uống" theo sinh hoạt (giữ nguyên độ lệch riêng nếu đã có). */
export function toggleRoutinePreset(
  slots: readonly RoutineSlotDraft[],
  presetId: RoutinePresetId,
): RoutineSlotDraft[] {
  const exists = slots.some((slot) => presetIdFor(slot.anchor, slot.offsetMinutes) === presetId);
  if (exists) {
    return slots.filter((slot) => presetIdFor(slot.anchor, slot.offsetMinutes) !== presetId);
  }
  const preset = getRoutinePreset(presetId);
  return [...slots, { id: null, anchor: preset.anchor, offsetMinutes: preset.offsetMinutes }];
}

export function selectedRoutinePresets(slots: readonly RoutineSlotDraft[]): Set<RoutinePresetId> {
  return new Set(slots.map((slot) => presetIdFor(slot.anchor, slot.offsetMinutes)));
}

function isValidTime(value: string): boolean {
  try {
    parseTimeOfDay(value);
    return true;
  } catch {
    return false;
  }
}

/** Kiểm tra form; trả về lỗi theo từng ô (rỗng = hợp lệ). */
export function validateMedicationForm(values: MedicationFormValues): MedicationFormErrors {
  const errors: MedicationFormErrors = {};
  const copy = strings.medications.errors;

  const name = values.name.trim();
  if (name.length === 0 || name.length > 100) errors.name = copy.name;

  const dose = parseDecimalInput(values.doseAmount);
  if (dose === null || Number.isNaN(dose) || dose <= 0 || dose > 1000) errors.doseAmount = copy.doseAmount;

  const unit = values.doseUnit.trim();
  if (unit.length === 0 || unit.length > 20) errors.doseUnit = copy.doseUnit;

  switch (values.timing) {
    case 'routine':
      if (values.routineSlots.length === 0) errors.schedules = copy.schedules;
      break;
    case 'fixed': {
      if (values.fixedSlots.length === 0) {
        errors.schedules = copy.schedules;
      } else if (!values.fixedSlots.every((slot) => isValidTime(slot.time))) {
        errors.schedules = copy.schedules;
      } else if (new Set(values.fixedSlots.map((slot) => slot.time)).size !== values.fixedSlots.length) {
        errors.schedules = copy.duplicateTimes;
      }
      break;
    }
    case 'interval':
      if (
        !(INTERVAL_HOURS_OPTIONS as readonly number[]).includes(values.interval.intervalHours) ||
        !isValidTime(values.interval.startTime)
      ) {
        errors.schedules = copy.interval;
      }
      break;
  }

  if (!values.everyDay && values.daysOfWeek.length === 0) errors.daysOfWeek = copy.days;

  try {
    parseLocalDateKey(values.startDate);
  } catch {
    errors.startDate = copy.startDate;
  }

  if (!values.longTerm) {
    const duration = parseDecimalInput(values.durationDays);
    if (duration === null || !Number.isInteger(duration) || duration < 1 || duration > 365) {
      errors.durationDays = copy.duration;
    }
  }

  if (values.trackStock) {
    const quantity = parseDecimalInput(values.quantityOnHand);
    if (quantity === null || Number.isNaN(quantity) || quantity < 0 || quantity > 10_000) {
      errors.quantityOnHand = copy.quantity;
    }
    const threshold = parseDecimalInput(values.lowStockThresholdDays);
    if (threshold === null || !Number.isInteger(threshold) || threshold < 0 || threshold > 60) {
      errors.lowStockThresholdDays = copy.lowStock;
    }
  }

  return errors;
}

export function hasErrors(errors: MedicationFormErrors): boolean {
  return Object.keys(errors).length > 0;
}

function optionalText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

/** Form (đã hợp lệ) → dữ liệu thuốc để lưu. */
export function toMedicationInput(values: MedicationFormValues): MedicationInput {
  const threshold = parseDecimalInput(values.lowStockThresholdDays);
  return {
    name: values.name.trim(),
    activeIngredient: optionalText(values.activeIngredient),
    strength: optionalText(values.strength),
    form: values.form,
    doseAmount: parseDecimalInput(values.doseAmount) ?? 1,
    doseUnit: values.doseUnit.trim(),
    instructions: optionalText(values.instructions),
    mealRelation: values.mealRelation,
    causesDrowsiness: values.causesDrowsiness,
    causesDizziness: values.causesDizziness,
    startDate: values.startDate,
    durationDays: values.longTerm ? null : (parseDecimalInput(values.durationDays) ?? null),
    quantityOnHand: values.trackStock ? (parseDecimalInput(values.quantityOnHand) ?? 0) : null,
    lowStockThresholdDays:
      threshold !== null && Number.isInteger(threshold) ? threshold : DEFAULT_LOW_STOCK_DAYS,
  };
}

type ScheduleDraft = Omit<ScheduleInput, 'id' | 'daysOfWeek' | 'dayType' | 'doseAmount'> & {
  id: string | null;
};

/**
 * Form → danh sách lịch uống cần lưu.
 * Giữ id lịch cũ khi có thể: lịch được bỏ đi sẽ "nhường" id cho lịch mới thêm trong cùng lần sửa,
 * nhờ vậy ô cữ hôm nay được dời giờ thay vì sinh thêm cữ (VD đổi "Sau ăn sáng" → "Sau ăn trưa" lúc 10:00
 * khi đã uống buổi sáng thì hôm nay không bị nhắc uống thêm lần nữa).
 */
export function buildScheduleInputs(
  values: MedicationFormValues,
  original: readonly MedicationSchedule[],
): ScheduleInput[] {
  const drafts: ScheduleDraft[] = (() => {
    switch (values.timing) {
      case 'routine':
        return values.routineSlots.map((slot) => ({
          id: slot.id,
          scheduleType: 'routine_anchor' as const,
          timeOfDay: null,
          anchor: slot.anchor,
          offsetMinutes: slot.offsetMinutes,
          intervalHours: null,
        }));
      case 'fixed':
        return [...values.fixedSlots]
          .sort((a, b) => a.time.localeCompare(b.time))
          .map((slot) => ({
            id: slot.id,
            scheduleType: 'fixed_time' as const,
            timeOfDay: slot.time,
            anchor: null,
            offsetMinutes: 0,
            intervalHours: null,
          }));
      case 'interval':
        return [
          {
            id: values.interval.id,
            scheduleType: 'interval' as const,
            timeOfDay: values.interval.startTime,
            anchor: null,
            offsetMinutes: 0,
            intervalHours: values.interval.intervalHours,
          },
        ];
    }
  })();

  const originalById = new Map(
    original.filter((schedule) => schedule.deletedAt === null).map((schedule) => [schedule.id, schedule]),
  );
  const usedIds = new Set(drafts.flatMap((draft) => (draft.id && originalById.has(draft.id) ? [draft.id] : [])));
  const freeIds = [...originalById.keys()].filter((id) => !usedIds.has(id));
  const daysOfWeek = values.everyDay ? null : serializeDaysOfWeek(values.daysOfWeek);

  return drafts.map((draft) => {
    const keepsOwnId = draft.id !== null && originalById.has(draft.id);
    const id = keepsOwnId ? draft.id : (freeIds.shift() ?? null);
    const kept = keepsOwnId && draft.id ? originalById.get(draft.id) : undefined;
    return {
      ...draft,
      id,
      daysOfWeek,
      // Trường form không hiển thị: chỉ giữ khi đúng là lịch cũ của chính dòng này.
      dayType: kept?.dayType ?? null,
      doseAmount: kept?.doseAmount ?? null,
    };
  });
}
