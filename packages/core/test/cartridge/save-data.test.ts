import { describe, expect, test } from 'vitest';
import {
  decodeCartridgeSave,
  encodeCartridgeSave,
  isCartridgeSave,
} from '../../src/utils/cartridge';

describe('cartridge save codec', () => {
  test('round-trips RAM and the lazy RTC state in version 2', () => {
    const encoded = encodeCartridgeSave({
      ram: new Uint8Array([0x12, 0x34]),
      rtc: {
        liveRegisters: new Uint8Array([1, 2, 3, 4, 0x41]),
        latchedRegisters: new Uint8Array([5, 6, 7, 8, 0x81]),
        updatedAtMs: 1_700_000_000_000,
      },
    });
    const view = new DataView(
      encoded.buffer,
      encoded.byteOffset,
      encoded.byteLength,
    );

    expect(isCartridgeSave(encoded)).toBe(true);
    expect(encoded[4]).toBe(2);
    expect(encoded).toHaveLength(4 + 1 + 4 + 2 + 1 + 18);
    expect(view.getBigInt64(encoded.length - 8, true)).toBe(
      1_700_000_000_000n,
    );
    expect(decodeCartridgeSave(encoded)).toEqual({
      ram: new Uint8Array([0x12, 0x34]),
      rtc: {
        liveRegisters: new Uint8Array([1, 2, 3, 4, 0x41]),
        latchedRegisters: new Uint8Array([5, 6, 7, 8, 0x81]),
        updatedAtMs: 1_700_000_000_000,
      },
    });
  });

  test('round-trips a RAM-only version 2 save', () => {
    const encoded = encodeCartridgeSave({
      ram: new Uint8Array([0xab]),
      rtc: null,
    });

    expect(encoded).toHaveLength(4 + 1 + 4 + 1 + 1);
    expect(decodeCartridgeSave(encoded)).toEqual({
      ram: new Uint8Array([0xab]),
      rtc: null,
    });
  });

  test.each([
    -1,
    1_700_000_000_000.5,
    Number.MAX_SAFE_INTEGER + 1,
  ])('rejects invalid RTC timestamp %s', (updatedAtMs) => {
    expect(() =>
      encodeCartridgeSave({
        ram: new Uint8Array(),
        rtc: {
          liveRegisters: new Uint8Array(5),
          latchedRegisters: new Uint8Array(5),
          updatedAtMs,
        },
      }),
    ).toThrow(RangeError);
  });

  test('rejects invalid RTC register bits', () => {
    expect(() =>
      encodeCartridgeSave({
        ram: new Uint8Array(),
        rtc: {
          liveRegisters: new Uint8Array([0, 0, 0, 0, 0x02]),
          latchedRegisters: new Uint8Array(5),
          updatedAtMs: 0,
        },
      }),
    ).toThrow(RangeError);
  });

  test('rejects malformed and version 1 containers', () => {
    const encoded = encodeCartridgeSave({
      ram: new Uint8Array([0x12]),
      rtc: null,
    });
    const version1 = encoded.slice();
    version1[4] = 1;
    const invalidFlag = encoded.slice();
    invalidFlag[invalidFlag.length - 1] = 2;

    expect(decodeCartridgeSave(encoded.slice(0, -1))).toBeNull();
    expect(decodeCartridgeSave(new Uint8Array([...encoded, 0xff]))).toBeNull();
    expect(decodeCartridgeSave(version1)).toBeNull();
    expect(decodeCartridgeSave(invalidFlag)).toBeNull();
  });

  test('rejects malformed RTC bytes during decoding', () => {
    const encoded = encodeCartridgeSave({
      ram: new Uint8Array(),
      rtc: {
        liveRegisters: new Uint8Array(5),
        latchedRegisters: new Uint8Array(5),
        updatedAtMs: 0,
      },
    });
    encoded[14] = 0x02;

    expect(decodeCartridgeSave(encoded)).toBeNull();
  });

  test('does not identify legacy raw RAM as a versioned container', () => {
    expect(isCartridgeSave(new Uint8Array([0x00, 0x01, 0x02]))).toBe(false);
  });
});
