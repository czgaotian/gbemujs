import { Flag, RegisterType } from '../types';
import { bitSet } from '../utils';
import { CPU } from './cpu';

// 获取16位组合寄存器
export function readRegister(this: CPU, registerType: RegisterType): number {
  switch (registerType) {
    case RegisterType.A:
      return this.a;
    case RegisterType.F:
      return this.f;
    case RegisterType.B:
      return this.b;
    case RegisterType.C:
      return this.c;
    case RegisterType.D:
      return this.d;
    case RegisterType.E:
      return this.e;
    case RegisterType.H:
      return this.h;
    case RegisterType.L:
      return this.l;
    case RegisterType.AF:
      return (this.f << 8) | this.a;
    case RegisterType.BC:
      return (this.c << 8) | this.b;
    case RegisterType.DE:
      return (this.e << 8) | this.d;
    case RegisterType.HL:
      return (this.l << 8) | this.h;
    case RegisterType.SP:
      return this.sp;
    case RegisterType.PC:
      return this.pc;
    default:
      return 0;
  }
}

export function setRegister(this: CPU, registerType: RegisterType, val: number) {
  switch (registerType) {
    case RegisterType.A:
      this.a = val & 0xFF;
      break;
    case RegisterType.F:
      this.f = val & 0xFF;
      break;
    case RegisterType.B:
      this.b = val & 0xFF;
      break;
    case RegisterType.C:
      this.c = val & 0xFF;
      break;
    case RegisterType.D:
      this.d = val & 0xFF;
      break;
    case RegisterType.E:
      this.e = val & 0xFF;
      break;
    case RegisterType.H:
      this.h = val & 0xFF;
      break;
    case RegisterType.L:
      this.l = val & 0xFF;
      break;

    case RegisterType.AF:
      this.a = val & 0xFF;
      this.f = val >> 8 & 0xFF;
      break;
    case RegisterType.BC:
      this.b = val & 0xFF;
      this.c = val >> 8 & 0xFF;
      break;
    case RegisterType.DE:
      this.d = val & 0xFF;
      this.e = val >> 8 & 0xFF;
      break;
    case RegisterType.HL:
      this.h = val & 0xFF;
      this.l = val >> 8 & 0xFF;
      break;

    case RegisterType.PC:
      this.pc = val;
      break;
    case RegisterType.SP:
      this.sp = val;
      break;
    case RegisterType.NONE:
      break;
  }
}

export function setFlags(this: CPU, z: Flag, n: Flag, h: Flag, c: Flag) {
  if (z != -1) {
    this.f = bitSet(this.f, 7, !!z);
  }

  if (n != -1) {
    this.f = bitSet(this.f, 6, !!n);
  }

  if (h != -1) {
    this.f = bitSet(this.f, 5, !!h);
  }

  if (c != -1) {
    this.f = bitSet(this.f, 4, !!c);
  }
}

export function readRegister8Bit(this: CPU, registerType: RegisterType): number {
  switch (registerType) {
    case RegisterType.A:
      return this.a;
    case RegisterType.B:
      return this.b;
    case RegisterType.C:
      return this.c;
    case RegisterType.D:
      return this.d;
    case RegisterType.E:
      return this.e;
    case RegisterType.H:
      return this.h;
    case RegisterType.L:
      return this.l;
    case RegisterType.HL:
      return this.emulator.busRead(this.readRegister(RegisterType.HL));
    default:
      throw new Error('Invalid register type');
  }
}

export function setRegister8Bit(this: CPU, registerType: RegisterType, val: number) {
  switch (registerType) {
    case RegisterType.A:
      this.a = val & 0xFF;
      break;
    case RegisterType.B:
      this.b = val & 0xFF;
      break;
    case RegisterType.C:
      this.c = val & 0xFF;
      break;
    case RegisterType.D:
      this.d = val & 0xFF;
      break;
    case RegisterType.E:
      this.e = val & 0xFF;
      break;
    case RegisterType.H:
      this.h = val & 0xFF;
      break;
    case RegisterType.L:
      this.l = val & 0xFF;
      break;
    case RegisterType.HL:
      this.emulator.busWrite(this.readRegister(RegisterType.HL), val & 0xFF);
      break;
    case RegisterType.NONE:
      throw new Error('Invalid register type');
  }
}