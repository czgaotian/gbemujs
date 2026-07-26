import { expect, test } from 'vitest';
import { GameBoy } from '../../src/emu/emu';
import { CARTRIDGE_TYPE } from '../../src/types';

const loopController = {
  now: () => 0,
  schedule: () => () => {},
};

function readRTCSecondsThroughBus(gameBoy: GameBoy): number {
  gameBoy.busWrite(0x0000, 0x0a);
  gameBoy.busWrite(0x4000, 0x08);
  return gameBoy.busRead(0xa000);
}

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

function createTimerRom(): Uint8Array {
  const rom = new Uint8Array(0x8000);
  rom[0x0147] = CARTRIDGE_TYPE.MBC3_TIMER_RAM_BATTERY;
  rom[0x0149] = 0x02;

  let checksum = 0;
  for (let address = 0x0134; address <= 0x014c; address += 1) {
    checksum = checksum - rom[address] - 1;
  }
  rom[0x014d] = checksum & 0xff;
  return rom;
}

test('pauses when a bus write has no address', () => {
  const gameBoy = new GameBoy(loopController);

  gameBoy.busWrite(undefined as unknown as number, 0x00);

  expect(gameBoy.paused).toBe(true);
});

test('forwards full cartridge saves with UNIX seconds', () => {
  const savedAt = 1_700_000_000;
  const source = new GameBoy(loopController);
  source.loadROM(createTimerRom());
  source.busWrite(0x0000, 0x0a);
  source.busWrite(0x4000, 0x08);
  source.busWrite(0xa000, 10);
  const save = source.getSaveData(savedAt);

  const restored = new GameBoy(loopController);
  restored.loadROM(createTimerRom());
  expect(restored.loadSaveData(save!, savedAt + 2)).toBe(true);

  expect(readRTCSecondsThroughBus(restored)).toBe(12);
});

test('restores a cartridge save before scheduling the emulator loop', () => {
  const savedAt = 1_700_000_000;
  const source = new GameBoy(loopController);
  source.loadROM(createTimerRom());
  source.busWrite(0x0000, 0x0a);
  source.busWrite(0x4000, 0x08);
  source.busWrite(0xa000, 10);
  const save = source.getSaveData(savedAt)!;
  let secondsWhenScheduled = 0;
  const restored = new GameBoy({
    now: () => 0,
    schedule: () => {
      secondsWhenScheduled = readRTCSecondsThroughBus(restored);
      return () => {};
    },
  });

  restored.start(createTimerRom(), save, savedAt + 3);

  expect(secondsWhenScheduled).toBe(13);
});

test('passes runtime milliseconds to the cartridge RTC', () => {
  const gameBoy = new GameBoy(loopController);
  gameBoy.loadROM(createTimerRom());
  gameBoy.paused = true;

  gameBoy.update(2_000);
  gameBoy.busWrite(0x0000, 0x0a);
  gameBoy.busWrite(0x4000, 0x08);

  expect(gameBoy.busRead(0xa000)).toBe(2);
});
