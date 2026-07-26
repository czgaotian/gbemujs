import { describe, expect, test } from 'vitest';
import { Cartridge } from '../../src/cartridge/cartridge';
import { CARTRIDGE_TYPE } from '../../src/types';

function createRom(type: CARTRIDGE_TYPE, ramSizeCode: number): Uint8Array {
  const rom = new Uint8Array(0x8000);
  rom[0x0147] = type;
  rom[0x0149] = ramSizeCode;

  let checksum = 0;
  for (let address = 0x0134; address <= 0x014c; address += 1) {
    checksum = checksum - rom[address] - 1;
  }
  rom[0x014d] = checksum & 0xff;
  return rom;
}

function createMbc1BatteryCartridge(): Cartridge {
  const cartridge = new Cartridge();
  cartridge.loadROM(createRom(CARTRIDGE_TYPE.MBC1_RAM_BATTERY, 0x02));
  cartridge.write(0x0000, 0x0a);
  return cartridge;
}

function createTimerCartridge(
  type = CARTRIDGE_TYPE.MBC3_TIMER_RAM_BATTERY,
  ramSizeCode = 0x02,
): Cartridge {
  const cartridge = new Cartridge();
  cartridge.loadROM(createRom(type, ramSizeCode));
  cartridge.write(0x0000, 0x0a);
  return cartridge;
}

function writeRTCRegister(
  cartridge: Cartridge,
  register: number,
  value: number,
): void {
  cartridge.write(0x4000, 0x08 + register);
  cartridge.write(0xa000, value);
}

function readRTCRegister(cartridge: Cartridge, register: number): number {
  cartridge.write(0x4000, 0x08 + register);
  return cartridge.read(0xa000);
}

describe('cartridge RTC persistence', () => {
  const savedAt = 1_700_000_000;

  test('restores RAM and advances an active RTC by offline UTC seconds', () => {
    const source = createTimerCartridge();
    source.write(0x4000, 0x00);
    source.write(0xa000, 0xab);
    writeRTCRegister(source, 0, 10);
    const save = source.getSaveData(savedAt);

    const restored = createTimerCartridge();
    expect(restored.loadSaveData(save!, savedAt + 5)).toBe(true);
    restored.write(0x4000, 0x00);

    expect(restored.read(0xa000)).toBe(0xab);
    expect(readRTCRegister(restored, 0)).toBe(15);
  });

  test('does not advance a halted RTC while the emulator is closed', () => {
    const source = createTimerCartridge();
    writeRTCRegister(source, 0, 10);
    writeRTCRegister(source, 4, 0x40);
    const save = source.getSaveData(savedAt);

    const restored = createTimerCartridge();
    expect(restored.loadSaveData(save!, savedAt + 5)).toBe(true);

    expect(readRTCRegister(restored, 0)).toBe(10);
    expect(readRTCRegister(restored, 4) & 0x40).toBe(0x40);
  });

  test('treats a future save timestamp as zero elapsed time', () => {
    const source = createTimerCartridge();
    writeRTCRegister(source, 0, 10);
    const save = source.getSaveData(savedAt);

    const restored = createTimerCartridge();
    expect(restored.loadSaveData(save!, savedAt - 5)).toBe(true);

    expect(readRTCRegister(restored, 0)).toBe(10);
  });

  test('rejects a legacy raw-RAM save without mutating RAM', () => {
    const cartridge = createMbc1BatteryCartridge();
    cartridge.write(0xa000, 0x56);
    const legacyRAM = new Uint8Array(8 * 1024);
    legacyRAM[0] = 0x34;

    expect(cartridge.loadSaveData(legacyRAM, savedAt)).toBe(false);
    expect(cartridge.read(0xa000)).toBe(0x56);
  });

  test('rejects malformed versioned data without mutating RAM or RTC', () => {
    const source = createTimerCartridge();
    const save = source.getSaveData(savedAt)!;

    const target = createTimerCartridge();
    target.write(0x4000, 0x00);
    target.write(0xa000, 0xcd);
    writeRTCRegister(target, 0, 20);

    expect(target.loadSaveData(save.slice(0, -1), savedAt)).toBe(false);
    target.write(0x4000, 0x00);
    expect(target.read(0xa000)).toBe(0xcd);
    expect(readRTCRegister(target, 0)).toBe(20);
  });

  test('rejects a save whose RAM length does not match the cartridge', () => {
    const source = createTimerCartridge();
    const save = source.getSaveData(savedAt)!;
    const target = createTimerCartridge(
      CARTRIDGE_TYPE.MBC3_TIMER_BATTERY,
      0x00,
    );

    expect(target.loadSaveData(save, savedAt)).toBe(false);
  });

  test('rejects a save whose RTC presence does not match the cartridge', () => {
    const source = createMbc1BatteryCartridge();
    const save = source.getSaveData(savedAt)!;

    const target = createTimerCartridge();
    target.write(0x4000, 0x00);
    target.write(0xa000, 0xcd);
    writeRTCRegister(target, 0, 20);

    expect(target.loadSaveData(save, savedAt)).toBe(false);
    target.write(0x4000, 0x00);
    expect(target.read(0xa000)).toBe(0xcd);
    expect(readRTCRegister(target, 0)).toBe(20);
  });
});
