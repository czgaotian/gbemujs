import { GameBoy } from "../emu/emu";

// 0x0000 - 0x3FFF : ROM Bank 0
// 0x4000 - 0x7FFF : ROM Bank 1 - Switchable
// 0x8000 - 0x97FF : CHR RAM
// 0x9800 - 0x9BFF : BG Map 1
// 0x9C00 - 0x9FFF : BG Map 2
// 0xA000 - 0xBFFF : Cartridge RAM
// 0xC000 - 0xCFFF : RAM Bank 0
// 0xD000 - 0xDFFF : RAM Bank 1-7 - switchable - Color only
// 0xE000 - 0xFDFF : Reserved - Echo RAM
// 0xFE00 - 0xFE9F : Object Attribute Memory
// 0xFEA0 - 0xFEFF : Reserved - Unusable
// 0xFF00 - 0xFF7F : I/O Registers
// 0xFF80 - 0xFFFE : Zero Page

export class Bus {
  private emu: GameBoy;

  constructor(gameBoy: GameBoy) {
    this.emu = gameBoy;
  }

  public readByte(address: number): number {
    // 卡带ROM和RAM区域
    if (address < 0x8000) {
      return this.emu.cartridge.readByte(address);
    }

    return 0xff;
  }

  public writeByte(address: number, value: number): void {
    // 卡带ROM和RAM区域
    if (address < 0x8000) {
      this.emu.cartridge.writeByte(address, value);
      return;
    }
  }
}
