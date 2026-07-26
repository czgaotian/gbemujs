import { describe, expect, test } from 'vitest';
import { RTC } from '../../src/cartridge/rtc';

describe('RTC', () => {
  test('resets registers, elapsed time, and latch state with init', () => {
    const rtc = new RTC();
    rtc.update(10);
    rtc.latch();

    rtc.init();
    rtc.update(1);

    expect(rtc.readRegister(0)).toBe(1);
    expect(rtc.readRegister(1)).toBe(0);
    expect(rtc.readRegister(2)).toBe(0);
    expect(rtc.readRegister(3)).toBe(0);
    expect(rtc.readRegister(4)).toBe(0);
  });

  test('advances the five time registers from elapsed frame time', () => {
    const rtc = new RTC();

    rtc.update(90_061);

    expect(rtc.readRegister(0)).toBe(1);
    expect(rtc.readRegister(1)).toBe(1);
    expect(rtc.readRegister(2)).toBe(1);
    expect(rtc.readRegister(3)).toBe(1);
    expect(rtc.readRegister(4)).toBe(0);
  });

  test('preserves a refreshed register snapshot until the next latch', () => {
    const rtc = new RTC();
    rtc.update(10);

    rtc.latch();
    rtc.update(5);
    expect(rtc.readRegister(0)).toBe(10);

    rtc.latch();
    expect(rtc.readRegister(0)).toBe(15);
    rtc.update(5);
    expect(rtc.readRegister(0)).toBe(15);
  });

  test('synchronizes elapsed time after a time-register write', () => {
    const rtc = new RTC();
    rtc.writeRegister(2, 23);
    rtc.writeRegister(1, 59);
    rtc.writeRegister(0, 59);

    rtc.update(1);

    expect(rtc.readRegister(0)).toBe(0);
    expect(rtc.readRegister(1)).toBe(0);
    expect(rtc.readRegister(2)).toBe(0);
    expect(rtc.readRegister(3)).toBe(1);
  });

  test('restores elapsed time, registers, and latch state from a snapshot', () => {
    const source = new RTC();
    source.update(90_061);
    source.latch();

    const restored = new RTC();
    expect(restored.setState(source.getState())).toBe(true);
    restored.update(5);

    expect(restored.readRegister(0)).toBe(1);
    restored.latch();
    expect(restored.readRegister(0)).toBe(6);
  });

  test('rejects invalid snapshots without changing the clock', () => {
    const rtc = new RTC();
    rtc.update(10);

    expect(
      rtc.setState({
        elapsedSeconds: Number.NaN,
        registers: new Uint8Array(5),
        latched: false,
      }),
    ).toBe(false);
    rtc.update(1);

    expect(rtc.readRegister(0)).toBe(11);
  });
});
