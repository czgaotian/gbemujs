import { Flag, REGISTER_TYPE as RT } from '../types';
import { bitGet, bitSet } from '../utils';

export class Registers {
  // registers: a, f, b, c, d, e, h, l
  private _registers8: Uint8Array = new Uint8Array(8);
  // registers: pc, sp
  private _registers16: Uint16Array = new Uint16Array(2);

  public init() {
    this.a = 0x01; 
    this.f = 0xb0; 
    this.b = 0x00; 
    this.c = 0x13; 
    this.d = 0x00; 
    this.e = 0xd8; 
    this.h = 0x01; 
    this.l = 0x4d; 

    this.pc = 0x100; 
    this.sp = 0xfffe; 
  }

  // return u16 number
  public read(registerType: RT): number {
    switch (registerType) {
      case RT.A:
        return this.a;
      case RT.F:
        return this.f;
      case RT.B:
        return this.b;
      case RT.C:
        return this.c;
      case RT.D:
        return this.d;
      case RT.E:
        return this.e;
      case RT.H:
        return this.h;
      case RT.L:
        return this.l;
      case RT.AF:
        return this.af;
      case RT.BC:
        return this.bc;
      case RT.DE:
        return this.de;
      case RT.HL:
        return this.hl;
      case RT.SP:
        return this.sp;
      case RT.PC:
        return this.pc;
      default:
        return 0;
    }
  }

  public set(registerType: RT, val: number) {
    switch (registerType) {
      case RT.A:
        this.a = val;
        break;
      case RT.F:
        this.f = val & 0xF0; // The lower 4 bits of F should always be 0.
        break;
      case RT.B:
        this.b = val;
        break;
      case RT.C:
        this.c = val;
        break;
      case RT.D:
        this.d = val;
        break;
      case RT.E:
        this.e = val;
        break;
      case RT.H:
        this.h = val;
        break;
      case RT.L:
        this.l = val;
        break;

      case RT.AF:
        this.af = val;
        break;
      case RT.BC:
        this.bc = val;
        break;
      case RT.DE:
        this.de = val;
        break;
      case RT.HL:
        this.hl = val;
        break;

      case RT.PC:
        this.pc = val;
        break;
      case RT.SP:
        this.sp = val;
        break;
      case RT.NONE:
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

  public read8Bit(registerType: RT): number {
    switch (registerType) {
      case RT.A:
        return this.a & 0xFF;
      case RT.F:
        return this.f & 0xF0;
      case RT.B:
        return this.b & 0xFF;
      case RT.C:
        return this.c & 0xFF;
      case RT.D:
        return this.d & 0xFF;
      case RT.E:
        return this.e & 0xFF;
      case RT.H:
        return this.h & 0xFF;
      case RT.L:
        return this.l & 0xFF;
      default:
        throw new Error('Invalid register type');
    }
  }

  public set8Bit(registerType: RT, val: number) {
    switch (registerType) {
      case RT.A:
        this.a = val & 0xFF;
        break;
      case RT.F:
        this.f = val & 0xFF;
        break;
      case RT.B:
        this.b = val & 0xFF;
        break;
      case RT.C:
        this.c = val & 0xFF;
        break;
      case RT.D:
        this.d = val & 0xFF;
        break;
      case RT.E:
        this.e = val & 0xFF;
        break;
      case RT.H:
        this.h = val & 0xFF;
        break;
      case RT.L:
        this.l = val & 0xFF;
        break;
      case RT.NONE:
        throw new Error('Invalid register type');
    }
  }

  get a() {
    return this._registers8[0];
  }

  set a(value: number) {
    this._registers8[0] = value;
  }

  get f() {
    return this._registers8[1];
  }

  set f(value: number) {
    this._registers8[1] = value;
  }

  get b() {
    return this._registers8[2];
  }

  set b(value: number) {
    this._registers8[2] = value;
  }

  get c() {
    return this._registers8[3];
  }

  set c(value: number) {
    this._registers8[3] = value;
  }

  get d() {
    return this._registers8[4];
  }

  set d(value: number) {
    this._registers8[4] = value;
  }

  get e() {
    return this._registers8[5];
  }

  set e(value: number) {
    this._registers8[5] = value;
  }

  get h() {
    return this._registers8[6];
  }

  set h(value: number) {
    this._registers8[6] = value;
  }

  get l() {
    return this._registers8[7];
  }

  set l(value: number) {
    this._registers8[7] = value;
  }

  get af() {
    return (this._registers8[0] << 8) | this._registers8[1];
  }

  set af(value: number) {
    this._registers8[0] = value >>> 8 & 0xFF;
    this._registers8[1] = value & 0xF0;
  }

  get bc() {
    return (this._registers8[2] << 8) | this._registers8[3];
  }

  set bc(value: number) {
    this._registers8[2] = value >>> 8 & 0xFF;
    this._registers8[3] = value & 0xFF;
  }

  get de() {
    return (this._registers8[4] << 8) | this._registers8[5];
  }

  set de(value: number) {
    this._registers8[4] = value >>> 8 & 0xFF;
    this._registers8[5] = value & 0xFF;
  }

  get hl() {
    return (this._registers8[6] << 8) | this._registers8[7];
  }

  set hl(value: number) {
    this._registers8[6] = value >>> 8 & 0xFF;
    this._registers8[7] = value & 0xFF;
  }

  get pc() {
    return this._registers16[0];
  }

  set pc(value: number) {
    this._registers16[0] = value;
  }

  get sp() {
    return this._registers16[1];
  }

  set sp(value: number) {
    this._registers16[1] = value;
  }

  public get flagZ() {
    return bitGet(this.f, 7);
  }

  public get flagN() {
    return bitGet(this.f, 6);
  }

  public get flagH() {
    return bitGet(this.f, 5);
  }

  public get flagC() {
    return bitGet(this.f, 4);
  }
}
