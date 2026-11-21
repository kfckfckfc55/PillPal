/**
 * Cấu hình máy chủ gia đình (PocketBase) — Milestone 2.5.
 *
 * - EXPO_PUBLIC_POCKETBASE_URL: địa chỉ máy chủ. Khi phát triển là IP máy tính trong mạng Wi-Fi nhà,
 *   VD http://192.168.1.10:8090. Biến EXPO_PUBLIC_* được nhúng vào app → KHÔNG đặt bí mật ở đây.
 * - EXPO_PUBLIC_FAMILY_FEATURE=1: bật tính năng gia đình. Mặc định TẮT — chỉ bật khi thử nghiệm nội bộ
 *   với dữ liệu giả / người nhà đã đồng ý bằng văn bản, hoặc sau khi qua "Cổng pháp lý B" (docs/LEGAL_COMPLIANCE_VN.md).
 */

/** Bỏ khoảng trắng và dấu "/" cuối; chỉ nhận http(s)://… */
export function normalizeServerUrl(value: string | undefined | null): string | null {
  const trimmed = value?.trim().replace(/\/+$/, '') ?? '';
  return /^https?:\/\/[^\s/]+(:\d+)?(\/.*)?$/i.test(trimmed) ? trimmed : null;
}

export const backendConfig = {
  serverUrl: normalizeServerUrl(process.env.EXPO_PUBLIC_POCKETBASE_URL),
  familyFeatureEnabled: process.env.EXPO_PUBLIC_FAMILY_FEATURE === '1',
} as const;

export interface ServerHealth {
  ok: boolean;
  /** Mã HTTP (nếu có phản hồi). */
  status: number | null;
  /** Thời gian phản hồi (ms). */
  latencyMs: number;
  /** Lỗi kỹ thuật (để hiện trong màn hình dev). */
  error: string | null;
}

/**
 * Gọi GET /api/health của PocketBase — KHÔNG gửi dữ liệu cá nhân nào.
 * Dùng ở màn hình "Dữ liệu (dev)" để kiểm tra điện thoại có kết nối được máy tính chạy máy chủ không.
 */
export async function checkServerHealth(
  serverUrl: string,
  timeoutMs = 5000,
  fetchImpl: typeof fetch = fetch,
): Promise<ServerHealth> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const started = Date.now();
  try {
    const response = await fetchImpl(`${serverUrl}/api/health`, { method: 'GET', signal: controller.signal });
    return {
      ok: response.ok,
      status: response.status,
      latencyMs: Date.now() - started,
      error: response.ok ? null : `HTTP ${response.status}`,
    };
  } catch (error) {
    return {
      ok: false,
      status: null,
      latencyMs: Date.now() - started,
      error: controller.signal.aborted ? 'timeout' : error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timer);
  }
}
