/// <reference path="../pb_data/types.d.ts" />
/**
 * Ghép máy ông bà với con cháu (Milestone 2.5C).
 *
 * 1. Con cháu (đã đăng nhập) tạo mã ghép: QR (chuỗi dài) + mã 6 số, dùng MỘT lần, hết hạn 10 phút.
 * 2. Máy ông bà quét QR / nhập 6 số → xem trước "ai muốn theo dõi" (không tiêu mã).
 * 3. Ông bà chọn từng quyền trên màn hình đồng ý chữ to → hoàn tất:
 *    tạo (hoặc dùng lại) tài khoản máy, hồ sơ chia sẻ (chỉ tên gọi), liên kết đang hoạt động — trong 1 transaction.
 * Chính ÔNG BÀ đồng ý trên máy của mình; con cháu không đồng ý thay được.
 */


routerAdd(
  "POST",
  "/api/keben/pairing/create",
  (e) => {
    const rules = require(`${__hooks}/lib/pairingRules.js`);
    const otpRules = require(`${__hooks}/lib/otpRules.js`);
    const caregiver = e.auth;
    const nowMs = Date.now();

    const recent = e.app.countRecords(
      "pairing_codes",
      $dbx.exp("caregiver = {:caregiver} AND created > {:since}", {
        caregiver: caregiver.id,
        since: otpRules.toPbDate(nowMs - 3600 * 1000),
      }),
    );
    if (recent >= rules.MAX_CODES_PER_HOUR) {
      return e.json(429, {
        code: "too_many_requests",
        message: "Bạn đã tạo quá nhiều mã ghép. Vui lòng thử lại sau.",
        retryAfter: 3600,
      });
    }

    // Mỗi người chỉ có 1 mã còn hiệu lực: mã cũ chưa dùng bị hủy.
    const open = e.app.findRecordsByFilter("pairing_codes", "caregiver = {:caregiver} && used = false", "", 50, 0, {
      caregiver: caregiver.id,
    });
    for (const old of open) {
      old.set("used", true);
      e.app.save(old);
    }

    // Mã 6 số không trùng với mã khác đang còn hiệu lực.
    let code = "";
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const candidate = $security.randomStringWithAlphabet(6, "0123456789");
      const clash = e.app.countRecords(
        "pairing_codes",
        $dbx.exp("code_hash = {:hash} AND used = FALSE AND expires_at > {:now}", {
          hash: rules.hashSecret(candidate),
          now: otpRules.toPbDate(nowMs),
        }),
      );
      if (clash === 0) {
        code = candidate;
        break;
      }
    }
    if (!code) {
      return e.json(503, { code: "server_error", message: "Không tạo được mã ghép. Vui lòng thử lại." });
    }
    const token = $security.randomStringWithAlphabet(40, "abcdefghijklmnopqrstuvwxyz0123456789");
    const expiresMs = nowMs + rules.CODE_TTL_SECONDS * 1000;

    const record = new Record(e.app.findCollectionByNameOrId("pairing_codes"), {
      caregiver: caregiver.id,
      code_hash: rules.hashSecret(code),
      token_hash: rules.hashSecret(token),
      expires_at: otpRules.toPbDate(expiresMs),
      used: false,
    });
    e.app.save(record);

    return e.json(200, {
      code: code,
      token: token,
      expiresAt: new Date(expiresMs).toISOString(),
      expiresIn: rules.CODE_TTL_SECONDS,
    });
  },
  $apis.requireAuth("caregivers"),
);

routerAdd("POST", "/api/keben/pairing/preview", (e) => {
  const rules = require(`${__hooks}/lib/pairingRules.js`);
  const body = e.requestInfo().body || {};
  const otpRules = require(`${__hooks}/lib/otpRules.js`);
  const token = rules.normalizeToken(body.token);
  const code = token ? null : rules.normalizeCode(body.code);
  if (!token && !code) {
    return e.json(400, { code: "invalid_pairing", message: "Mã ghép không hợp lệ." });
  }
  const found = e.app.findRecordsByFilter(
    "pairing_codes",
    (token ? "token_hash = {:hash}" : "code_hash = {:hash}") + " && used = false && expires_at > {:now}",
    "-created",
    1,
    0,
    { hash: rules.hashSecret(token || code), now: otpRules.toPbDate(Date.now()) },
  );
  const pairing = found[0];
  if (!pairing) {
    return e.json(404, { code: "invalid_pairing", message: "Mã ghép không đúng hoặc đã hết hạn." });
  }
  const caregiver = e.app.findRecordById("caregivers", pairing.getString("caregiver"));
  return e.json(200, {
    caregiverName: caregiver.getString("display_name"),
    caregiverPhoneMasked: rules.maskPhone(caregiver.getString("phone")),
    expiresAt: pairing.getString("expires_at"),
  });
});

routerAdd("POST", "/api/keben/pairing/complete", (e) => {
  const rules = require(`${__hooks}/lib/pairingRules.js`);
  const otpRules = require(`${__hooks}/lib/otpRules.js`);
  const body = e.requestInfo().body || {};

  if (rules.ACCEPTED_SHARING_VERSIONS.indexOf(String(body.consent_version || "")) === -1) {
    return e.json(400, { code: "consent_required", message: "Cần ông bà đồng ý với văn bản chia sẻ." });
  }
  const permissions = rules.parsePermissions(body.permissions);
  if (!permissions) {
    return e.json(400, { code: "no_permission", message: "Hãy chọn ít nhất một quyền cho người thân." });
  }
  const profileInput = rules.parseProfile(body.profile);
  if (!profileInput) {
    return e.json(400, { code: "invalid_profile", message: "Thông tin hồ sơ không hợp lệ." });
  }

  // Máy đã có tài khoản (đăng nhập bằng token của máy) hoặc máy mới (gửi khóa + mật khẩu tự sinh).
  const authDevice = e.auth && e.auth.collection().name === "devices" ? e.auth : null;
  const credentials = authDevice ? null : rules.parseDeviceCredentials(body.device);
  if (!authDevice && !credentials) {
    return e.json(400, { code: "invalid_device", message: "Thông tin máy không hợp lệ." });
  }

  const token = rules.normalizeToken(body.token);
  const code = token ? null : rules.normalizeCode(body.code);
  if (!token && !code) {
    return e.json(400, { code: "invalid_pairing", message: "Mã ghép không hợp lệ." });
  }

  let result = null;
  let failure = null;
  e.app.runInTransaction((txApp) => {
    const found = txApp.findRecordsByFilter(
      "pairing_codes",
      (token ? "token_hash = {:hash}" : "code_hash = {:hash}") + " && used = false && expires_at > {:now}",
      "-created",
      1,
      0,
      { hash: rules.hashSecret(token || code), now: otpRules.toPbDate(Date.now()) },
    );
    const pairing = found[0];
    if (!pairing) {
      failure = { status: 404, code: "invalid_pairing", message: "Mã ghép không đúng hoặc đã hết hạn." };
      return;
    }
    const caregiver = txApp.findRecordById("caregivers", pairing.getString("caregiver"));

    let device = authDevice;
    if (!device) {
      device = new Record(txApp.findCollectionByNameOrId("devices"), {
        device_key: credentials.deviceKey,
        device_name: credentials.deviceName,
      });
      device.setPassword(credentials.password);
      txApp.save(device);
    }

    let profile;
    try {
      profile = txApp.findFirstRecordByFilter("shared_profiles", "owner = {:owner} && local_id = {:local}", {
        owner: device.id,
        local: profileInput.localId,
      });
    } catch (_) {
      profile = new Record(txApp.findCollectionByNameOrId("shared_profiles"), {
        owner: device.id,
        local_id: profileInput.localId,
      });
    }
    profile.set("display_name", profileInput.displayName);
    txApp.save(profile);

    let link;
    try {
      link = txApp.findFirstRecordByFilter("family_links", "profile = {:profile} && caregiver = {:caregiver}", {
        profile: profile.id,
        caregiver: caregiver.id,
      });
    } catch (_) {
      link = new Record(txApp.findCollectionByNameOrId("family_links"), {
        profile: profile.id,
        caregiver: caregiver.id,
      });
    }
    const now = otpRules.toPbDate(Date.now());
    link.set("status", "active");
    link.set("can_view_medications", permissions.can_view_medications);
    link.set("can_view_doses", permissions.can_view_doses);
    link.set("can_receive_alerts", permissions.can_receive_alerts);
    link.set("consent_version", String(body.consent_version));
    link.set("consented_at", now);
    link.set("revoked_at", "");
    link.set("caregiver_name", caregiver.getString("display_name"));
    link.set("caregiver_phone_masked", rules.maskPhone(caregiver.getString("phone")));
    link.set("profile_name", profileInput.displayName);
    txApp.save(link); // hook family_links tính lại danh sách người được xem

    pairing.set("used", true);
    txApp.save(pairing);

    result = {
      device: device,
      meta: {
        profileId: profile.id,
        linkId: link.id,
        caregiverName: caregiver.getString("display_name"),
        caregiverPhoneMasked: rules.maskPhone(caregiver.getString("phone")),
      },
    };
  });

  if (failure) return e.json(failure.status, { code: failure.code, message: failure.message });
  return $apis.recordAuthResponse(e, result.device, "pairing", result.meta);
});

// Dọn mã ghép cũ hơn 1 ngày.
cronAdd("keben_pairing_cleanup", "23 * * * *", () => {
  const otpRules = require(`${__hooks}/lib/otpRules.js`);
  const old = $app.findRecordsByFilter("pairing_codes", "created < {:before}", "", 1000, 0, {
    before: otpRules.toPbDate(Date.now() - 24 * 3600 * 1000),
  });
  for (const record of old) $app.delete(record);
});
