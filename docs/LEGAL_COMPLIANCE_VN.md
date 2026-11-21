# Tuân thủ pháp luật Việt Nam — kế hoạch đi cùng phát triển

> **Lưu ý quan trọng:** Tài liệu này tổng hợp từ các nguồn công khai (văn bản pháp luật, bản tin của công ty luật/kiểm toán, báo chí) tính đến **tháng 11/2026**. Đây **không phải tư vấn pháp lý**. Các mục đánh dấu ⚠️ là điểm nguồn chưa thống nhất hoặc chưa đối chiếu được với nguyên văn — **phải hỏi luật sư** trước khi phát hành, nhất là trước khi bật đồng bộ cloud.

## 1. Kết luận chính

1. **Dữ liệu sức khỏe là dữ liệu cá nhân nhạy cảm** theo Luật Bảo vệ dữ liệu cá nhân 91/2025/QH15 (hiệu lực 01/01/2026) và Nghị định 356/2025/NĐ-CP. Đây là nhóm có yêu cầu chặt nhất.
2. **Miễn trừ cho doanh nghiệp nhỏ/khởi nghiệp không áp dụng** với bên xử lý dữ liệu nhạy cảm, nên khi app tự thu thập dữ liệu về server sẽ phải lập hồ sơ đánh giá tác động (DPIA) như doanh nghiệp lớn.
3. **Chiến lược an toàn nhất: phát hành bản đầu ở chế độ chỉ lưu trên máy (local-only).** Nhà phát triển không nhận, không lưu, không xem dữ liệu của người dùng. ⚠️ Cần luật sư xác nhận rằng trong mô hình này nhà phát triển không phải "bên kiểm soát/bên xử lý dữ liệu".
4. **Đồng bộ cloud và chia sẻ cho người thân/bác sĩ (Milestone 5) chỉ được bật sau khi qua "Cổng pháp lý giai đoạn B"** (mục 4).
5. **Không làm tính năng chẩn đoán, gợi ý liều, kiểm tra tương tác thuốc, tư vấn từ xa, bán/quảng cáo thuốc.** Các tính năng này có thể kéo app vào quy định về trang thiết bị y tế, khám chữa bệnh, dược và quảng cáo.
6. **Nên phát hành bằng tài khoản tổ chức (pháp nhân).** Apple yêu cầu app trong lĩnh vực y tế hoặc dùng dữ liệu nhạy cảm do pháp nhân nộp (Guideline 5.1.1(ix)).

## 2. Văn bản áp dụng

| Văn bản | Hiệu lực | Áp dụng cho app khi nào | Nghĩa vụ chính | Độ chắc chắn |
|---|---|---|---|---|
| **Luật Bảo vệ dữ liệu cá nhân 91/2025/QH15** | 01/01/2026 | Khi nhà phát triển thu thập/xử lý dữ liệu (cloud, chia sẻ, analytics, crash report) | Đồng ý rõ ràng (im lặng ≠ đồng ý); quyền của chủ thể (biết, rút đồng ý, truy cập, sửa, xóa, hạn chế, phản đối); DPIA; báo vi phạm cho cơ quan chuyên trách trong **72 giờ**; dữ liệu trẻ em do người đại diện quyết định | Cao (điều khoản chi tiết ⚠️) |
| **Nghị định 356/2025/NĐ-CP** (thay Nghị định 13/2023) | 01/01/2026 | Như trên | Danh mục dữ liệu nhạy cảm (gồm tình trạng sức khỏe); biểu mẫu DPIA và hồ sơ chuyển dữ liệu ra nước ngoài (CTIA); cập nhật hồ sơ định kỳ/khi thay đổi ⚠️ (nguồn nêu 6 tháng và 10 ngày, chưa thống nhất) | Trung bình |
| **Nghị định 330/2026/NĐ-CP** (xử phạt bảo vệ dữ liệu cá nhân) | 19/08/2026 | Khi vi phạm | VD: phạt 50–70 triệu đồng nếu coi im lặng là đồng ý. Mức phạt tối đa theo doanh thu ⚠️ chưa đối chiếu nguyên văn | Trung bình |
| **Luật An ninh mạng 116/2025/QH15** | 01/07/2026 | Khi có máy chủ/dịch vụ trực tuyến | Nhà cung cấp dịch vụ trên không gian mạng phải lưu trữ dữ liệu người dùng tại Việt Nam ⚠️ chi tiết chờ nghị định hướng dẫn | Trung bình |
| **Luật Dữ liệu (60/2024/QH15)** | 01/07/2025 | Khi có cloud | Phân loại dữ liệu; hạn chế chuyển "dữ liệu quan trọng/cốt lõi" ra nước ngoài ⚠️ chưa rõ dữ liệu sức khỏe cá nhân có thuộc nhóm này | Thấp |
| **Nghị định 98/2021/NĐ-CP về trang thiết bị y tế** (đã sửa đổi nhiều lần) | 01/01/2022 | Nếu phần mềm có mục đích y khoa (chẩn đoán, theo dõi, điều trị…) | Phân loại A–D; loại C/D cần số lưu hành ⚠️ chưa đối chiếu định nghĩa "phần mềm" trong bản hợp nhất mới nhất | Thấp |
| **Luật Thương mại điện tử 122/2025/QH15** + Nghị định 248/2026/NĐ-CP | 01/07/2026 | Chỉ khi app bán hàng/dịch vụ hoặc thu phí ⚠️ | Thông báo/đăng ký với Bộ Công Thương nếu thuộc diện "ứng dụng TMĐT" | Thấp |
| **Luật Bảo vệ quyền lợi người tiêu dùng 2023** + Nghị định 55/2024/NĐ-CP | 01/07/2024 | Khi thu phí | Minh bạch giá và điều khoản; hợp đồng theo mẫu thuộc danh mục phải đăng ký | Trung bình |
| Luật Khám bệnh, chữa bệnh; Luật Dược; Luật Quảng cáo | — | Nếu app tư vấn, khám từ xa, bán hoặc quảng cáo thuốc | Cần giấy phép/xác nhận nội dung → **Kề Bên không làm các tính năng này** ⚠️ chưa tra lại chi tiết | — |
| **Google Play – Health apps policy** | Hiện hành | Mọi app | Khai báo *Health apps declaration* và *Data safety*; app không phải thiết bị y tế phải ghi rõ trong mô tả: "không phải thiết bị y tế, không chẩn đoán, điều trị hay phòng bệnh" và khuyên hỏi nhân viên y tế; có chính sách quyền riêng tư | Cao |
| **Apple App Review Guidelines** | Hiện hành | Mọi app | 5.1.1(ix): app y tế/dữ liệu nhạy cảm nên do pháp nhân nộp; có xóa tài khoản trong app; khai báo *App Privacy* | Cao |

## 3. Chiến lược "pháp lý theo thiết kế" — 2 giai đoạn

### Giai đoạn A — Chỉ lưu trên máy (Milestone 1–4 và bản phát hành đầu)
- Mọi dữ liệu nằm trong SQLite và thư mục riêng của app trên máy người dùng.
- **Không** có máy chủ, không tài khoản, **không** SDK analytics, quảng cáo hay crash report gửi dữ liệu đi.
- Người dùng tự chia sẻ bằng nút Share của hệ điều hành (Zalo, email…). App không tự gửi.
- Nghĩa vụ vẫn còn: chính sách quyền riêng tư, Medical Disclaimer, giải thích từng quyền (camera, micro, thông báo), nút xóa toàn bộ dữ liệu, bảo mật dữ liệu trên máy, khai báo trên cửa hàng.

### Cập nhật quyết định (11/2026)
- Dự án **phi thương mại**, nhưng điều này **không** miễn nghĩa vụ theo Luật 91/2025 (luật áp dụng cho cả cá nhân xử lý dữ liệu; mình chưa tìm thấy điều khoản miễn trừ cho dự án phi lợi nhuận ⚠️).
- Tính năng con cháu theo dõi ông bà được đưa lên **Milestone 2.5**: con cháu đăng nhập bằng số điện thoại + OTP; ông bà ghép máy bằng QR, **tự đồng ý** trên máy của mình.
- Backend: **PocketBase**. Khi phát triển chạy trên máy tính cá nhân (mục "Máy chủ trên máy tính cá nhân" dưới đây); khi có người dùng thật: máy chủ tại Việt Nam.
- Gửi OTP qua SMS: dịch vụ quốc tế dễ bị chậm hoặc lọc với số Việt Nam và đưa số điện thoại ra nước ngoài; SMS thương hiệu trong nước và Zalo ZNS thường cần doanh nghiệp ⚠️. Khi phát triển dùng **mã giả**; chọn nhà cung cấp ở Milestone 5.

### Máy chủ trên máy tính cá nhân (giai đoạn phát triển)
- Chỉ dùng **dữ liệu giả**, hoặc dữ liệu của **người nhà thành viên nhóm đã được giải thích và đồng ý bằng văn bản** (giữ bản đồng ý).
- Không mở cho người ngoài. Không đưa dữ liệu thật qua đường hầm của dịch vụ nước ngoài (VD: Cloudflare Tunnel giải mã HTTPS tại máy chủ của họ) khi chưa đánh giá chuyển dữ liệu ra nước ngoài.
- Mã hóa ổ đĩa, mật khẩu admin PocketBase mạnh, không commit thư mục dữ liệu `server/pb_data/` lên Git, xóa dữ liệu thử khi kết thúc đợt thử.

### Giai đoạn B — Tính năng gia đình, đồng bộ, QR cho bác sĩ với người dùng thật
Nhà phát triển trở thành bên kiểm soát/xử lý **dữ liệu nhạy cảm**. Đây là **"Cổng pháp lý B"**: tính năng gửi dữ liệu ra khỏi máy phải nằm sau feature flag và **chỉ được bật khi mọi mục dưới đây đã xong**:

- [ ] Có pháp nhân (công ty) đứng tên dịch vụ; tài khoản Apple/Google dạng tổ chức.
- [ ] Hồ sơ đánh giá tác động xử lý dữ liệu cá nhân (DPIA) theo mẫu Nghị định 356/2025, nộp cơ quan chuyên trách (Cục A05 – Bộ Công an) đúng hạn ⚠️ xác nhận thời hạn.
- [ ] Máy chủ đặt **tại Việt Nam** (VD: Viettel Cloud, FPT Cloud, VNG Cloud) để tránh thủ tục chuyển dữ liệu ra nước ngoài (CTIA) và đáp ứng Luật An ninh mạng 2025. Nếu dùng cloud nước ngoài → bắt buộc CTIA ⚠️.
- [ ] Màn hình xin **đồng ý riêng** cho từng mục đích: đồng bộ, chia sẻ người thân, chia sẻ bác sĩ. Không tick sẵn; rút lại dễ như khi đồng ý; ghi nhật ký vào bảng `consents`.
- [ ] Nhân sự/bộ phận phụ trách bảo vệ dữ liệu; quy trình xử lý yêu cầu của chủ thể dữ liệu (truy cập, sửa, xóa, xuất).
- [ ] Quy trình phát hiện và **báo cáo vi phạm trong 72 giờ**.
- [ ] Mã hóa khi truyền (TLS) và khi lưu; phân quyền truy cập; nhật ký truy cập; xóa thật (không chỉ xóa mềm) khi người dùng yêu cầu.
- [ ] Hợp đồng xử lý dữ liệu với nhà cung cấp cloud.
- [ ] Luật sư rà soát chính sách quyền riêng tư, điều khoản sử dụng và luồng đồng ý.

## 4. Quy tắc bắt buộc trong sản phẩm và code (áp dụng ngay)

**Dữ liệu**
1. **Tối thiểu hóa:** không thu thập số CCCD/căn cước, không bắt buộc số thẻ BHYT. Checklist chỉ cần nhắc "mang CCCD/BHYT hoặc mở VNeID".
2. **Không SDK gửi dữ liệu ra ngoài** (analytics, quảng cáo, crash report) khi chưa qua Cổng pháp lý B. Nếu cần crash report → phải xin đồng ý và đánh giá lại.
3. **Bảo mật trên máy:** cân nhắc mã hóa cơ sở dữ liệu (SQLCipher qua `expo-sqlite`, ⚠️ kiểm tra hỗ trợ ở SDK 58) và khóa app bằng sinh trắc học/mã PIN (tùy chọn) cho điện thoại dùng chung trong gia đình.
4. **Sao lưu:** quyết định rõ việc dữ liệu có nằm trong bản sao lưu iCloud/Google của người dùng hay không; luôn có chức năng **xuất dữ liệu** để người dùng tự giữ.
5. **Thông báo:** có tùy chọn ẩn tên thuốc trên màn hình khóa.
6. **Xóa toàn bộ dữ liệu = xóa thật:** DB, ảnh, ghi âm, thông báo đã lên lịch, cài đặt. Bản ghi xóa mềm phục vụ đồng bộ cũng phải bị dọn.
7. **Hồ sơ người khác:** khi tạo hồ sơ cho bố mẹ/vợ chồng/con, người dùng xác nhận mình là người giám hộ, người đại diện hoặc đã được người đó đồng ý. Dữ liệu trẻ em do cha mẹ/người đại diện quyết định ⚠️ (một số trường hợp cần cả đồng ý của trẻ từ đủ 7 tuổi).
8. **Nhật ký đồng ý:** bảng `consents` (loại đồng ý, phiên bản văn bản, thời điểm đồng ý/rút lại). Văn bản Disclaimer/Chính sách có số phiên bản; khi đổi nội dung quan trọng phải hỏi lại.
9. **Ghi âm lời dặn của bác sĩ:** luôn nhắc "Hãy xin phép bác sĩ trước khi ghi âm" ⚠️ (quyền riêng tư của người khác). File ghi âm chỉ lưu trên máy.

**Y tế**
10. Không chẩn đoán, không gợi ý liều, không khuyên uống bù/gấp đôi, không kết luận tương tác thuốc.
11. Ngưỡng chỉ số là "tham khảo phổ biến", người dùng chỉnh được, luôn kèm disclaimer. Không dùng từ "chẩn đoán", "điều trị", "phát hiện bệnh" trong app và mô tả cửa hàng.
12. Không quảng cáo, gợi ý mua hay liên kết bán thuốc; không tư vấn hoặc khám từ xa.

**Cửa hàng ứng dụng**
13. Mô tả trên cửa hàng ghi rõ: *"Kề Bên không phải thiết bị y tế, không chẩn đoán, điều trị hay phòng ngừa bệnh. Hãy hỏi ý kiến bác sĩ, dược sĩ."*
14. Điền đúng *Health apps declaration*, *Data safety* (Google) và *App Privacy* (Apple). Ở giai đoạn A khai báo "không thu thập dữ liệu" chỉ khi đúng là vậy.
15. Có trang web công khai: chính sách quyền riêng tư và hướng dẫn xóa dữ liệu (Google Play yêu cầu link web).

**Thu phí (nếu có)**
16. Đăng ký kinh doanh; giá, chu kỳ gia hạn và cách hủy hiển thị rõ; rà soát Luật TMĐT 2025 và Luật BVQLNTD 2023 với luật sư.

## 5. Việc pháp lý theo từng milestone

| Milestone | Việc pháp lý |
|---|---|
| **1B** | Thêm bảng `consents`; lưu phiên bản Disclaimer/Chính sách đã chấp nhận; không lưu số CCCD/BHYT; không cài bất kỳ SDK analytics/crash nào |
| **1C** | Màn hình chào lần đầu: Medical Disclaimer + Thông báo xử lý dữ liệu (tóm tắt, dữ liệu chỉ lưu trên máy) → người dùng chủ động bấm đồng ý, không tick sẵn |
| **2** | **2A:** hồ sơ đầu tiên chỉ hỏi tên gọi (có thể là biệt danh); giờ sinh hoạt (dữ liệu thói quen) chỉ lưu trên máy; đối chiếu dị ứng chỉ là nhắc nhở từ ghi chép của người dùng, không kết luận; nút ngừng thuốc nhắc "chỉ ngừng theo chỉ định của bác sĩ"; không tự đặt liều mặc định theo tên thuốc. **2B:** không khuyên uống bù / gấp đôi liều (cữ trễ ≥ 2 giờ chỉ nhắc "hỏi bác sĩ hoặc dược sĩ"); phản ứng sau uống là ghi chép của người dùng, không đánh giá; tạm dừng thuốc nhắc "chỉ khi bác sĩ / cơ sở y tế hướng dẫn"; lịch sử 7 ngày ghi rõ "không phải đánh giá điều trị"; mọi dữ liệu chỉ lưu trên máy. **2C:** giải thích trước khi xin quyền thông báo (màn hình riêng, nút "Để sau"); tùy chọn ẩn tên thuốc; kênh Android đặt chế độ màn hình khóa *riêng tư* (theo cài đặt "ẩn nội dung nhạy cảm" của máy); chỉ thông báo cục bộ — tắt push (`enableRemoteNotifications: false`), không gửi dữ liệu ra ngoài; rút lại đồng ý → hủy toàn bộ thông báo; chưa dùng quyền báo thức chính xác (`SCHEDULE_EXACT_ALARM` cần khai báo với Google Play) |
| **3** | Lời nhắc xin phép trước khi ghi âm; cảnh báo nhẹ khi chụp giấy tờ có thông tin người khác; xác nhận quyền quản lý hồ sơ khi tạo hồ sơ thành viên |
| **4** | File lưu trong thư mục riêng của app; xuất PDF/ảnh kèm cảnh báo "bản này chứa thông tin sức khỏe, chỉ gửi cho người tin cậy"; chức năng xuất toàn bộ dữ liệu |
| **2.5** | **2.5A (máy chủ):** schema chỉ chứa tên gọi hồ sơ + thuốc + trạng thái cữ (không ngày sinh, bệnh, dị ứng, triệu chứng, chỉ số, email); `family_links` là bản ghi đồng ý từng quyền (phiên bản văn bản, thời điểm đồng ý / thu hồi); chỉ máy ông bà ghi dữ liệu của ông bà; thu hồi → mất quyền ngay; xóa tài khoản → xóa dây chuyền; log không ghi IP / id, giữ 3 ngày; giới hạn tần suất; bảng quản trị khóa về `127.0.0.1`; chạy trong mạng nhà, không mở ra Internet, ổ đĩa mã hóa; tính năng gia đình trong app mặc định TẮT (`EXPO_PUBLIC_FAMILY_FEATURE`). **2.5B (đăng nhập):** trước khi gửi số điện thoại có thông báo xử lý dữ liệu + ô đồng ý không tick sẵn; máy chủ ghi phiên bản văn bản + thời điểm đồng ý; số điện thoại chỉ dùng để đăng nhập; mã OTP chỉ lưu dạng băm, tự xóa sau 24 giờ; giới hạn gửi mã chống spam; chưa gửi SMS thật (nhà cung cấp SMS chọn ở Milestone 5 — SMS đi qua bên thứ ba cần đánh giá); phiên lưu trong Keychain / Keystore, không đi theo bản sao lưu; người dùng tự xóa tài khoản trên máy chủ trong app. **2.5C (ghép máy):** **chính ông bà** đồng ý trên máy của mình (con cháu không đồng ý thay): màn hình chữ to hiện rõ ai muốn theo dõi (tên gọi + số đã che), chọn hồ sơ, **mọi quyền mặc định TẮT** và bật riêng từng quyền, ô "tôi là người dùng chính và tự quyết định" không tick sẵn, nút Đồng ý chỉ bật khi đã chọn ≥ 1 quyền; nêu rõ những gì **không bao giờ** chia sẻ và cách thu hồi; máy chủ từ chối nếu thiếu phiên bản văn bản hoặc không có quyền nào; ghi `consents` loại `family_sharing` (phiên bản `2026-11.1`) + bản sao liên kết trên máy, máy chủ ghi phiên bản + thời điểm đồng ý (không ai sửa được qua API); "Ai đang theo dõi tôi" cho đổi quyền / **thu hồi có hiệu lực ngay**; mã ghép dùng một lần, hết hạn 10 phút, máy chủ chỉ lưu bản băm; QR **không** chứa địa chỉ máy chủ / số điện thoại / tên; camera chỉ dùng để quét QR, **không xin quyền micro**, ảnh không lưu / gửi đi (ghi rõ trong lời xin quyền iOS); máy ông bà dùng tài khoản máy với khóa ngẫu nhiên lưu trong Keychain / Keystore — **không thu thêm số điện thoại** của ông bà; vá luật truy cập để khách chưa đăng nhập không đọc được hồ sơ đã hết người theo dõi. Chỉ đồng bộ phần tối thiểu (thuốc, trạng thái cữ); thông báo đẩy không chứa tên thuốc; giới hạn gửi OTP; chỉ thử với dữ liệu giả hoặc người nhà đã đồng ý bằng văn bản |
| **5** | **Cổng pháp lý B** (mục 3) phải hoàn tất trước khi người ngoài nhóm dùng tính năng gia đình, đồng bộ, QR bác sĩ; đồng ý riêng từng mục đích; xóa tài khoản và dữ liệu trên server |
| **6** | Chính sách quyền riêng tư + Điều khoản sử dụng (tiếng Việt), trang web xóa dữ liệu, khai báo cửa hàng, tài khoản tổ chức, **luật sư rà soát toàn bộ** trước khi nộp |

## 6. Câu hỏi cần hỏi luật sư

1. Với mô hình chỉ lưu trên máy (không server, không analytics), nhà phát triển có phải là bên kiểm soát/xử lý dữ liệu cá nhân không? Có phải lập và nộp DPIA không?
2. App (nhắc thuốc, ghi chỉ số, đánh dấu vượt ngưỡng tham khảo) có thuộc định nghĩa trang thiết bị y tế theo Nghị định 98/2021 bản hợp nhất mới nhất không?
3. Khi có cloud: thời hạn nộp DPIA; Luật An ninh mạng 2025 đã bắt buộc lưu trữ dữ liệu trong nước với dịch vụ như Kề Bên chưa; nếu dùng cloud nước ngoài thì thủ tục CTIA ra sao?
4. Dữ liệu sức khỏe người dùng có bị coi là "dữ liệu quan trọng" theo Luật Dữ liệu 2024 không?
5. Thu phí qua App Store/Google Play có khiến app thành "ứng dụng thương mại điện tử" theo Luật TMĐT 2025 và Nghị định 248/2026 không?
6. Loại hình pháp nhân phù hợp để mở tài khoản tổ chức Apple/Google (công ty TNHH một thành viên, …).
7. Điều kiện hợp pháp khi người bệnh ghi âm lời dặn của bác sĩ.
8. Nội dung tối thiểu bắt buộc của thông báo xử lý dữ liệu và văn bản đồng ý cho dữ liệu sức khỏe.

## 7. Nguồn tham khảo

- Luật 91/2025/QH15: [Thư viện Pháp luật](https://thuvienphapluat.vn/van-ban/Bo-may-hanh-chinh/Luat-Bao-ve-du-lieu-ca-nhan-2025-so-91-2025-QH15-625628.aspx) · [Công báo](https://congbaocdn.chinhphu.vn/CongBaoCP/VanBan/2025/6/45578/57730-1-2025971-97291-2025-qh15.pdf) · [VnEconomy – điểm mới](https://vneconomy.vn/nhung-diem-moi-trong-luat-bao-ve-du-lieu-ca-nhan-tu-112026.htm) · [dpo.vn – toàn cảnh](https://dpo.vn/luat-bao-ve-du-lieu-ca-nhan/) · [Cần Thơ – dữ liệu trẻ em](https://pbgdpl.cantho.gov.vn/quy-dinh-ve-bao-ve-du-lieu-ca-nhan-cua-tre-em-nguoi-bi-mat-hoac-han-che-nang-luc-hanh-vi-dan-su-nguoi-co-kho-khan-trong-nhan-thuc-lam-chu-hanh-vi)
- Nghị định 356/2025/NĐ-CP: [Thư viện Pháp luật](https://thuvienphapluat.vn/van-ban/Quyen-dan-su/Nghi-dinh-356-2025-ND-CP-huong-dan-Luat-Bao-ve-du-lieu-ca-nhan-687428.aspx) · [EY](https://www.ey.com/vi_vn/technical/tax/tax-and-law-updates/nghi-dinh-so-356-2025-nd-cp-quy-dinh-chi-tiet-mot-so-dieu-va-bien-phap-thi-hanh-luat-bao-ve-du-lieu-ca-nhan) · [PwC](https://www.pwc.com/vn/vn/publications/2026/20260128-new-rules-personal-data-protection.pdf) · [Luật Việt An – so với NĐ 13](https://luatvietan.vn/diem-moi-cua-nghi-dinh-356-2025-so-voi-nghi-dinh-13-2023-ve-huong-dan-bao-ve-du-lieu-ca-nhan.html)
- Nghị định 330/2026/NĐ-CP (xử phạt): [PwC](https://www.pwc.com/vn/vn/publications/news-brief/260915-decree-330-pdpl-violations.html) · [VOV](https://vov.vn/chinh-tri/tu-1982026-tu-y-thu-thap-xu-ly-du-lieu-ca-nhan-bi-phat-toi-70-trieu-dong-post1326424.vov) · [EY](https://www.ey.com/content/dam/ey-unified-site/ey-com/vi-vn/technical/tax/documents/ey-vn-decree-330-providing-sanctions-for-personal-data-protection.pdf)
- Luật An ninh mạng 2025: [EY](https://www.ey.com/vi_vn/technical/tax/tax-and-law-updates/luat-an-ninh-mang-2025-cua-viet-nam-cac-diem-chinh-va-yeu-cau-tuan-thu) · [Thư viện Pháp luật](https://thuvienphapluat.vn/van-ban/cong-nghe-thong-tin/Luat-An-ninh-mang-2025-so-116-2025-QH15-666020.aspx)
- Trang thiết bị y tế: [Nghị định 98/2021 (LuatVietnam)](https://luatvietnam.vn/y-te/nghi-dinh-98-2021-nd-cp-quan-ly-trang-thiet-bi-y-te-212320-d1.html) · [Tài liệu Sở Y tế Hà Tĩnh](https://soyte.hatinh.gov.vn/upload/1000030/20220406/FILE_20220329_072158_Tai_lieu_So_Y_te_57771add8a.pdf)
- Luật Thương mại điện tử 2025: [Thư viện Pháp luật](https://thuvienphapluat.vn/van-ban/Thuong-mai/Luat-Thuong-mai-dien-tu-2025-so-122-2025-QH15-662035.aspx) · [Bộ Công Thương – NĐ 248/2026](https://moit.gov.vn/tin-tuc/bo-cong-thuong-pho-bien-luat-thuong-mai-dien-tu-va-nghi-dinh-so-248-2026-nd-cp.html)
- Bảo vệ người tiêu dùng: [Bộ Công Thương – NĐ 55/2024](https://moit.gov.vn/tin-tuc/bao-chi-voi-nguoi-dan/nhung-diem-moi-cua-nghi-dinh-so-55-2024-nd-cp-quy-dinh-chi-tiet-mot-so-dieu-cua-luat-bao-ve-quyen-loi-nguoi-tieu-dung-20.html)
- Cửa hàng ứng dụng: [Google Play – Health apps](https://support.google.com/googleplay/android-developer/answer/13996367) · [Apple App Review Guidelines](https://developer.apple.com/appstore/resources/approval/guidelines.html) · [Apple Forums – 5.1.1(ix)](https://developer.apple.com/forums/thread/750018)
