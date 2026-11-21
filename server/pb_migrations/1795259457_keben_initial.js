/// <reference path="../pb_data/types.d.ts" />
/**
 * Kề Bên — schema máy chủ gia đình (Milestone 2.5A). PocketBase v0.40.x.
 *
 * Nguyên tắc:
 * - Tối thiểu hóa dữ liệu: chỉ những gì con cháu cần để biết ông bà đã uống thuốc chưa
 *   (tên gọi hồ sơ, danh sách thuốc + mô tả lịch, trạng thái từng cữ). KHÔNG có ngày sinh,
 *   bệnh nền, dị ứng, triệu chứng, chỉ số, ảnh, ghi âm.
 * - Chỉ MÁY CỦA ÔNG BÀ (collection `devices`) ghi được dữ liệu của ông bà.
 * - Con cháu (collection `caregivers`) chỉ ĐỌC được hồ sơ mà ông bà đã đồng ý chia sẻ, theo từng quyền.
 *   Danh sách người được xem (members / medication_viewers / dose_viewers / alert_receivers) do hook
 *   phía máy chủ tính lại từ `family_links` — client không tự sửa được.
 * - Thu hồi quyền → hook cập nhật ngay → con cháu mất quyền xem ở lần gọi API tiếp theo.
 */

const AUTODATE_FIELDS = [
  { name: "created", type: "autodate", onCreate: true, onUpdate: false },
  { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
];

/** Các trường danh sách người được xem: client không được gửi lên (chỉ hook / superuser sửa). */
const PROTECTED_VIEWER_FIELDS = ["members", "medication_viewers", "dose_viewers", "alert_receivers"];
const noViewerFieldsInBody = PROTECTED_VIEWER_FIELDS.map((name) => `@request.body.${name}:isset = false`).join(" && ");

migrate(
  (app) => {
    // ---------- Cài đặt máy chủ ----------
    const settings = app.settings();
    settings.meta.appName = "Kề Bên (máy chủ gia đình)";
    settings.meta.hideControls = false;
    // Nhật ký: giữ ngắn ngày, không ghi IP / id tài khoản (tối thiểu hóa dữ liệu).
    settings.logs.maxDays = 3;
    settings.logs.logIP = false;
    settings.logs.logAuthId = false;
    // Chặn gọi API dồn dập (chống dò mã, spam). Mã OTP có giới hạn riêng ở bước 2.5B.
    settings.rateLimits.enabled = true;
    settings.rateLimits.rules = [
      { label: "*:auth", audience: "", duration: 60, maxRequests: 10 },
      { label: "*:create", audience: "", duration: 10, maxRequests: 30 },
      { label: "/api/keben/", audience: "", duration: 60, maxRequests: 20 },
      { label: "/api/", audience: "", duration: 10, maxRequests: 300 },
    ];
    settings.batch.enabled = false;
    app.save(settings);

    // Collection "users" mặc định cho phép tự đăng ký bằng email — Kề Bên không dùng → xóa.
    try {
      app.delete(app.findCollectionByNameOrId("users"));
    } catch (_) {
      // không có thì thôi
    }

    // ---------- Tài khoản con cháu (đăng nhập số điện thoại + OTP ở bước 2.5B) ----------
    const caregivers = new Collection({
      type: "auth",
      name: "caregivers",
      listRule: "id = @request.auth.id",
      viewRule: "id = @request.auth.id",
      createRule: null, // chỉ route OTP phía máy chủ tạo tài khoản
      updateRule: "id = @request.auth.id && @request.body.phone:isset = false",
      deleteRule: "id = @request.auth.id", // quyền xóa tài khoản
      passwordAuth: { enabled: false },
      otp: { enabled: false },
      mfa: { enabled: false },
      oauth2: { enabled: false },
      authAlert: { enabled: false },
      fields: [
        {
          name: "phone",
          type: "text",
          required: true,
          // Số di động Việt Nam 10 chữ số (03x, 05x, 07x, 08x, 09x).
          pattern: "^0[35789][0-9]{8}$",
          min: 10,
          max: 10,
        },
        { name: "display_name", type: "text", max: 50 },
        ...AUTODATE_FIELDS,
      ],
      indexes: ["CREATE UNIQUE INDEX idx_caregivers_phone ON caregivers (phone)"],
    });
    app.save(caregivers);
    // Không thu thập email.
    caregivers.fields.getByName("email").required = false;
    app.save(caregivers);

    // ---------- Tài khoản máy của ông bà (tạo khi ghép QR ở bước 2.5C, không cần số điện thoại) ----------
    const devices = new Collection({
      type: "auth",
      name: "devices",
      listRule: "id = @request.auth.id",
      viewRule: "id = @request.auth.id",
      createRule: null, // chỉ route ghép máy phía máy chủ tạo
      updateRule: "id = @request.auth.id && @request.body.device_key:isset = false",
      deleteRule: "id = @request.auth.id",
      // Máy đăng nhập bằng khóa ngẫu nhiên + mật khẩu ngẫu nhiên lưu trong Keychain / Keystore của máy.
      passwordAuth: { enabled: true, identityFields: ["device_key"] },
      otp: { enabled: false },
      mfa: { enabled: false },
      oauth2: { enabled: false },
      authAlert: { enabled: false },
      fields: [
        { name: "device_key", type: "text", required: true, min: 24, max: 64, hidden: true },
        { name: "device_name", type: "text", max: 50 },
        ...AUTODATE_FIELDS,
      ],
      indexes: ["CREATE UNIQUE INDEX idx_devices_device_key ON devices (device_key)"],
    });
    app.save(devices);
    devices.fields.getByName("email").required = false;
    app.save(devices);

    // ---------- Hồ sơ được chia sẻ (chỉ tên gọi) ----------
    // Không đặt `hidden` (luật truy cập của người dùng thường không đọc được trường ẩn).
    // Thay vào đó: luật chặn client tự ghi, và hook onRecordEnrich gỡ các trường này khỏi kết quả API.
    const viewerField = (name) => ({
      name,
      type: "relation",
      collectionId: caregivers.id,
      maxSelect: 50,
      cascadeDelete: false,
    });
    const profiles = new Collection({
      type: "base",
      name: "shared_profiles",
      listRule: "owner = @request.auth.id || members.id ?= @request.auth.id",
      viewRule: "owner = @request.auth.id || members.id ?= @request.auth.id",
      createRule: `@request.auth.collectionName = "devices" && owner = @request.auth.id && ${noViewerFieldsInBody}`,
      updateRule: `owner = @request.auth.id && @request.body.owner:isset = false && ${noViewerFieldsInBody}`,
      deleteRule: "owner = @request.auth.id",
      fields: [
        { name: "owner", type: "relation", collectionId: devices.id, required: true, maxSelect: 1, cascadeDelete: true },
        { name: "local_id", type: "text", required: true, max: 64 },
        { name: "display_name", type: "text", required: true, max: 50 },
        viewerField("members"),
        viewerField("medication_viewers"),
        viewerField("dose_viewers"),
        viewerField("alert_receivers"),
        ...AUTODATE_FIELDS,
      ],
      indexes: ["CREATE UNIQUE INDEX idx_shared_profiles_owner_local ON shared_profiles (owner, local_id)"],
    });
    app.save(profiles);

    // ---------- Liên kết gia đình = bản ghi đồng ý của ông bà (từng quyền) ----------
    const links = new Collection({
      type: "base",
      name: "family_links",
      listRule: "profile.owner = @request.auth.id || caregiver = @request.auth.id",
      viewRule: "profile.owner = @request.auth.id || caregiver = @request.auth.id",
      createRule: null, // tạo qua route ghép máy (2.5C) sau khi ông bà đồng ý trên máy của mình
      // Chỉ ông bà (máy chủ hồ sơ) đổi quyền / thu hồi.
      updateRule:
        "profile.owner = @request.auth.id && @request.body.profile:isset = false && @request.body.caregiver:isset = false",
      // Ông bà xóa liên kết, hoặc con cháu tự ngừng theo dõi.
      deleteRule: "profile.owner = @request.auth.id || caregiver = @request.auth.id",
      fields: [
        { name: "profile", type: "relation", collectionId: profiles.id, required: true, maxSelect: 1, cascadeDelete: true },
        { name: "caregiver", type: "relation", collectionId: caregivers.id, required: true, maxSelect: 1, cascadeDelete: true },
        { name: "can_view_medications", type: "bool" },
        { name: "can_view_doses", type: "bool" },
        { name: "can_receive_alerts", type: "bool" },
        { name: "status", type: "select", required: true, maxSelect: 1, values: ["pending", "active", "revoked"] },
        { name: "consent_version", type: "text", max: 32 },
        { name: "consented_at", type: "date" },
        { name: "revoked_at", type: "date" },
        ...AUTODATE_FIELDS,
      ],
      indexes: ["CREATE UNIQUE INDEX idx_family_links_pair ON family_links (profile, caregiver)"],
    });
    app.save(links);

    // ---------- Thuốc (tối thiểu) ----------
    const ownerWrite = `@request.auth.collectionName = "devices" && profile.owner = @request.auth.id`;
    const medications = new Collection({
      type: "base",
      name: "medications",
      listRule: "profile.owner = @request.auth.id || profile.medication_viewers.id ?= @request.auth.id",
      viewRule: "profile.owner = @request.auth.id || profile.medication_viewers.id ?= @request.auth.id",
      createRule: ownerWrite,
      updateRule: `${ownerWrite} && @request.body.profile:isset = false`,
      deleteRule: ownerWrite,
      fields: [
        { name: "profile", type: "relation", collectionId: profiles.id, required: true, maxSelect: 1, cascadeDelete: true },
        { name: "local_id", type: "text", required: true, max: 64 },
        { name: "name", type: "text", required: true, max: 100 },
        { name: "strength", type: "text", max: 50 },
        { name: "dose_amount", type: "number", min: 0 },
        { name: "dose_unit", type: "text", max: 20 },
        {
          name: "meal_relation",
          type: "select",
          maxSelect: 1,
          values: ["before_meal", "after_meal", "with_meal", "any"],
        },
        { name: "schedule_summary", type: "text", max: 200 },
        { name: "is_active", type: "bool" },
        { name: "track_stock", type: "bool" },
        { name: "quantity_on_hand", type: "number", min: 0 },
        { name: "low_stock", type: "bool" },
        { name: "paused_until", type: "date" },
        { name: "device_updated_at", type: "date", required: true },
        { name: "deleted", type: "bool" },
        ...AUTODATE_FIELDS,
      ],
      indexes: ["CREATE UNIQUE INDEX idx_medications_profile_local ON medications (profile, local_id)"],
    });
    app.save(medications);

    // ---------- Cữ thuốc (trạng thái) ----------
    const doses = new Collection({
      type: "base",
      name: "dose_events",
      listRule: "profile.owner = @request.auth.id || profile.dose_viewers.id ?= @request.auth.id",
      viewRule: "profile.owner = @request.auth.id || profile.dose_viewers.id ?= @request.auth.id",
      createRule: `${ownerWrite} && medication.profile = profile`,
      updateRule: `${ownerWrite} && @request.body.profile:isset = false && @request.body.medication:isset = false`,
      deleteRule: ownerWrite,
      fields: [
        { name: "profile", type: "relation", collectionId: profiles.id, required: true, maxSelect: 1, cascadeDelete: true },
        { name: "medication", type: "relation", collectionId: medications.id, required: true, maxSelect: 1, cascadeDelete: true },
        { name: "local_id", type: "text", required: true, max: 64 },
        { name: "scheduled_at", type: "date", required: true },
        {
          name: "status",
          type: "select",
          required: true,
          maxSelect: 1,
          values: ["pending", "taken", "taken_late", "snoozed", "skipped", "missed", "paused"],
        },
        { name: "taken_at", type: "date" },
        { name: "device_updated_at", type: "date", required: true },
        ...AUTODATE_FIELDS,
      ],
      indexes: [
        "CREATE UNIQUE INDEX idx_dose_events_profile_local ON dose_events (profile, local_id)",
        "CREATE INDEX idx_dose_events_profile_time ON dose_events (profile, scheduled_at)",
      ],
    });
    app.save(doses);
  },
  (app) => {
    for (const name of ["dose_events", "medications", "family_links", "shared_profiles", "devices", "caregivers"]) {
      try {
        app.delete(app.findCollectionByNameOrId(name));
      } catch (_) {
        // đã xóa
      }
    }
  },
);
