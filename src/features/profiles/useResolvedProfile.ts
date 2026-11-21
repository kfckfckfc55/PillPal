import { useEffect, useState } from 'react';

import { useDatabase } from '@/db/DatabaseProvider';
import { getDefaultProfile, getProfile } from '@/db/repositories/profileRepository';
import type { Profile } from '@/types/models';

export type ResolvedProfileState =
  | { status: 'loading' }
  | { status: 'missing' }
  | { status: 'error'; message: string }
  | { status: 'ready'; profile: Profile };

/** Hồ sơ theo tham số route (`profileId`); không truyền → hồ sơ mặc định. */
export function useResolvedProfile(profileId: string | undefined): ResolvedProfileState {
  const db = useDatabase();
  const [state, setState] = useState<ResolvedProfileState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    (profileId ? getProfile(db, profileId) : getDefaultProfile(db)).then(
      (profile) => {
        if (!cancelled) setState(profile ? { status: 'ready', profile } : { status: 'missing' });
      },
      (error: unknown) => {
        if (cancelled) return;
        console.error('[profiles] Không đọc được hồ sơ', error);
        setState({ status: 'error', message: error instanceof Error ? error.message : String(error) });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [db, profileId]);

  return state;
}
