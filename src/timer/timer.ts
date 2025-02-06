import { GameBoy } from "../emu/emu";
import { bitTest } from "../utils";

export class Timer {
  div: number = 0;
  tima: number = 0;
  tma: number = 0;
  tac: number = 0;

  constructor() {
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
        case 0:
          timaUpdate = !!(prevDiv & (1 << 9)) && (!(this.div & (1 << 9)));
          break;
        case 1:
          timaUpdate = !!(prevDiv & (1 << 3)) && (!(this.div & (1 << 3)));
          break;
        case 2:
          timaUpdate = !!(prevDiv & (1 << 5)) && (!(this.div & (1 << 5)));
          break;
        case 3:
          timaUpdate = !!(prevDiv & (1 << 7)) && (!(this.div & (1 << 7)));
          break;
      }

      if (timaUpdate) {
        if (this.tima === 0xFF) {
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
        return this.div >> 8;
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

  readDIV() {
    return (this.div >> 8) & 0xff;
  }

  get clockSelect() {
    return this.tac & 0b11;
  }

  get timaEnabled() {
    return bitTest(this.tac, 2);
  }
}

