# Kề Bên — hướng dẫn cho Claude Code

Dự án **Kề Bên** (repo `PillPal`): app nhắc uống thuốc & theo dõi sức khỏe cho người Việt, con cháu theo dõi ông bà với sự đồng ý của chính ông bà.

@AGENTS.md
@docs/HANDOFF.md

## Trước khi làm bất kỳ bước nào

1. Đọc `docs/KEBEN_MASTER_PROMPT.md` — **mục 0** (cách làm việc), **mục 5** (stack, thư viện được phép, đồng bộ), **mục 8** (lộ trình & DoD), **mục 9** (định dạng câu trả lời (a)–(h), dừng sau mỗi bước), **mục 10** (pháp lý).
2. Đọc `docs/LEGAL_COMPLIANCE_VN.md` cho phần pháp lý của bước đang làm.
3. Xem mục "Bước tiếp theo" trong `docs/HANDOFF.md`.

## Quy tắc người dùng đã chốt (tóm tắt)

- Luôn trả lời bằng **tiếng Việt**. Chữ trong app: tiếng Việt (đặt trong `src/constants/strings.vi.ts`); tên biến / file / bảng: tiếng Anh.
- **Mỗi lần chỉ làm một bước**, trả lời theo định dạng (a)–(h) và kết thúc đúng câu: *"Hết bước X. Hãy chạy thử và phản hồi — tôi chỉ chuyển sang bước tiếp theo khi bạn xác nhận."*
- Chỉ dùng thư viện trong danh sách mục 5.1 của master prompt; thư viện khác → giải thích và **hỏi trước**. Cài bằng `npx expo install`.
- Quyết định lớn về kiến trúc / dữ liệu / chi phí → **hỏi trước khi code**.
- Chạy `npm run check` (typecheck + lint + test) và `npx eslint server src` trước khi báo xong. Bước có máy chủ: chạy thêm test trong `server/tests/` (xem `server/README.md`).
- Phát triển trên nhánh `claude/admiring-faraday-pyzhep`. Commit theo Conventional Commits; không tạo pull request khi chưa được yêu cầu.

## Riêng tư

- Repo GitHub **đang công khai**. Không commit `.env`, `server/pb_data/`, `server/pocketbase`, thư mục `handoff-local/` (cuộc trò chuyện cũ, dữ liệu riêng), số điện thoại / email / ảnh chụp màn hình của người dùng.
- Chỉ dùng **dữ liệu giả**, hoặc dữ liệu người nhà đã đồng ý bằng văn bản; không mở máy chủ PocketBase ra Internet.
