import { CARTRIDGE_TYPE, CartridgeInfo } from "../types";

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

    let checkSum = 0;
    for (let i = 0x0134; i <= 0x014c; i++) {
      checkSum = checkSum - this.rom[i] - 1;
    }

    if ((checkSum & 0xFF) !== this.cartridgeInfo?.checksum) {
      throw new Error("Invalid cartridge checksum");
    }

    this.initializeMBC();
  }

  private parseCartridgeInfo(): CartridgeInfo {
    const title = Array.from(this.rom.slice(0x134, 0x143))
      .map((c) => String.fromCharCode(c))
      .join("")
      .replace(/\0+$/, "");

    // RAM大小查找表
    const ramSizes = [0, null, 8, 32, 128, 64];
    const ramSize = ramSizes[this.rom[0x149]] || 0;

    return {
      title: title,
      entry: this.rom.slice(0x0100, 0x0104),
      logo: this.rom.slice(0x0104, 0x0134),
      newLicenseCode: this.rom.slice(0x0143, 0x0146),
      sgbFlag: this.rom[0x0146],
      type: this.rom[0x0147] as CARTRIDGE_TYPE,
      romSize: 32 << this.rom[0x0148],
      ramSize: ramSize,
      destinationCode: this.rom[0x014a],
      licenseCode: this.rom[0x014a],
      version: this.rom[0x014c],
      checksum: this.rom[0x014d],
      globalCheckSum: this.rom.slice(0x014e, 0x014f),
    };
  }

  private initializeMBC(): void {
    if (!this.cartridgeInfo) return;

    switch (this.cartridgeInfo.type) {
      case CARTRIDGE_TYPE.ROM_ONLY:
        this.mbc = new ROMOnly(this.rom, 0);
        break;
      case CARTRIDGE_TYPE.MBC1:
      case CARTRIDGE_TYPE.MBC1_RAM:
      case CARTRIDGE_TYPE.MBC1_RAM_BATTERY:
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
      CARTRIDGE_TYPE.MBC1_RAM_BATTERY,
      CARTRIDGE_TYPE.MBC2_BATTERY,
      CARTRIDGE_TYPE.ROM_RAM_BATTERY,
      CARTRIDGE_TYPE.MBC3_TIMER_BATTERY,
      CARTRIDGE_TYPE.MBC3_TIMER_RAM_BATTERY,
      CARTRIDGE_TYPE.MBC3_RAM_BATTERY,
      CARTRIDGE_TYPE.MBC5_RAM_BATTERY,
      CARTRIDGE_TYPE.MBC5_RUMBLE_RAM_BATTERY,
    ].includes(this.cartridgeInfo.type);

    if (hasBattery && this.mbc) {
      return this.mbc.getRamData();
    }

    return null;
  }

  public loadSaveData(data: Uint8Array): void {
    this.mbc?.loadRamData(data);
  }

  public read(address: number) {
    if (address <= 0x7fff) {
      return this.rom[address];
    }

    return 0xff;
  }

  public write(address: number, value: number) {
    // throw new Error("Not implemented");
  }
}
