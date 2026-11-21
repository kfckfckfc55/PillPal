import { strings } from '@/constants/strings.vi';
import type { MealRelation } from '@/types/models';
import { formatDoseAmount, formatTime } from '@/utils/format';

/** Nội dung thông báo nhắc thuốc (hàm thuần — có unit test). */

export interface DoseReminderInput {
  doseId: string;
  profileId: string;
  profileName: string;
  /** Có nhiều hồ sơ trên máy → ghi tên hồ sơ (VD "Bố · 08:00 — …"). */
  showProfileName: boolean;
  medicationName: string;
  strength: string | null;
  doseAmount: number;
  doseUnit: string;
  mealRelation: MealRelation;
  fireAt: Date;
  /** Thông báo của lần "Nhắc lại". */
  isSnooze: boolean;
  /** Ẩn tên thuốc (người khác nhìn thấy màn hình khóa sẽ không biết thuốc gì). */
  hideMedicationNames: boolean;
}

export interface ReminderContent {
  title: string;
  body: string;
  data: { kind: 'dose'; doseId: string; profileId: string };
}

export function buildDoseReminderContent(input: DoseReminderInput): ReminderContent {
  const copy = strings.reminders.content;
  const time = formatTime(input.fireAt);
  const prefix = input.showProfileName ? `${input.profileName} · ` : '';
  const title = `${prefix}${time} — ${input.isSnooze ? copy.snoozeTitle : copy.title}`;

  let body: string;
  if (input.hideMedicationNames) {
    body = copy.hiddenBody;
  } else {
    const name = input.strength ? `${input.medicationName} ${input.strength}` : input.medicationName;
    const parts = [name, formatDoseAmount(input.doseAmount, input.doseUnit)];
    if (input.mealRelation !== 'any') parts.push(strings.today.mealRelation[input.mealRelation]);
    body = parts.join(' · ');
  }
  return { title, body, data: { kind: 'dose', doseId: input.doseId, profileId: input.profileId } };
}
