/// <reference path="../pb_data/types.d.ts" />
/**
 * Không trả danh sách người được xem qua API (chỉ dùng nội bộ cho luật truy cập):
 * con cháu không biết những ai khác đang theo dõi ông bà. Superuser (bảng quản trị) vẫn thấy.
 */
onRecordEnrich((e) => {
  if (!e.requestInfo || !e.requestInfo.hasSuperuserAuth()) {
    e.record.hide("members", "medication_viewers", "dose_viewers", "alert_receivers");
  }
  e.next();
}, "shared_profiles");
