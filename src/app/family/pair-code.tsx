import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { AppIcon, AppText, Button, Card, EmptyState, ErrorState, LoadingState, Screen } from '@/components/ui';
import { strings } from '@/constants/strings.vi';
import { useCaregiverSession } from '@/features/family/CaregiverSessionProvider';
import { describeBackendError } from '@/services/backend/errorMessages';
import type { PairingCode } from '@/services/backend/familyApi';
import { buildPairingQr } from '@/services/backend/pairingPayload';
import { colorTokens, navyPalette, useTheme } from '@/theme';

const copy = strings.family.pairCode;
/** Bao lâu kiểm tra một lần xem ông bà đã đồng ý chưa. */
const POLL_MS = 4000;

type PairState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; pairing: PairingCode; knownLinkIds: string[] }
  | { status: 'connected'; profileName: string };

/** Con cháu cho ông bà quét mã (Milestone 2.5C). */
export default function PairCodeScreen() {
  const router = useRouter();
  const { spacing, radius, colors } = useTheme();
  const { state: session, api } = useCaregiverSession();
  const [state, setState] = useState<PairState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const token = session.status === 'signedIn' ? session.session.token : null;
  const knownRef = useRef<string[]>([]);

  // Tạo mã (lần đầu / bấm "Tạo mã mới").
  useEffect(() => {
    if (!api || !token) return undefined;
    let cancelled = false;
    Promise.all([api.listLinks(token), api.createPairing(token)]).then(
      ([links, pairing]) => {
        if (cancelled) return;
        knownRef.current = links.map((link) => link.id);
        setNow(Date.now());
        setState({ status: 'ready', pairing, knownLinkIds: knownRef.current });
      },
      (error: unknown) => {
        if (!cancelled) setState({ status: 'error', message: describeBackendError(error) });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [api, token, attempt]);

  // Đếm ngược + kiểm tra định kỳ khi màn hình đang mở.
  const poll = useCallback(() => {
    if (!api || !token || state.status !== 'ready') return undefined;
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    const checker = setInterval(() => {
      api.listLinks(token).then(
        (links) => {
          const fresh = links.find((link) => link.status === 'active' && !knownRef.current.includes(link.id));
          if (fresh) setState({ status: 'connected', profileName: fresh.profileName });
        },
        () => undefined, // mất mạng thoáng qua: thử lại ở lần sau
      );
    }, POLL_MS);
    return () => {
      clearInterval(timer);
      clearInterval(checker);
    };
  }, [api, token, state.status]);
  useFocusEffect(poll);

  if (!api || session.status !== 'signedIn') {
    return (
      <Screen centered>
        <EmptyState icon="people-outline" title={strings.family.disabledTitle} />
      </Screen>
    );
  }

  const retry = () => {
    setState({ status: 'loading' });
    setAttempt((value) => value + 1);
  };

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
        <ErrorState message={`${copy.createFailed}\n${state.message}`} onRetry={retry} />
      </Screen>
    );
  }
  if (state.status === 'connected') {
    return (
      <Screen centered safeBottom>
        <EmptyState icon="checkmark-circle" title={copy.connectedTitle} description={copy.connected(state.profileName)} />
        <Button title={copy.done} icon="checkmark" fullWidth onPress={() => router.back()} />
      </Screen>
    );
  }

  const secondsLeft = Math.max(0, Math.floor((Date.parse(state.pairing.expiresAt) - now) / 1000));
  const expired = secondsLeft === 0;

  return (
    <Screen safeBottom>
      <AppText>{copy.intro}</AppText>

      <Card style={{ alignItems: 'center', gap: spacing.lg }}>
        {/* Mã QR luôn đen-trắng (navy đậm trên nền trắng) để camera đọc tốt ở cả chế độ Tối. */}
        <View
          style={{
            padding: spacing.md,
            borderRadius: radius.md,
            backgroundColor: colorTokens.light.surface,
            opacity: expired ? 0.15 : 1,
          }}
          accessible
          accessibilityRole="image"
          accessibilityLabel={copy.codeLabel}
        >
          <QRCode
            value={buildPairingQr(state.pairing.token)}
            size={220}
            color={navyPalette.navy950}
            backgroundColor={colorTokens.light.surface}
            ecl="M"
          />
        </View>
        <AppText variant="label" color="textSecondary">
          {copy.codeLabel}
        </AppText>
        <AppText
          variant="display"
          accessibilityLabel={state.pairing.code.split('').join(' ')}
          style={{ letterSpacing: 6, fontVariant: ['tabular-nums'] }}
        >
          {`${state.pairing.code.slice(0, 3)} ${state.pairing.code.slice(3)}`}
        </AppText>
        <AppText color={expired ? 'danger' : 'textSecondary'} accessibilityLiveRegion="polite">
          {expired ? copy.expired : copy.expiresIn(Math.floor(secondsLeft / 60), secondsLeft % 60)}
        </AppText>
      </Card>

      {!expired ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <ActivityIndicator color={colors.primary} />
          <AppText color="textSecondary" style={{ flex: 1 }}>
            {copy.waiting}
          </AppText>
        </View>
      ) : null}

      <Button title={copy.newCode} icon="refresh" variant={expired ? 'primary' : 'outline'} fullWidth onPress={retry} />

      <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' }}>
        <AppIcon name="shield-checkmark-outline" color="primary" size={20} />
        <AppText variant="bodySmall" color="textSecondary" style={{ flex: 1 }}>
          {copy.note}
        </AppText>
      </View>
    </Screen>
  );
}
