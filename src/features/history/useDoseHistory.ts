import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { useDatabase } from '@/db/DatabaseProvider';
import { listDoseEventsBetween, type DoseEventWithMedication } from '@/db/repositories/doseEventRepository';
import { listSideEffectsForDoses } from '@/db/repositories/sideEffectRepository';
import type { SideEffectLog } from '@/types/models';

import { historyRange } from './doseHistory';

export type DoseHistoryState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; now: Date; doses: DoseEventWithMedication[]; sideEffects: SideEffectLog[] };

/** Cữ thuốc 7 ngày gần nhất của một hồ sơ (tự tải lại khi quay về màn hình). */
export function useDoseHistory(profileId: string | null) {
  const db = useDatabase();
  const [state, setState] = useState<DoseHistoryState>({ status: 'loading' });

  const load = useCallback(() => {
    if (!profileId) return undefined;
    let cancelled = false;
    const now = new Date();
    const { from, to } = historyRange(now);
    listDoseEventsBetween(db, profileId, from.toISOString(), to.toISOString())
      .then(async (doses) => ({ doses, sideEffects: await listSideEffectsForDoses(db, doses.map((dose) => dose.id)) }))
      .then(
        ({ doses, sideEffects }) => {
          if (!cancelled) setState({ status: 'ready', now, doses, sideEffects });
        },
        (error: unknown) => {
          if (cancelled) return;
          console.error('[history] Không đọc được lịch sử', error);
          setState({ status: 'error', message: error instanceof Error ? error.message : String(error) });
        },
      );
    return () => {
      cancelled = true;
    };
  }, [db, profileId]);

  useFocusEffect(load);

  const retry = useCallback(() => {
    setState({ status: 'loading' });
    load();
  }, [load]);

  return { state, retry };
}
