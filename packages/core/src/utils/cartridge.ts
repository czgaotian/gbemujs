import type { RTCState } from '../cartridge/rtc';

const MAGIC = new Uint8Array([0x47, 0x42, 0x4a, 0x53]);
const VERSION = 1;
const HEADER_SIZE = MAGIC.length + 1 + 4;
const RTC_STATE_SIZE = 8 + 5 + 1;
const TIMESTAMP_SIZE = 8;

export interface CartridgeSaveData {
  ram: Uint8Array;
  rtc: RTCState | null;
  savedTimestamp: number | null;
}

export function isCartridgeSave(data: Uint8Array): boolean {
  return (
    data.length >= MAGIC.length &&
    MAGIC.every((byte, index) => data[index] === byte)
  );
}

export function encodeCartridgeSave(data: CartridgeSaveData): Uint8Array {
  if (
    data.ram.length > 0xffffffff ||
    (data.rtc === null) !== (data.savedTimestamp === null) ||
    (data.savedTimestamp !== null &&
      !Number.isSafeInteger(data.savedTimestamp)) ||
    (data.rtc !== null &&
      (!Number.isFinite(data.rtc.elapsedSeconds) ||
        data.rtc.elapsedSeconds < 0 ||
        !(data.rtc.registers instanceof Uint8Array) ||
        data.rtc.registers.length !== 5 ||
        typeof data.rtc.latched !== 'boolean'))
  ) {
    throw new RangeError('Invalid cartridge save data');
  }

  const rtcSize = data.rtc === null ? 0 : RTC_STATE_SIZE + TIMESTAMP_SIZE;
  const encoded = new Uint8Array(HEADER_SIZE + data.ram.length + 1 + rtcSize);
  const view = new DataView(encoded.buffer);
  let offset = 0;

  encoded.set(MAGIC, offset);
  offset += MAGIC.length;
  encoded[offset] = VERSION;
  offset += 1;
  view.setUint32(offset, data.ram.length, true);
  offset += 4;
  encoded.set(data.ram, offset);
  offset += data.ram.length;

  encoded[offset] = data.rtc === null ? 0 : 1;
  offset += 1;
  if (data.rtc !== null) {
    view.setFloat64(offset, data.rtc.elapsedSeconds, true);
    offset += 8;
    encoded.set(data.rtc.registers, offset);
    offset += data.rtc.registers.length;
    encoded[offset] = data.rtc.latched ? 1 : 0;
    offset += 1;
    view.setBigInt64(offset, BigInt(data.savedTimestamp!), true);
  }

  return encoded;
}

export function decodeCartridgeSave(
  data: Uint8Array,
): CartridgeSaveData | null {
  if (!isCartridgeSave(data) || data.length < HEADER_SIZE + 1) return null;

  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  let offset = MAGIC.length;
  if (data[offset] !== VERSION) return null;
  offset += 1;

  const ramLength = view.getUint32(offset, true);
  offset += 4;
  const rtcFlagOffset = offset + ramLength;
  if (rtcFlagOffset >= data.length) return null;

  const ram = data.slice(offset, rtcFlagOffset);
  offset = rtcFlagOffset;
  const rtcFlag = data[offset];
  offset += 1;

  let rtc: RTCState | null = null;
  let savedTimestamp: number | null = null;
  if (rtcFlag === 1) {
    if (offset + RTC_STATE_SIZE + TIMESTAMP_SIZE !== data.length) return null;

    const elapsedSeconds = view.getFloat64(offset, true);
    offset += 8;
    const registers = data.slice(offset, offset + 5);
    offset += registers.length;
    const latched = data[offset];
    offset += 1;

    if (
      !Number.isFinite(elapsedSeconds) ||
      elapsedSeconds < 0 ||
      (latched !== 0 && latched !== 1)
    ) {
      return null;
    }
    rtc = { elapsedSeconds, registers, latched: latched === 1 };
    const timestamp = view.getBigInt64(offset, true);
    if (
      timestamp < BigInt(Number.MIN_SAFE_INTEGER) ||
      timestamp > BigInt(Number.MAX_SAFE_INTEGER)
    ) {
      return null;
    }
    savedTimestamp = Number(timestamp);
    offset += TIMESTAMP_SIZE;
  } else if (rtcFlag !== 0) {
    return null;
  }

  if (offset !== data.length) return null;

  return { ram, rtc, savedTimestamp };
}
