import { useState, type ReactNode } from 'react';
import { View } from 'react-native';

import { AppIcon, AppText, Badge, Button, Chip, TextField } from '@/components/ui';
import { strings } from '@/constants/strings.vi';
import { SIDE_EFFECT_TAGS, toggleSideEffectTag } from '@/features/medications/doseActions';
import type { SideEffectLog, SideEffectTag } from '@/types/models';
import { useTheme } from '@/theme';

const copy = strings.sideEffects;

export interface SideEffectPanelProps {
  /** Tên thuốc (cho trình đọc màn hình). */
  medicationName: string;
  logs: readonly SideEffectLog[];
  onSave: (tags: readonly SideEffectTag[], note: string | null) => Promise<boolean>;
  /** Nút đứng cùng hàng với nút "Ghi phản ứng" (VD: Hoàn tác). */
  trailing?: ReactNode;
}

/** Ghi nhanh phản ứng sau khi uống: Bình thường / Buồn ngủ / Khó chịu tiêu hóa / Chóng mặt / Khác. */
export function SideEffectPanel({ medicationName, logs, onSave, trailing }: SideEffectPanelProps) {
  const { spacing } = useTheme();
  const savedTags = logs.map((log) => log.tag);
  const savedNote = logs.find((log) => log.tag === 'other')?.note ?? '';
  const [open, setOpen] = useState(false);
  const [tags, setTags] = useState<SideEffectTag[]>(savedTags);
  const [note, setNote] = useState(savedNote);

  if (!open) {
    return (
      <View style={{ gap: spacing.xs }}>
        {savedTags.length > 0 ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
            {logs.map((log) => (
              <Badge
                key={log.id}
                tone={log.tag === 'normal' ? 'success' : 'warning'}
                icon={log.tag === 'normal' ? 'happy-outline' : 'pulse-outline'}
                label={log.tag === 'other' && log.note ? `${copy.tags.other}: ${log.note}` : copy.tags[log.tag]}
              />
            ))}
          </View>
        ) : null}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
          <Button
            title={copy.open}
            icon="create-outline"
            variant="ghost"
            compact
            accessibilityLabel={copy.openFor(medicationName)}
            onPress={() => {
              setTags(savedTags);
              setNote(savedNote);
              setOpen(true);
            }}
          />
          {trailing}
        </View>
      </View>
    );
  }

  const toggle = (tag: SideEffectTag) => {
    const next = toggleSideEffectTag(tags, tag);
    setTags(next);
    void onSave(next, next.includes('other') ? note.trim() || null : null);
  };
  const showSafety = tags.includes('drowsy') || tags.includes('dizzy');

  return (
    <View style={{ gap: spacing.sm }}>
      <AppText variant="label">{copy.title}</AppText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {SIDE_EFFECT_TAGS.map((tag) => (
          <Chip key={tag} label={copy.tags[tag]} selected={tags.includes(tag)} onPress={() => toggle(tag)} />
        ))}
      </View>
      {tags.includes('other') ? (
        <>
          <TextField
            label={copy.noteLabel}
            value={note}
            onChangeText={setNote}
            placeholder={copy.notePlaceholder}
            maxLength={200}
          />
          <Button
            title={copy.saveNote}
            icon="save-outline"
            variant="outline"
            onPress={() => void onSave(tags, note.trim() || null)}
          />
        </>
      ) : null}
      {showSafety ? (
        <View style={{ flexDirection: 'row', gap: spacing.xs, alignItems: 'flex-start' }}>
          <AppIcon name="warning-outline" color="warning" size={18} />
          <AppText variant="bodySmall" color="warning" style={{ flex: 1 }}>
            {copy.safetyNote}
          </AppText>
        </View>
      ) : null}
      <Button title={strings.doseActions.close} variant="ghost" onPress={() => setOpen(false)} />
    </View>
  );
}
