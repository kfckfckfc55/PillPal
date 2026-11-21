import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState, type ReactNode } from 'react';
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
  Section,
  TextField,
} from '@/components/ui';
import { strings } from '@/constants/strings.vi';
import { useDatabase } from '@/db/DatabaseProvider';
import { listOutgoingLinks } from '@/db/repositories/familyLinkRepository';
import { useCaregiverSession } from '@/features/family/CaregiverSessionProvider';
import { describeBackendError } from '@/services/backend/errorMessages';
import type { FamilyLinkRecord } from '@/services/backend/familyApi';
import { maskPhone } from '@/services/backend/phone';
import { useTheme } from '@/theme';

const copy = strings.family;

const PERMISSION_KEYS = ['canViewMedications', 'canViewDoses', 'canReceiveAlerts'] as const;

/** Phần dành cho máy của ông bà: quét mã ghép, xem ai đang theo dõi mình. */
function ElderSection() {
  const router = useRouter();
  const db = useDatabase();
  const [followerCount, setFollowerCount] = useState(0);

  // Đếm theo bản lưu trên máy (không cần mạng); màn hình "Ai đang theo dõi tôi" mới hỏi máy chủ.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      listOutgoingLinks(db).then(
        (items) => {
          if (!cancelled) setFollowerCount(items.filter((item) => item.status === 'active').length);
        },
        () => undefined,
      );
      return () => {
        cancelled = true;
      };
    }, [db]),
  );

  return (
    <Section title={copy.elderSectionTitle} description={copy.elderSectionDescription}>
      <Button title={copy.scanEntry} icon="qr-code-outline" fullWidth onPress={() => router.push('/family/scan')} />
      <Button
        title={followerCount > 0 ? copy.followersEntry(followerCount) : copy.followersEntryNone}
        icon="people-outline"
        variant="outline"
        fullWidth
        onPress={() => router.push('/family/followers')}
      />
    </Section>
  );
}

/** Một người thân mình đang theo dõi. */
function FollowingItem({ link, busy, onStop }: { link: FamilyLinkRecord; busy: boolean; onStop: () => void }) {
  const { spacing } = useTheme();
  const active = link.status === 'active';
  const granted = PERMISSION_KEYS.filter((key) => link.permissions[key]);
  return (
    <Card>
      <View style={{ gap: spacing.xs }}>
        <AppText variant="title">{link.profileName || '—'}</AppText>
        <Badge
          tone={active ? 'success' : 'neutral'}
          icon={active ? 'eye-outline' : 'hand-left-outline'}
          label={copy.linkStatus[link.status]}
        />
        {active ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
            {granted.map((key) => (
              <Badge key={key} tone="info" icon="checkmark" label={copy.permissionsShort[key]} />
            ))}
          </View>
        ) : null}
      </View>
      <Button
        title={copy.stopFollowing}
        icon="close-circle-outline"
        variant="ghost"
        compact
        loading={busy}
        onPress={onStop}
      />
    </Card>
  );
}

/** Màn hình Gia đình — Milestone 2.5B/2.5C: tài khoản người thân, ghép máy, ai đang theo dõi. */
export default function FamilyScreen() {
  const router = useRouter();
  const { spacing } = useTheme();
  const { state, api, signOut, rename, deleteAccount } = useCaregiverSession();
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const [busy, setBusy] = useState<'rename' | 'delete' | null>(null);
  const [links, setLinks] = useState<FamilyLinkRecord[] | null>(null);
  const [linksError, setLinksError] = useState<string | null>(null);
  const [stoppingId, setStoppingId] = useState<string | null>(null);
  const caregiverToken = state.status === 'signedIn' ? state.session.token : null;

  // Danh sách người thân mình đang theo dõi (tải lại mỗi khi quay về màn hình).
  const loadLinks = useCallback(() => {
    if (!api || !caregiverToken) return undefined;
    let cancelled = false;
    api.listLinks(caregiverToken).then(
      (items) => {
        if (cancelled) return;
        setLinks(items);
        setLinksError(null);
      },
      (error: unknown) => {
        if (!cancelled) setLinksError(describeBackendError(error));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [api, caregiverToken]);
  useFocusEffect(loadLinks);

  if (state.status === 'disabled') {
    return (
      <Screen centered>
        <EmptyState icon="people-outline" title={copy.disabledTitle} description={copy.disabledDescription} />
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

  if (state.status === 'signedOut') {
    return (
      <Screen safeBottom>
        <Section title={copy.caregiverSectionTitle} description={copy.caregiverSectionDescription}>
          {state.expired ? (
            <Card>
              <AppText color="warning">{copy.sessionExpired}</AppText>
            </Card>
          ) : null}
          <AppText variant="title">{copy.introTitle}</AppText>
          <Card>
            {copy.introSteps.map((text, index) => (
              <View key={text} style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' }}>
                <AppText variant="label" color="primary">
                  {index + 1}.
                </AppText>
                <AppText style={{ flex: 1 }}>{text}</AppText>
              </View>
            ))}
          </Card>
          <Button title={copy.login} icon="call-outline" fullWidth onPress={() => router.push('/family/login')} />
        </Section>
        <ElderSection />
      </Screen>
    );
  }

  const { session, offline } = state;
  const name = nameDraft ?? session.displayName;

  function saveName() {
    setBusy('rename');
    rename(name).then(
      () => {
        setBusy(null);
        setNameDraft(null);
        Alert.alert(copy.accountTitle, copy.nameSaved);
      },
      (error: unknown) => {
        setBusy(null);
        Alert.alert(strings.common.errorTitle, describeBackendError(error));
      },
    );
  }

  function confirmStop(link: FamilyLinkRecord) {
    if (!api || !caregiverToken) return;
    const token = caregiverToken;
    Alert.alert(copy.stopFollowingConfirmTitle, copy.stopFollowingConfirmMessage(link.profileName || '—'), [
      { text: strings.common.cancel, style: 'cancel' },
      {
        text: copy.stopFollowing,
        style: 'destructive',
        onPress: () => {
          setStoppingId(link.id);
          api.deleteLink(token, link.id).then(
            () => {
              setStoppingId(null);
              setLinks((current) => current?.filter((item) => item.id !== link.id) ?? null);
            },
            (error: unknown) => {
              setStoppingId(null);
              Alert.alert(strings.common.errorTitle, describeBackendError(error));
            },
          );
        },
      },
    ]);
  }

  let followingContent: ReactNode;
  if (linksError) {
    followingContent = <AppText color="textSecondary">{`${copy.linksLoadError} ${linksError}`}</AppText>;
  } else if (links === null) {
    followingContent = <LoadingState />;
  } else if (links.length === 0) {
    followingContent = (
      <Card>
        <EmptyState icon="qr-code-outline" title={copy.followingEmpty} />
      </Card>
    );
  } else {
    followingContent = links.map((link) => (
      <FollowingItem key={link.id} link={link} busy={stoppingId === link.id} onStop={() => confirmStop(link)} />
    ));
  }

  function confirmDelete() {
    Alert.alert(copy.deleteConfirmTitle, copy.deleteConfirmMessage, [
      { text: strings.common.cancel, style: 'cancel' },
      {
        text: copy.deleteAccount,
        style: 'destructive',
        onPress: () => {
          setBusy('delete');
          deleteAccount().then(
            () => {
              setBusy(null);
              Alert.alert(copy.accountTitle, copy.deleted);
            },
            (error: unknown) => {
              setBusy(null);
              Alert.alert(strings.common.errorTitle, describeBackendError(error));
            },
          );
        },
      },
    ]);
  }

  return (
    <Screen keyboardAware safeBottom>
      {offline ? (
        <Card>
          <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' }}>
            <AppIcon name="cloud-offline-outline" color="warning" />
            <AppText style={{ flex: 1 }}>{copy.offline}</AppText>
          </View>
        </Card>
      ) : null}

      <Section title={copy.accountTitle}>
        <Card>
          <AppText variant="label">{copy.phoneLine(maskPhone(session.phone))}</AppText>
          <TextField
            label={copy.nameLabel}
            value={name}
            onChangeText={setNameDraft}
            placeholder={copy.namePlaceholder}
            maxLength={50}
            autoCapitalize="words"
          />
          <Button
            title={copy.saveName}
            icon="save-outline"
            variant="outline"
            loading={busy === 'rename'}
            disabled={busy !== null || nameDraft === null || name.trim() === session.displayName}
            onPress={saveName}
          />
        </Card>
      </Section>

      <Section title={copy.followingTitle}>
        {followingContent}
        <Button
          title={copy.addFollow}
          icon="add-circle-outline"
          fullWidth
          onPress={() => router.push('/family/pair-code')}
        />
      </Section>

      <View style={{ gap: spacing.sm }}>
        <Button
          title={copy.signOut}
          icon="log-out-outline"
          variant="outline"
          fullWidth
          disabled={busy !== null}
          onPress={() => {
            signOut().catch((error: unknown) => console.warn('[family] Không đăng xuất được', error));
          }}
        />
        <AppText variant="bodySmall" color="textSecondary">
          {copy.signOutNote}
        </AppText>
        <Button
          title={copy.deleteAccount}
          icon="trash-outline"
          variant="danger"
          fullWidth
          loading={busy === 'delete'}
          disabled={busy !== null}
          onPress={confirmDelete}
        />
      </View>

      <ElderSection />
    </Screen>
  );
}
