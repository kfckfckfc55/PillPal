import type { Allergy, Medication, MedicationSchedule } from '@/types/models';

/** Dữ liệu giả cho unit test (không phải thuốc thật, không phải gợi ý điều trị). */

const STAMP = '2026-01-01T00:00:00.000Z';

export function makeMedication(overrides: Partial<Medication> = {}): Medication {
  return {
    id: 'med-1',
    profileId: 'profile-1',
    journeyId: null,
    name: 'Thuốc A',
    activeIngredient: null,
    strength: '500 mg',
    form: 'tablet',
    doseAmount: 1,
    doseUnit: 'viên',
    instructions: null,
    mealRelation: 'any',
    causesDrowsiness: false,
    causesDizziness: false,
    startDate: '2026-01-01',
    durationDays: null,
    quantityOnHand: null,
    lowStockThresholdDays: 3,
    isActive: true,
    remoteId: null,
    syncedAt: null,
    createdAt: STAMP,
    updatedAt: STAMP,
    deletedAt: null,
    ...overrides,
  };
}

export function makeSchedule(overrides: Partial<MedicationSchedule> = {}): MedicationSchedule {
  return {
    id: 'schedule-1',
    medicationId: 'med-1',
    scheduleType: 'fixed_time',
    timeOfDay: '08:00',
    anchor: null,
    offsetMinutes: 0,
    intervalHours: null,
    daysOfWeek: null,
    dayType: null,
    doseAmount: null,
    remoteId: null,
    syncedAt: null,
    createdAt: STAMP,
    updatedAt: STAMP,
    deletedAt: null,
    ...overrides,
  };
}

export function makeAllergy(substance: string, overrides: Partial<Allergy> = {}): Allergy {
  return {
    id: `allergy-${substance}`,
    profileId: 'profile-1',
    substance,
    severity: 'moderate',
    reaction: null,
    note: null,
    createdAt: STAMP,
    updatedAt: STAMP,
    deletedAt: null,
    ...overrides,
  };
}

/** Giờ địa phương (test chạy với TZ=Asia/Ho_Chi_Minh). month: 1–12. */
export function local(year: number, month: number, day: number, hour = 0, minute = 0): Date {
  return new Date(year, month - 1, day, hour, minute, 0, 0);
}
