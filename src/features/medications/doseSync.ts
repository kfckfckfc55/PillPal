import type { DoseStatus } from '@/types/models';

import type { DoseOccurrence } from './scheduling';

/**
 * Lập kế hoạch đồng bộ bảng `dose_events` với lịch uống hiện tại (hàm thuần — có unit test).
 *
 * Nguyên tắc an toàn:
 * 1. Chỉ xét các "ô" từ hôm nay trở đi (cửa sổ). Lịch sử các ngày trước giữ nguyên.
 * 2. Cữ đã có thao tác (đã uống, uống trễ, bỏ qua, quên, nhắc lại, tạm dừng) KHÔNG bao giờ bị sửa hay xóa,
 *    và ô đó không sinh thêm cữ mới → đổi giờ uống trong ngày không làm nhắc uống trùng liều.
 * 3. Cữ chưa xác nhận (pending) của ô vẫn còn → dời sang giờ mới nếu giờ thay đổi.
 * 4. Cữ chưa xác nhận của ô không còn trong lịch (xóa lịch, ngừng thuốc, đổi ngày uống) → xóa.
 * 5. Không tạo cữ trước thời điểm lịch uống được tạo (thêm thuốc lúc 10:00 thì không hiện cữ 08:00 sáng nay).
 */

/**
 * Số ngày sinh cữ trước (hôm nay + 6 ngày tới). Thông báo chỉ lên lịch tối đa 59 cữ gần nhất
 * (giới hạn của iOS) nhưng cần đủ cữ để vẫn nhắc nếu người dùng vài ngày không mở app.
 */
export const DOSE_HORIZON_DAYS = 7;

/**
 * Trạng thái do hệ thống quản lý — được dời giờ / đổi qua lại / xóa khi lịch thay đổi:
 * chưa xác nhận (pending) và tạm dừng (paused, theo khoảng tạm dừng của thuốc).
 */
const MUTABLE_STATUSES: ReadonlySet<DoseStatus> = new Set<DoseStatus>(['pending', 'paused']);

/** Trạng thái mong muốn của một cữ chưa có thao tác. */
function targetStatus(occurrence: DoseOccurrence): DoseStatus {
  return occurrence.paused ? 'paused' : 'pending';
}

export interface ExistingDoseEvent {
  id: string;
  medicationId: string;
  scheduleId: string | null;
  slotKey: string | null;
  /** ISO UTC */
  scheduledAt: string;
  status: DoseStatus;
}

export interface DoseEventUpdate {
  id: string;
  medicationId: string;
  scheduleId: string;
  scheduledAt: string;
  slotKey: string;
  status: DoseStatus;
}

export interface DoseSyncPlan {
  inserts: DoseOccurrence[];
  updates: DoseEventUpdate[];
  /** Id các cữ cần xóa. */
  removals: string[];
}

export interface PlanDoseSyncInput {
  /** Cữ dự kiến trong cửa sổ (từ `generateOccurrences`). */
  desired: readonly DoseOccurrence[];
  /** Cữ đang lưu (chưa xóa) từ khoảng 1 ngày trước cửa sổ trở đi. */
  existing: readonly ExistingDoseEvent[];
  /** 00:00 hôm nay (giờ địa phương). */
  windowStart: Date;
  /** "YYYY-MM-DD" của hôm nay. */
  firstDayKey: string;
  /** Thời điểm tạo của từng lịch uống (ISO) — không sinh cữ trước thời điểm này. */
  scheduleCreatedAt: ReadonlyMap<string, string>;
}

/** Ngày sinh hoạt của một ô: "2026-11-21#0" → "2026-11-21". */
export function slotDateKey(slotKey: string): string {
  return slotKey.split('#')[0] ?? slotKey;
}

function slotId(scheduleId: string, slotKey: string): string {
  return `${scheduleId}|${slotKey}`;
}

function timeId(medicationId: string, scheduleId: string | null, iso: string): string {
  return `${medicationId}|${scheduleId ?? ''}|${iso}`;
}

type Decision =
  | { action: 'keep'; event: ExistingDoseEvent; iso: string }
  | { action: 'update'; event: ExistingDoseEvent; iso: string; slotKey: string; status: DoseStatus }
  | { action: 'remove'; event: ExistingDoseEvent };

export function planDoseSync(input: PlanDoseSyncInput): DoseSyncPlan {
  const windowStartIso = input.windowStart.toISOString();
  const desiredBySlot = new Map<string, DoseOccurrence>();
  const desiredByTime = new Map<string, DoseOccurrence>();
  for (const occurrence of input.desired) {
    desiredBySlot.set(slotId(occurrence.scheduleId, occurrence.slotKey), occurrence);
    desiredByTime.set(
      timeId(occurrence.medicationId, occurrence.scheduleId, occurrence.scheduledAt.toISOString()),
      occurrence,
    );
  }

  const isInWindow = (event: ExistingDoseEvent) =>
    event.slotKey !== null
      ? slotDateKey(event.slotKey) >= input.firstDayKey
      : event.scheduledAt >= windowStartIso;

  const matchedSlots = new Set<string>();
  const decisions: Decision[] = [];
  const legacy: ExistingDoseEvent[] = [];

  // Lượt 1: cữ đã gắn ô.
  for (const event of input.existing) {
    if (!isInWindow(event)) {
      decisions.push({ action: 'keep', event, iso: event.scheduledAt });
      continue;
    }
    if (event.scheduleId === null || event.slotKey === null) {
      legacy.push(event);
      continue;
    }
    const key = slotId(event.scheduleId, event.slotKey);
    const target = desiredBySlot.get(key);
    const mutable = MUTABLE_STATUSES.has(event.status);

    if (target && !matchedSlots.has(key)) {
      matchedSlots.add(key);
      const iso = target.scheduledAt.toISOString();
      const status = targetStatus(target);
      if (mutable && (iso !== event.scheduledAt || status !== event.status)) {
        decisions.push({ action: 'update', event, iso, slotKey: target.slotKey, status });
      } else {
        decisions.push({ action: 'keep', event, iso: event.scheduledAt });
      }
      continue;
    }
    decisions.push(mutable ? { action: 'remove', event } : { action: 'keep', event, iso: event.scheduledAt });
  }

  // Lượt 2: cữ cũ chưa gắn ô → nhận ô nếu trùng đúng giờ dự kiến của cùng lịch uống.
  for (const event of legacy) {
    const target =
      event.scheduleId !== null
        ? desiredByTime.get(timeId(event.medicationId, event.scheduleId, event.scheduledAt))
        : undefined;
    if (target) {
      const key = slotId(target.scheduleId, target.slotKey);
      if (!matchedSlots.has(key)) {
        matchedSlots.add(key);
        const status = MUTABLE_STATUSES.has(event.status) ? targetStatus(target) : event.status;
        decisions.push({ action: 'update', event, iso: event.scheduledAt, slotKey: target.slotKey, status });
        continue;
      }
    }
    const mutable = MUTABLE_STATUSES.has(event.status);
    decisions.push(mutable ? { action: 'remove', event } : { action: 'keep', event, iso: event.scheduledAt });
  }

  // Không để 2 cữ của cùng thuốc + cùng lịch trùng đúng một giờ (ràng buộc UNIQUE của bảng).
  // Cữ đã có thao tác được giữ trước; cữ chưa xác nhận bị trùng thì xóa.
  const occupied = new Set<string>();
  const ordered = [...decisions].sort((a, b) => {
    const rank = (decision: Decision) =>
      decision.action === 'remove' ? 2 : MUTABLE_STATUSES.has(decision.event.status) ? 1 : 0;
    return rank(a) - rank(b);
  });
  const plan: DoseSyncPlan = { inserts: [], updates: [], removals: [] };

  for (const decision of ordered) {
    if (decision.action === 'remove') {
      plan.removals.push(decision.event.id);
      continue;
    }
    const { event } = decision;
    const key = timeId(event.medicationId, event.scheduleId, decision.iso);
    if (occupied.has(key)) {
      if (MUTABLE_STATUSES.has(event.status)) {
        plan.removals.push(event.id);
      }
      continue;
    }
    occupied.add(key);
    if (decision.action === 'update' && event.scheduleId !== null) {
      plan.updates.push({
        id: event.id,
        medicationId: event.medicationId,
        scheduleId: event.scheduleId,
        scheduledAt: decision.iso,
        slotKey: decision.slotKey,
        status: decision.status,
      });
    }
  }

  // Ô còn trống → tạo cữ mới (không tạo cữ trước khi lịch uống tồn tại).
  for (const occurrence of input.desired) {
    if (matchedSlots.has(slotId(occurrence.scheduleId, occurrence.slotKey))) continue;
    const iso = occurrence.scheduledAt.toISOString();
    const createdAt = input.scheduleCreatedAt.get(occurrence.scheduleId) ?? windowStartIso;
    const lowerBound = createdAt > windowStartIso ? createdAt : windowStartIso;
    if (iso < lowerBound) continue;
    const key = timeId(occurrence.medicationId, occurrence.scheduleId, iso);
    if (occupied.has(key)) continue;
    occupied.add(key);
    plan.inserts.push(occurrence);
  }

  return plan;
}

export function isEmptyPlan(plan: DoseSyncPlan): boolean {
  return plan.inserts.length === 0 && plan.updates.length === 0 && plan.removals.length === 0;
}
