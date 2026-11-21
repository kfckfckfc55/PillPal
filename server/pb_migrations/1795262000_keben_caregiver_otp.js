/// <reference path="../pb_data/types.d.ts" />
/**
 * Kề Bên — đăng nhập con cháu bằng số điện thoại + OTP (Milestone 2.5B).
 *
 * - otp_requests: mã OTP đã băm (kèm salt), hết hạn, số lần nhập sai. KHÔNG ai đọc được qua API
 *   (mọi rule = null → chỉ route phía máy chủ dùng). Cron dọn bản ghi cũ hơn 24 giờ.
 * - caregivers: thêm phiên bản văn bản đồng ý + thời điểm đồng ý; phiên đăng nhập 30 ngày (app tự gia hạn).
 */
migrate(
  (app) => {
    const otp = new Collection({
      type: "base",
      name: "otp_requests",
      listRule: null,
      viewRule: null,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        { name: "phone", type: "text", required: true, pattern: "^0[35789][0-9]{8}$", min: 10, max: 10 },
        { name: "code_hash", type: "text", required: true, hidden: true },
        { name: "salt", type: "text", required: true, hidden: true },
        { name: "expires_at", type: "date", required: true },
        { name: "attempts", type: "number", min: 0, onlyInt: true },
        { name: "consumed", type: "bool" },
        { name: "created", type: "autodate", onCreate: true, onUpdate: false },
        { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
      ],
      indexes: ["CREATE INDEX idx_otp_requests_phone_created ON otp_requests (phone, created)"],
    });
    app.save(otp);

    const caregivers = app.findCollectionByNameOrId("caregivers");
    caregivers.fields.add(new TextField({ name: "consent_version", max: 32 }));
    caregivers.fields.add(new DateField({ name: "consented_at" }));
    // Con cháu không tự sửa số điện thoại / dấu vết đồng ý (chỉ route OTP ghi).
    caregivers.updateRule =
      "id = @request.auth.id && @request.body.phone:isset = false && " +
      "@request.body.consent_version:isset = false && @request.body.consented_at:isset = false";
    caregivers.authToken.duration = 30 * 24 * 60 * 60;
    app.save(caregivers);
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId("otp_requests"));
    } catch (_) {
      // đã xóa
    }
    const caregivers = app.findCollectionByNameOrId("caregivers");
    caregivers.fields.removeByName("consent_version");
    caregivers.fields.removeByName("consented_at");
    caregivers.updateRule = "id = @request.auth.id && @request.body.phone:isset = false";
    app.save(caregivers);
  },
);
