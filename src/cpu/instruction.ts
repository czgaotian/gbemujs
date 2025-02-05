import { Instruction, AddressMode as AM, ConditionType, InstructionType as IN, RegisterType as RT } from "../types";
import { CPU } from "./cpu";

export const instructionMap: Record<number, Instruction> = {
  0x00: {
    type: IN.NOP,
    addressMode: AM.IMPLIED,
  },

  0x05: {
    type: IN.DEC,
    addressMode: AM.R,
    registerType1: RT.B,
  },

  0x0E: {
    type: IN.LD,
    addressMode: AM.R_D8,
    registerType1: RT.C,
  },

  0xAF: {
    type: IN.XOR,
    addressMode: AM.R,
    registerType1: RT.A,
  },

  0xC3: {
    type: IN.JP,
    addressMode: AM.D16,
  },

  0xF3: {
    type: IN.DI,
    addressMode: AM.IMPLIED,
  },
};


export function instructionDisplay(this: CPU) {
  const inst = this.instruction;
  if (!inst) {
    return 'INVALID INSTRUCTION';
  }
  switch (inst.addressMode)
  {
  case AM.IMPLIED:
    return `${inst.type}`;

  case AM.R_D16:
  case AM.R_A16:
    return `${inst.type} ${inst.registerType1},${this.fetchedData.toString(16)}`;

  case AM.R:
    return `${inst.type} ${inst.registerType1}`;

  case AM.R_R:
    return `${inst.type} ${inst.registerType1},${inst.registerType2}`;

  case AM.MR_R:
    return `${inst.type} (${inst.registerType1}),${inst.registerType2}`;

  case AM.MR:
    return `${inst.type} (${inst.registerType1})`;

  case AM.R_MR:
    return `${inst.type} ${inst.registerType1},(${inst.registerType2})`;

  case AM.R_D8:
  case AM.R_A8:
    return `${inst.type} ${inst.registerType1},${this.fetchedData & 0xFF}`;

  case AM.R_HLI:
    return `${inst.type} ${inst.registerType1},(${inst.registerType2}+)`;

  case AM.R_HLD:
    return `${inst.type} ${inst.registerType1},(${inst.registerType2}-)`;

  case AM.R_HLI_R:
    return `${inst.type} (${inst.registerType1}+),${inst.registerType2}`;

  case AM.R_HLD_R:
    return `${inst.type} (${inst.registerType1}-),${inst.registerType2}`;

  case AM.A8_R:
    return `${inst.type} ${this.fetchedData},${inst.registerType2}`;

  case AM.HL_SPR:
    return `${inst.type} (${inst.registerType1}),SP+${this.fetchedData & 0xFF}`;

  case AM.D8:
    return `${inst.type} ${this.fetchedData & 0xFF}`;

  case AM.D16:
    return `${inst.type} ${this.fetchedData}`;

  case AM.MR_D8:
    return `${inst.type} (${inst.registerType1}),${this.fetchedData & 0xFF}`;

  case AM.A16_R:
    return `${inst.type} (${this.fetchedData}),${inst.registerType2}`;

  default:
    return `INVALID AM: ${inst.addressMode}`;
  }
}