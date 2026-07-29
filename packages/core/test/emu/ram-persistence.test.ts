import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { GameBoy } from '../../src/emu/emu';
import { CARTRIDGE_TYPE } from '../../src/types';

const schedule = () => () => {};

function readRTCSecondsThroughBus(gameBoy: GameBoy): number {
  gameBoy.busWrite(0x0000, 0x0a);
  gameBoy.busWrite(0x6000, 0x00);
  gameBoy.busWrite(0x6000, 0x01);
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

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(1_700_000_000_000);
});

afterEach(() => {
  vi.useRealTimers();
});

test('pauses when a bus write has no address', () => {
  const gameBoy = new GameBoy(schedule);

  gameBoy.busWrite(undefined as unknown as number, 0x00);

  expect(gameBoy.paused).toBe(true);
});

test('forwards full cartridge saves using the RTC wall clock', () => {
  const source = new GameBoy(schedule);
  source.loadROM(createTimerRom());
  source.busWrite(0x0000, 0x0a);
  source.busWrite(0x4000, 0x08);
  source.busWrite(0xa000, 10);
  const save = source.getSaveData();

  vi.setSystemTime(1_700_000_002_000);
  const restored = new GameBoy(schedule);
  restored.loadROM(createTimerRom());
  expect(restored.loadSaveData(save!)).toBe(true);

  expect(readRTCSecondsThroughBus(restored)).toBe(12);
});

test('restores a cartridge save before scheduling the emulator loop', () => {
  const source = new GameBoy(schedule);
  source.loadROM(createTimerRom());
  source.busWrite(0x0000, 0x0a);
  source.busWrite(0x4000, 0x08);
  source.busWrite(0xa000, 10);
  const save = source.getSaveData()!;
  vi.setSystemTime(1_700_000_003_000);

  let secondsWhenScheduled = 0;
  const restored = new GameBoy(() => {
    secondsWhenScheduled = readRTCSecondsThroughBus(restored);
    return () => {};
  });

  restored.start(createTimerRom(), save);

  expect(secondsWhenScheduled).toBe(13);
});

test('advances the RTC lazily on latch instead of emulator delta time', () => {
  const gameBoy = new GameBoy(schedule);
  gameBoy.loadROM(createTimerRom());
  gameBoy.paused = true;

  vi.setSystemTime(1_700_000_002_000);
  gameBoy.update(1);

  expect(readRTCSecondsThroughBus(gameBoy)).toBe(2);
});
