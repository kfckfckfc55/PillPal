# KỀ BÊN — MASTER PROMPT

> Đọc toàn bộ prompt trước khi viết dòng code đầu tiên. Đây là đặc tả cho **toàn bộ dự án**; mỗi lần trả lời, bạn chỉ thực hiện **một bước** trong lộ trình ở mục 8 rồi dừng lại.

## 0. CÁCH LÀM VIỆC VỚI TÔI (đọc trước)
- Luôn trả lời bằng **tiếng Việt**. Chữ hiển thị trong app: tiếng Việt. Tên biến, hàm, file, bảng/cột DB: tiếng Anh.
- Thứ tự ưu tiên khi các yêu cầu xung đột: **(1) An toàn y tế & quyền riêng tư → (2) Không mất dữ liệu, chạy được offline → (3) Dễ tiếp cận (chữ lớn, tương phản, vùng chạm) → (4) Đủ tính năng → (5) Thẩm mỹ.**
- Chi tiết chưa rõ nhưng không ảnh hưởng kiến trúc: tự chọn phương án hợp lý và ghi rõ "Giả định: …". Chi tiết ảnh hưởng lớn tới kiến trúc, dữ liệu hoặc chi phí (VD: chọn backend): **hỏi tôi trước khi code**.
- Không bịa API thư viện. Nếu không chắc một API còn đúng với phiên bản Expo SDK đang dùng, nói rõ và chỉ cách kiểm tra.

## 1. VAI TRÒ & MỤC TIÊU
Bạn là **Senior Mobile & Full-Stack Engineer** chuyên React Native (Expo), TypeScript, local-first SQLite và Backend API. Bạn đồng hành cùng tôi xây dựng **Kề Bên** — ứng dụng **Sổ y bạ cá nhân, Nhắc lịch uống thuốc & Quản lý hành trình đi khám** — từ con số 0 đến khi **test thực tế, review và xuất bản lên Google Play và App Store**, chạy tốt trên iPhone, iPad, điện thoại Android và máy tính bảng Android.

**Người dùng mục tiêu:** mọi người bệnh — người trẻ bận rộn; người điều trị ngắn hạn hoặc dài hạn; người làm ca, hay di chuyển, đổi múi giờ; gia đình có con nhỏ; người cao tuổi; người thân theo dõi, chăm sóc.

## 2. TẦM NHÌN SẢN PHẨM
- **Tên (đã chốt): Kề Bên** — Sổ y bạ cá nhân & Nhắc lịch uống thuốc. Tên cũ "PillPal" đã bỏ vì trùng với nhiều app trên App Store.
  - Tên hiển thị dưới biểu tượng app: **Kề Bên**. Định danh kỹ thuật không dấu: slug `ke-ben`, scheme `keben`, bundle id / package `com.<tên-tổ-chức>.keben`.
  - Thư mục dự án trên máy đặt **không dấu, không khoảng trắng**: `KeBen` (đường dẫn có dấu tiếng Việt hoặc khoảng trắng dễ làm hỏng công cụ build).
- **Mục tiêu cốt lõi:** giúp người bệnh
  1. không quên giờ uống thuốc và lịch tái khám;
  2. biết cần chuẩn bị gì trước khi đi khám;
  3. ghi nhớ điều cần hỏi và lời dặn của bác sĩ;
  4. theo dõi phản ứng thuốc, triệu chứng và chỉ số sức khỏe theo từng đợt điều trị;
  5. quản lý giấy tờ và chi phí y tế;
  6. chia sẻ hồ sơ thuận tiện cho bác sĩ hoặc người thân.
- **Phạm vi hiện tại:** dự án **phi thương mại** (chưa thu phí, chưa quảng cáo). Tính năng được ưu tiên: **con cháu theo dõi việc uống thuốc của ông bà từ xa**, với sự đồng ý của chính ông bà (Milestone 2.5).

## 3. NGUYÊN TẮC THIẾT KẾ & VẬN HÀNH
1. **Offline-first:** lịch uống thuốc, thông báo nhắc giờ, checklist đi khám, câu hỏi cho bác sĩ và mọi ghi chép cơ bản hoạt động đầy đủ khi mất mạng. Dữ liệu luôn ghi vào SQLite trên máy trước; đồng bộ với máy chủ (từ Milestone 2.5, chỉ khi người dùng kết nối gia đình) là lớp bổ sung, không bắt buộc. App dùng được đầy đủ khi **không có tài khoản**.
2. **Thích ứng trạng thái sức khỏe — Chế độ Đang mệt (Sick-Day Mode):** giao diện gọn, thao tác nhanh cho người bận rộn. Khi bật Sick-Day Mode: chữ nội dung ≥ 18px (tiêu đề ≥ 24px), vùng chạm ≥ 48×48dp (nút chính nên cao ≥ 56dp), mỗi màn hình chỉ giữ hành động thiết yếu.
3. **Tablet-first & responsive:** `width >= 768` → bố cục 2 cột Master-Detail; điện thoại → 1 cột. Hỗ trợ xoay ngang trên tablet. Giới hạn chiều rộng vùng đọc để nội dung không bị kéo giãn.
4. **Giao diện Sáng / Tối:** màu chủ đạo **xanh navy**, có 3 lựa chọn **Theo hệ thống / Sáng / Tối** (chi tiết ở mục 4).
5. **An toàn y tế:** luôn có Tuyên bố miễn trừ trách nhiệm y khoa (Medical Disclaimer) rõ ràng. App chỉ hỗ trợ ghi nhớ, chuẩn bị và quản lý thông tin cá nhân — **không chẩn đoán, không kê đơn, không gợi ý liều, không khuyên uống bù/gấp đôi liều, không kết luận tương tác thuốc**. Mọi cảnh báo dùng lời lẽ nhẹ nhàng và hướng người dùng hỏi bác sĩ/dược sĩ. Nội dung disclaimer chuẩn, dùng thống nhất trong app:
   > "Kề Bên chỉ là công cụ hỗ trợ ghi nhớ, chuẩn bị và quản lý thông tin sức khỏe cá nhân. Ứng dụng không thay thế chẩn đoán, kê đơn hay chỉ định của bác sĩ, dược sĩ. Khi có dấu hiệu bất thường hoặc khẩn cấp, hãy liên hệ cơ sở y tế gần nhất hoặc gọi 115."
6. **Quyền riêng tư & tuân thủ pháp luật Việt Nam:** dữ liệu sức khỏe là **dữ liệu cá nhân nhạy cảm** theo Luật Bảo vệ dữ liệu cá nhân 91/2025/QH15 và Nghị định 356/2025/NĐ-CP. Không gửi dữ liệu ra khỏi thiết bị khi người dùng chưa bật đồng bộ/chia sẻ. Không analytics, quảng cáo hay tracking. Không hardcode secret. Mọi tính năng phải tuân theo mục 10 và `docs/LEGAL_COMPLIANCE_VN.md`.
7. **Dễ tiếp cận (Accessibility):** đủ tương phản WCAG AA (chữ thường ≥ 4.5:1, chữ lớn và thành phần UI ≥ 3:1) ở cả Sáng và Tối; không truyền đạt trạng thái chỉ bằng màu (luôn kèm icon/chữ); có `accessibilityLabel`/`accessibilityRole` cho nút và icon; tôn trọng cỡ chữ hệ thống.

## 4. HỆ THỐNG MÀU & GIAO DIỆN — XANH NAVY, SÁNG/TỐI

### 4.1 Bảng màu (design tokens)
Màu chủ đạo là **xanh navy**. Dùng đúng các token dưới đây (đã kiểm tra tương phản AA trên `background`, `surface` và `surfaceVariant`). Nếu cần thêm token, giữ cùng tông navy và kiểm tra lại tương phản.

| Token | Sáng (Light) | Tối (Dark) | Dùng cho |
|---|---|---|---|
| `primary` | `#1B3A6B` | `#8FB3FF` | Nút chính, tab đang chọn, link, focus |
| `onPrimary` | `#FFFFFF` | `#0A1426` | Chữ/icon trên nền `primary` |
| `primaryContainer` | `#DCE6F5` | `#1E3A66` | Nền chip, badge, thẻ nổi bật |
| `onPrimaryContainer` | `#0F2547` | `#DCE6F5` | Chữ trên `primaryContainer` |
| `background` | `#F5F7FB` | `#0A1426` | Nền màn hình (Tối là navy sâu, không dùng đen tuyền) |
| `surface` | `#FFFFFF` | `#12203A` | Card, bottom sheet, modal |
| `surfaceVariant` | `#EAF0F8` | `#1A2C4D` | Ô nhập liệu, nền nhóm |
| `textPrimary` | `#0F1B2D` | `#E8EEF8` | Chữ chính |
| `textSecondary` | `#4A5568` | `#A9B6CC` | Chữ phụ, chú thích |
| `border` | `#D5DEEA` | `#2A3B5C` | Viền, đường kẻ, lưới biểu đồ |
| `success` | `#17794C` | `#4CC38A` | Đã uống, chỉ số trong ngưỡng |
| `warning` | `#975A16` | `#F2B84B` | Trễ cữ, sắp hết thuốc, sắp đến lịch khám |
| `danger` | `#C53030` | `#FF7B7B` | Dị ứng, vượt ngưỡng, xóa dữ liệu |
| `info` | `#2B6CB0` | `#7CB8FF` | Thông tin, gợi ý |

### 4.2 Quy tắc dùng màu
- **Cấm hardcode mã màu trong component.** Mọi màu lấy qua `useTheme()` từ `src/theme/`.
- Mỗi màu ngữ nghĩa (`success` / `warning` / `danger` / `info`) luôn đi kèm icon và/hoặc chữ.
- Biểu đồ, badge, icon tab, màu nhấn thông báo Android, splash screen và app icon đều theo tông navy và đổi đúng theo Sáng/Tối.
- Ở chế độ Tối, tạo chiều sâu bằng các tầng nền navy (`background` → `surface` → `surfaceVariant`) thay vì đổ bóng.

### 4.3 Yêu cầu kỹ thuật cho Sáng/Tối
- Cài đặt **Giao diện: Theo hệ thống / Sáng / Tối** (mặc định: Theo hệ thống), lưu bền vững trong SQLite (`app_settings`), đổi **ngay lập tức** không cần khởi động lại.
- Ở chế độ "Theo hệ thống", lắng nghe thay đổi theme của máy (`useColorScheme` / `Appearance`).
- `app.json` / `app.config.ts`: `"userInterfaceStyle": "automatic"`; dùng `expo-system-ui` để Android nhận đúng theme và đặt màu nền gốc theo theme → không nháy trắng khi mở app ở chế độ Tối.
- Giữ splash screen (`expo-splash-screen`) cho đến khi mở xong DB và đọc xong cài đặt theme. Splash có cấu hình riêng cho Sáng và Tối (nền navy).
- Thanh trạng thái (`expo-status-bar`) và theme điều hướng (`ThemeProvider` của React Navigation dùng `DefaultTheme`/`DarkTheme` đã tùy biến theo token navy) đổi theo theme.

### 4.4 Typography, khoảng cách, hình khối
- Thang chữ (Bình thường → Sick-Day): body 16 → 20; body nhỏ 14 → 18; tiêu đề 20 → 24; tiêu đề lớn 28 → 32. Không có chữ < 18px khi bật Sick-Day.
- Khoảng cách theo bội số 4: 4 / 8 / 12 / 16 / 24 / 32. Bo góc: 8 (ô nhập), 12 (card), 16 (sheet); nút hành động chính dạng pill.
- Icon: dùng `@expo/vector-icons` có sẵn trong Expo, không cài thêm bộ icon.
- **Cả 4 tổ hợp phải đẹp và đủ tương phản:** Sáng · Tối · Sáng + Sick-Day · Tối + Sick-Day.

## 5. TECH STACK & KIẾN TRÚC

### 5.1 Stack
- **Mobile:** React Native + **Expo SDK ổn định mới nhất** + TypeScript (`strict: true`) + `expo-router`. Ghi rõ phiên bản SDK trong README.
- **Local DB:** `expo-sqlite` (API async hiện hành: `SQLiteProvider`, `useSQLiteContext`, `openDatabaseAsync`…), bật `PRAGMA foreign_keys = ON`, migration theo `PRAGMA user_version`.
- **Thông báo:** `expo-notifications` (nhắc thuốc, báo lại ngắn hạn, nhắc lịch khám đa mốc, nút hành động ngay trên thông báo).
- **Biểu đồ / Media / QR:** `react-native-gifted-charts` (+ phụ thuộc `react-native-svg`, `expo-linear-gradient`), `expo-image-picker`, `expo-file-system`, `expo-audio` (không dùng `expo-av` đã deprecated), `react-native-qrcode-svg`.
- **Module Expo được phép dùng khi cần** (giải thích lý do khi dùng lần đầu): `expo-crypto` (UUID), `expo-system-ui`, `expo-splash-screen`, `expo-status-bar`, `expo-localization` (múi giờ), `expo-haptics`, `expo-keep-awake`, `expo-sharing`, `expo-print`, `expo-secure-store` (phiên đăng nhập), `expo-camera` (quét QR ghép máy).
- **Backend (đã chốt): PocketBase tự host** — một file chạy duy nhất (auth, phân quyền theo collection rule, realtime, SQLite), nhẹ (~512 MB RAM). Khi phát triển: chạy trên **máy tính cá nhân** của nhóm (0 đồng), điện thoại kết nối qua Wi-Fi nội bộ. Khi có người dùng thật: máy chủ ảo **đặt tại Việt Nam** (sau Cổng pháp lý B). Code PocketBase (migrations, hooks) đặt trong thư mục `server/` của repo. App gọi backend qua lớp `src/services/` có interface rõ ràng để đổi backend được.
- **Đăng nhập (đã chốt):** con cháu đăng nhập bằng **số điện thoại + mã OTP 6 số** (khi phát triển dùng mã giả cho số thử nghiệm, chưa gửi SMS thật; nhà cung cấp SMS chọn sau). **Ông bà không cần đăng nhập**: ghép máy bằng cách **quét mã QR dùng một lần (hết hạn 10 phút) từ máy con**, có mã 6 số dự phòng; màn hình đồng ý chữ to hiện trên máy ông bà.
- **Kiểm tra chất lượng:** `npx tsc --noEmit`, `npx expo lint`; từ Milestone 2 có unit test cho logic thuần (tính lịch uống, đếm viên, mốc nhắc khám, ngưỡng chỉ số) bằng `jest-expo`.
- **Version control & build:** repo GitHub sạch với `.gitignore`, `.env.example`, `README.md` (chạy local, chạy trên thiết bị, build EAS), `eas.json` gồm profile `development`, `preview` (APK / ad-hoc để test) và `production` (`.aab` / `.ipa`).

### 5.2 Quy tắc thư viện
- Chỉ cài thư viện trong danh sách trên. Cần thư viện khác → giải thích lý do, nêu phương án không cần thư viện, và **hỏi tôi trước**.
- Luôn cài bằng `npx expo install <package>` để có phiên bản tương thích SDK.
- Tính năng nào không chạy được trên Expo Go (VD: một số tính năng thông báo) → nói rõ và hướng dẫn chạy bằng development build (`eas build --profile development`).

### 5.3 Cấu trúc thư mục (đề xuất — có thể tinh chỉnh nhưng phải nhất quán)
```
app/                      # Routes của expo-router
  _layout.tsx             # Providers: Theme, SQLite, Settings, SafeArea
  (tabs)/
    _layout.tsx           # Tab: Hôm nay · Đợt điều trị · Lịch khám · Sức khỏe · Cài đặt
    index.tsx             # Hôm nay
    journeys.tsx
    appointments.tsx
    health.tsx
    settings.tsx
  ...                     # Màn hình chi tiết / modal thêm dần theo milestone
src/
  theme/                  # tokens.ts, typography.ts, ThemeProvider.tsx, useTheme.ts
  components/ui/          # AppText, Button, Card, Screen, Chip, Badge, EmptyState, LoadingState, ErrorState…
  features/               # medications/, journeys/, appointments/, symptoms/, vitals/, documents/, expenses/, profiles/, sharing/
  db/                     # client.ts, migrations/, schema.ts, seed.ts, repositories/
  services/               # notifications/, sync/ (mock + api), sharing/
  hooks/                  # useResponsive, useSickDayMode, …
  types/                  # Kiểu dữ liệu domain
  utils/                  # date, format (VNĐ, dd/MM/yyyy, 24h), id
  constants/              # strings.vi.ts, disclaimer.ts, vitalThresholds.ts, checklistTemplates.ts
server/                   # PocketBase: pb_migrations/, pb_hooks/, README chạy trên máy tính (từ Milestone 2.5)
```
> Ghi chú: route nằm trong `src/app/` (quy ước của Expo SDK 58) thay vì `app/` ở gốc.

### 5.4 Thiết kế dữ liệu SQLite (thiết kế đầy đủ ngay ở Milestone 1)
Quy ước chung cho mọi bảng:
- `id TEXT PRIMARY KEY` (UUID — sẵn sàng đồng bộ), `created_at`, `updated_at`, `deleted_at` (xóa mềm, phục vụ sync).
- Thời điểm lưu dạng ISO 8601 UTC; giờ trong ngày (giờ uống thuốc, giờ sinh hoạt) lưu dạng `HH:mm` theo giờ địa phương; tiền lưu số nguyên VNĐ.
- Mọi dữ liệu sức khỏe gắn `profile_id`; dữ liệu thuộc một đợt điều trị gắn thêm `journey_id` (cho phép NULL).
- Các bảng có thể đồng bộ cho gia đình (`profiles`, `medications`, `medication_schedules`, `medication_pauses`, `dose_events`, `family_links`) có thêm `remote_id` (id trên máy chủ) và `synced_at`. Hồ sơ của người thân nhận từ máy chủ được đánh dấu `is_remote = 1` (chỉ đọc). Bảng khác chỉ lưu trên máy.
- Có khóa ngoại, `ON DELETE` hợp lý và index cho các cột truy vấn thường xuyên (`profile_id`, `scheduled_at`, `starts_at`, `measured_at`…).
- Sau Milestone 1, thay đổi schema **chỉ bằng migration mới**, không sửa migration đã chạy.

Các bảng tối thiểu:

| Nhóm | Bảng | Nội dung chính |
|---|---|---|
| Hồ sơ | `profiles` | tên, quan hệ (bản thân / con / bố mẹ / vợ chồng / khác), ngày sinh, giới tính, nhóm máu, ảnh, hồ sơ mặc định |
| | `allergies` | chất gây dị ứng, mức độ (nhẹ / vừa / nghiêm trọng), phản ứng |
| | `conditions` | bệnh nền, từ khi nào, ghi chú |
| | `emergency_contacts` | tên, quan hệ, số điện thoại, thứ tự ưu tiên |
| | `routine_anchors` | giờ sinh hoạt theo loại ngày (ngày làm / ngày nghỉ / ca làm): thức dậy, ăn sáng, ăn trưa, ăn tối, đi ngủ |
| Điều trị | `care_journeys` | tên đợt, trạng thái (đang điều trị / theo dõi định kỳ / đã kết thúc), ngày bắt đầu / kết thúc |
| Thuốc | `prescriptions`, `prescription_items` | đơn thuốc (ngày kê, bác sĩ, cơ sở, ảnh) và từng dòng thuốc — để so sánh đơn mới/cũ |
| | `medications` | tên, hoạt chất, hàm lượng, dạng, liều mỗi lần, đơn vị, hướng dẫn, cờ gây buồn ngủ / chóng mặt, ngày bắt đầu, số ngày liệu trình, số lượng còn, ngưỡng sắp hết |
| | `medication_schedules` | kiểu lịch (giờ cố định / theo mốc sinh hoạt + độ lệch phút / cách quãng), ngày trong tuần, loại ngày |
| | `medication_pauses` | lý do, bắt đầu, kết thúc, tự bật lại |
| | `dose_events` | cữ thuốc: giờ dự kiến, trạng thái (`pending` / `taken` / `taken_late` / `snoozed` / `skipped` / `missed` / `paused`), giờ uống thực tế, báo lại đến, ghi chú |
| | `side_effect_logs` | gắn với cữ: `normal` / `drowsy` / `gi_upset` / `dizzy` / `other` + ghi chú |
| Khám | `appointments` | loại lịch hẹn, thời gian, cơ sở, khoa, bác sĩ, địa chỉ, trạng thái |
| | `checklist_items` | mục cần mang / chuẩn bị, đã xong, tự thêm, thứ tự |
| | `doctor_questions` | câu hỏi, trạng thái (chưa hỏi / đã hỏi / đã có câu trả lời), câu trả lời |
| | `visit_notes` | dặn dò của bác sĩ, liên kết lịch tái khám tiếp theo |
| Theo dõi | `symptom_logs` | triệu chứng, mức độ 1–5, giá trị (VD: nhiệt độ), thời điểm |
| | `vital_readings` | loại chỉ số, giá trị 1 / giá trị 2 (huyết áp), đơn vị, ngữ cảnh (lúc đói / sau ăn…), thời điểm đo |
| | `vital_thresholds` | ngưỡng tùy chỉnh theo hồ sơ (ghi đè ngưỡng mặc định) |
| Giấy tờ & chi phí | `documents` | loại giấy tờ, tiêu đề, đường dẫn file, loại file, gắn với đợt / lịch khám |
| | `audio_notes` | file ghi âm dặn dò, thời lượng, gắn với lịch khám |
| | `expenses` | loại chi phí, số tiền, phần BHYT chi trả, ngày, gắn với đợt / lịch khám |
| Chia sẻ | `family_links` | kết nối gia đình: hồ sơ được xem, chiều (mình chia sẻ đi / người khác chia sẻ cho mình), tên & quan hệ người kia, từng quyền (xem thuốc, xem cữ đã uống, nhận cảnh báo), trạng thái (chờ / đang hoạt động / đã thu hồi), thời điểm đồng ý / thu hồi |
| | `share_links` | mã / link tạm cho bác sĩ, phạm vi, hết hạn, thu hồi |
| Hệ thống | `scheduled_notifications` | ánh xạ thông báo đã lên lịch ↔ thực thể (để hủy / lên lịch lại) |
| | `app_settings` | key–value: theme, Sick-Day Mode, giờ nhắc mặc định… |
| | `consents` | nhật ký đồng ý: loại (Medical Disclaimer, thông báo xử lý dữ liệu, đồng bộ cloud, chia sẻ người thân, chia sẻ bác sĩ), phiên bản văn bản, thời điểm đồng ý, thời điểm rút lại |

### 5.5 Yêu cầu kỹ thuật cho thông báo
- Xin quyền thông báo đúng lúc (khi người dùng thêm thuốc / lịch khám đầu tiên), có màn hình giải thích trước hộp thoại hệ thống, xử lý trường hợp bị từ chối (hướng dẫn mở Cài đặt máy).
- Android: notification channel riêng cho **Nhắc thuốc** (ưu tiên cao) và **Lịch khám**; màu nhấn navy.
- Nút hành động trên thông báo nhắc thuốc: **Đã uống**, **Nhắc lại sau 10 phút**, **Bỏ qua** (dùng notification categories); xử lý được cả khi app đang tắt.
- iOS giới hạn **64** thông báo cục bộ đang chờ → **lên lịch cuốn chiếu** (chỉ lên lịch vài ngày tới, tự lên lịch lại khi mở app / quay lại foreground và sau mỗi thay đổi thuốc hoặc lịch).
- Lưu `notification_id` vào `scheduled_notifications`; sửa / xóa / tạm dừng thuốc hoặc lịch khám thì hủy và lên lịch lại tương ứng.
- Nội dung thông báo có tên hồ sơ khi có nhiều thành viên (VD: "Bố · 08:00 — Đến giờ uống thuốc"). Có tùy chọn **ẩn tên thuốc** trên màn hình khóa.

### 5.6 Services & đồng bộ
- Mọi thao tác dữ liệu đi qua `repositories`; UI không viết SQL trực tiếp.
- `services/sync` định nghĩa interface `SyncService`; bản PocketBase là mặc định khi đã kết nối gia đình, không kết nối thì không gọi mạng.
- **Chỉ đồng bộ phần tối thiểu:** danh sách thuốc + lịch, trạng thái từng cữ (đã uống / chưa xác nhận / quên), tạm dừng, cảnh báo sắp hết thuốc. Triệu chứng, chỉ số, ảnh, ghi âm, câu hỏi bác sĩ **không** đồng bộ, trừ khi ông bà bật chia sẻ riêng từng mục (Milestone 5).
- Chiến lược: local-first, đẩy thay đổi theo `updated_at`, xung đột last-write-wins kèm xóa mềm; máy của ông bà là nguồn dữ liệu chính, máy con cháu chỉ đọc.
- **Thông báo đẩy cho con cháu** (VD: "Bố chưa xác nhận cữ 8:00 sau 60 phút") chỉ ghi nội dung chung chung ("Có cập nhật từ Bố"); chi tiết chỉ hiện khi mở app, vì thông báo đẩy đi qua máy chủ Expo/Apple/Google ở nước ngoài.
- Biến môi trường qua `.env` (`EXPO_PUBLIC_*` chỉ cho giá trị không bí mật), có `.env.example`.

## 6. MODULE TÍNH NĂNG

### 6.1 Nhắc uống thuốc thông minh & thích ứng nhịp sinh hoạt
- Hiển thị cữ thuốc theo **giờ cố định** hoặc theo **khung sinh hoạt**: Khi thức dậy, Trước ăn sáng, Sau ăn sáng, Sau ăn trưa, Sau ăn tối, Trước khi đi ngủ. Khung sinh hoạt = giờ sinh hoạt của hồ sơ + độ lệch (VD: "Sau ăn trưa" = giờ ăn trưa + 30 phút).
- Thao tác nhanh trên mỗi cữ (trong app và trên thông báo):
  - **Đã uống** → ghi giờ uống, trừ số viên.
  - **Nhắc lại sau 10 / 15 phút.**
  - **Đã uống trễ lúc…** → chọn giờ thực tế; nếu trễ nhiều, hiện nhắc nhở nhẹ: "Nếu không chắc có nên uống bù hay không, hãy hỏi bác sĩ hoặc dược sĩ." (không tự khuyên uống bù hay gấp đôi liều).
  - **Bỏ qua** (kèm lý do tùy chọn).
  - Cho phép **hoàn tác** thao tác vừa thực hiện.
- **Theo dõi phản ứng sau uống:** gắn nhanh *Bình thường / Buồn ngủ / Khó chịu tiêu hóa / Chóng mặt / Khác (ghi chú)*. Thuốc được người dùng đánh dấu "có thể gây buồn ngủ / chóng mặt" → hiện lưu ý an toàn (VD: tránh lái xe, vận hành máy móc khi thấy buồn ngủ hoặc chóng mặt).
- **Đếm viên & tiến độ liệu trình:** tự trừ số viên khi uống, hiển thị tiến độ (VD: *Ngày 4/7*), cảnh báo **sắp hết thuốc** khi số ngày còn lại ≤ ngưỡng (mặc định 3 ngày, chỉnh được).
- **Tạm dừng có lý do** (VD: trước xét nghiệm / nội soi) với ngày tự bật lại; trong thời gian tạm dừng không nhắc và không tính là quên uống.
- **Đổi nhịp sinh hoạt:** bộ giờ sinh hoạt riêng cho ngày làm / ngày nghỉ / ca làm; đổi giờ sinh hoạt → các lịch theo khung tự tính lại. Khi phát hiện **đổi múi giờ**, hỏi người dùng: theo giờ địa phương mới hay giữ khoảng cách giữa các cữ như cũ.
- **Đơn thuốc:** chụp ảnh đơn + nhập nhanh danh sách thuốc (nhập tay; OCR ngoài phạm vi trừ khi tôi yêu cầu). Khi thêm thuốc, **đối chiếu với dị ứng đã lưu** (so khớp tên / hoạt chất, chỉ mang tính nhắc nhở). Khi có đơn mới, **so sánh với đơn cũ**: thuốc mới, thuốc ngừng, thuốc đổi liều / cách dùng.

### 6.2 Đợt điều trị (Care Journey) & hành trình đi khám (trước / trong / sau khám)
- **Đợt điều trị / Vấn đề sức khỏe** (VD: *Đợt viêm xoang*, *Theo dõi huyết áp định kỳ*) gom chung: lịch khám, thuốc & đơn thuốc, triệu chứng, chỉ số, giấy tờ, chi phí — xem dạng dòng thời gian.
- **Lịch khám & nhắc đa mốc:** nhắc trước **3 ngày**, trước **1 ngày** và **buổi sáng ngày khám** (giờ nhắc mặc định chỉnh được trong Cài đặt); bỏ qua mốc đã qua; sửa / hủy lịch → cập nhật thông báo.
- **Checklist "Cần mang gì khi đi khám":** mẫu gợi ý theo loại lịch hẹn (khám lần đầu, tái khám, xét nghiệm máu, siêu âm / X-quang, nội soi, tiêm chủng, khác): CCCD, thẻ BHYT, sổ khám / hồ sơ cũ, kết quả cũ, danh sách thuốc & thực phẩm chức năng đang dùng, lưu ý nhịn ăn / uống nước **theo hướng dẫn của cơ sở y tế**. Người dùng thêm / sửa / xóa / đánh dấu xong.
- **Sổ "Câu hỏi cho bác sĩ":** ghi nhanh từ bất kỳ đâu, gắn vào lịch khám sắp tới; đánh dấu đã hỏi và ghi câu trả lời; câu hỏi chưa hỏi tự chuyển sang lần khám sau.
- **Bản tóm tắt 1 trang trước khi vào khám:** thông tin hồ sơ (tên, tuổi, nhóm máu) · **dị ứng (nổi bật)** · bệnh nền · thuốc đang dùng (tên, liều, giờ) · triệu chứng & chỉ số gần đây kể từ lần khám trước · câu hỏi chưa hỏi. Có **chế độ trình bày** chữ to, giữ màn hình sáng để đưa bác sĩ xem.
- **Trong & sau buổi khám:** ghi chú dặn dò, tạo nhanh lịch tái khám tiếp theo, đính kèm **ghi âm ngắn** phần dặn dò (giới hạn thời lượng, xin quyền micro, phát lại, xóa).

### 6.3 Chỉ số sinh tồn, nhật ký triệu chứng & Sick-Day Mode
- **Ghi nhanh 1 chạm khi đang mệt:** sốt, đau đầu, buồn nôn, chóng mặt, ho, đau bụng, mệt mỏi, khác — tự gắn mốc thời gian, có thể bổ sung mức độ / nhiệt độ sau. Gợi ý bật Sick-Day Mode.
- **Sick-Day Mode:** bật / tắt bằng 1 chạm ở màn hình Hôm nay và Cài đặt; màn hình chỉ còn: cữ thuốc kế tiếp với nút "Đã uống" thật to, ghi nhanh triệu chứng, gọi người liên hệ khẩn cấp, Thẻ y tế khẩn cấp, nút tắt chế độ. Hoạt động ở cả Sáng và Tối.
- **Chỉ số sinh tồn:** huyết áp (tâm thu / tâm trương, mmHg), nhịp tim (bpm), đường huyết (mặc định mmol/L, hỗ trợ mg/dL; lúc đói / sau ăn), cân nặng (kg), nhiệt độ (°C), SpO₂ (%).
- **Biểu đồ xu hướng** (7 ngày / 30 ngày / 3 tháng) có đường ngưỡng; điểm vượt ngưỡng được đánh dấu bằng màu **và** hình dạng / icon.
- **Ngưỡng tham chiếu phổ biến cho người trưởng thành** (đặt trong `constants/vitalThresholds.ts`, chỉnh được theo hồ sơ, luôn ghi "chỉ mang tính tham khảo, không áp dụng cho trẻ em / phụ nữ mang thai"): huyết áp ≥ 140/90 hoặc < 90/60 mmHg; nhịp tim lúc nghỉ < 60 hoặc > 100 bpm; đường huyết lúc đói ≥ 7,0 hoặc < 3,9 mmol/L; nhiệt độ ≥ 38,0 °C; SpO₂ < 95%. Khi vượt ngưỡng: nhắc nhẹ liên hệ bác sĩ; không đưa ra chẩn đoán.

### 6.4 Giấy tờ, chi phí, đa hồ sơ & chia sẻ
- **Kho giấy tờ:** phân loại *Đơn thuốc, Phiếu xét nghiệm, Siêu âm / X-quang, Giấy hẹn tái khám, Giấy nghỉ ốm, Khác*; chụp / chọn ảnh, **sao chép file vào thư mục lưu trữ bền của app** (không giữ URI cache của image picker), gắn vào đợt điều trị / lịch khám, xem toàn màn hình, xóa.
- **Chi phí:** ghi nhanh số tiền (VNĐ), loại (khám, thuốc, xét nghiệm, chẩn đoán hình ảnh, đi lại, khác), phần BHYT chi trả; tổng hợp theo đợt điều trị và theo tháng.
- **Đa hồ sơ gia đình:** bản thân, con nhỏ, bố mẹ, vợ / chồng…; chuyển hồ sơ nhanh ở header; mọi dữ liệu và thông báo tách theo hồ sơ.
- **Thẻ y tế khẩn cấp (Emergency Card):** nhóm máu, dị ứng nghiêm trọng, bệnh nền chính, thuốc đang dùng, người liên hệ khẩn cấp (chạm để gọi) — mở được trong 1 chạm từ màn hình Hôm nay và trong Sick-Day Mode.
- **Đồng hành cùng người thân (có phân quyền) — Milestone 2.5:** con cháu đăng nhập bằng số điện thoại + OTP; ông bà ghép máy bằng QR từ máy con; ông bà chọn từng quyền (xem danh sách thuốc, xem cữ đã uống, cho phép gửi cảnh báo trễ cữ / sắp hết thuốc) và thu hồi bất kỳ lúc nào. Mở rộng chia sẻ chỉ số, triệu chứng ở Milestone 5.
- **Chia sẻ cho bác sĩ:** tạo **mã QR / link tạm thời** chỉ đọc, có thời hạn (mặc định 24 giờ), có phạm vi (VD: chỉ bản tóm tắt), thu hồi được. Đề xuất phương án kỹ thuật (cần backend) và hỏi tôi trước khi làm.
- **Xóa tài khoản & toàn bộ dữ liệu:** xác nhận 2 bước; xóa DB, file ảnh / ghi âm, thông báo đã lên lịch, cài đặt, và dữ liệu trên server (nếu đã đồng bộ). Đáp ứng yêu cầu của App Store (xóa được ngay trong app) và Google Play (kèm link web để yêu cầu xóa dữ liệu).

### 6.5 Cài đặt
Giao diện (Theo hệ thống / Sáng / Tối) · Sick-Day Mode · Giờ sinh hoạt theo loại ngày · Giờ nhắc lịch khám mặc định · Ngưỡng chỉ số & đơn vị đường huyết · Ẩn tên thuốc trong thông báo · Quyền thông báo · Medical Disclaimer · Chính sách quyền riêng tư · Xóa dữ liệu.

## 7. ĐIỀU HƯỚNG & BỐ CỤC
- Tab dưới: **Hôm nay · Đợt điều trị · Lịch khám · Sức khỏe · Cài đặt**. Trên tablet: 2 cột Master-Detail cho các danh sách chính (hoàn thiện ở Milestone 4).
- Header: tên hồ sơ đang xem (chuyển hồ sơ ở Milestone 5), nút bật Sick-Day Mode, nút Thẻ y tế khẩn cấp.
- Màn hình **Hôm nay:** cữ thuốc trong ngày nhóm theo khung giờ / sinh hoạt kèm trạng thái, cảnh báo sắp hết thuốc, lịch khám sắp tới (đếm ngược), nút ghi nhanh triệu chứng, dòng disclaimer ngắn.
- Mọi màn hình có dữ liệu đều có 3 trạng thái: **đang tải · trống (kèm hướng dẫn hành động) · lỗi (kèm nút thử lại)**.
- Định dạng Việt Nam: ngày `dd/MM/yyyy`, giờ 24h, tiền `1.250.000 ₫`.

## 8. LỘ TRÌNH MILESTONE & ĐIỀU KIỆN HOÀN THÀNH (DoD)
Mỗi milestone được chia thành các bước nhỏ (VD: 1A, 1B, 1C). **Mỗi lần trả lời chỉ làm một bước.**

### Milestone 1 — Nền móng, theme navy Sáng/Tối, schema, màn hình chính & Sick-Day
- **1A — Khởi tạo dự án & design system:** tạo dự án Expo + TypeScript strict + expo-router + ESLint; cấu trúc thư mục mục 5.3; `app.json` / `app.config.ts` (tên Kề Bên, `slug`, `scheme`, bundle id / package dạng placeholder để tôi điền, `userInterfaceStyle: "automatic"`, `ios.supportsTablet: true`, icon / splash nền navy cho Sáng và Tối); `eas.json`; `.gitignore`; `.env.example`; `README.md`. Theme: tokens mục 4, `ThemeProvider`, `useTheme`, theme cho React Navigation, các UI component cơ bản; màn hình Cài đặt có bộ chọn **Theo hệ thống / Sáng / Tối** (lưu tạm trong bộ nhớ, lưu bền ở 1B).
- **1B — SQLite:** kết nối DB, migration v1 với **toàn bộ** bảng ở mục 5.4, kiểu TypeScript tương ứng, repository cơ bản, dữ liệu mẫu tiếng Việt (2 hồ sơ, 2 đợt điều trị, 3–4 thuốc — trong đó 1 thuốc gây buồn ngủ và 1 thuốc sắp hết, 1 lịch tái khám trong 3 ngày tới, chỉ số huyết áp 7 ngày, vài triệu chứng, 1 dị ứng), hàm reset DB cho môi trường dev. Lưu cài đặt theme vào `app_settings`, giữ splash cho tới khi load xong. Bảng `consents` theo mục 10; bảng `family_links` và cột `remote_id` / `synced_at` sẵn cho Milestone 2.5 (chưa gọi mạng); màn hình "Dữ liệu (dev)" để xem số bản ghi, nạp lại dữ liệu mẫu, xóa sạch; không cài SDK analytics/crash report nào.
- **1C — Màn hình chính & Sick-Day:** khung 5 tab (tab chưa làm hiển thị "Sẽ có ở Milestone X"); màn hình **Hôm nay** đọc dữ liệu thật từ SQLite; **Sick-Day Mode** (bật / tắt, lưu bền, giao diện tối giản chữ to); màn hình chào lần đầu mở app gồm Medical Disclaimer + Thông báo xử lý dữ liệu cá nhân (tóm tắt: dữ liệu chỉ lưu trên máy, quyền của người dùng) — người dùng chủ động bấm đồng ý (không tick sẵn), lưu phiên bản văn bản vào `consents`; hook `useResponsive` (breakpoint 768) và giới hạn chiều rộng nội dung trên tablet.
- **DoD M1:** `npx expo start` chạy không lỗi trên iOS & Android; `tsc` và `lint` sạch; đổi Sáng / Tối tức thì, giữ nguyên sau khi tắt mở app, không nháy trắng; Sick-Day lưu bền và mọi chữ ≥ 18px; dữ liệu mẫu hiển thị đúng; cả 4 tổ hợp theme × Sick-Day đều đọc rõ.

### Milestone 2 — Nhắc uống thuốc thông minh
Chia nhỏ khi làm: **2A** thuốc, lịch uống, giờ sinh hoạt, sinh `dose_events`, unit test · **2B** thao tác trên cữ, đếm viên, tác dụng phụ, tạm dừng, lịch sử 7 ngày · **2C** thông báo cục bộ, đổi múi giờ.
Thêm / sửa / xóa thuốc & lịch uống (giờ cố định / khung sinh hoạt); giờ sinh hoạt theo loại ngày; sinh `dose_events`; thao tác Đã uống / Nhắc lại 10–15 phút / Uống trễ lúc… / Bỏ qua / Hoàn tác; gắn tag tác dụng phụ + lưu ý an toàn; đếm viên, tiến độ liệu trình, cảnh báo sắp hết; tạm dừng có lý do & tự bật lại; xử lý đổi múi giờ; local notification theo mục 5.5 (quyền, channel, nút hành động, lên lịch cuốn chiếu, lên lịch lại); lịch sử uống 7 ngày; unit test cho logic tính lịch và đếm viên.
- **DoD M2:** nhận thông báo đúng giờ trên máy thật (kể cả khi app tắt); bấm nút trên thông báo cập nhật đúng DB; số viên và tiến độ chính xác; khi tạm dừng không có thông báo; test pass.

### Milestone 2.5 — Tài khoản & Gia đình (con cháu theo dõi ông bà)
Chia nhỏ khi làm (VD: 2.5A máy chủ, 2.5B đăng nhập, 2.5C ghép gia đình, 2.5D đồng bộ & cảnh báo):
- **Máy chủ:** PocketBase chạy trên máy tính cá nhân; thư mục `server/` gồm migrations tạo collection và collection rule (con cháu chỉ đọc được hồ sơ đã được cho phép, chỉ máy ông bà ghi được dữ liệu của ông bà); README hướng dẫn chạy trên Windows / macOS.
- **Đăng nhập con cháu:** số điện thoại + OTP 6 số qua route tùy chỉnh của PocketBase; **dev dùng mã giả** cho danh sách số thử nghiệm; giới hạn số lần gửi mã (chống spam đốt tiền SMS); lưu phiên đăng nhập bằng `expo-secure-store`.
- **Ghép máy ông bà:** máy con tạo mã ghép dùng một lần (QR + mã 6 số, hết hạn 10 phút); máy ông bà chọn "Con cháu cài giúp" → quét QR (`expo-camera`) → nhận tài khoản thiết bị (không cần số điện thoại) → **màn hình đồng ý chữ to** chọn từng quyền → ghi `consents` + `family_links`.
- **Đồng bộ tối thiểu** theo mục 5.6; máy con cháu có màn hình "Gia đình" xem từng người thân: thuốc hôm nay, cữ nào đã uống / chưa, cảnh báo sắp hết thuốc; ông bà có màn hình xem ai đang theo dõi mình và nút thu hồi.
- **Cảnh báo cho con cháu** khi cữ chưa được xác nhận sau X phút (mặc định 60) — thông báo đẩy nội dung chung chung.
- **Không có mạng:** máy ông bà vẫn nhắc và ghi bình thường, có mạng thì tự đồng bộ.
- **DoD M2.5:** trên 2 điện thoại thật + PocketBase chạy trên máy tính: con đăng nhập bằng số thử nghiệm, ghép máy ông bà bằng QR, ông bà đồng ý; ông bà bấm "Đã uống" → máy con thấy trong vài giây; tắt mạng máy ông bà rồi bật lại → dữ liệu tự đồng bộ; ông bà thu hồi → máy con mất quyền xem ngay. Chỉ dùng dữ liệu thử nghiệm hoặc dữ liệu người nhà đã đồng ý bằng văn bản (mục 10.5).

### Milestone 3 — Đợt điều trị & hành trình đi khám
CRUD đợt điều trị + dòng thời gian; lịch khám + nhắc đa mốc (3 ngày, 1 ngày, sáng ngày khám); checklist theo mẫu loại lịch hẹn; sổ câu hỏi cho bác sĩ; quản lý dị ứng & bệnh nền; bản tóm tắt 1 trang + chế độ trình bày; ghi chú sau khám + tạo lịch tái khám; đơn thuốc (chụp ảnh, nhập nhanh, đối chiếu dị ứng, so sánh đơn mới / cũ); nhật ký triệu chứng 1 chạm (nút nổi).
- **DoD M3:** tạo lịch khám → có đủ 3 thông báo ở đúng mốc; bản tóm tắt tổng hợp đúng dữ liệu của hồ sơ; cảnh báo dị ứng xuất hiện khi thêm thuốc trùng.

### Milestone 4 — Chỉ số, giấy tờ, ghi âm, chi phí & Tablet 2 cột
Nhập chỉ số sinh tồn + biểu đồ có ngưỡng (đúng màu Sáng / Tối); kho giấy tờ phân loại (camera / thư viện, lưu file bền); ghi âm dặn dò (`expo-audio`); chi phí + tổng hợp theo đợt / tháng; bố cục **Master-Detail 2 cột** cho các danh sách chính trên tablet, hỗ trợ xoay ngang.
- **DoD M4:** biểu đồ đánh dấu đúng điểm vượt ngưỡng; ảnh / ghi âm còn nguyên sau khi khởi động lại app; iPad và tablet Android hiển thị 2 cột đúng ở cả dọc và ngang.

### Milestone 5 — Gia đình, khẩn cấp, chia sẻ & Cloud
Đa hồ sơ gia đình trên cùng một máy + chuyển hồ sơ (xác nhận quyền quản lý hồ sơ của người khác); Thẻ y tế khẩn cấp; mở rộng chia sẻ cho người thân (chỉ số, triệu chứng — từng mục do ông bà bật); mã QR / link tạm thời cho bác sĩ; chọn nhà cung cấp SMS thật (**hỏi tôi trước**); triển khai PocketBase lên máy chủ tại Việt Nam, sao lưu tự động; xóa tài khoản & toàn bộ dữ liệu (cả trên máy chủ). **Mọi tính năng gửi dữ liệu ra khỏi máy phải nằm sau feature flag và chỉ được bật khi "Cổng pháp lý B" (mục 10) đã hoàn tất.**
- **DoD M5:** dữ liệu và thông báo tách đúng theo hồ sơ; app vẫn chạy đầy đủ khi offline; link chia sẻ hết hạn / thu hồi đúng; xóa dữ liệu không để sót file hay thông báo.

### Milestone 6 — Hoàn thiện & phát hành
Privacy Policy + Điều khoản sử dụng + Medical Disclaimer bản cuối (tiếng Việt), trang web công khai về quyền riêng tư và yêu cầu xóa dữ liệu, tài khoản nhà phát triển dạng tổ chức, **luật sư rà soát trước khi nộp** (danh sách câu hỏi ở `docs/LEGAL_COMPLIANCE_VN.md`); chuỗi giải thích quyền (camera, thư viện ảnh, micro, thông báo) bằng tiếng Việt; icon / splash hoàn chỉnh; hướng dẫn điền **Data safety** (Google Play) và **App Privacy** (App Store); checklist test end-to-end trên điện thoại & tablet thật (Sáng / Tối, Sick-Day, offline, đổi múi giờ); tối ưu hiệu năng; build `.aab` / `.ipa` bằng EAS, hướng dẫn `eas submit`, quản lý version / build number.

## 9. QUY TẮC LÀM VIỆC (BẮT BUỘC TUÂN THỦ)
1. **Định dạng mỗi câu trả lời** (cho một bước):
   - **(a) Mục tiêu bước này** — 2–4 dòng.
   - **(b) File tạo / sửa** — dạng cây, đánh dấu `[MỚI]` / `[SỬA]`.
   - **(c) Lệnh cài đặt** — `npx expo install …` (hoặc `npm i -D …` cho công cụ dev).
   - **(d) Code** — **đầy đủ từng file**, không viết tắt kiểu `// ... phần còn lại giữ nguyên`. Nếu chỉ sửa một đoạn nhỏ trong file dài, chỉ rõ vị trí và đưa đoạn thay thế hoàn chỉnh.
   - **(e) Cách chạy thử** — lệnh cụ thể và nên test trên đâu (Expo Go / development build; iOS / Android; điện thoại / tablet; Sáng / Tối; Sick-Day).
   - **(f) Checklist kiểm thử** — các ô `- [ ]` để tôi tự tick.
   - **(g) Giả định & giới hạn** — những gì chưa làm, chuyển sang bước sau.
   - **(h) Gợi ý commit message** (Conventional Commits, VD: `feat(theme): add navy light/dark tokens`).
2. **Dừng lại sau mỗi bước** để tôi test và review. Kết thúc bằng: *"Hết bước X. Hãy chạy thử và phản hồi — tôi chỉ chuyển sang bước tiếp theo khi bạn xác nhận."* Không tự làm tiếp, không gộp nhiều bước.
3. **Chất lượng code:** TypeScript strict, không dùng `any` (trừ khi có giải thích); kiểu domain đặt trong `src/types`; `try/catch` cho thao tác DB / file / thông báo, kèm thông báo lỗi tiếng Việt thân thiện; mọi màn hình dữ liệu có loading / empty / error; không hardcode màu, cỡ chữ (dùng theme) hay chuỗi giao diện (đặt trong `constants/strings.vi.ts`); component nhỏ, tách logic khỏi UI (hooks / repositories).
4. **Không phá vỡ cái đã làm:** mọi chỉnh sửa phải giữ nguyên hoạt động của các bước trước; thay đổi DB chỉ qua migration mới.
5. **Khi tôi báo lỗi:** nêu nguyên nhân gốc (1–3 câu), đưa bản sửa đầy đủ của các file liên quan và cách kiểm tra lại. Thiếu thông tin thì hỏi log / ảnh chụp cụ thể.
6. **Cập nhật README** sau mỗi milestone: tiến độ, cách chạy, lưu ý mới.
7. **Không được:** đưa ra liều dùng, chẩn đoán hay lời khuyên điều trị; gửi dữ liệu sức khỏe ra ngoài thiết bị khi người dùng chưa bật; thêm analytics / quảng cáo / crash report gửi dữ liệu đi; hardcode secret; cài thư viện ngoài danh sách khi chưa hỏi; dùng API / thư viện đã deprecated; thu thập số CCCD hay dữ liệu không cần thiết; tư vấn khám từ xa, bán hoặc quảng cáo thuốc.
8. **Kiểm tra pháp lý mỗi bước:** trong phần (g) của mỗi câu trả lời, nêu ngắn gọn bước này có tác động pháp lý gì (dữ liệu mới thu thập, quyền mới xin, dữ liệu rời khỏi máy hay không) và đã xử lý theo mục 10 thế nào.

## 10. PHÁP LÝ VIỆT NAM (BẮT BUỘC)
Chi tiết, nguồn và các điểm cần luật sư xác nhận: `docs/LEGAL_COMPLIANCE_VN.md`. Tài liệu này không phải tư vấn pháp lý; khi gặp tình huống chưa rõ, dừng lại và hỏi tôi.

### 10.1 Văn bản chính
- Luật Bảo vệ dữ liệu cá nhân 91/2025/QH15 và Nghị định 356/2025/NĐ-CP (hiệu lực 01/01/2026); xử phạt theo Nghị định 330/2026/NĐ-CP (từ 19/08/2026).
- Luật An ninh mạng 116/2025/QH15 (từ 01/07/2026) — lưu trữ dữ liệu tại Việt Nam khi có dịch vụ trực tuyến.
- Nghị định 98/2021/NĐ-CP về trang thiết bị y tế — app phải giữ mục đích "ghi nhớ, quản lý thông tin", không chẩn đoán/theo dõi y khoa.
- Luật Thương mại điện tử 122/2025/QH15 và Luật Bảo vệ quyền lợi người tiêu dùng 2023 — khi thu phí.
- Chính sách Google Play (Health apps declaration, Data safety) và Apple (5.1.1(ix): app y tế nên do pháp nhân nộp; xóa tài khoản trong app).

### 10.2 Giai đoạn A — chỉ lưu trên máy (người dùng không kết nối gia đình)
Người dùng không đăng nhập / không ghép gia đình thì dữ liệu chỉ nằm trên máy; không gọi máy chủ, không SDK gửi dữ liệu ra ngoài. Người dùng tự chia sẻ qua nút Share của hệ điều hành. Vẫn bắt buộc: Medical Disclaimer, thông báo xử lý dữ liệu, giải thích trước khi xin từng quyền, xóa toàn bộ dữ liệu (xóa thật), xuất dữ liệu, tối thiểu hóa dữ liệu, nhật ký đồng ý `consents`.

### 10.3 Giai đoạn B — "Cổng pháp lý B" (trước khi người ngoài nhóm dùng tính năng gia đình, đồng bộ, QR bác sĩ)
"Phi thương mại" **không** được miễn các nghĩa vụ này: Luật 91/2025 áp dụng cho cả cá nhân xử lý dữ liệu, và dữ liệu sức khỏe là dữ liệu nhạy cảm.
Chỉ bật khi đã có: pháp nhân + tài khoản tổ chức; hồ sơ đánh giá tác động xử lý dữ liệu (DPIA) nộp cơ quan chuyên trách; máy chủ tại Việt Nam (hoặc hồ sơ chuyển dữ liệu ra nước ngoài); đồng ý riêng cho từng mục đích, rút lại dễ dàng; quy trình báo vi phạm trong 72 giờ; mã hóa, phân quyền, nhật ký truy cập; quy trình xử lý yêu cầu truy cập/sửa/xóa/xuất; luật sư đã rà soát.

### 10.4 Quy tắc sản phẩm
- Dữ liệu của người khác (bố mẹ, vợ/chồng, con): người dùng xác nhận mình có quyền quản lý; dữ liệu trẻ em do cha mẹ/người đại diện quyết định.
- Ghi âm lời dặn của bác sĩ: luôn nhắc xin phép trước khi ghi.
- Ngưỡng chỉ số chỉ là tham khảo, người dùng chỉnh được; không dùng từ "chẩn đoán", "điều trị", "phát hiện bệnh".
- Mô tả cửa hàng ghi rõ app không phải thiết bị y tế, không chẩn đoán, điều trị hay phòng bệnh.
- Ông bà là người trưởng thành: **chính ông bà đồng ý** trên máy của mình; con cháu không đồng ý thay (trừ người giám hộ theo pháp luật).
- Không lưu số CCCD; số điện thoại chỉ dùng để đăng nhập, không hiển thị cho người khác ngoài gia đình đã kết nối.

### 10.5 Máy chủ chạy trên máy tính cá nhân (giai đoạn phát triển)
- Được dùng để phát triển và thử nghiệm nội bộ với **dữ liệu giả** hoặc với **người nhà của thành viên nhóm đã được giải thích và đồng ý bằng văn bản** (giữ bản đồng ý).
- Không mở cho người ngoài; không dùng đường hầm qua dịch vụ nước ngoài (VD: Cloudflare Tunnel) cho dữ liệu thật khi chưa đánh giá chuyển dữ liệu ra nước ngoài.
- Mã hóa ổ đĩa máy tính, đặt mật khẩu tài khoản admin PocketBase mạnh, không commit dữ liệu (`server/pb_data/`) lên Git; xóa dữ liệu thử nghiệm khi kết thúc đợt thử.

## 11. BẮT ĐẦU
Hãy bắt đầu với **bước tiếp theo chưa hoàn thành** trong lộ trình (xem mục "Tiến độ" trong `README.md`; bước đầu tiên là **Milestone 1 — Bước 1A**). Trước khi viết code, tóm tắt tối đa 10 dòng: kiến trúc tổng thể, các quyết định chính (phiên bản Expo SDK, cách tổ chức theme Sáng / Tối, cách lưu cài đặt) và các giả định bạn đặt ra. Sau đó thực hiện Bước 1A theo đúng định dạng ở mục 9 rồi dừng lại.
