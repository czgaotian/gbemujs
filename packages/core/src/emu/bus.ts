import { GameBoy } from './emu';

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

/**
 * @param address u16
 * @returns u8
 */
export function busRead(this: GameBoy, address: number): number {
  if (address <= 0x7fff) {
    return this.cartridge.read(address) & 0xff;
  }
  if (address >= 0x8000 && address <= 0x9fff) {
    return this.vram[address - 0x8000] & 0xff;
  }
  if (address <= 0xbfff) {
    // 卡带ROM和RAM区域
    return this.cartridge.read(address) & 0xff;
  }
  if (address <= 0xdfff) {
    // work ram
    return this.wram[address - 0xc000] & 0xff;
  }
  if (address <= 0xfdff) {
    // echo ram
    return 0xff;
  }
  if (address >= 0xfe00 && address <= 0xfe9f) {
    // Object Attribute Memory
    return this.oam[address - 0xfe00] & 0xff;
  }
  if (address <= 0xfeff) {
    // Reserved - Unusable
    return 0xff;
  }
  if (address === 0xff00) {
    return this.joypad.read();
  }
  if (address >= 0xff01 && address <= 0xff02) {
    // 串口
    return this.serial.read(address) & 0xff;
  }
  if (address >= 0xff04 && address <= 0xff07) {
    // 定时器
    return this.timer.read(address) & 0xff;
  }
  if (address === 0xff0f) {
    // IF
    return (this.intFlags & 0xff) | 0xe0;
  }
  if (address >= 0xff40 && address <= 0xff4b) {
    // ppu
    return this.ppu.read(address) & 0xff;
  }
  if (address >= 0xff80 && address <= 0xfffe) {
    return this.hram[address - 0xff80] & 0xff;
  }
  if (address === 0xffff) {
    // IE
    return (this.intEnableFlags & 0xff) | 0xe0;
  }
  // console.log(`busRead: unsupport address ${address}(${address.toString(16)})`);
  return 0xff;
}

/**
 * @param address u16
 * @param value u8
 * @returns void
 */
export function busWrite(this: GameBoy, address: number, value: number): void {
  value = value & 0xff;

  if (!address) {
    this.paused = true;
  }

  if (address <= 0x7fff) {
    return;
  }
  if (address >= 0x8000 && address <= 0x9fff) {
    this.vram[address - 0x8000] = value;
    return;
  }
  if (address <= 0xbfff) {
    // 卡带ROM和RAM区域
    this.cartridge.write(address, value);
    return;
  }
  if (address <= 0xdfff) {
    // work ram
    this.wram[address - 0xc000] = value;
    return;
  }
  if (address <= 0xfdff) {
    // echo ram
    return;
  }
  if (address >= 0xfe00 && address <= 0xfe9f) {
    // Object Attribute Memory
    this.oam[address - 0xfe00] = value;
    return;
  }
  if (address <= 0xfeff) {
    // Reserved - Unusable
    return;
  }
  if (address === 0xff00) {
    // joypad
    this.joypad.write(value);
    return;
  }
  if (address >= 0xff01 && address <= 0xff02) {
    // 串口
    this.serial.write(address, value);
    return;
  }
  if (address >= 0xff04 && address <= 0xff07) {
    // 定时器
    this.timer.write(address, value);
    return;
  }
  if (address === 0xff0f) {
    // IF
    this.intFlags = value & 0x1f;
    return;
  }
  if (address >= 0xff40 && address <= 0xff4b) {
    // ppu
    this.ppu.write(address, value);
    return;
  }
  if (address >= 0xff80 && address <= 0xfffe) {
    this.hram[address - 0xff80] = value;
    return;
  }
  if (address === 0xffff) {
    // IE
    this.intEnableFlags = value & 0x1f;
    return;
  }
  // console.log(`busWrite: unsupport address ${address}(${address.toString(16)})`);
}

/**
 * @param address u16
 * @returns u16
 */
export function busRead16(this: GameBoy, address: number): number {
  const low = this.busRead(address);
  const high = this.busRead(address + 1);
  return (high << 8) | low;
}

/**
 * @param address u16
 * @param value u16
 * @returns void
 */
export function busWrite16(
  this: GameBoy,
  address: number,
  value: number
): void {
  this.busWrite(address + 1, (value >>> 8) & 0xff);
  this.busWrite(address, value & 0xff);
}
