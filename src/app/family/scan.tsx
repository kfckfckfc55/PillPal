import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Linking, View } from 'react-native';

import { AppIcon, AppText, Button, Card, EmptyState, Screen, Section, TextField } from '@/components/ui';
import { strings } from '@/constants/strings.vi';
import { useCaregiverSession } from '@/features/family/CaregiverSessionProvider';
import { normalizePairingCode, parsePairingQr } from '@/services/backend/pairingPayload';
import { useTheme } from '@/theme';

const copy = strings.family.scan;

/** Máy ông bà quét mã QR (hoặc nhập 6 số) từ máy con cháu — Milestone 2.5C. */
export default function ScanPairingScreen() {
  const router = useRouter();
  const { spacing, radius, colors } = useTheme();
  const { api } = useCaregiverSession();
  const [permission, requestPermission] = useCameraPermissions();
  const [code, setCode] = useState('');
  const [scanError, setScanError] = useState<string | null>(null);
  const handled = useRef(false);

  if (!api) {
    return (
      <Screen centered>
        <EmptyState
          icon="people-outline"
          title={strings.family.disabledTitle}
          description={strings.family.disabledDescription}
        />
      </Screen>
    );
  }

  const goToConsent = (params: { token: string } | { code: string }) => {
    router.replace({ pathname: '/family/consent', params });
  };

  const onScanned = (result: BarcodeScanningResult) => {
    if (handled.current) return;
    const token = parsePairingQr(result.data);
    if (!token) {
      setScanError(copy.notKeben);
      return;
    }
    handled.current = true;
    goToConsent({ token });
  };

  const normalizedCode = normalizePairingCode(code);

  return (
    <Screen keyboardAware safeBottom>
      <AppText variant="title">{copy.intro}</AppText>

      {permission?.granted ? (
        <View
          style={{
            height: 320,
            borderRadius: radius.lg,
            overflow: 'hidden',
            borderWidth: 2,
            borderColor: colors.primary,
          }}
        >
          <CameraView
            style={{ flex: 1 }}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={onScanned}
          />
        </View>
      ) : (
        <Card>
          <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' }}>
            <AppIcon name="camera-outline" color="primary" />
            <AppText style={{ flex: 1 }}>
              {permission && !permission.canAskAgain ? copy.cameraDenied : copy.cameraPrimer}
            </AppText>
          </View>
          {permission && !permission.canAskAgain ? (
            <Button
              title={copy.openSettings}
              icon="settings-outline"
              variant="outline"
              onPress={() => {
                Linking.openSettings().catch(() => undefined);
              }}
            />
          ) : (
            <Button
              title={copy.allowCamera}
              icon="camera-outline"
              onPress={() => {
                requestPermission().catch(() => undefined);
              }}
            />
          )}
        </Card>
      )}

      {scanError ? (
        <AppText color="danger" accessibilityLiveRegion="polite">
          {scanError}
        </AppText>
      ) : null}

      <Section title={copy.manualTitle}>
        <TextField
          label={copy.manualLabel}
          value={code}
          onChangeText={(value) => setCode(value.replace(/[^\d\s-]/g, '').slice(0, 7))}
          keyboardType="number-pad"
          placeholder="123 456"
          maxLength={7}
        />
        <Button
          title={copy.manualContinue}
          icon="arrow-forward"
          fullWidth
          disabled={!normalizedCode}
          onPress={() => normalizedCode && goToConsent({ code: normalizedCode })}
        />
      </Section>
    </Screen>
  );
}
