# GameBoy 卡带 (Cartridge) 实现指南

本文档详细介绍了 GameBoy 卡带系统的实现原理和关键概念，用于指导 GBJS 项目中的卡带模块开发。

## 目录

- [概述](#概述)
- [卡带头部](#卡带头部)
- [内存映射](#内存映射)
- [内存控制器 (MBC)](#内存控制器-mbc)
- [MBC1 详细实现](#mbc1-详细实现)
- [MBC3 详细实现](#mbc3-详细实现)
- [MBC5 详细实现](#mbc5-详细实现)
- [其他 MBC 类型](#其他-mbc-类型)
- [存档数据](#存档数据)
- [实现要点](#实现要点)

---

## 概述

GameBoy 卡带系统负责加载和管理 ROM 数据，以及提供外部 RAM 的访问控制。卡带的核心组件是**内存控制器 (Memory Bank Controller, MBC)**，它负责 ROM 和 RAM 的 Bank 切换。

### 卡带类型

GameBoy 支持多种卡带类型：

| 类型 | 说明 | 特性 |
|------|------|------|
| ROM Only | 仅 ROM | 无 Bank 切换，可选 RAM |
| MBC1 | 内存控制器 1 | ROM/RAM Bank 切换，最常用 |
| MBC2 | 内存控制器 2 | 内置 RAM，512×4 bit |
| MBC3 | 内存控制器 3 | 支持 RTC (实时时钟) |
| MBC5 | 内存控制器 5 | 支持 4MB+ ROM，Rumble |
| MMM01 | 多功能控制器 | 特殊 Banking 模式 |
| HuC1/HuC3 | Hudson 控制器 | 红外通信支持 |

### 内存容量

```typescript
// ROM 容量
const ROM_SIZES = [
  32 * 1024,    // 0x00: 32KB (2 banks)
  64 * 1024,    // 0x01: 64KB (4 banks)
  128 * 1024,   // 0x02: 128KB (8 banks)
  256 * 1024,   // 0x03: 256KB (16 banks)
  512 * 1024,   // 0x04: 512KB (32 banks)
  1024 * 1024,  // 0x05: 1MB (64 banks)
  2048 * 1024,  // 0x06: 2MB (128 banks)
  4096 * 1024,  // 0x07: 4MB (256 banks)
  8192 * 1024,  // 0x08: 8MB (512 banks)
];

// RAM 容量
const RAM_SIZES = [
  0,             // 0x00: 无 RAM
  0,             // 0x01: 保留
  8 * 1024,      // 0x02: 8KB (1 bank)
  32 * 1024,     // 0x03: 32KB (4 banks)
  128 * 1024,    // 0x04: 128KB (16 banks)
  64 * 1024,     // 0x05: 64KB (8 banks)
];
```

---

## 卡带头部

卡带头部位于 ROM 的 0x0100-0x014F 区域，包含卡带的元数据。

### 头部结构

```
0x0100-0x0103: 入口点 (4 字节)
0x0104-0x0133: Nintendo Logo (48 字节)
0x0134-0x0143: 游戏标题 (16 字节)
0x0143-0x0145: 新许可证代码 (2 字节)
0x0144: SGB 标志
0x0147: 卡带类型
0x0148: ROM 大小
0x0149: RAM 大小
0x014A: 目标代码
0x014B: 许可证代码 (旧)
0x014C: 版本号
0x014D: 头部校验和
0x014E-0x014F: 全局校验和 (2 字节)
```

### 关键字段解析

#### 卡带类型 (0x0147)

```typescript
enum CARTRIDGE_TYPE {
  ROM_ONLY = 0x00,
  MBC1 = 0x01,
  MBC1_RAM = 0x02,
  MBC1_RAM_BATTERY = 0x03,
  MBC2 = 0x05,
  MBC2_BATTERY = 0x06,
  ROM_RAM = 0x08,
  ROM_RAM_BATTERY = 0x09,
  MMM01 = 0x0B,
  MMM01_RAM = 0x0C,
  MMM01_RAM_BATTERY = 0x0D,
  MBC3_TIMER_BATTERY = 0x0F,
  MBC3_TIMER_RAM_BATTERY = 0x10,
  MBC3 = 0x11,
  MBC3_RAM = 0x12,
  MBC3_RAM_BATTERY = 0x13,
  MBC5 = 0x19,
  MBC5_RAM = 0x1A,
  MBC5_RAM_BATTERY = 0x1B,
  MBC5_RUMBLE = 0x1C,
  MBC5_RUMBLE_RAM = 0x1D,
  MBC5_RUMBLE_RAM_BATTERY = 0x1E,
}
```

#### ROM 大小 (0x0148)

```typescript
// 计算公式: ROM_SIZE = 32KB * (2 ^ value)
romSize = 32 * 1024 * Math.pow(2, header[0x0148]);
```

#### RAM 大小 (0x0149)

```typescript
const RAM_SIZE_TABLE = [0, null, 8*1024, 32*1024, 128*1024, 64*1024];
ramSize = RAM_SIZE_TABLE[header[0x0149]] || 0;
```

### Nintendo Logo 验证

Nintendo Logo 是固定值，必须匹配才能通过启动检查：

```typescript
const NINTENDO_LOGO = [
  0xCE, 0xED, 0x66, 0x66, 0xCC, 0x0D, 0x00, 0x0B,
  0x03, 0x73, 0x00, 0x83, 0x00, 0x0C, 0x00, 0x0D,
  0x00, 0x08, 0x11, 0x1F, 0x88, 0x89, 0x00, 0x0E,
  0xDC, 0xCC, 0x6E, 0xE6, 0xDD, 0xDD, 0xD9, 0x99,
  0xBB, 0xBB, 0x67, 0x63, 0x6E, 0x0E, 0xEC, 0xCC,
  0xDD, 0xDC, 0x99, 0x9F, 0xBB, 0xB9, 0x33, 0x3E
];

function validateLogo(rom: Uint8Array): boolean {
  for (let i = 0; i < 48; i++) {
    if (rom[0x0104 + i] !== NINTENDO_LOGO[i]) {
      return false;
    }
  }
  return true;
}
```

### 头部校验和

校验和计算范围 0x0134-0x014C：

```typescript
function calculateChecksum(rom: Uint8Array): u8 {
  let checksum = 0;
  for (let i = 0x0134; i <= 0x014C; i++) {
    checksum = checksum - rom[i] - 1;
  }
  return checksum & 0xFF;
}

function validateChecksum(rom: Uint8Array): boolean {
  return calculateChecksum(rom) === rom[0x014D];
}
```

---

## 内存映射

卡带区域在 GameBoy 内存映射中的位置：

```
0x0000 - 0x3FFF: ROM Bank 00 (固定，16KB)
0x4000 - 0x7FFF: ROM Bank 01-7F (可切换，16KB)
0xA000 - 0xBFFF: RAM Bank 00-0F (可切换，8KB)
```

### ROM Bank 00

- **地址**: 0x0000-0x3FFF
- **大小**: 16KB
- **特性**: 始终指向 ROM 的第一个 Bank
- **用途**: 存放启动代码和核心数据

### ROM Bank 可切换区

- **地址**: 0x4000-0x7FFF
- **大小**: 16KB
- **特性**: 可切换到任意 ROM Bank (Bank 1-最大)
- **用途**: 存放游戏代码和数据

### RAM Bank 区

- **地址**: 0xA000-0xBFFF
- **大小**: 8KB
- **特性**: 可切换到不同 RAM Bank
- **注意**: 需要先使能 RAM 才能访问

---

## 内存控制器 (MBC)

### MBC 寄存器映射

所有 MBC 都遵循相同的寄存器映射：

```
0x0000 - 0x1FFF: RAM 使能 (写入 0x0A 使能)
0x2000 - 0x3FFF: ROM Bank 编号
0x4000 - 0x5FFF: RAM Bank 编号 / ROM Bank 高位
0x6000 - 0x7FFF: Banking 模式选择
0xA000 - 0xBFFF: RAM 数据区
```

### 基类结构

```typescript
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
```

---

## MBC1 详细实现

MBC1 是最常用的内存控制器，支持：
- 最多 2MB ROM (125 Banks)
- 最多 32KB RAM (4 Banks)
- 两种 Banking 模式

### Banking 模式

MBC1 有两种模式：

#### 模式 0 (ROM Banking 模式)

- ROM Bank: 由 0x2000-0x3FFF 和 0x4000-0x5FFF 共同决定
- RAM Bank: 固定为 Bank 0

#### 模式 1 (RAM Banking 模式)

- ROM Bank: 仅由 0x2000-0x3FFF 决定 (5位)
- RAM Bank: 由 0x4000-0x5FFF 决定 (2位)

### 寄存器操作

#### RAM 使能 (0x0000-0x1FFF)

```typescript
function writeRAMEnable(value: u8): void {
  // 只有写入 0x0A 时才使能 RAM
  this.ramEnabled = (value & 0x0F) === 0x0A;
}
```

#### ROM Bank 编号 (0x2000-0x3FFF)

```typescript
function writeROMBank(value: u8): void {
  // 低 5 位
  let bank = value & 0x1F;

  // Bank 0 无效，自动切换到 Bank 1
  if (bank === 0) bank = 1;

  // 在模式 0 中，保留高位
  if (this.bankingMode === 0) {
    this.romBank = (this.romBank & 0x60) | bank;
  } else {
    this.romBank = bank;
  }
}
```

#### RAM Bank 编号 / ROM Bank 高位 (0x4000-0x5FFF)

```typescript
function writeUpperBank(value: u8): void {
  const upperBits = value & 0x03;

  if (this.bankingMode === 0) {
    // 模式 0: 设置 ROM Bank 的第 6-7 位
    this.romBank = (this.romBank & 0x1F) | (upperBits << 5);
  } else {
    // 模式 1: 设置 RAM Bank
    this.ramBank = upperBits;
  }
}
```

#### Banking 模式选择 (0x6000-0x7FFF)

```typescript
function writeBankingMode(value: u8): void {
  this.bankingMode = value & 0x01;

  // 切换模式时需要重置 Bank
  if (this.bankingMode === 0) {
    // ROM Banking 模式: RAM 固定到 Bank 0
    this.ramBank = 0;
  } else {
    // RAM Banking 模式: ROM Bank 高位清零
    this.romBank &= 0x1F;
  }
}
```

### 读取实现

```typescript
function readByte(address: u16): u8 {
  if (address < 0x4000) {
    // ROM Bank 00 - 固定
    return this.rom[address];
  } else if (address < 0x8000) {
    // ROM Bank 可切换区
    const bankOffset = (this.romBank - 1) * 0x4000;
    const effectiveAddress = bankOffset + (address - 0x4000);
    return this.rom[effectiveAddress];
  } else if (address >= 0xA000 && address < 0xC000) {
    // RAM Bank 区
    if (!this.ramEnabled) return 0xFF;
    const bankOffset = this.ramBank * 0x2000;
    const effectiveAddress = bankOffset + (address - 0xA000);
    return this.ram[effectiveAddress];
  }
  return 0xFF;
}
```

### 写入实现

```typescript
function writeByte(address: u16, value: u8): void {
  if (address < 0x2000) {
    this.writeRAMEnable(value);
  } else if (address < 0x4000) {
    this.writeROMBank(value);
  } else if (address < 0x6000) {
    this.writeUpperBank(value);
  } else if (address < 0x8000) {
    this.writeBankingMode(value);
  } else if (address >= 0xA000 && address < 0xC000) {
    if (!this.ramEnabled) return;
    const bankOffset = this.ramBank * 0x2000;
    const effectiveAddress = bankOffset + (address - 0xA000);
    this.ram[effectiveAddress] = value;
  }
}
```

---

## MBC3 详细实现

MBC3 是 MBC1 的改进版本，特点：
- 支持 RTC (实时时钟)
- RAM Bank 选择与 ROM Bank 完全独立
- 支持 8MB ROM 和 128KB RAM

### 寄存器操作

#### RAM 使能 (0x0000-0x1FFF)

与 MBC1 相同：

```typescript
function writeRAMEnable(value: u8): void {
  this.ramEnabled = (value & 0x0F) === 0x0A;
}
```

#### ROM Bank 编号 (0x2000-0x3FFF)

MBC3 使用 7 位 ROM Bank 编号 (0-127)：

```typescript
function writeROMBank(value: u8): void {
  let bank = value & 0x7F;
  if (bank === 0) bank = 1;
  this.romBank = bank;
}
```

#### RAM Bank 编号 / RTC 寄存器选择 (0x4000-0x5FFF)

```typescript
function writeRAMBank(value: u8): void {
  const bank = value & 0x0F;

  if (bank <= 0x03) {
    // RAM Bank 00-03
    this.rtcEnabled = false;
    this.ramBank = bank;
  } else if (bank >= 0x08 && bank <= 0x0C) {
    // RTC 寄存器 08-0C
    this.rtcEnabled = true;
    this.rtcRegister = bank - 0x08;
  }
}
```

### RTC 实现

RTC 寄存器映射：

```typescript
// RTC 寄存器
const RTC_REGISTERS = {
  0x00: 'seconds',    // 0x08: 秒 (0-59)
  0x01: 'minutes',    // 0x09: 分 (0-59)
  0x02: 'hours',      // 0x0A: 时 (0-23)
  0x03: 'days',       // 0x0B: 日低 8 位 (0-255)
  0x04: 'days_high',  // 0x0C: 日高位 + 控制位
};

// 读取 RTC 寄存器
function readRTC(): u8 {
  if (!this.rtcEnabled) return 0xFF;

  this.updateRTC(); // 根据需要更新时间

  switch (this.rtcRegister) {
    case 0: return this.rtc.seconds;
    case 1: return this.rtc.minutes;
    case 2: return this.rtc.hours;
    case 3: return this.rtc.days & 0xFF;
    case 4: return (this.rtc.days >> 8) | (this.rtc.halt << 6);
  }
  return 0xFF;
}

// 写入 RTC 寄存器
function writeRTC(value: u8): void {
  if (!this.rtcEnabled) return;

  switch (this.rtcRegister) {
    case 0: this.rtc.seconds = value & 0x3F; break;
    case 1: this.rtc.minutes = value & 0x3F; break;
    case 2: this.rtc.hours = value & 0x1F; break;
    case 3: this.rtc.days = (this.rtc.days & 0x100) | value; break;
    case 4:
      this.rtc.days = (this.rtc.days & 0xFF) | ((value & 0x01) << 8);
      this.rtc.halt = (value >> 6) & 0x01;
      break;
  }
}
```

---

## MBC5 详细实现

MBC5 是最先进的 MBC，特点：
- 支持 8MB ROM (512 Banks)
- 支持 128KB RAM (16 Banks)
- 支持 Rumble (震动) 功能
- 无 Banking 模式切换

### 寄存器操作

#### RAM 使能 (0x0000-0x1FFF)

```typescript
function writeRAMEnable(value: u8): void {
  this.ramEnabled = (value & 0x0F) === 0x0A;
}
```

#### ROM Bank 编号 (0x2000-0x2FFF)

MBC5 使用 9 位 ROM Bank 编号：

```typescript
function writeROMBankLow(value: u8): void {
  // Bank 编号的低 8 位
  this.romBank = (this.romBank & 0x100) | value;
}

function writeROMBankHigh(value: u8): void {
  // Bank 编号的最高位 (0x3000-0x3FFF)
  const highBit = (value & 0x01) << 8;
  this.romBank = highBit | (this.romBank & 0xFF);
}
```

#### RAM Bank 编号 / Rumble (0x4000-0x5FFF)

```typescript
function writeRAMBank(value: u8): void {
  this.rumbleEnabled = (value & 0x08) !== 0;
  this.ramBank = value & 0x0F;
}
```

---

## 其他 MBC 类型

### MBC2

特点：
- 内置 512×4 bit RAM (不是 8×512)
- 使用 0x0000-0x1FFF 的最高位作为 RAM 使能
- ROM Bank 编号只有 4 位 (16 Banks)

```typescript
function writeRAMEnable(value: u8): void {
  this.ramEnabled = (value & 0x0F) === 0x0A;
}

function writeROMBank(value: u8): void {
  let bank = value & 0x0F;
  if (bank === 0) bank = 1;
  this.romBank = bank;
}

function readRAM(address: u16): u8 {
  if (!this.ramEnabled) return 0xFF;
  // MBC2 RAM: 0xA000-0xA1FF，每字节只使用低 4 位
  const offset = address - 0xA000;
  return this.ram[offset] & 0x0F;
}
```

### ROM Only

最简单的卡带类型，无 Bank 切换：

```typescript
class ROMOnly extends MemoryBankController {
  readByte(address: number): number {
    if (address < 0x8000) {
      return this.rom[address];
    }
    return 0xFF;
  }

  writeByte(address: number, value: number): void {
    // ROM-only 不支持写入 (除 RAM 区外)
    if (address >= 0xA000 && address < 0xC000 && this.ramEnabled) {
      this.ram[address - 0xA000] = value;
    }
  }
}
```

### ROM + RAM / ROM + RAM + Battery

类似 ROM Only，但带外部 RAM：

```typescript
class ROMWithRAM extends MemoryBankController {
  constructor(rom: Uint8Array, ramSize: number) {
    super(rom, ramSize || 8 * 1024);
  }

  readByte(address: number): number {
    if (address < 0x8000) {
      return this.rom[address];
    } else if (address >= 0xA000 && address < 0xC000) {
      if (this.ramEnabled) {
        return this.ram[address - 0xA000];
      }
      return 0xFF;
    }
    return 0xFF;
  }

  writeByte(address: number, value: number): void {
    if (address < 0x2000) {
      this.ramEnabled = (value & 0x0F) === 0x0A;
    } else if (address >= 0xA000 && address < 0xC000 && this.ramEnabled) {
      this.ram[address - 0xA000] = value;
    }
  }
}
```

---

## 存档数据

### 电池供电 RAM (Battery)

带 Battery 的卡带类型会在断电后保持 RAM 数据：

```typescript
function hasBattery(cartridgeType: CARTRIDGE_TYPE): boolean {
  const batteryTypes = [
    CARTRIDGE_TYPE.MBC1_RAM_BATTERY,
    CARTRIDGE_TYPE.MBC2_BATTERY,
    CARTRIDGE_TYPE.ROM_RAM_BATTERY,
    CARTRIDGE_TYPE.MBC3_TIMER_BATTERY,
    CARTRIDGE_TYPE.MBC3_TIMER_RAM_BATTERY,
    CARTRIDGE_TYPE.MBC3_RAM_BATTERY,
    CARTRIDGE_TYPE.MBC5_RAM_BATTERY,
    CARTRIDGE_TYPE.MBC5_RUMBLE_RAM_BATTERY,
  ];
  return batteryTypes.includes(cartridgeType);
}
```

### 保存存档数据

```typescript
function getSaveData(): Uint8Array | null {
  if (!this.cartridgeInfo || !hasBattery(this.cartridgeInfo.type)) {
    return null;
  }

  if (this.mbc) {
    const data = this.mbc.getRamData();

    // 对于带 RTC 的 MBC3，还需要保存 RTC 数据
    if (this.cartridgeInfo.type.includes('TIMER')) {
      const rtcData = this.mbc.getRTCData();
      const combined = new Uint8Array(data.length + rtcData.length);
      combined.set(data);
      combined.set(rtcData, data.length);
      return combined;
    }

    return data;
  }

  return null;
}
```

### 加载存档数据

```typescript
function loadSaveData(data: Uint8Array): void {
  if (!this.cartridgeInfo || !this.mbc) return;

  if (this.cartridgeInfo.type.includes('TIMER')) {
    // 分离 RAM 和 RTC 数据
    const ramSize = this.cartridgeInfo.ramSize;
    const ramData = data.slice(0, ramSize);
    const rtcData = data.slice(ramSize);

    this.mbc.loadRamData(ramData);
    this.mbc.loadRTCData(rtcData);
  } else {
    this.mbc.loadRamData(data);
  }
}
```

---

## 实现要点

### 1. Bank 边界检查

```typescript
function romBankAddress(bank: number, address: number): number {
  const maxBank = Math.floor(this.rom.length / 0x4000) - 1;
  const effectiveBank = Math.min(bank, maxBank);
  const bankOffset = (effectiveBank - 1) * 0x4000;
  return bankOffset + (address - 0x4000);
}

function ramBankAddress(bank: number, address: number): number {
  const maxBank = Math.floor(this.ram.length / 0x2000) - 1;
  const effectiveBank = Math.min(bank, maxBank);
  const bankOffset = effectiveBank * 0x2000;
  return bankOffset + (address - 0xA000);
}
```

### 2. ROM 加载和验证

```typescript
class Cartridge {
  private rom: Uint8Array = new Uint8Array(0);
  private mbc: MemoryBankController | null = null;
  private cartridgeInfo: CartridgeInfo | null = null;

  public loadROM(data: Uint8Array): void {
    // 验证最小 ROM 大小
    if (data.length < 0x8000) {
      throw new Error("Invalid ROM size (minimum 32KB)");
    }

    this.rom = data;
    this.cartridgeInfo = this.parseCartridgeInfo();

    // 验证 Nintendo Logo
    if (!this.validateLogo()) {
      console.warn("Nintendo logo validation failed");
    }

    // 验证校验和
    if (!this.validateChecksum()) {
      throw new Error("Invalid cartridge checksum");
    }

    // 初始化 MBC
    this.initializeMBC();
  }
}
```

### 3. 总线集成

```typescript
// 在总线中集成卡带
function busRead(address: u16): u8 {
  if (address <= 0x7FFF) {
    return cartridge.read(address);
  } else if (address >= 0xA000 && address <= 0xBFFF) {
    return cartridge.read(address);
  }
  // ... 其他内存区域
}

function busWrite(address: u16, value: u8): void {
  if (address <= 0x7FFF) {
    cartridge.write(address, value);
  } else if (address >= 0xA000 && address <= 0xBFFF) {
    cartridge.write(address, value);
  }
  // ... 其他内存区域
}
```

### 4. 多 MBC 工厂模式

```typescript
function initializeMBC(): void {
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
    case CARTRIDGE_TYPE.MBC2:
    case CARTRIDGE_TYPE.MBC2_BATTERY:
      this.mbc = new MBC2(this.rom, 512); // 512×4 bit
      break;
    case CARTRIDGE_TYPE.ROM_RAM:
    case CARTRIDGE_TYPE.ROM_RAM_BATTERY:
      this.mbc = new ROMWithRAM(this.rom, this.cartridgeInfo.ramSize);
      break;
    case CARTRIDGE_TYPE.MBC3:
    case CARTRIDGE_TYPE.MBC3_RAM:
    case CARTRIDGE_TYPE.MBC3_RAM_BATTERY:
    case CARTRIDGE_TYPE.MBC3_TIMER_BATTERY:
    case CARTRIDGE_TYPE.MBC3_TIMER_RAM_BATTERY:
      this.mbc = new MBC3(
        this.rom,
        this.cartridgeInfo.ramSize,
        this.cartridgeInfo.type.includes('TIMER')
      );
      break;
    case CARTRIDGE_TYPE.MBC5:
    case CARTRIDGE_TYPE.MBC5_RAM:
    case CARTRIDGE_TYPE.MBC5_RAM_BATTERY:
    case CARTRIDGE_TYPE.MBC5_RUMBLE:
    case CARTRIDGE_TYPE.MBC5_RUMBLE_RAM:
    case CARTRIDGE_TYPE.MBC5_RUMBLE_RAM_BATTERY:
      this.mbc = new MBC5(this.rom, this.cartridgeInfo.ramSize);
      break;
    default:
      throw new Error(`Unsupported cartridge type: ${this.cartridgeInfo.type}`);
  }
}
```

### 5. RTC 时间管理

```typescript
class MBC3RTC {
  private lastTime: number = Date.now();
  private rtcData = {
    seconds: 0,
    minutes: 0,
    hours: 0,
    days: 0,
    halt: 0,
  };

  public update(): void {
    if (this.rtcData.halt) return;

    const now = Date.now();
    const elapsed = now - this.lastTime;
    this.lastTime = now;

    // 更新时间 (简化实现)
    this.rtcData.seconds += Math.floor(elapsed / 1000);

    // 处理溢出
    if (this.rtcData.seconds >= 60) {
      this.rtcData.seconds -= 60;
      this.rtcData.minutes++;
    }
    if (this.rtcData.minutes >= 60) {
      this.rtcData.minutes -= 60;
      this.rtcData.hours++;
    }
    if (this.rtcData.hours >= 24) {
      this.rtcData.hours -= 24;
      this.rtcData.days++;
    }
  }
}
```

---

## 测试建议

### 测试 ROM

- **mem_timing**: 内存时序测试
- **mbc1**: MBC1 功能测试
- **mbc3**: MBC3 功能测试
- **rtc_test**: RTC 功能测试

### 测试游戏

- 《宝可梦》系列 (MBC3 + RTC + Battery)
- 《塞尔达传说》 (MBC1 + RAM + Battery)
- 《俄罗斯方块》 (ROM Only)

### 验证要点

1. **ROM Bank 切换**: 验证所有 Bank 可正确访问
2. **RAM 使能/禁用**: RAM 未使能时应返回 0xFF
3. **RAM 读写**: 验证 RAM Bank 切换和数据持久性
4. **Bank 边界**: 确保访问超出最大 Bank 时不会崩溃
5. **存档功能**: 验证 Battery RAM 的保存和加载
6. **RTC 功能**: 验证 MBC3 的 RTC 计时和寄存器访问

---

## 参考资料

- [Pan Docs - The Cartridge Header](https://gbdev.io/pandocs/The_Cartridge_Header.html)
- [Pan Docs - MBCs](https://gbdev.io/pandocs/MBCs.html)
- [Pan Docs - MBC1](https://gbdev.io/pandocs/MBC1.html)
- [Pan Docs - MBC2](https://gbdev.io/pandocs/MBC2.html)
- [Pan Docs - MBC3](https://gbdev.io/pandocs/MBC3.html)
- [Pan Docs - MBC5](https://gbdev.io/pandocs/MBC5.html)
- [从零开始实现GameBoy模拟器 #12 卡带系统](https://zhuanlan.zhihu.com/p/683224396)
- [从零开始实现GameBoy模拟器 #13 MBC实现](https://zhuanlan.zhihu.com/p/683946961)
