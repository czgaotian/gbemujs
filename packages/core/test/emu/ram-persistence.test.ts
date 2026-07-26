import { expect, test } from 'vitest';
import { GameBoy } from '../../src/emu/emu';
import { CARTRIDGE_TYPE } from '../../src/types';

const loopController = {
  now: () => 0,
  schedule: () => () => {},
};

function createBatteryRom(): Uint8Array {
  const rom = new Uint8Array(0x8000);
  rom[0x0147] = CARTRIDGE_TYPE.MBC1_RAM_BATTERY;
  rom[0x0149] = 0x02;

  let checksum = 0;
  for (let address = 0x0134; address <= 0x014c; address += 1) {
    checksum = checksum - rom[address] - 1;
  }
  rom[0x014d] = checksum & 0xff;
  return rom;
}

test('imports and exports cartridge RAM through the GameBoy API', () => {
  const gameBoy = new GameBoy(loopController);
  gameBoy.loadROM(createBatteryRom());

  const saved = new Uint8Array(8 * 1024);
  saved[0] = 0x44;

  expect(gameBoy.loadRAMData(saved)).toBe(true);
  expect(gameBoy.getRAMData()).toEqual(saved);
});

test('persists RAM written through the memory bus', () => {
  const gameBoy = new GameBoy(loopController);
  gameBoy.loadROM(createBatteryRom());

  gameBoy.busWrite(0x0000, 0x0a);
  gameBoy.busWrite(0xa000, 0xa5);

  expect(gameBoy.getRAMData()?.[0]).toBe(0xa5);
});
