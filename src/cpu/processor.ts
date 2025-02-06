import { InstructionType as IN, InstructionType, AddressMode, RegisterType } from '../types';
import { CPU } from './cpu';

function NOP(this: CPU) {
  this.emulator.tick(1);
}

function NONE() {
  console.log('INVALID INSTRUCTION!\n');
  process.exit(-7);
}

function DI(this: CPU) {
  this.intMasterEnabled = false;
}

function LD(this: CPU) {
  if (this.destinationIsMemory) // 写入内存 (dest_is_mem 为 true)
  {
    // LD (BC), A for instance...
    if (this.instruction?.registerType2 === RegisterType.BC) {
      this.emulator.tick(1); // 16位数据写入，需要额外周期
      this.emulator.busWrite(this.memoryDestination, this.fetchedData);
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
  if (this.instruction?.addressMode === AddressMode.HL_SPR) {
    const hflag = (this.cpuReadRegister(this.instruction?.registerType2) & 0xF) +
      (this.fetchedData & 0xF) >=
      0x10;

    const cflag = (this.cpuReadRegister(this.instruction?.registerType2) & 0xFF) +
      (this.fetchedData & 0xFF) >=
      0x100;

    this.cpuSetFlags(0, 0, hflag, cflag);
    this.cpuSetRegister(this.instruction?.registerType1,
      this.cpuReadRegister(this.instruction?.registerType2) + this.fetchedData);

    return;
  }

  this.cpuSetRegister(this.instruction?.registerType1, this.fetchedData); // 普通寄存器加载
}

function XOR(this: CPU) {
  this.registers.a ^= this.fetchedData & 0xff;
  this.cpuSetFlags(this.registers.a == 0, false, false, false);
}

function JP(this: CPU) {
  if (this.checkCondition()) {
    this.registers.pc = this.fetchedData;
    this.emulator.tick(1);
  }
}

function INC(this: CPU) {
  if (!this.instruction?.registerType1) {
    throw new Error('Register type is required for INC instruction');
  }

  let val = this.cpuReadRegister(this.instruction?.registerType1) + 1;

  if (this.instruction?.addressMode === AddressMode.R_D16) {
    this.emulator.tick(1);
  }

  // 如果是对内存(HL)操作,则从总线读写数据
  if (this.instruction?.registerType1 === RegisterType.HL && this.instruction?.addressMode === AddressMode.MR) {
    val = this.emulator.busRead(this.cpuReadRegister(RegisterType.HL)) + 1;
    val &= 0xFF;
    this.emulator.busWrite(this.cpuReadRegister(RegisterType.HL), val);
  }
  else {
    this.cpuSetRegister(this.instruction?.registerType1, val);
    val = this.cpuReadRegister(this.instruction?.registerType1);
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

  let val = this.cpuReadRegister(this.instruction?.registerType1) - 1;

  if (this.instruction?.addressMode === AddressMode.R_D16) {
    this.emulator.tick(1);
  }

  if (this.instruction?.registerType1 === RegisterType.HL && this.instruction?.addressMode === AddressMode.MR) {
    val = this.emulator.busRead(this.cpuReadRegister(RegisterType.HL)) - 1;
    this.emulator.busWrite(this.cpuReadRegister(RegisterType.HL), val);
  }
  else {
    this.cpuSetRegister(this.instruction?.registerType1, val);
    val = this.cpuReadRegister(this.instruction?.registerType1);
  }

  // 检查操作码是否匹配模式 xxxx1011(0x0B)。如果是，则直接返回不更新标志位
  if ((this.opcode & 0x0B) == 0x0B) {
    return;
  }

  // 更新标志位: Z:结果是否为0 N:设为1 H:低4位是否借位 C:保持不变
  this.cpuSetFlags(val == 0, true, (val & 0x0F) == 0x0F, -1);
}

export const processorMap: Record<InstructionType, Function> = {
  [IN.NONE]: NONE,
  [IN.NOP]: NOP,
  [IN.LD]: LD,
  [IN.JP]: JP,
  [IN.DI]: DI,
  [IN.XOR]: XOR,
  [IN.INC]: INC,
  [IN.DEC]: DEC,
};
