import { CartridgeType, CartridgeInfo } from "../types";

// 内存控制器基类
abstract class MemoryBankController {
  protected rom: Uint8Array;
  protected ram: Uint8Array;
  protected romBank: number = 1;
  protected ramBank: number = 0;
  protected ramEnabled: boolean = false;

  constructor(rom: Uint8Array, ramSize: number) {
    this.rom = rom;
    this.ram = new Uint8Array(ramSize);
  }

  abstract readByte(address: number): number;
  abstract writeByte(address: number, value: number): void;

  public getRamData(): Uint8Array {
    return this.ram;
  }

  public loadRamData(data: Uint8Array): void {
    this.ram.set(data);
  }
}

// ROM-only 实现
class ROMOnly extends MemoryBankController {
  readByte(address: number): number {
    if (address < 0x8000) {
      return this.rom[address];
    }
    return 0xff;
  }

  writeByte(address: number, value: number): void {
    // ROM-only 不支持写入
  }
}

// MBC1 实现
class MBC1 extends MemoryBankController {
  private bankingMode: number = 0;

  readByte(address: number): number {
    if (address < 0x4000) {
      // ROM Bank 00
      return this.rom[address];
    } else if (address < 0x8000) {
      // ROM Bank 01-7F
      const bankAddress = address - 0x4000 + this.romBank * 0x4000;
      return this.rom[bankAddress];
    } else if (address >= 0xa000 && address < 0xc000) {
      // RAM Bank 00-03
      if (!this.ramEnabled) return 0xff;
      const ramAddress = address - 0xa000 + this.ramBank * 0x2000;
      return this.ram[ramAddress];
    }
    return 0xff;
  }

  writeByte(address: number, value: number): void {
    if (address < 0x2000) {
      // RAM Enable
      this.ramEnabled = (value & 0x0f) === 0x0a;
    } else if (address < 0x4000) {
      // ROM Bank Number
      let bank = value & 0x1f;
      if (bank === 0) bank = 1;
      this.romBank = (this.romBank & 0x60) | bank;
    } else if (address < 0x6000) {
      // RAM Bank Number or Upper Bits of ROM Bank Number
      if (this.bankingMode === 0) {
        this.romBank = (this.romBank & 0x1f) | ((value & 0x03) << 5);
      } else {
        this.ramBank = value & 0x03;
      }
    } else if (address < 0x8000) {
      // Banking Mode Select
      this.bankingMode = value & 0x01;
    } else if (address >= 0xa000 && address < 0xc000) {
      // RAM Bank 00-03
      if (!this.ramEnabled) return;
      const ramAddress = address - 0xa000 + this.ramBank * 0x2000;
      this.ram[ramAddress] = value;
    }
  }
}

export class Cartridge {
  private rom: Uint8Array = new Uint8Array(0);
  private mbc: MemoryBankController | null = null;
  private cartridgeInfo: CartridgeInfo | null = null;

  public loadROM(data: Uint8Array): void {
    this.rom = data;
    this.cartridgeInfo = this.parseCartridgeInfo();
    this.initializeMBC();
  }

  public readByte(address: number): number {
    return this.mbc?.readByte(address) ?? 0xff;
  }

  public writeByte(address: number, value: number): void {
    this.mbc?.writeByte(address, value);
  }

  private parseCartridgeInfo(): CartridgeInfo {
    const title = Array.from(this.rom.slice(0x134, 0x143))
      .map((c) => String.fromCharCode(c))
      .join("")
      .replace(/\0+$/, "");

    const type = this.rom[0x147] as CartridgeType;
    const romSize = 32768 << this.rom[0x148];

    // RAM大小查找表
    const ramSizes = [0, 2048, 8192, 32768, 131072];
    const ramSize = ramSizes[this.rom[0x149]] || 0;

    return {
      title,
      type,
      romSize,
      ramSize,
      version: this.rom[0x14c],
    };
  }

  private initializeMBC(): void {
    if (!this.cartridgeInfo) return;

    switch (this.cartridgeInfo.type) {
      case CartridgeType.ROM_ONLY:
        this.mbc = new ROMOnly(this.rom, 0);
        break;
      case CartridgeType.MBC1:
      case CartridgeType.MBC1_RAM:
      case CartridgeType.MBC1_RAM_BATTERY:
        this.mbc = new MBC1(this.rom, this.cartridgeInfo.ramSize);
        break;
      // TODO: 实现其他MBC类型
      default:
        throw new Error(
          `Unsupported cartridge type: ${this.cartridgeInfo.type}`
        );
    }
  }

  public getCartridgeInfo(): CartridgeInfo | null {
    return this.cartridgeInfo;
  }

  // 用于带电池的卡带存档
  public getSaveData(): Uint8Array | null {
    if (!this.cartridgeInfo) return null;

    const hasBattery = [
      CartridgeType.MBC1_RAM_BATTERY,
      CartridgeType.MBC2_BATTERY,
      CartridgeType.ROM_RAM_BATTERY,
      CartridgeType.MBC3_TIMER_BATTERY,
      CartridgeType.MBC3_TIMER_RAM_BATTERY,
      CartridgeType.MBC3_RAM_BATTERY,
      CartridgeType.MBC5_RAM_BATTERY,
      CartridgeType.MBC5_RUMBLE_RAM_BATTERY,
    ].includes(this.cartridgeInfo.type);

    if (hasBattery && this.mbc) {
      return this.mbc.getRamData();
    }

    return null;
  }

  public loadSaveData(data: Uint8Array): void {
    this.mbc?.loadRamData(data);
  }
}
