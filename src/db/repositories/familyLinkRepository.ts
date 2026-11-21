import type { SQLiteDatabase } from 'expo-sqlite';

import { fromBool, toBool } from '@/db/client';
import { nowIso } from '@/utils/date';
import { newId } from '@/utils/id';

/**
 * Bản sao trên máy của các liên kết "mình chia sẻ đi" (máy ông bà) + nhật ký đồng ý `family_sharing`.
 * Máy chủ là nơi quyết định quyền xem; bản sao này để xem khi mất mạng và làm bằng chứng đồng ý trên máy.
 */

export interface LocalSharingPermissions {
  canViewMedications: boolean;
  canViewDoses: boolean;
  canReceiveAlerts: boolean;
}

export interface OutgoingLink {
  id: string;
  profileId: string;
  remoteId: string | null;
  memberDisplayName: string;
  permissions: LocalSharingPermissions;
  status: 'pending' | 'active' | 'revoked';
  consentedAt: string | null;
  revokedAt: string | null;
}

interface OutgoingLinkRow {
  id: string;
  profileId: string;
  remoteId: string | null;
  memberDisplayName: string;
  canViewMedications: number;
  canViewDoses: number;
  canReceiveAlerts: number;
  status: 'pending' | 'active' | 'revoked';
  consentedAt: string | null;
  revokedAt: string | null;
}

function mapRow(row: OutgoingLinkRow): OutgoingLink {
  return {
    id: row.id,
    profileId: row.profileId,
    remoteId: row.remoteId,
    memberDisplayName: row.memberDisplayName,
    permissions: {
      canViewMedications: toBool(row.canViewMedications),
      canViewDoses: toBool(row.canViewDoses),
      canReceiveAlerts: toBool(row.canReceiveAlerts),
    },
    status: row.status,
    consentedAt: row.consentedAt,
    revokedAt: row.revokedAt,
  };
}

export async function listOutgoingLinks(db: SQLiteDatabase): Promise<OutgoingLink[]> {
  const rows = await db.getAllAsync<OutgoingLinkRow>(
    `SELECT id, profile_id AS profileId, remote_id AS remoteId, member_display_name AS memberDisplayName,
            can_view_medications AS canViewMedications, can_view_doses AS canViewDoses,
            can_receive_alerts AS canReceiveAlerts, status, consented_at AS consentedAt, revoked_at AS revokedAt
     FROM family_links
     WHERE direction = 'outgoing' AND deleted_at IS NULL
     ORDER BY created_at DESC`,
    [],
  );
  return rows.map(mapRow);
}

export interface RecordSharingInput {
  profileId: string;
  remoteLinkId: string;
  caregiverName: string;
  permissions: LocalSharingPermissions;
  documentVersion: string;
}

/** Ông bà vừa đồng ý trên máy: ghi nhật ký đồng ý + bản sao liên kết (một transaction). */
export async function recordSharingConsent(db: SQLiteDatabase, input: RecordSharingInput): Promise<void> {
  const stamp = nowIso();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO consents (id, consent_type, document_version, profile_id, granted_at, created_at)
       VALUES (?, 'family_sharing', ?, ?, ?, ?)`,
      [newId(), input.documentVersion, input.profileId, stamp, stamp],
    );
    const existing = await db.getFirstAsync<{ id: string }>(
      "SELECT id FROM family_links WHERE remote_id = ? AND direction = 'outgoing'",
      [input.remoteLinkId],
    );
    const values = [
      input.caregiverName || '—',
      fromBool(input.permissions.canViewMedications),
      fromBool(input.permissions.canViewDoses),
      fromBool(input.permissions.canReceiveAlerts),
    ];
    if (existing) {
      await db.runAsync(
        `UPDATE family_links SET member_display_name = ?, can_view_medications = ?, can_view_doses = ?,
           can_receive_alerts = ?, status = 'active', consented_at = ?, revoked_at = NULL, deleted_at = NULL,
           synced_at = ?, updated_at = ?
         WHERE id = ?`,
        [...values, stamp, stamp, stamp, existing.id],
      );
    } else {
      await db.runAsync(
        `INSERT INTO family_links (
           id, profile_id, direction, member_display_name, can_view_medications, can_view_doses,
           can_receive_alerts, status, consented_at, remote_id, synced_at, created_at, updated_at
         ) VALUES (?, ?, 'outgoing', ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?)`,
        [newId(), input.profileId, ...values, stamp, input.remoteLinkId, stamp, stamp, stamp],
      );
    }
  });
}

/** Cập nhật bản sao theo dữ liệu máy chủ (đổi quyền / thu hồi / đã xóa). */
export async function updateOutgoingLink(
  db: SQLiteDatabase,
  remoteLinkId: string,
  change: { permissions?: LocalSharingPermissions; status?: 'active' | 'revoked'; revokedAt?: string | null; deleted?: boolean },
): Promise<void> {
  const stamp = nowIso();
  if (change.deleted) {
    await db.runAsync("UPDATE family_links SET deleted_at = ?, updated_at = ? WHERE remote_id = ? AND direction = 'outgoing'", [
      stamp,
      stamp,
      remoteLinkId,
    ]);
    return;
  }
  if (change.permissions) {
    await db.runAsync(
      `UPDATE family_links SET can_view_medications = ?, can_view_doses = ?, can_receive_alerts = ?, synced_at = ?, updated_at = ?
       WHERE remote_id = ? AND direction = 'outgoing'`,
      [
        fromBool(change.permissions.canViewMedications),
        fromBool(change.permissions.canViewDoses),
        fromBool(change.permissions.canReceiveAlerts),
        stamp,
        stamp,
        remoteLinkId,
      ],
    );
  }
  if (change.status) {
    await db.runAsync(
      `UPDATE family_links SET status = ?, revoked_at = ?, synced_at = ?, updated_at = ?
       WHERE remote_id = ? AND direction = 'outgoing'`,
      [change.status, change.status === 'revoked' ? (change.revokedAt ?? stamp) : null, stamp, stamp, remoteLinkId],
    );
  }
}

export interface RemoteOutgoingLink {
  id: string;
  status: 'pending' | 'active' | 'revoked';
  permissions: LocalSharingPermissions;
  caregiverName: string;
  revokedAt: string;
}

/**
 * Làm khớp bản sao trên máy với danh sách máy chủ vừa trả về (màn hình "Ai đang theo dõi tôi"):
 * liên kết không còn trên máy chủ (con cháu đã ngừng theo dõi) → đánh dấu đã xóa; còn lại → cập nhật quyền / trạng thái.
 * Liên kết máy chủ có mà máy chưa có thì KHÔNG tự thêm (máy chỉ lưu những gì chính ông bà đã đồng ý trên máy này).
 */
export async function syncOutgoingLinks(db: SQLiteDatabase, remote: RemoteOutgoingLink[]): Promise<void> {
  const stamp = nowIso();
  const byId = new Map(remote.map((link) => [link.id, link]));
  await db.withTransactionAsync(async () => {
    const local = await db.getAllAsync<{ id: string; remoteId: string | null }>(
      "SELECT id, remote_id AS remoteId FROM family_links WHERE direction = 'outgoing' AND deleted_at IS NULL",
      [],
    );
    for (const row of local) {
      const match = row.remoteId ? byId.get(row.remoteId) : undefined;
      if (!match) {
        if (row.remoteId) {
          await db.runAsync('UPDATE family_links SET deleted_at = ?, updated_at = ? WHERE id = ?', [stamp, stamp, row.id]);
        }
        continue;
      }
      await db.runAsync(
        `UPDATE family_links SET member_display_name = ?, can_view_medications = ?, can_view_doses = ?,
           can_receive_alerts = ?, status = ?, revoked_at = ?, synced_at = ?, updated_at = ?
         WHERE id = ?`,
        [
          match.caregiverName || '—',
          fromBool(match.permissions.canViewMedications),
          fromBool(match.permissions.canViewDoses),
          fromBool(match.permissions.canReceiveAlerts),
          match.status,
          match.status === 'revoked' ? match.revokedAt || stamp : null,
          stamp,
          stamp,
          row.id,
        ],
      );
    }
  });
}
