/**
 * Lên lịch thông báo cuốn chiếu (hàm thuần — có unit test).
 *
 * iOS chỉ giữ tối đa 64 thông báo cục bộ đang chờ → Kề Bên chỉ lên lịch những cữ gần nhất
 * (tối đa 59) + 1 thông báo "hãy mở app" ngay sau cữ cuối cùng, để nếu người dùng lâu không mở app
 * thì vẫn biết việc nhắc thuốc sắp dừng. Mỗi lần mở app / sửa thuốc, danh sách được tính lại.
 */

/** Giới hạn của Kề Bên (để dư chỗ cho nhắc lịch khám ở Milestone 3). */
export const MAX_SCHEDULED_REMINDERS = 60;
/** Thông báo "hãy mở app" bắn sau cữ cuối cùng đã lên lịch bao nhiêu phút. */
export const CONTINUITY_DELAY_MINUTES = 30;

/** Mọi thông báo do Kề Bên tạo có tiền tố này (để không đụng tới thông báo khác). */
export const REMINDER_ID_PREFIX = 'keben-';
const DOSE_PREFIX = `${REMINDER_ID_PREFIX}dose-`;
const CONTINUITY_ID_PREFIX = `${REMINDER_ID_PREFIX}continue-`;

export interface ReminderCandidate {
  doseId: string;
  profileId: string;
  fireAt: Date;
  title: string;
  body: string;
}

export interface PlannedReminder {
  identifier: string;
  kind: 'dose' | 'continuity';
  /** null với thông báo "hãy mở app". */
  doseId: string | null;
  profileId: string | null;
  fireAt: Date;
  title: string;
  body: string;
}

/** Băm ngắn (djb2) để nhận biết nội dung đã đổi → lên lịch lại. */
export function shortHash(value: string): string {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) + hash + value.charCodeAt(index)) | 0;
  }
  return (hash >>> 0).toString(36);
}

/** Định danh = cữ + giờ bắn + nội dung: đổi bất kỳ thứ gì → định danh mới → hủy cũ, đặt mới. */
export function doseReminderIdentifier(candidate: ReminderCandidate): string {
  return `${DOSE_PREFIX}${candidate.doseId}-${candidate.fireAt.getTime()}-${shortHash(`${candidate.title}|${candidate.body}`)}`;
}

export function isKebenReminder(identifier: string): boolean {
  return identifier.startsWith(REMINDER_ID_PREFIX);
}

export interface BuildRemindersInput {
  candidates: readonly ReminderCandidate[];
  now: Date;
  /** Nội dung thông báo "hãy mở app". */
  continuity: { title: string; body: string };
  max?: number;
}

/** Danh sách thông báo mong muốn: các cữ sắp tới gần nhất + 1 thông báo "hãy mở app". */
export function buildReminderPlan(input: BuildRemindersInput): PlannedReminder[] {
  const max = input.max ?? MAX_SCHEDULED_REMINDERS;
  const upcoming = input.candidates
    .filter((candidate) => candidate.fireAt.getTime() > input.now.getTime())
    .sort((a, b) => a.fireAt.getTime() - b.fireAt.getTime())
    .slice(0, Math.max(0, max - 1));

  const planned: PlannedReminder[] = upcoming.map((candidate) => ({
    identifier: doseReminderIdentifier(candidate),
    kind: 'dose',
    doseId: candidate.doseId,
    profileId: candidate.profileId,
    fireAt: candidate.fireAt,
    title: candidate.title,
    body: candidate.body,
  }));

  const last = upcoming[upcoming.length - 1];
  if (last) {
    const fireAt = new Date(last.fireAt.getTime() + CONTINUITY_DELAY_MINUTES * 60_000);
    planned.push({
      identifier: `${CONTINUITY_ID_PREFIX}${fireAt.getTime()}-${shortHash(input.continuity.body)}`,
      kind: 'continuity',
      doseId: null,
      profileId: null,
      fireAt,
      title: input.continuity.title,
      body: input.continuity.body,
    });
  }
  return planned;
}

export interface ReminderChanges {
  toSchedule: PlannedReminder[];
  /** Định danh thông báo của Kề Bên cần hủy. */
  toCancel: string[];
}

/** So với các thông báo đang chờ trên máy: chỉ hủy / đặt phần khác nhau (không đụng thông báo của app khác). */
export function diffReminders(
  planned: readonly PlannedReminder[],
  scheduledIdentifiers: readonly string[],
): ReminderChanges {
  const wanted = new Set(planned.map((item) => item.identifier));
  const existing = new Set(scheduledIdentifiers.filter(isKebenReminder));
  return {
    toSchedule: planned.filter((item) => !existing.has(item.identifier)),
    toCancel: [...existing].filter((identifier) => !wanted.has(identifier)),
  };
}
