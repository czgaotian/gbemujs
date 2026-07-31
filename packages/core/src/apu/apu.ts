import { GameBoy } from '../emu/emu';
import { bitTest } from '../utils';
import { Channel1 } from './channel1';

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

  channel1: Channel1;

  constructor(emulator: GameBoy) {
    this.emulator = emulator;
    this.channel1 = new Channel1(this);
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
      if (this.channel1.enabled) {
        this.channel1.tick();
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
        this.channel1.tickLength();
      }
      if (this.divApu % 4 === 0) {
        // Sweep tick 128Hz
        this.channel1.tickSweep();
      }
      if (this.divApu % 8 === 0) {
        // Envelope tick 64Hz
        this.channel1.tickEnvelope();
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

  getRegister(index: number) {
    return this._registers[index];
  }

  setRegister(index: number, value: number) {
    this._registers[index] = value;
  }
}
