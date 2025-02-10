export enum ADDRESS_MODE {
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
  R_A16,
}

export enum REGISTER_TYPE {
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
  PC,
}

export enum INSTRUCTION_TYPE {
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
  SET,
}

export enum CONDITION_TYPE {
  NONE,
  NZ,
  Z,
  NC,
  C,
}

export interface Instruction {
  type: INSTRUCTION_TYPE;
  addressMode: ADDRESS_MODE;
  registerType1: REGISTER_TYPE;
  registerType2: REGISTER_TYPE;
  conditionType: CONDITION_TYPE;
  param: number;
}

export type Flag = true | false | 1 | 0 | -1;

export enum INTERRUPT_TYPE {
  NONE = 0,
  VBLANK = 1,
  LCD_STAT = 2,
  TIMER = 4,
  SERIAL = 8,
  JOYPAD = 16,
}
