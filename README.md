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
| Máy chủ gia đình | PocketBase tự host — từ Milestone 2.5, khi phát triển chạy trên máy tính cá nhân |
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
    design-preview.tsx    # Xem bộ giao diện (chỉ dùng khi phát triển)
    dev-data.tsx          # Xem / nạp lại / xóa dữ liệu (chỉ dùng khi phát triển)
  db/
    client.ts             # Mở SQLite, bật WAL + khóa ngoại
    migrations/           # 001_initial.ts (28 bảng), 002 (loại ngày + "ô" của cữ thuốc), index.ts
    repositories/         # Đọc/ghi theo từng nhóm dữ liệu (UI không viết SQL trực tiếp)
    seed.ts · reset.ts    # Dữ liệu mẫu & xóa sạch (chỉ dev)
    DatabaseProvider.tsx  # useDatabase()
  hooks/                  # useAppBootstrap, useResponsive (màn hình rộng ≥ 768 → 2 cột)
  types/models.ts         # Kiểu dữ liệu domain
  utils/                  # date.ts, id.ts, format.ts (giờ 24h, dd/MM/yyyy, thứ tiếng Việt)
  theme/                  # tokens.ts (màu navy), typography.ts, layout.ts, ThemeProvider, useTheme
  components/ui/          # AppText, Button, Card, Chip, ChipGroup, Badge, RadioGroup, SwitchRow, Screen, Section,
                          # EmptyState, LoadingState, ErrorState, AppIcon, TextField, NumberField, TimeField, DateField
  components/             # Component ghép (PlaceholderScreen…)
  features/
    today/                # Màn hình Hôm nay (thường + Đang mệt), nhóm cữ theo khung giờ, trạng thái cữ
    medications/          # scheduling.ts (tính giờ cữ), doseSync.ts (đồng bộ cữ), medicationForm.ts, stock.ts,
                          # allergyCheck.ts, scheduleText.ts, components/ (form, danh sách) + __tests__/
    routine/              # Kiểm tra giờ sinh hoạt
    profiles/             # Tạo hồ sơ đầu tiên, lấy hồ sơ theo route
    onboarding/           # Đồng ý bắt buộc (ghi bảng consents), rút lại đồng ý
    settings/
  constants/              # strings.vi.ts (chuỗi giao diện), disclaimer.ts (kèm phiên bản văn bản pháp lý)
assets/images/            # Icon & splash nền navy (bản tạm, hoàn thiện ở Milestone 6)
```

## Cơ sở dữ liệu trên máy

- File `keben.db` (SQLite) nằm trong bộ nhớ riêng của app. Khi mở app: mở DB → chạy migration còn thiếu → **(chỉ khi phát triển) tự nạp dữ liệu mẫu nếu DB trống** → đọc cài đặt theme rồi mới tắt splash.
- Thay đổi schema: **thêm file migration mới** trong `src/db/migrations/` và khai báo vào `MIGRATIONS`. Không sửa migration đã phát hành.
- Màn hình **Cài đặt → Dành cho nhà phát triển → Dữ liệu (dev)**: xem số bản ghi từng bảng, nạp lại dữ liệu mẫu, xóa sạch.
- Dữ liệu mẫu (2 hồ sơ, 4 thuốc, cữ thuốc 3 ngày qua + hôm nay, lịch tái khám sau 3 ngày, huyết áp 7 ngày…) là **giả**, tên thuốc chỉ để minh họa giao diện.
- **Cữ thuốc (`dose_events`)** được sinh tự động cho hôm nay + 2 ngày tới mỗi khi mở màn hình Hôm nay và sau mỗi lần sửa thuốc / giờ sinh hoạt. Mỗi cữ có một "ô" (`slot_key` = ngày + thứ tự): đổi giờ thì cữ chưa uống được dời, cữ đã uống / bỏ qua giữ nguyên và **không sinh thêm cữ trong cùng ngày** (tránh nhắc uống trùng liều). Thêm thuốc lúc 10:00 thì không hiện cữ 08:00 sáng hôm đó.
- Bản cài mới (không có dữ liệu mẫu): màn hình Hôm nay hỏi **tên gọi** để tạo hồ sơ đầu tiên.

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

## Tiến độ

- [x] **Milestone 1 · Bước 1A**: Khởi tạo dự án Expo SDK 58 + TypeScript strict + expo-router + ESLint, cấu hình `app.json` / `eas.json`, hệ thống theme navy Sáng/Tối, bộ UI component, khung 5 tab, màn hình Cài đặt có chọn giao diện.
- [x] **Bước 1B**: SQLite với 28 bảng (sẵn chỗ cho tài khoản & gia đình: `family_links`, `remote_id`, `synced_at`), migration, repository cơ bản, dữ liệu mẫu tiếng Việt, màn hình Dữ liệu (dev), lưu theme & Sick-Day vào máy, giữ splash tới khi tải xong.
- [x] **Bước 1C**: Màn hình chào bắt buộc đồng ý (không tick sẵn, lưu phiên bản vào `consents`, rút lại được trong Cài đặt); màn hình **Hôm nay** đọc dữ liệu thật (cữ thuốc theo khung giờ, trạng thái, tiến độ, cảnh báo buồn ngủ, sắp hết thuốc, lịch khám đếm ngược, chọn hồ sơ); **chế độ Đang mệt** (ẩn tab, chữ to, gọi người thân / 115, thông tin khẩn cấp); bố cục 2 cột trên màn hình rộng.
- [ ] **Milestone 2**: Nhắc uống thuốc thông minh.
  - [x] **Bước 2A**: Thêm / sửa / ngừng / xóa thuốc; giờ uống theo bữa ăn & giấc ngủ, giờ cố định hoặc cách đều; ngày trong tuần, liệu trình, số lượng, lưu ý buồn ngủ / chóng mặt, nhắc trùng dị ứng; **Giờ sinh hoạt** theo ngày làm / ngày nghỉ / làm ca + lịch tuần + đổi riêng hôm nay; tự sinh cữ cho 3 ngày; tạo hồ sơ đầu tiên; unit test (`jest-expo`).
  - [ ] Bước 2B: Đã uống / Nhắc lại / Uống trễ lúc… / Bỏ qua / Hoàn tác, trừ số viên, tác dụng phụ, tạm dừng có lý do, lịch sử 7 ngày.
  - [ ] Bước 2C: Thông báo nhắc thuốc (quyền, kênh Android, nút trên thông báo, lên lịch cuốn chiếu), đổi múi giờ.
- [ ] Milestone 2.5: Tài khoản (số điện thoại + OTP) & Gia đình (ông bà ghép máy bằng QR) với PocketBase.
- [ ] Milestone 3 → 6: xem `docs/KEBEN_MASTER_PROMPT.md`.
