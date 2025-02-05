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
  R_HLI_R,
  R_HLD_R,
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
  NONE = 'NONE',
  A = 'A',
  F = 'F',
  B = 'B',
  C = 'C',
  D = 'D',
  E = 'E',
  H = 'H',
  L = 'L',
  AF = 'AF',
  BC = 'BC',
  DE = 'DE',
  HL = 'HL',
  SP = 'SP',
  PC = 'PC'
}

export enum InstructionType {
  NONE = 'NONE',
  NOP = 'NOP',
  LD = 'LD',
  INC = 'INC',
  DEC = 'DEC',
  RLCA = 'RLCA',
  ADD = 'ADD',
  RRCA = 'RRCA',
  STOP = 'STOP',
  RLA = 'RLA',
  JR = 'JR',
  RRA = 'RRA',
  DAA = 'DAA',
  CPL = 'CPL',
  SCF = 'SCF',
  CCF = 'CCF',
  HALT = 'HALT',
  ADC = 'ADC',
  SUB = 'SUB',
  SBC = 'SBC',
  AND = 'AND',
  XOR = 'XOR',
  OR = 'OR',
  CP = 'CP',
  POP = 'POP',
  JP = 'JP',
  PUSH = 'PUSH',
  RET = 'RET',
  CB = 'CB',
  CALL = 'CALL',
  RETI = 'RETI',
  LDH = 'LDH',
  JPHL = 'JPHL',
  DI = 'DI',
  EI = 'EI',
  RST = 'RST',
  ERR = 'ERR',
  // CB instructions...
  RLC = 'RLC',
  RRC = 'RRC',
  RL = 'RL',
  RR = 'RR',
  SLA = 'SLA',
  SRA = 'SRA',
  SWAP = 'SWAP',
  SRL = 'SRL',
  BIT = 'BIT',
  RES = 'RES',
  SET = 'SET'
}

export enum ConditionType {
  NONE = 'NONE',
  NZ = 'NZ',
  Z = 'Z',
  NC = 'NC',
  C = 'C'
}

export interface Instruction {
  type: InstructionType;
  addressMode?: AddressMode;
  registerType1?: RegisterType;
  registerType2?: RegisterType;
  conditionType?: ConditionType;
  param?: number;
}
