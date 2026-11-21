import * as SecureStore from 'expo-secure-store';

/**
 * Phiên đăng nhập của người thân (con cháu) — lưu trong Keychain (iOS) / Keystore (Android)
 * qua expo-secure-store, chỉ đọc được trên chính máy này, không đi theo bản sao lưu sang máy khác.
 */

const SESSION_KEY = 'keben.caregiver.session.v1';
const STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};

export interface CaregiverSession {
  token: string;
  caregiverId: string;
  phone: string;
  displayName: string;
  /** ISO — lần gần nhất lưu / gia hạn phiên. */
  savedAt: string;
}

/** Đọc phiên từ chuỗi đã lưu; hỏng / thiếu trường → null (hàm thuần — có unit test). */
export function parseCaregiverSession(raw: string | null): CaregiverSession | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<CaregiverSession>;
    if (
      typeof value.token !== 'string' ||
      !value.token ||
      typeof value.caregiverId !== 'string' ||
      !value.caregiverId ||
      typeof value.phone !== 'string'
    ) {
      return null;
    }
    return {
      token: value.token,
      caregiverId: value.caregiverId,
      phone: value.phone,
      displayName: typeof value.displayName === 'string' ? value.displayName : '',
      savedAt: typeof value.savedAt === 'string' ? value.savedAt : '',
    };
  } catch {
    return null;
  }
}

export async function loadCaregiverSession(): Promise<CaregiverSession | null> {
  return parseCaregiverSession(await SecureStore.getItemAsync(SESSION_KEY, STORE_OPTIONS));
}

export async function saveCaregiverSession(session: CaregiverSession): Promise<void> {
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session), STORE_OPTIONS);
}

export async function clearCaregiverSession(): Promise<void> {
  await SecureStore.deleteItemAsync(SESSION_KEY, STORE_OPTIONS);
}
