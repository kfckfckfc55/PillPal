import { describe, expect, it } from '@jest/globals';

import { parseDeviceSession } from '../deviceSession';
import { createFamilyApi } from '../familyApi';
import { buildPairingQr, normalizePairingCode, parsePairingQr } from '../pairingPayload';

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

const TOKEN = 'abcdefghij0123456789abcdefghij0123456789';

describe('mã QR ghép máy', () => {
  it('tạo rồi đọc lại đúng chuỗi ghép; không chứa địa chỉ máy chủ hay số điện thoại', () => {
    const qr = buildPairingQr(TOKEN);
    expect(qr).toBe(`KEBEN-PAIR:1:${TOKEN}`);
    expect(qr).not.toMatch(/https?:|\/\/|@/);
    expect(parsePairingQr(`  ${qr}\n`)).toBe(TOKEN);
  });

  it('bỏ qua mã QR không phải của Kề Bên hoặc sai định dạng', () => {
    expect(parsePairingQr('https://example.com/pair?token=' + TOKEN)).toBeNull();
    expect(parsePairingQr(`KEBEN-PAIR:2:${TOKEN}`)).toBeNull();
    expect(parsePairingQr('KEBEN-PAIR:1:short')).toBeNull();
    expect(parsePairingQr(`KEBEN-PAIR:1:${TOKEN.toUpperCase()}`)).toBeNull();
    expect(parsePairingQr(`KEBEN-PAIR:1:${TOKEN}'; DROP TABLE`)).toBeNull();
  });

  it('chuẩn hóa mã 6 số người dùng gõ', () => {
    expect(normalizePairingCode('123 456')).toBe('123456');
    expect(normalizePairingCode('123-456')).toBe('123456');
    expect(normalizePairingCode('12345')).toBeNull();
    expect(normalizePairingCode('1234567')).toBeNull();
    expect(normalizePairingCode('12a456')).toBeNull();
  });
});

describe('phiên của máy ông bà', () => {
  it('đọc phiên đã lưu, từ chối dữ liệu hỏng / quá ngắn', () => {
    const valid = {
      deviceKey: 'a'.repeat(32),
      password: 'b'.repeat(48),
      deviceName: 'Máy của ông bà',
      deviceId: 'dev1',
      token: 'tok',
      savedAt: '2026-11-21T00:00:00.000Z',
    };
    expect(parseDeviceSession(JSON.stringify(valid))).toEqual(valid);
    expect(parseDeviceSession(JSON.stringify({ ...valid, deviceId: '', token: null }))).toMatchObject({
      deviceId: null,
      token: null,
    });
    expect(parseDeviceSession(null)).toBeNull();
    expect(parseDeviceSession('{không phải json')).toBeNull();
    expect(parseDeviceSession(JSON.stringify({ ...valid, deviceKey: 'ngắn' }))).toBeNull();
    expect(parseDeviceSession(JSON.stringify({ ...valid, password: 'x'.repeat(10) }))).toBeNull();
  });
});

describe('gọi máy chủ: ghép máy & liên kết', () => {
  const linkRecord = {
    id: 'link1',
    profile: 'prof1',
    caregiver: 'cg1',
    status: 'active',
    can_view_medications: true,
    can_view_doses: false,
    can_receive_alerts: true,
    caregiver_name: 'Minh',
    caregiver_phone_masked: '0900 *** 011',
    profile_name: 'Bà Lan',
    consented_at: '2026-11-21 10:00:00.000Z',
    revoked_at: '',
  };

  it('con cháu tạo mã: gửi token đăng nhập, nhận mã + chuỗi QR', async () => {
    const calls: Call[] = [];
    const api = createFamilyApi('http://pc:8090', {
      fetchImpl: fakeFetch(200, { code: '123456', token: TOKEN, expiresAt: '2026-11-21T10:10:00Z', expiresIn: 600 }, calls),
    });
    await expect(api.createPairing('cg-token')).resolves.toEqual({
      code: '123456',
      token: TOKEN,
      expiresAt: '2026-11-21T10:10:00Z',
      expiresIn: 600,
    });
    expect(calls[0]?.url).toBe('http://pc:8090/api/keben/pairing/create');
    expect((calls[0]?.init.headers as Record<string, string>).Authorization).toBe('cg-token');
  });

  it('xem trước bằng mã 6 số: không cần đăng nhập', async () => {
    const calls: Call[] = [];
    const api = createFamilyApi('http://pc', {
      fetchImpl: fakeFetch(200, { caregiverName: 'Minh', caregiverPhoneMasked: '0900 *** 011' }, calls),
    });
    await expect(api.previewPairing({ code: '123456' })).resolves.toEqual({
      caregiverName: 'Minh',
      caregiverPhoneMasked: '0900 *** 011',
    });
    expect(JSON.parse(String(calls[0]?.init.body))).toEqual({ code: '123456' });
    expect((calls[0]?.init.headers as Record<string, string>).Authorization).toBeUndefined();
  });

  it('máy mới đồng ý: gửi quyền + khóa máy, nhận phiên máy và mã liên kết', async () => {
    const calls: Call[] = [];
    const api = createFamilyApi('http://pc', {
      fetchImpl: fakeFetch(
        200,
        {
          token: 'dev-token',
          record: { id: 'dev1' },
          meta: { profileId: 'prof1', linkId: 'link1', caregiverName: 'Minh', caregiverPhoneMasked: '0900 *** 011' },
        },
        calls,
      ),
    });
    const result = await api.completePairing({
      target: { token: TOKEN },
      consentVersion: '2026-11.1',
      permissions: { canViewMedications: true, canViewDoses: false, canReceiveAlerts: false },
      profile: { localId: 'local-profile-1', displayName: 'Bà Lan' },
      deviceToken: null,
      credentials: { deviceKey: 'k'.repeat(32), password: 'p'.repeat(48), deviceName: 'Máy của ông bà' },
    });
    expect(result).toEqual({
      token: 'dev-token',
      deviceId: 'dev1',
      profileId: 'prof1',
      linkId: 'link1',
      caregiverName: 'Minh',
      caregiverPhoneMasked: '0900 *** 011',
    });
    expect(calls[0]?.url).toBe('http://pc/api/keben/pairing/complete');
    expect(JSON.parse(String(calls[0]?.init.body))).toEqual({
      token: TOKEN,
      consent_version: '2026-11.1',
      permissions: { can_view_medications: true, can_view_doses: false, can_receive_alerts: false },
      profile: { local_id: 'local-profile-1', display_name: 'Bà Lan' },
      device: { device_key: 'k'.repeat(32), password: 'p'.repeat(48), device_name: 'Máy của ông bà' },
    });
  });

  it('máy đã có tài khoản: gửi token máy, KHÔNG gửi lại khóa + mật khẩu', async () => {
    const calls: Call[] = [];
    const api = createFamilyApi('http://pc', {
      fetchImpl: fakeFetch(200, { token: 'dev-token-2', record: { id: 'dev1' }, meta: { linkId: 'link2' } }, calls),
    });
    await api.completePairing({
      target: { code: '654321' },
      consentVersion: '2026-11.1',
      permissions: { canViewMedications: false, canViewDoses: true, canReceiveAlerts: false },
      profile: { localId: 'local-profile-1', displayName: 'Bà Lan' },
      deviceToken: 'dev-token',
      credentials: null,
    });
    const body = JSON.parse(String(calls[0]?.init.body)) as Record<string, unknown>;
    expect(body.device).toBeUndefined();
    expect(body.code).toBe('654321');
    expect((calls[0]?.init.headers as Record<string, string>).Authorization).toBe('dev-token');
  });

  it('máy đăng nhập lại bằng khóa đã lưu', async () => {
    const calls: Call[] = [];
    const api = createFamilyApi('http://pc', { fetchImpl: fakeFetch(200, { token: 't', record: { id: 'dev1' } }, calls) });
    await expect(
      api.deviceLogin({ deviceKey: 'k'.repeat(32), password: 'p'.repeat(48), deviceName: 'x' }),
    ).resolves.toEqual({ token: 't', deviceId: 'dev1' });
    expect(calls[0]?.url).toBe('http://pc/api/collections/devices/auth-with-password');
    expect(JSON.parse(String(calls[0]?.init.body))).toEqual({ identity: 'k'.repeat(32), password: 'p'.repeat(48) });
  });

  it('đọc danh sách liên kết → đổi tên trường sang camelCase', async () => {
    const api = createFamilyApi('http://pc', { fetchImpl: fakeFetch(200, { items: [linkRecord, { id: 'x', status: 'lạ' }] }) });
    const [first, second] = await api.listLinks('tok');
    expect(first).toEqual({
      id: 'link1',
      profileId: 'prof1',
      caregiverId: 'cg1',
      status: 'active',
      permissions: { canViewMedications: true, canViewDoses: false, canReceiveAlerts: true },
      caregiverName: 'Minh',
      caregiverPhoneMasked: '0900 *** 011',
      profileName: 'Bà Lan',
      consentedAt: '2026-11-21 10:00:00.000Z',
      revokedAt: '',
    });
    // Trạng thái lạ → coi như "đang chờ", không bao giờ tự thành "đang theo dõi"; quyền thiếu → tắt.
    expect(second?.status).toBe('pending');
    expect(second?.permissions).toEqual({ canViewMedications: false, canViewDoses: false, canReceiveAlerts: false });
  });

  it('ông bà thu hồi: chỉ gửi trạng thái + thời điểm thu hồi', async () => {
    const calls: Call[] = [];
    const api = createFamilyApi('http://pc', {
      fetchImpl: fakeFetch(200, { ...linkRecord, status: 'revoked', revoked_at: '2026-11-21 11:00:00.000Z' }, calls),
    });
    const next = await api.updateLink('dev-token', 'link1', { revoke: true });
    expect(next.status).toBe('revoked');
    expect(calls[0]?.init.method).toBe('PATCH');
    expect(calls[0]?.url).toBe('http://pc/api/collections/family_links/records/link1');
    const body = JSON.parse(String(calls[0]?.init.body)) as Record<string, unknown>;
    expect(Object.keys(body).sort()).toEqual(['revoked_at', 'status']);
    expect(body.status).toBe('revoked');
  });

  it('đổi quyền: gửi đủ 3 quyền, mã liên kết được mã hóa trong đường dẫn', async () => {
    const calls: Call[] = [];
    const api = createFamilyApi('http://pc', { fetchImpl: fakeFetch(200, linkRecord, calls) });
    await api.updateLink('dev-token', 'a/b', {
      permissions: { canViewMedications: false, canViewDoses: true, canReceiveAlerts: false },
    });
    expect(calls[0]?.url).toBe('http://pc/api/collections/family_links/records/a%2Fb');
    expect(JSON.parse(String(calls[0]?.init.body))).toEqual({
      can_view_medications: false,
      can_view_doses: true,
      can_receive_alerts: false,
    });
  });
});
