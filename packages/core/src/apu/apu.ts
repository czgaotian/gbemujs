import {
  PULSE_WAVE_0,
  PULSE_WAVE_1,
  PULSE_WAVE_2,
  PULSE_WAVE_3,
} from '../constants/apu';
import { GameBoy } from '../emu/emu';
import { bitTest, bitSet } from '../utils';
import { dac } from '../utils/apu';

export class APU {
  public emulator: GameBoy;
  /**
   * channel 1
   *
   * 0x00 0xFF10 NR10 - Channel 1 Sweep register (R/W)
   * 0x01 0xFF11 NR11 - Channel 1 Sound length/Wave pattern duty (R/W)
   * 0x02 0xFF12 NR12 - Channel 1 Volume Envelope (R/W)
   * 0x03 0xFF13 NR13 - Channel 1 Frequency lo (W)
   * 0x04 0xFF14 NR14 - Channel 1 Frequency hi (R/W)
   *
   * Master control registers
   *
   * 0x14 0xFF24 NR50 - Channel control / ON-OFF / Volume (R/W)
   * 0x15 0xFF25 NR51 - Selection of Sound output terminal (R/W)
   * 0x16 0xFF26 NR52 - Sound on/off (R/W)
   *
   *
   *
   *
   *
   */
  private _registers = new Uint8Array(0x30);

  // stores the timer DIV value in last tick to detect div value change.
  private lastDiv = 0;
  // DIV-APU counter
  private divApu = 0;

  // channel 1 state
  channel1SampleIndex = 0;
  channel1Volume = 0;
  channel1PeriodCounter = 0;
  channel1OutputSample = 0;
  channel1SweepIterationCounter = 0;
  channel1SweepIterationPace = 0;

  constructor(emulator: GameBoy) {
    this.emulator = emulator;
  }

  init() {
    this._registers.fill(0);
  }

  tick() {
    if (!this.isEnabled) return;
    // DIV-APU 4194304Hz
    this.tickDivApu();
    // APU 1048576Hz
    if (this.emulator.clockCycles % 4 === 0) {
      if (this.channel1Enabled) {
        this.tickChannel1();
      }
    }
  }

  tickDivApu() {
    const div = this.emulator.timer.div;

    // when div bit 4 toggles from 0 to 1, the APU will tick.
    if (bitTest(div, 4) && !bitTest(this.lastDiv, 4)) {
      // 512Hz
      this.divApu++;
      if (this.divApu % 2 === 0) {
        // Length tick 256Hz
        this.tickChannel1Length();
      }
      if (this.divApu % 4 === 0) {
        // Sweep tick 128Hz
        this.tickChannel1Sweep();
      }
      if (this.divApu % 8 === 0) {
        // Envelope tick 64Hz
        this.tickChannel1Envelope();
      }
    }
    this.lastDiv = div;
  }

  read(address: number) {
    // channel 1
    if (address >= 0xff10 && address <= 0xff14) {
      if (address === 0xff11) {
        // NR11 - Channel 1 Sound length/Wave pattern duty (R/W)
        return this._registers[address - 0xff10] & 0xc0;
      }
      if (address === 0xff14) {
        // NR14 - Channel 1 Frequency hi (R/W)
        return this._registers[address - 0xff10] & 0x40;
      }
      return this._registers[address - 0xff10];
    }

    // master control registers
    if (address >= 0xff24 && address <= 0xff26) {
      return this._registers[address - 0xff10];
    }
    return 0xff;
  }

  write(address: number, value: number) {
    // channel 1
    if (address >= 0xff10 && address <= 0xff14) {
      if (!this.isEnabled) {
        if (address === 0xff11) {
          // NR11 - Channel 1 Sound length/Wave pattern duty (R/W)
          this._registers[address - 0xff10] = value & 0xc0;
          return;
        }
      } else {
        if (address === 0xff14 && bitTest(value, 7)) {
          value &= 0x7f;
        }
        this._registers[address - 0xff10] = value;
      }
    }

    // master control registers
    if (address >= 0xff24 && address <= 0xff26) {
      // NR52 - Sound on/off (R/W)
      if (address === 0xff26) {
        const enabledBefore = this.isEnabled;
        // only bit 7 is writable
        this._registers[address - 0xff10] =
          (value & 0x80) | (this._registers[address - 0xff10] & 0x7f);
        if (!enabledBefore && this.isEnabled) {
          this.disable();
        }
      }
      // all registers except NR52 is read-only when APU is disabled
      if (!this.isEnabled) return;
      this._registers[address - 0xff10] = value;
    }
  }

  disable() {
    this._registers.fill(0);
  }

  get isEnabled(): boolean {
    // NR52
    return bitTest(this._registers[0x16], 7);
  }

  get channel1Enabled(): boolean {
    // NR52
    return bitTest(this._registers[0x16], 0);
  }

  get channel1DacOn(): boolean {
    // NR12 bits 3-7 are all 0, ch1 dac off
    return (this._registers[0x12] & 0xf8) !== 0;
  }

  get channel1WaveType() {
    // NR11 bits 6-7
    return (this._registers[0x01] & 0xc0) >> 6;
  }
  get channel1InitializeVolume() {
    // NR12 bits 4-7
    return (this._registers[0x02] & 0xf0) >> 4;
  }
  get channel1Period() {
    // NR13 + NR14 bits 0-2
    return this._registers[0x03] + ((this._registers[0x04] & 0x07) << 8);
  }

  get channel1SweepPace() {
    // NR10 bits 4-6
    return (this._registers[0x00] & 0x70) >> 4;
  }

  get channel1SweepSubtraction() {
    // NR10 bit 3
    return bitTest(this._registers[0x00], 3);
  }

  enableChannel1() {
    // NR52
    this._registers[0x16] = bitSet(this._registers[0x16], 0, true);

    this.channel1SampleIndex = 0;
    this.channel1Volume = this.channel1InitializeVolume;
    this.channel1PeriodCounter = this.channel1Period;
  }

  disableChannel1() {
    this._registers[0x16] = bitSet(this._registers[0x16], 0, false);
  }

  tickChannel1() {
    if (!this.channel1DacOn) {
      this.disableChannel1();
      return;
    }
    this.channel1PeriodCounter++;
    // greater than or equal to 2048
    if (this.channel1PeriodCounter >= 0x800) {
      // advance next sample
      this.channel1SampleIndex = (this.channel1SampleIndex + 1) % 8;
      this.channel1PeriodCounter = this.channel1Period;
    }
    let sample = 0;
    switch (this.channel1WaveType) {
      case 0:
        sample = PULSE_WAVE_0[this.channel1SampleIndex];
        break;
      case 1:
        sample = PULSE_WAVE_1[this.channel1SampleIndex];
        break;
      case 2:
        sample = PULSE_WAVE_2[this.channel1SampleIndex];
        break;
      case 3:
        sample = PULSE_WAVE_3[this.channel1SampleIndex];
        break;
      default:
        break;
    }
    this.channel1OutputSample = dac(sample * this.channel1Volume);
  }

  tickChannel1Length() {}
  tickChannel1Sweep() {}
  tickChannel1Envelope() {}
}
