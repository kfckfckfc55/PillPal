#!/usr/bin/env node
/**
 * Kiểm tra ghép máy ông bà ↔ con cháu bằng QR / mã 6 số trên máy chủ đang chạy (DỮ LIỆU GIẢ).
 *   PB_SUPERUSER_EMAIL=... PB_SUPERUSER_PASSWORD=... node tests/pairing.test.mjs
 * (Không cần biến KEBEN_TEST_*: tài khoản con cháu thử được tạo bằng quyền superuser.)
 */
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';

const BASE = (process.env.PB_URL ?? 'http://127.0.0.1:8090').replace(/\/$/, '');
const EMAIL = process.env.PB_SUPERUSER_EMAIL;
const PASSWORD = process.env.PB_SUPERUSER_PASSWORD;
const CONSENT = '2026-11.1';
if (!EMAIL || !PASSWORD) {
  console.error('Thiếu PB_SUPERUSER_EMAIL / PB_SUPERUSER_PASSWORD.');
  process.exit(2);
}

async function api(method, path, { token, body } = {}) {
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  return { status: response.status, json };
}
const ok = (result, label) => {
  assert.ok(result.status >= 200 && result.status < 300, `${label}: HTTP ${result.status} ${JSON.stringify(result.json)}`);
  return result.json;
};
const fails = (result, status, code, label) => {
  assert.equal(result.status, status, `${label}: HTTP ${result.status} ${JSON.stringify(result.json)}`);
  if (code) assert.equal(result.json?.code, code, `${label}: ${JSON.stringify(result.json)}`);
};
const ids = async (collection, token) =>
  ok(await api('GET', `/api/collections/${collection}/records`, { token }), `list ${collection}`).items.map((item) => item.id);

let step = 0;
const pass = (message) => console.log(`✓ ${String(++step).padStart(2, '0')} ${message}`);
const newDevice = () => ({
  device_key: randomBytes(16).toString('hex'),
  password: randomBytes(24).toString('hex'),
  device_name: 'Máy ông (thử)',
});
const ALL = { can_view_medications: true, can_view_doses: false, can_receive_alerts: true };

async function main() {
  const admin = ok(
    await api('POST', '/api/collections/_superusers/auth-with-password', { body: { identity: EMAIL, password: PASSWORD } }),
    'superuser login',
  ).token;
  const cleanup = { caregivers: [], devices: [] };
  const makeCaregiver = async (phone, name) => {
    const old = ok(await api('GET', `/api/collections/caregivers/records?filter=${encodeURIComponent(`phone = "${phone}"`)}`, { token: admin }), 'lookup');
    for (const item of old.items) await api('DELETE', `/api/collections/caregivers/records/${item.id}`, { token: admin });
    const password = randomBytes(12).toString('hex');
    const record = ok(
      await api('POST', '/api/collections/caregivers/records', {
        token: admin,
        body: { phone, display_name: name, password, passwordConfirm: password },
      }),
      'create caregiver',
    );
    cleanup.caregivers.push(record.id);
    const token = ok(await api('POST', `/api/collections/caregivers/impersonate/${record.id}`, { token: admin, body: { duration: 600 } }), 'impersonate').token;
    return { id: record.id, token };
  };

  try {
    const son = await makeCaregiver('0900000031', 'Minh An (con gái)');
    const niece = await makeCaregiver('0900000032', 'Cháu Hà');

    fails(await api('POST', '/api/keben/pairing/create'), 401, null, 'guest create');
    const pairing = ok(await api('POST', '/api/keben/pairing/create', { token: son.token }), 'create pairing');
    assert.match(pairing.code, /^\d{6}$/);
    assert.match(pairing.token, /^[a-z0-9]{40}$/);
    assert.equal(pairing.expiresIn, 600);
    pass('khách không tạo được mã; con cháu tạo mã ghép: 6 số + chuỗi QR, hết hạn 10 phút');

    const preview = ok(await api('POST', '/api/keben/pairing/preview', { body: { code: pairing.code } }), 'preview');
    assert.deepEqual([preview.caregiverName, preview.caregiverPhoneMasked], ['Minh An (con gái)', '0900***031']);
    fails(await api('POST', '/api/keben/pairing/preview', { body: { code: pairing.code === '000000' ? '111111' : '000000' } }), 404, 'invalid_pairing', 'wrong code');
    pass('máy ông bà xem trước: "Minh An (con gái) · 0900***031"; mã sai → không tìm thấy');

    const profileLocalId = randomUUID();
    const base = {
      token: pairing.token,
      consent_version: CONSENT,
      permissions: ALL,
      profile: { local_id: profileLocalId, display_name: 'Ông Bình' },
      device: newDevice(),
    };
    fails(await api('POST', '/api/keben/pairing/complete', { body: { ...base, consent_version: '' } }), 400, 'consent_required', 'no consent');
    fails(
      await api('POST', '/api/keben/pairing/complete', {
        body: { ...base, permissions: { can_view_medications: false, can_view_doses: false, can_receive_alerts: false } },
      }),
      400,
      'no_permission',
      'no permission',
    );
    pass('thiếu đồng ý / không chọn quyền nào → từ chối');

    const done = ok(await api('POST', '/api/keben/pairing/complete', { body: base }), 'complete');
    assert.ok(done.token);
    assert.equal(done.meta.caregiverName, 'Minh An (con gái)');
    cleanup.devices.push(done.record.id);
    const device = { id: done.record.id, token: done.token, credentials: base.device };
    fails(await api('POST', '/api/keben/pairing/preview', { body: { token: pairing.token } }), 404, 'invalid_pairing', 'reuse');
    pass('ông bà đồng ý → tạo tài khoản máy + hồ sơ + liên kết; mã đã dùng không dùng lại được');

    assert.deepEqual(await ids('shared_profiles', son.token), [done.meta.profileId]);
    const now = new Date().toISOString();
    const med = ok(
      await api('POST', '/api/collections/medications/records', {
        token: device.token,
        body: { profile: done.meta.profileId, local_id: randomUUID(), name: 'Thuốc A (thử)', device_updated_at: now },
      }),
      'device med',
    );
    ok(
      await api('POST', '/api/collections/dose_events/records', {
        token: device.token,
        body: { profile: done.meta.profileId, medication: med.id, local_id: randomUUID(), scheduled_at: now, status: 'pending', device_updated_at: now },
      }),
      'device dose',
    );
    assert.deepEqual(await ids('medications', son.token), [med.id]);
    assert.deepEqual(await ids('dose_events', son.token), [], 'ông chưa cho xem cữ');
    assert.deepEqual(await ids('shared_profiles', niece.token), []);
    pass('con thấy hồ sơ + thuốc (đúng quyền), CHƯA thấy cữ; người khác không thấy gì');

    const links = ok(await api('GET', '/api/collections/family_links/records', { token: device.token }), 'device links').items;
    assert.equal(links.length, 1);
    assert.deepEqual(
      [links[0].caregiver_name, links[0].caregiver_phone_masked, links[0].profile_name, links[0].status],
      ['Minh An (con gái)', '0900***031', 'Ông Bình', 'active'],
    );
    assert.ok(
      (await api('PATCH', `/api/collections/family_links/records/${links[0].id}`, { token: device.token, body: { caregiver_name: 'Đổi' } })).status >= 400,
      'không sửa bản chụp tên người thân',
    );
    pass('máy ông thấy AI đang theo dõi (tên, số đã che); không sửa được bản chụp này');

    const login = ok(
      await api('POST', '/api/collections/devices/auth-with-password', {
        body: { identity: device.credentials.device_key, password: device.credentials.password },
      }),
      'device login',
    );
    assert.equal(login.record.id, device.id);
    pass('máy ông đăng nhập lại được bằng khóa + mật khẩu tự sinh (lưu trong Keychain / Keystore)');

    const second = ok(await api('POST', '/api/keben/pairing/create', { token: niece.token }), 'niece code');
    const again = ok(
      await api('POST', '/api/keben/pairing/complete', {
        token: device.token,
        body: {
          code: second.code,
          consent_version: CONSENT,
          permissions: { can_view_medications: false, can_view_doses: true, can_receive_alerts: false },
          profile: { local_id: profileLocalId, display_name: 'Ông Bình' },
        },
      }),
      'complete existing device',
    );
    assert.equal(again.record.id, device.id, 'dùng lại tài khoản máy');
    assert.equal(again.meta.profileId, done.meta.profileId, 'dùng lại hồ sơ');
    assert.deepEqual(await ids('shared_profiles', niece.token), [done.meta.profileId]);
    assert.deepEqual(await ids('medications', niece.token), [], 'cháu chỉ được xem cữ');
    assert.equal((await ids('dose_events', niece.token)).length, 1);
    pass('máy đã ghép ghép thêm người thứ hai bằng mã 6 số → cùng tài khoản máy, cùng hồ sơ, quyền riêng');

    const old = ok(await api('POST', '/api/keben/pairing/create', { token: son.token }), 'old code');
    ok(await api('POST', '/api/keben/pairing/create', { token: son.token }), 'new code');
    fails(await api('POST', '/api/keben/pairing/preview', { body: { code: old.code } }), 404, 'invalid_pairing', 'old code');
    const expiring = ok(await api('POST', '/api/keben/pairing/create', { token: niece.token }), 'expiring');
    const stored = ok(
      await api('GET', `/api/collections/pairing_codes/records?filter=${encodeURIComponent(`caregiver = "${niece.id}" && used = false`)}`, { token: admin }),
      'find code',
    ).items[0];
    ok(await api('PATCH', `/api/collections/pairing_codes/records/${stored.id}`, { token: admin, body: { expires_at: '2020-01-01 00:00:00.000Z' } }), 'expire');
    fails(await api('POST', '/api/keben/pairing/preview', { body: { token: expiring.token } }), 404, 'invalid_pairing', 'expired');
    assert.ok((await api('GET', '/api/collections/pairing_codes/records', { token: son.token })).status >= 400);
    pass('tạo mã mới → mã cũ hết hiệu lực; mã quá 10 phút → hết hạn; không ai đọc bảng mã qua API');

    const sonLink = ok(await api('GET', '/api/collections/family_links/records', { token: son.token }), 'son links').items[0];
    ok(await api('PATCH', `/api/collections/family_links/records/${sonLink.id}`, { token: device.token, body: { status: 'revoked', revoked_at: new Date().toISOString() } }), 'revoke');
    assert.deepEqual(await ids('medications', son.token), []);
    assert.deepEqual(await ids('shared_profiles', son.token), []);
    assert.equal((await ids('dose_events', niece.token)).length, 1, 'cháu vẫn giữ quyền của mình');
    pass('ông thu hồi quyền của con → con mất quyền ngay; quyền của cháu không bị ảnh hưởng');

    console.log('\nGHÉP MÁY HOẠT ĐỘNG ĐÚNG');
  } finally {
    for (const id of cleanup.devices) await api('DELETE', `/api/collections/devices/records/${id}`, { token: admin });
    for (const id of cleanup.caregivers) await api('DELETE', `/api/collections/caregivers/records/${id}`, { token: admin });
  }
}

main().catch((error) => {
  console.error('✗', error.message ?? error);
  process.exit(1);
});
