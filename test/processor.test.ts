import { expect, test } from 'vitest';
import { INSTRUCTION_TYPE, ADDRESS_MODE, REGISTER_TYPE, CONDITION_TYPE } from '../src/types/';
import { SBC, DAA } from '../src/cpu/processor';
import { GameBoy } from '../src/emu/emu';

test("SBC edge situtation for js", () => {
  const emu = new GameBoy();
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
  }
  SBC.call(emu.cpu);
  expect(emu.cpu.registers.a).toBe(0x00);
  expect(emu.cpu.registers.f).toBe(0xf0);
})

test("DAA edge situtation for js", () => {
  const emu = new GameBoy();
  emu.cpu.registers.a = 0x00;
  emu.cpu.registers.f = 0xd0;
  emu.cpu.instruction = {
    type: INSTRUCTION_TYPE.DAA,
    addressMode: ADDRESS_MODE.IMPLIED,
    registerType1: REGISTER_TYPE.A,
    registerType2: REGISTER_TYPE.NONE,
    conditionType: CONDITION_TYPE.NONE,
    param: 0,
  }
  DAA.call(emu.cpu);
  expect(emu.cpu.registers.a).toBe(0xa0);
  expect(emu.cpu.registers.f).toBe(0x50);
})
