#!/usr/bin/env node
/** Kiểm tra quy tắc ghép máy thuần (pb_hooks/lib/pairingRules.js) — không cần máy chủ: node tests/pairing-rules.test.mjs */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const rules = require('../pb_hooks/lib/pairingRules.js');

assert.equal(rules.normalizeCode(' 123 456 '), '123456');
assert.equal(rules.normalizeCode('12345'), null);
assert.equal(rules.normalizeToken('a'.repeat(40)), 'a'.repeat(40));
assert.equal(rules.normalizeToken('A'.repeat(40)), null);
assert.equal(rules.normalizeToken('short'), null);
console.log('✓ mã 6 số / chuỗi QR');

assert.equal(rules.parsePermissions({}), null, 'phải chọn ít nhất 1 quyền');
assert.equal(rules.parsePermissions({ can_view_doses: 'true' }), null, 'chỉ nhận boolean thật');
assert.deepEqual(rules.parsePermissions({ can_view_doses: true }), {
  can_view_medications: false,
  can_view_doses: true,
  can_receive_alerts: false,
});
console.log('✓ quyền: ít nhất một quyền, chỉ nhận true / false');

assert.deepEqual(rules.parseProfile({ local_id: '0f8fad5b-d9cb-469f-a165-70867728950e', display_name: ' Ông Bình ' }), {
  localId: '0f8fad5b-d9cb-469f-a165-70867728950e',
  displayName: 'Ông Bình',
});
assert.equal(rules.parseProfile({ local_id: 'x', display_name: 'A' }), null);
assert.equal(rules.parseProfile({ local_id: '0f8fad5b-d9cb', display_name: '' }), null);
console.log('✓ hồ sơ: id trên máy + tên gọi');

assert.equal(rules.parseDeviceCredentials({ device_key: 'a'.repeat(32), password: 'p'.repeat(31) }), null, 'mật khẩu quá ngắn');
assert.deepEqual(rules.parseDeviceCredentials({ device_key: 'a'.repeat(32), password: 'p'.repeat(48), device_name: ' Máy ông ' }), {
  deviceKey: 'a'.repeat(32),
  password: 'p'.repeat(48),
  deviceName: 'Máy ông',
});
assert.equal(rules.maskPhone('0912345678'), '0912***678');
console.log('✓ khóa / mật khẩu máy tự sinh; che số điện thoại');

console.log('\nQUY TẮC GHÉP MÁY ĐỀU ĐÚNG');
