import { reverse } from 'node:dns';
import { RegisterType } from '../types';

export class Registers {
  // 8位寄存器
  public a: number = 0;
  public b: number = 0;
  public c: number = 0;
  public d: number = 0;
  public e: number = 0;
  public h: number = 0;
  public l: number = 0;
  public f: number = 0;

  // 16位程序计数器和栈指针
  public pc: number = 0;
  public sp: number = 0;

  public reset(): void {
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

  // 获取16位组合寄存器
  public cpuReadRegister(registerType: RegisterType): number {
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

  public cpuSetRegister(registerType: RegisterType, val: number) {
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

  get flagZ(): boolean {
    return (this.f & 0x80) !== 0;
  }

  get flagC(): boolean {
    return (this.f & 0x10) !== 0;
  }
}
