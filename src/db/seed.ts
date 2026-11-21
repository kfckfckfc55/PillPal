import type { SQLiteDatabase } from 'expo-sqlite';

import type { BindValue } from '@/db/client';
import type { TableName } from '@/db/schema';
import {
  DEFAULT_WEEK_PATTERN,
  scheduleOccurrencesForDay,
  type RoutineConfig,
} from '@/features/medications/scheduling';
import type {
  DayType,
  DoseStatus,
  Medication,
  MedicationSchedule,
  RoutineAnchorKind,
} from '@/types/models';
import { addDays, addMinutes, atLocalTime, startOfLocalDay, toLocalDateKey } from '@/utils/date';
import { newId } from '@/utils/id';

/*
 * Dữ liệu mẫu tiếng Việt — CHỈ dùng khi phát triển (__DEV__).
 * Tên người, cơ sở y tế, số điện thoại đều là giả. Tên thuốc chỉ để minh họa giao diện,
 * KHÔNG phải gợi ý điều trị.
 */

type Row = Record<string, BindValue>;

async function insert(db: SQLiteDatabase, table: TableName, row: Row): Promise<void> {
  const columns = Object.keys(row);
  const placeholders = columns.map(() => '?').join(', ');
  await db.runAsync(
    `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`,
    columns.map((column) => row[column] ?? null),
  );
}

type RoutineTable = Record<DayType, Partial<Record<RoutineAnchorKind, string>>>;

interface SeedSchedule {
  id: string;
  kind: 'fixed' | 'routine';
  time?: string;
  anchor?: RoutineAnchorKind;
  offsetMinutes?: number;
}

interface SeedMedication {
  id: string;
  profileId: string;
  journeyId: string;
  name: string;
  strength: string;
  form: 'tablet' | 'capsule';
  mealRelation: 'before_meal' | 'after_meal' | 'any';
  causesDrowsiness?: boolean;
  startDate: Date;
  durationDays: number | null;
  quantityOnHand: number;
  instructions: string;
  schedules: SeedSchedule[];
}

/** Mô hình thuốc / lịch uống để tính giờ cữ bằng đúng bộ tính lịch của app (một nguồn duy nhất). */
function toMedicationModel(med: SeedMedication, stamp: string): Medication {
  return {
    id: med.id,
    profileId: med.profileId,
    journeyId: med.journeyId,
    name: med.name,
    activeIngredient: null,
    strength: med.strength,
    form: med.form,
    doseAmount: 1,
    doseUnit: 'viên',
    instructions: med.instructions,
    mealRelation: med.mealRelation,
    causesDrowsiness: med.causesDrowsiness ?? false,
    causesDizziness: false,
    startDate: toLocalDateKey(med.startDate),
    durationDays: med.durationDays,
    quantityOnHand: med.quantityOnHand,
    lowStockThresholdDays: 3,
    isActive: true,
    remoteId: null,
    syncedAt: null,
    createdAt: stamp,
    updatedAt: stamp,
    deletedAt: null,
  };
}

function toScheduleModel(medicationId: string, schedule: SeedSchedule, stamp: string): MedicationSchedule {
  return {
    id: schedule.id,
    medicationId,
    scheduleType: schedule.kind === 'fixed' ? 'fixed_time' : 'routine_anchor',
    timeOfDay: schedule.kind === 'fixed' ? (schedule.time ?? '08:00') : null,
    anchor: schedule.kind === 'routine' ? (schedule.anchor ?? 'breakfast') : null,
    offsetMinutes: schedule.offsetMinutes ?? 0,
    intervalHours: null,
    daysOfWeek: null,
    dayType: null,
    doseAmount: null,
    remoteId: null,
    syncedAt: null,
    createdAt: stamp,
    updatedAt: stamp,
    deletedAt: null,
  };
}

function toRoutineConfig(routines: RoutineTable): RoutineConfig {
  return { anchors: routines, weekPattern: DEFAULT_WEEK_PATTERN, overrides: {} };
}

/** Nạp toàn bộ dữ liệu mẫu trong một transaction (lỗi thì không ghi gì). */
export async function seedSampleData(db: SQLiteDatabase, now: Date = new Date()): Promise<void> {
  const stamp = now.toISOString();
  const today = startOfLocalDay(now);
  const day = (offset: number) => addDays(today, offset);
  const dateKey = (offset: number) => toLocalDateKey(day(offset));
  const at = (offset: number, time: string) => atLocalTime(day(offset), time).toISOString();
  const base = { created_at: stamp, updated_at: stamp };

  const ids = {
    an: newId(),
    binh: newId(),
    journeySinus: newId(),
    journeyBp: newId(),
    amoxicillin: newId(),
    cetirizine: newId(),
    amlodipine: newId(),
    metformin: newId(),
    apptBinh: newId(),
    apptAn: newId(),
    prescriptionAn: newId(),
  };

  const routinesAn: RoutineTable = {
    workday: { wake_up: '06:30', breakfast: '07:00', lunch: '12:00', dinner: '19:00', bedtime: '22:30' },
    day_off: { wake_up: '08:00', breakfast: '08:30', lunch: '12:30', dinner: '19:00', bedtime: '23:00' },
    shift: {},
  };
  const routinesBinh: RoutineTable = {
    workday: { wake_up: '05:30', breakfast: '06:30', lunch: '11:30', dinner: '18:00', bedtime: '21:30' },
    day_off: { wake_up: '05:30', breakfast: '06:30', lunch: '11:30', dinner: '18:00', bedtime: '21:30' },
    shift: {},
  };

  const medications: SeedMedication[] = [
    {
      id: ids.amoxicillin,
      profileId: ids.an,
      journeyId: ids.journeySinus,
      name: 'Amoxicillin',
      strength: '500 mg',
      form: 'capsule',
      mealRelation: 'after_meal',
      startDate: day(-3),
      durationDays: 7,
      quantityOnHand: 7,
      instructions: 'Theo đơn bác sĩ (dữ liệu mẫu)',
      schedules: [
        { id: newId(), kind: 'routine', anchor: 'breakfast', offsetMinutes: 30 },
        { id: newId(), kind: 'routine', anchor: 'dinner', offsetMinutes: 30 },
      ],
    },
    {
      id: ids.cetirizine,
      profileId: ids.an,
      journeyId: ids.journeySinus,
      name: 'Cetirizin',
      strength: '10 mg',
      form: 'tablet',
      mealRelation: 'any',
      causesDrowsiness: true,
      startDate: day(-3),
      durationDays: 7,
      quantityOnHand: 4,
      instructions: 'Theo đơn bác sĩ (dữ liệu mẫu)',
      schedules: [{ id: newId(), kind: 'routine', anchor: 'bedtime', offsetMinutes: -30 }],
    },
    {
      id: ids.amlodipine,
      profileId: ids.binh,
      journeyId: ids.journeyBp,
      name: 'Amlodipin',
      strength: '5 mg',
      form: 'tablet',
      mealRelation: 'any',
      startDate: day(-300),
      durationDays: null,
      quantityOnHand: 3, // còn 3 ngày ≤ ngưỡng 3 ngày → cảnh báo sắp hết thuốc
      instructions: 'Theo đơn bác sĩ (dữ liệu mẫu)',
      schedules: [{ id: newId(), kind: 'fixed', time: '07:00' }],
    },
    {
      id: ids.metformin,
      profileId: ids.binh,
      journeyId: ids.journeyBp,
      name: 'Metformin',
      strength: '500 mg',
      form: 'tablet',
      mealRelation: 'after_meal',
      startDate: day(-300),
      durationDays: null,
      quantityOnHand: 40,
      instructions: 'Theo đơn bác sĩ (dữ liệu mẫu)',
      schedules: [
        { id: newId(), kind: 'routine', anchor: 'breakfast', offsetMinutes: 15 },
        { id: newId(), kind: 'routine', anchor: 'dinner', offsetMinutes: 15 },
      ],
    },
  ];

  await db.withTransactionAsync(async () => {
    // ---------- Hồ sơ ----------
    await insert(db, 'profiles', {
      id: ids.an,
      display_name: 'Nguyễn Minh An',
      relation: 'self',
      birth_date: '1998-05-12',
      sex: 'female',
      blood_type: 'O+',
      is_default: 1,
      ...base,
    });
    await insert(db, 'profiles', {
      id: ids.binh,
      display_name: 'Nguyễn Văn Bình (Bố)',
      relation: 'parent',
      birth_date: '1960-03-08',
      sex: 'male',
      blood_type: 'A+',
      is_default: 0,
      ...base,
    });

    await insert(db, 'allergies', {
      id: newId(),
      profile_id: ids.an,
      substance: 'Hải sản (tôm, cua)',
      severity: 'moderate',
      reaction: 'Nổi mẩn ngứa',
      ...base,
    });
    await insert(db, 'conditions', {
      id: newId(),
      profile_id: ids.binh,
      name: 'Tăng huyết áp',
      since_date: '2019-01-01',
      ...base,
    });
    await insert(db, 'conditions', {
      id: newId(),
      profile_id: ids.binh,
      name: 'Đái tháo đường type 2',
      since_date: '2022-06-01',
      ...base,
    });
    // Số điện thoại giả (đầu số 012x đã ngừng sử dụng từ 2018).
    await insert(db, 'emergency_contacts', {
      id: newId(),
      profile_id: ids.an,
      name: 'Nguyễn Văn Bình',
      relation: 'Bố',
      phone: '0123456789',
      priority: 1,
      ...base,
    });
    await insert(db, 'emergency_contacts', {
      id: newId(),
      profile_id: ids.binh,
      name: 'Nguyễn Minh An',
      relation: 'Con gái',
      phone: '0123456788',
      priority: 1,
      ...base,
    });

    for (const [profileId, routines] of [
      [ids.an, routinesAn],
      [ids.binh, routinesBinh],
    ] as const) {
      for (const dayType of ['workday', 'day_off'] as const) {
        for (const [anchor, time] of Object.entries(routines[dayType])) {
          await insert(db, 'routine_anchors', {
            id: newId(),
            profile_id: profileId,
            day_type: dayType,
            anchor,
            time_of_day: time,
            ...base,
          });
        }
      }
    }

    // ---------- Đợt điều trị ----------
    await insert(db, 'care_journeys', {
      id: ids.journeySinus,
      profile_id: ids.an,
      title: 'Đợt viêm xoang',
      status: 'active',
      start_date: dateKey(-3),
      end_date: dateKey(3),
      ...base,
    });
    await insert(db, 'care_journeys', {
      id: ids.journeyBp,
      profile_id: ids.binh,
      title: 'Theo dõi huyết áp định kỳ',
      status: 'monitoring',
      start_date: dateKey(-300),
      ...base,
    });

    // ---------- Lịch khám ----------
    await insert(db, 'appointments', {
      id: ids.apptAn,
      profile_id: ids.an,
      journey_id: ids.journeySinus,
      appointment_type: 'first_visit',
      starts_at: at(-3, '08:30'),
      facility: 'Phòng khám Tai Mũi Họng (mẫu)',
      status: 'done',
      ...base,
    });
    await insert(db, 'appointments', {
      id: ids.apptBinh,
      profile_id: ids.binh,
      journey_id: ids.journeyBp,
      appointment_type: 'follow_up',
      starts_at: at(3, '08:00'),
      facility: 'Bệnh viện (mẫu)',
      department: 'Khoa Tim mạch',
      status: 'upcoming',
      ...base,
    });
    const checklist = [
      'Căn cước công dân hoặc VNeID',
      'Thẻ BHYT hoặc VNeID',
      'Sổ khám bệnh / kết quả lần trước',
      'Danh sách thuốc đang dùng',
    ];
    for (const [index, label] of checklist.entries()) {
      await insert(db, 'checklist_items', {
        id: newId(),
        appointment_id: ids.apptBinh,
        label,
        is_checked: index === 0 ? 1 : 0,
        is_custom: 0,
        sort_order: index,
        ...base,
      });
    }
    await insert(db, 'doctor_questions', {
      id: newId(),
      profile_id: ids.binh,
      journey_id: ids.journeyBp,
      appointment_id: ids.apptBinh,
      question: 'Huyết áp buổi sáng hay cao hơn buổi tối, có cần đo thêm lúc nào không?',
      status: 'open',
      ...base,
    });
    await insert(db, 'doctor_questions', {
      id: newId(),
      profile_id: ids.an,
      journey_id: ids.journeySinus,
      question: 'Nếu hết thuốc mà vẫn nghẹt mũi thì có cần tái khám không?',
      status: 'open',
      ...base,
    });
    await insert(db, 'visit_notes', {
      id: newId(),
      appointment_id: ids.apptAn,
      content: 'Bác sĩ dặn: uống đủ liệu trình 7 ngày, tái khám nếu sốt lại hoặc không đỡ (dữ liệu mẫu).',
      ...base,
    });

    // ---------- Đơn thuốc ----------
    await insert(db, 'prescriptions', {
      id: ids.prescriptionAn,
      profile_id: ids.an,
      journey_id: ids.journeySinus,
      issued_date: dateKey(-3),
      doctor_name: 'BS. (mẫu)',
      facility: 'Phòng khám Tai Mũi Họng (mẫu)',
      ...base,
    });

    // ---------- Thuốc, lịch uống, cữ thuốc ----------
    let doseIndex = 0;
    for (const med of medications) {
      await insert(db, 'medications', {
        id: med.id,
        profile_id: med.profileId,
        journey_id: med.journeyId,
        name: med.name,
        strength: med.strength,
        form: med.form,
        dose_amount: 1,
        dose_unit: 'viên',
        instructions: med.instructions,
        meal_relation: med.mealRelation,
        causes_drowsiness: med.causesDrowsiness ? 1 : 0,
        causes_dizziness: 0,
        start_date: toLocalDateKey(med.startDate),
        duration_days: med.durationDays,
        quantity_on_hand: med.quantityOnHand,
        low_stock_threshold_days: 3,
        is_active: 1,
        ...base,
      });

      if (med.profileId === ids.an) {
        await insert(db, 'prescription_items', {
          id: newId(),
          prescription_id: ids.prescriptionAn,
          medication_name: `${med.name} ${med.strength}`,
          strength: med.strength,
          frequency_text: `Ngày ${med.schedules.length} lần`,
          duration_days: med.durationDays,
          medication_id: med.id,
          ...base,
        });
      }

      const routineConfig = toRoutineConfig(med.profileId === ids.an ? routinesAn : routinesBinh);
      const medicationModel = toMedicationModel(med, stamp);
      for (const schedule of med.schedules) {
        await insert(db, 'medication_schedules', {
          id: schedule.id,
          medication_id: med.id,
          schedule_type: schedule.kind === 'fixed' ? 'fixed_time' : 'routine_anchor',
          time_of_day: schedule.kind === 'fixed' ? (schedule.time ?? null) : null,
          anchor: schedule.kind === 'routine' ? (schedule.anchor ?? null) : null,
          offset_minutes: schedule.offsetMinutes ?? 0,
          ...base,
        });

        // 3 ngày trước → hết hôm nay (các ngày sau do đồng bộ cữ tự sinh khi mở màn hình Hôm nay).
        const scheduleModel = toScheduleModel(med.id, schedule, stamp);
        for (let offset = -3; offset <= 0; offset += 1) {
          const [occurrence] = scheduleOccurrencesForDay(
            medicationModel,
            scheduleModel,
            day(offset),
            routineConfig,
          );
          if (!occurrence) continue;
          const { scheduledAt } = occurrence;
          let status: DoseStatus = 'pending';
          let takenAt: string | null = null;

          if (scheduledAt.getTime() <= now.getTime() - 30 * 60_000) {
            doseIndex += 1;
            if (med.id === ids.amlodipine && offset === -2) {
              status = 'missed';
            } else if (med.id === ids.amoxicillin && offset === -1 && schedule.anchor === 'dinner') {
              status = 'taken_late';
              takenAt = addMinutes(scheduledAt, 150).toISOString();
            } else {
              status = 'taken';
              takenAt = addMinutes(scheduledAt, 5 + (doseIndex % 4) * 5).toISOString();
            }
          }

          await insert(db, 'dose_events', {
            id: newId(),
            profile_id: med.profileId,
            medication_id: med.id,
            schedule_id: schedule.id,
            scheduled_at: scheduledAt.toISOString(),
            slot_key: occurrence.slotKey,
            status,
            taken_at: takenAt,
            ...base,
          });
        }
      }
    }

    await insert(db, 'side_effect_logs', {
      id: newId(),
      profile_id: ids.an,
      medication_id: ids.cetirizine,
      tag: 'drowsy',
      note: 'Hơi buồn ngủ buổi sáng',
      logged_at: at(-1, '07:30'),
      ...base,
    });

    // ---------- Triệu chứng (Minh An) ----------
    await insert(db, 'symptom_logs', {
      id: newId(),
      profile_id: ids.an,
      journey_id: ids.journeySinus,
      symptom: 'fever',
      severity: 2,
      value: 37.8,
      unit: '°C',
      logged_at: at(-2, '20:00'),
      ...base,
    });
    await insert(db, 'symptom_logs', {
      id: newId(),
      profile_id: ids.an,
      journey_id: ids.journeySinus,
      symptom: 'headache',
      severity: 3,
      logged_at: at(-1, '09:00'),
      ...base,
    });
    await insert(db, 'symptom_logs', {
      id: newId(),
      profile_id: ids.an,
      journey_id: ids.journeySinus,
      symptom: 'other',
      severity: 2,
      note: 'Nghẹt mũi',
      logged_at: at(-1, '21:00'),
      ...base,
    });

    // ---------- Chỉ số (Bố): huyết áp & nhịp tim 7 ngày, đường huyết lúc đói ----------
    const bloodPressure: readonly [number, number, number][] = [
      [138, 86, 72],
      [145, 92, 78],
      [132, 84, 70],
      [150, 95, 80],
      [128, 82, 68],
      [141, 90, 76],
      [135, 85, 74],
    ];
    for (const [index, [systolic, diastolic, pulse]] of bloodPressure.entries()) {
      const measuredAt = at(index - 7, '06:15');
      await insert(db, 'vital_readings', {
        id: newId(),
        profile_id: ids.binh,
        journey_id: ids.journeyBp,
        vital_type: 'blood_pressure',
        value_primary: systolic,
        value_secondary: diastolic,
        unit: 'mmHg',
        context: 'resting',
        measured_at: measuredAt,
        ...base,
      });
      await insert(db, 'vital_readings', {
        id: newId(),
        profile_id: ids.binh,
        journey_id: ids.journeyBp,
        vital_type: 'heart_rate',
        value_primary: pulse,
        unit: 'bpm',
        context: 'resting',
        measured_at: measuredAt,
        ...base,
      });
    }
    for (const [offset, value] of [
      [-3, 7.4],
      [-1, 6.8],
    ] as const) {
      await insert(db, 'vital_readings', {
        id: newId(),
        profile_id: ids.binh,
        journey_id: ids.journeyBp,
        vital_type: 'blood_glucose',
        value_primary: value,
        unit: 'mmol/L',
        context: 'fasting',
        measured_at: at(offset, '06:00'),
        ...base,
      });
    }

    // ---------- Chi phí ----------
    await insert(db, 'expenses', {
      id: newId(),
      profile_id: ids.an,
      journey_id: ids.journeySinus,
      appointment_id: ids.apptAn,
      category: 'consultation',
      amount_vnd: 250_000,
      insurance_covered_vnd: 0,
      paid_at: at(-3, '09:00'),
      ...base,
    });
    await insert(db, 'expenses', {
      id: newId(),
      profile_id: ids.an,
      journey_id: ids.journeySinus,
      category: 'medicine',
      amount_vnd: 180_000,
      insurance_covered_vnd: 0,
      paid_at: at(-3, '09:30'),
      ...base,
    });
    await insert(db, 'expenses', {
      id: newId(),
      profile_id: ids.binh,
      journey_id: ids.journeyBp,
      category: 'medicine',
      amount_vnd: 120_000,
      insurance_covered_vnd: 80_000,
      paid_at: at(-30, '10:00'),
      ...base,
    });
  });
}

/** Chỉ nạp dữ liệu mẫu khi cơ sở dữ liệu chưa có hồ sơ nào. @returns true nếu đã nạp. */
export async function seedIfEmpty(db: SQLiteDatabase, now: Date = new Date()): Promise<boolean> {
  const row = await db.getFirstAsync<{ total: number }>('SELECT COUNT(*) AS total FROM profiles', []);
  if ((row?.total ?? 0) > 0) return false;
  await seedSampleData(db, now);
  return true;
}
