import { useState } from 'react';
import { Alert } from 'react-native';

import { AppText, Button, Card, TextField } from '@/components/ui';
import { strings } from '@/constants/strings.vi';
import { useDatabase } from '@/db/DatabaseProvider';
import { createSelfProfile } from '@/db/repositories/profileRepository';

const copy = strings.profiles;
const MAX_NAME_LENGTH = 50;

/** Tạo hồ sơ đầu tiên khi máy chưa có hồ sơ nào (bản cài mới, không có dữ liệu mẫu). */
export function CreateProfileCard({ onCreated }: { onCreated: () => void }) {
  const db = useDatabase();
  const [name, setName] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  const trimmed = name.trim();
  const invalid = trimmed.length === 0 || trimmed.length > MAX_NAME_LENGTH;

  function handleCreate() {
    setSubmitted(true);
    if (invalid || saving) return;
    setSaving(true);
    createSelfProfile(db, trimmed).then(
      () => {
        setSaving(false);
        onCreated();
      },
      (error: unknown) => {
        console.error('[profiles] Không tạo được hồ sơ', error);
        setSaving(false);
        Alert.alert(strings.common.errorTitle, copy.createFailed);
      },
    );
  }

  return (
    <Card>
      <AppText variant="title">{copy.createTitle}</AppText>
      <AppText color="textSecondary">{copy.createDescription}</AppText>
      <TextField
        label={copy.nameLabel}
        value={name}
        onChangeText={setName}
        placeholder={copy.namePlaceholder}
        maxLength={MAX_NAME_LENGTH}
        autoCapitalize="words"
        returnKeyType="done"
        onSubmitEditing={handleCreate}
        error={submitted && invalid ? copy.nameError : undefined}
      />
      <Button title={copy.create} icon="person-add-outline" fullWidth loading={saving} onPress={handleCreate} />
      <AppText variant="bodySmall" color="textSecondary">
        {copy.familyLater}
      </AppText>
    </Card>
  );
}
