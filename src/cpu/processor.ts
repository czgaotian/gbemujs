import { InstructionType as IN, InstructionType, AddressMode, RegisterType } from '../types';
import { CPU } from './cpu';

function NOP() {}

function NONE() {
  console.log('INVALID INSTRUCTION!\n');
  process.exit(-7);
}

function DI(this: CPU) {
  this.intMasterEnabled = false;
}

function LD(this: CPU) {
  // TODO...
}

function XOR(this: CPU) {
  this.registers.a ^= this.fetchedData & 0xff;
  this.cpuSetFlags(this.registers.a == 0, false, false, false);
}

function JP( this: CPU) {
  if (this.checkCondition()) {
    this.registers.pc = this.fetchedData;
    this.emulator.emulatorCycle(1);
  }
}

function INC(this: CPU) {
  if (!this.instruction?.registerType1) {
    throw new Error('Register type is required for INC instruction');
  }

  let val = this.registers.cpuReadRegister(this.instruction?.registerType1) + 1;

  if (this.instruction?.addressMode === AddressMode.R_D16) {
    this.emulator.emulatorCycle(1);
  }

  // 如果是对内存(HL)操作,则从总线读写数据
  if (this.instruction?.registerType1 === RegisterType.HL && this.instruction?.addressMode === AddressMode.MR)
  {
    val = this.emulator.busRead(this.registers.cpuReadRegister(RegisterType.HL)) + 1;
    val &= 0xFF;
    this.emulator.busWrite(this.registers.cpuReadRegister(RegisterType.HL), val);
  }
  else
  {
    this.registers.cpuSetRegister(this.instruction?.registerType1, val);
    val = this.registers.cpuReadRegister(this.instruction?.registerType1);
  }

  // 检查操作码最后两位是否为 11(0x03), 如果是则不更新标志位
  if ((this.opcode & 0x03) == 0x03)
  {
    return;
  }

  // 更新标志位: Z:结果是否为0 N:设为0 H:低4位是否溢出 C:保持不变
  this.cpuSetFlags(val == 0, 0, (val & 0x0F) == 0, -1);
}

function DEC(this: CPU) {
  if (!this.instruction?.registerType1) {
    throw new Error('Register type is required for DEC instruction');
  }

  let val = this.registers.cpuReadRegister(this.instruction?.registerType1) - 1;

  if (this.instruction?.addressMode === AddressMode.R_D16) {
    this.emulator.emulatorCycle(1);
  }

  if (this.instruction?.registerType1 === RegisterType.HL && this.instruction?.addressMode === AddressMode.MR)
  {
    val = this.emulator.busRead(this.registers.cpuReadRegister(RegisterType.HL)) - 1;
    this.emulator.busWrite(this.registers.cpuReadRegister(RegisterType.HL), val);
  }
  else
  {
    this.registers.cpuSetRegister(this.instruction?.registerType1, val);
    val = this.registers.cpuReadRegister(this.instruction?.registerType1);
  }

  // 检查操作码是否匹配模式 xxxx1011(0x0B)。如果是，则直接返回不更新标志位
  if ((this.opcode & 0x0B) == 0x0B)
  {
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
