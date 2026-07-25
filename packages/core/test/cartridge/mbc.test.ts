import { describe, expect, test } from 'vitest';
import { Cartridge } from '../../src/cartridge/cartridge';
import { MBC2 } from '../../src/cartridge/mbc';
import { CARTRIDGE_TYPE } from '../../src/types';

function createRom(): Uint8Array {
  const rom = new Uint8Array(0x4000 * 16);
  for (let bank = 0; bank < 16; bank += 1) {
    rom.fill(bank, bank * 0x4000, (bank + 1) * 0x4000);
  }
  return rom;
}

function createCartridgeRom(ramSizeCode: number): Uint8Array {
  const rom = new Uint8Array(0x8000);
  rom[0x0147] = CARTRIDGE_TYPE.MBC1_RAM_BATTERY;
  rom[0x0149] = ramSizeCode;

  let checksum = 0;
  for (let address = 0x0134; address <= 0x014c; address += 1) {
    checksum = checksum - rom[address] - 1;
  }
  rom[0x014d] = checksum & 0xff;
  return rom;
}

describe('MBC2', () => {
  test('selects a four-bit ROM bank only through addresses with bit 8 set', () => {
    const mbc = new MBC2(createRom());

    mbc.write(0x2100, 0x03);
    expect(mbc.read(0x4000)).toBe(0x03);

    mbc.write(0x2000, 0x04);
    expect(mbc.read(0x4000)).toBe(0x03);

    mbc.write(0x2100, 0x00);
    expect(mbc.read(0x4000)).toBe(0x01);
  });

  test('stores only RAM low nibbles while enabled', () => {
    const mbc = new MBC2(createRom());

    mbc.write(0xa000, 0xab);
    expect(mbc.read(0xa000)).toBe(0xff);

    mbc.write(0x0000, 0x0a);
    mbc.write(0xa1ff, 0xab);
    expect(mbc.read(0xa1ff)).toBe(0xfb);
    expect(mbc.read(0xa200)).toBe(0xff);

    mbc.write(0x0000, 0x00);
    expect(mbc.read(0xa1ff)).toBe(0xff);
  });
});

test('allocates the 32 KiB specified by RAM size code 0x03', () => {
  const cartridge = new Cartridge();
  cartridge.loadROM(createCartridgeRom(0x03));

  cartridge.write(0x0000, 0x0a);
  cartridge.write(0x6000, 0x01);
  cartridge.write(0x4000, 0x03);
  cartridge.write(0xa1ff, 0xab);

  expect(cartridge.getCartridgeInfo()?.ramSize).toBe(32 * 1024);
  expect(cartridge.read(0xa1ff)).toBe(0xab);
});
