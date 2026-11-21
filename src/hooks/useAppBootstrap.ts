import type { SQLiteDatabase } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';

import { openAppDatabase } from '@/db/client';
import { migrateDatabase } from '@/db/migrations';
import { readAppSettings, type PersistedAppSettings } from '@/db/repositories/settingsRepository';
import { seedIfEmpty } from '@/db/seed';
import {
  readRequiredConsentStatus,
  type RequiredConsentStatus,
} from '@/features/onboarding/consents';

export type BootstrapState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | {
      status: 'ready';
      db: SQLiteDatabase;
      settings: PersistedAppSettings;
      consent: RequiredConsentStatus;
    };

/**
 * Khởi động app: mở cơ sở dữ liệu → chạy migration → (dev) nạp dữ liệu mẫu nếu trống
 * → đọc cài đặt & trạng thái đồng ý.
 * Trong lúc chạy, splash screen vẫn hiển thị (root layout trả về null).
 */
export function useAppBootstrap(): BootstrapState & { retry: () => void } {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<BootstrapState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    let opened: SQLiteDatabase | null = null;

    async function run() {
      try {
        opened = await openAppDatabase();
        await migrateDatabase(opened);
        if (__DEV__) {
          await seedIfEmpty(opened);
        }
        const [settings, consent] = await Promise.all([
          readAppSettings(opened),
          readRequiredConsentStatus(opened),
        ]);
        if (!cancelled) {
          setState({ status: 'ready', db: opened, settings, consent });
        }
      } catch (error) {
        console.error('[bootstrap] Không khởi động được cơ sở dữ liệu', error);
        if (!cancelled) {
          setState({
            status: 'error',
            message: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }

    void run();

    return () => {
      cancelled = true;
      opened?.closeAsync().catch(() => undefined);
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setState({ status: 'loading' });
    setAttempt((value) => value + 1);
  }, []);

  return { ...state, retry };
}
