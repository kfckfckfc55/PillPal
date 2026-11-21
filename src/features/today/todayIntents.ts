import { useSyncExternalStore } from 'react';

import type { DoseEventWithMedication } from '@/db/repositories/doseEventRepository';

/**
 * Kênh nhỏ để phần xử lý thông báo (ngoài màn hình) báo cho màn hình Hôm nay:
 * - tải lại dữ liệu (VD vừa bấm "Đã uống" trên thông báo, vừa có thông báo đến);
 * - chuyển sang hồ sơ của cữ trong thông báo;
 * - mở bảng chọn giờ cho cữ trễ nhiều (kèm lời nhắc hỏi bác sĩ / dược sĩ).
 */

export interface TodayIntent {
  profileId: string;
  /** Cữ trễ nhiều cần người dùng xác nhận giờ uống. */
  lateDose?: DoseEventWithMedication;
}

type Listener = () => void;

let version = 0;
let pending: TodayIntent | null = null;
const listeners = new Set<Listener>();

function emit() {
  version += 1;
  for (const listener of listeners) listener();
}

export function requestTodayRefresh(): void {
  emit();
}

export function setTodayIntent(intent: TodayIntent): void {
  pending = intent;
  emit();
}

/** Lấy (và xóa) yêu cầu đang chờ. */
export function takeTodayIntent(): TodayIntent | null {
  const intent = pending;
  pending = null;
  return intent;
}

export function subscribeTodayIntents(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useTodayIntentVersion(): number {
  return useSyncExternalStore(subscribeTodayIntents, () => version);
}
