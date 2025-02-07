import { GameBoy } from "../emu/emu";
import { bitSet, bitTest } from "../utils";


export class Serial {
  public emu: GameBoy;

  sb: number = 0;
  sc: number = 0;
  transfer: boolean = false;

  outByte: number = 0;
  transferBit: number = 0;

  outputBuffer: number[] = [];

  constructor(emu: GameBoy) {
    this.emu = emu;
  }

  public init() {
    this.sb = 0xFF;
    this.sc = 0x7C;
    this.transfer = false;
  }

  beginTransfer() {
    this.transfer = true;
    this.outByte = this.sb;
    this.transferBit = 7;
  }

  processTransfer() {
    this.sb <<= 1;
    // Set lowest bit to 1.
    this.sb++;
    this.transferBit--;
    if (this.transferBit < 0) {
      this.transferBit = 0;
      this.endTransfer();
    }
  }

  endTransfer() {
    this.outputBuffer.push(this.outByte);
    bitSet(this.sc, 7, true);
    this.transfer = false;
    this.emu.intFlags |= 0x08;
  }

  tick() {
    if (!this.transfer && this.transferEnabled && this.isMaster) {
      this.beginTransfer();
    }
    else if (this.transfer) {
      this.processTransfer();
    }
  }

  public read(addr: number) {
    if (addr >= 0xFF01 && addr <= 0xFF02) {
      if (addr == 0xFF01) return this.sb;
      if (addr == 0xFF02) return this.sc;
    }
    return 0xFF;
  }

  public write(addr: number, data: number) {
    if (addr >= 0xFF01 && addr <= 0xFF02) {
      if (addr == 0xFF01) {
        this.sb = data;
        return;
      }
      if (addr == 0xFF02) {
        this.sc = 0x7C | (data & 0x83);
        return;
      }
    }
  }

  get isMaster() {
    return bitTest(this.sc, 0);
  }

  get transferEnabled() {
    return bitTest(this.sc, 7);
  }

  get clockSelect() {
    return this.sc & 0x3;
  }
}