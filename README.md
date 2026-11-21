# Kề Bên

**Sổ y bạ cá nhân, Nhắc lịch uống thuốc & Quản lý hành trình đi khám**, dành cho điện thoại và máy tính bảng (iOS, Android).

> ⚠️ Kề Bên chỉ là công cụ hỗ trợ ghi nhớ, chuẩn bị và quản lý thông tin sức khỏe cá nhân. Ứng dụng không thay thế chẩn đoán, kê đơn hay chỉ định của bác sĩ, dược sĩ. Khi có dấu hiệu bất thường hoặc khẩn cấp, hãy liên hệ cơ sở y tế gần nhất hoặc gọi 115.

Đặc tả đầy đủ của dự án: [`docs/KEBEN_MASTER_PROMPT.md`](docs/KEBEN_MASTER_PROMPT.md).
Kế hoạch tuân thủ pháp luật Việt Nam (dữ liệu cá nhân, y tế, cửa hàng ứng dụng): [`docs/LEGAL_COMPLIANCE_VN.md`](docs/LEGAL_COMPLIANCE_VN.md).

## Công nghệ

| Thành phần | Phiên bản / thư viện |
|---|---|
| Expo SDK | **58** (`expo ~58.0.26`), React Native 0.88, React 19.3 |
| Ngôn ngữ | TypeScript (strict) |
| Điều hướng | `expo-router` (route trong `src/app/`) |
| Giao diện | Theme navy tự xây, Sáng / Tối / Theo hệ thống, icon `@expo/vector-icons` |
| Dữ liệu trên máy | `expo-sqlite` (offline-first, migration theo `PRAGMA user_version`) |
| Thông báo | `expo-notifications` — **chỉ thông báo cục bộ** (tạo trên máy, không dùng push); `expo-localization` để nhận biết đổi múi giờ |
| Máy chủ gia đình | PocketBase **v0.40.6** tự host (`server/`) — khi phát triển chạy trên máy tính cá nhân, xem [`server/README.md`](server/README.md) |
| Build | EAS Build (`eas.json`) |

## Yêu cầu

- **Node.js** `22.13+`, `24.3+` hoặc `26+` (theo yêu cầu của Expo SDK 58) và npm.
- Điện thoại cài app **Expo Go** bản hỗ trợ SDK 58, *hoặc* một development build (xem phần EAS bên dưới).
- (Tùy chọn) Android Studio Emulator hoặc Xcode Simulator (chỉ trên macOS).

## Chạy trên máy

Lấy code về thư mục **`KeBen`** (không dấu, không khoảng trắng — đường dẫn có dấu tiếng Việt hoặc khoảng trắng dễ làm hỏng công cụ build):

```bash
git clone https://github.com/kfckfckfc55/PillPal.git KeBen
```

```bash
cd KeBen
```

```bash
npm install
```

```bash
npx expo start
```

- Quét mã QR bằng **Expo Go** (Android) hoặc ứng dụng **Camera** (iOS). Điện thoại và máy tính phải chung mạng Wi-Fi.
- Mạng không cho kết nối trực tiếp? Dùng chế độ tunnel: `npx expo start --tunnel`.
- Phím tắt trong terminal: `a` mở Android emulator, `i` mở iOS simulator, `r` tải lại app.

> Nếu Expo Go báo không hỗ trợ SDK 58, hãy cập nhật Expo Go hoặc dùng development build.

## Kiểm tra chất lượng code

```bash
npm run typecheck   # TypeScript (tsc --noEmit)
npm run lint        # ESLint (eslint-config-expo)
npm test            # Unit test (jest-expo): tính lịch uống, đồng bộ cữ, đếm viên, form thuốc, giờ sinh hoạt
npm run check       # Chạy cả ba
```

Unit test chạy với múi giờ cố định `Asia/Ho_Chi_Minh` (`jest.global-setup.js`) nên kết quả giống nhau trên mọi máy. Test đặt trong thư mục `__tests__/` cạnh code (không đặt trong `src/app/`).

Cài thư viện mới **luôn** dùng `npx expo install <tên-gói>` để có phiên bản tương thích SDK.

## Cấu trúc thư mục

```
src/
  app/                    # Route của expo-router (mỗi file = 1 màn hình)
    _layout.tsx           # Khởi động (mở DB, migration, đọc cài đặt) + Provider + Stack gốc
    (tabs)/               # 5 tab: Hôm nay · Đợt điều trị · Lịch khám · Sức khỏe · Cài đặt
    welcome.tsx           # Màn hình chào: Medical Disclaimer + thông báo xử lý dữ liệu (bắt buộc đồng ý)
    medications/          # Danh sách thuốc · Thêm thuốc (new) · Sửa thuốc ([id])
    routine.tsx           # Giờ sinh hoạt theo loại ngày, lịch trong tuần, đổi riêng hôm nay / ngày mai
    history.tsx           # Lịch sử uống thuốc 7 ngày
    reminders-permission.tsx # Giải thích trước khi xin quyền thông báo / hướng dẫn mở Cài đặt
    family/               # Gia đình (thử nghiệm): index (tài khoản người thân), login (số điện thoại + OTP)
    design-preview.tsx    # Xem bộ giao diện (chỉ dùng khi phát triển)
    dev-data.tsx          # Xem / nạp lại / xóa dữ liệu (chỉ dùng khi phát triển)
  db/
    client.ts             # Mở SQLite, bật WAL + khóa ngoại
    migrations/           # 001_initial.ts (28 bảng), 002 (loại ngày + "ô" của cữ thuốc), 003 (số viên đã trừ), index.ts
  services/
    backend/              # config (địa chỉ máy chủ, cờ tính năng), familyApi (gọi PocketBase bằng fetch),
                          # caregiverSession (expo-secure-store), phone, errorMessages + __tests__/
    notifications/        # reminderService (kênh, nút, quyền, lên lịch), reminderPlan (cuốn chiếu, ≤ 64),
                          # reminderContent, reminderResponses (nút trên thông báo), timeZoneCheck,
                          # useReminderLifecycle (gốc app), useReminderPermission + __tests__/
    repositories/         # Đọc/ghi theo từng nhóm dữ liệu (UI không viết SQL trực tiếp)
    seed.ts · reset.ts    # Dữ liệu mẫu & xóa sạch (chỉ dev)
    DatabaseProvider.tsx  # useDatabase()
  hooks/                  # useAppBootstrap, useResponsive (màn hình rộng ≥ 768 → 2 cột)
  types/models.ts         # Kiểu dữ liệu domain
  utils/                  # date.ts, id.ts, format.ts (giờ 24h, dd/MM/yyyy, thứ tiếng Việt)
  theme/                  # tokens.ts (màu navy), typography.ts, layout.ts, ThemeProvider, useTheme
  components/ui/          # AppText, Button, Card, Chip, ChipGroup, Badge, RadioGroup, SwitchRow, Screen, Section,
                          # EmptyState, LoadingState, ErrorState, AppIcon, TextField, NumberField, TimeField, DateField,
                          # BottomSheet
  components/             # Component ghép (PlaceholderScreen…)
  features/
    today/                # Màn hình Hôm nay (thường + Đang mệt), nhóm cữ theo khung giờ, trạng thái cữ,
                          # useDoseActions (Đã uống / Nhắc lại / Uống lúc khác / Bỏ qua / Hoàn tác), phản ứng sau uống
    medications/          # scheduling.ts (tính giờ cữ), doseSync.ts (đồng bộ cữ), doseActions.ts (quy tắc đã uống /
                          # trễ / nhắc lại / đếm viên), pauses.ts (tạm dừng), medicationForm.ts, stock.ts,
                          # allergyCheck.ts, scheduleText.ts, components/ (form, danh sách, tạm dừng) + __tests__/
    history/              # Gom cữ 7 ngày theo ngày + đếm theo trạng thái
    routine/              # Kiểm tra giờ sinh hoạt
    profiles/             # Tạo hồ sơ đầu tiên, lấy hồ sơ theo route
    onboarding/           # Đồng ý bắt buộc (ghi bảng consents), rút lại đồng ý
    settings/
  constants/              # strings.vi.ts (chuỗi giao diện), disclaimer.ts (kèm phiên bản văn bản pháp lý)
assets/images/            # Icon & splash nền navy (bản tạm, hoàn thiện ở Milestone 6), icon thông báo Android
server/                   # Máy chủ gia đình PocketBase: pb_migrations/ (schema + luật truy cập),
                          # pb_hooks/ (tính quyền xem), tests/rules.test.mjs, README.md (chạy trên macOS / Windows)
```

## Cơ sở dữ liệu trên máy

- File `keben.db` (SQLite) nằm trong bộ nhớ riêng của app. Khi mở app: mở DB → chạy migration còn thiếu → **(chỉ khi phát triển) tự nạp dữ liệu mẫu nếu DB trống** → đọc cài đặt theme rồi mới tắt splash.
- Thay đổi schema: **thêm file migration mới** trong `src/db/migrations/` và khai báo vào `MIGRATIONS`. Không sửa migration đã phát hành.
- Màn hình **Cài đặt → Dành cho nhà phát triển → Dữ liệu (dev)**: xem số bản ghi từng bảng, nạp lại dữ liệu mẫu, xóa sạch.
- Dữ liệu mẫu (2 hồ sơ, 4 thuốc, cữ thuốc 3 ngày qua + hôm nay, lịch tái khám sau 3 ngày, huyết áp 7 ngày…) là **giả**, tên thuốc chỉ để minh họa giao diện.
- **Cữ thuốc (`dose_events`)** được sinh tự động cho hôm nay + 6 ngày tới mỗi khi mở màn hình Hôm nay và sau mỗi lần sửa thuốc / giờ sinh hoạt. Mỗi cữ có một "ô" (`slot_key` = ngày + thứ tự): đổi giờ thì cữ chưa uống được dời, cữ đã uống / bỏ qua giữ nguyên và **không sinh thêm cữ trong cùng ngày** (tránh nhắc uống trùng liều). Thêm thuốc lúc 10:00 thì không hiện cữ 08:00 sáng hôm đó.
- Bản cài mới (không có dữ liệu mẫu): màn hình Hôm nay hỏi **tên gọi** để tạo hồ sơ đầu tiên.
- **Trạng thái cữ:** `pending` (chưa xác nhận) · `snoozed` (nhắc lại) · `taken` / `taken_late` (uống trễ > 60 phút) · `skipped` (bỏ qua, có lý do) · `paused` (trong thời gian tạm dừng — không nhắc, không tính là quên) · `missed` (qua ngày mới vẫn chưa xác nhận). "Đã uống" trừ một liều khỏi số lượng còn (không âm) và ghi `stock_deducted`; **Hoàn tác** cộng trả đúng số đó và xóa phản ứng đã ghi cho cữ.

## Thông báo nhắc thuốc

- **Chỉ thông báo cục bộ:** tạo và hẹn giờ ngay trên máy, không qua máy chủ (plugin `expo-notifications` đặt `enableRemoteNotifications: false`).
- **Xin quyền đúng lúc:** sau khi lưu thuốc đầu tiên, app mở màn hình giải thích rồi mới hiện hộp thoại của hệ thống. Bị từ chối → hướng dẫn mở Cài đặt của máy. Màn hình Hôm nay có thẻ nhắc khi đang có thuốc mà chưa bật thông báo.
- **Kênh Android:** *Nhắc uống thuốc* (ưu tiên cao), *Lịch khám*, *Thông báo khác*; icon nhỏ `assets/images/notification-icon.png`, màu nhấn navy.
- **Nút trên thông báo:** Đã uống · Nhắc lại sau 10 phút · Bỏ qua. Bấm nút sẽ **mở app** để ghi nhận chắc chắn vào dữ liệu trên máy, kể cả khi app đang tắt (xử lý ngầm không mở app cần `expo-task-manager` và chỉ chạy trên Android → chưa dùng). Cữ trễ ≥ 2 giờ: không tự ghi mà mở bảng chọn giờ kèm lời nhắc hỏi bác sĩ / dược sĩ.
- **Lên lịch cuốn chiếu:** iOS chỉ giữ 64 thông báo chờ → Kề Bên hẹn tối đa 59 cữ gần nhất + 1 thông báo "hãy mở ứng dụng" sau cữ cuối. Cữ được sinh trước 7 ngày. Mỗi lần mở / quay lại app, sửa thuốc, giờ sinh hoạt, tạm dừng hoặc thao tác trên cữ → tính lại và chỉ hủy / đặt phần khác nhau (định danh thông báo gồm cữ + giờ + nội dung). Bản ghi lưu ở bảng `scheduled_notifications`.
- **Cài đặt → Thông báo nhắc thuốc:** trạng thái quyền, số thông báo đang hẹn, *Ẩn tên thuốc trong thông báo*, *Gửi thử một thông báo (sau 5 giây)*.
- **Đổi múi giờ:** khi tên múi giờ của máy đổi và đang có thuốc, app hỏi *Theo giờ nơi mới* (08:00 vẫn là 08:00) hay *Giữ như giờ cũ* (giữ khoảng cách giữa các cữ, mọi giờ uống cộng thêm độ lệch). Đang giữ giờ cũ → màn hình Hôm nay có thẻ để chuyển về giờ nơi mới.
- **Rút lại sự đồng ý** → hủy toàn bộ thông báo của Kề Bên.

**Chạy thử thông báo**

- iOS Simulator và Android Emulator đều nhận được thông báo cục bộ. Trên iPhone ảo: thông báo hiện ở đầu màn hình; muốn thấy các nút, **kéo thông báo xuống** (hoặc nhấn giữ).
- Expo Go dùng được cho thông báo cục bộ nhưng Expo cảnh báo là chưa hỗ trợ đầy đủ. Để kiểm tra đúng giờ khi app tắt hẳn trên **máy thật** (điều kiện hoàn thành Milestone 2), nên dùng development build:

  ```bash
  npx expo install expo-dev-client
  ```

  ```bash
  npx eas-cli@latest build --profile development --platform android
  ```

  (hoặc `npx expo run:ios` trên Mac có Xcode và iPhone cắm cáp.)
- Một số máy Android tiết kiệm pin có thể đưa thông báo đến trễ vài phút; chưa dùng quyền "báo thức chính xác" (`SCHEDULE_EXACT_ALARM`) vì cần khai báo riêng với Google Play — sẽ cân nhắc ở Milestone 6.

## Theme navy & chế độ Sáng/Tối

- Mọi màu nằm trong `src/theme/tokens.ts` (đã kiểm tra tương phản WCAG AA). **Không** hardcode mã màu trong component; dùng `useTheme().colors`.
- Người dùng chọn **Theo hệ thống / Sáng / Tối** trong tab Cài đặt; lựa chọn được lưu trong SQLite.
- `app.json` dùng `"userInterfaceStyle": "automatic"`; `expo-system-ui` đổi màu nền gốc theo theme để không nháy trắng.
- **Sick-Day Mode** (Chế độ Đang mệt) phóng to chữ (≥ 18px) và nút (cao 56dp), ẩn thanh tab, chỉ giữ việc cần thiết; bật/tắt ở màn hình Hôm nay hoặc Cài đặt và được lưu lại.

## Build bằng EAS

1. Cài EAS CLI và đăng nhập:

   ```bash
   npm install -g eas-cli
   ```

   ```bash
   eas login
   ```

2. Đổi `ios.bundleIdentifier` và `android.package` trong `app.json` (hiện là placeholder `com.yourcompany.keben`) thành định danh của bạn, ví dụ `com.tencongty.keben`.
3. Liên kết dự án với tài khoản Expo (tự thêm `extra.eas.projectId` vào `app.json`):

   ```bash
   eas init
   ```

4. Build theo profile trong `eas.json`:

| Profile | Mục đích | Lệnh |
|---|---|---|
| `development` | Development build để test tính năng native (cần `npx expo install expo-dev-client` trước) | `eas build --profile development --platform android` |
| `preview` | File cài thử nội bộ: APK (Android) / Ad-hoc (iOS) | `eas build --profile preview --platform android` |
| `production` | Bản phát hành: `.aab` (Google Play) / `.ipa` (App Store) | `eas build --profile production --platform all` |

> Build iOS cần tài khoản Apple Developer. Số build được EAS tự tăng (`appVersionSource: remote`).

## Biến môi trường

Sao chép `.env.example` thành `.env` rồi điền giá trị. Chỉ biến `EXPO_PUBLIC_*` được nhúng vào app, nên **không** đặt secret vào đó.

| Biến | Ý nghĩa |
|---|---|
| `EXPO_PUBLIC_POCKETBASE_URL` | Địa chỉ máy chủ gia đình, VD `http://192.168.1.10:8090` (IP máy tính trong Wi-Fi nhà). Để trống = app chạy offline hoàn toàn. |
| `EXPO_PUBLIC_FAMILY_FEATURE` | `1` = bật tính năng gia đình. Mặc định `0`; chỉ bật khi thử nghiệm nội bộ với dữ liệu giả / người nhà đã đồng ý bằng văn bản, hoặc sau "Cổng pháp lý B". |

Sửa `.env` xong phải khởi động lại với `npx expo start -c`.

## Tiến độ

- [x] **Milestone 1 · Bước 1A**: Khởi tạo dự án Expo SDK 58 + TypeScript strict + expo-router + ESLint, cấu hình `app.json` / `eas.json`, hệ thống theme navy Sáng/Tối, bộ UI component, khung 5 tab, màn hình Cài đặt có chọn giao diện.
- [x] **Bước 1B**: SQLite với 28 bảng (sẵn chỗ cho tài khoản & gia đình: `family_links`, `remote_id`, `synced_at`), migration, repository cơ bản, dữ liệu mẫu tiếng Việt, màn hình Dữ liệu (dev), lưu theme & Sick-Day vào máy, giữ splash tới khi tải xong.
- [x] **Bước 1C**: Màn hình chào bắt buộc đồng ý (không tick sẵn, lưu phiên bản vào `consents`, rút lại được trong Cài đặt); màn hình **Hôm nay** đọc dữ liệu thật (cữ thuốc theo khung giờ, trạng thái, tiến độ, cảnh báo buồn ngủ, sắp hết thuốc, lịch khám đếm ngược, chọn hồ sơ); **chế độ Đang mệt** (ẩn tab, chữ to, gọi người thân / 115, thông tin khẩn cấp); bố cục 2 cột trên màn hình rộng.
- [x] **Milestone 2**: Nhắc uống thuốc thông minh (phần code; chờ kiểm tra trên máy thật theo điều kiện hoàn thành).
  - [x] **Bước 2A**: Thêm / sửa / ngừng / xóa thuốc; giờ uống theo bữa ăn & giấc ngủ, giờ cố định hoặc cách đều; ngày trong tuần, liệu trình, số lượng, lưu ý buồn ngủ / chóng mặt, nhắc trùng dị ứng; **Giờ sinh hoạt** theo ngày làm / ngày nghỉ / làm ca + lịch tuần + đổi riêng hôm nay; tự sinh cữ cho 3 ngày; tạo hồ sơ đầu tiên; unit test (`jest-expo`).
  - [x] **Bước 2B**: Đã uống / Nhắc lại 10–15 phút / Đã uống lúc khác… / Bỏ qua (kèm lý do) / Hoàn tác ngay trên màn hình Hôm nay (và nút lớn ở chế độ Đang mệt); trừ & trả số viên; ghi phản ứng sau uống kèm lưu ý an toàn; cữ trễ ≥ 2 giờ nhắc "hỏi bác sĩ / dược sĩ" (không khuyên uống bù); tạm dừng có lý do + tự dùng lại; cữ ngày cũ chưa xác nhận → "Đã quên"; Lịch sử 7 ngày.
  - [x] **Bước 2C**: Thông báo cục bộ nhắc thuốc: màn hình giải thích trước khi xin quyền, kênh Android, nút Đã uống / Nhắc lại 10 phút / Bỏ qua (mở app để ghi nhận, kể cả khi app tắt), lên lịch cuốn chiếu ≤ 64 + nhắc mở app, ẩn tên thuốc, gửi thử; hỏi khi đổi múi giờ (theo giờ nơi mới / giữ khoảng cách như giờ cũ); hủy thông báo khi rút lại đồng ý.
- [ ] **Milestone 2.5**: Tài khoản (số điện thoại + OTP) & Gia đình (ông bà ghép máy bằng QR) với PocketBase.
  - [x] **Bước 2.5A**: Máy chủ PocketBase v0.40.6 trong `server/`: migration tạo 6 collection (tài khoản con cháu / máy ông bà, hồ sơ chia sẻ chỉ có tên gọi, liên kết = bản ghi đồng ý từng quyền, thuốc, cữ), luật truy cập (chỉ máy ông bà ghi, con cháu chỉ đọc theo quyền, thu hồi mất quyền ngay), hook tính quyền xem, cài đặt an toàn (log không IP, giới hạn tần suất, xóa `users`); script kiểm tra 12 tình huống; README chạy trên macOS / Windows; app có nút kiểm tra kết nối máy chủ (chỉ khi phát triển).
  - [x] **Bước 2.5B**: Đăng nhập con cháu bằng số điện thoại + OTP 6 số: route `/api/keben/otp/*` (mã băm + salt, hết hạn 5 phút, gửi lại sau 60 giây, ≤ 5 mã/giờ, ≤ 10 mã/ngày, sai ≤ 5 lần, chỉ số thử nghiệm — chưa gửi SMS thật), ghi phiên bản đồng ý trên máy chủ; app có màn hình Gia đình + Đăng nhập (thông báo xử lý số điện thoại, ô đồng ý không tick sẵn, đếm ngược gửi lại), phiên lưu bằng `expo-secure-store` (chỉ trên máy này), tự gia hạn / tự đăng xuất khi hết hạn, đổi tên gọi, đăng xuất, xóa tài khoản trên máy chủ. Chỉ hiện khi `EXPO_PUBLIC_FAMILY_FEATURE=1`.
  - [ ] Bước 2.5C: Ghép máy ông bà bằng QR / mã 6 số, màn hình đồng ý chữ to chọn từng quyền.
  - [ ] Bước 2.5D: Đồng bộ tối thiểu, màn hình Gia đình, cảnh báo trễ cữ, thu hồi.
- [ ] Milestone 3 → 6: xem `docs/KEBEN_MASTER_PROMPT.md`.
