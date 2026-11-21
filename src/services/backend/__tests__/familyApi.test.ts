import { describe, expect, it } from '@jest/globals';

import { parseCaregiverSession } from '../caregiverSession';
import { describeBackendError } from '../errorMessages';
import { BackendError, createFamilyApi } from '../familyApi';
import { maskPhone, normalizeVietnamPhone } from '../phone';

type Call = { url: string; init: RequestInit };

function fakeFetch(status: number, body: unknown, calls: Call[] = []): typeof fetch {
  return (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return {
      ok: status >= 200 && status < 300,
      status,
      text: async () => (body === undefined ? '' : JSON.stringify(body)),
    } as Response;
  }) as unknown as typeof fetch;
}

const RECORD = {
  id: 'abc123',
  phone: '0900000011',
  display_name: '',
  consent_version: '2026-11.1',
  consented_at: '2026-11-21 10:00:00.000Z',
};

describe('số điện thoại', () => {
  it('chuẩn hóa và che số', () => {
    expect(normalizeVietnamPhone('+84 912-345-678')).toBe('0912345678');
    expect(normalizeVietnamPhone('0912 345 678')).toBe('0912345678');
    expect(normalizeVietnamPhone('0212345678')).toBeNull();
    expect(normalizeVietnamPhone('')).toBeNull();
    expect(maskPhone('0912345678')).toBe('0912 *** 678');
  });
});

describe('gọi máy chủ gia đình', () => {
  it('yêu cầu mã: đúng đường dẫn, chỉ gửi số điện thoại', async () => {
    const calls: Call[] = [];
    const api = createFamilyApi('http://pc:8090', { fetchImpl: fakeFetch(200, { ok: true, expiresIn: 300, resendIn: 60 }, calls) });
    await expect(api.requestOtp('0900000011')).resolves.toEqual({ expiresIn: 300, resendIn: 60 });
    expect(calls[0]?.url).toBe('http://pc:8090/api/keben/otp/request');
    expect(JSON.parse(String(calls[0]?.init.body))).toEqual({ phone: '0900000011' });
  });

  it('xác nhận mã → phiên đăng nhập (gửi kèm phiên bản đồng ý)', async () => {
    const calls: Call[] = [];
    const api = createFamilyApi('http://pc:8090', { fetchImpl: fakeFetch(200, { token: 't0k', record: RECORD }, calls) });
    const auth = await api.verifyOtp('0900000011', '123456', '2026-11.1');
    expect(auth).toEqual({
      token: 't0k',
      caregiver: { id: 'abc123', phone: '0900000011', displayName: '', consentVersion: '2026-11.1', consentedAt: RECORD.consented_at },
    });
    expect(JSON.parse(String(calls[0]?.init.body))).toEqual({ phone: '0900000011', code: '123456', consent_version: '2026-11.1' });
  });

  it('gia hạn phiên gửi token trong header Authorization', async () => {
    const calls: Call[] = [];
    const api = createFamilyApi('http://pc:8090', { fetchImpl: fakeFetch(200, { token: 'new', record: RECORD }, calls) });
    await api.refresh('old-token');
    expect(calls[0]?.url).toBe('http://pc:8090/api/collections/caregivers/auth-refresh');
    expect((calls[0]?.init.headers as Record<string, string>).Authorization).toBe('old-token');
  });

  it('lỗi có mã riêng → BackendError đúng mã, kèm số giây chờ / lần thử còn lại', async () => {
    const limited = createFamilyApi('http://pc', {
      fetchImpl: fakeFetch(429, { code: 'too_many_requests', message: 'x', retryAfter: 600 }),
    });
    await expect(limited.requestOtp('0900000011')).rejects.toMatchObject({ code: 'too_many_requests', retryAfter: 600 });

    const wrong = createFamilyApi('http://pc', { fetchImpl: fakeFetch(400, { code: 'invalid_code', message: 'x', attemptsLeft: 3 }) });
    const error = await wrong.verifyOtp('0900000011', '000000', '2026-11.1').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(BackendError);
    expect(describeBackendError(error)).toBe('Mã không đúng. Còn 3 lần thử.');
  });

  it('lỗi chung của PocketBase / mạng → mã chung, câu tiếng Việt', async () => {
    const expired = createFamilyApi('http://pc', { fetchImpl: fakeFetch(401, { status: 401, message: 'The request requires valid record authorization token.' }) });
    await expect(expired.refresh('t')).rejects.toMatchObject({ code: 'unauthorized' });

    const offline = createFamilyApi('http://pc', {
      fetchImpl: (async () => {
        throw new TypeError('Network request failed');
      }) as unknown as typeof fetch,
    });
    const error = await offline.requestOtp('0900000011').catch((e: unknown) => e);
    expect(error).toMatchObject({ code: 'network', status: 0 });
    expect(describeBackendError(error)).toMatch(/Không kết nối được máy chủ/);
    expect(describeBackendError(new Error('lạ'))).toMatch(/Máy chủ gặp lỗi/);
  });
});

describe('phiên đăng nhập đã lưu', () => {
  it('đọc phiên hợp lệ; dữ liệu hỏng → null', () => {
    const raw = JSON.stringify({ token: 't', caregiverId: 'c', phone: '0900000011', displayName: 'An', savedAt: 'x' });
    expect(parseCaregiverSession(raw)).toEqual({ token: 't', caregiverId: 'c', phone: '0900000011', displayName: 'An', savedAt: 'x' });
    expect(parseCaregiverSession('{"token":""}')).toBeNull();
    expect(parseCaregiverSession('không phải JSON')).toBeNull();
    expect(parseCaregiverSession(null)).toBeNull();
  });
});
