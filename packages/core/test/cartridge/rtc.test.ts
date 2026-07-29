import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { RTC, type RTCState } from '../../src/cartridge/rtc';

const DAY_MS = 24 * 60 * 60 * 1000;

function latchAndRead(rtc: RTC): number[] {
  rtc.latch();
  return Array.from({ length: 5 }, (_, offset) => rtc.readRegister(offset));
}

describe('RTC', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('advances lazily and retains subsecond wall time between latches', () => {
    const rtc = new RTC();

    vi.setSystemTime(1_500);
    expect(latchAndRead(rtc)[0]).toBe(1);

    vi.setSystemTime(1_999);
    expect(latchAndRead(rtc)[0]).toBe(1);

    vi.setSystemTime(2_000);
    expect(latchAndRead(rtc)[0]).toBe(2);
  });

  test('keeps a latched snapshot frozen until the next latch', () => {
    const rtc = new RTC();

    vi.setSystemTime(10_000);
    rtc.latch();
    vi.setSystemTime(15_000);

    expect(rtc.readRegister(0)).toBe(10);
    expect(latchAndRead(rtc)[0]).toBe(15);
  });

  test('does not settle elapsed time when a register is written', () => {
    const rtc = new RTC();

    vi.setSystemTime(60_000);
    rtc.writeRegister(1, 5);

    expect(rtc.readRegister(1)).toBe(0);
    expect(latchAndRead(rtc).slice(0, 2)).toEqual([0, 6]);
  });

  test('keeps elapsed wall time pending when Seconds is written', () => {
    const rtc = new RTC();

    vi.setSystemTime(1_500);
    rtc.writeRegister(0, 10);
    vi.setSystemTime(2_000);

    expect(latchAndRead(rtc)[0]).toBe(12);
  });

  test('does not count halted wall time when a latch observes halt', () => {
    const rtc = new RTC();
    rtc.writeRegister(0, 10);
    rtc.writeRegister(4, 0x40);

    vi.setSystemTime(10_000);
    expect(latchAndRead(rtc)[0]).toBe(10);

    rtc.writeRegister(4, 0);
    vi.setSystemTime(11_000);
    expect(latchAndRead(rtc)[0]).toBe(11);
  });

  test('settles each running interval when Halt changes between latches', () => {
    const rtc = new RTC();
    rtc.writeRegister(0, 10);

    vi.setSystemTime(5_000);
    rtc.writeRegister(4, 0x40);
    vi.setSystemTime(15_000);
    rtc.writeRegister(4, 0);
    vi.setSystemTime(20_000);

    expect(latchAndRead(rtc)[0]).toBe(20);
  });

  test('keeps pending time when Day High changes without changing Halt', () => {
    const rtc = new RTC();

    vi.setSystemTime(5_000);
    rtc.writeRegister(4, 0x80);
    vi.setSystemTime(6_000);

    expect(latchAndRead(rtc)).toEqual([6, 0, 0, 0, 0x80]);
  });

  test('recovers immediately after the wall clock moves backward', () => {
    vi.setSystemTime(2_000);
    const rtc = new RTC();

    vi.setSystemTime(1_000);
    expect(latchAndRead(rtc)[0]).toBe(0);

    vi.setSystemTime(2_000);
    expect(latchAndRead(rtc)[0]).toBe(1);
  });

  test('wraps the 9-bit day counter and keeps carry set until cleared', () => {
    const rtc = new RTC();
    rtc.writeRegister(2, 23);
    rtc.writeRegister(1, 59);
    rtc.writeRegister(0, 59);
    rtc.writeRegister(3, 0xff);
    rtc.writeRegister(4, 0x01);

    vi.setSystemTime(1_000);
    expect(latchAndRead(rtc)).toEqual([0, 0, 0, 0, 0x80]);

    vi.setSystemTime(DAY_MS + 1_000);
    expect(latchAndRead(rtc)).toEqual([0, 0, 0, 1, 0x80]);

    rtc.writeRegister(4, 0);
    expect(latchAndRead(rtc)[4]).toBe(0);
  });

  test('defers restored offline wall time until the next latch', () => {
    vi.setSystemTime(5_000);
    const rtc = new RTC();
    const state: RTCState = {
      liveRegisters: new Uint8Array([10, 0, 0, 0, 0]),
      latchedRegisters: new Uint8Array([10, 0, 0, 0, 0]),
      updatedAtMs: 0,
    };

    expect(rtc.setState(state)).toBe(true);
    expect(rtc.readRegister(0)).toBe(10);
    expect(rtc.getState()).toEqual(state);
    expect(latchAndRead(rtc)[0]).toBe(15);
  });

  test('restores a halted clock without adding offline wall time', () => {
    vi.setSystemTime(5_000);
    const rtc = new RTC();
    const state: RTCState = {
      liveRegisters: new Uint8Array([10, 0, 0, 0, 0x40]),
      latchedRegisters: new Uint8Array([10, 0, 0, 0, 0x40]),
      updatedAtMs: 0,
    };

    expect(rtc.setState(state)).toBe(true);
    expect(latchAndRead(rtc)).toEqual([10, 0, 0, 0, 0x40]);
  });

  test('persists live and latched clocks without settling pending time', () => {
    const rtc = new RTC();
    vi.setSystemTime(1_000);
    rtc.latch();
    vi.setSystemTime(2_000);

    expect(rtc.getState()).toEqual({
      liveRegisters: new Uint8Array([1, 0, 0, 0, 0]),
      latchedRegisters: new Uint8Array([1, 0, 0, 0, 0]),
      updatedAtMs: 1_000,
    });
  });

  test('rejects invalid persisted state without mutating the clock', () => {
    const rtc = new RTC();
    rtc.writeRegister(0, 10);
    rtc.latch();

    expect(
      rtc.setState({
        liveRegisters: new Uint8Array(5),
        latchedRegisters: new Uint8Array(5),
        updatedAtMs: Number.NaN,
      }),
    ).toBe(false);
    expect(rtc.readRegister(0)).toBe(10);
  });
});
