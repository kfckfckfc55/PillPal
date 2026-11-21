import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { BackendError, type FamilyApi } from '@/services/backend/familyApi';

import { ensureDeviceAuth, isAuthRejected } from '../devicePairing';

const mockStore = new Map<string, string>();

jest.mock('expo-secure-store', () => ({
  AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 'afterFirstUnlockThisDeviceOnly',
  getItemAsync: async (key: string) => mockStore.get(key) ?? null,
  setItemAsync: async (key: string, value: string) => {
    mockStore.set(key, value);
  },
  deleteItemAsync: async (key: string) => {
    mockStore.delete(key);
  },
}));

// Phần ghi SQLite có kiểm thử riêng trong harness; ở đây chỉ kiểm tra luồng phiên máy.
jest.mock('@/db/repositories/familyLinkRepository', () => ({
  recordSharingConsent: async () => undefined,
}));

let mockCounter = 0;
jest.mock('expo-crypto', () => ({
  getRandomBytes: (size: number) => {
    mockCounter += 1;
    return new Uint8Array(size).fill(mockCounter);
  },
}));

const SESSION_KEY = 'keben.device.session.v1';

function savedSession() {
  const raw = mockStore.get(SESSION_KEY);
  return raw ? (JSON.parse(raw) as { deviceKey: string; deviceId: string | null; token: string | null }) : null;
}

function fakeApi(overrides: Partial<Pick<FamilyApi, 'refreshDevice' | 'deviceLogin'>>): FamilyApi {
  return {
    refreshDevice: async () => {
      throw new BackendError(401, 'unauthorized', 'x');
    },
    deviceLogin: async () => {
      throw new BackendError(400, 'server_error', 'Failed to authenticate.');
    },
    ...overrides,
  } as unknown as FamilyApi;
}

describe('phân biệt lỗi tài khoản với lỗi mạng', () => {
  it('401/400/404 là mất tài khoản; 429, lỗi mạng, lỗi máy chủ thì không', () => {
    expect(isAuthRejected(new BackendError(401, 'unauthorized', 'x'))).toBe(true);
    expect(isAuthRejected(new BackendError(400, 'server_error', 'x'))).toBe(true);
    expect(isAuthRejected(new BackendError(404, 'not_found', 'x'))).toBe(true);
    expect(isAuthRejected(new BackendError(429, 'too_many_requests', 'x'))).toBe(false);
    expect(isAuthRejected(new BackendError(0, 'network', 'x'))).toBe(false);
    expect(isAuthRejected(new BackendError(0, 'timeout', 'x'))).toBe(false);
    expect(isAuthRejected(new BackendError(500, 'server_error', 'x'))).toBe(false);
    expect(isAuthRejected(new Error('x'))).toBe(false);
  });
});

describe('phiên đăng nhập của máy ông bà', () => {
  beforeEach(() => {
    mockStore.clear();
  });

  it('máy mới: tự sinh khóa và lưu TRƯỚC khi gọi mạng; chưa có tài khoản → token null', async () => {
    let seenBeforeLogin: unknown = null;
    const api = fakeApi({
      deviceLogin: async () => {
        seenBeforeLogin = savedSession();
        throw new BackendError(400, 'server_error', 'Failed to authenticate.');
      },
    });
    const result = await ensureDeviceAuth(api, 'Máy của ông bà');
    expect(result.token).toBeNull();
    expect(result.session.deviceKey).toMatch(/^[0-9a-f]{32}$/);
    expect(result.session.password).toMatch(/^[0-9a-f]{48}$/);
    expect(seenBeforeLogin).toMatchObject({ deviceKey: result.session.deviceKey });
  });

  it('có token → gia hạn và lưu token mới', async () => {
    mockStore.set(
      SESSION_KEY,
      JSON.stringify({ deviceKey: 'a'.repeat(32), password: 'b'.repeat(48), deviceName: 'x', deviceId: 'dev1', token: 'old' }),
    );
    const api = fakeApi({ refreshDevice: async () => ({ token: 'new', deviceId: 'dev1' }) });
    await expect(ensureDeviceAuth(api, 'x')).resolves.toMatchObject({ token: 'new' });
    expect(savedSession()?.token).toBe('new');
  });

  it('token hết hạn → đăng nhập lại bằng khóa đã lưu', async () => {
    mockStore.set(
      SESSION_KEY,
      JSON.stringify({ deviceKey: 'a'.repeat(32), password: 'b'.repeat(48), deviceName: 'x', deviceId: 'dev1', token: 'old' }),
    );
    const api = fakeApi({ deviceLogin: async () => ({ token: 'fresh', deviceId: 'dev1' }) });
    await expect(ensureDeviceAuth(api, 'x')).resolves.toMatchObject({ token: 'fresh' });
    expect(savedSession()?.deviceKey).toBe('a'.repeat(32));
  });

  it('tài khoản máy đã bị xóa trên máy chủ → sinh khóa MỚI cho lần ghép sau', async () => {
    mockStore.set(
      SESSION_KEY,
      JSON.stringify({ deviceKey: 'a'.repeat(32), password: 'b'.repeat(48), deviceName: 'x', deviceId: 'dev1', token: 'old' }),
    );
    const result = await ensureDeviceAuth(fakeApi({}), 'x');
    expect(result.token).toBeNull();
    expect(result.session.deviceKey).not.toBe('a'.repeat(32));
    expect(savedSession()).toMatchObject({ deviceId: null, token: null, deviceKey: result.session.deviceKey });
  });

  it('mất mạng / bị giới hạn tần suất → báo lỗi, GIỮ NGUYÊN khóa cũ', async () => {
    const original = { deviceKey: 'a'.repeat(32), password: 'b'.repeat(48), deviceName: 'x', deviceId: 'dev1', token: 'old' };
    mockStore.set(SESSION_KEY, JSON.stringify(original));
    const offline = fakeApi({
      refreshDevice: async () => {
        throw new BackendError(0, 'network', 'x');
      },
    });
    await expect(ensureDeviceAuth(offline, 'x')).rejects.toMatchObject({ code: 'network' });

    const limited = fakeApi({
      deviceLogin: async () => {
        throw new BackendError(429, 'too_many_requests', 'x');
      },
    });
    await expect(ensureDeviceAuth(limited, 'x')).rejects.toMatchObject({ code: 'too_many_requests' });
    expect(savedSession()).toMatchObject({ deviceKey: original.deviceKey, deviceId: 'dev1' });
  });
});
