import { Badge, EmptyState, Screen, type IconName } from '@/components/ui';
import { strings } from '@/constants/strings.vi';

export interface PlaceholderScreenProps {
  icon: IconName;
  title: string;
  description: string;
  /** VD: "Milestone 3" — hiển thị "Sẽ có ở Milestone 3". */
  milestone: string;
}

/** Màn hình tạm cho tab chưa được xây dựng. */
export function PlaceholderScreen({ icon, title, description, milestone }: PlaceholderScreenProps) {
  return (
    <Screen centered>
      <EmptyState icon={icon} title={title} description={description} />
      <Badge
        tone="info"
        icon="construct-outline"
        label={strings.common.comingSoon(milestone)}
        style={{ alignSelf: 'center' }}
      />
    </Screen>
  );
}
