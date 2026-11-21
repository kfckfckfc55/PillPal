#!/usr/bin/env node
/**
 * Kiểm tra luật truy cập của máy chủ gia đình Kề Bên (chỉ dùng DỮ LIỆU GIẢ).
 *
 * Cách chạy (máy chủ đang chạy ở máy tính này):
 *   PB_SUPERUSER_EMAIL=... PB_SUPERUSER_PASSWORD=... node tests/rules.test.mjs
 * Tùy chọn: PB_URL (mặc định http://127.0.0.1:8090).
 *
 * Script tạo 2 "máy ông bà" + 2 "con cháu" giả, thử từng quyền, rồi xóa sạch dữ liệu thử.
 * Cần Node 22+ (có sẵn fetch).
 */
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';

const BASE = (process.env.PB_URL ?? 'http://127.0.0.1:8090').replace(/\/$/, '');
const EMAIL = process.env.PB_SUPERUSER_EMAIL;
const PASSWORD = process.env.PB_SUPERUSER_PASSWORD;
if (!EMAIL || !PASSWORD) {
  console.error('Thiếu PB_SUPERUSER_EMAIL / PB_SUPERUSER_PASSWORD.');
  process.exit(2);
}

const random = (bytes = 12) => randomBytes(bytes).toString('hex');

async function api(method, path, { token, body } = {}) {
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: token } : {}),
    },
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
const denied = (result, label) => {
  assert.ok(result.status >= 400, `${label}: lẽ ra bị từ chối nhưng HTTP ${result.status}`);
};
const listIds = async (collection, token, filter = '') => {
  const query = filter ? `?filter=${encodeURIComponent(filter)}` : '';
  const result = ok(await api('GET', `/api/collections/${collection}/records${query}`, { token }), `list ${collection}`);
  return result.items.map((item) => item.id);
};

let step = 0;
const pass = (message) => console.log(`✓ ${String(++step).padStart(2, '0')} ${message}`);

async function main() {
  const health = ok(await api('GET', '/api/health'), 'health');
  pass(`máy chủ phản hồi: ${health.message}`);

  const admin = ok(
    await api('POST', '/api/collections/_superusers/auth-with-password', { body: { identity: EMAIL, password: PASSWORD } }),
    'superuser login',
  ).token;

  const created = { devices: [], caregivers: [] };
  const makeAccount = async (collection, data) => {
    const password = random(16);
    const record = ok(
      await api('POST', `/api/collections/${collection}/records`, {
        token: admin,
        body: { ...data, password, passwordConfirm: password },
      }),
      `create ${collection}`,
    );
    created[collection].push(record.id);
    const token = ok(
      await api('POST', `/api/collections/${collection}/impersonate/${record.id}`, { token: admin, body: { duration: 600 } }),
      `impersonate ${collection}`,
    ).token;
    return { id: record.id, token };
  };

  try {
    // ---- Khách (chưa đăng nhập) ----
    denied(await api('POST', '/api/collections/caregivers/records', { body: { phone: '0900000099', password: 'x'.repeat(10), passwordConfirm: 'x'.repeat(10) } }), 'guest signup');
    denied(await api('GET', '/api/collections/users/records'), 'users collection');
    assert.equal((await listIds('shared_profiles', undefined)).length, 0);
    pass('khách: không tự đăng ký được, không có collection "users", không đọc được hồ sơ');

    const grandpa = await makeAccount('devices', { device_key: random(16), device_name: 'Máy ông (thử)' });
    const grandma = await makeAccount('devices', { device_key: random(16), device_name: 'Máy bà (thử)' });
    const son = await makeAccount('caregivers', { phone: '0900000001', display_name: 'Con trai (thử)' });
    const niece = await makeAccount('caregivers', { phone: '0900000002', display_name: 'Cháu (thử)' });
    pass('tạo 2 máy ông bà + 2 con cháu giả (bằng quyền superuser)');

    // ---- Máy ông bà ghi dữ liệu của mình ----
    denied(
      await api('POST', '/api/collections/shared_profiles/records', {
        token: grandma.token,
        body: { owner: grandpa.id, local_id: random(), display_name: 'Giả mạo' },
      }),
      'device writes other owner',
    );
    denied(
      await api('POST', '/api/collections/shared_profiles/records', {
        token: son.token,
        body: { owner: grandpa.id, local_id: random(), display_name: 'Con tạo hộ' },
      }),
      'caregiver creates profile',
    );
    // Tự gán người xem: PocketBase bỏ qua trường ẩn do client gửi (và luật cũng chặn nếu trường bị bỏ ẩn).
    const sneaky = await api('POST', '/api/collections/shared_profiles/records', {
      token: grandpa.token,
      body: { owner: grandpa.id, local_id: random(), display_name: 'Ông', members: [son.id], medication_viewers: [son.id] },
    });
    if (sneaky.status < 300) {
      const stored = ok(await api('GET', `/api/collections/shared_profiles/records/${sneaky.json.id}`, { token: admin }), 'check sneaky');
      assert.deepEqual([stored.members, stored.medication_viewers], [[], []], 'người xem phải rỗng');
      assert.deepEqual(await listIds('shared_profiles', son.token), [], 'con không được thấy');
      ok(await api('DELETE', `/api/collections/shared_profiles/records/${sneaky.json.id}`, { token: grandpa.token }), 'cleanup sneaky');
    }
    const profile = ok(
      await api('POST', '/api/collections/shared_profiles/records', {
        token: grandpa.token,
        body: { owner: grandpa.id, local_id: random(), display_name: 'Ông Bình' },
      }),
      'device creates profile',
    );
    pass('chỉ máy ông tạo được hồ sơ của ông; tự gán người xem bị bỏ qua; con cháu / máy khác không tạo hộ');

    const now = new Date().toISOString();
    const medication = ok(
      await api('POST', '/api/collections/medications/records', {
        token: grandpa.token,
        body: {
          profile: profile.id,
          local_id: random(),
          name: 'Thuốc A (thử)',
          dose_amount: 1,
          dose_unit: 'viên',
          meal_relation: 'after_meal',
          schedule_summary: 'Sau ăn sáng 30 phút',
          is_active: true,
          device_updated_at: now,
        },
      }),
      'device creates medication',
    );
    const dose = ok(
      await api('POST', '/api/collections/dose_events/records', {
        token: grandpa.token,
        body: {
          profile: profile.id,
          medication: medication.id,
          local_id: random(),
          scheduled_at: now,
          status: 'pending',
          device_updated_at: now,
        },
      }),
      'device creates dose',
    );
    denied(
      await api('POST', '/api/collections/medications/records', {
        token: grandma.token,
        body: { profile: profile.id, local_id: random(), name: 'Chen vào', device_updated_at: now },
      }),
      'other device writes medication',
    );
    pass('máy ông ghi thuốc + cữ; máy bà không ghi được vào hồ sơ của ông');

    // ---- Chưa có liên kết → con cháu không thấy gì ----
    assert.deepEqual(await listIds('shared_profiles', son.token), []);
    assert.deepEqual(await listIds('medications', son.token), []);
    assert.deepEqual(await listIds('dose_events', son.token), []);
    denied(await api('GET', `/api/collections/medications/records/${medication.id}`, { token: son.token }), 'view without link');
    denied(
      await api('POST', '/api/collections/family_links/records', {
        token: son.token,
        body: { profile: profile.id, caregiver: son.id, status: 'active', can_view_medications: true },
      }),
      'caregiver creates own link',
    );
    pass('chưa được ông đồng ý → con không thấy hồ sơ / thuốc / cữ và không tự tạo liên kết được');

    // ---- Ông đồng ý cho con xem thuốc (chưa cho xem cữ) ----
    const link = ok(
      await api('POST', '/api/collections/family_links/records', {
        token: admin, // bước 2.5C: route ghép máy tạo liên kết sau khi ông đồng ý trên máy ông
        body: {
          profile: profile.id,
          caregiver: son.id,
          status: 'active',
          can_view_medications: true,
          can_view_doses: false,
          can_receive_alerts: false,
          consent_version: '2026-11.1',
          consented_at: now,
        },
      }),
      'create link',
    );
    assert.deepEqual(await listIds('shared_profiles', son.token), [profile.id]);
    assert.deepEqual(await listIds('medications', son.token), [medication.id]);
    assert.deepEqual(await listIds('dose_events', son.token), [], 'chưa có quyền xem cữ');
    assert.deepEqual(await listIds('medications', niece.token), [], 'cháu chưa được chia sẻ');
    const profileForSon = ok(await api('GET', `/api/collections/shared_profiles/records/${profile.id}`, { token: son.token }), 'view profile');
    assert.equal(profileForSon.members, undefined, 'danh sách người xem không lộ qua API');
    pass('ông cho xem thuốc → con thấy hồ sơ + thuốc, CHƯA thấy cữ; cháu không thấy gì; danh sách người xem bị ẩn');

    // Máy ông cũng không tự sửa danh sách người xem (chỉ hook phía máy chủ sửa).
    await api('PATCH', `/api/collections/shared_profiles/records/${profile.id}`, {
      token: grandpa.token,
      body: { dose_viewers: [son.id, niece.id] },
    });
    assert.deepEqual(await listIds('dose_events', niece.token), [], 'cháu vẫn không thấy cữ');
    assert.deepEqual(await listIds('dose_events', son.token), [], 'con vẫn chưa có quyền xem cữ');

    // ---- Con chỉ đọc ----
    denied(
      await api('PATCH', `/api/collections/medications/records/${medication.id}`, { token: son.token, body: { name: 'Sửa' } }),
      'caregiver edits medication',
    );
    denied(
      await api('PATCH', `/api/collections/family_links/records/${link.id}`, { token: son.token, body: { can_view_doses: true } }),
      'caregiver grants itself',
    );
    denied(await api('DELETE', `/api/collections/dose_events/records/${dose.id}`, { token: son.token }), 'caregiver deletes dose');
    pass('con chỉ đọc: không sửa thuốc, không tự cấp thêm quyền, không xóa cữ');

    // ---- Ông bật thêm quyền xem cữ ----
    ok(
      await api('PATCH', `/api/collections/family_links/records/${link.id}`, { token: grandpa.token, body: { can_view_doses: true } }),
      'grant doses',
    );
    assert.deepEqual(await listIds('dose_events', son.token), [dose.id]);
    ok(
      await api('PATCH', `/api/collections/dose_events/records/${dose.id}`, {
        token: grandpa.token,
        body: { status: 'taken', taken_at: now, device_updated_at: now },
      }),
      'device marks taken',
    );
    const seen = ok(await api('GET', `/api/collections/dose_events/records/${dose.id}`, { token: son.token }), 'son views dose');
    assert.equal(seen.status, 'taken');
    pass('ông bật quyền xem cữ → con thấy cữ; ông bấm "Đã uống" → con thấy "taken"');

    // ---- Ông thu hồi → mất quyền ngay ----
    ok(
      await api('PATCH', `/api/collections/family_links/records/${link.id}`, {
        token: grandpa.token,
        body: { status: 'revoked', revoked_at: new Date().toISOString() },
      }),
      'revoke',
    );
    assert.deepEqual(await listIds('shared_profiles', son.token), []);
    assert.deepEqual(await listIds('medications', son.token), []);
    assert.deepEqual(await listIds('dose_events', son.token), []);
    const linkForSon = ok(await api('GET', `/api/collections/family_links/records/${link.id}`, { token: son.token }), 'son sees link');
    assert.equal(linkForSon.status, 'revoked');
    pass('ông thu hồi → con mất quyền xem ngay (vẫn thấy liên kết của mình ở trạng thái "revoked")');

    // ---- Con tự ngừng theo dõi / xóa tài khoản ----
    ok(
      await api('PATCH', `/api/collections/family_links/records/${link.id}`, { token: grandpa.token, body: { status: 'active' } }),
      're-activate',
    );
    assert.deepEqual(await listIds('medications', son.token), [medication.id]);
    ok(await api('DELETE', `/api/collections/caregivers/records/${son.id}`, { token: son.token }), 'son deletes account');
    created.caregivers = created.caregivers.filter((id) => id !== son.id);
    const linksLeft = ok(await api('GET', `/api/collections/family_links/records?filter=${encodeURIComponent(`profile = "${profile.id}"`)}`, { token: grandpa.token }), 'links after delete');
    assert.equal(linksLeft.items.length, 0, 'xóa tài khoản → xóa luôn liên kết');
    pass('con xóa tài khoản → liên kết bị xóa theo; ông vẫn giữ dữ liệu của mình');

    // ---- Hồi quy (2.5C): hồ sơ KHÔNG còn người theo dõi → khách vẫn không đọc được ----
    // (PocketBase: `members.id ?= @request.auth.id` đúng với danh sách rỗng khi khách có id rỗng.)
    for (const collection of ['shared_profiles', 'medications', 'dose_events']) {
      assert.equal((await listIds(collection, undefined)).length, 0, `khách đọc được ${collection}`);
    }
    denied(await api('GET', `/api/collections/shared_profiles/records/${profile.id}`), 'guest view orphan profile');
    denied(await api('GET', `/api/collections/medications/records/${medication.id}`), 'guest view orphan medication');
    pass('hồ sơ không còn ai theo dõi → khách vẫn không thấy hồ sơ / thuốc / cữ');

    // ---- Máy ông xóa tài khoản → xóa sạch dữ liệu của ông trên máy chủ ----
    ok(await api('DELETE', `/api/collections/devices/records/${grandpa.id}`, { token: grandpa.token }), 'device deletes account');
    created.devices = created.devices.filter((id) => id !== grandpa.id);
    for (const collection of ['shared_profiles', 'medications', 'dose_events']) {
      const all = ok(await api('GET', `/api/collections/${collection}/records?filter=${encodeURIComponent(`id = "${collection === 'shared_profiles' ? profile.id : collection === 'medications' ? medication.id : dose.id}"`)}`, { token: admin }), `check ${collection}`);
      assert.equal(all.items.length, 0, `${collection} phải bị xóa theo`);
    }
    pass('máy ông xóa tài khoản → hồ sơ, thuốc, cữ trên máy chủ bị xóa dây chuyền');

    console.log('\nTẤT CẢ LUẬT TRUY CẬP ĐỀU ĐÚNG');
  } finally {
    // Dọn dữ liệu thử còn lại.
    for (const [collection, ids] of Object.entries(created)) {
      for (const id of ids) await api('DELETE', `/api/collections/${collection}/records/${id}`, { token: admin });
    }
  }
}

main().catch((error) => {
  console.error('✗', error.message ?? error);
  process.exit(1);
});
