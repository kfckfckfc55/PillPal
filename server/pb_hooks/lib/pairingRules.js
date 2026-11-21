/**
 * Quy tắc ghép máy thuần (không dùng API PocketBase) — kiểm thử bằng Node: tests/pairing-rules.test.mjs.
 */
const CODE_TTL_SECONDS = 10 * 60;
const MAX_CODES_PER_HOUR = 10;
/** Phiên bản văn bản đồng ý chia sẻ (ông bà) mà máy chủ chấp nhận. */
const ACCEPTED_SHARING_VERSIONS = ["2026-11.1"];

/** Mã 6 số: chỉ giữ chữ số. */
function normalizeCode(value) {
  const digits = String(value == null ? "" : value).replace(/\D/g, "");
  return /^[0-9]{6}$/.test(digits) ? digits : null;
}

/** Mã trong QR: 32–64 ký tự a-z0-9. */
function normalizeToken(value) {
  const token = String(value == null ? "" : value).trim();
  return /^[a-z0-9]{32,64}$/.test(token) ? token : null;
}

/** Quyền ông bà chọn: phải là boolean, ít nhất một quyền bật. */
function parsePermissions(value) {
  const input = value && typeof value === "object" ? value : {};
  const permissions = {
    can_view_medications: input.can_view_medications === true,
    can_view_doses: input.can_view_doses === true,
    can_receive_alerts: input.can_receive_alerts === true,
  };
  const any = permissions.can_view_medications || permissions.can_view_doses || permissions.can_receive_alerts;
  return any ? permissions : null;
}

/** Thông tin hồ sơ ông bà gửi lên: id trên máy + tên gọi (bắt buộc, ≤ 50 ký tự). */
function parseProfile(value) {
  const input = value && typeof value === "object" ? value : {};
  const localId = String(input.local_id == null ? "" : input.local_id).trim();
  const name = String(input.display_name == null ? "" : input.display_name).trim();
  if (!/^[A-Za-z0-9-]{8,64}$/.test(localId) || name.length === 0 || name.length > 50) return null;
  return { localId: localId, displayName: name };
}

/** Thông tin đăng nhập máy ông bà do app tự sinh: device_key 24–64 ký tự, mật khẩu 32–72 ký tự. */
function parseDeviceCredentials(value) {
  const input = value && typeof value === "object" ? value : {};
  const key = String(input.device_key == null ? "" : input.device_key);
  const password = String(input.password == null ? "" : input.password);
  const name = String(input.device_name == null ? "" : input.device_name).trim().slice(0, 50);
  if (!/^[A-Za-z0-9]{24,64}$/.test(key) || password.length < 32 || password.length > 72) return null;
  return { deviceKey: key, password: password, deviceName: name };
}

/** Băm mã ghép / token trước khi lưu & tra cứu (dùng $security của PocketBase khi chạy trong hook). */
function hashSecret(value) {
  return $security.sha256("keben-pairing:" + value);
}

/** "0912345678" → "0912***678" */
function maskPhone(phone) {
  return phone && phone.length === 10 ? phone.slice(0, 4) + "***" + phone.slice(7) : "";
}

module.exports = {
  CODE_TTL_SECONDS,
  MAX_CODES_PER_HOUR,
  ACCEPTED_SHARING_VERSIONS,
  normalizeCode,
  normalizeToken,
  parsePermissions,
  parseProfile,
  parseDeviceCredentials,
  maskPhone,
  hashSecret,
};
