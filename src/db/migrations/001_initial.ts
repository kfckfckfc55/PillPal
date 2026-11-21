import type { SQLiteDatabase } from 'expo-sqlite';

import type { Migration } from './types';

/*
 * Migration v1 — toàn bộ schema của Kề Bên.
 * Quy ước:
 * - id TEXT (UUID) · created_at / updated_at / deleted_at (xóa mềm) dạng ISO 8601 UTC.
 * - Bảng có thể đồng bộ cho gia đình: thêm remote_id, synced_at.
 * - Boolean lưu INTEGER 0/1 · Tiền lưu INTEGER (VNĐ) · Giờ trong ngày "HH:mm".
 * - KHÔNG lưu số CCCD / số thẻ BHYT (tối thiểu hóa dữ liệu — xem docs/LEGAL_COMPLIANCE_VN.md).
 * Sau khi phát hành: KHÔNG sửa file này; thay đổi schema bằng migration mới.
 */
const SQL = `
-- ===================== HỒ SƠ =====================
CREATE TABLE profiles (
  id TEXT PRIMARY KEY NOT NULL,
  display_name TEXT NOT NULL CHECK (length(trim(display_name)) > 0),
  relation TEXT NOT NULL CHECK (relation IN ('self','child','parent','grandparent','spouse','sibling','other')),
  birth_date TEXT,
  sex TEXT CHECK (sex IS NULL OR sex IN ('male','female','other')),
  blood_type TEXT,
  avatar_uri TEXT,
  is_default INTEGER NOT NULL DEFAULT 0 CHECK (is_default IN (0,1)),
  is_remote INTEGER NOT NULL DEFAULT 0 CHECK (is_remote IN (0,1)),
  note TEXT,
  remote_id TEXT,
  synced_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
CREATE UNIQUE INDEX idx_profiles_remote_id ON profiles(remote_id) WHERE remote_id IS NOT NULL;

CREATE TABLE allergies (
  id TEXT PRIMARY KEY NOT NULL,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  substance TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'moderate' CHECK (severity IN ('mild','moderate','severe')),
  reaction TEXT,
  note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
CREATE INDEX idx_allergies_profile ON allergies(profile_id);

CREATE TABLE conditions (
  id TEXT PRIMARY KEY NOT NULL,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  since_date TEXT,
  note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
CREATE INDEX idx_conditions_profile ON conditions(profile_id);

CREATE TABLE emergency_contacts (
  id TEXT PRIMARY KEY NOT NULL,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  relation TEXT,
  phone TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
CREATE INDEX idx_emergency_contacts_profile ON emergency_contacts(profile_id, priority);

CREATE TABLE routine_anchors (
  id TEXT PRIMARY KEY NOT NULL,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  day_type TEXT NOT NULL CHECK (day_type IN ('workday','day_off','shift')),
  anchor TEXT NOT NULL CHECK (anchor IN ('wake_up','breakfast','lunch','dinner','bedtime')),
  time_of_day TEXT NOT NULL CHECK (time_of_day GLOB '[0-2][0-9]:[0-5][0-9]'),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  UNIQUE (profile_id, day_type, anchor)
);

-- ===================== ĐỢT ĐIỀU TRỊ =====================
CREATE TABLE care_journeys (
  id TEXT PRIMARY KEY NOT NULL,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','monitoring','completed')),
  start_date TEXT NOT NULL,
  end_date TEXT,
  note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
CREATE INDEX idx_care_journeys_profile ON care_journeys(profile_id, status);

-- ===================== GIẤY TỜ (đặt trước đơn thuốc vì đơn thuốc tham chiếu ảnh) =====================
CREATE TABLE documents (
  id TEXT PRIMARY KEY NOT NULL,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  journey_id TEXT REFERENCES care_journeys(id) ON DELETE SET NULL,
  appointment_id TEXT REFERENCES appointments(id) ON DELETE SET NULL,
  category TEXT NOT NULL CHECK (category IN ('prescription','lab_result','imaging','appointment_slip','sick_leave','other')),
  title TEXT NOT NULL,
  file_uri TEXT NOT NULL,
  mime_type TEXT,
  captured_at TEXT,
  note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
CREATE INDEX idx_documents_profile ON documents(profile_id, category);

-- ===================== THUỐC =====================
CREATE TABLE prescriptions (
  id TEXT PRIMARY KEY NOT NULL,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  journey_id TEXT REFERENCES care_journeys(id) ON DELETE SET NULL,
  issued_date TEXT NOT NULL,
  doctor_name TEXT,
  facility TEXT,
  document_id TEXT REFERENCES documents(id) ON DELETE SET NULL,
  note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
CREATE INDEX idx_prescriptions_profile ON prescriptions(profile_id, issued_date);

CREATE TABLE medications (
  id TEXT PRIMARY KEY NOT NULL,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  journey_id TEXT REFERENCES care_journeys(id) ON DELETE SET NULL,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  active_ingredient TEXT,
  strength TEXT,
  form TEXT NOT NULL DEFAULT 'tablet' CHECK (form IN ('tablet','capsule','liquid','powder','injection','drops','spray','cream','other')),
  dose_amount REAL NOT NULL DEFAULT 1 CHECK (dose_amount > 0),
  dose_unit TEXT NOT NULL DEFAULT 'viên',
  instructions TEXT,
  meal_relation TEXT NOT NULL DEFAULT 'any' CHECK (meal_relation IN ('before_meal','after_meal','with_meal','any')),
  causes_drowsiness INTEGER NOT NULL DEFAULT 0 CHECK (causes_drowsiness IN (0,1)),
  causes_dizziness INTEGER NOT NULL DEFAULT 0 CHECK (causes_dizziness IN (0,1)),
  start_date TEXT NOT NULL,
  duration_days INTEGER CHECK (duration_days IS NULL OR duration_days > 0),
  quantity_on_hand REAL CHECK (quantity_on_hand IS NULL OR quantity_on_hand >= 0),
  low_stock_threshold_days INTEGER NOT NULL DEFAULT 3 CHECK (low_stock_threshold_days >= 0),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  remote_id TEXT,
  synced_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
CREATE INDEX idx_medications_profile ON medications(profile_id, is_active);
CREATE UNIQUE INDEX idx_medications_remote_id ON medications(remote_id) WHERE remote_id IS NOT NULL;

CREATE TABLE prescription_items (
  id TEXT PRIMARY KEY NOT NULL,
  prescription_id TEXT NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
  medication_name TEXT NOT NULL,
  strength TEXT,
  dose_text TEXT,
  frequency_text TEXT,
  duration_days INTEGER,
  medication_id TEXT REFERENCES medications(id) ON DELETE SET NULL,
  note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
CREATE INDEX idx_prescription_items_prescription ON prescription_items(prescription_id);

CREATE TABLE medication_schedules (
  id TEXT PRIMARY KEY NOT NULL,
  medication_id TEXT NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
  schedule_type TEXT NOT NULL CHECK (schedule_type IN ('fixed_time','routine_anchor','interval')),
  time_of_day TEXT CHECK (time_of_day IS NULL OR time_of_day GLOB '[0-2][0-9]:[0-5][0-9]'),
  anchor TEXT CHECK (anchor IS NULL OR anchor IN ('wake_up','breakfast','lunch','dinner','bedtime')),
  offset_minutes INTEGER NOT NULL DEFAULT 0,
  interval_hours INTEGER CHECK (interval_hours IS NULL OR interval_hours > 0),
  days_of_week TEXT,
  day_type TEXT CHECK (day_type IS NULL OR day_type IN ('workday','day_off','shift')),
  dose_amount REAL CHECK (dose_amount IS NULL OR dose_amount > 0),
  remote_id TEXT,
  synced_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  CHECK (
    (schedule_type = 'fixed_time' AND time_of_day IS NOT NULL) OR
    (schedule_type = 'routine_anchor' AND anchor IS NOT NULL) OR
    (schedule_type = 'interval' AND interval_hours IS NOT NULL)
  )
);
CREATE INDEX idx_medication_schedules_medication ON medication_schedules(medication_id);

CREATE TABLE medication_pauses (
  id TEXT PRIMARY KEY NOT NULL,
  medication_id TEXT NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  start_at TEXT NOT NULL,
  end_at TEXT,
  auto_resume INTEGER NOT NULL DEFAULT 1 CHECK (auto_resume IN (0,1)),
  remote_id TEXT,
  synced_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  CHECK (end_at IS NULL OR end_at > start_at)
);
CREATE INDEX idx_medication_pauses_medication ON medication_pauses(medication_id, start_at);

CREATE TABLE dose_events (
  id TEXT PRIMARY KEY NOT NULL,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  medication_id TEXT NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
  schedule_id TEXT REFERENCES medication_schedules(id) ON DELETE SET NULL,
  scheduled_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','taken','taken_late','snoozed','skipped','missed','paused')),
  taken_at TEXT,
  snooze_until TEXT,
  skip_reason TEXT,
  note TEXT,
  remote_id TEXT,
  synced_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  UNIQUE (medication_id, schedule_id, scheduled_at),
  CHECK (status NOT IN ('taken','taken_late') OR taken_at IS NOT NULL)
);
CREATE INDEX idx_dose_events_profile_time ON dose_events(profile_id, scheduled_at);
CREATE INDEX idx_dose_events_medication ON dose_events(medication_id, scheduled_at);

CREATE TABLE side_effect_logs (
  id TEXT PRIMARY KEY NOT NULL,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  dose_event_id TEXT REFERENCES dose_events(id) ON DELETE SET NULL,
  medication_id TEXT REFERENCES medications(id) ON DELETE SET NULL,
  tag TEXT NOT NULL CHECK (tag IN ('normal','drowsy','gi_upset','dizzy','other')),
  note TEXT,
  logged_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
CREATE INDEX idx_side_effect_logs_profile ON side_effect_logs(profile_id, logged_at);

-- ===================== LỊCH KHÁM =====================
CREATE TABLE appointments (
  id TEXT PRIMARY KEY NOT NULL,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  journey_id TEXT REFERENCES care_journeys(id) ON DELETE SET NULL,
  appointment_type TEXT NOT NULL DEFAULT 'follow_up' CHECK (appointment_type IN ('first_visit','follow_up','blood_test','imaging','endoscopy','vaccination','other')),
  starts_at TEXT NOT NULL,
  facility TEXT,
  department TEXT,
  doctor_name TEXT,
  address TEXT,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming','done','cancelled')),
  note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
CREATE INDEX idx_appointments_profile_time ON appointments(profile_id, starts_at);

CREATE TABLE checklist_items (
  id TEXT PRIMARY KEY NOT NULL,
  appointment_id TEXT NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  is_checked INTEGER NOT NULL DEFAULT 0 CHECK (is_checked IN (0,1)),
  is_custom INTEGER NOT NULL DEFAULT 0 CHECK (is_custom IN (0,1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
CREATE INDEX idx_checklist_items_appointment ON checklist_items(appointment_id, sort_order);

CREATE TABLE doctor_questions (
  id TEXT PRIMARY KEY NOT NULL,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  journey_id TEXT REFERENCES care_journeys(id) ON DELETE SET NULL,
  appointment_id TEXT REFERENCES appointments(id) ON DELETE SET NULL,
  question TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','asked','answered')),
  answer TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
CREATE INDEX idx_doctor_questions_profile ON doctor_questions(profile_id, status);

CREATE TABLE visit_notes (
  id TEXT PRIMARY KEY NOT NULL,
  appointment_id TEXT NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  next_appointment_id TEXT REFERENCES appointments(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
CREATE INDEX idx_visit_notes_appointment ON visit_notes(appointment_id);

-- ===================== THEO DÕI =====================
CREATE TABLE symptom_logs (
  id TEXT PRIMARY KEY NOT NULL,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  journey_id TEXT REFERENCES care_journeys(id) ON DELETE SET NULL,
  symptom TEXT NOT NULL CHECK (symptom IN ('fever','headache','nausea','dizziness','cough','stomach_ache','fatigue','other')),
  severity INTEGER CHECK (severity IS NULL OR severity BETWEEN 1 AND 5),
  value REAL,
  unit TEXT,
  note TEXT,
  logged_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
CREATE INDEX idx_symptom_logs_profile_time ON symptom_logs(profile_id, logged_at);

CREATE TABLE vital_readings (
  id TEXT PRIMARY KEY NOT NULL,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  journey_id TEXT REFERENCES care_journeys(id) ON DELETE SET NULL,
  vital_type TEXT NOT NULL CHECK (vital_type IN ('blood_pressure','heart_rate','blood_glucose','weight','temperature','spo2')),
  value_primary REAL NOT NULL,
  value_secondary REAL,
  unit TEXT NOT NULL,
  context TEXT CHECK (context IS NULL OR context IN ('fasting','after_meal','resting','other')),
  measured_at TEXT NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  CHECK (vital_type <> 'blood_pressure' OR value_secondary IS NOT NULL)
);
CREATE INDEX idx_vital_readings_profile_type_time ON vital_readings(profile_id, vital_type, measured_at);

CREATE TABLE vital_thresholds (
  id TEXT PRIMARY KEY NOT NULL,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vital_type TEXT NOT NULL CHECK (vital_type IN ('blood_pressure','heart_rate','blood_glucose','weight','temperature','spo2')),
  low REAL,
  high REAL,
  low_secondary REAL,
  high_secondary REAL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  UNIQUE (profile_id, vital_type)
);

-- ===================== GHI ÂM & CHI PHÍ =====================
CREATE TABLE audio_notes (
  id TEXT PRIMARY KEY NOT NULL,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  appointment_id TEXT REFERENCES appointments(id) ON DELETE SET NULL,
  file_uri TEXT NOT NULL,
  duration_ms INTEGER NOT NULL DEFAULT 0 CHECK (duration_ms >= 0),
  note TEXT,
  recorded_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
CREATE INDEX idx_audio_notes_profile ON audio_notes(profile_id, recorded_at);

CREATE TABLE expenses (
  id TEXT PRIMARY KEY NOT NULL,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  journey_id TEXT REFERENCES care_journeys(id) ON DELETE SET NULL,
  appointment_id TEXT REFERENCES appointments(id) ON DELETE SET NULL,
  category TEXT NOT NULL CHECK (category IN ('consultation','medicine','lab_test','imaging','transport','other')),
  amount_vnd INTEGER NOT NULL CHECK (amount_vnd >= 0),
  insurance_covered_vnd INTEGER NOT NULL DEFAULT 0 CHECK (insurance_covered_vnd >= 0),
  paid_at TEXT NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  CHECK (insurance_covered_vnd <= amount_vnd)
);
CREATE INDEX idx_expenses_profile_time ON expenses(profile_id, paid_at);

-- ===================== GIA ĐÌNH & CHIA SẺ =====================
CREATE TABLE family_links (
  id TEXT PRIMARY KEY NOT NULL,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('outgoing','incoming')),
  member_display_name TEXT NOT NULL,
  member_relation TEXT,
  can_view_medications INTEGER NOT NULL DEFAULT 1 CHECK (can_view_medications IN (0,1)),
  can_view_doses INTEGER NOT NULL DEFAULT 1 CHECK (can_view_doses IN (0,1)),
  can_receive_alerts INTEGER NOT NULL DEFAULT 0 CHECK (can_receive_alerts IN (0,1)),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','revoked')),
  consented_at TEXT,
  revoked_at TEXT,
  remote_id TEXT,
  synced_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  CHECK (status <> 'active' OR consented_at IS NOT NULL)
);
CREATE INDEX idx_family_links_profile ON family_links(profile_id, status);

CREATE TABLE share_links (
  id TEXT PRIMARY KEY NOT NULL,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  scope TEXT NOT NULL DEFAULT 'summary' CHECK (scope IN ('summary')),
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  remote_id TEXT,
  synced_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

-- ===================== HỆ THỐNG =====================
CREATE TABLE scheduled_notifications (
  id TEXT PRIMARY KEY NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('dose_event','appointment','pause_end','other')),
  entity_id TEXT NOT NULL,
  notification_id TEXT NOT NULL,
  fire_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_scheduled_notifications_entity ON scheduled_notifications(entity_type, entity_id);

CREATE TABLE app_settings (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE consents (
  id TEXT PRIMARY KEY NOT NULL,
  consent_type TEXT NOT NULL CHECK (consent_type IN ('medical_disclaimer','data_processing_notice','family_sharing','cloud_sync','doctor_sharing')),
  document_version TEXT NOT NULL,
  profile_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,
  granted_at TEXT NOT NULL,
  withdrawn_at TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_consents_type ON consents(consent_type, granted_at);
`;

export const migration001Initial: Migration = {
  version: 1,
  name: 'initial_schema',
  async up(db: SQLiteDatabase) {
    await db.execAsync(SQL);
  },
};

/** Xuất riêng chuỗi SQL để kiểm thử schema ngoài app (script kiểm tra). */
export const MIGRATION_001_SQL = SQL;
