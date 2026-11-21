/**
 * Kiểu dữ liệu domain của Kề Bên (camelCase).
 * Tương ứng 1-1 với các bảng SQLite trong `src/db/migrations/001_initial.ts` (snake_case).
 * Thời điểm: ISO 8601 UTC · Giờ trong ngày: "HH:mm" địa phương · Ngày: "YYYY-MM-DD" · Tiền: số nguyên VNĐ.
 */

// ---------- Kiểu dùng chung ----------

/** Cột chung của mọi bảng nghiệp vụ. */
export interface Timestamps {
  createdAt: string;
  updatedAt: string;
  /** Xóa mềm (phục vụ đồng bộ); null = còn hiệu lực. */
  deletedAt: string | null;
}

/** Cột thêm cho bảng có thể đồng bộ với máy chủ gia đình (Milestone 2.5). */
export interface SyncFields {
  /** Id bản ghi trên máy chủ; null = chưa từng đồng bộ. */
  remoteId: string | null;
  syncedAt: string | null;
}

// ---------- Hồ sơ ----------

export type ProfileRelation =
  | 'self'
  | 'child'
  | 'parent'
  | 'grandparent'
  | 'spouse'
  | 'sibling'
  | 'other';

export type Sex = 'male' | 'female' | 'other';

export interface Profile extends Timestamps, SyncFields {
  id: string;
  displayName: string;
  relation: ProfileRelation;
  birthDate: string | null;
  sex: Sex | null;
  bloodType: string | null;
  avatarUri: string | null;
  isDefault: boolean;
  /** Hồ sơ người thân nhận từ máy chủ — chỉ đọc trên máy này. */
  isRemote: boolean;
  note: string | null;
}

export type AllergySeverity = 'mild' | 'moderate' | 'severe';

export interface Allergy extends Timestamps {
  id: string;
  profileId: string;
  substance: string;
  severity: AllergySeverity;
  reaction: string | null;
  note: string | null;
}

export interface Condition extends Timestamps {
  id: string;
  profileId: string;
  name: string;
  sinceDate: string | null;
  note: string | null;
}

export interface EmergencyContact extends Timestamps {
  id: string;
  profileId: string;
  name: string;
  relation: string | null;
  phone: string;
  priority: number;
}

export type DayType = 'workday' | 'day_off' | 'shift';
export type RoutineAnchorKind = 'wake_up' | 'breakfast' | 'lunch' | 'dinner' | 'bedtime';

export interface RoutineAnchor extends Timestamps {
  id: string;
  profileId: string;
  dayType: DayType;
  anchor: RoutineAnchorKind;
  timeOfDay: string;
}

/** Loại ngày theo thứ trong tuần (0 = Chủ nhật … 6 = Thứ Bảy). Bảng cấu hình chỉ lưu trên máy. */
export interface RoutineDayPattern {
  id: string;
  profileId: string;
  weekday: number;
  dayType: DayType;
  createdAt: string;
  updatedAt: string;
}

/** Đổi loại ngày cho riêng một ngày ("YYYY-MM-DD"). */
export interface RoutineDayOverride {
  id: string;
  profileId: string;
  date: string;
  dayType: DayType;
  createdAt: string;
  updatedAt: string;
}

// ---------- Đợt điều trị ----------

export type JourneyStatus = 'active' | 'monitoring' | 'completed';

export interface CareJourney extends Timestamps {
  id: string;
  profileId: string;
  title: string;
  status: JourneyStatus;
  startDate: string;
  endDate: string | null;
  note: string | null;
}

// ---------- Thuốc ----------

export type MedicationForm =
  | 'tablet'
  | 'capsule'
  | 'liquid'
  | 'powder'
  | 'injection'
  | 'drops'
  | 'spray'
  | 'cream'
  | 'other';

export type MealRelation = 'before_meal' | 'after_meal' | 'with_meal' | 'any';

export interface Prescription extends Timestamps {
  id: string;
  profileId: string;
  journeyId: string | null;
  issuedDate: string;
  doctorName: string | null;
  facility: string | null;
  documentId: string | null;
  note: string | null;
}

export interface PrescriptionItem extends Timestamps {
  id: string;
  prescriptionId: string;
  medicationName: string;
  strength: string | null;
  doseText: string | null;
  frequencyText: string | null;
  durationDays: number | null;
  medicationId: string | null;
  note: string | null;
}

export interface Medication extends Timestamps, SyncFields {
  id: string;
  profileId: string;
  journeyId: string | null;
  name: string;
  activeIngredient: string | null;
  strength: string | null;
  form: MedicationForm;
  doseAmount: number;
  doseUnit: string;
  instructions: string | null;
  mealRelation: MealRelation;
  causesDrowsiness: boolean;
  causesDizziness: boolean;
  startDate: string;
  /** null = dùng dài hạn. */
  durationDays: number | null;
  /** null = không theo dõi số lượng. */
  quantityOnHand: number | null;
  lowStockThresholdDays: number;
  isActive: boolean;
}

export type ScheduleType = 'fixed_time' | 'routine_anchor' | 'interval';

export interface MedicationSchedule extends Timestamps, SyncFields {
  id: string;
  medicationId: string;
  scheduleType: ScheduleType;
  /** Dùng khi scheduleType = 'fixed_time'. */
  timeOfDay: string | null;
  /** Dùng khi scheduleType = 'routine_anchor'. */
  anchor: RoutineAnchorKind | null;
  offsetMinutes: number;
  /** Dùng khi scheduleType = 'interval'. */
  intervalHours: number | null;
  /** VD "1,2,3,4,5" (0 = Chủ nhật); null = mọi ngày. */
  daysOfWeek: string | null;
  /** null = mọi loại ngày. */
  dayType: DayType | null;
  /** Ghi đè liều của thuốc cho riêng cữ này. */
  doseAmount: number | null;
}

export interface MedicationPause extends Timestamps, SyncFields {
  id: string;
  medicationId: string;
  reason: string;
  startAt: string;
  endAt: string | null;
  autoResume: boolean;
}

export type DoseStatus =
  | 'pending'
  | 'taken'
  | 'taken_late'
  | 'snoozed'
  | 'skipped'
  | 'missed'
  | 'paused';

export interface DoseEvent extends Timestamps, SyncFields {
  id: string;
  profileId: string;
  medicationId: string;
  scheduleId: string | null;
  scheduledAt: string;
  /** "Ô" của cữ: "<ngày sinh hoạt YYYY-MM-DD>#<thứ tự>" — null với cữ cũ chưa gắn ô. */
  slotKey: string | null;
  status: DoseStatus;
  takenAt: string | null;
  snoozeUntil: string | null;
  skipReason: string | null;
  note: string | null;
}

export type SideEffectTag = 'normal' | 'drowsy' | 'gi_upset' | 'dizzy' | 'other';

export interface SideEffectLog extends Timestamps {
  id: string;
  profileId: string;
  doseEventId: string | null;
  medicationId: string | null;
  tag: SideEffectTag;
  note: string | null;
  loggedAt: string;
}

// ---------- Lịch khám ----------

export type AppointmentType =
  | 'first_visit'
  | 'follow_up'
  | 'blood_test'
  | 'imaging'
  | 'endoscopy'
  | 'vaccination'
  | 'other';

export type AppointmentStatus = 'upcoming' | 'done' | 'cancelled';

export interface Appointment extends Timestamps {
  id: string;
  profileId: string;
  journeyId: string | null;
  appointmentType: AppointmentType;
  startsAt: string;
  facility: string | null;
  department: string | null;
  doctorName: string | null;
  address: string | null;
  status: AppointmentStatus;
  note: string | null;
}

export interface ChecklistItem extends Timestamps {
  id: string;
  appointmentId: string;
  label: string;
  isChecked: boolean;
  isCustom: boolean;
  sortOrder: number;
}

export type QuestionStatus = 'open' | 'asked' | 'answered';

export interface DoctorQuestion extends Timestamps {
  id: string;
  profileId: string;
  journeyId: string | null;
  appointmentId: string | null;
  question: string;
  status: QuestionStatus;
  answer: string | null;
}

export interface VisitNote extends Timestamps {
  id: string;
  appointmentId: string;
  content: string;
  nextAppointmentId: string | null;
}

// ---------- Theo dõi ----------

export type SymptomKind =
  | 'fever'
  | 'headache'
  | 'nausea'
  | 'dizziness'
  | 'cough'
  | 'stomach_ache'
  | 'fatigue'
  | 'other';

export interface SymptomLog extends Timestamps {
  id: string;
  profileId: string;
  journeyId: string | null;
  symptom: SymptomKind;
  /** 1 (nhẹ) – 5 (rất nặng). */
  severity: number | null;
  value: number | null;
  unit: string | null;
  note: string | null;
  loggedAt: string;
}

export type VitalType =
  | 'blood_pressure'
  | 'heart_rate'
  | 'blood_glucose'
  | 'weight'
  | 'temperature'
  | 'spo2';

export type VitalContext = 'fasting' | 'after_meal' | 'resting' | 'other';

export interface VitalReading extends Timestamps {
  id: string;
  profileId: string;
  journeyId: string | null;
  vitalType: VitalType;
  /** Huyết áp: tâm thu; còn lại: giá trị chính. */
  valuePrimary: number;
  /** Huyết áp: tâm trương. */
  valueSecondary: number | null;
  unit: string;
  context: VitalContext | null;
  measuredAt: string;
  note: string | null;
}

export interface VitalThreshold extends Timestamps {
  id: string;
  profileId: string;
  vitalType: VitalType;
  low: number | null;
  high: number | null;
  lowSecondary: number | null;
  highSecondary: number | null;
}

// ---------- Giấy tờ & chi phí ----------

export type DocumentCategory =
  | 'prescription'
  | 'lab_result'
  | 'imaging'
  | 'appointment_slip'
  | 'sick_leave'
  | 'other';

export interface MedicalDocument extends Timestamps {
  id: string;
  profileId: string;
  journeyId: string | null;
  appointmentId: string | null;
  category: DocumentCategory;
  title: string;
  fileUri: string;
  mimeType: string | null;
  capturedAt: string | null;
  note: string | null;
}

export interface AudioNote extends Timestamps {
  id: string;
  profileId: string;
  appointmentId: string | null;
  fileUri: string;
  durationMs: number;
  note: string | null;
  recordedAt: string;
}

export type ExpenseCategory =
  | 'consultation'
  | 'medicine'
  | 'lab_test'
  | 'imaging'
  | 'transport'
  | 'other';

export interface Expense extends Timestamps {
  id: string;
  profileId: string;
  journeyId: string | null;
  appointmentId: string | null;
  category: ExpenseCategory;
  amountVnd: number;
  insuranceCoveredVnd: number;
  paidAt: string;
  note: string | null;
}

// ---------- Gia đình & chia sẻ ----------

/** outgoing: hồ sơ của máy này được chia sẻ cho người khác · incoming: người khác chia sẻ cho máy này. */
export type FamilyLinkDirection = 'outgoing' | 'incoming';
export type FamilyLinkStatus = 'pending' | 'active' | 'revoked';

export interface FamilyLink extends Timestamps, SyncFields {
  id: string;
  profileId: string;
  direction: FamilyLinkDirection;
  memberDisplayName: string;
  memberRelation: string | null;
  canViewMedications: boolean;
  canViewDoses: boolean;
  canReceiveAlerts: boolean;
  status: FamilyLinkStatus;
  consentedAt: string | null;
  revokedAt: string | null;
}

export interface ShareLink extends Timestamps, SyncFields {
  id: string;
  profileId: string;
  scope: 'summary';
  expiresAt: string;
  revokedAt: string | null;
}

// ---------- Hệ thống ----------

export type NotificationEntityType = 'dose_event' | 'appointment' | 'pause_end' | 'other';

export interface ScheduledNotification {
  id: string;
  entityType: NotificationEntityType;
  entityId: string;
  notificationId: string;
  fireAt: string;
  createdAt: string;
}

export type ConsentType =
  | 'medical_disclaimer'
  | 'data_processing_notice'
  | 'family_sharing'
  | 'cloud_sync'
  | 'doctor_sharing';

export interface Consent {
  id: string;
  consentType: ConsentType;
  documentVersion: string;
  profileId: string | null;
  grantedAt: string;
  withdrawnAt: string | null;
  createdAt: string;
}
