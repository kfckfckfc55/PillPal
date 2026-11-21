/**
 * Gọi máy chủ gia đình (PocketBase) bằng fetch — không dùng SDK ngoài.
 * Chỉ gửi đúng dữ liệu cần cho từng thao tác; không bao giờ ghi token / số điện thoại ra log.
 */

export type BackendErrorCode =
  | 'invalid_phone'
  | 'sms_unavailable'
  | 'too_many_requests'
  | 'consent_required'
  | 'invalid_code'
  | 'code_expired'
  | 'too_many_attempts'
  | 'invalid_pairing'
  | 'no_permission'
  | 'invalid_profile'
  | 'invalid_device'
  | 'unauthorized'
  | 'not_found'
  | 'network'
  | 'timeout'
  | 'server_error';

const KNOWN_CODES: ReadonlySet<string> = new Set<BackendErrorCode>([
  'invalid_phone',
  'sms_unavailable',
  'too_many_requests',
  'consent_required',
  'invalid_code',
  'code_expired',
  'too_many_attempts',
  'invalid_pairing',
  'no_permission',
  'invalid_profile',
  'invalid_device',
]);

export class BackendError extends Error {
  readonly status: number;
  readonly code: BackendErrorCode;
  /** Số giây cần chờ (khi bị giới hạn gửi mã). */
  readonly retryAfter: number | null;
  /** Số lần nhập mã còn lại. */
  readonly attemptsLeft: number | null;

  constructor(
    status: number,
    code: BackendErrorCode,
    message: string,
    extra: { retryAfter?: number | null; attemptsLeft?: number | null } = {},
  ) {
    super(message);
    this.name = 'BackendError';
    this.status = status;
    this.code = code;
    this.retryAfter = extra.retryAfter ?? null;
    this.attemptsLeft = extra.attemptsLeft ?? null;
  }
}

export interface CaregiverRecord {
  id: string;
  phone: string;
  displayName: string;
  consentVersion: string;
  consentedAt: string;
}

export interface CaregiverAuth {
  token: string;
  caregiver: CaregiverRecord;
}

export interface OtpSent {
  /** Mã hết hạn sau (giây). */
  expiresIn: number;
  /** Được gửi lại sau (giây). */
  resendIn: number;
}

type Json = Record<string, unknown>;

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function mapCaregiver(record: Json): CaregiverRecord {
  return {
    id: asString(record.id),
    phone: asString(record.phone),
    displayName: asString(record.display_name),
    consentVersion: asString(record.consent_version),
    consentedAt: asString(record.consented_at),
  };
}

function mapAuth(json: Json): CaregiverAuth {
  const token = asString(json.token);
  const record = (json.record ?? {}) as Json;
  if (!token || !asString(record.id)) {
    throw new BackendError(500, 'server_error', 'Phản hồi đăng nhập không hợp lệ');
  }
  return { token, caregiver: mapCaregiver(record) };
}

function errorFromResponse(status: number, json: Json | null): BackendError {
  const code = asString(json?.code);
  const message = asString(json?.message) || `HTTP ${status}`;
  const extra = { retryAfter: asNumber(json?.retryAfter), attemptsLeft: asNumber(json?.attemptsLeft) };
  if (KNOWN_CODES.has(code)) return new BackendError(status, code as BackendErrorCode, message, extra);
  if (status === 401 || status === 403) return new BackendError(status, 'unauthorized', message);
  if (status === 404) return new BackendError(status, 'not_found', message);
  if (status === 429) return new BackendError(status, 'too_many_requests', message, extra);
  return new BackendError(status, 'server_error', message);
}

export interface PairingCode {
  /** Mã 6 số để đọc / nhập tay. */
  code: string;
  /** Chuỗi trong mã QR. */
  token: string;
  /** ISO */
  expiresAt: string;
  expiresIn: number;
}

export interface PairingPreview {
  caregiverName: string;
  caregiverPhoneMasked: string;
}

/** Mã ghép: quét QR (token) hoặc nhập 6 số (code). */
export type PairingTarget = { token: string } | { code: string };

export interface SharingPermissions {
  canViewMedications: boolean;
  canViewDoses: boolean;
  canReceiveAlerts: boolean;
}

/** Khóa + mật khẩu do máy ông bà tự sinh để đăng nhập (lưu trong Keychain / Keystore). */
export interface DeviceCredentials {
  deviceKey: string;
  password: string;
  deviceName: string;
}

export interface DeviceAuth {
  token: string;
  deviceId: string;
}

export interface PairingResult extends DeviceAuth {
  profileId: string;
  linkId: string;
  caregiverName: string;
  caregiverPhoneMasked: string;
}

export interface FamilyLinkRecord {
  id: string;
  profileId: string;
  caregiverId: string;
  status: 'pending' | 'active' | 'revoked';
  permissions: SharingPermissions;
  caregiverName: string;
  caregiverPhoneMasked: string;
  profileName: string;
  consentedAt: string;
  revokedAt: string;
}

function mapLink(record: Json): FamilyLinkRecord {
  const status = asString(record.status);
  return {
    id: asString(record.id),
    profileId: asString(record.profile),
    caregiverId: asString(record.caregiver),
    status: status === 'active' || status === 'revoked' ? status : 'pending',
    permissions: {
      canViewMedications: record.can_view_medications === true,
      canViewDoses: record.can_view_doses === true,
      canReceiveAlerts: record.can_receive_alerts === true,
    },
    caregiverName: asString(record.caregiver_name),
    caregiverPhoneMasked: asString(record.caregiver_phone_masked),
    profileName: asString(record.profile_name),
    consentedAt: asString(record.consented_at),
    revokedAt: asString(record.revoked_at),
  };
}

function mapDeviceAuth(json: Json): DeviceAuth {
  const token = asString(json.token);
  const record = (json.record ?? {}) as Json;
  if (!token || !asString(record.id)) {
    throw new BackendError(500, 'server_error', 'Phản hồi đăng nhập máy không hợp lệ');
  }
  return { token, deviceId: asString(record.id) };
}

export interface FamilyApiOptions {
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

export function createFamilyApi(baseUrl: string, options: FamilyApiOptions = {}) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? 10_000;

  async function request(method: string, path: string, body?: Json, token?: string): Promise<Json | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let response: Response;
    try {
      response = await fetchImpl(`${baseUrl}${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: token } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
    } catch (error) {
      if (controller.signal.aborted) throw new BackendError(0, 'timeout', 'Hết thời gian chờ máy chủ');
      throw new BackendError(0, 'network', error instanceof Error ? error.message : 'Lỗi mạng');
    } finally {
      clearTimeout(timer);
    }
    const text = await response.text();
    let json: Json | null = null;
    if (text) {
      try {
        json = JSON.parse(text) as Json;
      } catch {
        json = null;
      }
    }
    if (!response.ok) throw errorFromResponse(response.status, json);
    return json;
  }

  return {
    /** Yêu cầu gửi mã OTP 6 số tới số điện thoại (đã chuẩn hóa). */
    async requestOtp(phone: string): Promise<OtpSent> {
      const json = (await request('POST', '/api/keben/otp/request', { phone })) ?? {};
      return { expiresIn: asNumber(json.expiresIn) ?? 300, resendIn: asNumber(json.resendIn) ?? 60 };
    },

    /** Xác nhận mã → phiên đăng nhập. Gửi kèm phiên bản văn bản người dùng đã đồng ý. */
    async verifyOtp(phone: string, code: string, consentVersion: string): Promise<CaregiverAuth> {
      const json = await request('POST', '/api/keben/otp/verify', {
        phone,
        code,
        consent_version: consentVersion,
      });
      return mapAuth(json ?? {});
    },

    /** Gia hạn phiên (token mới); phiên hết hạn / tài khoản đã xóa → BackendError 'unauthorized' | 'not_found'. */
    async refresh(token: string): Promise<CaregiverAuth> {
      const json = await request('POST', '/api/collections/caregivers/auth-refresh', undefined, token);
      return mapAuth(json ?? {});
    },

    async updateDisplayName(token: string, caregiverId: string, displayName: string): Promise<CaregiverRecord> {
      const json = await request(
        'PATCH',
        `/api/collections/caregivers/records/${encodeURIComponent(caregiverId)}`,
        { display_name: displayName.trim() },
        token,
      );
      return mapCaregiver(json ?? {});
    },

    /** Xóa tài khoản trên máy chủ (kéo theo mọi liên kết theo dõi). */
    async deleteAccount(token: string, caregiverId: string): Promise<void> {
      await request('DELETE', `/api/collections/caregivers/records/${encodeURIComponent(caregiverId)}`, undefined, token);
    },

    // ----- Ghép máy (Milestone 2.5C) -----

    /** Con cháu tạo mã ghép dùng một lần (QR + 6 số, hết hạn 10 phút). */
    async createPairing(caregiverToken: string): Promise<PairingCode> {
      const json = (await request('POST', '/api/keben/pairing/create', undefined, caregiverToken)) ?? {};
      return {
        code: asString(json.code),
        token: asString(json.token),
        expiresAt: asString(json.expiresAt),
        expiresIn: asNumber(json.expiresIn) ?? 600,
      };
    },

    /** Máy ông bà xem trước ai muốn theo dõi (không tiêu mã). */
    async previewPairing(target: PairingTarget): Promise<PairingPreview> {
      const json = (await request('POST', '/api/keben/pairing/preview', { ...target })) ?? {};
      return { caregiverName: asString(json.caregiverName), caregiverPhoneMasked: asString(json.caregiverPhoneMasked) };
    },

    /**
     * Ông bà đồng ý → hoàn tất ghép máy. Máy đã có tài khoản thì gửi `deviceToken`,
     * máy mới thì gửi `credentials` (máy chủ tạo tài khoản máy bằng khóa + mật khẩu này).
     */
    async completePairing(input: {
      target: PairingTarget;
      consentVersion: string;
      permissions: SharingPermissions;
      profile: { localId: string; displayName: string };
      deviceToken: string | null;
      credentials: DeviceCredentials | null;
    }): Promise<PairingResult> {
      const json =
        (await request(
          'POST',
          '/api/keben/pairing/complete',
          {
            ...input.target,
            consent_version: input.consentVersion,
            permissions: {
              can_view_medications: input.permissions.canViewMedications,
              can_view_doses: input.permissions.canViewDoses,
              can_receive_alerts: input.permissions.canReceiveAlerts,
            },
            profile: { local_id: input.profile.localId, display_name: input.profile.displayName },
            ...(input.credentials
              ? {
                  device: {
                    device_key: input.credentials.deviceKey,
                    password: input.credentials.password,
                    device_name: input.credentials.deviceName,
                  },
                }
              : {}),
          },
          input.deviceToken ?? undefined,
        )) ?? {};
      const auth = mapDeviceAuth(json);
      const meta = (json.meta ?? {}) as Json;
      return {
        ...auth,
        profileId: asString(meta.profileId),
        linkId: asString(meta.linkId),
        caregiverName: asString(meta.caregiverName),
        caregiverPhoneMasked: asString(meta.caregiverPhoneMasked),
      };
    },

    /** Máy ông bà đăng nhập lại bằng khóa + mật khẩu đã lưu. */
    async deviceLogin(credentials: DeviceCredentials): Promise<DeviceAuth> {
      const json = await request('POST', '/api/collections/devices/auth-with-password', {
        identity: credentials.deviceKey,
        password: credentials.password,
      });
      return mapDeviceAuth(json ?? {});
    },

    async refreshDevice(deviceToken: string): Promise<DeviceAuth> {
      const json = await request('POST', '/api/collections/devices/auth-refresh', undefined, deviceToken);
      return mapDeviceAuth(json ?? {});
    },

    /** Liên kết gia đình mà tài khoản này được xem (con cháu: của mình; máy ông bà: ai đang theo dõi). */
    async listLinks(token: string): Promise<FamilyLinkRecord[]> {
      const json = (await request('GET', '/api/collections/family_links/records?perPage=100&sort=-created', undefined, token)) ?? {};
      const items = Array.isArray(json.items) ? (json.items as Json[]) : [];
      return items.map(mapLink);
    },

    /** Máy ông bà đổi quyền / thu hồi một liên kết. */
    async updateLink(
      deviceToken: string,
      linkId: string,
      patch: { permissions?: SharingPermissions; revoke?: boolean },
    ): Promise<FamilyLinkRecord> {
      const body: Json = {};
      if (patch.permissions) {
        body.can_view_medications = patch.permissions.canViewMedications;
        body.can_view_doses = patch.permissions.canViewDoses;
        body.can_receive_alerts = patch.permissions.canReceiveAlerts;
      }
      if (patch.revoke) {
        body.status = 'revoked';
        body.revoked_at = new Date().toISOString();
      }
      const json = await request('PATCH', `/api/collections/family_links/records/${encodeURIComponent(linkId)}`, body, deviceToken);
      return mapLink(json ?? {});
    },

    /** Xóa liên kết (con cháu ngừng theo dõi, hoặc ông bà xóa khỏi danh sách). */
    async deleteLink(token: string, linkId: string): Promise<void> {
      await request('DELETE', `/api/collections/family_links/records/${encodeURIComponent(linkId)}`, undefined, token);
    },
  };
}

export type FamilyApi = ReturnType<typeof createFamilyApi>;
