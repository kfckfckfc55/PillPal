/// <reference path="../pb_data/types.d.ts" />
/**
 * Đăng nhập con cháu bằng số điện thoại + OTP 6 số (Milestone 2.5B).
 *
 * Chế độ hiện tại: THỬ NGHIỆM — chưa gửi SMS thật (nhà cung cấp SMS chọn ở Milestone 5).
 * Chỉ các số trong biến môi trường KEBEN_TEST_PHONES được nhận mã:
 *   KEBEN_TEST_PHONES=0900000001,0900000002   (số giả)
 *   KEBEN_TEST_OTP=123456                      (mã giả cố định; bỏ trống → mã ngẫu nhiên in ra Terminal)
 *
 * Lỗi trả về dạng { code, message } với HTTP 400 / 429 để app hiển thị tiếng Việt.
 */

routerAdd("POST", "/api/keben/otp/request", (e) => {
  const rules = require(`${__hooks}/lib/otpRules.js`);
  const body = e.requestInfo().body || {};
  const phone = rules.normalizePhone(body.phone);
  if (!phone) {
    return e.json(400, { code: "invalid_phone", message: "Số điện thoại không hợp lệ." });
  }

  const testPhones = rules.parseTestPhones($os.getenv("KEBEN_TEST_PHONES"));
  if (testPhones.indexOf(phone) === -1) {
    // Chưa có nhà cung cấp SMS: không gửi mã cho số thật.
    return e.json(400, {
      code: "sms_unavailable",
      message: "Máy chủ thử nghiệm chỉ nhận số điện thoại thử nghiệm.",
    });
  }

  const nowMs = Date.now();
  const recent = e.app.findRecordsByFilter(
    "otp_requests",
    "phone = {:phone} && created > {:since}",
    "-created",
    50,
    0,
    { phone: phone, since: rules.toPbDate(nowMs - 24 * 3600 * 1000) },
  );
  const decision = rules.decideSend(
    recent.map((record) => rules.parsePbDate(record.getString("created"))),
    nowMs,
  );
  if (!decision.ok) {
    return e.json(429, {
      code: "too_many_requests",
      message: "Bạn đã yêu cầu mã quá nhiều lần. Vui lòng thử lại sau.",
      retryAfter: decision.retryAfter,
    });
  }

  // Mã cũ chưa dùng hết hiệu lực ngay khi có mã mới.
  for (const old of recent) {
    if (!old.getBool("consumed")) {
      old.set("consumed", true);
      e.app.save(old);
    }
  }

  const fixed = String($os.getenv("KEBEN_TEST_OTP") || "");
  const code = /^[0-9]{6}$/.test(fixed) ? fixed : $security.randomStringWithAlphabet(6, "0123456789");
  const salt = $security.randomString(24);
  const record = new Record(e.app.findCollectionByNameOrId("otp_requests"), {
    phone: phone,
    code_hash: $security.sha256(salt + ":" + phone + ":" + code),
    salt: salt,
    expires_at: rules.toPbDate(nowMs + rules.CODE_TTL_SECONDS * 1000),
    attempts: 0,
    consumed: false,
  });
  e.app.save(record);

  if (fixed !== code) {
    // Chỉ dùng khi phát triển: in mã ra cửa sổ Terminal của máy chủ (số thử nghiệm, không phải số thật).
    console.log("[keben-otp] Mã thử nghiệm cho " + rules.maskPhone(phone) + ": " + code);
  }

  return e.json(200, {
    ok: true,
    expiresIn: rules.CODE_TTL_SECONDS,
    resendIn: rules.RESEND_AFTER_SECONDS,
  });
});

routerAdd("POST", "/api/keben/otp/verify", (e) => {
  const rules = require(`${__hooks}/lib/otpRules.js`);
  const body = e.requestInfo().body || {};
  const phone = rules.normalizePhone(body.phone);
  const code = String(body.code == null ? "" : body.code).replace(/\s/g, "");
  const consentVersion = String(body.consent_version == null ? "" : body.consent_version);

  if (!phone) {
    return e.json(400, { code: "invalid_phone", message: "Số điện thoại không hợp lệ." });
  }
  if (rules.ACCEPTED_CONSENT_VERSIONS.indexOf(consentVersion) === -1) {
    return e.json(400, { code: "consent_required", message: "Cần đồng ý với thông báo xử lý dữ liệu." });
  }
  if (!/^[0-9]{6}$/.test(code)) {
    return e.json(400, { code: "invalid_code", message: "Mã xác nhận gồm 6 chữ số." });
  }

  const active = e.app.findRecordsByFilter(
    "otp_requests",
    "phone = {:phone} && consumed = false",
    "-created",
    1,
    0,
    { phone: phone },
  );
  const request = active[0];
  if (!request) {
    return e.json(400, { code: "code_expired", message: "Mã đã hết hạn. Hãy yêu cầu mã mới." });
  }
  if (rules.parsePbDate(request.getString("expires_at")) < Date.now()) {
    request.set("consumed", true);
    e.app.save(request);
    return e.json(400, { code: "code_expired", message: "Mã đã hết hạn. Hãy yêu cầu mã mới." });
  }
  if (request.getInt("attempts") >= rules.MAX_ATTEMPTS) {
    request.set("consumed", true);
    e.app.save(request);
    return e.json(429, {
      code: "too_many_attempts",
      message: "Nhập sai quá nhiều lần. Hãy yêu cầu mã mới.",
    });
  }

  const hash = $security.sha256(request.getString("salt") + ":" + phone + ":" + code);
  if (!$security.equal(hash, request.getString("code_hash"))) {
    const attempts = request.getInt("attempts") + 1;
    request.set("attempts", attempts);
    if (attempts >= rules.MAX_ATTEMPTS) request.set("consumed", true);
    e.app.save(request);
    return e.json(400, {
      code: "invalid_code",
      message: "Mã xác nhận không đúng.",
      attemptsLeft: Math.max(0, rules.MAX_ATTEMPTS - attempts),
    });
  }

  request.set("consumed", true);
  e.app.save(request);

  let caregiver;
  try {
    caregiver = e.app.findFirstRecordByData("caregivers", "phone", phone);
  } catch (_) {
    caregiver = new Record(e.app.findCollectionByNameOrId("caregivers"), { phone: phone });
    caregiver.setRandomPassword(); // không dùng mật khẩu — chỉ để thỏa yêu cầu của tài khoản
  }
  // Ghi lại dấu vết đồng ý (phiên bản văn bản + thời điểm) mỗi lần đăng nhập với văn bản mới.
  if (caregiver.getString("consent_version") !== consentVersion) {
    caregiver.set("consent_version", consentVersion);
    caregiver.set("consented_at", rules.toPbDate(Date.now()));
  }
  e.app.save(caregiver);

  return $apis.recordAuthResponse(e, caregiver, "otp");
});

// Dọn mã OTP cũ hơn 24 giờ (tối thiểu hóa dữ liệu).
cronAdd("keben_otp_cleanup", "17 * * * *", () => {
  const rules = require(`${__hooks}/lib/otpRules.js`);
  const old = $app.findRecordsByFilter(
    "otp_requests",
    "created < {:before}",
    "",
    1000,
    0,
    { before: rules.toPbDate(Date.now() - 24 * 3600 * 1000) },
  );
  for (const record of old) {
    $app.delete(record);
  }
});
