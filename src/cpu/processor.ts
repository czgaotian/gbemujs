import { InstructionType as IN, AddressMode as AM, RegisterType as RT, ConditionType as CT, Flag } from '../types';
import { CPU } from './cpu';

function NOP() {
}

function NONE() {
  console.log('INVALID INSTRUCTION!\n');
  process.exit(-7);
}

function DI(this: CPU) {
  this.intMasterEnabled = false;
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
    if (!this.instruction?.registerType2) {
      throw new Error('Register 2 is required for LD instruction');
    }

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

    if (!this.instruction?.registerType2) {
      throw new Error('Register 2 is required for LD instruction');
    }

    const hflag = (this.cpuReadRegister(this.instruction.registerType2) & 0xF) +
      (this.fetchedData & 0xF) >=
      0x10;

    const cflag = (this.cpuReadRegister(this.instruction.registerType2) & 0xFF) +
      (this.fetchedData & 0xFF) >=
      0x100;

    this.cpuSetFlags(0, 0, hflag, cflag);
    this.cpuSetRegister(this.instruction.registerType1,
      this.cpuReadRegister(this.instruction.registerType2) + this.fetchedData);

    return;
  }

  this.cpuSetRegister(this.instruction.registerType1, this.fetchedData); // 普通寄存器加载
}

/*
Load High,
从内存的高地址区(0xFF00 到 0xFFFF)域加载数据到寄存器, 或者将寄存器的数据写入内存的高地址区域
*/
function LDH(this: CPU) {
  // 如果当前指令的目标寄存器(reg_1)是寄存器 A, 则执行加载操作
  if (this.instruction?.registerType1 == RT.A)
  {
    this.cpuSetRegister(this.instruction?.registerType1, this.emulator.busRead(0xFF00 | this.fetchedData));
  }
  // 否则则执行存储操作
  else
  {
    this.emulator.busWrite(this.memoryDestination, this.fetchedData);
  }

  this.emulator.tick(1);
}

function XOR(this: CPU) {
  this.registers.a ^= this.fetchedData & 0xff;
  this.cpuSetFlags(this.registers.a == 0, false, false, false);
}

function checkCondition(cpu: CPU): boolean {
  if (!cpu.instruction?.conditionType) {
    return false;
  }

  switch (cpu.instruction.conditionType) {
    case CT.C:
      return cpu.registers.flagC;
    case CT.NC:
      return !cpu.registers.flagC;
    case CT.Z:
      return cpu.registers.flagZ;
    case CT.NZ:
      return !cpu.registers.flagZ;
    default:
      return false;
  }
}

function gotoAddress(cpu: CPU, addr: number, pushpc: boolean) {
  if (checkCondition(cpu)) {
    if (pushpc) {
      cpu.emulator.tick(2);
      cpu.stackPush16(cpu.registers.pc);
    }
    cpu.registers.pc = addr;
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
  const addr = this.registers.pc + relative;
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
    this.registers.pc = n;

    this.emulator.tick(1);
  }
}

function RETI(this: CPU) {
  this.intMasterEnabled = true;
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

  this.cpuSetRegister(this.instruction?.registerType1, val);

  // AF寄存器中的F部分(低8位)是标志寄存器(Flag Register),其低4位总是为0
  if (this.instruction?.registerType1 == RT.AF) {
    this.cpuSetRegister(this.instruction?.registerType1, val & 0xFFF0);
  }
}

function PUSH(this: CPU) {
  if (!this.instruction?.registerType1) {
    throw new Error('Register type is required for PUSH instruction');
  }

  const hi = (this.cpuReadRegister(this.instruction?.registerType1) >> 8) & 0xFF;
  this.emulator.tick(1);
  this.stackPush(hi);

  const lo = this.cpuReadRegister(this.instruction?.registerType1) & 0xFF;
  this.emulator.tick(1);
  this.stackPush(lo);

  // 第三个周期是指令本身的执行周期, 为了精确模拟原始硬件的时序特性
  this.emulator.tick(1);
}

function INC(this: CPU) {
  if (!this.instruction?.registerType1) {
    throw new Error('Register type is required for INC instruction');
  }

  let val = this.cpuReadRegister(this.instruction.registerType1) + 1;

  if (is16Bit(this.instruction.registerType1)) {
    this.emulator.tick(1);
  }

  // 如果是对内存(HL)操作,则从总线读写数据
  if (this.instruction.registerType1 === RT.HL && this.instruction.addressMode === AM.MR) {
    val = this.emulator.busRead(this.cpuReadRegister(RT.HL)) + 1;
    val &= 0xFF;
    this.emulator.busWrite(this.cpuReadRegister(RT.HL), val);
  }
  else {
    this.cpuSetRegister(this.instruction.registerType1, val);
    val = this.cpuReadRegister(this.instruction.registerType1);
  }

  // 检查操作码最后两位是否为 11(0x03), 如果是则不更新标志位
  if ((this.opcode & 0x03) == 0x03) {
    return;
  }

  // 更新标志位: Z:结果是否为0 N:设为0 H:低4位是否溢出 C:保持不变
  this.cpuSetFlags(val == 0, 0, (val & 0x0F) == 0, -1);
}

function DEC(this: CPU) {
  if (!this.instruction?.registerType1) {
    throw new Error('Register type is required for DEC instruction');
  }

  let val = this.cpuReadRegister(this.instruction.registerType1) - 1;

  if (is16Bit(this.instruction.registerType1)) {
    this.emulator.tick(1);
  }

  if (this.instruction.registerType1 === RT.HL && this.instruction.addressMode === AM.MR) {
    val = this.emulator.busRead(this.cpuReadRegister(RT.HL)) - 1;
    this.emulator.busWrite(this.cpuReadRegister(RT.HL), val);
  }
  else {
    this.cpuSetRegister(this.instruction.registerType1, val);
    val = this.cpuReadRegister(this.instruction.registerType1);
  }

  // 检查操作码是否匹配模式 xxxx1011(0x0B)。如果是，则直接返回不更新标志位
  if ((this.opcode & 0x0B) == 0x0B) {
    return;
  }

  // 更新标志位: Z:结果是否为0 N:设为1 H:低4位是否借位 C:保持不变
  this.cpuSetFlags(val == 0, true, (val & 0x0F) == 0x0F, -1);
}

function SUB(this: CPU) {
  if (!this.instruction?.registerType1) {
    throw new Error('Register type is required for SUB instruction');
  }

  const val = this.cpuReadRegister(this.instruction.registerType1) - this.fetchedData;

  const z = val == 0;
  const h = ((this.cpuReadRegister(this.instruction.registerType1) & 0xF) - (this.fetchedData & 0xF)) < 0;
  const c = (this.cpuReadRegister(this.instruction.registerType1) - this.fetchedData) < 0;

  this.cpuSetRegister(this.instruction.registerType1, val);
  this.cpuSetFlags(z, true, h, c);
}

function SBC(this: CPU) {
  if (!this.instruction?.registerType1) {
    throw new Error('Register type is required for SBC instruction');
  }

  const cflag = this.registers.flagC ? 1 : 0;
  const val = this.fetchedData + cflag;
  const z = this.cpuReadRegister(this.instruction.registerType1) - val == 0;
  const h = ((this.cpuReadRegister(this.instruction.registerType1) & 0xF) - (this.fetchedData & 0xF) - cflag) < 0;
  const c = (this.cpuReadRegister(this.instruction.registerType1) - this.fetchedData - cflag) < 0;

  this.cpuSetRegister(this.instruction.registerType1, val);
  this.cpuSetFlags(z, true, h, c);
}

function ADC(this: CPU) {
  if (!this.instruction?.registerType1) {
    throw new Error('Register type is required for ADC instruction');
  }

  const u = this.fetchedData;
  const a = this.registers.a;
  const c = this.registers.flagC ? 1 : 0;

  this.registers.a = (a + u + c) & 0xFF;

  this.cpuSetFlags(this.registers.a == 0, 0,
    (a & 0xF) + (u & 0xF) + c > 0xF,
    a + u + c > 0xFF);
}

function ADD(this: CPU) {
  if (!this.instruction?.registerType1) {
    throw new Error('Register type is required for ADD instruction');
  }

  let val = this.cpuReadRegister(this.instruction.registerType1) + this.fetchedData;

  const is_16bit = is16Bit(this.instruction.registerType1);

  if (is_16bit) {
    this.emulator.tick(1);
  }

  if (this.instruction.registerType1 == RT.SP) {
    val = this.cpuReadRegister(this.instruction.registerType1) + this.fetchedData;
  }

  let z: Flag = (val & 0xFF) == 0;
  let h: Flag = (this.cpuReadRegister(this.instruction.registerType1) & 0xF) + (this.fetchedData & 0xF) >= 0x10;
  let c: Flag = (this.cpuReadRegister(this.instruction.registerType1) & 0xFF) + (this.fetchedData & 0xFF) >= 0x100;

  if (is_16bit) {
    z = -1;
    h = (this.cpuReadRegister(this.instruction.registerType1) & 0xFFF) + (this.fetchedData & 0xFFF) >= 0x1000;
    const n = ((this.cpuReadRegister(this.instruction.registerType1)) + ((this.fetchedData)));
    c = n >= 0x10000;
  }

  if (this.instruction.registerType1 == RT.SP) {
    z = 0;
    h = (this.cpuReadRegister(this.instruction.registerType1) & 0xF) + (this.fetchedData & 0xF) >= 0x10;
    c = (this.cpuReadRegister(this.instruction.registerType1) & 0xFF) + (this.fetchedData & 0xFF) >= 0x100;
  }

  this.cpuSetRegister(this.instruction.registerType1, val & 0xFFFF);
  this.cpuSetFlags(z, 0, h, c);
}

export const processorMap: Record<IN, Function> = {
  [IN.NONE]: NONE,
  [IN.NOP]: NOP,
  [IN.LD]: LD,
  [IN.LDH]: LDH,
  [IN.JP]: JP,
  [IN.JR]: JR,
  [IN.CALL]: CALL,
  [IN.RST]: RST,
  [IN.RET]: RET,
  [IN.RETI]: RETI,
  [IN.DI]: DI,
  [IN.XOR]: XOR,
  [IN.POP]: POP,
  [IN.PUSH]: PUSH,
  [IN.INC]: INC,
  [IN.DEC]: DEC,
  [IN.SUB]: SUB,
  [IN.SBC]: SBC,
  [IN.ADC]: ADC,
  [IN.ADD]: ADD,
};
