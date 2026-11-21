import { getRandomBytes } from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

import type { DeviceCredentials } from './familyApi';

/**
 * Tài khoản "máy của ông bà" trên máy chủ gia đình — không cần số điện thoại.
 * Khóa + mật khẩu do chính máy tự sinh (ngẫu nhiên, mã hóa an toàn) và chỉ lưu trong
 * Keychain (iOS) / Keystore (Android) của máy này.
 */

const SESSION_KEY = 'keben.device.session.v1';
const STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};

export interface DeviceSession extends DeviceCredentials {
  /** null = đã sinh khóa nhưng chưa tạo được tài khoản trên máy chủ. */
  deviceId: string | null;
  token: string | null;
  savedAt: string;
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** Khóa 32 ký tự hex (128 bit) + mật khẩu 48 ký tự hex (192 bit). */
export function generateDeviceCredentials(deviceName: string): DeviceCredentials {
  return {
    deviceKey: toHex(getRandomBytes(16)),
    password: toHex(getRandomBytes(24)),
    deviceName: deviceName.trim().slice(0, 50),
  };
}

export function parseDeviceSession(raw: string | null): DeviceSession | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<DeviceSession>;
    if (typeof value.deviceKey !== 'string' || typeof value.password !== 'string') return null;
    if (value.deviceKey.length < 24 || value.password.length < 32) return null;
    return {
      deviceKey: value.deviceKey,
      password: value.password,
      deviceName: typeof value.deviceName === 'string' ? value.deviceName : '',
      deviceId: typeof value.deviceId === 'string' && value.deviceId ? value.deviceId : null,
      token: typeof value.token === 'string' && value.token ? value.token : null,
      savedAt: typeof value.savedAt === 'string' ? value.savedAt : '',
    };
  } catch {
    return null;
  }
}

export async function loadDeviceSession(): Promise<DeviceSession | null> {
  return parseDeviceSession(await SecureStore.getItemAsync(SESSION_KEY, STORE_OPTIONS));
}

export async function saveDeviceSession(session: DeviceSession): Promise<void> {
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session), STORE_OPTIONS);
}

export async function clearDeviceSession(): Promise<void> {
  await SecureStore.deleteItemAsync(SESSION_KEY, STORE_OPTIONS);
}
