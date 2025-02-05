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
  public readRegister(registerType: RegisterType): number {
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
        return (this.a << 8) | this.f;
      case RegisterType.BC:
        return (this.b << 8) | this.c;
      case RegisterType.DE:
        return (this.d << 8) | this.e;
      case RegisterType.HL:
        return (this.h << 8) | this.l;
      case RegisterType.SP:
        return this.sp;
      case RegisterType.PC:
        return this.pc;
      default:
        return 0;
    }
  }
}
