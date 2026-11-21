# PillPal

**Sổ y bạ cá nhân, Nhắc lịch uống thuốc & Quản lý hành trình đi khám**, dành cho điện thoại và máy tính bảng (iOS, Android).

> ⚠️ PillPal chỉ là công cụ hỗ trợ ghi nhớ, chuẩn bị và quản lý thông tin sức khỏe cá nhân. Ứng dụng không thay thế chẩn đoán, kê đơn hay chỉ định của bác sĩ, dược sĩ. Khi có dấu hiệu bất thường hoặc khẩn cấp, hãy liên hệ cơ sở y tế gần nhất hoặc gọi 115.

Đặc tả đầy đủ của dự án: [`docs/PILLPAL_MASTER_PROMPT.md`](docs/PILLPAL_MASTER_PROMPT.md).
Kế hoạch tuân thủ pháp luật Việt Nam (dữ liệu cá nhân, y tế, cửa hàng ứng dụng): [`docs/LEGAL_COMPLIANCE_VN.md`](docs/LEGAL_COMPLIANCE_VN.md).

## Công nghệ

| Thành phần | Phiên bản / thư viện |
|---|---|
| Expo SDK | **58** (`expo ~58.0.26`), React Native 0.88, React 19.3 |
| Ngôn ngữ | TypeScript (strict) |
| Điều hướng | `expo-router` (route trong `src/app/`) |
| Giao diện | Theme navy tự xây, Sáng / Tối / Theo hệ thống, icon `@expo/vector-icons` |
| Build | EAS Build (`eas.json`) |

## Yêu cầu

- **Node.js** `22.13+`, `24.3+` hoặc `26+` (theo yêu cầu của Expo SDK 58) và npm.
- Điện thoại cài app **Expo Go** bản hỗ trợ SDK 58, *hoặc* một development build (xem phần EAS bên dưới).
- (Tùy chọn) Android Studio Emulator hoặc Xcode Simulator (chỉ trên macOS).

## Chạy trên máy

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
npm run check       # Chạy cả hai
```

Cài thư viện mới **luôn** dùng `npx expo install <tên-gói>` để có phiên bản tương thích SDK.

## Cấu trúc thư mục

```
src/
  app/                    # Route của expo-router (mỗi file = 1 màn hình)
    _layout.tsx           # Provider theme + Stack gốc
    (tabs)/               # 5 tab: Hôm nay · Đợt điều trị · Lịch khám · Sức khỏe · Cài đặt
    design-preview.tsx    # Màn hình xem bộ giao diện (chỉ dùng khi phát triển)
  theme/                  # tokens.ts (màu navy), typography.ts, layout.ts, ThemeProvider, useTheme
  components/ui/          # AppText, Button, Card, Chip, Badge, RadioGroup, SwitchRow, Screen, Section,
                          # EmptyState, LoadingState, ErrorState, AppIcon
  components/             # Component ghép (PlaceholderScreen…)
  features/               # Logic theo tính năng (settings/…)
  constants/              # strings.vi.ts (chuỗi giao diện), disclaimer.ts
assets/images/            # Icon & splash nền navy (bản tạm, hoàn thiện ở Milestone 6)
```

## Theme navy & chế độ Sáng/Tối

- Mọi màu nằm trong `src/theme/tokens.ts` (đã kiểm tra tương phản WCAG AA). **Không** hardcode mã màu trong component; dùng `useTheme().colors`.
- Người dùng chọn **Theo hệ thống / Sáng / Tối** trong tab Cài đặt. Bước 1B sẽ lưu lựa chọn này vào SQLite.
- `app.json` dùng `"userInterfaceStyle": "automatic"`; `expo-system-ui` đổi màu nền gốc theo theme để không nháy trắng.
- **Sick-Day Mode** (Chế độ Đang mệt) phóng to chữ (≥ 18px) và nút (cao 56dp). Bước 1A chỉ có công tắc xem trước ở màn hình *Bộ giao diện mẫu*; bước 1C sẽ làm bản chính thức.

## Build bằng EAS

1. Cài EAS CLI và đăng nhập:

   ```bash
   npm install -g eas-cli
   ```

   ```bash
   eas login
   ```

2. Đổi `ios.bundleIdentifier` và `android.package` trong `app.json` (hiện là placeholder `com.yourcompany.pillpal`) thành định danh của bạn, ví dụ `com.tencongty.pillpal`.
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
- [ ] Bước 1B: SQLite (schema đầy đủ, migration, dữ liệu mẫu), lưu cài đặt theme.
- [ ] Bước 1C: Màn hình Hôm nay, Sick-Day Mode, chấp nhận Medical Disclaimer lần đầu.
- [ ] Milestone 2 → 6: xem `docs/PILLPAL_MASTER_PROMPT.md`.
