import { describe, expect, it } from '@jest/globals';

import {
  buildScheduleInputs,
  createEmptyFormValues,
  formValuesFromMedication,
  hasErrors,
  nextDraftKey,
  selectedRoutinePresets,
  toMedicationInput,
  toggleRoutinePreset,
  validateMedicationForm,
  type MedicationFormValues,
} from '../medicationForm';

import { local, makeMedication, makeSchedule } from './fixtures';

const TODAY = local(2026, 11, 21, 9, 0);

function validRoutineForm(): MedicationFormValues {
  const values = createEmptyFormValues(TODAY);
  return {
    ...values,
    name: '  Thuốc A  ',
    doseAmount: '0,5',
    routineSlots: toggleRoutinePreset([], 'after_breakfast'),
  };
}

describe('kiểm tra form', () => {
  it('form trống báo thiếu tên và giờ uống', () => {
    const errors = validateMedicationForm(createEmptyFormValues(TODAY));
    expect(errors.name).toBeDefined();
    expect(errors.schedules).toBeDefined();
  });

  it('form hợp lệ → dữ liệu lưu đúng (dấu phẩy thập phân, dài hạn, không theo dõi số lượng)', () => {
    const values = validRoutineForm();
    expect(hasErrors(validateMedicationForm(values))).toBe(false);
    expect(toMedicationInput(values)).toMatchObject({
      name: 'Thuốc A',
      doseAmount: 0.5,
      startDate: '2026-11-21',
      durationDays: null,
      quantityOnHand: null,
      strength: null,
    });
  });

  it('giờ cố định bị trùng', () => {
    const values: MedicationFormValues = {
      ...validRoutineForm(),
      timing: 'fixed',
      fixedSlots: [
        { key: nextDraftKey(), id: null, time: '08:00' },
        { key: nextDraftKey(), id: null, time: '08:00' },
      ],
    };
    expect(validateMedicationForm(values).schedules).toMatch(/trùng/);
  });

  it('liệu trình, số lượng, ngày trong tuần không hợp lệ', () => {
    const errors = validateMedicationForm({
      ...validRoutineForm(),
      longTerm: false,
      durationDays: '0',
      trackStock: true,
      quantityOnHand: 'abc',
      everyDay: false,
      daysOfWeek: [],
    });
    expect(Object.keys(errors).sort()).toEqual(['daysOfWeek', 'durationDays', 'quantityOnHand']);
  });
});

describe('lịch uống từ form', () => {
  it('đổi "Sau ăn sáng" → "Sau ăn trưa" giữ id lịch cũ (cữ hôm nay được dời, không nhân đôi)', () => {
    const original = [
      makeSchedule({ id: 'old', scheduleType: 'routine_anchor', timeOfDay: null, anchor: 'breakfast', offsetMinutes: 30 }),
    ];
    const values = formValuesFromMedication(makeMedication(), original);
    const switched: MedicationFormValues = {
      ...values,
      routineSlots: toggleRoutinePreset(toggleRoutinePreset(values.routineSlots, 'after_breakfast'), 'after_lunch'),
    };
    expect(buildScheduleInputs(switched, original)).toEqual([
      expect.objectContaining({ id: 'old', scheduleType: 'routine_anchor', anchor: 'lunch', offsetMinutes: 30 }),
    ]);
  });

  it('giữ độ lệch riêng (sau ăn 15 phút) và các trường không hiển thị trên form', () => {
    const original = [
      makeSchedule({
        id: 'metformin-morning',
        scheduleType: 'routine_anchor',
        timeOfDay: null,
        anchor: 'breakfast',
        offsetMinutes: 15,
        doseAmount: 2,
      }),
    ];
    const values = formValuesFromMedication(makeMedication(), original);
    expect(selectedRoutinePresets(values.routineSlots).has('after_breakfast')).toBe(true);
    const [schedule] = buildScheduleInputs(values, original);
    expect(schedule).toMatchObject({ id: 'metformin-morning', offsetMinutes: 15, doseAmount: 2 });
  });

  it('thêm lịch mới khi không có lịch nào bị bỏ → id null (tạo mới)', () => {
    const original = [makeSchedule({ id: 'morning', timeOfDay: '07:00' })];
    const values = formValuesFromMedication(makeMedication(), original);
    const withEvening: MedicationFormValues = {
      ...values,
      fixedSlots: [...values.fixedSlots, { key: nextDraftKey(), id: null, time: '19:00' }],
    };
    const inputs = buildScheduleInputs(withEvening, original);
    expect(inputs.map((item) => [item.id, item.timeOfDay])).toEqual([
      ['morning', '07:00'],
      [null, '19:00'],
    ]);
  });

  it('chỉ uống vài ngày trong tuần → lưu cùng ngày cho mọi lịch', () => {
    const values: MedicationFormValues = { ...validRoutineForm(), everyDay: false, daysOfWeek: [5, 1, 3] };
    expect(buildScheduleInputs(values, [])[0]?.daysOfWeek).toBe('1,3,5');
  });

  it('cách đều → đúng 1 lịch kiểu interval', () => {
    const values: MedicationFormValues = {
      ...validRoutineForm(),
      timing: 'interval',
      interval: { id: null, intervalHours: 6, startTime: '08:00' },
    };
    expect(buildScheduleInputs(values, [])).toEqual([
      expect.objectContaining({ scheduleType: 'interval', intervalHours: 6, timeOfDay: '08:00' }),
    ]);
  });
});
