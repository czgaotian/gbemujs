const enum RTCRegister {
  Seconds = 0,
  Minutes = 1,
  Hours = 2,
  DayLow = 3,
  DayHigh = 4,
}

// MBC3 real-time clock has 5 registers, with the following bit layout:
// Seconds: 0-59 (0x00-0x3B)
// Minutes: 0-59 (0x00-0x3B)
// Hours: 0-23 (0x00-0x17)
// Day low: 0-255 (lower 8 bits of day counter)
// Day high: bit 0 = day counter bit 8, bit 6 = halt flag, bit 7 = day counter overflow flag
const REGISTER_MASKS = new Uint8Array([0x3f, 0x3f, 0x1f, 0xff, 0xc1]);

const REGISTER_COUNT = 5;
const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = SECONDS_PER_MINUTE * 60;
const SECONDS_PER_DAY = SECONDS_PER_HOUR * 24;
const DAYS_PER_CYCLE = 512;

export interface RTCState {
  liveRegisters: Uint8Array;
  latchedRegisters: Uint8Array;
  updatedAtMs: number;
}

function hasValidRegisters(registers: unknown): registers is Uint8Array {
  return (
    registers instanceof Uint8Array &&
    registers.length === REGISTER_COUNT &&
    registers.every((value, offset) => (value & ~REGISTER_MASKS[offset]) === 0)
  );
}

export function isValidRTCState(state: unknown): state is RTCState {
  if (typeof state !== 'object' || state === null) return false;

  const candidate = state as Partial<RTCState>;
  return (
    hasValidRegisters(candidate.liveRegisters) &&
    hasValidRegisters(candidate.latchedRegisters) &&
    Number.isSafeInteger(candidate.updatedAtMs) &&
    candidate.updatedAtMs! >= 0
  );
}

/** MBC3 real-time clock with separate live and latched register state. */
export class RTC {
  private readonly liveRegisters = new Uint8Array(REGISTER_COUNT);
  private readonly latchedRegisters = new Uint8Array(REGISTER_COUNT);
  private lastRealTimestampMs = 0;

  public constructor() {
    this.init();
  }

  public init(): void {
    this.liveRegisters.fill(0);
    this.latchedRegisters.fill(0);
    this.lastRealTimestampMs = Date.now();
  }

  public readRegister(offset: number): number {
    return this.latchedRegisters[offset] ?? 0xff;
  }

  public writeRegister(offset: number, value: number): void {
    if (offset < 0 || offset >= REGISTER_COUNT) return;

    const haltChanged =
      offset === RTCRegister.DayHigh &&
      ((this.liveRegisters[offset] ^ value) & 0x40) !== 0;

    if (haltChanged) this.advanceToNow();
    this.liveRegisters[offset] = value & REGISTER_MASKS[offset];
    if (haltChanged) this.lastRealTimestampMs = Date.now();
  }

  private advanceToNow(): void {
    const now = Date.now();

    // If the system clock has moved backwards, we don't advance the RTC.
    if (now < this.lastRealTimestampMs) {
      this.lastRealTimestampMs = now;
      return;
    }

    if (this.halted()) {
      this.lastRealTimestampMs = now;
      return;
    }

    const elapsedSeconds = Math.floor((now - this.lastRealTimestampMs) / 1000);
    if (elapsedSeconds === 0) return;

    this.lastRealTimestampMs += elapsedSeconds * 1000;
    this.advanceSeconds(elapsedSeconds);
  }

  // Advances the RTC by a given number of seconds,
  // updating the live registers accordingly.
  private advanceSeconds(elapsedSeconds: number): void {
    if (elapsedSeconds <= 0) return;

    const currentSeconds =
      this.liveRegisters[RTCRegister.Seconds] +
      this.liveRegisters[RTCRegister.Minutes] * SECONDS_PER_MINUTE +
      this.liveRegisters[RTCRegister.Hours] * SECONDS_PER_HOUR;
    const totalSeconds = currentSeconds + elapsedSeconds;

    const elapsedDays = Math.floor(totalSeconds / SECONDS_PER_DAY);

    let secondsWithinDay = totalSeconds % SECONDS_PER_DAY;
    this.liveRegisters[RTCRegister.Hours] = Math.floor(
      secondsWithinDay / SECONDS_PER_HOUR,
    );
    secondsWithinDay %= SECONDS_PER_HOUR;
    this.liveRegisters[RTCRegister.Minutes] = Math.floor(
      secondsWithinDay / SECONDS_PER_MINUTE,
    );
    this.liveRegisters[RTCRegister.Seconds] =
      secondsWithinDay % SECONDS_PER_MINUTE;

    const currentDays =
      this.liveRegisters[RTCRegister.DayLow] |
      ((this.liveRegisters[RTCRegister.DayHigh] & 0x01) << 8);
    const totalDays = currentDays + elapsedDays;

    const wrappedDays = totalDays % DAYS_PER_CYCLE;
    let dayHigh =
      (this.liveRegisters[RTCRegister.DayHigh] & 0xc0) |
      ((wrappedDays >> 8) & 0x01);
    if (totalDays >= DAYS_PER_CYCLE) dayHigh |= 0x80;

    this.liveRegisters[RTCRegister.DayLow] = wrappedDays & 0xff;
    this.liveRegisters[RTCRegister.DayHigh] = dayHigh;
  }

  public latch(): void {
    this.advanceToNow();
    this.latchedRegisters.set(this.liveRegisters);
  }

  public halted(): boolean {
    return (this.liveRegisters[RTCRegister.DayHigh] & 0x40) !== 0;
  }

  public getState(): RTCState {
    return {
      liveRegisters: this.liveRegisters.slice(),
      latchedRegisters: this.latchedRegisters.slice(),
      updatedAtMs: this.lastRealTimestampMs,
    };
  }

  public setState(state: RTCState): boolean {
    if (!isValidRTCState(state)) return false;

    this.liveRegisters.set(state.liveRegisters);
    this.latchedRegisters.set(state.latchedRegisters);
    this.lastRealTimestampMs = state.updatedAtMs;
    return true;
  }
}
