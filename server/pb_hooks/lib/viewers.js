/**
 * Tính lại danh sách người được xem của một hồ sơ từ các liên kết gia đình ĐANG HOẠT ĐỘNG.
 * Dùng trong hook (mỗi handler chạy trong môi trường riêng → nạp bằng require(`${__hooks}/lib/viewers.js`)).
 */
module.exports = {
  syncProfileViewers: (app, profileId) => {
    if (!profileId) return;
    let profile;
    try {
      profile = app.findRecordById("shared_profiles", profileId);
    } catch (_) {
      return; // hồ sơ đã bị xóa (xóa dây chuyền)
    }
    const links = app.findRecordsByFilter(
      "family_links",
      "profile = {:profile} && status = 'active'",
      "",
      0,
      0,
      { profile: profileId },
    );
    const caregiversWhere = (flag) =>
      links.filter((link) => (flag ? link.getBool(flag) : true)).map((link) => link.getString("caregiver"));

    profile.set("members", caregiversWhere(null));
    profile.set("medication_viewers", caregiversWhere("can_view_medications"));
    profile.set("dose_viewers", caregiversWhere("can_view_doses"));
    profile.set("alert_receivers", caregiversWhere("can_receive_alerts"));
    app.save(profile);
  },
};
