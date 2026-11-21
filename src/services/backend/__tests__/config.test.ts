import { describe, expect, it } from '@jest/globals';

import { checkServerHealth, normalizeServerUrl } from '../config';

describe('cấu hình máy chủ gia đình', () => {
  it('chuẩn hóa địa chỉ máy chủ', () => {
    expect(normalizeServerUrl(' http://192.168.1.10:8090/ ')).toBe('http://192.168.1.10:8090');
    expect(normalizeServerUrl('https://api.example.vn')).toBe('https://api.example.vn');
    expect(normalizeServerUrl('192.168.1.10:8090')).toBeNull();
    expect(normalizeServerUrl('')).toBeNull();
    expect(normalizeServerUrl(undefined)).toBeNull();
  });

  it('kiểm tra kết nối: chỉ gọi /api/health, báo lỗi rõ ràng', async () => {
    const calls: string[] = [];
    const okFetch = (async (url: string) => {
      calls.push(url);
      return { ok: true, status: 200 } as Response;
    }) as unknown as typeof fetch;
    await expect(checkServerHealth('http://pc:8090', 1000, okFetch)).resolves.toMatchObject({ ok: true, status: 200 });
    expect(calls).toEqual(['http://pc:8090/api/health']);

    const failingFetch = (async () => {
      throw new Error('Network request failed');
    }) as unknown as typeof fetch;
    await expect(checkServerHealth('http://pc:8090', 1000, failingFetch)).resolves.toMatchObject({
      ok: false,
      status: null,
      error: 'Network request failed',
    });
  });
});
