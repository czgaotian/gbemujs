import { describe, expect, test } from 'vitest';
import {
  decodeCartridgeSave,
  encodeCartridgeSave,
  isCartridgeSave,
} from '../../src/utils/cartridge';

describe('cartridge save codec', () => {
  test('round-trips RAM, RTC state, and a Unix-seconds timestamp', () => {
    const savedTimestamp = 1_700_000_000;
    const encoded = encodeCartridgeSave({
      ram: new Uint8Array([0x12, 0x34]),
      rtc: {
        elapsedSeconds: 90_061.5,
        registers: new Uint8Array([1, 1, 1, 1, 0]),
        latched: true,
      },
      savedTimestamp,
    });
    const view = new DataView(
      encoded.buffer,
      encoded.byteOffset,
      encoded.byteLength,
    );

    expect(isCartridgeSave(encoded)).toBe(true);
    expect(view.getBigInt64(encoded.length - 8, true)).toBe(
      BigInt(savedTimestamp),
    );
    expect(decodeCartridgeSave(encoded)).toEqual({
      ram: new Uint8Array([0x12, 0x34]),
      rtc: {
        elapsedSeconds: 90_061.5,
        registers: new Uint8Array([1, 1, 1, 1, 0]),
        latched: true,
      },
      savedTimestamp,
    });
  });

  test('round-trips a RAM-only save without RTC bytes', () => {
    const encoded = encodeCartridgeSave({
      ram: new Uint8Array([0xab]),
      rtc: null,
      savedTimestamp: null,
    });

    expect(encoded).toHaveLength(4 + 1 + 4 + 1 + 1);
    expect(decodeCartridgeSave(encoded)).toEqual({
      ram: new Uint8Array([0xab]),
      rtc: null,
      savedTimestamp: null,
    });
  });

  test('round-trips a negative signed-i64 timestamp', () => {
    const encoded = encodeCartridgeSave({
      ram: new Uint8Array(),
      rtc: {
        elapsedSeconds: 0,
        registers: new Uint8Array(5),
        latched: false,
      },
      savedTimestamp: -1,
    });

    expect(decodeCartridgeSave(encoded)?.savedTimestamp).toBe(-1);
  });

  test('rejects saves with an RTC but no timestamp', () => {
    expect(() =>
      encodeCartridgeSave({
        ram: new Uint8Array(),
        rtc: {
          elapsedSeconds: 0,
          registers: new Uint8Array(5),
          latched: false,
        },
        savedTimestamp: null,
      }),
    ).toThrow(RangeError);
  });

  test('rejects RAM-only saves with a timestamp', () => {
    expect(() =>
      encodeCartridgeSave({
        ram: new Uint8Array(),
        rtc: null,
        savedTimestamp: 1_700_000_000,
      }),
    ).toThrow(RangeError);
  });

  test('rejects a fractional timestamp', () => {
    expect(() =>
      encodeCartridgeSave({
        ram: new Uint8Array(),
        rtc: {
          elapsedSeconds: 0,
          registers: new Uint8Array(5),
          latched: false,
        },
        savedTimestamp: 1_700_000_000.5,
      }),
    ).toThrow(RangeError);
  });

  test('rejects a timestamp outside JavaScript safe integer range', () => {
    expect(() =>
      encodeCartridgeSave({
        ram: new Uint8Array(),
        rtc: {
          elapsedSeconds: 0,
          registers: new Uint8Array(5),
          latched: false,
        },
        savedTimestamp: Number.MAX_SAFE_INTEGER + 1,
      }),
    ).toThrow(RangeError);
  });

  test('rejects truncated, trailing, and unknown-version containers', () => {
    const encoded = encodeCartridgeSave({
      ram: new Uint8Array([0x12]),
      rtc: null,
      savedTimestamp: null,
    });
    const unknownVersion = encoded.slice();
    unknownVersion[4] = 2;

    expect(decodeCartridgeSave(encoded.slice(0, -1))).toBeNull();
    expect(decodeCartridgeSave(new Uint8Array([...encoded, 0xff]))).toBeNull();
    expect(decodeCartridgeSave(unknownVersion)).toBeNull();
  });

  test('does not identify legacy raw RAM as a versioned container', () => {
    expect(isCartridgeSave(new Uint8Array([0x00, 0x01, 0x02]))).toBe(false);
  });
});
