/// <reference path="../pb_data/types.d.ts" />
/**
 * Mỗi khi liên kết gia đình được tạo / đổi quyền / thu hồi / xóa → tính lại ai được xem hồ sơ.
 * (Luật truy cập của medications / dose_events dựa trên các danh sách này.)
 */

onRecordAfterCreateSuccess((e) => {
  require(`${__hooks}/lib/viewers.js`).syncProfileViewers(e.app, e.record.getString("profile"));
  e.next();
}, "family_links");

onRecordAfterUpdateSuccess((e) => {
  require(`${__hooks}/lib/viewers.js`).syncProfileViewers(e.app, e.record.getString("profile"));
  e.next();
}, "family_links");

onRecordAfterDeleteSuccess((e) => {
  require(`${__hooks}/lib/viewers.js`).syncProfileViewers(e.app, e.record.getString("profile"));
  e.next();
}, "family_links");
