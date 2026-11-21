/**
 * Quy tắc OTP thuần (không dùng API PocketBase) — để kiểm thử được bằng Node: tests/otp-rules.test.mjs.
 */
const CODE_TTL_SECONDS = 5 * 60;
const RESEND_AFTER_SECONDS = 60;
const MAX_CODES_PER_HOUR = 5;
const MAX_CODES_PER_DAY = 10;
const MAX_ATTEMPTS = 5;
/** Phiên bản văn bản đồng ý (tài khoản người thân) mà máy chủ chấp nhận. */
const ACCEPTED_CONSENT_VERSIONS = ["2026-11.1"];

/** "+84 912 345 678", "84912345678", "0912.345.678" → "0912345678"; không hợp lệ → null. */
function normalizePhone(input) {
  let digits = String(input == null ? "" : input).replace(/[^\d+]/g, "");
  if (digits.startsWith("+84")) digits = "0" + digits.slice(3);
  else if (digits.startsWith("84") && digits.length === 11) digits = "0" + digits.slice(2);
  digits = digits.replace(/\D/g, "");
  return /^0[35789][0-9]{8}$/.test(digits) ? digits : null;
}

/** "0912345678" → "0912***678" (dùng khi ghi log). */
function maskPhone(phone) {
  return phone.length === 10 ? phone.slice(0, 4) + "***" + phone.slice(7) : "***";
}

/** Danh sách số thử nghiệm từ biến môi trường "0900000001,0900000002". */
function parseTestPhones(value) {
  return String(value == null ? "" : value)
    .split(",")
    .map((item) => normalizePhone(item))
    .filter((item) => item !== null);
}

/**
 * Có được gửi mã mới không? `sentAtMs`: thời điểm (ms) các mã đã gửi cho số này trong 24 giờ qua.
 * @returns {{ ok: boolean, retryAfter: number }} retryAfter = số giây cần chờ.
 */
function decideSend(sentAtMs, nowMs) {
  const day = sentAtMs.filter((t) => nowMs - t < 24 * 3600 * 1000).sort((a, b) => a - b);
  const hour = day.filter((t) => nowMs - t < 3600 * 1000);
  const last = day[day.length - 1];
  if (last !== undefined && nowMs - last < RESEND_AFTER_SECONDS * 1000) {
    return { ok: false, retryAfter: Math.ceil((RESEND_AFTER_SECONDS * 1000 - (nowMs - last)) / 1000) };
  }
  if (hour.length >= MAX_CODES_PER_HOUR) {
    return { ok: false, retryAfter: Math.ceil((3600 * 1000 - (nowMs - hour[0])) / 1000) };
  }
  if (day.length >= MAX_CODES_PER_DAY) {
    return { ok: false, retryAfter: Math.ceil((24 * 3600 * 1000 - (nowMs - day[0])) / 1000) };
  }
  return { ok: true, retryAfter: 0 };
}

/** "2026-11-21 11:13:13.068Z" (định dạng ngày của PocketBase) → ms. */
function parsePbDate(value) {
  const ms = Date.parse(String(value).replace(" ", "T"));
  return Number.isNaN(ms) ? 0 : ms;
}

/** ms → định dạng ngày của PocketBase (so sánh chuỗi được). */
function toPbDate(ms) {
  return new Date(ms).toISOString().replace("T", " ");
}

module.exports = {
  CODE_TTL_SECONDS,
  RESEND_AFTER_SECONDS,
  MAX_CODES_PER_HOUR,
  MAX_CODES_PER_DAY,
  MAX_ATTEMPTS,
  ACCEPTED_CONSENT_VERSIONS,
  normalizePhone,
  maskPhone,
  parseTestPhones,
  decideSend,
  parsePbDate,
  toPbDate,
};
