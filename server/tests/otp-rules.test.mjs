#!/usr/bin/env node
/** Kiểm tra quy tắc OTP thuần (pb_hooks/lib/otpRules.js) — không cần máy chủ: node tests/otp-rules.test.mjs */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const rules = require('../pb_hooks/lib/otpRules.js');

const NOW = Date.UTC(2026, 10, 21, 10, 0, 0);
const minutes = (n) => n * 60 * 1000;

// Chuẩn hóa số điện thoại Việt Nam
assert.equal(rules.normalizePhone('0912 345 678'), '0912345678');
assert.equal(rules.normalizePhone('+84 912-345-678'), '0912345678');
assert.equal(rules.normalizePhone('84912345678'), '0912345678');
assert.equal(rules.normalizePhone('0212345678'), null, 'đầu số cố định / không phải di động');
assert.equal(rules.normalizePhone('091234567'), null);
assert.equal(rules.normalizePhone(undefined), null);
assert.equal(rules.maskPhone('0912345678'), '0912***678');
assert.deepEqual(rules.parseTestPhones(' 0900000001, +84900000002 ,abc'), ['0900000001', '0900000002']);
console.log('✓ chuẩn hóa / che số điện thoại, đọc danh sách số thử nghiệm');

// Giới hạn gửi mã
assert.deepEqual(rules.decideSend([], NOW), { ok: true, retryAfter: 0 });
assert.deepEqual(rules.decideSend([NOW - 20_000], NOW), { ok: false, retryAfter: 40 }, 'gửi lại sau 60 giây');
const fiveInHour = [10, 20, 30, 40, 50].map((m) => NOW - minutes(m));
assert.deepEqual(rules.decideSend(fiveInHour, NOW), { ok: false, retryAfter: 600 }, 'tối đa 5 mã / giờ');
const tenInDay = Array.from({ length: 10 }, (_, i) => NOW - minutes(70 + i * 60));
assert.equal(rules.decideSend(tenInDay, NOW).ok, false, 'tối đa 10 mã / ngày');
assert.equal(rules.decideSend([NOW - minutes(25 * 60)], NOW).ok, true, 'quá 24 giờ thì không tính');
console.log('✓ giới hạn: gửi lại sau 60 giây, ≤ 5 mã / giờ, ≤ 10 mã / ngày');

// Định dạng ngày của PocketBase
const pb = rules.toPbDate(NOW);
assert.equal(pb, '2026-11-21 10:00:00.000Z');
assert.equal(rules.parsePbDate(pb), NOW);
console.log('✓ chuyển đổi định dạng ngày PocketBase');

console.log('\nQUY TẮC OTP ĐỀU ĐÚNG');
