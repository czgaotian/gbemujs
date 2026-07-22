import { expect, test } from 'vitest';
import { GameBoy } from '../../src/emu/emu';
import { INTERRUPT_TYPE } from '../../src/types';

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

test('JR NZ takes a signed offset only when Z is clear', () => {
  const emu = createCpu(0x20, 0xfe);
  emu.cpu.registers.f = 0x00;

  emu.cpu.step();

  expect(emu.cpu.registers.pc).toBe(0x0100);
});

test('JR NZ does not take its offset when Z is set', () => {
  const emu = createCpu(0x20, 0xfe);
  emu.cpu.registers.f = 0x80;

  emu.cpu.step();

  expect(emu.cpu.registers.pc).toBe(0x0102);
});

test('CALL pushes its return address for RET to restore', () => {
  const emu = createCpu(0xcd, 0x05, 0x01, 0x00, 0x00, 0xc9);

  emu.cpu.step();

  expect(emu.cpu.registers.pc).toBe(0x0105);
  expect(emu.cpu.registers.sp).toBe(0xfffc);
  expect(emu.busRead(0xfffc)).toBe(0x03);
  expect(emu.busRead(0xfffd)).toBe(0x01);

  emu.cpu.step();

  expect(emu.cpu.registers.pc).toBe(0x0103);
  expect(emu.cpu.registers.sp).toBe(0xfffe);
});

test('EI enables IME after the following instruction', () => {
  const emu = createCpu(0xfb, 0x00);

  emu.cpu.step();
  expect(emu.cpu.interruptMasterEnabled).toBe(false);

  emu.cpu.step();
  expect(emu.cpu.interruptMasterEnabled).toBe(true);
});

test('DI cancels a pending EI enable', () => {
  const emu = createCpu(0xfb, 0xf3, 0x00);

  emu.cpu.step();
  emu.cpu.step();
  emu.cpu.step();

  expect(emu.cpu.interruptMasterEnabled).toBe(false);
  expect(emu.cpu.interruptMasterEnablingCountdown).toBe(0);
});

test('HALT wakes when an enabled interrupt becomes pending', () => {
  const emu = createCpu(0x76);
  emu.cpu.interruptMasterEnabled = true;

  emu.cpu.step();
  expect(emu.cpu.halted).toBe(true);

  emu.intEnableFlags = INTERRUPT_TYPE.VBLANK;
  emu.intFlags = INTERRUPT_TYPE.VBLANK;
  emu.cpu.step();

  expect(emu.cpu.halted).toBe(false);
});
