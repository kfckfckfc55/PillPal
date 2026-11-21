/// <reference path="../pb_data/types.d.ts" />
/**
 * Kề Bên — chặn khách (chưa đăng nhập) ở MỌI quy tắc truy cập (vá lỗi phát hiện ở 2.5C).
 *
 * Với PocketBase, khách có `@request.auth.id = ""`. Điều kiện "bất kỳ phần tử nào" như
 * `members.id ?= @request.auth.id` lại ĐÚNG khi danh sách rỗng (rỗng so với rỗng), nên một hồ sơ
 * không còn người thân nào theo dõi (con cháu ngừng theo dõi / xóa tài khoản) bị khách đọc được.
 * Bản vá: thêm `@request.auth.id != ""` vào đầu mọi quy tắc khác null của các collection Kề Bên.
 */
const GUARD = '@request.auth.id != "" && ';
const COLLECTIONS = ["caregivers", "devices", "shared_profiles", "family_links", "medications", "dose_events"];
const RULES = ["listRule", "viewRule", "createRule", "updateRule", "deleteRule"];

migrate(
  (app) => {
    for (const name of COLLECTIONS) {
      const collection = app.findCollectionByNameOrId(name);
      for (const rule of RULES) {
        const value = collection[rule];
        // null = chỉ máy chủ / superuser; "" = ai cũng được (Kề Bên không dùng) → giữ nguyên để không đổi nghĩa.
        if (value === null || value === undefined || value === "" || value.startsWith(GUARD)) continue;
        collection[rule] = `${GUARD}(${value})`;
      }
      app.save(collection);
    }
  },
  (app) => {
    for (const name of COLLECTIONS) {
      const collection = app.findCollectionByNameOrId(name);
      for (const rule of RULES) {
        const value = collection[rule];
        if (typeof value === "string" && value.startsWith(`${GUARD}(`) && value.endsWith(")")) {
          collection[rule] = value.slice(GUARD.length + 1, -1);
        }
      }
      app.save(collection);
    }
  },
);
