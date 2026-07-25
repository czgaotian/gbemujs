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

describe('cartridge RAM persistence', () => {
  test('exports a copy of battery-backed RAM', () => {
    const cartridge = createMbc1BatteryCartridge();
    cartridge.write(0xa000, 0xab);

    const saved = cartridge.getRAMData();

    expect(saved).toHaveLength(8 * 1024);
    expect(saved?.[0]).toBe(0xab);
    saved![0] = 0x12;
    expect(cartridge.read(0xa000)).toBe(0xab);
  });

  test('imports only RAM data with the exact expected length', () => {
    const cartridge = createMbc1BatteryCartridge();
    cartridge.write(0xa000, 0x56);

    expect(cartridge.loadRAMData(new Uint8Array([0x12]))).toBe(false);
    expect(cartridge.read(0xa000)).toBe(0x56);

    const saved = new Uint8Array(8 * 1024);
    saved[0] = 0x34;
    expect(cartridge.loadRAMData(saved)).toBe(true);
    expect(cartridge.read(0xa000)).toBe(0x34);
  });

  test('does not import or export RAM for a cartridge without a battery', () => {
    const cartridge = new Cartridge();
    cartridge.loadROM(createRom(CARTRIDGE_TYPE.MBC1_RAM, 0x02));

    expect(cartridge.getRAMData()).toBeNull();
    expect(cartridge.loadRAMData(new Uint8Array(8 * 1024))).toBe(false);
  });

  test('restores the 512-byte low-nibble RAM of an MBC2 battery cartridge', () => {
    const cartridge = new Cartridge();
    cartridge.loadROM(createRom(CARTRIDGE_TYPE.MBC2_BATTERY, 0x00));

    const saved = new Uint8Array(512);
    saved[0] = 0x0b;
    expect(cartridge.loadRAMData(saved)).toBe(true);

    cartridge.write(0x0000, 0x0a);
    expect(cartridge.read(0xa000)).toBe(0xfb);
    expect(cartridge.getRAMData()).toEqual(saved);
  });
});
