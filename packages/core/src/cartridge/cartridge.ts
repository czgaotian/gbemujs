import { CARTRIDGE_TYPE, CartridgeInfo } from '../types';
import { MemoryBankController, MBC1, MBC2, ROMOnly } from './mbc';

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

    if ((checkSum & 0xff) !== this.cartridgeInfo?.checksum) {
      throw new Error('Invalid cartridge checksum');
    }

    this.initializeMBC();
  }

  private parseCartridgeInfo(): CartridgeInfo {
    const title = Array.from(this.rom.slice(0x134, 0x143))
      .map((c) => String.fromCharCode(c))
      .join('')
      .replace(/\0+$/, '');

    // RAM size header values are expressed in KiB; MBC RAM uses byte lengths.
    const ramSizes = [0, 2, 8, 32, 128, 64].map((size) => size * 1024);
    const ramSize = ramSizes[this.rom[0x149]] ?? 0;

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
        this.mbc = new ROMOnly(this.rom, 0); // ROM-only cartridges don't need an MBC
        break;
      case CARTRIDGE_TYPE.MBC1:
      case CARTRIDGE_TYPE.MBC1_RAM:
      case CARTRIDGE_TYPE.MBC1_RAM_BATTERY:
        this.mbc = new MBC1(this.rom, this.cartridgeInfo.ramSize);
        break;
      case CARTRIDGE_TYPE.MBC2:
      case CARTRIDGE_TYPE.MBC2_BATTERY:
        this.mbc = new MBC2(this.rom);
        break;

      // TODO: 实现其他MBC类型
      default:
        throw new Error(
          `Unsupported cartridge type: ${this.cartridgeInfo.type}`,
        );
    }
  }

  public getCartridgeInfo(): CartridgeInfo | null {
    return this.cartridgeInfo;
  }

  public read(address: number) {
    if (this.mbc) {
      return this.mbc.read(address);
    } else {
      throw new Error('MBC not initialized');
    }
  }

  public write(address: number, value: number) {
    if (this.mbc) {
      this.mbc.write(address, value);
    } else {
      throw new Error('MBC not initialized');
    }
  }

  public loadRAMData(data: Uint8Array): boolean {
    if (!this.isCartridgeBattery || !this.mbc) return false;
    return this.mbc.setRamData(data);
  }

  public getRAMData(): Uint8Array | null {
    if (!this.isCartridgeBattery || !this.mbc) return null;
    return this.mbc.getRamData().slice();
  }

  get isCartridgeBattery(): boolean {
    if (!this.cartridgeInfo) return false;

    const cartridgeTypeHasBattery = [
      CARTRIDGE_TYPE.MBC1_RAM_BATTERY,
      CARTRIDGE_TYPE.MBC2_BATTERY,
      CARTRIDGE_TYPE.ROM_RAM_BATTERY,
      CARTRIDGE_TYPE.MBC3_TIMER_BATTERY,
      CARTRIDGE_TYPE.MBC3_TIMER_RAM_BATTERY,
      CARTRIDGE_TYPE.MBC3_RAM_BATTERY,
      CARTRIDGE_TYPE.MBC5_RAM_BATTERY,
      CARTRIDGE_TYPE.MBC5_RUMBLE_RAM_BATTERY,
    ];

    return cartridgeTypeHasBattery.includes(this.cartridgeInfo.type);
  }
}
