import { GameBoy } from '../emu/emu';
import { INTERRUPT_TYPE } from '../types';
import { bitSet, bitTest } from '../utils';

export class Joypad {
  a = false;
  b = false;
  select = false;
  start = false;
  right = false;
  left = false;
  up = false;
  down = false;

  // 0xFF00 p1 register
  p1 = 0;

  constructor(private emu: GameBoy) {}

  init() {
    this.a = false;
    this.b = false;
    this.select = false;
    this.start = false;
    this.right = false;
    this.left = false;
    this.up = false;
    this.down = false;
    this.p1 = 0;
  }

  getKeyStatus() {
    let value = 0xff;

    if (!bitTest(this.p1, 4)) {
      if (this.right) value = bitSet(value, 0, false);
      if (this.left) value = bitSet(value, 1, false);
      if (this.up) value = bitSet(value, 2, false);
      if (this.down) value = bitSet(value, 3, false);
      value = bitSet(value, 4, false);
    }
    if (!bitTest(this.p1, 5)) {
      if (this.a) value = bitSet(value, 0, false);
      if (this.b) value = bitSet(value, 1, false);
      if (this.select) value = bitSet(value, 2, false);
      if (this.start) value = bitSet(value, 3, false);
      value = bitSet(value, 5, false);
    }

    return value;
  }

  update() {
    const value = this.getKeyStatus();

    if (
      (bitTest(this.p1, 0) && !bitTest(value, 0)) ||
      (bitTest(this.p1, 1) && !bitTest(value, 1)) ||
      (bitTest(this.p1, 2) && !bitTest(value, 2)) ||
      (bitTest(this.p1, 3) && !bitTest(value, 3))
    ) {
      this.emu.intFlags |= INTERRUPT_TYPE.JOYPAD;
    }

    this.p1 = value;
  }

  read() {
    return this.p1;
  }

  write(value: number) {
    this.p1 = (value & 0x30) | (this.p1 & 0xcf);
    this.p1 = this.getKeyStatus();
  }
}
