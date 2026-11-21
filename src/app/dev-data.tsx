import { useCallback, useEffect, useState } from 'react';
import { Alert, View } from 'react-native';

import {
  AppText,
  Button,
  Card,
  ErrorState,
  LoadingState,
  Screen,
  Section,
} from '@/components/ui';
import { strings } from '@/constants/strings.vi';
import { useDatabase } from '@/db/DatabaseProvider';
import { getDatabaseStats, type DatabaseStats } from '@/db/repositories/devRepository';
import { resetDatabase } from '@/db/reset';
import { useTheme } from '@/theme';

const copy = strings.devData;

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; stats: DatabaseStats };

/** Màn hình dev: xem số bản ghi từng bảng, nạp lại dữ liệu mẫu, xóa sạch dữ liệu. */
export default function DevDataScreen() {
  const db = useDatabase();
  const { colors, spacing } = useTheme();
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [busy, setBusy] = useState<'reseed' | 'wipe' | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getDatabaseStats(db).then(
      (stats) => {
        if (!cancelled) setState({ status: 'ready', stats });
      },
      (error: unknown) => {
        if (!cancelled) {
          setState({ status: 'error', message: error instanceof Error ? error.message : String(error) });
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [db, reloadKey]);

  const reload = useCallback(() => {
    setState({ status: 'loading' });
    setReloadKey((value) => value + 1);
  }, []);

  const runReset = useCallback(
    async (seed: boolean) => {
      setBusy(seed ? 'reseed' : 'wipe');
      try {
        await resetDatabase(db, { seed });
        Alert.alert(copy.doneTitle, seed ? copy.reseedDone : copy.wipeDone);
      } catch (error) {
        Alert.alert(copy.failedTitle, error instanceof Error ? error.message : String(error));
      } finally {
        setBusy(null);
        reload();
      }
    },
    [db, reload],
  );

  const confirm = useCallback(
    (seed: boolean) => {
      Alert.alert(
        seed ? copy.confirmReseedTitle : copy.confirmWipeTitle,
        seed ? copy.confirmReseedMessage : copy.confirmWipeMessage,
        [
          { text: strings.common.cancel, style: 'cancel' },
          {
            text: seed ? copy.reseed : copy.wipe,
            style: 'destructive',
            onPress: () => void runReset(seed),
          },
        ],
      );
    },
    [runReset],
  );

  if (!__DEV__) {
    return (
      <Screen centered safeBottom>
        <AppText align="center" color="textSecondary">
          {copy.devOnly}
        </AppText>
      </Screen>
    );
  }

  return (
    <Screen safeBottom>
      <AppText color="textSecondary">{copy.intro}</AppText>

      <Section title={copy.actionsTitle}>
        <View style={{ gap: spacing.md }}>
          <Button
            title={copy.reseed}
            icon="refresh"
            variant="secondary"
            fullWidth
            loading={busy === 'reseed'}
            disabled={busy !== null}
            onPress={() => confirm(true)}
          />
          <Button
            title={copy.wipe}
            icon="trash-outline"
            variant="danger"
            fullWidth
            loading={busy === 'wipe'}
            disabled={busy !== null}
            onPress={() => confirm(false)}
          />
        </View>
      </Section>

      <Section title={copy.tablesTitle}>
        {state.status === 'loading' ? <LoadingState /> : null}
        {state.status === 'error' ? (
          <ErrorState message={state.message} onRetry={reload} />
        ) : null}
        {state.status === 'ready' ? (
          <Card>
            <AppText variant="label">{copy.schemaVersion(state.stats.schemaVersion)}</AppText>
            <AppText variant="bodySmall" color="textSecondary">
              {copy.totalRecords(state.stats.totalRecords)}
            </AppText>
            <View style={{ marginTop: spacing.sm }}>
              {state.stats.counts.map(({ table, count }, index) => (
                <View
                  key={table}
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    paddingVertical: spacing.xs,
                    borderTopWidth: index === 0 ? 0 : 1,
                    borderTopColor: colors.border,
                  }}
                >
                  <AppText variant="bodySmall">{table}</AppText>
                  <AppText variant="bodySmall" weight="600" color={count > 0 ? 'textPrimary' : 'textSecondary'}>
                    {count}
                  </AppText>
                </View>
              ))}
            </View>
          </Card>
        ) : null}
      </Section>
    </Screen>
  );
}
