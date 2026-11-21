/// <reference path="../pb_data/types.d.ts" />
/**
 * Kề Bên — ghép máy ông bà bằng QR / mã 6 số (Milestone 2.5C).
 *
 * - pairing_codes: mã ghép dùng MỘT LẦN do con cháu tạo, hết hạn 10 phút. Chỉ lưu dạng băm.
 *   Không ai đọc qua API (mọi rule = null) — chỉ route phía máy chủ.
 * - family_links: thêm bản chụp tên người thân / số đã che / tên hồ sơ tại thời điểm ông bà đồng ý,
 *   để máy ông bà biết AI đang theo dõi mình (máy ông bà không đọc được tài khoản con cháu).
 */
migrate(
  (app) => {
    const caregivers = app.findCollectionByNameOrId("caregivers");
    const codes = new Collection({
      type: "base",
      name: "pairing_codes",
      listRule: null,
      viewRule: null,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        { name: "caregiver", type: "relation", collectionId: caregivers.id, required: true, maxSelect: 1, cascadeDelete: true },
        { name: "code_hash", type: "text", required: true, hidden: true },
        { name: "token_hash", type: "text", required: true, hidden: true },
        { name: "expires_at", type: "date", required: true },
        { name: "used", type: "bool" },
        { name: "created", type: "autodate", onCreate: true, onUpdate: false },
        { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
      ],
      indexes: [
        "CREATE INDEX idx_pairing_codes_code ON pairing_codes (code_hash)",
        "CREATE UNIQUE INDEX idx_pairing_codes_token ON pairing_codes (token_hash)",
        "CREATE INDEX idx_pairing_codes_caregiver ON pairing_codes (caregiver, created)",
      ],
    });
    app.save(codes);

    const links = app.findCollectionByNameOrId("family_links");
    links.fields.add(new TextField({ name: "caregiver_name", max: 50 }));
    links.fields.add(new TextField({ name: "caregiver_phone_masked", max: 16 }));
    links.fields.add(new TextField({ name: "profile_name", max: 50 }));
    // Bản chụp do máy chủ ghi lúc ghép máy — không ai sửa qua API.
    links.updateRule =
      "profile.owner = @request.auth.id && @request.body.profile:isset = false && @request.body.caregiver:isset = false && " +
      "@request.body.caregiver_name:isset = false && @request.body.caregiver_phone_masked:isset = false && " +
      "@request.body.profile_name:isset = false && @request.body.consent_version:isset = false && " +
      "@request.body.consented_at:isset = false";
    app.save(links);
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId("pairing_codes"));
    } catch (_) {
      // đã xóa
    }
    const links = app.findCollectionByNameOrId("family_links");
    for (const name of ["caregiver_name", "caregiver_phone_masked", "profile_name"]) links.fields.removeByName(name);
    links.updateRule =
      "profile.owner = @request.auth.id && @request.body.profile:isset = false && @request.body.caregiver:isset = false";
    app.save(links);
  },
);
