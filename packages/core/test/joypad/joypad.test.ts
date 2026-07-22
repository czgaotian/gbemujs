import { expect, test } from 'vitest';
import { GameBoy } from '../../src/emu/emu';
import { INTERRUPT_TYPE } from '../../src/types';

test('P1 resets to the idle readable value', () => {
  const gameBoy = new GameBoy();
  gameBoy.init();

  expect(gameBoy.busRead(0xff00)).toBe(0xff);
});

test('a selected action button reads low and requests the Joypad interrupt', () => {
  const gameBoy = new GameBoy();
  gameBoy.init();
  gameBoy.busWrite(0xff00, 0x10);

  gameBoy.joypad.a = true;
  gameBoy.joypad.update();

  expect(gameBoy.busRead(0xff00)).toBe(0xde);
  expect(gameBoy.intFlags & INTERRUPT_TYPE.JOYPAD).toBe(
    INTERRUPT_TYPE.JOYPAD
  );
});

test('selecting a group containing a held button requests the Joypad interrupt', () => {
  const gameBoy = new GameBoy();
  gameBoy.init();
  gameBoy.joypad.a = true;
  gameBoy.joypad.update();

  gameBoy.busWrite(0xff00, 0x10);

  expect(gameBoy.busRead(0xff00)).toBe(0xde);
  expect(gameBoy.intFlags & INTERRUPT_TYPE.JOYPAD).toBe(
    INTERRUPT_TYPE.JOYPAD
  );
});
