import {
  AddressModeMap,
  InstructionTypeMap,
  RegisterTypeMap,
} from '../constants';
import { CPU } from '../cpu/cpu';
import {
  ADDRESS_MODE as AM,
  INSTRUCTION_TYPE as IN,
  REGISTER_TYPE as RT,
} from '../types';

export const getInstructionTypeName = (instructionType?: IN) => {
  if (!instructionType) {
    return 'INVALID INSTRUCTION';
  }
  const name = InstructionTypeMap[instructionType];
  if (!name) {
    return 'INVALID INSTRUCTION';
  }
  return name;
};

export const getRegisterTypeName = (registerType?: RT) => {
  if (!registerType) {
    return 'INVALID RT';
  }
  return RegisterTypeMap[registerType];
};

export const getAddressModeName = (addressMode?: AM) => {
  if (!addressMode) {
    return 'INVALID AM';
  }
  return AddressModeMap[addressMode];
};

export function instructionDisplay(cpu: CPU) {
  const inst = cpu.instruction;
  if (!inst) {
    return 'INVALID INSTRUCTION';
  }

  switch (inst.addressMode) {
    case AM.IMPLIED:
      return `${getInstructionTypeName(inst.type)}`;

    case AM.R_D16:
    case AM.R_A16:
      return `${getInstructionTypeName(inst.type)} ${getRegisterTypeName(
        inst.registerType1
      )},$${cpu.fetchedData.toString(16).padStart(4, '0').toUpperCase()}`;

    case AM.R:
      return `${getInstructionTypeName(inst.type)} ${getRegisterTypeName(
        inst.registerType1
      )}`;

    case AM.R_R:
      return `${getInstructionTypeName(inst.type)} ${getRegisterTypeName(
        inst.registerType1
      )},${getRegisterTypeName(inst.registerType2)}`;

    case AM.MR_R:
      return `${getInstructionTypeName(inst.type)} (${getRegisterTypeName(
        inst.registerType1
      )}),${getRegisterTypeName(inst.registerType2)}`;

    case AM.MR:
      return `${getInstructionTypeName(inst.type)} (${getRegisterTypeName(
        inst.registerType1
      )})`;

    case AM.R_MR:
      return `${getInstructionTypeName(inst.type)} ${getRegisterTypeName(
        inst.registerType1
      )},(${getRegisterTypeName(inst.registerType2)})`;

    case AM.R_D8:
    case AM.R_A8:
      return `${getInstructionTypeName(inst.type)} ${getRegisterTypeName(
        inst.registerType1
      )},$${(cpu.fetchedData & 0xff)
        .toString(16)
        .padStart(2, '0')
        .toUpperCase()}`;

    case AM.R_HLI:
      return `${getInstructionTypeName(inst.type)} ${getRegisterTypeName(
        inst.registerType1
      )},(${getRegisterTypeName(inst.registerType2)}+)`;

    case AM.R_HLD:
      return `${getInstructionTypeName(inst.type)} ${getRegisterTypeName(
        inst.registerType1
      )},(${getRegisterTypeName(inst.registerType2)}-)`;

    case AM.HLI_R:
      return `${getInstructionTypeName(inst.type)} (${getRegisterTypeName(
        inst.registerType1
      )}+),${getRegisterTypeName(inst.registerType2)}`;

    case AM.HLD_R:
      return `${getInstructionTypeName(inst.type)} (${getRegisterTypeName(
        inst.registerType1
      )}-),${getRegisterTypeName(inst.registerType2)}`;

    case AM.A8_R:
      return `${getInstructionTypeName(inst.type)} $${(
        cpu.memoryDestination & 0xff
      )
        .toString(16)
        .padStart(2, '0')
        .toUpperCase()},${getRegisterTypeName(
        inst.registerType2
      ).toUpperCase()}`;

    case AM.HL_SPR:
      return `${getInstructionTypeName(inst.type)} (${getRegisterTypeName(
        inst.registerType1
      )}),SP+${(cpu.fetchedData & 0xff)
        .toString(16)
        .padStart(2, '0')
        .toUpperCase()}`;

    case AM.D8:
      return `${getInstructionTypeName(inst.type)} $${(cpu.fetchedData & 0xff)
        .toString(16)
        .padStart(2, '0')
        .toUpperCase()}`;

    case AM.D16:
      return `${getInstructionTypeName(inst.type)} $${cpu.fetchedData
        .toString(16)
        .padStart(4, '0')
        .toUpperCase()}`;

    case AM.MR_D8:
      return `${getInstructionTypeName(inst.type)} (${getRegisterTypeName(
        inst.registerType1
      )}),$${(cpu.fetchedData & 0xff)
        .toString(16)
        .padStart(2, '0')
        .toUpperCase()}`;

    case AM.A16_R:
      return `${getInstructionTypeName(inst.type)} ($${cpu.fetchedData
        .toString(16)
        .padStart(4, '0')
        .toUpperCase()}),${getRegisterTypeName(inst.registerType2)}`;

    default:
      return `INVALID AM: ${getAddressModeName(inst.addressMode)}`;
  }
}

export function registerFDisplay(f: number) {
  return `${f & (1 << 7) ? 'Z' : '-'}${f & (1 << 6) ? 'N' : '-'}${
    f & (1 << 5) ? 'H' : '-'
  }${f & (1 << 4) ? 'C' : '-'}`;
}

export const cpuLog = (pc: number, cpu: CPU) => {
  return `${cpu.emulator.clockCycles
    .toString(16)
    .padStart(8, '0')
    .toUpperCase()} - ${pc
    .toString(16)
    .padStart(4, '0')
    .toUpperCase()}: ${instructionDisplay(cpu).padEnd(12, ' ')} (${cpu.opcode
    .toString(16)
    .padStart(2, '0')
    .toUpperCase()} ${cpu.emulator
    .busRead(pc + 1)
    .toString(16)
    .padStart(2, '0')
    .toUpperCase()} ${cpu.emulator
    .busRead(pc + 2)
    .toString(16)
    .padStart(2, '0')
    .toUpperCase()}) A: ${new Number(cpu.registers.a)
    .toString(16)
    .padStart(2, '0')
    .toUpperCase()} F: ${registerFDisplay(cpu.registers.f)} BC: ${new Number(
    cpu.registers.b
  )
    .toString(16)
    .padStart(2, '0')
    .toUpperCase()}${new Number(cpu.registers.c)
    .toString(16)
    .padStart(2, '0')
    .toUpperCase()} DE: ${new Number(cpu.registers.d)
    .toString(16)
    .padStart(2, '0')
    .toUpperCase()}${new Number(cpu.registers.e)
    .toString(16)
    .padStart(2, '0')
    .toUpperCase()} HL: ${new Number(cpu.registers.h)
    .toString(16)
    .padStart(2, '0')
    .toUpperCase()}${new Number(cpu.registers.l)
    .toString(16)
    .padStart(2, '0')
    .toUpperCase()}`;
};
