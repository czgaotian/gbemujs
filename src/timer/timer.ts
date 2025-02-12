import { GameBoy } from "../emu/emu";
import { bitTest } from "../utils";
import { INTERRUPT_TYPE as IT } from "../types";

export class Timer {
  // div u16, tima u8, tma u8, tac u8
  private _registers = new DataView(new ArrayBuffer(5));

  constructor(public emulator: GameBoy) {
  }

  init() {
    this.div = 0xAC00;
    this.tima = 0;
    this.tma = 0;
    this.tac = 0xF8;
  }

  tick() {
    const prevDiv = this.div;
    this.div++;
    let timaUpdate = false;

    if (this.timaEnabled) {
      switch (this.clockSelect) {
        case 0: // 4096 Hz
          timaUpdate = !!(prevDiv & (1 << 9)) && (!(this.div & (1 << 9)));
          break;
        case 1: // 262144 Hz
          timaUpdate = !!(prevDiv & (1 << 3)) && (!(this.div & (1 << 3)));
          break;
        case 2: // 65536 Hz
          timaUpdate = !!(prevDiv & (1 << 5)) && (!(this.div & (1 << 5)));
          break;
        case 3: // 16384 Hz
          timaUpdate = !!(prevDiv & (1 << 7)) && (!(this.div & (1 << 7)));
          break;
      }

      if (timaUpdate) {
        if (this.tima === 0xFF) {
          this.emulator.intFlags |= IT.TIMER;
          this.tima = this.tma;
        } else {
          this.tima++;
        }
      }
    }
  }

  public write(address: number, value: number) {
    switch (address) {
      case 0xFF04:
        // DIV
        this.div = 0;
        break;
      case 0xFF05:
        // TIMA
        this.tima = value;
        break;
      case 0xFF06:
        // TMA
        this.tma = value;
        break;
      case 0xFF07:
        // TAC
        this.tac = 0xF8 | (value & 0x07);;
        break;
    }
  }

  public read(address: number) {
    switch (address) {
      case 0xFF04:
        return this.div >>> 8;
      case 0xFF05:
        return this.tima;
      case 0xFF06:
        return this.tma;
      case 0xFF07:
        return this.tac;
      default:
        return 0xFF;
    }
  }

  get div() {
    return this._registers.getUint16(0);
  }

  set div(value: number) {
    this._registers.setUint16(0, value);
  }


  get tima() {
    return this._registers.getUint8(2);
  }

  set tima(value: number) {
    this._registers.setUint8(2, value);
  }

  get tma() {
    return this._registers.getUint8(3);
  }

  set tma(value: number) {
    this._registers.setUint8(3, value);
  }

  get tac() {
    return this._registers.getUint8(4);
  }

  set tac(value: number) {
    this._registers.setUint8(4, value);
  }

  get clockSelect() {
    return this.tac & 0b11;
  }

  get timaEnabled() {
    return bitTest(this.tac, 2);
  }
}

