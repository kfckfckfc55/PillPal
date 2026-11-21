import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { backendConfig } from '@/services/backend/config';
import {
  clearCaregiverSession,
  loadCaregiverSession,
  saveCaregiverSession,
  type CaregiverSession,
} from '@/services/backend/caregiverSession';
import { BackendError, createFamilyApi, type CaregiverAuth, type FamilyApi } from '@/services/backend/familyApi';

/**
 * Phiên đăng nhập của người thân (con cháu) — Milestone 2.5B.
 * Tính năng gia đình TẮT (mặc định) → không đọc / ghi gì, không gọi mạng.
 */

export type CaregiverSessionState =
  | { status: 'disabled' }
  | { status: 'loading' }
  | { status: 'signedOut'; expired: boolean }
  | { status: 'signedIn'; session: CaregiverSession; offline: boolean };

interface CaregiverSessionContextValue {
  state: CaregiverSessionState;
  api: FamilyApi | null;
  signIn: (auth: CaregiverAuth) => Promise<void>;
  signOut: () => Promise<void>;
  rename: (displayName: string) => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const CaregiverSessionContext = createContext<CaregiverSessionContextValue | null>(null);

export function isFamilyFeatureAvailable(): boolean {
  return backendConfig.familyFeatureEnabled && backendConfig.serverUrl !== null;
}

function toSession(auth: CaregiverAuth): CaregiverSession {
  return {
    token: auth.token,
    caregiverId: auth.caregiver.id,
    phone: auth.caregiver.phone,
    displayName: auth.caregiver.displayName,
    savedAt: new Date().toISOString(),
  };
}

const isAuthGone = (error: unknown) =>
  error instanceof BackendError && (error.code === 'unauthorized' || error.code === 'not_found');

export function CaregiverSessionProvider({ children }: { children: ReactNode }) {
  const enabled = isFamilyFeatureAvailable();
  const api = useMemo(
    () => (enabled && backendConfig.serverUrl ? createFamilyApi(backendConfig.serverUrl) : null),
    [enabled],
  );
  const [state, setState] = useState<CaregiverSessionState>(enabled ? { status: 'loading' } : { status: 'disabled' });

  // Mở app: đọc phiên đã lưu rồi gia hạn (token mới). Phiên hết hạn / tài khoản đã xóa → đăng xuất.
  useEffect(() => {
    if (!api) return undefined;
    let cancelled = false;
    (async () => {
      const saved = await loadCaregiverSession();
      if (!saved) return { status: 'signedOut', expired: false } as const;
      try {
        const fresh = toSession(await api.refresh(saved.token));
        await saveCaregiverSession(fresh);
        return { status: 'signedIn', session: fresh, offline: false } as const;
      } catch (error) {
        if (isAuthGone(error)) {
          await clearCaregiverSession();
          return { status: 'signedOut', expired: true } as const;
        }
        return { status: 'signedIn', session: saved, offline: true } as const;
      }
    })().then(
      (next) => {
        if (!cancelled) setState(next);
      },
      (error: unknown) => {
        console.warn('[family] Không đọc được phiên đăng nhập', error instanceof Error ? error.message : error);
        if (!cancelled) setState({ status: 'signedOut', expired: false });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [api]);

  const signIn = useCallback(async (auth: CaregiverAuth) => {
    const session = toSession(auth);
    await saveCaregiverSession(session);
    setState({ status: 'signedIn', session, offline: false });
  }, []);

  const signOut = useCallback(async () => {
    await clearCaregiverSession();
    setState({ status: 'signedOut', expired: false });
  }, []);

  const rename = useCallback(
    async (displayName: string) => {
      if (!api || state.status !== 'signedIn') return;
      const { session } = state;
      try {
        const record = await api.updateDisplayName(session.token, session.caregiverId, displayName);
        const next = { ...session, displayName: record.displayName, savedAt: new Date().toISOString() };
        await saveCaregiverSession(next);
        setState({ status: 'signedIn', session: next, offline: false });
      } catch (error) {
        if (isAuthGone(error)) {
          await clearCaregiverSession();
          setState({ status: 'signedOut', expired: true });
        }
        throw error;
      }
    },
    [api, state],
  );

  const deleteAccount = useCallback(async () => {
    if (!api || state.status !== 'signedIn') return;
    await api.deleteAccount(state.session.token, state.session.caregiverId);
    await clearCaregiverSession();
    setState({ status: 'signedOut', expired: false });
  }, [api, state]);

  const value = useMemo(
    () => ({ state, api, signIn, signOut, rename, deleteAccount }),
    [state, api, signIn, signOut, rename, deleteAccount],
  );

  return <CaregiverSessionContext.Provider value={value}>{children}</CaregiverSessionContext.Provider>;
}

export function useCaregiverSession(): CaregiverSessionContextValue {
  const value = useContext(CaregiverSessionContext);
  if (!value) throw new Error('useCaregiverSession phải dùng bên trong CaregiverSessionProvider');
  return value;
}
