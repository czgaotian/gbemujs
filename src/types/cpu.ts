export enum AddressMode {
  IMPLIED,
  R_D16,
  R_R,
  MR_R,
  R,
  R_D8,
  R_MR,
  R_HLI,
  R_HLD,
  HLI_R,
  HLD_R,
  R_A8,
  A8_R,
  HL_SPR,
  D16,
  D8,
  D16_R,
  MR_D8,
  MR,
  A16_R,
  R_A16
}

export enum RegisterType {
  NONE,
  A,
  F,
  B,
  C,
  D,
  E,
  H,
  L,
  AF,
  BC,
  DE,
  HL,
  SP,
  PC
}

export enum InstructionType {
  NONE,
  NOP,
  LD,
  INC,
  DEC,
  RLCA,
  ADD,
  RRCA,
  STOP,
  RLA,
  JR,
  RRA,
  DAA,
  CPL,
  SCF,
  CCF,
  HALT,
  ADC,
  SUB,
  SBC,
  AND,
  XOR,
  OR,
  CP,
  POP,
  JP,
  PUSH,
  RET,
  CB,
  CALL,
  RETI,
  LDH,
  JPHL,
  DI,
  EI,
  RST,
  ERR,
  // CB instructions...
  RLC,
  RRC,
  RL,
  RR,
  SLA,
  SRA,
  SWAP,
  SRL,
  BIT,
  RES,
  SET
}

export enum ConditionType {
  NONE,
  NZ,
  Z,
  NC,
  C
}

export interface Instruction {
  type: InstructionType;
  addressMode?: AddressMode;
  registerType1?: RegisterType;
  registerType2?: RegisterType;
  conditionType?: ConditionType;
  param?: number;
}

export type Flag = true | false | 1 | 0 | -1;