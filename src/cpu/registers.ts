import { Flag, RegisterType } from '../types';
import { bitGet, bitSet } from '../utils';
import { CPU } from './cpu';


export class Registers {
  // 8位寄存器
  private _a: number = 0;
  private _b: number = 0;
  private _c: number = 0;
  private _d: number = 0;
  private _e: number = 0;
  private _h: number = 0;
  private _l: number = 0;
  private _f: number = 0;

  // 16位程序计数器和栈指针
  private _pc: number = 0;
  private _sp: number = 0;

  public init() {
    this.a = 0x01;
    this.b = 0x00;
    this.c = 0x13;
    this.d = 0x00;
    this.e = 0xd8;
    this.h = 0x01;
    this.l = 0x4d;
    this.f = 0xb0;

    this.sp = 0xfffe;
    this.pc = 0x100; // 0x100 是游戏程序的入口点
  }

  // return u16 number
  public read(registerType: RegisterType): number {
    switch (registerType) {
      case RegisterType.A:
        return this.a & 0xFFFF;
      case RegisterType.F:
        return this.f & 0xFFFF;
      case RegisterType.B:
        return this.b & 0xFFFF;
      case RegisterType.C:
        return this.c & 0xFFFF;
      case RegisterType.D:
        return this.d & 0xFFFF;
      case RegisterType.E:
        return this.e & 0xFFFF;
      case RegisterType.H:
        return this.h & 0xFFFF;
      case RegisterType.L:
        return this.l & 0xFFFF;
      case RegisterType.AF:
        return this.af & 0xFFFF;
      case RegisterType.BC:
        return this.bc & 0xFFFF;
      case RegisterType.DE:
        return this.de & 0xFFFF;
      case RegisterType.HL:
        return this.hl & 0xFFFF;
      case RegisterType.SP:
        return this.sp & 0xFFFF;
      case RegisterType.PC:
        return this.pc & 0xFFFF ;
      default:
        return 0;
    }
  }

  public set(registerType: RegisterType, val: number) {
    switch (registerType) {
      case RegisterType.A:
        this.a = val & 0xFF;
        break;
      case RegisterType.F:
        this.f = val & 0xF0; // The lower 4 bits of F should always be 0.
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
        this.af = val & 0xFFFF;
        break;
      case RegisterType.BC:
        this.bc = val & 0xFFFF;
        break;
      case RegisterType.DE:
        this.de = val & 0xFFFF;
        break;
      case RegisterType.HL:
        this.hl = val & 0xFFFF;
        break;

      case RegisterType.PC:
        this.pc = val & 0xFFFF;
        break;
      case RegisterType.SP:
        this.sp = val & 0xFFFF;
        break;
      case RegisterType.NONE:
        break;
    }
  }

  public setFlags(z: Flag, n: Flag, h: Flag, c: Flag) {
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

  public read8Bit(registerType: RegisterType): number {
    switch (registerType) {
      case RegisterType.A:
        return this.a & 0xFF;
      case RegisterType.B:
        return this.b & 0xFF;
      case RegisterType.C:
        return this.c & 0xFF;
      case RegisterType.D:
        return this.d & 0xFF;
      case RegisterType.E:
        return this.e & 0xFF;
      case RegisterType.H:
        return this.h & 0xFF;
      case RegisterType.L:
        return this.l & 0xFF;
      default:
        throw new Error('Invalid register type');
    }
  }

  public set8Bit(registerType: RegisterType, val: number) {
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
      case RegisterType.NONE:
        throw new Error('Invalid register type');
    }
  }

  get a() {
    return this._a & 0xFF;
  }

  set a(value: number) {
    this._a = value & 0xFF;
  }

  get b() {
    return this._b & 0xFF;
  }

  set b(value: number) {
    this._b = value & 0xFF;
  }

  get c() {
    return this._c & 0xFF;
  }

  set c(value: number) {
    this._c = value & 0xFF;
  }

  get d() {
    return this._d & 0xFF;
  }

  set d(value: number) {
    this._d = value & 0xFF;
  }

  get e() {
    return this._e & 0xFF;
  }

  set e(value: number) {
    this._e = value & 0xFF;
  }

  get h() {
    return this._h & 0xFF;
  }

  set h(value: number) {
    this._h = value & 0xFF;
  }

  get l() {
    return this._l & 0xFF;
  }

  set l(value: number) {
    this._l = value & 0xFF;
  }

  get f() {
    return this._f & 0xFF;
  }

  set f(value: number) {
    this._f = value & 0xFF;
  }

  get af() {
    return (this._a << 8) | this._f;
  }

  set af(value: number) {
    this._a = value >>> 8 & 0xFF;
    this._f = value & 0xF0;
  }

  get bc() {
    return (this._b << 8) | this._c;
  }

  set bc(value: number) {
    this._b = value >>> 8 & 0xFF;
    this._c = value & 0xFF;
  }

  get de() {
    return (this._d << 8) | this._e;
  }

  set de(value: number) {
    this._d = value >>> 8 & 0xFF;
    this._e = value & 0xFF;
  }

  get hl() {
    return (this._h << 8) | this._l;
  }

  set hl(value: number) {
    this._h = value >>> 8 & 0xFF;
    this._l = value & 0xFF;
  }

  get pc() {
    return this._pc & 0xFFFF;
  }

  set pc(value: number) {
    this._pc = value & 0xFFFF;
  }

  get sp() {
    return this._sp & 0xFFFF;
  }

  set sp(value: number) {
    this._sp = value & 0xFFFF;
  }

  public get flagZ() {
    return bitGet(this.f, 7);
  }

  public get flagC() {
    return bitGet(this.f, 4);
  }

  public get flagH() {
    return bitGet(this.f, 2);
  }

  public get flagN() {
    return bitGet(this.f, 6);
  }
}
