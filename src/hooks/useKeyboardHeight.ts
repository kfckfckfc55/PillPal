import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/**
 * Chiều cao bàn phím đang hiện (0 khi ẩn).
 * Android vẽ tràn viền (edge-to-edge) nên cửa sổ không tự co lại khi bàn phím hiện —
 * màn hình dùng giá trị này để chừa chỗ cuộn, không để bàn phím che ô nhập.
 */
export function useKeyboardHeight(enabled = true): number {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (!enabled) return undefined;
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, (event) => setHeight(event.endCoordinates.height));
    const hide = Keyboard.addListener(hideEvent, () => setHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, [enabled]);

  return enabled ? height : 0;
}
