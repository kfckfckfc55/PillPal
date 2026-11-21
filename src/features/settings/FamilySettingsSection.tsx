import { useRouter } from 'expo-router';

import { Button, Section } from '@/components/ui';
import { strings } from '@/constants/strings.vi';
import { isFamilyFeatureAvailable } from '@/features/family/CaregiverSessionProvider';

/** Lối vào màn hình Gia đình — chỉ hiện khi tính năng gia đình được bật (thử nghiệm nội bộ). */
export function FamilySettingsSection() {
  const router = useRouter();
  if (!isFamilyFeatureAvailable()) return null;
  return (
    <Section title={strings.family.settingsTitle} description={strings.family.settingsDescription}>
      <Button
        title={strings.family.openFamily}
        icon="people-outline"
        variant="outline"
        fullWidth
        onPress={() => router.push('/family')}
      />
    </Section>
  );
}
