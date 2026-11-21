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
  };
}

export type FamilyApi = ReturnType<typeof createFamilyApi>;
