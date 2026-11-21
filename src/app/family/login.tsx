import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';

import {
  AppIcon,
  AppText,
  Button,
  Card,
  CheckboxRow,
  EmptyState,
  Screen,
  TextField,
} from '@/components/ui';
import { LEGAL_DOCUMENT_VERSIONS } from '@/constants/disclaimer';
import { strings } from '@/constants/strings.vi';
import { useCaregiverSession } from '@/features/family/CaregiverSessionProvider';
import { describeBackendError } from '@/services/backend/errorMessages';
import { BackendError } from '@/services/backend/familyApi';
import { maskPhone, normalizeVietnamPhone } from '@/services/backend/phone';
import { useTheme } from '@/theme';

const copy = strings.family;

/** Đăng nhập người thân: số điện thoại → mã OTP 6 số (Milestone 2.5B). */
export default function FamilyLoginScreen() {
  const router = useRouter();
  const { spacing } = useTheme();
  const { state, api, signIn } = useCaregiverSession();

  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phoneText, setPhoneText] = useState('');
  const [consent, setConsent] = useState(false);
  const [phone, setPhone] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resendAt, setResendAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // Đếm ngược "Gửi lại mã sau … giây".
  useEffect(() => {
    if (resendAt === null) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [resendAt]);
  const secondsLeft = resendAt === null ? 0 : Math.max(0, Math.ceil((resendAt - now) / 1000));

  if (state.status === 'disabled' || !api) {
    return (
      <Screen centered>
        <EmptyState icon="people-outline" title={copy.disabledTitle} description={copy.disabledDescription} />
      </Screen>
    );
  }

  const normalized = normalizeVietnamPhone(phoneText);

  function sendCode(target: string) {
    if (!api) return;
    setBusy(true);
    setError(null);
    api.requestOtp(target).then(
      (sent) => {
        setBusy(false);
        setPhone(target);
        setCode('');
        setStep('code');
        setNow(Date.now());
        setResendAt(Date.now() + sent.resendIn * 1000);
      },
      (failure: unknown) => {
        setBusy(false);
        setError(describeBackendError(failure));
        if (failure instanceof BackendError && failure.code === 'too_many_requests' && failure.retryAfter) {
          setNow(Date.now());
          setResendAt(Date.now() + failure.retryAfter * 1000);
        }
      },
    );
  }

  function verify() {
    if (!api || !phone) return;
    setBusy(true);
    setError(null);
    api
      .verifyOtp(phone, code, LEGAL_DOCUMENT_VERSIONS.caregiver_account)
      .then((auth) => signIn(auth))
      .then(
        () => {
          setBusy(false);
          router.replace('/family');
        },
        (failure: unknown) => {
          setBusy(false);
          setError(describeBackendError(failure));
        },
      );
  }

  const devHint = __DEV__ ? (
    <Card>
      <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' }}>
        <AppIcon name="flask-outline" color="info" />
        <AppText variant="bodySmall" style={{ flex: 1 }}>
          {copy.testServerHint}
        </AppText>
      </View>
    </Card>
  ) : null;

  if (step === 'phone') {
    return (
      <Screen keyboardAware safeBottom>
        <AppText variant="title">{copy.phoneStepTitle}</AppText>
        <TextField
          label={copy.phoneLabel}
          value={phoneText}
          onChangeText={(value) => {
            setPhoneText(value);
            setError(null);
          }}
          placeholder={copy.phonePlaceholder}
          keyboardType="phone-pad"
          autoComplete="tel"
          textContentType="telephoneNumber"
          maxLength={16}
          error={error ?? (phoneText.length >= 10 && !normalized ? copy.phoneInvalid : undefined)}
        />
        <Card>
          <AppText variant="label">{copy.noticeTitle}</AppText>
          {copy.noticePoints.map((point) => (
            <View key={point} style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' }}>
              <AppIcon name="shield-checkmark-outline" color="primary" size={20} />
              <AppText style={{ flex: 1 }}>{point}</AppText>
            </View>
          ))}
          <AppText variant="bodySmall" color="textSecondary">
            {strings.welcome.version(LEGAL_DOCUMENT_VERSIONS.caregiver_account)}
          </AppText>
        </Card>
        <CheckboxRow label={copy.consentLabel} checked={consent} onChange={setConsent} />
        <Button
          title={copy.sendCode}
          icon="paper-plane-outline"
          fullWidth
          loading={busy}
          disabled={!normalized || !consent || secondsLeft > 0}
          onPress={() => normalized && sendCode(normalized)}
        />
        {secondsLeft > 0 ? (
          <AppText variant="bodySmall" color="textSecondary" align="center">
            {copy.resendIn(secondsLeft)}
          </AppText>
        ) : null}
        {devHint}
      </Screen>
    );
  }

  return (
    <Screen keyboardAware safeBottom>
      <AppText variant="title">{copy.codeStepTitle}</AppText>
      <AppText color="textSecondary">{copy.codeSentTo(phone ? maskPhone(phone) : '')}</AppText>
      <TextField
        label={copy.codeLabel}
        value={code}
        onChangeText={(value) => {
          setCode(value.replace(/\D/g, '').slice(0, 6));
          setError(null);
        }}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete={Platform.OS === 'android' ? 'sms-otp' : 'one-time-code'}
        maxLength={6}
        autoFocus
        error={error ?? undefined}
      />
      <Button
        title={copy.verify}
        icon="log-in-outline"
        fullWidth
        loading={busy}
        disabled={code.length !== 6}
        onPress={verify}
      />
      <Button
        title={secondsLeft > 0 ? copy.resendIn(secondsLeft) : copy.resend}
        icon="refresh"
        variant="outline"
        fullWidth
        disabled={busy || secondsLeft > 0 || !phone}
        onPress={() => phone && sendCode(phone)}
      />
      <Button
        title={copy.changePhone}
        variant="ghost"
        fullWidth
        disabled={busy}
        onPress={() => {
          setStep('phone');
          setError(null);
        }}
      />
      {devHint}
    </Screen>
  );
}
