import { expect, test, describe, beforeEach } from 'vitest';
import {
  INSTRUCTION_TYPE,
  ADDRESS_MODE,
  REGISTER_TYPE,
  CONDITION_TYPE,
} from '../../src/types';
import { SBC, DAA, LD } from '../../src/cpu/processor';
import { GameBoy } from '../../src/emu/emu';

describe('processor', () => {
  const emu = new GameBoy();

  beforeEach(() => {
    emu.cpu.registers.init();
  });

  test('SBC edge situtation for js', () => {
    emu.cpu.registers.a = 0x00;
    emu.cpu.registers.f = 0xf0;
    emu.cpu.fetchedData = 0xff;
    emu.cpu.instruction = {
      type: INSTRUCTION_TYPE.SBC,
      addressMode: ADDRESS_MODE.IMPLIED,
      registerType1: REGISTER_TYPE.A,
      registerType2: REGISTER_TYPE.NONE,
      conditionType: CONDITION_TYPE.NONE,
      param: 0,
    };
    SBC.call(emu.cpu);
    expect(emu.cpu.registers.a).toBe(0x00);
    expect(emu.cpu.registers.f).toBe(0xf0);
  });

  test('DAA edge situtation for js', () => {
    emu.cpu.registers.a = 0x00;
    emu.cpu.registers.f = 0xd0;
    emu.cpu.instruction = {
      type: INSTRUCTION_TYPE.DAA,
      addressMode: ADDRESS_MODE.IMPLIED,
      registerType1: REGISTER_TYPE.A,
      registerType2: REGISTER_TYPE.NONE,
      conditionType: CONDITION_TYPE.NONE,
      param: 0,
    };
    DAA.call(emu.cpu);
    expect(emu.cpu.registers.a).toBe(0xa0);
    expect(emu.cpu.registers.f).toBe(0x50);
  });

  test("LD: '0xf8 HL,SP+r8' edge situation", () => {
    emu.cpu.registers.sp = 0x00;
    emu.cpu.fetchedData = 0xff;
    emu.cpu.instruction = {
      type: INSTRUCTION_TYPE.LD,
      addressMode: ADDRESS_MODE.HL_SPR,
      registerType1: REGISTER_TYPE.HL,
      registerType2: REGISTER_TYPE.SP,
      conditionType: CONDITION_TYPE.NONE,
      param: 0,
    };

    LD.call(emu.cpu);

    expect(emu.cpu.registers.hl).toBe(0xffff);
    expect(emu.cpu.registers.f).toBe(0x00);
  });
});
