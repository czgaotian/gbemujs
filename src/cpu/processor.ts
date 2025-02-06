import { InstructionType as IN, AddressMode as AM, RegisterType as RT, ConditionType as CT, Flag } from '../types';
import { CPU } from './cpu';

function NOP() {
}

function NONE() {
  console.log('INVALID INSTRUCTION!\n');
  process.exit(-7);
}

const registerLookup = [
    RT.B,
    RT.C,
    RT.D,
    RT.E,
    RT.H,
    RT.L,
    RT.HL,
    RT.A
];

function decodeRegister(reg: number) {
  if (reg > 0b111) {
    return RT.NONE;
  }

  return registerLookup[reg];
}

function CB(this: CPU) {
  const op = this.fetchedData;
  const reg = decodeRegister(op & 0b111);
  const bit = (op >> 3) & 0b111;   // 被操作的位或移位操作类型
  const bit_op = (op >> 6) & 0b11; // 操作类型（位测试、复位、置位或移位）
  let registerValue = this.readRegister8Bit(reg);

  this.emulator.tick(1);

  if (reg == RT.HL)
  {
    this.emulator.tick(2);
  }

  switch (bit_op)
  {
  case 1:
    // BIT 位测试 测试寄存器值的指定位是否为 0，设置标志位
    this.setFlags(!(registerValue & (1 << bit)), 0, 1, -1);
    return;

  case 2:
    // RST 位复位
    registerValue &= ~(1 << bit);
    this.setRegister8Bit(reg, registerValue);
    return;

  case 3:
    // SET 位置位
    registerValue |= (1 << bit);
    this.setRegister8Bit(reg, registerValue);
    return;
  }

  // 其他情况, 根据 bit 值执行具体移位操作。
  let flagC = this.flagC;

  switch (bit)
  {
  case 0:
  {
    // RLC 带进位循环左移
    let setC = false;
    let result = (registerValue << 1) & 0xFF;

    if ((registerValue & (1 << 7)) != 0)
    {
      result |= 1;
      setC = true;
    }

    this.setRegister8Bit(reg, result);
    this.setFlags(result == 0, false, false, setC);
  }
    return;

  case 1:
  {
    // RRC /带进位循环右移
    let old = registerValue;
    registerValue >>= 1;
    registerValue |= (old << 7);

    this.setRegister8Bit(reg, registerValue);
    this.setFlags(!registerValue, false, false, !!(old & 1));
  }
    return;

  case 2:
  {
    // RL 通过进位标志循环左移
    let old = registerValue;
    registerValue <<= 1;
    registerValue |= flagC ? 1 : 0;

    this.setRegister8Bit(reg, registerValue);
    this.setFlags(!registerValue, false, false, !!(old & 0x80));
  }
    return;

  case 3:
  {
    // RR  通过进位标志循环右移
    let old = registerValue;
    registerValue >>= 1;

    registerValue |= (flagC ? 1 : 0) << 7;

    this.setRegister8Bit(reg, registerValue);
    this.setFlags(!registerValue, false, false, !!(old & 1));
  }
    return;

  case 4:
  {
    // SLA 算数左移
    let old = registerValue;
    registerValue <<= 1;

    this.setRegister8Bit(reg, registerValue);
    this.setFlags(!registerValue, false, false, !!(old & 0x80));
  }
    return;

  case 5:
  {
    // SRA 算术右移
    let u = (registerValue >> 1) & 0xFF;
    this.setRegister8Bit(reg, u);
    this.setFlags(!u, 0, 0, !!(registerValue & 1));
  }
    return;

  case 6:
  {
    // SWAP
    registerValue = ((registerValue & 0xF0) >> 4) | ((registerValue & 0xF) << 4);
    this.setRegister8Bit(reg, registerValue);
    this.setFlags(registerValue == 0, false, false, false);
  }
    return;

  case 7:
  {
    // SRL 逻辑右移
    let u = registerValue >> 1;
    this.setRegister8Bit(reg, u);
    this.setFlags(!u, 0, 0, !!(registerValue & 1));
  }
    return;
  }

  console.log(`ERROR: INVALID CB: ${op.toString(16)}`);
  NONE.call(this);
}

function RLCA(this: CPU) {
  const u = this.a;
  const c = (u >> 7) & 1;
  this.a = (u << 1) | c;

  this.setFlags(0, 0, 0, !!c);
}

// Rotate Right Circular Accumulator,
function RRCA(this: CPU) {
  const b = this.a & 1;
  this.a >>= 1;
  this.a |= (b << 7);

  this.setFlags(0, 0, 0, !!b);
}

function RLA(this: CPU) {
  const u = this.a;
  const cf = this.flagC;
  const c = (u >> 7) & 1;

  this.a = (u << 1) | (cf ? 1 : 0);
  this.setFlags(0, 0, 0, !!c);
}

function RRA(this: CPU) {
  const carry = this.flagC;
  const new_c = this.a & 1;

  this.a >>= 1;
  this.a |= (carry ? 1 : 0) << 7;

  this.setFlags(0, 0, 0, !!new_c);
}

function AND(this: CPU) {
  this.a &= this.fetchedData;
  this.setFlags(this.a == 0, 0, 1, 0);
}

function XOR(this: CPU) {
  this.a ^= this.fetchedData & 0xff;
  this.setFlags(this.a == 0, false, false, false);
}

function OR(this: CPU) {
  this.a |= this.fetchedData & 0xff;
  this.setFlags(this.a == 0, false, false, false);
}

function CP(this: CPU) {
  const n = this.a - this.fetchedData;

  this.setFlags(n == 0, 1,
    ((this.a & 0x0F) - (this.fetchedData & 0x0F)) < 0, n < 0);
}

function DI(this: CPU) {
  this.disableInterruptMaster();
}

function EI(this: CPU) {
  this.enableInterruptMaster();
}

function HALT(this: CPU) {
  this.halted = true;
}

const is16Bit = (rt: RT) => {
  return rt >= RT.AF;
}

function LD(this: CPU) {
  if (!this.instruction?.addressMode) {
    throw new Error('Address mode is required for LD instruction');
  }

  if (this.destinationIsMemory) // 写入内存 (dest_is_mem 为 true)
  {
    // LD (BC), A for instance...
    if (is16Bit(this.instruction.registerType2)) {
      this.emulator.tick(1); // 16位数据写入，需要额外周期
      this.emulator.busWrite16(this.memoryDestination, this.fetchedData);
    }
    else {
      this.emulator.busWrite(this.memoryDestination, this.fetchedData);
    }

    this.emulator.tick(1);

    return;
  }

  /*
  LD HL,SP+r8
  这个指令将SP加上r8的结果存入HL寄存器。它会设置以下标志位:

  零标志(Z)和负标志(N)被清零
  半进位标志(H):低4位相加≥0x10时置1
  进位标志(C):低8位相加≥0x100时置1
  */

  if (this.instruction.addressMode === AM.HL_SPR) {
    const hflag = (this.readRegister(this.instruction.registerType2) & 0xF) +
      (this.fetchedData & 0xF) >=
      0x10;

    const cflag = (this.readRegister(this.instruction.registerType2) & 0xFF) +
      (this.fetchedData & 0xFF) >=
      0x100;

    this.setFlags(0, 0, hflag, cflag);
    this.setRegister(this.instruction.registerType1,
      this.readRegister(this.instruction.registerType2) + this.fetchedData);

    return;
  }

  this.setRegister(this.instruction.registerType1, this.fetchedData); // 普通寄存器加载
}

/*
Load High,
从内存的高地址区(0xFF00 到 0xFFFF)域加载数据到寄存器, 或者将寄存器的数据写入内存的高地址区域
*/
function LDH(this: CPU) {
  // 如果当前指令的目标寄存器(reg_1)是寄存器 A, 则执行加载操作
  if (this.instruction?.registerType1 == RT.A)
  {
    this.setRegister(this.instruction?.registerType1, this.emulator.busRead(0xFF00 | this.fetchedData));
  }
  // 否则则执行存储操作
  else
  {
    this.emulator.busWrite(this.memoryDestination, this.fetchedData);
  }

  this.emulator.tick(1);
}

function checkCondition(cpu: CPU): boolean {
  if (!cpu.instruction?.conditionType) {
    return false;
  }

  switch (cpu.instruction.conditionType) {
    case CT.C:
      return !!cpu.flagC;
    case CT.NC:
      return !cpu.flagC;
    case CT.Z:
      return !!cpu.flagZ;
    case CT.NZ:
      return !cpu.flagZ;
    default:
      return false;
  }
}

function gotoAddress(cpu: CPU, addr: number, pushpc: boolean) {
  if (checkCondition(cpu)) {
    if (pushpc) {
      cpu.emulator.tick(2);
      cpu.stackPush16(cpu.pc);
    }
    cpu.pc = addr;
    cpu.emulator.tick(1);
  }
}

function JP(this: CPU) {
  gotoAddress(this, this.fetchedData, false);
}

// Jump Relative, 相对跳转操作
function JR(this: CPU) {
  // 直接转char以正确处理负数
  const relative = (this.fetchedData & 0xFF);
  const addr = this.pc + relative;
  gotoAddress(this, addr, false);
}

function CALL(this: CPU) {
  gotoAddress(this, this.fetchedData, true);
}

function RST(this: CPU) {
  if (!this.instruction?.param) {
    throw new Error('Param is required for RST instruction');
  }
  gotoAddress(this, this.instruction?.param, true);
}

function RET(this: CPU) {
  if (this.instruction?.conditionType != CT.NONE) {
    this.emulator.tick(1);
  }

  if (checkCondition(this)) {
    const low = this.stackPop();
    this.emulator.tick(1);
    const high = this.stackPop();
    this.emulator.tick(1);

    const n = (high << 8) | low;
    this.pc = n;

    this.emulator.tick(1);
  }
}

function RETI(this: CPU) {
  this.enableInterruptMaster();
  RET.call(this);
}

function POP(this: CPU) {
  if (!this.instruction?.registerType1) {
    throw new Error('Register type is required for POP instruction');
  }

  const low = this.stackPop();
  this.emulator.tick(1);
  const high = this.stackPop();
  this.emulator.tick(1);

  const val = (high << 8) | low;

  this.setRegister(this.instruction?.registerType1, val);

  // AF寄存器中的F部分(低8位)是标志寄存器(Flag Register),其低4位总是为0
  if (this.instruction?.registerType1 == RT.AF) {
    this.setRegister(this.instruction?.registerType1, val & 0xFFF0);
  }
}

function PUSH(this: CPU) {
  if (!this.instruction?.registerType1) {
    throw new Error('Register type is required for PUSH instruction');
  }

  const hi = (this.readRegister(this.instruction?.registerType1) >> 8) & 0xFF;
  this.emulator.tick(1);
  this.stackPush(hi);

  const lo = this.readRegister(this.instruction?.registerType1) & 0xFF;
  this.emulator.tick(1);
  this.stackPush(lo);

  // 第三个周期是指令本身的执行周期, 为了精确模拟原始硬件的时序特性
  this.emulator.tick(1);
}

function INC(this: CPU) {
  if (!this.instruction?.registerType1) {
    throw new Error('Register type is required for INC instruction');
  }

  let val = this.readRegister(this.instruction.registerType1) + 1;

  if (is16Bit(this.instruction.registerType1)) {
    this.emulator.tick(1);
  }

  // 如果是对内存(HL)操作,则从总线读写数据
  if (this.instruction.registerType1 === RT.HL && this.instruction.addressMode === AM.MR) {
    val = this.emulator.busRead(this.readRegister(RT.HL)) + 1;
    val &= 0xFF;
    this.emulator.busWrite(this.readRegister(RT.HL), val);
  }
  else {
    this.setRegister(this.instruction.registerType1, val);
    val = this.readRegister(this.instruction.registerType1);
  }

  // 检查操作码最后两位是否为 11(0x03), 如果是则不更新标志位
  if ((this.opcode & 0x03) == 0x03) {
    return;
  }

  // 更新标志位: Z:结果是否为0 N:设为0 H:低4位是否溢出 C:保持不变
  this.setFlags(val == 0, 0, (val & 0x0F) == 0, -1);
}

function DEC(this: CPU) {
  if (!this.instruction?.registerType1) {
    throw new Error('Register type is required for DEC instruction');
  }

  let val = this.readRegister(this.instruction.registerType1) - 1;

  if (is16Bit(this.instruction.registerType1)) {
    this.emulator.tick(1);
  }

  if (this.instruction.registerType1 === RT.HL && this.instruction.addressMode === AM.MR) {
    val = this.emulator.busRead(this.readRegister(RT.HL)) - 1;
    this.emulator.busWrite(this.readRegister(RT.HL), val);
  }
  else {
    this.setRegister(this.instruction.registerType1, val);
    val = this.readRegister(this.instruction.registerType1);
  }

  // 检查操作码是否匹配模式 xxxx1011(0x0B)。如果是，则直接返回不更新标志位
  if ((this.opcode & 0x0B) == 0x0B) {
    return;
  }

  // 更新标志位: Z:结果是否为0 N:设为1 H:低4位是否借位 C:保持不变
  this.setFlags(val == 0, true, (val & 0x0F) == 0x0F, -1);
}

function SUB(this: CPU) {
  if (!this.instruction?.registerType1) {
    throw new Error('Register type is required for SUB instruction');
  }

  const val = this.readRegister(this.instruction.registerType1) - this.fetchedData;

  const z = val == 0;
  const h = ((this.readRegister(this.instruction.registerType1) & 0xF) - (this.fetchedData & 0xF)) < 0;
  const c = (this.readRegister(this.instruction.registerType1) - this.fetchedData) < 0;

  this.setRegister(this.instruction.registerType1, val);
  this.setFlags(z, true, h, c);
}

function SBC(this: CPU) {
  if (!this.instruction?.registerType1) {
    throw new Error('Register type is required for SBC instruction');
  }

  const cflagValue = this.flagC ? 1 : 0;
  const val = this.fetchedData + cflagValue;
  const z = this.readRegister(this.instruction.registerType1) - val == 0;
  const h = ((this.readRegister(this.instruction.registerType1) & 0xF) - (this.fetchedData & 0xF) - cflagValue) < 0;
  const c = (this.readRegister(this.instruction.registerType1) - this.fetchedData - cflagValue) < 0;

  this.setRegister(this.instruction.registerType1, val);
  this.setFlags(z, true, h, c);
}

function ADC(this: CPU) {
  if (!this.instruction?.registerType1) {
    throw new Error('Register type is required for ADC instruction');
  }

  const u = this.fetchedData;
  const a = this.a;
  const c = this.flagC ? 1 : 0;

  this.a = (a + u + c) & 0xFF;

  this.setFlags(this.a == 0, 0,
    (a & 0xF) + (u & 0xF) + c > 0xF,
    a + u + c > 0xFF);
}

function ADD(this: CPU) {
  if (!this.instruction?.registerType1) {
    throw new Error('Register type is required for ADD instruction');
  }

  let val = this.readRegister(this.instruction.registerType1) + this.fetchedData;

  const is_16bit = is16Bit(this.instruction.registerType1);

  if (is_16bit) {
    this.emulator.tick(1);
  }

  if (this.instruction.registerType1 == RT.SP) {
    val = this.readRegister(this.instruction.registerType1) + this.fetchedData;
  }

  let z: Flag = (val & 0xFF) == 0;
  let h: Flag = (this.readRegister(this.instruction.registerType1) & 0xF) + (this.fetchedData & 0xF) >= 0x10;
  let c: Flag = (this.readRegister(this.instruction.registerType1) & 0xFF) + (this.fetchedData & 0xFF) >= 0x100;

  if (is_16bit) {
    z = -1;
    h = (this.readRegister(this.instruction.registerType1) & 0xFFF) + (this.fetchedData & 0xFFF) >= 0x1000;
    const n = ((this.readRegister(this.instruction.registerType1)) + ((this.fetchedData)));
    c = n >= 0x10000;
  }

  if (this.instruction.registerType1 == RT.SP) {
    z = 0;
    h = (this.readRegister(this.instruction.registerType1) & 0xF) + (this.fetchedData & 0xF) >= 0x10;
    c = (this.readRegister(this.instruction.registerType1) & 0xFF) + (this.fetchedData & 0xFF) >= 0x100;
  }

  this.setRegister(this.instruction.registerType1, val & 0xFFFF);
  this.setFlags(z, 0, h, c);
}

function STOP(this: CPU) {
  this.emulator.paused = true;
}

// Decimal Adjust Accumulator, 通常用于处理运算后的调整
function DAA(this: CPU) {
  let u = 0;
  let fc: 0 | 1 = 0; // Flag Carry, 用于指示是否需要设置进位标志

  /*
  如果半进位标志 H 被设置，或者上一次操作是加法（!CPU_FLAG_N）且累加器的低 4 位大于 9
  则需要将 u 设置为 6 (0b0110)，以便调整低 4 位
   */
  if (this.flagH || (!this.flagN && (this.a & 0xF) > 9))
  {
    u = 6;
  }

  /*
  如果进位标志 C 被设置，或者上一次操作是加法（!CPU_FLAG_N）且累加器的值大于 0x99
  则需要将 u 的高 4 位设置为 6（即 0b01100000），并设置 fc 为 1，表示需要设置进位标志。
  */
  if (this.flagC || (!this.flagN && this.a > 0x99))
  {
    u |= 0x60;
    fc = 1;
  }

  this.a += this.flagN ? -u : u;

  this.setFlags(this.a == 0, -1, 0, fc);
}

function CPL(this: CPU) {
  this.a = ~this.a;
  this.setFlags(-1, 1, 1, -1);
}

function SCF(this: CPU) {
  this.setFlags(-1, 0, 0, 1);
}

function CCF(this: CPU) {
  this.setFlags(-1, 0, 0, !!(this.flagC ^ 1));
}

export const processorMap: Record<IN, Function> = {
  [IN.NONE]: NONE,
  [IN.NOP]: NOP,
  [IN.CB]: CB,
  [IN.RLCA]: RLCA,
  [IN.RRCA]: RRCA,
  [IN.RLA]: RLA,
  [IN.RRA]: RRA,
  [IN.LD]: LD,
  [IN.LDH]: LDH,
  [IN.JP]: JP,
  [IN.JR]: JR,
  [IN.CALL]: CALL,
  [IN.RST]: RST,
  [IN.RET]: RET,
  [IN.RETI]: RETI,
  [IN.DI]: DI,
  [IN.EI]: EI,
  [IN.HALT]: HALT,
  [IN.STOP]: STOP,
  [IN.XOR]: XOR,
  [IN.OR]: OR,
  [IN.CP]: CP,
  [IN.AND]: AND,
  [IN.POP]: POP,
  [IN.PUSH]: PUSH,
  [IN.INC]: INC,
  [IN.DEC]: DEC,
  [IN.SUB]: SUB,
  [IN.SBC]: SBC,
  [IN.ADC]: ADC,
  [IN.ADD]: ADD,
  [IN.DAA]: DAA,
  [IN.CPL]: CPL,
  [IN.SCF]: SCF,
  [IN.CCF]: CCF,
};
