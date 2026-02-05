# GameBoy CPU 实现指南

本文档详细介绍了GameBoy CPU (LR35902) 的实现原理和关键概念,用于指导GBJS项目中的CPU开发。

## 目录

- [概述](#概述)
- [CPU架构](#cpu架构)
- [寄存器](#寄存器)
- [标志位](#标志位)
- [指令集](#指令集)
- [总线系统](#总线系统)
- [时钟和时序](#时钟和时序)
- [实现要点](#实现要点)

---

## 概述

GameBoy使用的是定制的Sharp LR35902处理器,这是一个基于Zilog Z80架构的8位CPU。LR35902与Z80相比简化了许多功能,去除了部分指令和特性。

### 与Z80的主要区别

- 移除了IN/OUT指令(使用LD指令访问I/O端口)
- 移除了索引寄存器IX/IY
- 移除了交换指令EXX、EX DE,HL等
- 移除了所有DD/FD/ED前缀指令
- 移除了部分条件跳转指令(基于符号、奇偶校验的标志)
- 新增了专用的LDH和LDI/LDD指令
- 操作速度约为4MHz Z80(CGB双速模式为8MHz)

### 技术规格

- **架构**: 8位数据总线,16位地址总线
- **时钟频率**: 4.194304 MHz (单速模式)
- **地址空间**: 64KB (0x0000-0xFFFF)
- **指令集**: 256个基础操作码 + 256个CB前缀操作码

---

## CPU架构

### 执行流程

CPU采用经典的取指-执行循环:

```
┌─────────────────────────────────────────┐
│         Fetch Stage (取指)              │
│  1. Read opcode from memory at PC       │
│  2. Increment PC                        │
└─────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────┐
│       Execute Stage (执行)              │
│  1. Decode opcode                       │
│  2. Perform operation                   │
│  3. Update flags if needed              │
│  4. Update system state                 │
└─────────────────────────────────────────┘
```

### 流水线

LR35902使用简单的两级流水线:
- 下一条指令的取指可以与当前指令的执行并行进行
- 跳转指令会导致流水线停顿,增加额外开销

### 时序单位

- **时钟周期 (Clock Cycles)**: 基本时间单位,1/4194304秒
- **机器周期 (Machine Cycles)**: 4个时钟周期,CPU更新间隔
- **指令时序**: 所有指令耗时为机器周期的整数倍

---

## 寄存器

### 8位寄存器

LR35902有8个8位通用寄存器:

| 寄存器 | 名称 | 用途 |
|--------|------|------|
| A | Accumulator | 累加器,算术运算的主要操作数 |
| F | Flags | 标志寄存器,存储运算状态 |
| B | - | 通用寄存器 |
| C | - | 通用寄存器 |
| D | - | 通用寄存器 |
| E | - | 通用寄存器 |
| H | High | 16位地址的高8位 |
| L | Low | 16位地址的低8位 |

### 16位寄存器对

8位寄存器可以配对组成4个16位寄存器:

| 寄存器对 | 高字节 | 低字节 | 用途 |
|----------|--------|--------|------|
| AF | A | F | 累加器+标志 |
| BC | B | C | 通用寄存器 |
| DE | D | E | 通用寄存器 |
| HL | H | L | 主地址寄存器 |

### 专用16位寄存器

| 寄存器 | 名称 | 用途 |
|--------|------|------|
| PC | Program Counter | 程序计数器,存储下一条指令地址 |
| SP | Stack Pointer | 栈指针,指向栈顶地址 |

### 寄存器初始值 (DMG)

启动时各寄存器的默认值:

```typescript
cpu.af = 0x01B0;
cpu.bc = 0x0013;
cpu.de = 0x00D8;
cpu.hl = 0x014D;
cpu.sp = 0xFFFE;
cpu.pc = 0x0100;
```

---

## 标志位

F寄存器只有高4位有效,低4位始终为0:

```
Bit 7   6   5   4   3   2   1   0
    Z   N   H   0   0   0   0   0
```

### 标志位定义

| 位 | 名称 | 全称 | 设置条件 |
|----|------|------|----------|
| 7 | Z | Zero Flag | 运算结果为0时置1 |
| 6 | N | Subtract Flag | 减法操作时置1,加法时置0 |
| 5 | H | Half-Carry Flag | 低4位向高4位进位/借位时置1 |
| 4 | C | Carry Flag | 第8位进位/借位时置1 |

### 标志位操作

```typescript
// 读取标志位
bool zero()     { return (f & 0x80) !== 0; }
bool subtract() { return (f & 0x40) !== 0; }
bool half()     { return (f & 0x20) !== 0; }
bool carry()    { return (f & 0x10) !== 0; }

// 设置标志位
void setZero()     { f |= 0x80; }
void resetZero()   { f &= 0x7F; }
void setSubtract() { f |= 0x40; }
void resetSubtract(){ f &= 0xBF; }
void setHalf()     { f |= 0x20; }
void resetHalf()   { f &= 0xDF; }
void setCarry()    { f |= 0x10; }
void resetCarry()  { f &= 0xEF; }
```

### 各指令对标志位的影响

不同类型的指令对标志位的影响不同:

- **加载指令**: 通常不影响标志位(除LD HL,SP+r8外)
- **算术指令**: 影响Z、N、H、C标志
- **逻辑指令**: 影响Z、N、H,清除C标志
- **旋转/移位指令**: 影响所有标志位
- **跳转指令**: 不影响标志位

---

## 指令集

### 指令格式

LR35902指令集包含:
- **256个基础操作码** (0x00-0xFF)
- **256个CB前缀操作码** (0xCB 0x00-0xCB 0xFF)

### 指令分类

#### 1. 加载/存储指令 (LD)

在寄存器、内存和立即数之间传输数据:

```typescript
// 8位寄存器到寄存器
LD B, C    // B = C
LD A, B    // A = B

// 内存到寄存器
LD A, (BC)     // A = memory[BC]
LD A, (HL+)    // A = memory[HL]; HL++

// 寄存器到内存
LD (BC), A     // memory[BC] = A
LD (HL+), A    // memory[HL] = A; HL++

// 立即数
LD B, d8       // B = immediate_8bit
LD HL, d16     // HL = immediate_16bit

// 高位内存
LDH A, (a8)    // A = memory[0xFF00 + a8]
LDH (a8), A    // memory[0xFF00 + a8] = A
```

#### 2. 算术指令 (ADD, ADC, SUB, SBC)

对累加器进行算术运算:

```typescript
ADD A, B    // A = A + B
ADC A, B    // A = A + B + C
SUB B       // A = A - B
SBC B       // A = A - B - C

// 标志位设置规则
// Z: 结果为0时置1
// N: 减法操作置1
// H: 低4位进位/借位时置1
// C: 第8位进位/借位时置1
```

#### 3. 逻辑指令 (AND, OR, XOR, CP)

位运算和比较:

```typescript
AND B       // A = A & B
OR B        // A = A | B
XOR B       // A = A ^ B
CP B        // 比较A和B,设置标志位但不改变A

// 逻辑指令标志位
// Z: 结果为0时置1
// N: 总是置0
// H: AND操作置1,其他置0
// C: 总是置0
```

#### 4. 递增/递减指令 (INC, DEC)

```typescript
INC B       // B++
DEC B       // B--

// 标志位
// Z: 结果为0时置1
// N: INC置0, DEC置1
// H: 半进位时置1
// C: 不受影响
```

#### 5. 旋转/移位指令 (RLCA, RRCA, RLA, RRA, RLC, RRC, RL, RR, SLA, SRA, SRL)

```typescript
// 8位旋转(仅影响A,无CB前缀)
RLCA    // A向左循环移位,最高位进入C和最低位
RRCA    // A向右循环移位
RLA     // A通过C向左循环移位
RRA     // A通过C向右循环移位

// CB前缀旋转(适用于所有寄存器)
RLC B   // B向左循环移位
RRC (HL) // memory[HL]向右循环移位

// 移位指令
SLA B   // B向左移位,最低位补0
SRA B   // B向右算术移位,最高位保持不变
SRL B   // B向右逻辑移位,最高位补0
```

#### 6. 位操作指令 (BIT, SET, RES)

CB前缀指令,操作特定位:

```typescript
BIT 0, B    // 测试B的第0位
SET 2, B    // 设置B的第2位为1
RES 3, (HL) // 重置memory[HL]的第3位为0
```

#### 7. 跳转指令 (JP, JR)

```typescript
// 无条件跳转
JP a16      // PC = address_16bit
JP HL       // PC = HL
JR r8       // PC = PC + signed_offset

// 条件跳转
JP Z, a16   // if(Z) PC = address
JR NZ, r8   // if(!Z) PC = PC + offset

// 跳转条件
// NZ - Not Zero (Z==0)
// Z  - Zero (Z==1)
// NC - No Carry (C==0)
// C  - Carry (C==1)
```

#### 8. 调用/返回指令 (CALL, RET, RST)

```typescript
CALL a16    // push PC; PC = address
RET         // PC = pop()
RST 00H     // push PC; PC = 0x0000

// 条件调用/返回
CALL NZ, a16
RET Z
```

#### 9. 栈操作指令 (PUSH, POP)

```typescript
PUSH BC     // SP -= 2; memory[SP] = BC
POP AF      // AF = memory[SP]; SP += 2
```

#### 10. 控制指令

```typescript
NOP         // 空操作,1个机器周期
STOP        // 停止CPU和LCD(需要特定操作码)
HALT        // 暂停CPU直到中断发生
DI          // 禁用中断
EI          // 启用中断

// 特殊指令
DAA         // 十进制调整累加器
CPL         // A = ~A (取反)
SCF         // C = 1
CCF         // C = ~C
```

### 指令时序

#### 时序规则

1. **基础取指**: 1个机器周期 (4个时钟周期)
2. **总线访问**: 每次额外的读写增加1个机器周期
3. **跳转指令**: 实际跳转时增加1个机器周期(流水线刷新)
4. **条件跳转**: 未跳转时节省1个机器周期

#### 时序示例

```typescript
// NOP - 1个机器周期
LD B, C - 1个机器周期
LD A, (BC) - 2个机器周期 (取指 + 读内存)
LD BC, d16 - 3个机器周期 (取指 + 读2字节立即数)
JP a16 - 4个机器周期 (取指 + 读2字节 + 跳转)
JP NZ, a16 - 跳转时4周期,不跳转时3周期
```

### CB前缀指令

CB前缀指令用于位操作和高级旋转/移位:

- **格式**: 0xCB + 操作码
- **时序**: 通常2个机器周期
- **特点**: 可以操作任意8位寄存器或(HL)指向的内存

#### CB指令表摘要

| 操作码 | 指令 | 说明 |
|--------|------|------|
| CB 00-07 | RLC r | r向左循环移位 |
| CB 08-0F | RRC r | r向右循环移位 |
| CB 10-17 | RL r | r通过C向左循环 |
| CB 18-1F | RR r | r通过C向右循环 |
| CB 20-27 | SLA r | r向左移位 |
| CB 28-2F | SRA r | r向右算术移位 |
| CB 30-37 | SWAP r | 交换r的高低4位 |
| CB 38-3F | SRL r | r向右逻辑移位 |
| CB 40-7F | BIT b, r | 测试r的第b位 |
| CB 80-BF | RES b, r | 重置r的第b位 |
| CB C0-FF | SET b, r | 设置r的第b位 |

---

## 总线系统

### 内存映射

```
0x0000 - 0x7FFF  : Cartridge ROM (32KB,可扩展)
0x8000 - 0x9FFF  : VRAM (8KB)
0xA000 - 0xBFFF  : Cartridge RAM (8KB,可扩展)
0xC000 - 0xDFFF  : WRAM (8KB 工作内存)
0xE000 - 0xFDFF  : Echo RAM (WRAM镜像,不推荐使用)
0xFE00 - 0xFE9F  : OAM (对象属性内存,160字节)
0xFEA0 - 0xFEFF  : 未使用区域
0xFF00 - 0xFF7F  : I/O寄存器
0xFF80 - 0xFFFE  : HRAM (127字节高位内存)
0xFFFF           : 中断使能寄存器
```

### 总线读写

#### 读取规则

```typescript
function busRead(address: u16): u8 {
  if (address <= 0x7FFF) return cartridge.romRead(address);
  if (address <= 0x9FFF) return vram[address - 0x8000];
  if (address <= 0xBFFF) return cartridge.ramRead(address);
  if (address <= 0xDFFF) return wram[address - 0xC000];
  if (address <= 0xFDFF) return wram[address - 0xE000]; // Echo
  if (address <= 0xFE9F) return oam[address - 0xFE00];
  if (address <= 0xFEFF) return 0xFF; // Unusable
  if (address <= 0xFF7F) return ioRegisters[address - 0xFF00];
  if (address <= 0xFFFE) return hram[address - 0xFF80];
  if (address === 0xFFFF) return interruptEnable;
  return 0xFF; // 未映射区域返回0xFF
}
```

#### 写入规则

```typescript
function busWrite(address: u16, data: u8): void {
  if (address <= 0x7FFF) { cartridge.romWrite(address, data); return; }
  if (address <= 0x9FFF) { vram[address - 0x8000] = data; return; }
  if (address <= 0xBFFF) { cartridge.ramWrite(address, data); return; }
  if (address <= 0xDFFF) { wram[address - 0xC000] = data; return; }
  if (address <= 0xFDFF) { wram[address - 0xE000] = data; return; } // Echo
  if (address <= 0xFE9F) { oam[address - 0xFE00] = data; return; }
  if (address <= 0xFEFF) return; // Unusable
  if (address <= 0xFF7F) { ioRegisters[address - 0xFF00] = data; return; }
  if (address <= 0xFFFE) { hram[address - 0xFF80] = data; return; }
  if (address === 0xFFFF) { interruptEnable = data; return; }
}
```

### 特殊内存区域

#### OAM (Object Attribute Memory)

- **地址**: 0xFE00-0xFE9F
- **用途**: 存储精灵对象属性
- **访问限制**: 仅在VBlank/HBlank期间可安全访问
- **DMA传输**: 使用0xFF46寄存器快速传输数据

#### I/O寄存器

关键寄存器包括:
- **0xFF00**: Joypad输入
- **0xFF04-0xFF07**: Timer控制
- **0xFF40-0xFF4B**: PPU控制
- **0xFF10-0xFF3F**: APU音频
- **0xFF0F**: 中断标志
- **0xFFFF**: 中断使能

---

## 时钟和时序

### 时钟频率

- **单速模式**: 4.194304 MHz
- **双速模式**: 8.388608 MHz (仅CGB)

### 时钟计算

```typescript
// 计算帧时钟周期
function calculateFrameCycles(deltaTime: number): u64 {
  const CPU_CLOCK = 4194304; // Hz
  return Math.floor(CPU_CLOCK * deltaTime * speedScale);
}
```

### CPU步进

```typescript
function stepCPU(): void {
  if (halted) {
    tick(1); // HALT状态消耗1个机器周期
    return;
  }

  const opcode = busRead(pc);
  pc++;

  const instruction = instructionMap[opcode];
  if (!instruction) {
    // 未实现指令会导致真机死机
    halt();
    return;
  }

  instruction.execute();
}

function tick(mcycles: u32): void {
  clockCycles += mcycles * 4;
  // 更新其他组件(PPU, Timer等)
  updateComponents(mcycles);
}
```

### 时序同步

所有组件通过机器周期同步:

```typescript
function updateComponents(mcycles: u32): void {
  timer.tick(mcycles);
  ppu.tick(mcycles); // PPU内部转换为dot cycles
  apu.tick(mcycles);
  serial.tick(mcycles);
}
```

---

## 实现要点

### 1. 指令映射表

使用函数指针数组实现高效指令分发:

```typescript
type InstructionFunc = (emu: Emulator) => void;

const instructionMap: InstructionFunc[] = new Array(256);
const cbInstructionMap: InstructionFunc[] = new Array(256);

// 初始化指令表
instructionMap[0x00] = nop;
instructionMap[0x01] = ld_bc_d16;
instructionMap[0x02] =_ld_mbc_a;
// ...
```

### 2. 立即数读取

```typescript
function readD8(emu: Emulator): u8 {
  const data = busRead(emu.cpu.pc);
  emu.cpu.pc++;
  return data;
}

function readD16(emu: Emulator): u16 {
  const lo = busRead(emu.cpu.pc);
  const hi = busRead(emu.cpu.pc + 1);
  emu.cpu.pc += 2;
  return (hi << 8) | lo;
}
```

### 3. 标志位计算

#### 半进位检测

```typescript
function checkHalfCarry(a: u8, b: u8): boolean {
  return ((a & 0x0F) + (b & 0x0F)) > 0x0F;
}

function checkHalfBorrow(a: u8, b: u8): boolean {
  return (a & 0x0F) < (b & 0x0F);
}
```

#### 进位检测

```typescript
function checkCarry(a: u8, b: u8): boolean {
  return a + b > 0xFF;
}

function checkBorrow(a: u8, b: u8): boolean {
  return a < b;
}
```

### 4. DAA指令实现

十进制调整指令最复杂,需要根据标志位调整:

```typescript
function daa(emu: Emulator): void {
  let a = emu.cpu.a;
  let adjust = 0;

  if (emu.cpu.subtract()) {
    if (emu.cpu.carry()) adjust |= 0x60;
    if (emu.cpu.half()) adjust |= 0x06;
  } else {
    if (emu.cpu.carry() || a > 0x99) adjust |= 0x60;
    if (emu.cpu.half() || (a & 0x0F) > 0x09) adjust |= 0x06;
  }

  a += emu.cpu.subtract() ? -adjust : adjust;

  emu.cpu.a = a & 0xFF;
  emu.cpu.setZero(a === 0);
  emu.cpu.resetHalf();
  emu.cpu.setCarry(adjust >= 0x60);
}
```

### 5. HALT模式处理

```typescript
function handleHalt(emu: Emulator): void {
  if (!emu.cpu.halted) return;

  // 检查是否有挂起的中断
  if (hasPendingInterrupt(emu)) {
    // 如果HALT时IME=0但有中断,跳过下一条指令
    if (!emu.interruptMasterEnable) {
      emu.cpu.pc++;
    }
    emu.cpu.halted = false;
  }

  tick(1); // HALT消耗1个机器周期
}
```

### 6. 中断处理

```typescript
function handleInterrupts(emu: Emulator): void {
  if (!emu.interruptMasterEnable) return;

  const iflag = busRead(0xFF0F);
  const ienable = busRead(0xFFFF);
  const pending = iflag & ienable;

  if (pending === 0) return;

  // 处理最高优先级中断
  for (let i = 0; i < 5; i++) {
    if (pending & (1 << i)) {
      emu.interruptMasterEnable = false;
      emu.cpu.halted = false;

      // 清除中断标志
      busWrite(0xFF0F, iflag & ~(1 << i));

      // 调用中断处理程序
      push16(emu, emu.cpu.pc);
      emu.cpu.pc = 0x0040 + (i * 0x08);
      tick(5); // 中断处理开销

      break;
    }
  }
}
```

### 7. 栈操作

```typescript
function push16(emu: Emulator, value: u16): void {
  emu.cpu.sp -= 2;
  busWrite(emu.cpu.sp, value & 0xFF);
  busWrite(emu.cpu.sp + 1, (value >> 8) & 0xFF);
}

function pop16(emu: Emulator): u16 {
  const lo = busRead(emu.cpu.sp);
  const hi = busRead(emu.cpu.sp + 1);
  emu.cpu.sp += 2;
  return (hi << 8) | lo;
}
```

---

## 调试和测试

### 测试ROM

推荐使用以下测试ROM验证CPU实现:

- **cpu_instrs**: CPU指令测试套件
- **instr_test**: 指令时序测试
- **test_addr_mode**: 地址模式测试

### 常见问题

1. **标志位错误**: 特别注意H和N标志
2. **时序不准确**: 确保每个指令的机器周期正确
3. **DAA实现错误**: 这是最容易出错的指令
4. **中断处理**: 注意HALT+中断的边界情况
5. **未定义操作码**: 实际硬件会死机,模拟器应妥善处理

### 调试技巧

```typescript
// 指令追踪
function traceInstruction(emu: Emulator): void {
  const pc = emu.cpu.pc - 1;
  const opcode = busRead(pc);
  console.log(
    `0x${pc.toString(16).padStart(4, '0')}: ` +
    `0x${opcode.toString(16).padStart(2, '0')} ` +
    `AF:${emu.cpu.af.toString(16)} ` +
    `BC:${emu.cpu.bc.toString(16)} ` +
    `Z:${emu.cpu.zero() ? '1' : '0'}`
  );
}
```

---

## 参考资料

- [Pan Docs - CPU Registers and Flags](https://gbdev.io/pandocs/CPU_Registers_and_Flags.html)
- [Pan Docs - CPU Instruction Set](https://gbdev.io/pandocs/CPU_Instruction_Set.html)
- [Pan Docs - CPU Comparison with Z80](https://gbdev.io/pandocs/CPU_Comparison_with_Z80.html)
- [GameBoy Opcodes (Pastraiser)](https://www.pastraiser.com/cpu/gameboy/gameboy_opcodes.html)
- [从零开始实现GameBoy模拟器 #2 CPU、时钟和总线](https://zhuanlan.zhihu.com/p/678804759)
- [从零开始实现GameBoy模拟器 #3 加载，比较和跳转指令](https://zhuanlan.zhihu.com/p/679665423)
- [The Cycle-Accurate Game Boy Docs](https://github.com/rockytriton/LLD_gbemu/raw/main/docs/The%20Cycle-Accurate%20Game%20Boy%20Docs.pdf)
