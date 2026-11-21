import type { SQLiteDatabase } from 'expo-sqlite';

import { applyDoseSyncPlan, listDoseEventsForSync } from '@/db/repositories/doseEventRepository';
import {
  listMedicationsForDoseSync,
  listSchedulesForDoseSync,
} from '@/db/repositories/medicationRepository';
import { loadRoutineConfigs, pruneDayOverrides } from '@/db/repositories/routineRepository';
import { addDays, startOfLocalDay, toLocalDateKey } from '@/utils/date';

import { DOSE_HORIZON_DAYS, isEmptyPlan, planDoseSync, type DoseSyncPlan } from './doseSync';
import { generateOccurrences } from './scheduling';

export interface DoseSyncResult {
  inserted: number;
  updated: number;
  removed: number;
}

/** Hàng đợi: mỗi lần chỉ chạy một lượt đồng bộ (tránh hai lượt cùng sinh một cữ). */
let queue: Promise<unknown> = Promise.resolve();

/**
 * Sinh / dời / dọn cữ thuốc từ hôm nay tới `DOSE_HORIZON_DAYS` ngày tới cho mọi hồ sơ trên máy.
 * Gọi khi mở màn hình Hôm nay (kể cả sang ngày mới) và sau mỗi lần sửa thuốc, lịch uống, giờ sinh hoạt.
 * Chạy lại nhiều lần vẫn cho cùng kết quả (idempotent).
 */
export function syncDoseEvents(db: SQLiteDatabase, now: Date = new Date()): Promise<DoseSyncResult> {
  const run = queue.then(() => runSync(db, now));
  queue = run.catch(() => undefined);
  return run;
}

async function runSync(db: SQLiteDatabase, now: Date): Promise<DoseSyncResult> {
  const windowStart = startOfLocalDay(now);
  const firstDayKey = toLocalDateKey(windowStart);

  const [medications, schedules] = await Promise.all([
    listMedicationsForDoseSync(db),
    listSchedulesForDoseSync(db),
  ]);
  const profileIds = [...new Set(medications.map((medication) => medication.profileId))];
  const configs = await loadRoutineConfigs(db, profileIds);

  const desired = generateOccurrences({
    medications,
    schedules,
    configs,
    from: windowStart,
    days: DOSE_HORIZON_DAYS,
  });
  // Lấy từ 1 ngày trước để thấy cả cữ "trước khi ngủ" sau nửa đêm của ô hôm qua (giữ nguyên, không đụng tới).
  const existing = await listDoseEventsForSync(db, addDays(windowStart, -1).toISOString());

  const plan: DoseSyncPlan = planDoseSync({
    desired,
    existing,
    windowStart,
    firstDayKey,
    scheduleCreatedAt: new Map(schedules.map((schedule) => [schedule.id, schedule.createdAt])),
  });

  if (!isEmptyPlan(plan)) {
    await applyDoseSyncPlan(db, plan, now.toISOString());
  }
  // Dọn các ngày "đổi riêng" quá 7 ngày (không còn ảnh hưởng tới lịch).
  await pruneDayOverrides(db, toLocalDateKey(addDays(windowStart, -7)));

  return {
    inserted: plan.inserts.length,
    updated: plan.updates.length,
    removed: plan.removals.length,
  };
}
