type JoypadButton =
  | 'a'
  | 'b'
  | 'select'
  | 'start'
  | 'right'
  | 'left'
  | 'up'
  | 'down';

type JoypadState = Record<JoypadButton, boolean>;

// 集中转换浏览器键码，确保单个事件只更新一个 GB 按键。
const keyToButton: Partial<Record<string, JoypadButton>> = {
  KeyW: 'up',
  KeyA: 'left',
  KeyS: 'down',
  KeyD: 'right',
  KeyG: 'select',
  KeyH: 'start',
  KeyJ: 'a',
  KeyK: 'b',
};

export function updateJoypadKey(
  joypad: JoypadState,
  code: string,
  isPressed: boolean
): void {
  const button = keyToButton[code];
  if (button) joypad[button] = isPressed;
}
