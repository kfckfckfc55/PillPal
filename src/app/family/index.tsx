import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, View } from 'react-native';

import {
  AppIcon,
  AppText,
  Button,
  Card,
  EmptyState,
  LoadingState,
  Screen,
  Section,
  TextField,
} from '@/components/ui';
import { strings } from '@/constants/strings.vi';
import { useCaregiverSession } from '@/features/family/CaregiverSessionProvider';
import { describeBackendError } from '@/services/backend/errorMessages';
import { maskPhone } from '@/services/backend/phone';
import { useTheme } from '@/theme';

const copy = strings.family;

/** Màn hình Gia đình của người thân (con cháu) — Milestone 2.5B: tài khoản; theo dõi ở 2.5C/2.5D. */
export default function FamilyScreen() {
  const router = useRouter();
  const { spacing } = useTheme();
  const { state, signOut, rename, deleteAccount } = useCaregiverSession();
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const [busy, setBusy] = useState<'rename' | 'delete' | null>(null);

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
        <Card>
          <EmptyState icon="qr-code-outline" title={copy.followingEmpty} />
        </Card>
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
    </Screen>
  );
}
