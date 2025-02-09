import {
  AddressModeMap,
  InstructionTypeMap,
  RegisterTypeMap,
} from '../constants';
import { CPU } from '../cpu/cpu';
import {
  AddressMode as AM,
  InstructionType as IN,
  RegisterType as RT,
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
      )},$${cpu.fetchedData.toString(16).padStart(4, '0')}`;

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
      )},$${(cpu.fetchedData & 0xff).toString(16).padStart(2, '0')}`;

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
      )}),${getRegisterTypeName(inst.registerType2)}`;

    case AM.HLD_R:
      return `${getInstructionTypeName(inst.type)} (${getRegisterTypeName(
        inst.registerType1
      )}),${getRegisterTypeName(inst.registerType2)}`;

    case AM.A8_R:
      return `${getInstructionTypeName(inst.type)} ${(cpu.fetchedData & 0xff)
        .toString(16)
        .padStart(2, '0')},${getRegisterTypeName(inst.registerType2)}`;

    case AM.HL_SPR:
      return `${getInstructionTypeName(inst.type)} (${getRegisterTypeName(
        inst.registerType1
      )}),SP+${(cpu.fetchedData & 0xff).toString(16).padStart(2, '0')}`;

    case AM.D8:
      return `${getInstructionTypeName(inst.type)} $${(cpu.fetchedData & 0xff)
        .toString(16)
        .padStart(2, '0')}`;

    case AM.D16:
      return `${getInstructionTypeName(inst.type)} $${cpu.fetchedData
        .toString(16)
        .padStart(4, '0')}`;

    case AM.MR_D8:
      return `${getInstructionTypeName(inst.type)} (${getRegisterTypeName(
        inst.registerType1
      )}),$${(cpu.fetchedData & 0xff).toString(16).padStart(2, '0')}`;

    case AM.A16_R:
      return `${getInstructionTypeName(inst.type)} ($${cpu.fetchedData
        .toString(16)
        .padStart(4, '0')}),${getRegisterTypeName(inst.registerType2)}`;

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
  return `${cpu.emulator.clockCycles.toString(16)} - ${pc
    .toString(16)
    .padStart(2, '0')} : ${instructionDisplay(cpu)} (${cpu.opcode
    .toString(16)
    .padStart(2, '0')} ${cpu.emulator
    .busRead(pc + 1)
    .toString(16)
    .padStart(2, '0')} ${cpu.emulator
    .busRead(pc + 2)
    .toString(16)
    .padStart(2, '0')}) A: ${cpu.registers.a
    .toString(16)
    .padStart(2, '0')} F: ${registerFDisplay(
    cpu.registers.f
  )} BC: ${cpu.registers.b.toString(16).padStart(2, '0')}${cpu.registers.c
    .toString(16)
    .padStart(2, '0')} DE: ${cpu.registers.d
    .toString(16)
    .padStart(2, '0')}${cpu.registers.e
    .toString(16)
    .padStart(2, '0')} HL: ${cpu.registers.h
    .toString(16)
    .padStart(2, '0')}${cpu.registers.l.toString(16).padStart(2, '0')}`;
};
