import { CPU } from "./cpu";
import { INTERRUPT_TYPE as IT } from "../types";

export function handleInterrupts(this: CPU) {
  const int_flags = this.emulator.intFlags & this.emulator.intEnableFlags;
  let service_int = 0;

  if (int_flags & IT.VBLANK) service_int = IT.VBLANK;
  else if (int_flags & IT.LCD_STAT) service_int = IT.LCD_STAT;
  else if (int_flags & IT.TIMER) service_int = IT.TIMER;
  else if (int_flags & IT.SERIAL) service_int = IT.SERIAL;
  else if (int_flags & IT.JOYPAD) service_int = IT.JOYPAD;

  this.emulator.intFlags &= ~service_int;
  this.disableInterruptMaster();
  this.emulator.tick(2);
  this.stackPush16(this.registers.pc);
  this.emulator.tick(2);

  switch (service_int) {
    case IT.VBLANK: this.registers.pc = 0x40; break;
    case IT.LCD_STAT: this.registers.pc = 0x48; break;
    case IT.TIMER: this.registers.pc = 0x50; break;
    case IT.SERIAL: this.registers.pc = 0x58; break;
    case IT.JOYPAD: this.registers.pc = 0x60; break;
  }
  this.emulator.tick(1);
}
