#!/usr/bin/env node
/**
 * Kiểm tra đăng nhập con cháu bằng số điện thoại + OTP trên máy chủ đang chạy (DỮ LIỆU GIẢ).
 *
 * Máy chủ phải chạy với:
 *   KEBEN_TEST_PHONES=0900000011,0900000012,0900000013,0900000014,0900000015
 *   KEBEN_TEST_OTP=123456
 * Rồi:
 *   PB_SUPERUSER_EMAIL=... PB_SUPERUSER_PASSWORD=... node tests/otp.test.mjs
 */
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';

const BASE = (process.env.PB_URL ?? 'http://127.0.0.1:8090').replace(/\/$/, '');
const EMAIL = process.env.PB_SUPERUSER_EMAIL;
const PASSWORD = process.env.PB_SUPERUSER_PASSWORD;
const CODE = process.env.KEBEN_TEST_OTP ?? '123456';
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

const expectError = (result, status, code, label) => {
  assert.equal(result.status, status, `${label}: HTTP ${result.status} ${JSON.stringify(result.json)}`);
  assert.equal(result.json?.code, code, `${label}: code ${JSON.stringify(result.json)}`);
};
const ok = (result, label) => {
  assert.ok(result.status >= 200 && result.status < 300, `${label}: HTTP ${result.status} ${JSON.stringify(result.json)}`);
  return result.json;
};

let step = 0;
const pass = (message) => console.log(`✓ ${String(++step).padStart(2, '0')} ${message}`);
const request = (phone) => api('POST', '/api/keben/otp/request', { body: { phone } });
const verify = (phone, code, consent = CONSENT) =>
  api('POST', '/api/keben/otp/verify', { body: { phone, code, consent_version: consent } });

async function main() {
  const admin = ok(
    await api('POST', '/api/collections/_superusers/auth-with-password', { body: { identity: EMAIL, password: PASSWORD } }),
    'superuser login',
  ).token;
  const createdCaregivers = [];

  try {
    // Dọn tài khoản thử còn sót của lần chạy trước.
    for (const phone of ['0900000011', '0900000012', '0900000013', '0900000014', '0900000015']) {
      const found = ok(
        await api('GET', `/api/collections/caregivers/records?filter=${encodeURIComponent(`phone = "${phone}"`)}`, { token: admin }),
        'cleanup lookup',
      );
      for (const item of found.items) await api('DELETE', `/api/collections/caregivers/records/${item.id}`, { token: admin });
    }

    expectError(await request('12345'), 400, 'invalid_phone', 'invalid phone');
    expectError(await request('0912345678'), 400, 'sms_unavailable', 'real number');
    pass('số sai định dạng bị từ chối; số thật (không thuộc danh sách thử nghiệm) không được gửi mã');

    const sent = ok(await request('+84 900 000 011'), 'request');
    assert.deepEqual([sent.expiresIn, sent.resendIn], [300, 60]);
    const again = await request('0900000011');
    expectError(again, 429, 'too_many_requests', 'resend');
    assert.ok(again.json.retryAfter > 50 && again.json.retryAfter <= 60);
    pass(`gửi mã (hết hạn 5 phút); gửi lại ngay → chặn, chờ ${again.json.retryAfter} giây`);

    expectError(await verify('0900000011', CODE, ''), 400, 'consent_required', 'no consent');
    const wrong = await verify('0900000011', '000000');
    expectError(wrong, 400, 'invalid_code', 'wrong code');
    assert.equal(wrong.json.attemptsLeft, 4);
    pass('thiếu đồng ý → từ chối; sai mã → còn 4 lần');

    const auth = ok(await verify('0900000011', CODE), 'verify');
    assert.ok(auth.token);
    assert.equal(auth.record.phone, '0900000011');
    assert.equal(auth.record.consent_version, CONSENT);
    assert.ok(auth.record.consented_at);
    createdCaregivers.push(auth.record.id);
    expectError(await verify('0900000011', CODE), 400, 'code_expired', 'reuse code');
    pass('đúng mã → tạo tài khoản + phiên đăng nhập, ghi phiên bản đồng ý; dùng lại mã cũ → hết hiệu lực');

    const me = ok(await api('GET', `/api/collections/caregivers/records/${auth.record.id}`, { token: auth.token }), 'me');
    assert.equal(me.phone, '0900000011');
    const refreshed = ok(await api('POST', '/api/collections/caregivers/auth-refresh', { token: auth.token }), 'refresh');
    assert.ok(refreshed.token);
    ok(
      await api('PATCH', `/api/collections/caregivers/records/${auth.record.id}`, {
        token: refreshed.token,
        body: { display_name: 'Con trai (thử)' },
      }),
      'rename',
    );
    assert.ok(
      (await api('PATCH', `/api/collections/caregivers/records/${auth.record.id}`, { token: refreshed.token, body: { phone: '0900000099' } })).status >= 400,
    );
    assert.ok(
      (await api('PATCH', `/api/collections/caregivers/records/${auth.record.id}`, { token: refreshed.token, body: { consent_version: 'x' } })).status >= 400,
    );
    pass('phiên dùng được, gia hạn được; tự đổi tên được, KHÔNG tự đổi số điện thoại / dấu vết đồng ý');

    assert.ok((await api('GET', '/api/collections/otp_requests/records')).status >= 400 || (await api('GET', '/api/collections/otp_requests/records')).json.items?.length === 0);
    const asCaregiver = await api('GET', '/api/collections/otp_requests/records', { token: auth.token });
    assert.ok(asCaregiver.status >= 400 || asCaregiver.json.items.length === 0, 'không ai đọc được mã OTP qua API');
    const others = ok(await api('GET', '/api/collections/caregivers/records', { token: auth.token }), 'list caregivers');
    assert.deepEqual(others.items.map((item) => item.id), [auth.record.id], 'chỉ thấy tài khoản của mình');
    pass('không ai đọc được bảng mã OTP qua API; con cháu chỉ thấy tài khoản của chính mình');

    ok(await request('0900000012'), 'request 2');
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      const result = await verify('0900000012', '111111');
      expectError(result, 400, 'invalid_code', `wrong ${attempt}`);
    }
    expectError(await verify('0900000012', CODE), 400, 'code_expired', 'after lock');
    pass('sai 5 lần → mã bị khóa, nhập đúng cũng không vào được (phải xin mã mới)');

    ok(await request('0900000013'), 'request 3');
    const pending = ok(
      await api('GET', `/api/collections/otp_requests/records?filter=${encodeURIComponent('phone = "0900000013"')}`, { token: admin }),
      'find otp',
    ).items[0];
    ok(
      await api('PATCH', `/api/collections/otp_requests/records/${pending.id}`, {
        token: admin,
        body: { expires_at: '2020-01-01 00:00:00.000Z' },
      }),
      'expire otp',
    );
    expectError(await verify('0900000013', CODE), 400, 'code_expired', 'expired');
    pass('mã quá 5 phút → hết hạn');

    const password = randomBytes(12).toString('hex');
    const existing = ok(
      await api('POST', '/api/collections/caregivers/records', {
        token: admin,
        body: { phone: '0900000015', password, passwordConfirm: password },
      }),
      'existing caregiver',
    );
    createdCaregivers.push(existing.id);
    ok(await request('0900000015'), 'request 5');
    const login = ok(await verify('0900000015', CODE), 'verify existing');
    assert.equal(login.record.id, existing.id, 'đăng nhập lại → đúng tài khoản cũ');
    pass('số đã có tài khoản → đăng nhập vào đúng tài khoản đó');

    ok(await api('DELETE', `/api/collections/caregivers/records/${auth.record.id}`, { token: refreshed.token }), 'delete self');
    createdCaregivers.splice(createdCaregivers.indexOf(auth.record.id), 1);
    assert.ok((await api('POST', '/api/collections/caregivers/auth-refresh', { token: refreshed.token })).status >= 400);
    pass('tự xóa tài khoản → phiên đăng nhập hết hiệu lực');

    console.log('\nĐĂNG NHẬP OTP HOẠT ĐỘNG ĐÚNG');
  } finally {
    for (const id of createdCaregivers) await api('DELETE', `/api/collections/caregivers/records/${id}`, { token: admin });
  }
}

main().catch((error) => {
  console.error('✗', error.message ?? error);
  process.exit(1);
});
