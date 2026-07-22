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

  // 0xFF00 P1 初始为空闲状态：不选择任何按键组，所有输入均为高电平。
  p1 = 0xff;

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
    this.p1 = 0xff;
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

  private refreshP1() {
    const value = this.getKeyStatus();

    // 任意输入线从高电平变为低电平时请求 JOYPAD 中断。
    // 这也覆盖了先按住按键、后选择其所属按键组的情形。
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

  update() {
    this.refreshP1();
  }

  read() {
    return this.p1;
  }

  write(value: number) {
    // 只有 P1.4 和 P1.5 可写；更新选择位后可能会暴露已按住的按键。
    this.p1 = (value & 0x30) | (this.p1 & 0xcf);
    this.refreshP1();
  }
}
