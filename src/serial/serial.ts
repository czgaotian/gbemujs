import { GameBoy } from '../emu/emu';
import { bitSet, bitTest } from '../utils';
import { InterruptType as IT } from '../types';

export class Serial {
  public emu: GameBoy;

  // 0xFF01 Serial transfer data.
  sb: number = 0;
  // 0xFF02 Serial control.
  sc: number = 0;

  transfering: boolean = false;

  outByte: number = 0;
  transferBit: number = 0;

  outputBuffer: number[] = [];

  constructor(emu: GameBoy) {
    this.emu = emu;
  }

  public init() {
    this.sb = 0xff;
    this.sc = 0x7c;
    this.transfering = false;
  }

  beginTransfer() {
    this.transfering = true;
    this.outByte = this.sb;
    this.transferBit = 7;
  }

  processTransfer() {
    this.sb = (this.sb << 1) & 0xff;
    // Set lowest bit to 1.
    this.sb++;
    this.transferBit--;
    if (this.transferBit < 0) {
      this.transferBit = 0;
      this.endTransfer();
    }
  }

  endTransfer() {
    this.sc = bitSet(this.sc, 7, false);
    this.transfering = false;
    this.emu.intFlags |= IT.SERIAL;
    this.outputBuffer.push(this.outByte);
  }

  tick() {
    if (!this.transfering && this.transferEnabled && this.isMaster) {
      this.beginTransfer();
    } else if (this.transfering) {
      this.processTransfer();
    }
  }

  public read(addr: number) {
    if (addr >= 0xff01 && addr <= 0xff02) {
      if (addr === 0xff01) return this.sb;
      if (addr === 0xff02) return this.sc;
    }
    return 0xff;
  }

  /**
   * @param addr
   * @param data u8
   */
  public write(addr: number, data: number) {
    if (addr >= 0xff01 && addr <= 0xff02) {
      if (addr === 0xff01) {
        // this.emu.isDebug = true;
        this.sb = data;
        return;
      }
      if (addr === 0xff02) {
        this.sc = 0x7c | (data & 0x83);
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
