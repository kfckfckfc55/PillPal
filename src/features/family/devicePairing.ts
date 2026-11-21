import type { SQLiteDatabase } from 'expo-sqlite';

import { LEGAL_DOCUMENT_VERSIONS } from '@/constants/disclaimer';
import { recordSharingConsent } from '@/db/repositories/familyLinkRepository';
import {
  generateDeviceCredentials,
  loadDeviceSession,
  saveDeviceSession,
  type DeviceSession,
} from '@/services/backend/deviceSession';
import {
  BackendError,
  type FamilyApi,
  type PairingResult,
  type PairingTarget,
  type SharingPermissions,
} from '@/services/backend/familyApi';

/**
 * Lỗi do sai / mất tài khoản (khác lỗi mạng). KHÔNG tính 429 (đang bị giới hạn tần suất) —
 * nếu không, máy sẽ tưởng mất tài khoản rồi sinh khóa mới.
 */
export function isAuthRejected(error: unknown): boolean {
  return (
    error instanceof BackendError &&
    error.status !== 429 &&
    error.code !== 'too_many_requests' &&
    (error.code === 'unauthorized' || error.code === 'not_found' || (error.status >= 400 && error.status < 500))
  );
}

/**
 * Lấy phiên đăng nhập của máy ông bà (nếu máy đã có tài khoản trên máy chủ).
 * - Chưa có khóa → tự sinh & lưu NGAY (trước khi gọi mạng) để lỡ mất mạng giữa chừng vẫn đăng nhập lại được.
 * - Có token → gia hạn; hết hạn → đăng nhập lại bằng khóa + mật khẩu.
 * - Máy chủ không nhận khóa (máy mới / tài khoản đã xóa) → token null (lần ghép tới sẽ tạo tài khoản).
 * Lỗi mạng → ném lỗi.
 */
export async function ensureDeviceAuth(
  api: FamilyApi,
  deviceName: string,
): Promise<{ session: DeviceSession; token: string | null }> {
  let session = await loadDeviceSession();
  if (!session) {
    session = { ...generateDeviceCredentials(deviceName), deviceId: null, token: null, savedAt: new Date().toISOString() };
    await saveDeviceSession(session);
  }

  if (session.token) {
    try {
      const auth = await api.refreshDevice(session.token);
      const next = { ...session, deviceId: auth.deviceId, token: auth.token, savedAt: new Date().toISOString() };
      await saveDeviceSession(next);
      return { session: next, token: auth.token };
    } catch (error) {
      if (!isAuthRejected(error)) throw error;
    }
  }

  try {
    const auth = await api.deviceLogin(session);
    const next = { ...session, deviceId: auth.deviceId, token: auth.token, savedAt: new Date().toISOString() };
    await saveDeviceSession(next);
    return { session: next, token: auth.token };
  } catch (error) {
    if (!isAuthRejected(error)) throw error;
  }

  // Máy chủ chưa có / không còn tài khoản này.
  if (session.deviceId) {
    // Tài khoản đã bị xóa → sinh khóa mới cho lần ghép sau (không dùng lại khóa cũ).
    session = { ...generateDeviceCredentials(deviceName), deviceId: null, token: null, savedAt: new Date().toISOString() };
    await saveDeviceSession(session);
  }
  return { session, token: null };
}

export interface CompletePairingInput {
  target: PairingTarget;
  profile: { localId: string; displayName: string };
  permissions: SharingPermissions;
  deviceName: string;
}

/** Ông bà bấm "Đồng ý chia sẻ": hoàn tất trên máy chủ → lưu phiên máy → ghi nhật ký đồng ý trên máy. */
export async function completeDevicePairing(
  db: SQLiteDatabase,
  api: FamilyApi,
  input: CompletePairingInput,
): Promise<PairingResult> {
  const { session, token } = await ensureDeviceAuth(api, input.deviceName);
  const result = await api.completePairing({
    target: input.target,
    consentVersion: LEGAL_DOCUMENT_VERSIONS.family_sharing,
    permissions: input.permissions,
    profile: input.profile,
    deviceToken: token,
    credentials: token ? null : session,
  });
  await saveDeviceSession({ ...session, deviceId: result.deviceId, token: result.token, savedAt: new Date().toISOString() });
  await recordSharingConsent(db, {
    profileId: input.profile.localId,
    remoteLinkId: result.linkId,
    caregiverName: result.caregiverName || result.caregiverPhoneMasked,
    permissions: input.permissions,
    documentVersion: LEGAL_DOCUMENT_VERSIONS.family_sharing,
  });
  return result;
}
