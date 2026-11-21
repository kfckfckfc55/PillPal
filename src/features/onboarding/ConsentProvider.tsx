import type { SQLiteDatabase } from 'expo-sqlite';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import {
  acceptRequiredConsents,
  withdrawRequiredConsents,
  type RequiredConsentStatus,
} from './consents';

interface ConsentContextValue extends RequiredConsentStatus {
  /** Ghi nhận đồng ý; ném lỗi nếu không lưu được (màn hình gọi tự hiển thị thông báo). */
  accept: () => Promise<void>;
  /** Rút lại đồng ý; ném lỗi nếu không lưu được. */
  withdraw: () => Promise<void>;
}

const ConsentContext = createContext<ConsentContextValue | null>(null);

export interface ConsentProviderProps {
  db: SQLiteDatabase;
  initialStatus: RequiredConsentStatus;
  children: ReactNode;
}

export function ConsentProvider({ db, initialStatus, children }: ConsentProviderProps) {
  const [status, setStatus] = useState<RequiredConsentStatus>(initialStatus);

  const accept = useCallback(async () => {
    const next = await acceptRequiredConsents(db);
    setStatus(next);
  }, [db]);

  const withdraw = useCallback(async () => {
    await withdrawRequiredConsents(db);
    setStatus({ accepted: false, acceptedAt: null });
  }, [db]);

  const value = useMemo<ConsentContextValue>(
    () => ({ ...status, accept, withdraw }),
    [status, accept, withdraw],
  );

  return <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>;
}

export function useConsent(): ConsentContextValue {
  const context = useContext(ConsentContext);
  if (!context) {
    throw new Error('useConsent() phải được dùng bên trong <ConsentProvider>.');
  }
  return context;
}
