# Bàn giao dự án Kề Bên (bối cảnh cho Claude Code trên máy cá nhân)

> Cập nhật: 21/11/2026, sau bước **2.5C** (commit `fde6168`). Trước đó dự án được làm trong một phiên Claude Code trên cloud; file này gom lại những gì đã thống nhất, các quyết định kỹ thuật và việc còn dở, để phiên Claude Code trên máy người dùng làm tiếp mà không phải hỏi lại.
>
> Toàn văn cuộc trò chuyện cũ (riêng tư, **không** nằm trong repo) có thể nằm ở `handoff-local/cuoc-tro-chuyen.md` nếu người dùng đã giải nén gói bàn giao vào thư mục dự án.

## 1. Sản phẩm & cách làm việc

- **Kề Bên** = sổ sức khỏe cá nhân + nhắc uống thuốc + hành trình đi khám cho người Việt; giao diện navy Sáng / Tối, điện thoại & tablet. Dự án **phi thương mại**, phải tuân thủ pháp luật Việt Nam (Luật Bảo vệ dữ liệu cá nhân 91/2025 …) — xem `docs/LEGAL_COMPLIANCE_VN.md`.
- Tên sản phẩm đã chốt là **Kề Bên** (`app.json`: name `Kề Bên`, slug `ke-ben`, scheme `keben`). `PillPal` chỉ là tên repo / thư mục — giữ thư mục không dấu, không khoảng trắng để Xcode / CocoaPods không lỗi. Bundle id `com.yourcompany.keben` là placeholder, người dùng sẽ cho mã riêng.
- Đặc tả đầy đủ: `docs/KEBEN_MASTER_PROMPT.md`. Làm **từng bước nhỏ**, định dạng (a)–(h), dừng chờ người dùng xác nhận.
- Người dùng mới làm quen lập trình: hướng dẫn từng lệnh một (mỗi lệnh một khối `bash`), giải thích ngắn gọn, ưu tiên làm thay họ khi có thể.

## 2. Tiến độ

| Bước | Trạng thái | Commit |
|---|---|---|
| 1A Khởi tạo Expo SDK 58, theme navy, UI kit | ✅ | `a0d8296` |
| 1B SQLite 28 bảng, migration, dữ liệu mẫu | ✅ | `673ab2b` |
| 1C Màn hình chào + đồng ý, Hôm nay, Sick-Day | ✅ | `3bb572c` |
| 2A Thuốc, lịch uống, giờ sinh hoạt, sinh cữ | ✅ | `1adeac6` |
| 2B Thao tác cữ, đếm viên, tác dụng phụ, tạm dừng, lịch sử | ✅ | `d6f96bf` |
| 2C Thông báo cục bộ, đổi múi giờ | ✅ | `19e3758` |
| 2.5A Máy chủ PocketBase + luật truy cập | ✅ | `4426eff` |
| 2.5B Con cháu đăng nhập số điện thoại + OTP | ✅ | `3129bc5` |
| 2.5C Ghép máy ông bà bằng QR / mã 6 số + đồng ý từng quyền | ✅ (chờ người dùng thử trên Xcode) | `fde6168` |
| **2.5D** Đồng bộ tối thiểu, dữ liệu màn hình Gia đình, cảnh báo trễ cữ, thu hồi | ⏳ **bước tiếp theo** — chỉ làm khi người dùng xác nhận 2.5C | |
| Milestone 3 → 6 | chưa làm | |

DoD Milestone 2 còn chờ kiểm tra trên máy thật (thông báo đúng giờ khi app tắt, nút trên thông báo).

## 3. Người dùng đang làm dở (máy Mac)

Máy Mac chip Apple, đã cài Xcode, Node, Git, GitHub Desktop; repo đã clone vào `~/Documents/PillPal`, nhánh `claude/admiring-faraday-pyzhep`. Mục tiêu trước mắt: **mở bằng Xcode và thử bước 2.5C**. Còn thiếu:

1. **PocketBase chưa tải** (`server/pocketbase` không có trong repo). Bản cho Mac M2: `pocketbase_0.40.6_darwin_arm64.zip` từ `https://github.com/pocketbase/pocketbase/releases/download/v0.40.6/…`; giải nén file `pocketbase` vào `server/`; `./pocketbase --version` → `0.40.6`. Tạo superuser: `./pocketbase superuser upsert <email> '<mật khẩu ≥ 16 ký tự>'` và `./pocketbase superuser ips 127.0.0.1 ::1`.
2. Chạy máy chủ (để Terminal mở): `KEBEN_TEST_PHONES=0900000001,0900000002 KEBEN_TEST_OTP=123456 ./pocketbase serve --http=0.0.0.0:8090` trong `server/`.
3. Tạo `.env` (từ `.env.example`): `EXPO_PUBLIC_POCKETBASE_URL=http://<IP Mac, lệnh ipconfig getifaddr en0>:8090` và `EXPO_PUBLIC_FAMILY_FEATURE=1`. Dùng IP LAN cho cả iPhone ảo lẫn iPhone thật.
4. `npm install` → `npx expo prebuild --platform ios --clean` (cần CocoaPods) → `npx expo start -c` (để chạy, **không** bấm `i`) → `open ios/*.xcworkspace` → chọn máy → ▶ Run. Không sửa tay trong `ios/` (Continuous Native Generation). Chưa cài `expo-dev-client`; bản Debug từ Xcode tự nạp JS từ Metro.
5. Thử 2.5C: iPhone ảo = con cháu (đăng nhập `0900000001` / mã `123456` → "Thêm người thân (tạo mã ghép)"), iPhone thật = ông bà (Cài đặt → Gia đình (thử nghiệm) → "Con cháu cài giúp: quét mã ghép" → quét QR trên màn hình Mac). Không có iPhone thật thì dùng 2 máy ảo + mã 6 số.

Chạy thật trên iPhone: bật Developer Mode, chọn Team (Personal Team) trong Signing & Capabilities, cho phép "mạng cục bộ". Nếu lỗi bundle id → đổi `ios.bundleIdentifier` trong `app.json` rồi prebuild lại.

## 4. Quyết định & lưu ý kỹ thuật quan trọng

### App (Expo SDK 58)
- Expo ~58.0.26, React Native 0.88, React 19.3, TypeScript ~6.0 (`types` mặc định rỗng → test import `describe/expect/it/jest` từ `@jest/globals`). expo-router 58: `Stack.Protected`, `useFocusEffect` từ `expo-router`, tab từ `expo-router/js-tabs`. Typed routes chưa sinh — `router.push` nhận chuỗi / object.
- Luôn kiểm tra API bằng kiểu trong `node_modules` hoặc docs đúng phiên bản (AGENTS.md); Expo đổi API nhiều giữa các SDK.
- SQLite: migration theo `PRAGMA user_version` — 001 (28 bảng), 002 (`routine_day_patterns/overrides`, `dose_events.slot_key` + partial unique index), 003 (`dose_events.stock_deducted`). Đổi schema **chỉ bằng migration mới**.
- Sinh cữ theo "ô": `slot_key = <ngày sinh hoạt YYYY-MM-DD>#<thứ tự>`; dời cữ pending/paused, **không đụng cữ đã thao tác**, không sinh trước `createdAt` của lịch; sinh trước 7 ngày; cữ cũ chưa xác nhận → `missed`.
- Thao tác cữ: trễ > 60 phút = `taken_late`; ≥ 120 phút mở chọn giờ + lời nhắc hỏi bác sĩ / dược sĩ (không khuyên uống bù); nhắc lại 10 / 15 phút; trừ kho không âm, hoàn tác trả đúng `stock_deducted`.
- Thông báo: chỉ cục bộ (`enableRemoteNotifications: false`), kênh Android `medication-reminders` / `appointments` / `general`, category `keben-dose` (take / snooze / skip, mở app), lên lịch cuốn chiếu ≤ 60 (59 cữ + 1 "hãy mở app"), so sánh khác biệt theo định danh. `useReminderLifecycle` ở gốc app.
- Gia đình: `familyApi` gọi PocketBase bằng `fetch` (không dùng SDK); phiên con cháu và phiên máy ông bà lưu bằng `expo-secure-store` (`AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY`); chỉ bật khi `EXPO_PUBLIC_FAMILY_FEATURE=1`.
- Máy ông bà có **tài khoản máy** (collection `devices`) với khóa 128 bit + mật khẩu 192 bit tự sinh, lưu trước khi gọi mạng; lỗi 429 / mất mạng **không** được coi là mất tài khoản (`isAuthRejected`).
- Nội dung QR: `KEBEN-PAIR:1:<token 32–64 ký tự a-z0-9>` — không chứa địa chỉ máy chủ / thông tin cá nhân.

### Máy chủ PocketBase v0.40.6 (`server/`)
- Collections: `caregivers`, `devices` (auth), `otp_requests`, `pairing_codes` (không ai đọc qua API), `shared_profiles` (chỉ tên gọi), `family_links` (bản ghi đồng ý từng quyền + bản chụp tên người thân / số đã che / tên hồ sơ), `medications`, `dose_events`. Danh sách người xem (`members`, `medication_viewers`, `dose_viewers`, `alert_receivers`) do hook `family_links.pb.js` tính lại, ẩn khỏi API bằng `onRecordEnrich`.
- **Bẫy JSVM đã gặp:** handler chạy trong runtime riêng → không dùng biến / hàm top-level, đưa vào `pb_hooks/lib/*.js` rồi `require(\`${__hooks}/lib/x.js\`)`; field `hidden` không dùng được trong rule của người thường; điều kiện "bất kỳ" với relation nhiều giá trị phải viết `field.id ?= @request.auth.id`; **`?=` đúng với danh sách rỗng khi khách có id rỗng** → mọi rule có chốt `@request.auth.id != ""` (migration `1795266000_keben_guest_guard.js`) — rule mới cũng phải có chốt này.
- Giới hạn tần suất: `*:auth` 10/60s, `*:create` 30/10s, `/api/keben/` **20/60s** mỗi IP, `/api/` 300/10s → khi chạy liên tiếp các bộ test máy chủ phải chờ ~61 giây giữa chúng.
- Test máy chủ: `node tests/rules.test.mjs` (13 tình huống), `otp-rules`, `otp` (10), `pairing-rules`, `pairing` (10) — cần biến `PB_URL`, `PB_SUPERUSER_EMAIL`, `PB_SUPERUSER_PASSWORD` và máy chủ chạy với `KEBEN_TEST_PHONES` gồm 0900000011…0900000015, `KEBEN_TEST_OTP=123456`.

### Kiểm tra
- `npm run check` = typecheck + lint + 113 unit test (jest-expo, múi giờ cố định `Asia/Ho_Chi_Minh`). `npx expo lint` không quét `server/` → chạy thêm `npx eslint server src`.
- Phiên cloud còn dùng "harness" chạy logic thật bằng Node (`tsx` + shim expo-sqlite→`node:sqlite`, expo-crypto, expo-secure-store…) — bản sao nằm trong `handoff-local/harness/` (nếu có).

## 5. Bước tiếp theo: 2.5D (chưa làm)

Theo master prompt mục 5.6 và Milestone 2.5:
- `services/sync` với interface `SyncService`; máy ông bà đẩy **tối thiểu** thuốc + lịch (dạng mô tả ngắn), trạng thái cữ, tạm dừng, sắp hết thuốc lên `medications` / `dose_events` theo `updated_at` (last-write-wins, xóa mềm); chỉ khi có liên kết đang hoạt động; offline thì xếp hàng, có mạng tự đẩy.
- Máy con cháu: màn hình Gia đình xem từng người thân — thuốc hôm nay, cữ đã uống / chưa, sắp hết thuốc (chỉ đọc, theo đúng quyền).
- Cảnh báo cữ chưa xác nhận sau X phút (mặc định 60) với nội dung **chung chung**. **Cần hỏi người dùng trước khi code:** thông báo đẩy từ xa cần bật remote notifications + dịch vụ đẩy của Expo / Apple / Google (dữ liệu đi qua máy chủ nước ngoài → đánh giá pháp lý), hay tạm thời để máy con cháu tự kiểm tra định kỳ / realtime khi mở app.
- Thu hồi đã có (2.5C); 2.5D cần đảm bảo máy con cháu mất dữ liệu đã tải khi bị thu hồi.
- DoD M2.5: 2 điện thoại thật + PocketBase trên máy tính; ông bà bấm "Đã uống" → máy con thấy trong vài giây; tắt / bật mạng máy ông bà → tự đồng bộ; thu hồi → mất quyền ngay.

## 6. Giới hạn đã biết / nợ kỹ thuật

- Chưa gửi SMS thật (chỉ số thử nghiệm); nhà cung cấp SMS chọn ở Milestone 5.
- Số đã che: máy chủ dạng `0900***014`, app dạng `0900 *** 014` (chỉ khác hiển thị).
- Bảng `consents` chưa ghi thời điểm rút đồng ý theo từng liên kết (đang dùng `family_links.revoked_at`).
- Quyền Android mặc định của Expo (bộ nhớ ngoài, hiển thị đè) và `NSAllowsArbitraryLoads` của bản Debug → rà soát / chặn ở Milestone 6.
- Bundle id còn là placeholder.
