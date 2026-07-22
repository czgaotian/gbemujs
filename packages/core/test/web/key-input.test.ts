import { expect, test } from 'vitest';
import { updateJoypadKey } from '../../../web/src/key-input';

const joypad = () => ({
  a: false,
  b: false,
  select: false,
  start: false,
  right: false,
  left: false,
  up: false,
  down: false,
});

test.each([
  ['KeyW', 'up'],
  ['KeyA', 'left'],
  ['KeyS', 'down'],
  ['KeyD', 'right'],
  ['KeyG', 'select'],
  ['KeyH', 'start'],
  ['KeyJ', 'a'],
  ['KeyK', 'b'],
] as const)('pressing %s updates only %s', (code, button) => {
  const state = joypad();

  updateJoypadKey(state, code, true);

  expect(state).toEqual({ ...joypad(), [button]: true });
});

test('releasing a mapped key clears its state', () => {
  const state = { ...joypad(), a: true };

  updateJoypadKey(state, 'KeyJ', false);

  expect(state).toEqual(joypad());
});

test('an unmapped key does not change Joypad state', () => {
  const state = joypad();

  updateJoypadKey(state, 'KeyZ', true);

  expect(state).toEqual(joypad());
});
