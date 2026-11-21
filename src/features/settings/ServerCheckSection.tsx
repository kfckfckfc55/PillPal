import { useState } from 'react';
import { View } from 'react-native';

import { AppIcon, AppText, Button, Card, Section } from '@/components/ui';
import { strings } from '@/constants/strings.vi';
import { backendConfig, checkServerHealth, type ServerHealth } from '@/services/backend/config';
import { useTheme } from '@/theme';

const copy = strings.devData.server;

/**
 * (Chỉ khi phát triển) Kiểm tra điện thoại có kết nối được máy chủ gia đình trên máy tính không.
 * Chỉ gọi /api/health — không gửi dữ liệu cá nhân.
 */
export function ServerCheckSection() {
  const { spacing } = useTheme();
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<ServerHealth | null>(null);
  const url = backendConfig.serverUrl;

  function check() {
    if (!url) return;
    setChecking(true);
    checkServerHealth(url).then((health) => {
      setResult(health);
      setChecking(false);
    });
  }

  return (
    <Section title={copy.title} description={copy.description}>
      <Card>
        <AppText variant="label">{url ?? copy.notConfigured}</AppText>
        <AppText variant="bodySmall" color="textSecondary">
          {backendConfig.familyFeatureEnabled ? copy.featureOn : copy.featureOff}
        </AppText>
        {result ? (
          <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' }}>
            <AppIcon name={result.ok ? 'checkmark-circle' : 'close-circle'} color={result.ok ? 'success' : 'danger'} />
            <AppText style={{ flex: 1 }} accessibilityLiveRegion="polite">
              {result.ok ? copy.ok(result.latencyMs) : copy.failed(result.error ?? '')}
            </AppText>
          </View>
        ) : null}
        {result && !result.ok ? (
          <AppText variant="bodySmall" color="textSecondary">
            {copy.hints}
          </AppText>
        ) : null}
      </Card>
      <Button
        title={copy.check}
        icon="pulse-outline"
        variant="outline"
        fullWidth
        loading={checking}
        disabled={!url}
        onPress={check}
      />
    </Section>
  );
}
