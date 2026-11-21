import { randomUUID } from 'expo-crypto';

/** Tạo id dạng UUID v4 cho bản ghi mới (dùng chung được khi đồng bộ với máy chủ). */
export function newId(): string {
  return randomUUID();
}
