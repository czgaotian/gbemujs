const enum RTCRegister {
  Seconds = 0,
  Minutes = 1,
  Hours = 2,
  DayLow = 3,
  DayHigh = 4,
}

const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 60 * SECONDS_PER_MINUTE;
const SECONDS_PER_DAY = 24 * SECONDS_PER_HOUR;
const DAYS_PER_CYCLE = 512;

export interface RTCState {
  elapsedSeconds: number;
  registers: Uint8Array;
  latched: boolean;
}

/** MBC3 real-time clock registers and their elapsed-time backing store. */
export class RTC {
  private readonly registers = new Uint8Array(5);
  // 内部计时器，单位为秒
  private time = 0;
  private timeLatched = false;

  public constructor() {
    this.init();
  }

  public init(): void {
    this.registers.fill(0);
    this.time = 0;
    this.timeLatched = false;
  }

  public readRegister(offset: number): number {
    return this.registers[offset] ?? 0xff;
  }

  public writeRegister(offset: number, value: number): void {
    if (offset < 0 || offset >= this.registers.length) return;

    this.registers[offset] = value;
    this.updateTimestamp();
  }

  public update(deltaTime: number): void {
    if (this.halted()) return;

    // 将毫秒转换为秒
    this.time += deltaTime / 1000;
    if (!this.timeLatched) this.updateTimeRegisters();
  }

  public updateTimeRegisters(): void {
    const wholeSeconds = Math.floor(this.time);
    const totalDays = Math.floor(wholeSeconds / SECONDS_PER_DAY);

    this.registers[RTCRegister.Seconds] = wholeSeconds % SECONDS_PER_MINUTE;
    this.registers[RTCRegister.Minutes] =
      Math.floor(wholeSeconds / SECONDS_PER_MINUTE) % SECONDS_PER_MINUTE;
    this.registers[RTCRegister.Hours] =
      Math.floor(wholeSeconds / SECONDS_PER_HOUR) % 24;
    this.registers[RTCRegister.DayLow] = totalDays & 0xff;

    this.registers[RTCRegister.DayHigh] &= ~0x81;
    this.registers[RTCRegister.DayHigh] |= (totalDays >> 8) & 0x01;
    if (totalDays >= DAYS_PER_CYCLE)
      this.registers[RTCRegister.DayHigh] |= 0x80;
  }

  public updateTimestamp(): void {
    this.time =
      this.registers[RTCRegister.Seconds] +
      this.registers[RTCRegister.Minutes] * SECONDS_PER_MINUTE +
      this.registers[RTCRegister.Hours] * SECONDS_PER_HOUR +
      this.days() * SECONDS_PER_DAY;

    if (this.dayOverflow()) this.time += DAYS_PER_CYCLE * SECONDS_PER_DAY;
  }

  public latch(): void {
    this.updateTimeRegisters();
    this.timeLatched = true;
  }

  public days(): number {
    return (
      this.registers[RTCRegister.DayLow] |
      ((this.registers[RTCRegister.DayHigh] & 0x01) << 8)
    );
  }

  public halted(): boolean {
    return (this.registers[RTCRegister.DayHigh] & 0x40) !== 0;
  }

  public dayOverflow(): boolean {
    return (this.registers[RTCRegister.DayHigh] & 0x80) !== 0;
  }

  public getState(): RTCState {
    return {
      elapsedSeconds: this.time,
      registers: this.registers.slice(),
      latched: this.timeLatched,
    };
  }

  public setState(state: RTCState): boolean {
    if (
      !Number.isFinite(state.elapsedSeconds) ||
      state.elapsedSeconds < 0 ||
      !(state.registers instanceof Uint8Array) ||
      state.registers.length !== this.registers.length ||
      typeof state.latched !== 'boolean'
    ) {
      return false;
    }

    this.time = state.elapsedSeconds;
    this.registers.set(state.registers);
    this.timeLatched = state.latched;
    return true;
  }
}
