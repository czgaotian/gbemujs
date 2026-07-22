import { expect, test } from 'vitest';
import { GameBoy } from '../../src/emu/emu';

const createCpu = (...bytes: number[]): GameBoy => {
  const emu = new GameBoy();
  const rom = new Uint8Array(0x8000);
  rom.set(bytes, 0x0100);
  let checksum = 0;
  for (let address = 0x0134; address <= 0x014c; address++) {
    checksum = checksum - rom[address] - 1;
  }
  rom[0x014d] = checksum & 0xff;
  emu.loadROM(rom);
  return emu;
};

test('ADD A,$01 sets half-carry', () => {
  const emu = createCpu(0xc6, 0x01);
  emu.cpu.registers.a = 0x0f;

  emu.cpu.step();

  expect(emu.cpu.registers.a).toBe(0x10);
  expect(emu.cpu.registers.f).toBe(0x20);
});

test('ADC includes carry in half-carry and carry flags', () => {
  const emu = createCpu(0xce, 0x00);
  emu.cpu.registers.a = 0xff;
  emu.cpu.registers.f = 0x10;

  emu.cpu.step();

  expect(emu.cpu.registers.a).toBe(0x00);
  expect(emu.cpu.registers.f).toBe(0xb0);
});

test('SUB $01 sets half-borrow', () => {
  const emu = createCpu(0xd6, 0x01);
  emu.cpu.registers.a = 0x10;

  emu.cpu.step();

  expect(emu.cpu.registers.a).toBe(0x0f);
  expect(emu.cpu.registers.f).toBe(0x60);
});

test('SBC A,$ff includes carry in half-borrow and borrow flags', () => {
  const emu = createCpu(0xde, 0xff);
  emu.cpu.registers.a = 0x00;
  emu.cpu.registers.f = 0x10;

  emu.cpu.step();

  expect(emu.cpu.registers.a).toBe(0x00);
  expect(emu.cpu.registers.f).toBe(0xf0);
});

test('CP changes flags without changing A', () => {
  const emu = createCpu(0xfe, 0x01);
  emu.cpu.registers.a = 0x00;

  emu.cpu.step();

  expect(emu.cpu.registers.a).toBe(0x00);
  expect(emu.cpu.registers.f).toBe(0x70);
});

test('DAA adjusts addition-mode values', () => {
  const emu = createCpu(0x27);
  emu.cpu.registers.a = 0x9a;

  emu.cpu.step();

  expect(emu.cpu.registers.a).toBe(0x00);
  expect(emu.cpu.registers.f).toBe(0x90);
});

test('DAA adjusts subtraction-mode values', () => {
  const emu = createCpu(0x27);
  emu.cpu.registers.a = 0x0f;
  emu.cpu.registers.f = 0x60;

  emu.cpu.step();

  expect(emu.cpu.registers.a).toBe(0x09);
  expect(emu.cpu.registers.f).toBe(0x40);
});

test('CB RLC B rotates through bit 7 and updates flags', () => {
  const emu = createCpu(0xcb, 0x00);
  emu.cpu.registers.b = 0x80;

  emu.cpu.step();

  expect(emu.cpu.registers.b).toBe(0x01);
  expect(emu.cpu.registers.f).toBe(0x10);
});

test('CB BIT 0, (HL) preserves carry and does not write memory', () => {
  const emu = createCpu(0xcb, 0x46);
  emu.cpu.registers.hl = 0xc000;
  emu.wram[0] = 0x00;
  emu.cpu.registers.f = 0x10;

  emu.cpu.step();

  expect(emu.wram[0]).toBe(0x00);
  expect(emu.cpu.registers.f).toBe(0xb0);
});

test('CB RES 0, (HL) clears the selected memory bit without changing flags', () => {
  const emu = createCpu(0xcb, 0x86);
  emu.cpu.registers.hl = 0xc000;
  emu.wram[0] = 0xff;
  emu.cpu.registers.f = 0x10;

  emu.cpu.step();

  expect(emu.wram[0]).toBe(0xfe);
  expect(emu.cpu.registers.f).toBe(0x10);
});

test('CB SWAP A exchanges nibbles and clears flags', () => {
  const emu = createCpu(0xcb, 0x37);
  emu.cpu.registers.a = 0xf0;
  emu.cpu.registers.f = 0xf0;

  emu.cpu.step();

  expect(emu.cpu.registers.a).toBe(0x0f);
  expect(emu.cpu.registers.f).toBe(0x00);
});
