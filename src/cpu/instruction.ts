import { Instruction, AddressMode as AM, ConditionType as CT, InstructionType as IN, RegisterType as RT } from "../types";
import { CPU } from "./cpu";

const generateInstruction = (type: IN, addressMode?: AM, registerType1?: RT, registerType2?: RT, conditionType?: CT, param?: number): Instruction => {
  return {
    type,
    addressMode,
    registerType1,
    registerType2,
    conditionType,
    param,
  };
};

export const instructionMap: Record<number, Instruction> = {
  0x00: generateInstruction(IN.NOP, AM.IMPLIED),
  0x01: generateInstruction(IN.LD, AM.R_D16, RT.BC),
  0x02: generateInstruction(IN.LD, AM.MR_R, RT.BC, RT.A),
  0x03: generateInstruction(IN.INC, AM.R, RT.BC),
  0x04: generateInstruction(IN.INC, AM.R, RT.B),
  0x06: generateInstruction(IN.LD, AM.R_D8, RT.B),
  0x07: generateInstruction(IN.RLCA),
  0x08: generateInstruction(IN.LD, AM.A16_R, RT.NONE, RT.SP),
  0x09: generateInstruction(IN.ADD, AM.R_R, RT.HL, RT.BC),
  0x0A: generateInstruction(IN.LD, AM.R_MR, RT.A, RT.BC),
  0x0B: generateInstruction(IN.DEC, AM.R, RT.BC),
  0x0C: generateInstruction(IN.INC, AM.R, RT.C),
  0x0D: generateInstruction(IN.DEC, AM.R, RT.C),
  0x0E: generateInstruction(IN.LD, AM.R_D8, RT.C),
  0x0F: generateInstruction(IN.RRCA),

  0x10: generateInstruction(IN.STOP),
  0x11: generateInstruction(IN.LD, AM.R_D16, RT.DE),
  0x12: generateInstruction(IN.LD, AM.MR_R, RT.DE, RT.A),
  0x13: generateInstruction(IN.INC, AM.R, RT.DE),
  0x14: generateInstruction(IN.INC, AM.R, RT.D),
  0x15: generateInstruction(IN.DEC, AM.R, RT.D),
  0x16: generateInstruction(IN.LD, AM.R_D8, RT.D),
  0x17: generateInstruction(IN.RLA),
  0x18: generateInstruction(IN.JR, AM.D8),
  0x19: generateInstruction(IN.ADD, AM.R_R, RT.HL, RT.DE),
  0x1A: generateInstruction(IN.LD, AM.R_MR, RT.A, RT.DE),
  0x1B: generateInstruction(IN.DEC, AM.R, RT.DE),
  0x1C: generateInstruction(IN.INC, AM.R, RT.E),
  0x1D: generateInstruction(IN.DEC, AM.R, RT.E),
  0x1E: generateInstruction(IN.LD, AM.R_D8, RT.E),
  0x1F: generateInstruction(IN.RRA),

  0x20: generateInstruction(IN.JR, AM.D8, RT.NONE, RT.NONE, CT.NZ),
  0x21: generateInstruction(IN.LD, AM.R_D16, RT.HL),
  0x22: generateInstruction(IN.LD, AM.HLI_R, RT.HL, RT.A),
  0x23: generateInstruction(IN.INC, AM.R, RT.HL),
  0x24: generateInstruction(IN.INC, AM.R, RT.H),
  0x25: generateInstruction(IN.DEC, AM.R, RT.H),
  0x26: generateInstruction(IN.LD, AM.R_D8, RT.H),
  0x27: generateInstruction(IN.DAA),
  0x28: generateInstruction(IN.JR, AM.D8, RT.NONE, RT.NONE, CT.Z),
  0x29: generateInstruction(IN.ADD, AM.R_R, RT.HL, RT.HL),
  0x2A: generateInstruction(IN.LD, AM.R_HLI, RT.A, RT.HL),
  0x2B: generateInstruction(IN.DEC, AM.R, RT.HL),
  0x2C: generateInstruction(IN.INC, AM.R, RT.L),
  0x2D: generateInstruction(IN.DEC, AM.R, RT.L),
  0x2E: generateInstruction(IN.LD, AM.R_D8, RT.L),
  0x2F: generateInstruction(IN.CPL),

  0x30: generateInstruction(IN.JR, AM.D8, RT.NONE, RT.NONE, CT.NC),
  0x31: generateInstruction(IN.LD, AM.R_D16, RT.SP),
  0x32: generateInstruction(IN.LD, AM.HLD_R, RT.HL, RT.A),
  0x33: generateInstruction(IN.INC, AM.R, RT.SP),
  0x34: generateInstruction(IN.INC, AM.MR, RT.HL),
  0x35: generateInstruction(IN.DEC, AM.MR, RT.HL),
  0x36: generateInstruction(IN.LD, AM.MR_D8, RT.HL),
  0x37: generateInstruction(IN.SCF),
  0x38: generateInstruction(IN.JR, AM.D8, RT.NONE, RT.NONE, CT.C),
  0x39: generateInstruction(IN.ADD, AM.R_R, RT.HL, RT.SP),
  0x3A: generateInstruction(IN.LD, AM.R_HLD, RT.A, RT.HL),
  0x3B: generateInstruction(IN.DEC, AM.R, RT.SP),
  0x3C: generateInstruction(IN.INC, AM.R, RT.A),
  0x3D: generateInstruction(IN.DEC, AM.R, RT.A),
  0x3E: generateInstruction(IN.LD, AM.R_D8, RT.A),
  0x3F: generateInstruction(IN.CCF),

  0x40: generateInstruction(IN.LD, AM.R_R, RT.B, RT.B),
  0x41: generateInstruction(IN.LD, AM.R_R, RT.B, RT.C),
  0x42: generateInstruction(IN.LD, AM.R_R, RT.B, RT.D),
  0x43: generateInstruction(IN.LD, AM.R_R, RT.B, RT.E),
  0x44: generateInstruction(IN.LD, AM.R_R, RT.B, RT.H),
  0x45: generateInstruction(IN.LD, AM.R_R, RT.B, RT.L),
  0x46: generateInstruction(IN.LD, AM.R_MR, RT.B, RT.HL),
  0x47: generateInstruction(IN.LD, AM.R_R, RT.B, RT.A),
  0x48: generateInstruction(IN.LD, AM.R_R, RT.C, RT.B),
  0x49: generateInstruction(IN.LD, AM.R_R, RT.C, RT.C),
  0x4A: generateInstruction(IN.LD, AM.R_R, RT.C, RT.D),
  0x4B: generateInstruction(IN.LD, AM.R_R, RT.C, RT.E),
  0x4C: generateInstruction(IN.LD, AM.R_R, RT.C, RT.H),
  0x4D: generateInstruction(IN.LD, AM.R_R, RT.C, RT.L),
  0x4E: generateInstruction(IN.LD, AM.R_MR, RT.C, RT.HL),
  0x4F: generateInstruction(IN.LD, AM.R_R, RT.C, RT.A),

  0x50: generateInstruction(IN.LD, AM.R_R, RT.D, RT.B),
  0x51: generateInstruction(IN.LD, AM.R_R, RT.D, RT.C),
  0x52: generateInstruction(IN.LD, AM.R_R, RT.D, RT.D),
  0x53: generateInstruction(IN.LD, AM.R_R, RT.D, RT.E),
  0x54: generateInstruction(IN.LD, AM.R_R, RT.D, RT.H),
  0x55: generateInstruction(IN.LD, AM.R_R, RT.D, RT.L),
  0x56: generateInstruction(IN.LD, AM.R_MR, RT.D, RT.HL),
  0x57: generateInstruction(IN.LD, AM.R_R, RT.D, RT.A),
  0x58: generateInstruction(IN.LD, AM.R_R, RT.E, RT.B),
  0x59: generateInstruction(IN.LD, AM.R_R, RT.E, RT.C),
  0x5A: generateInstruction(IN.LD, AM.R_R, RT.E, RT.D),
  0x5B: generateInstruction(IN.LD, AM.R_R, RT.E, RT.E),
  0x5C: generateInstruction(IN.LD, AM.R_R, RT.E, RT.H),
  0x5D: generateInstruction(IN.LD, AM.R_R, RT.E, RT.L),
  0x5E: generateInstruction(IN.LD, AM.R_MR, RT.E, RT.HL),
  0x5F: generateInstruction(IN.LD, AM.R_R, RT.E, RT.A),

  0x60: generateInstruction(IN.LD, AM.R_R, RT.H, RT.B),
  0x61: generateInstruction(IN.LD, AM.R_R, RT.H, RT.C),
  0x62: generateInstruction(IN.LD, AM.R_R, RT.H, RT.D),
  0x63: generateInstruction(IN.LD, AM.R_R, RT.H, RT.E),
  0x64: generateInstruction(IN.LD, AM.R_R, RT.H, RT.H),
  0x65: generateInstruction(IN.LD, AM.R_R, RT.H, RT.L),
  0x66: generateInstruction(IN.LD, AM.R_MR, RT.H, RT.HL),
  0x67: generateInstruction(IN.LD, AM.R_R, RT.H, RT.A),
  0x68: generateInstruction(IN.LD, AM.R_R, RT.L, RT.B),
  0x69: generateInstruction(IN.LD, AM.R_R, RT.L, RT.C),
  0x6A: generateInstruction(IN.LD, AM.R_R, RT.L, RT.D),
  0x6B: generateInstruction(IN.LD, AM.R_R, RT.L, RT.E),
  0x6C: generateInstruction(IN.LD, AM.R_R, RT.L, RT.H),
  0x6D: generateInstruction(IN.LD, AM.R_R, RT.L, RT.L),
  0x6E: generateInstruction(IN.LD, AM.R_MR, RT.L, RT.HL),
  0x6F: generateInstruction(IN.LD, AM.R_R, RT.L, RT.A),

  0x70: generateInstruction(IN.LD, AM.MR_R, RT.HL, RT.B),
  0x71: generateInstruction(IN.LD, AM.MR_R, RT.HL, RT.C),
  0x72: generateInstruction(IN.LD, AM.MR_R, RT.HL, RT.D),
  0x73: generateInstruction(IN.LD, AM.MR_R, RT.HL, RT.E),
  0x74: generateInstruction(IN.LD, AM.MR_R, RT.HL, RT.H),
  0x75: generateInstruction(IN.LD, AM.MR_R, RT.HL, RT.L),
  0x76: generateInstruction(IN.HALT),
  0x77: generateInstruction(IN.LD, AM.MR_R, RT.HL, RT.A),
  0x78: generateInstruction(IN.LD, AM.R_R, RT.A, RT.B),
  0x79: generateInstruction(IN.LD, AM.R_R, RT.A, RT.C),
  0x7A: generateInstruction(IN.LD, AM.R_R, RT.A, RT.D),
  0x7B: generateInstruction(IN.LD, AM.R_R, RT.A, RT.E),
  0x7C: generateInstruction(IN.LD, AM.R_R, RT.A, RT.H),
  0x7D: generateInstruction(IN.LD, AM.R_R, RT.A, RT.L),
  0x7E: generateInstruction(IN.LD, AM.R_MR, RT.A, RT.HL),
  0x7F: generateInstruction(IN.LD, AM.R_R, RT.A, RT.A),

  0x80: generateInstruction(IN.ADD, AM.R_R, RT.A, RT.B),
  0x81: generateInstruction(IN.ADD, AM.R_R, RT.A, RT.C),
  0x82: generateInstruction(IN.ADD, AM.R_R, RT.A, RT.D),
  0x83: generateInstruction(IN.ADD, AM.R_R, RT.A, RT.E),
  0x84: generateInstruction(IN.ADD, AM.R_R, RT.A, RT.H),
  0x85: generateInstruction(IN.ADD, AM.R_R, RT.A, RT.L),
  0x86: generateInstruction(IN.ADD, AM.R_MR, RT.A, RT.HL),
  0x87: generateInstruction(IN.ADD, AM.R_R, RT.A, RT.A),
  0x88: generateInstruction(IN.ADC, AM.R_R, RT.A, RT.B),
  0x89: generateInstruction(IN.ADC, AM.R_R, RT.A, RT.C),
  0x8A: generateInstruction(IN.ADC, AM.R_R, RT.A, RT.D),
  0x8B: generateInstruction(IN.ADC, AM.R_R, RT.A, RT.E),
  0x8C: generateInstruction(IN.ADC, AM.R_R, RT.A, RT.H),
  0x8D: generateInstruction(IN.ADC, AM.R_R, RT.A, RT.L),
  0x8E: generateInstruction(IN.ADC, AM.R_MR, RT.A, RT.HL),
  0x8F: generateInstruction(IN.ADC, AM.R_R, RT.A, RT.A),

  0x90: generateInstruction(IN.SUB, AM.R_R, RT.A, RT.B),
  0x91: generateInstruction(IN.SUB, AM.R_R, RT.A, RT.C),
  0x92: generateInstruction(IN.SUB, AM.R_R, RT.A, RT.D),
  0x93: generateInstruction(IN.SUB, AM.R_R, RT.A, RT.E),
  0x94: generateInstruction(IN.SUB, AM.R_R, RT.A, RT.H),
  0x95: generateInstruction(IN.SUB, AM.R_R, RT.A, RT.L),
  0x96: generateInstruction(IN.SUB, AM.R_MR, RT.A, RT.HL),
  0x97: generateInstruction(IN.SUB, AM.R_R, RT.A, RT.A),
  0x98: generateInstruction(IN.SBC, AM.R_R, RT.A, RT.B),
  0x99: generateInstruction(IN.SBC, AM.R_R, RT.A, RT.C),
  0x9A: generateInstruction(IN.SBC, AM.R_R, RT.A, RT.D),
  0x9B: generateInstruction(IN.SBC, AM.R_R, RT.A, RT.E),
  0x9C: generateInstruction(IN.SBC, AM.R_R, RT.A, RT.H),
  0x9D: generateInstruction(IN.SBC, AM.R_R, RT.A, RT.L),
  0x9E: generateInstruction(IN.SBC, AM.R_MR, RT.A, RT.HL),
  0x9F: generateInstruction(IN.SBC, AM.R_R, RT.A, RT.A),

    // 0xAX
  0xA0: generateInstruction(IN.AND, AM.R_R, RT.A, RT.B),
  0xA1: generateInstruction(IN.AND, AM.R_R, RT.A, RT.C),
  0xA2: generateInstruction(IN.AND, AM.R_R, RT.A, RT.D),
  0xA3: generateInstruction(IN.AND, AM.R_R, RT.A, RT.E),
  0xA4: generateInstruction(IN.AND, AM.R_R, RT.A, RT.H),
  0xA5: generateInstruction(IN.AND, AM.R_R, RT.A, RT.L),
  0xA6: generateInstruction(IN.AND, AM.R_MR, RT.A, RT.HL),
  0xA7: generateInstruction(IN.AND, AM.R_R, RT.A, RT.A),
  0xA8: generateInstruction(IN.XOR, AM.R_R, RT.A, RT.B),
  0xA9: generateInstruction(IN.XOR, AM.R_R, RT.A, RT.C),
  0xAA: generateInstruction(IN.XOR, AM.R_R, RT.A, RT.D),
  0xAB: generateInstruction(IN.XOR, AM.R_R, RT.A, RT.E),
  0xAC: generateInstruction(IN.XOR, AM.R_R, RT.A, RT.H),
  0xAD: generateInstruction(IN.XOR, AM.R_R, RT.A, RT.L),
  0xAE: generateInstruction(IN.XOR, AM.R_MR, RT.A, RT.HL),
  0xAF: generateInstruction(IN.XOR, AM.R_R, RT.A, RT.A),

    // 0xBX
  0xB0: generateInstruction(IN.OR, AM.R_R, RT.A, RT.B),
  0xB1: generateInstruction(IN.OR, AM.R_R, RT.A, RT.C),
  0xB2: generateInstruction(IN.OR, AM.R_R, RT.A, RT.D),
  0xB3: generateInstruction(IN.OR, AM.R_R, RT.A, RT.E),
  0xB4: generateInstruction(IN.OR, AM.R_R, RT.A, RT.H),
  0xB5: generateInstruction(IN.OR, AM.R_R, RT.A, RT.L),
  0xB6: generateInstruction(IN.OR, AM.R_MR, RT.A, RT.HL),
  0xB7: generateInstruction(IN.OR, AM.R_R, RT.A, RT.A),
  0xB8: generateInstruction(IN.CP, AM.R_R, RT.A, RT.B),
  0xB9: generateInstruction(IN.CP, AM.R_R, RT.A, RT.C),
  0xBA: generateInstruction(IN.CP, AM.R_R, RT.A, RT.D),
  0xBB: generateInstruction(IN.CP, AM.R_R, RT.A, RT.E),
  0xBC: generateInstruction(IN.CP, AM.R_R, RT.A, RT.H),
  0xBD: generateInstruction(IN.CP, AM.R_R, RT.A, RT.L),
  0xBE: generateInstruction(IN.CP, AM.R_MR, RT.A, RT.HL),
  0xBF: generateInstruction(IN.CP, AM.R_R, RT.A, RT.A),

  0xC0: generateInstruction(IN.RET, AM.IMPLIED, RT.NONE, RT.NONE, CT.NZ),
  0xC1: generateInstruction(IN.POP, AM.R, RT.BC),
  0xC2: generateInstruction(IN.JP, AM.D16, RT.NONE, RT.NONE, CT.NZ),
  0xC3: generateInstruction(IN.JP, AM.D16),
  0xC4: generateInstruction(IN.CALL, AM.D16, RT.NONE, RT.NONE, CT.NZ),
  0xC5: generateInstruction(IN.PUSH, AM.R, RT.BC),
  0xC6: generateInstruction(IN.ADD, AM.R_D8, RT.A),
  0xC7: generateInstruction(IN.RST, AM.IMPLIED, RT.NONE, RT.NONE, CT.NONE, 0x00),
  0xC8: generateInstruction(IN.RET, AM.IMPLIED, RT.NONE, RT.NONE, CT.Z),
  0xC9: generateInstruction(IN.RET),
  0xCA: generateInstruction(IN.JP, AM.D16, RT.NONE, RT.NONE, CT.Z),
  0xCB: generateInstruction(IN.CB, AM.D8),
  0xCC: generateInstruction(IN.CALL, AM.D16, RT.NONE, RT.NONE, CT.Z),
  0xCD: generateInstruction(IN.CALL, AM.D16),
  0xCE: generateInstruction(IN.ADC, AM.R_D8, RT.A),
  0xCF: generateInstruction(IN.RST, AM.IMPLIED, RT.NONE, RT.NONE, CT.NONE, 0x08),

  0xD0: generateInstruction(IN.RET, AM.IMPLIED, RT.NONE, RT.NONE, CT.NC),
  0xD1: generateInstruction(IN.POP, AM.R, RT.DE),
  0xD2: generateInstruction(IN.JP, AM.D16, RT.NONE, RT.NONE, CT.NC),
  0xD4: generateInstruction(IN.CALL, AM.D16, RT.NONE, RT.NONE, CT.NC),
  0xD5: generateInstruction(IN.PUSH, AM.R, RT.DE),
  0xD6: generateInstruction(IN.SUB, AM.R_D8, RT.A),
  0xD7: generateInstruction(IN.RST, AM.IMPLIED, RT.NONE, RT.NONE, CT.NONE, 0x10),
  0xD8: generateInstruction(IN.RET, AM.IMPLIED, RT.NONE, RT.NONE, CT.C),
  0xD9: generateInstruction(IN.RETI),
  0xDA: generateInstruction(IN.JP, AM.D16, RT.NONE, RT.NONE, CT.C),
  0xDC: generateInstruction(IN.CALL, AM.D16, RT.NONE, RT.NONE, CT.C),
  0xDE: generateInstruction(IN.SBC, AM.R_D8, RT.A),
  0xDF: generateInstruction(IN.RST, AM.IMPLIED, RT.NONE, RT.NONE, CT.NONE, 0x18),

    // 0xEX
  0xE0: generateInstruction(IN.LDH, AM.A8_R, RT.NONE, RT.A),
  0xE1: generateInstruction(IN.POP, AM.R, RT.HL),
  0xE2: generateInstruction(IN.LD, AM.MR_R, RT.C, RT.A),
  0xE5: generateInstruction(IN.PUSH, AM.R, RT.HL),
  0xE6: generateInstruction(IN.AND, AM.R_D8, RT.A),
  0xE7: generateInstruction(IN.RST, AM.IMPLIED, RT.NONE, RT.NONE, CT.NONE, 0x20),
  0xE8: generateInstruction(IN.ADD, AM.R_D8, RT.SP),
  0xE9: generateInstruction(IN.JP, AM.R, RT.HL),
  0xEA: generateInstruction(IN.LD, AM.A16_R, RT.NONE, RT.A),
  0xEE: generateInstruction(IN.XOR, AM.R_D8, RT.A),
  0xEF: generateInstruction(IN.RST, AM.IMPLIED, RT.NONE, RT.NONE, CT.NONE, 0x28),

    // 0xFX
  0xF0: generateInstruction(IN.LDH, AM.R_A8, RT.A),
  0xF1: generateInstruction(IN.POP, AM.R, RT.AF),
  0xF2: generateInstruction(IN.LD, AM.R_MR, RT.A, RT.C),
  0xF3: generateInstruction(IN.DI),
  0xF5: generateInstruction(IN.PUSH, AM.R, RT.AF),
  0xF6: generateInstruction(IN.OR, AM.R_D8, RT.A),
  0xF7: generateInstruction(IN.RST, AM.IMPLIED, RT.NONE, RT.NONE, CT.NONE, 0x30),
  0xF8: generateInstruction(IN.LD, AM.HL_SPR, RT.HL, RT.SP),
  0xF9: generateInstruction(IN.LD, AM.R_R, RT.SP, RT.HL),
  0xFA: generateInstruction(IN.LD, AM.R_A16, RT.A),
  0xFB: generateInstruction(IN.EI),
  0xFE: generateInstruction(IN.CP, AM.R_D8, RT.A),
  0xFF: generateInstruction(IN.RST, AM.IMPLIED, RT.NONE, RT.NONE, CT.NONE, 0x38),
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

  case AM.HLI_R:
    return `${inst.type} (${inst.registerType1}+),${inst.registerType2}`;

  case AM.HLD_R:
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