import type { SQLiteDatabase } from 'expo-sqlite';

import { LEGAL_DOCUMENT_VERSIONS } from '@/constants/disclaimer';
import {
  getActiveConsent,
  recordConsent,
  withdrawConsent,
} from '@/db/repositories/consentRepository';

/**
 * Hai sự đồng ý bắt buộc trước khi dùng app:
 * - medical_disclaimer: hiểu app không thay thế bác sĩ, dược sĩ.
 * - data_processing_notice: đồng ý app lưu & xử lý dữ liệu sức khỏe trên máy.
 * Khi phiên bản văn bản trong `LEGAL_DOCUMENT_VERSIONS` thay đổi → người dùng phải đồng ý lại.
 */

export interface RequiredConsentStatus {
  accepted: boolean;
  /** Thời điểm đồng ý gần nhất (ISO) — null nếu chưa đồng ý bản hiện hành. */
  acceptedAt: string | null;
}

export async function readRequiredConsentStatus(db: SQLiteDatabase): Promise<RequiredConsentStatus> {
  const [disclaimer, notice] = await Promise.all([
    getActiveConsent(db, 'medical_disclaimer'),
    getActiveConsent(db, 'data_processing_notice'),
  ]);
  const accepted =
    disclaimer?.documentVersion === LEGAL_DOCUMENT_VERSIONS.medical_disclaimer &&
    notice?.documentVersion === LEGAL_DOCUMENT_VERSIONS.data_processing_notice;

  if (!accepted || !disclaimer || !notice) {
    return { accepted: false, acceptedAt: null };
  }
  const acceptedAt = disclaimer.grantedAt > notice.grantedAt ? disclaimer.grantedAt : notice.grantedAt;
  return { accepted: true, acceptedAt };
}

/** Ghi nhận cả hai sự đồng ý — chỉ gọi khi người dùng đã tự tick cả hai ô và bấm nút. */
export async function acceptRequiredConsents(db: SQLiteDatabase): Promise<RequiredConsentStatus> {
  await db.withTransactionAsync(async () => {
    await recordConsent(db, {
      consentType: 'medical_disclaimer',
      documentVersion: LEGAL_DOCUMENT_VERSIONS.medical_disclaimer,
    });
    await recordConsent(db, {
      consentType: 'data_processing_notice',
      documentVersion: LEGAL_DOCUMENT_VERSIONS.data_processing_notice,
    });
  });
  return readRequiredConsentStatus(db);
}

/** Rút lại sự đồng ý (quyền của chủ thể dữ liệu) — app quay về màn hình chào. */
export async function withdrawRequiredConsents(db: SQLiteDatabase): Promise<void> {
  await db.withTransactionAsync(async () => {
    await withdrawConsent(db, 'medical_disclaimer');
    await withdrawConsent(db, 'data_processing_notice');
  });
}
