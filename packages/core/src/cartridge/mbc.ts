// 内存控制器基类
export abstract class MemoryBankController {
  protected rom: Uint8Array;
  protected ram: Uint8Array;
  protected romBank: number = 1;
  protected ramBank: number = 0;
  protected ramEnabled: boolean = false;

  constructor(rom: Uint8Array, ramSize: number) {
    this.rom = rom;
    this.ram = new Uint8Array(ramSize);
  }

  abstract read(address: number): number;
  abstract write(address: number, value: number): void;

  public getRamData(): Uint8Array {
    return this.ram;
  }

  public setRamData(data: Uint8Array): boolean {
    if (data.length !== this.ram.length) return false;
    this.ram.set(data);
    return true;
  }
}

// ROM-only 实现
export class ROMOnly extends MemoryBankController {
  read(address: number): number {
    if (address < 0x8000) {
      return this.rom[address];
    }
    return 0xff;
  }

  write(address: number, value: number): void {
    // ROM-only 不支持写入
  }
}

// MBC1 实现
export class MBC1 extends MemoryBankController {
  private bankingMode: number = 0;

  read(address: number): number {
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

  write(address: number, value: number): void {
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

// MBC2 实现
export class MBC2 extends MemoryBankController {
  constructor(rom: Uint8Array) {
    // MBC2 cartridges have fixed 512x4-bit internal RAM.
    super(rom, 512);
  }

  read(address: number): number {
    if (address < 0x4000) {
      return this.rom[address];
    }
    if (address < 0x8000) {
      const bankAddress = address - 0x4000 + this.romBank * 0x4000;
      return this.rom[bankAddress];
    }
    if (address >= 0xa000 && address < 0xa200) {
      if (!this.ramEnabled) return 0xff;
      return 0xf0 | this.ram[address - 0xa000];
    }
    return 0xff;
  }

  write(address: number, value: number): void {
    if (address < 0x4000) {
      if ((address & 0x0100) === 0) {
        this.ramEnabled = (value & 0x0f) === 0x0a;
      } else {
        this.romBank = value & 0x0f || 1;
      }
      return;
    }

    if (address >= 0xa000 && address < 0xa200 && this.ramEnabled) {
      this.ram[address - 0xa000] = value & 0x0f;
    }
  }
}
