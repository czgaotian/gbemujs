import { GameBoy } from "./emu";

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

export function busRead(this: GameBoy, address: number): number {
  if (address <= 0x7FFF) {
    return this.cartridge.cartridgeRead(address);
  }
  if (address >= 0x8000 && address <= 0x97FF) {
    return this.vram[address - 0x8000];
  }
  if (address <= 0xBFFF) {
    // 卡带ROM和RAM区域
    return this.cartridge.cartridgeRead(address);
  }
  if (address >= 0xC000 && address <= 0xCFFF) {
    return this.wram[address - 0xC000];
  }
  if (address >= 0xFF01 && address <= 0xFF02) {
    // 串口
    return this.serial.read(address);
  }
  if (address >= 0xFF04 && address <= 0xFF07) {
    // 定时器
    return this.timer.read(address);
  }
  if (address == 0xFF0F) {
    // IF
    return this.intFlags | 0xE0;
  }
  if (address >= 0xFF80 && address <= 0xFFFE) {
    return this.hram[address - 0xFF80];
  }
  return 0xff;
}

export function busWrite(this: GameBoy, address: number, value: number): void {
  if (address <= 0x7FFF) {
    return;
  }
  if (address >= 0x8000 && address <= 0x97FF) {
    this.vram[address - 0x8000] = value;
    return;
  }
  if (address <= 0xBFFF) {
    // 卡带ROM和RAM区域
    this.cartridge.cartridgeWrite(address, value);
    return;
  }
  if (address >= 0xC000 && address <= 0xCFFF) {
    this.wram[address - 0xC000] = value;    
    return;
  }
  if (address >= 0xFF01 && address <= 0xFF02) {
    // 串口
    this.serial.write(address, value);
    return;
  }
  if (address >= 0xFF04 && address <= 0xFF07) {
    // 定时器
    this.timer.write(address, value);
    return;
  }
  if (address == 0xFF0F) {
    // IF
    this.intFlags = value & 0x1F;
    return;
  }
  if (address >= 0xFF80 && address <= 0xFFFE) {
    this.hram[address - 0xFF80] = value;
    return;
  }
}

export function busRead16(this: GameBoy, address: number): number {
  const low = this.busRead(address);
  const high = this.busRead(address + 1);
  return (high << 8) | low;
}

export function busWrite16(this: GameBoy, address: number, value: number): void {
  this.busWrite(address + 1, (value >> 8) & 0xFF);
  this.busWrite(address, value & 0xFF);
}
