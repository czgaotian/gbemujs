// 内存控制器基类
export abstract class MemoryBankController {
  protected rom: Uint8Array;
  protected ram: Uint8Array;

  protected romBankNumber: number = 1;
  protected ramBankNumber: number = 0;
  protected bankingMode: number = 0;
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
  read(address: number): number {
    if (address < 0x4000) {
      // ROM 0 区
      // mode 0 固定为 ROM bank 0；mode 1 用高 2 位选择 0/32/64/96 bank。
      const bank = this.bankingMode === 1 ? this.romBankNumber << 5 : 0;
      return this.readROMBank(bank, address);
    } else if (address < 0x8000) {
      // ROM 1 区
      // mode 0 组合高 2 位和低 5 位，支持最多 128 个 ROM bank；
      // mode 1 仅使用低 5 位，把高 2 位留给低 ROM 区和外部 RAM。
      const bank =
        this.bankingMode === 0
          ? (this.ramBankNumber << 5) | this.romBankNumber
          : this.romBankNumber;
      return this.readROMBank(bank, address - 0x4000);
    } else if (address >= 0xa000 && address < 0xc000) {
      // 外部 RAM 在收到 0x0A 启用命令之前不可读写。
      if (!this.ramEnabled) return 0xff;
      const ramAddress = this.getRAMAddress(address);
      return ramAddress === null ? 0xff : this.ram[ramAddress];
    }
    return 0xff;
  }

  write(address: number, value: number): void {
    if (address < 0x2000) {
      // 启用/禁用 RAM
      // RAM Enable：仅低半字节为 0x0A 时启用。
      this.ramEnabled = (value & 0x0f) === 0x0a;
    } else if (address < 0x4000) {
      // 设置 ROM 分块序号
      // 低 5 位 ROM bank 选择器，0 会被重映射到 1。
      this.romBankNumber = value & 0x1f || 1;
    } else if (address < 0x6000) {
      // 设置 RAM 分块序号
      // 高 2 位 ROM bank / RAM bank 选择器，具体用途由 bankingMode 决定。
      this.ramBankNumber = value & 0x03;
    } else if (address < 0x8000) {
      // 设置工作模式
      // 只使用 bit 0 选择 ROM banking (0) 或 RAM banking (1) mode。
      this.bankingMode = value & 0x01;
    } else if (address >= 0xa000 && address < 0xc000) {
      if (!this.ramEnabled) return;
      const ramAddress = this.getRAMAddress(address);
      if (ramAddress !== null) this.ram[ramAddress] = value;
    }
  }

  private readROMBank(bank: number, offset: number): number {
    // 对 ROM 实际长度外的 bank 返回开放总线值，避免 Uint8Array 越界读为 undefined。
    return this.rom[bank * 0x4000 + offset] ?? 0xff;
  }

  private getRAMAddress(address: number): number | null {
    // 只有 mode 1 允许用高 2 位切换 8 KiB 的外部 RAM bank。
    const bank = this.bankingMode === 1 ? this.ramBankNumber : 0;
    const offset = bank * 0x2000 + address - 0xa000;
    return offset < this.ram.length ? offset : null;
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
      const bankAddress = address - 0x4000 + this.romBankNumber * 0x4000;
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
        this.romBankNumber = value & 0x0f || 1;
      }
      return;
    }

    if (address >= 0xa000 && address < 0xa200 && this.ramEnabled) {
      this.ram[address - 0xa000] = value & 0x0f;
    }
  }
}
