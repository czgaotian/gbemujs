import { isValidRTCState, type RTCState } from '../cartridge/rtc';

const MAGIC = new Uint8Array([0x47, 0x42, 0x4a, 0x53]);
const VERSION = 1;
const HEADER_SIZE = MAGIC.length + 1 + 4;
const RTC_STATE_SIZE = 5 + 5 + 8;

export interface CartridgeSaveData {
  ram: Uint8Array;
  rtc: RTCState | null;
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
    (data.rtc !== null && !isValidRTCState(data.rtc))
  ) {
    throw new RangeError('Invalid cartridge save data');
  }

  const rtcSize = data.rtc === null ? 0 : RTC_STATE_SIZE;
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
    encoded.set(data.rtc.liveRegisters, offset);
    offset += data.rtc.liveRegisters.length;
    encoded.set(data.rtc.latchedRegisters, offset);
    offset += data.rtc.latchedRegisters.length;
    view.setBigInt64(offset, BigInt(data.rtc.updatedAtMs), true);
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
  if (rtcFlag === 1) {
    if (offset + RTC_STATE_SIZE !== data.length) return null;

    const liveRegisters = data.slice(offset, offset + 5);
    offset += liveRegisters.length;
    const latchedRegisters = data.slice(offset, offset + 5);
    offset += latchedRegisters.length;
    const timestamp = view.getBigInt64(offset, true);
    offset += 8;

    if (timestamp < 0 || timestamp > BigInt(Number.MAX_SAFE_INTEGER)) {
      return null;
    }

    const candidate: RTCState = {
      liveRegisters,
      latchedRegisters,
      updatedAtMs: Number(timestamp),
    };
    if (!isValidRTCState(candidate)) return null;
    rtc = candidate;
  } else if (rtcFlag !== 0 || offset !== data.length) {
    return null;
  }

  if (offset !== data.length) return null;

  return { ram, rtc };
}
