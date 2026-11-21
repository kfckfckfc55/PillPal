# Máy chủ gia đình Kề Bên (PocketBase)

Máy chủ để **con cháu theo dõi việc uống thuốc của ông bà** (Milestone 2.5). Giai đoạn phát triển chạy ngay trên **máy tính cá nhân** (macOS / Windows), điện thoại kết nối qua Wi-Fi trong nhà.

> ⚠️ **Chỉ dùng dữ liệu giả**, hoặc dữ liệu của **người nhà thành viên nhóm đã được giải thích và đồng ý bằng văn bản** (giữ lại bản đồng ý). Không mở máy chủ ra Internet. Chi tiết: mục 10.5 trong `docs/KEBEN_MASTER_PROMPT.md` và `docs/LEGAL_COMPLIANCE_VN.md`.

| | |
|---|---|
| Phần mềm | [PocketBase](https://pocketbase.io) **v0.40.6** (một file chạy duy nhất, SQLite, ~50 MB) |
| Schema | `pb_migrations/` — tự chạy khi khởi động máy chủ |
| Logic phía máy chủ | `pb_hooks/` (JavaScript) |
| Kiểm tra luật truy cập | `tests/rules.test.mjs` (Node 22+, không cần cài thư viện) |
| Dữ liệu | `pb_data/` — **không commit** (đã có trong `.gitignore`) |

## 1. Tải PocketBase (một lần)

Tải đúng phiên bản **v0.40.6** tại trang phát hành của PocketBase trên GitHub (`github.com/pocketbase/pocketbase/releases`, tag `v0.40.6`):

| Máy | File |
|---|---|
| Mac chip Apple (M1/M2/M3/M4) | `pocketbase_0.40.6_darwin_arm64.zip` |
| Mac chip Intel | `pocketbase_0.40.6_darwin_amd64.zip` |
| Windows | `pocketbase_0.40.6_windows_amd64.zip` |

Giải nén, đặt file `pocketbase` (Windows: `pocketbase.exe`) vào **thư mục `server/` này**.

**macOS** chặn file tải từ Internet chưa ký → gỡ chặn một lần:

```bash
xattr -d com.apple.quarantine ./pocketbase
```

(hoặc mở **System Settings → Privacy & Security** → *Open Anyway*.)

> Có Go 1.24+? Có thể tự build đúng bản này từ mã nguồn chính thức:
> `go install github.com/pocketbase/pocketbase/examples/base@v0.40.6` rồi đổi tên file `base` thành `pocketbase`.

## 2. Tạo tài khoản quản trị & khóa bảng quản trị (một lần)

Chạy trong thư mục `server/`. Dùng **mật khẩu mạnh** (≥ 16 ký tự), lưu trong trình quản lý mật khẩu — không ghi vào repo.

macOS:

```bash
./pocketbase superuser upsert ten-ban@example.com 'MAT-KHAU-MANH-CUA-BAN'
```

```bash
./pocketbase superuser ips 127.0.0.1 ::1
```

Windows (PowerShell):

```powershell
.\pocketbase.exe superuser upsert ten-ban@example.com 'MAT-KHAU-MANH-CUA-BAN'
```

```powershell
.\pocketbase.exe superuser ips 127.0.0.1 ::1
```

Lệnh `superuser ips` chỉ cho phép **đăng nhập bảng quản trị từ chính máy tính này** (điện thoại trong mạng không vào được trang quản trị).

## 3. Chạy máy chủ

macOS:

```bash
./pocketbase serve --http=0.0.0.0:8090
```

Windows (PowerShell):

```powershell
.\pocketbase.exe serve --http=0.0.0.0:8090
```

- `0.0.0.0` cho phép điện thoại trong **cùng mạng Wi-Fi** kết nối. Khi máy hỏi tường lửa: macOS → *Allow*; Windows → chỉ tick **Private networks** (mạng riêng), **không** tick Public.
- Lần đầu chạy, PocketBase tự áp dụng các file trong `pb_migrations/` (tạo bảng, luật truy cập, cài đặt).
- Bảng quản trị: <http://127.0.0.1:8090/_/> (chỉ mở trên máy tính này).
- Dừng máy chủ: `Ctrl + C`.

**(Nên dùng) Mã hóa phần cài đặt của máy chủ** bằng một khóa 32 ký tự cố định (lưu trong trình quản lý mật khẩu; mất khóa = không mở được cài đặt):

```bash
export PB_ENCRYPTION_KEY='32-ky-tu-ngau-nhien-cua-ban-xxxx'
```

```bash
./pocketbase serve --http=0.0.0.0:8090 --encryptionEnv=PB_ENCRYPTION_KEY
```

(PowerShell: `$env:PB_ENCRYPTION_KEY='...'` rồi `.\pocketbase.exe serve --http=0.0.0.0:8090 --encryptionEnv=PB_ENCRYPTION_KEY`.)

## 3b. Bật đăng nhập thử nghiệm bằng OTP (bước 2.5B)

Con cháu đăng nhập bằng **số điện thoại + mã 6 số**. Giai đoạn này **chưa gửi SMS thật** (nhà cung cấp SMS chọn ở Milestone 5): chỉ các **số thử nghiệm** khai báo trong biến môi trường mới nhận được mã.

macOS:

```bash
KEBEN_TEST_PHONES=0900000001,0900000002 KEBEN_TEST_OTP=123456 ./pocketbase serve --http=0.0.0.0:8090
```

Windows (PowerShell):

```powershell
$env:KEBEN_TEST_PHONES='0900000001,0900000002'; $env:KEBEN_TEST_OTP='123456'; .\pocketbase.exe serve --http=0.0.0.0:8090
```

- `KEBEN_TEST_PHONES`: các số được nhận mã (phân cách bằng dấu phẩy). Số khác → app báo "Máy chủ thử nghiệm chỉ nhận số điện thoại thử nghiệm".
- `KEBEN_TEST_OTP`: mã giả cố định 6 số. Bỏ trống → mã **ngẫu nhiên** được in ra cửa sổ Terminal của máy chủ (`[keben-otp] Mã thử nghiệm cho 0900***001: 123456`).
- Có thể dùng thêm cờ `--encryptionEnv=PB_ENCRYPTION_KEY` như ở trên.

Bảo vệ chống dò mã / spam SMS (route `pb_hooks/otp.pb.js`):

| Quy tắc | Giá trị |
|---|---|
| Mã hết hạn | 5 phút |
| Gửi lại mã | sau 60 giây |
| Số mã / số điện thoại | ≤ 5 mỗi giờ, ≤ 10 mỗi ngày |
| Nhập sai | ≤ 5 lần / mã, sau đó phải xin mã mới |
| Gọi `/api/keben/*` | ≤ 20 lần / phút / địa chỉ IP |
| Lưu mã | chỉ lưu **mã đã băm** (sha256 + salt); không ai đọc được bảng mã qua API; tự xóa sau 24 giờ |

Khi xác nhận mã, app gửi kèm **phiên bản văn bản đồng ý** người dùng đã tick; máy chủ ghi `consent_version` + `consented_at` vào tài khoản. Phiên đăng nhập có hạn 30 ngày, app tự gia hạn mỗi lần mở.

## 4. Cho app trên điện thoại kết nối

1. Tìm IP của máy tính trong mạng Wi-Fi:
   - macOS: `ipconfig getifaddr en0` (VD `192.168.1.10`)
   - Windows: `ipconfig` → dòng *IPv4 Address* của Wi-Fi
2. Trên **điện thoại** (cùng Wi-Fi), mở trình duyệt vào `http://192.168.1.10:8090/api/health` → phải thấy `"API is healthy."`.
3. Ở thư mục gốc của dự án, tạo file `.env` (chép từ `.env.example`) và điền:

   ```
   EXPO_PUBLIC_POCKETBASE_URL=http://192.168.1.10:8090
   ```

4. Khởi động lại app với `npx expo start -c` → **Cài đặt → Dữ liệu (dev) → Kiểm tra kết nối máy chủ**.
5. Thử đăng nhập: thêm `EXPO_PUBLIC_FAMILY_FEATURE=1` vào `.env`, khởi động lại → **Cài đặt → Gia đình (thử nghiệm) → Mở màn hình Gia đình → Đăng nhập bằng số điện thoại** → nhập số thử nghiệm → mã.

> IP của máy tính có thể đổi khi bật lại Wi-Fi → nếu mất kết nối, kiểm tra lại IP và sửa `.env`.

## 5. Kiểm tra luật truy cập

Khi máy chủ đang chạy, mở cửa sổ Terminal khác trong `server/`:

macOS:

```bash
PB_SUPERUSER_EMAIL=ten-ban@example.com PB_SUPERUSER_PASSWORD='MAT-KHAU-MANH-CUA-BAN' PB_URL=http://127.0.0.1:8090 node tests/rules.test.mjs
```

Windows (PowerShell):

```powershell
$env:PB_SUPERUSER_EMAIL='ten-ban@example.com'; $env:PB_SUPERUSER_PASSWORD='MAT-KHAU-MANH-CUA-BAN'; $env:PB_URL='http://127.0.0.1:8090'; node tests/rules.test.mjs
```

Script tạo vài tài khoản **giả**, thử 12 tình huống (ai đọc / ghi được gì, thu hồi quyền, xóa tài khoản…) rồi tự xóa dữ liệu thử. Kết quả mong đợi: `TẤT CẢ LUẬT TRUY CẬP ĐỀU ĐÚNG`.

**Kiểm tra đăng nhập OTP** — quy tắc thuần (không cần máy chủ):

```bash
node tests/otp-rules.test.mjs
```

và trên máy chủ thật (khởi động máy chủ với `KEBEN_TEST_PHONES=0900000011,0900000012,0900000013,0900000014,0900000015 KEBEN_TEST_OTP=123456`, rồi ở cửa sổ khác):

```bash
PB_SUPERUSER_EMAIL=ten-ban@example.com PB_SUPERUSER_PASSWORD='MAT-KHAU-MANH-CUA-BAN' PB_URL=http://127.0.0.1:8090 node tests/otp.test.mjs
```

Kết quả mong đợi: `ĐĂNG NHẬP OTP HOẠT ĐỘNG ĐÚNG` (10 tình huống: số sai / số thật, gửi lại quá sớm, thiếu đồng ý, sai mã, đăng nhập, gia hạn phiên, không tự đổi số, sai 5 lần bị khóa, mã hết hạn, xóa tài khoản).

## 6. Dữ liệu trên máy chủ (tối thiểu hóa)

| Collection | Nội dung | Ai đọc | Ai ghi |
|---|---|---|---|
| `caregivers` | Con cháu: số điện thoại, tên gọi, phiên bản văn bản đồng ý + thời điểm đồng ý | Chính người đó | Route OTP phía máy chủ; người đó sửa tên / xóa tài khoản |
| `otp_requests` | Mã OTP **đã băm** + salt, hạn dùng, số lần nhập sai | **Không ai** (chỉ route phía máy chủ) | Route OTP; tự xóa sau 24 giờ |
| `devices` | Máy của ông bà (tạo khi ghép QR ở bước 2.5C), không cần số điện thoại | Chính máy đó | Route ghép máy; máy đó xóa tài khoản |
| `shared_profiles` | **Chỉ tên gọi** của ông bà | Máy ông bà + con cháu đang được chia sẻ | Chỉ máy ông bà |
| `family_links` | Liên kết = **bản ghi đồng ý của ông bà**: từng quyền (xem thuốc / xem cữ / nhận cảnh báo), phiên bản văn bản, thời điểm đồng ý / thu hồi | Máy ông bà + đúng người con cháu đó | Tạo qua route ghép máy; **chỉ máy ông bà** đổi quyền / thu hồi; con cháu tự ngừng theo dõi được |
| `medications` | Tên thuốc, hàm lượng, liều, mô tả lịch ngắn, đang dùng / tạm dừng, sắp hết | Máy ông bà + con cháu có quyền **xem thuốc** | Chỉ máy ông bà |
| `dose_events` | Giờ dự kiến + trạng thái từng cữ (đã uống / chưa / quên…) | Máy ông bà + con cháu có quyền **xem cữ** | Chỉ máy ông bà |

**Không** có trên máy chủ: ngày sinh, giới tính, nhóm máu, bệnh nền, dị ứng, triệu chứng, chỉ số, ảnh, ghi âm, câu hỏi bác sĩ, chi phí, email.

Cách phân quyền: hook `pb_hooks/family_links.pb.js` tính lại danh sách người được xem của hồ sơ mỗi khi liên kết được tạo / đổi quyền / thu hồi / xóa → luật truy cập của `medications` và `dose_events` dựa vào danh sách này → **thu hồi là mất quyền ngay**. Danh sách người xem không trả về qua API (`pb_hooks/shared_profiles.pb.js`), client không tự sửa được. Xóa tài khoản máy ông bà → toàn bộ hồ sơ, thuốc, cữ, liên kết bị xóa dây chuyền.

Cài đặt máy chủ đặt sẵn trong migration: nhật ký giữ 3 ngày và **không ghi IP / id tài khoản**; bật giới hạn tần suất gọi API; tắt batch API; **xóa collection `users`** mặc định (cho phép tự đăng ký bằng email — Kề Bên không dùng).

## 7. Quy tắc an toàn khi chạy trên máy tính cá nhân

- Chỉ chạy trong **mạng Wi-Fi nhà / mạng tin cậy**. **Không** mở cổng router (port forwarding), **không** dùng đường hầm qua dịch vụ nước ngoài (Cloudflare Tunnel, ngrok…) — kết nối hiện là HTTP không mã hóa.
- Bật **mã hóa ổ đĩa**: macOS *FileVault*, Windows *BitLocker* / *Device encryption*.
- Mật khẩu quản trị mạnh; khóa bảng quản trị về `127.0.0.1` (bước 2).
- **Không commit** `pb_data/`. Kết thúc đợt thử nghiệm → xóa dữ liệu thử: dừng máy chủ rồi xóa thư mục `pb_data/`.
- Không sửa collection bằng bảng quản trị: mọi thay đổi schema làm bằng **file migration mới** trong `pb_migrations/` (nếu lỡ sửa, PocketBase sẽ tự sinh file migration — xem lại trước khi commit).
- Khi có người dùng thật: chuyển sang máy chủ ảo **đặt tại Việt Nam**, có tên miền + **HTTPS**, sao lưu tự động — chỉ sau khi hoàn tất **"Cổng pháp lý B"** (`docs/LEGAL_COMPLIANCE_VN.md`).
