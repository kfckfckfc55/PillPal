import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, View } from 'react-native';

import {
  AppIcon,
  AppText,
  Badge,
  Button,
  Card,
  EmptyState,
  LoadingState,
  Screen,
  SwitchRow,
} from '@/components/ui';
import { strings } from '@/constants/strings.vi';
import { useDatabase } from '@/db/DatabaseProvider';
import { listOutgoingLinks, syncOutgoingLinks, updateOutgoingLink } from '@/db/repositories/familyLinkRepository';
import { useCaregiverSession } from '@/features/family/CaregiverSessionProvider';
import { ensureDeviceAuth } from '@/features/family/devicePairing';
import { describeBackendError } from '@/services/backend/errorMessages';
import type { FamilyLinkRecord, SharingPermissions } from '@/services/backend/familyApi';
import { useTheme } from '@/theme';
import { formatDate } from '@/utils/format';

const copy = strings.family.followers;
const PERMISSION_KEYS = ['canViewMedications', 'canViewDoses', 'canReceiveAlerts'] as const;

type ViewState =
  | { status: 'loading' }
  | { status: 'notPaired' }
  | { status: 'ready'; token: string; links: FamilyLinkRecord[] }
  | { status: 'offline'; links: FamilyLinkRecord[] };

/** Máy ông bà: xem ai đang theo dõi, đổi quyền, thu hồi (Milestone 2.5C). */
export default function FollowersScreen() {
  const db = useDatabase();
  const { spacing } = useTheme();
  const { api } = useCaregiverSession();
  const [state, setState] = useState<ViewState>({ status: 'loading' });
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!api) return undefined;
    let cancelled = false;
    ensureDeviceAuth(api, strings.family.consent.deviceName)
      .then(async ({ token }) => {
        if (!token) return { status: 'notPaired' } as const;
        const links = await api.listLinks(token);
        // Cập nhật bản lưu trên máy (vd. con cháu đã ngừng theo dõi). Lỗi ghi cục bộ không chặn màn hình.
        await syncOutgoingLinks(
          db,
          links.map((link) => ({ ...link, caregiverName: link.caregiverName || link.caregiverPhoneMasked })),
        ).catch((error: unknown) => console.warn('[family] Không cập nhật được bản lưu liên kết', error));
        return { status: 'ready', token, links } as const;
      })
      .catch(async () => {
        // Mất mạng: hiện bản lưu trên máy.
        const local = await listOutgoingLinks(db);
        return {
          status: 'offline',
          links: local.map(
            (link): FamilyLinkRecord => ({
              id: link.remoteId ?? link.id,
              profileId: link.profileId,
              caregiverId: '',
              status: link.status,
              permissions: link.permissions,
              caregiverName: link.memberDisplayName,
              caregiverPhoneMasked: '',
              profileName: '',
              consentedAt: link.consentedAt ?? '',
              revokedAt: link.revokedAt ?? '',
            }),
          ),
        } as const;
      })
      .then((next) => {
        if (!cancelled) setState(next);
      });
    return () => {
      cancelled = true;
    };
  }, [api, db]);
  useFocusEffect(load);

  if (!api) {
    return (
      <Screen centered>
        <EmptyState icon="people-outline" title={strings.family.disabledTitle} />
      </Screen>
    );
  }
  if (state.status === 'loading') {
    return (
      <Screen centered>
        <LoadingState />
      </Screen>
    );
  }
  if (state.status === 'notPaired') {
    return (
      <Screen centered>
        <EmptyState icon="people-outline" title={copy.notPaired} />
      </Screen>
    );
  }

  const online = state.status === 'ready';
  const replaceLink = (next: FamilyLinkRecord) =>
    setState((current) =>
      current.status === 'ready'
        ? { ...current, links: current.links.map((link) => (link.id === next.id ? next : link)) }
        : current,
    );

  function run(linkId: string, action: () => Promise<void>) {
    setBusyId(linkId);
    action().then(
      () => setBusyId(null),
      (error: unknown) => {
        setBusyId(null);
        Alert.alert(copy.saveFailed, describeBackendError(error));
      },
    );
  }

  function changePermission(link: FamilyLinkRecord, key: (typeof PERMISSION_KEYS)[number], value: boolean) {
    if (state.status !== 'ready') return;
    const permissions: SharingPermissions = { ...link.permissions, [key]: value };
    if (!PERMISSION_KEYS.some((item) => permissions[item])) {
      Alert.alert(copy.saveFailed, strings.family.errors.no_permission);
      return;
    }
    const { token } = state;
    run(link.id, async () => {
      const next = await api!.updateLink(token, link.id, { permissions });
      await updateOutgoingLink(db, link.id, { permissions });
      replaceLink(next);
    });
  }

  function confirmRevoke(link: FamilyLinkRecord) {
    if (state.status !== 'ready') return;
    const { token } = state;
    Alert.alert(copy.revokeConfirmTitle, copy.revokeConfirmMessage(link.caregiverName || link.caregiverPhoneMasked), [
      { text: strings.common.cancel, style: 'cancel' },
      {
        text: copy.revoke,
        style: 'destructive',
        onPress: () =>
          run(link.id, async () => {
            const next = await api!.updateLink(token, link.id, { revoke: true });
            await updateOutgoingLink(db, link.id, { status: 'revoked', revokedAt: next.revokedAt || null });
            replaceLink(next);
          }),
      },
    ]);
  }

  function remove(link: FamilyLinkRecord) {
    if (state.status !== 'ready') return;
    const { token } = state;
    run(link.id, async () => {
      await api!.deleteLink(token, link.id);
      await updateOutgoingLink(db, link.id, { deleted: true });
      setState((current) =>
        current.status === 'ready' ? { ...current, links: current.links.filter((item) => item.id !== link.id) } : current,
      );
    });
  }

  return (
    <Screen safeBottom>
      <AppText>{copy.intro}</AppText>
      {!online ? (
        <Card>
          <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' }}>
            <AppIcon name="cloud-offline-outline" color="warning" />
            <AppText style={{ flex: 1 }}>{copy.offline}</AppText>
          </View>
        </Card>
      ) : null}
      {state.links.length === 0 ? (
        <Card>
          <EmptyState icon="people-outline" title={copy.empty} />
        </Card>
      ) : null}
      {state.links.map((link) => {
        const active = link.status === 'active';
        const name = link.caregiverName || link.caregiverPhoneMasked || '—';
        return (
          <Card key={link.id}>
            <View style={{ gap: spacing.xs }}>
              <AppText variant="title">{name}</AppText>
              {/* Chưa đặt tên thì số đã che đã là tiêu đề — không lặp lại. */}
              {link.caregiverName && link.caregiverPhoneMasked ? (
                <AppText color="textSecondary">{link.caregiverPhoneMasked}</AppText>
              ) : null}
              {link.consentedAt ? (
                <AppText variant="bodySmall" color="textSecondary">
                  {copy.since(formatDate(link.consentedAt.replace(' ', 'T')))}
                </AppText>
              ) : null}
              <Badge
                tone={active ? 'success' : 'neutral'}
                icon={active ? 'eye-outline' : 'hand-left-outline'}
                label={strings.family.linkStatus[link.status]}
              />
            </View>
            {active
              ? PERMISSION_KEYS.map((key) => (
                  <SwitchRow
                    key={key}
                    label={strings.family.consent.permissions[key].label}
                    value={link.permissions[key]}
                    onValueChange={(value) => online && busyId === null && changePermission(link, key, value)}
                  />
                ))
              : null}
            {online && active ? (
              <Button
                title={copy.revoke}
                icon="hand-left-outline"
                variant="danger"
                fullWidth
                loading={busyId === link.id}
                disabled={busyId !== null}
                onPress={() => confirmRevoke(link)}
              />
            ) : null}
            {online && !active ? (
              <Button
                title={copy.remove}
                icon="trash-outline"
                variant="outline"
                fullWidth
                loading={busyId === link.id}
                disabled={busyId !== null}
                onPress={() => remove(link)}
              />
            ) : null}
          </Card>
        );
      })}
    </Screen>
  );
}
