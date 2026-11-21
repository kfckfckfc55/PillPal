import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, View } from 'react-native';

import {
  AppIcon,
  AppText,
  Button,
  Card,
  CheckboxRow,
  EmptyState,
  ErrorState,
  LoadingState,
  RadioGroup,
  Screen,
  Section,
  SwitchRow,
} from '@/components/ui';
import { LEGAL_DOCUMENT_VERSIONS } from '@/constants/disclaimer';
import { strings } from '@/constants/strings.vi';
import { useDatabase } from '@/db/DatabaseProvider';
import { listProfiles } from '@/db/repositories/profileRepository';
import { useCaregiverSession } from '@/features/family/CaregiverSessionProvider';
import { completeDevicePairing } from '@/features/family/devicePairing';
import { describeBackendError } from '@/services/backend/errorMessages';
import type { PairingPreview, PairingTarget, SharingPermissions } from '@/services/backend/familyApi';
import { normalizePairingCode } from '@/services/backend/pairingPayload';
import type { Profile } from '@/types/models';
import { useTheme } from '@/theme';

const copy = strings.family.consent;
const PERMISSION_KEYS = ['canViewMedications', 'canViewDoses', 'canReceiveAlerts'] as const;

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; preview: PairingPreview; profiles: Profile[] };

/**
 * Màn hình đồng ý chữ to trên MÁY CỦA ÔNG BÀ (Milestone 2.5C).
 * Mọi quyền mặc định TẮT; chính ông bà bật từng quyền và tự xác nhận — con cháu không đồng ý thay.
 */
export default function SharingConsentScreen() {
  const router = useRouter();
  const db = useDatabase();
  const { spacing } = useTheme();
  const { api } = useCaregiverSession();
  const params = useLocalSearchParams<{ token?: string; code?: string }>();
  const target: PairingTarget | null = params.token
    ? { token: params.token }
    : params.code && normalizePairingCode(params.code)
      ? { code: normalizePairingCode(params.code) as string }
      : null;
  const targetKey = params.token ?? params.code ?? '';

  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [profileId, setProfileId] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<SharingPermissions>({
    canViewMedications: false,
    canViewDoses: false,
    canReceiveAlerts: false,
  });
  const [selfConsent, setSelfConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!api || !targetKey) return undefined;
    let cancelled = false;
    const loadTarget: PairingTarget = params.token
      ? { token: params.token }
      : { code: normalizePairingCode(params.code ?? '') ?? '' };
    Promise.all([api.previewPairing(loadTarget), listProfiles(db)]).then(
      ([preview, profiles]) => {
        if (cancelled) return;
        const local = profiles.filter((profile) => !profile.isRemote);
        setProfileId((current) => current ?? local[0]?.id ?? null);
        setState({ status: 'ready', preview, profiles: local });
      },
      (error: unknown) => {
        if (!cancelled) setState({ status: 'error', message: describeBackendError(error) });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [api, db, targetKey, params.token, params.code, attempt]);

  if (!api || !target) {
    return (
      <Screen centered>
        <EmptyState icon="people-outline" title={strings.family.errors.invalid_pairing} />
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
  if (state.status === 'error') {
    return (
      <Screen centered>
        <ErrorState
          message={state.message}
          onRetry={() => {
            setState({ status: 'loading' });
            setAttempt((value) => value + 1);
          }}
        />
      </Screen>
    );
  }

  const { preview, profiles } = state;
  const requester = copy.requester(preview.caregiverName, preview.caregiverPhoneMasked);

  if (done !== null) {
    return (
      <Screen centered safeBottom>
        <EmptyState icon="checkmark-circle" title={copy.successTitle} description={copy.success(done)} />
        <Button title={strings.family.pairCode.done} icon="checkmark" fullWidth onPress={() => router.replace('/family/followers')} />
      </Screen>
    );
  }

  if (profiles.length === 0) {
    return (
      <Screen centered>
        <EmptyState icon="person-add-outline" title={copy.noProfile} />
      </Screen>
    );
  }

  const profile = profiles.find((item) => item.id === profileId) ?? profiles[0];
  const anyPermission = PERMISSION_KEYS.some((key) => permissions[key]);

  function agree() {
    if (!api || !target || !profile) return;
    setBusy(true);
    completeDevicePairing(db, api, {
      target,
      profile: { localId: profile.id, displayName: profile.displayName },
      permissions,
      deviceName: copy.deviceName,
    }).then(
      (result) => {
        setBusy(false);
        setDone(result.caregiverName || preview.caregiverName);
      },
      (error: unknown) => {
        setBusy(false);
        Alert.alert(strings.common.errorTitle, describeBackendError(error));
      },
    );
  }

  return (
    <Screen safeBottom>
      <Card variant="highlight">
        <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
          <AppIcon name="person-circle" color="onPrimaryContainer" size={44} />
          <View style={{ flex: 1, gap: spacing.xs }}>
            <AppText variant="title" color="onPrimaryContainer">
              {requester}
            </AppText>
            <AppText variant="subtitle" color="onPrimaryContainer">
              {copy.wantsToFollow}
            </AppText>
          </View>
        </View>
      </Card>

      {profiles.length > 1 ? (
        <Section title={copy.profileLabel}>
          <RadioGroup
            options={profiles.map((item) => ({ value: item.id, label: item.displayName, icon: 'person-outline' as const }))}
            value={profile?.id ?? ''}
            onChange={setProfileId}
            accessibilityLabel={copy.profileLabel}
          />
        </Section>
      ) : null}

      <Section title={copy.permissionsTitle}>
        {PERMISSION_KEYS.map((key) => (
          <SwitchRow
            key={key}
            label={copy.permissions[key].label}
            description={copy.permissions[key].description}
            value={permissions[key]}
            onValueChange={(value) => setPermissions((current) => ({ ...current, [key]: value }))}
          />
        ))}
        {!anyPermission ? (
          <AppText variant="bodySmall" color="textSecondary">
            {copy.noPermissionChosen}
          </AppText>
        ) : null}
      </Section>

      <Card>
        <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' }}>
          <AppIcon name="lock-closed-outline" color="primary" />
          <AppText style={{ flex: 1 }}>{copy.notShared}</AppText>
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' }}>
          <AppIcon name="hand-left-outline" color="primary" />
          <AppText style={{ flex: 1 }}>{copy.revokeNote}</AppText>
        </View>
        <AppText variant="bodySmall" color="textSecondary">
          {strings.welcome.version(LEGAL_DOCUMENT_VERSIONS.family_sharing)}
        </AppText>
      </Card>

      <CheckboxRow label={copy.selfConsent} checked={selfConsent} onChange={setSelfConsent} />

      <Button
        title={copy.agree}
        icon="checkmark-circle-outline"
        fullWidth
        loading={busy}
        disabled={!anyPermission || !selfConsent}
        onPress={agree}
      />
      <Button title={copy.decline} variant="ghost" fullWidth disabled={busy} onPress={() => router.back()} />
    </Screen>
  );
}
