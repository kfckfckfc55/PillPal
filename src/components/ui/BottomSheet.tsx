import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { strings } from '@/constants/strings.vi';
import { layout, useTheme } from '@/theme';

import { AppText } from './AppText';
import { Button } from './Button';

export interface BottomSheetProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/**
 * Bảng thao tác trượt từ dưới lên (thay cho hộp thoại hệ thống — Android chỉ cho tối đa 3 nút).
 * Chạm nền tối hoặc nút "Đóng" để đóng; nút Back của Android cũng đóng.
 */
export function BottomSheet({ visible, title, onClose, children }: BottomSheetProps) {
  const { colors, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={strings.doseActions.close}
            onPress={onClose}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.scrim }}
          />
          <View
            accessibilityViewIsModal
            style={{
              width: '100%',
              maxWidth: layout.contentMaxWidth,
              alignSelf: 'center',
              maxHeight: '90%',
              backgroundColor: colors.surface,
              borderTopLeftRadius: radius.lg,
              borderTopRightRadius: radius.lg,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{
                padding: spacing.lg,
                paddingBottom: spacing.lg + insets.bottom,
                gap: spacing.md,
              }}
            >
              <AppText variant="title" accessibilityRole="header">
                {title}
              </AppText>
              {children}
              <Button title={strings.doseActions.close} variant="ghost" fullWidth onPress={onClose} />
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
