# GameBoy PPU 实现指南

本文档详细介绍了GameBoy PPU (Picture Processing Unit) 的实现原理和关键概念，用于指导GBJS项目中的PPU开发。

## 目录

- [概述](#概述)
- [PPU绘制单元架构](#ppu绘制单元架构)
- [Fetcher详解](#fetcher详解)
- [LCD驱动](#lcd驱动)
- [背景和窗口绘制](#背景和窗口绘制)
- [精灵绘制](#精灵绘制)
- [寄存器说明](#寄存器说明)
- [实现要点](#实现要点)

---

## 概述

GameBoy PPU负责处理所有图形渲染操作，包括背景、窗口和精灵的绘制。PPU工作在三种模式下：

- **OAM Scan模式**: 扫描OAM中的精灵对象
- **Drawing模式**: 实际绘制像素
- **HBlank/VBlank模式**: 水平/垂直回扫

PPU的核心组件包括Fetcher（获取器）、LCD驱动和两个FIFO队列。

---

## PPU绘制单元架构

### 主要组件

```
┌─────────────────────────────────────────────────────┐
│                      Fetcher                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐         │
│  │  图块    │  │  数据    │  │  像素    │         │
│  │  地址    │→ │  读取    │→ │  解码    │         │
│  └──────────┘  └──────────┘  └──────────┘         │
└─────────────────────────────────────────────────────┘
         │                              │
         ↓                              ↓
┌────────────────────┐        ┌────────────────────┐
│  背景/窗口FIFO队列  │        │   精灵FIFO队列     │
└────────────────────┘        └────────────────────┘
         │                              │
         └──────────────┬───────────────┘
                        ↓
                ┌───────────────┐
                │   LCD驱动     │
                │  (像素混合)   │
                └───────────────┘
                        ↓
                   最终像素输出
```

### 组件职责

1. **Fetcher**: 从VRAM中获取图块数据并解码为像素
2. **FIFO队列**: 暂存待绘制的像素
3. **LCD驱动**: 从队列中取出像素，混合后显示到屏幕

---

## Fetcher详解

Fetcher是PPU的核心硬件单元，负责逐像素生成图像。当PPU处于Drawing模式时，Fetcher从左到右处理屏幕每一行的像素。

### Fetcher的五个步骤

每个步骤消耗2个时钟周期，Fetcher每2个时钟周期更新一次。

#### 步骤1: 确定图块数据地址 (Tile)

- 根据LY、SCX、SCY、WX、WY等寄存器确定下一个像素所在的图块
- 计算图块在地图中的索引位置
- 确定图块数据的起始地址
- 检查与当前扫描行重叠的精灵对象（最多3个）
- 计算图块第一个像素的屏幕X坐标

**关键变量**:
- `FETCH_X`: 下一个需要获取的像素X坐标，每次增加8
- `tile_x_begin`: 当前图块第一个像素的屏幕X坐标（可能为负）

#### 步骤2: 读取第一个字节 (Data0)

- 从确定的地址读取图块数据的第一字节
- 该字节包含8个像素的低位颜色信息

#### 步骤3: 读取第二个字节 (Data1)

- 读取图块数据的第二字节
- 该字节包含8个像素的高位颜色信息

#### 步骤4: 等待 (Idle)

- 简单等待2个时钟周期
- 不执行任何操作

#### 步骤5: 压入队列 (Push)

- 将两个字节解码为8个像素
- 判断像素是否在屏幕范围内
- 处理窗口覆盖情况
- 将像素压入对应的FIFO队列
- **只有当队列中像素数<8时才能成功压入**

### Fetcher状态机

```typescript
enum PPUFetchState {
  Tile,   // 确定图块地址
  Data0,  // 读取第一字节
  Data1,  // 读取第二字节
  Idle,   // 等待
  Push    // 压入队列
}
```

---

## LCD驱动

LCD驱动负责从FIFO队列中取出像素并显示到屏幕上。

### 工作原理

- 每个时钟周期处理一个像素
- 从左到右依次绘制
- **只有当背景/窗口队列中像素数≥8时才开始工作**
- 同时从两个队列各取一个像素进行混合
- 绘制完160个像素后发送结束指令

### 像素混合规则

GameBoy PPU使用简单的像素选择而非真正的混合：

```typescript
// 判断是否绘制精灵像素
function shouldDrawObject(objPixel, bgColor): boolean {
  // 1. 精灵像素颜色索引不为0（非透明）
  // 2. 且（精灵优先级高于背景 或 背景颜色为0）
  return objPixel.color !== 0 &&
         (!objPixel.bgPriority || bgColor === 0);
}
```

---

## 背景和窗口绘制

### 背景绘制

#### 寄存器

- **0xFF42 (SCY)**: 背景滚动Y坐标
- **0xFF43 (SCX)**: 背景滚动X坐标
- **0xFF47 (BGP)**: 背景调色板

#### 地图系统

- 使用32×32的图块索引矩阵
- 每个索引指向一个8×8的图块
- 实际屏幕大小为160×144像素

#### 图块数据地址计算

```typescript
// 计算地图上的坐标
map_y = (ly + scy) % 256;
map_x = (fetch_x + scx) % 256;

// 计算图块索引地址
tile_map_addr = bg_map_area + (map_x / 8) + (map_y / 8) * 32;

// 读取图块索引
tile_index = bus_read(tile_map_addr);

// 计算图块数据地址
if (bgw_data_area === 0x8800) {
  // 有符号索引模式 (-128 ~ 127)
  tile_index += 128;
}
tile_data_addr = bgw_data_area + tile_index * 16 + (map_y % 8) * 2;
```

### 窗口绘制

#### 寄存器

- **0xFF4A (WY)**: 窗口Y坐标
- **0xFF4B (WX)**: 窗口X坐标（实际值+7）

#### 窗口特性

- 窗口可以覆盖背景像素
- 使用独立的window_line计数器
- 只有当 `wx <= 166 && wy < 144` 时才可见

#### 窗口切换逻辑

```typescript
// 在Fetcher的Push步骤中检测
if (!fetchWindow && isPixelWindow(push_x, ly)) {
  fetchWindow = true;
  fetch_x = push_x;  // 重置为窗口起始位置
  break;  // 停止处理当前背景图块
}
```

### 调色板

#### BGP寄存器 (0xFF47)

每2位控制一个色值的实际颜色：

```
位7-6: 色值3的颜色
位5-4: 色值2的颜色
位3-2: 色值1的颜色
位1-0: 色值0的颜色
```

颜色映射：
- `00`: 白色（最亮）
- `01`: 浅灰色
- `10`: 深灰色
- `11`: 黑色（最暗）

```typescript
function applyPalette(color: u8, palette: u8): u8 {
  switch (color) {
    case 0: return palette & 0x03;
    case 1: return (palette >> 2) & 0x03;
    case 2: return (palette >> 4) & 0x03;
    case 3: return (palette >> 6) & 0x03;
  }
}
```

---

## 精灵绘制

精灵是可移动的图形对象，最多支持40个精灵对象，每行最多绘制10个。

### OAM (Object Attribute Memory)

- **地址范围**: 0xFE00-0xFE9F (160字节)
- **精灵数量**: 最多40个
- **每个精灵占用**: 4字节

#### OAM条目结构

```typescript
interface OAMEntry {
  y: u8;        // Y坐标 + 16
  x: u8;        // X坐标 + 8
  tile: u8;     // 图块索引
  flags: u8;    // 属性标志位
}
```

#### 属性标志位 (字节3)

```
位7: 优先级 (0=精灵在上, 1=背景在上)
位6: 垂直翻转
位5: 水平翻转
位4: 调色板选择 (0=OBP0, 1=OBP1)
位3-0: 未使用
```

### DMA传输

DMA (Direct Memory Access) 用于高效传输数据到OAM。

#### 特性

- 每次传输160字节（整个OAM）
- 固定耗时160个机器周期
- 每个机器周期传输1字节
- 传输期间CPU只能访问HRAM

#### 0xFF46 (DMA寄存器)

```typescript
// 启动DMA传输
function startDMA(sourceHigh: u8) {
  dma_active = true;
  dma_offset = 0;
  dma_start_delay = 1;  // 延迟1个周期开始
  dma_source = sourceHigh * 0x100;
}

// 每个周期执行
function tickDMA() {
  if (!dma_active) return;
  if (dma_start_delay > 0) {
    dma_start_delay--;
    return;
  }
  oam[dma_offset] = bus_read(dma_source + dma_offset);
  dma_offset++;
  dma_active = dma_offset < 160;
}
```

### 精灵绘制流程

#### 1. OAM扫描阶段

在OAM Scan模式中扫描所有40个精灵：

```typescript
sprites = [];  // 最多10个
spriteHeight = obj_enable() ? 16 : 8;

for (i = 0; i < 40; i++) {
  if (sprites.length >= 10) break;

  entry = oam[i];
  // 检查精灵是否与当前扫描行相交
  if (entry.y <= ly + 16 && entry.y + spriteHeight > ly + 16) {
    // 按X坐标排序插入
    insertSortedByX(sprites, entry);
  }
}
```

#### 2. 确定重叠精灵

在Fetcher的Tile步骤中：

```typescript
fetchedSprites = [];
numFetchedSprites = 0;

for (sprite of sprites) {
  spriteX = sprite.x - 8;
  // 检查精灵是否与当前图块重叠
  if (overlaps(spriteX, tile_x_begin, 8)) {
    fetchedSprites[numFetchedSprites] = sprite;
    numFetchedSprites++;
  }
  if (numFetchedSprites >= 3) break;
}
```

#### 3. 读取精灵图块数据

```typescript
function fetchSpriteData(spriteIndex: u8, dataIndex: u8) {
  sprite = fetchedSprites[spriteIndex];
  spriteHeight = obj_height();

  // 计算在精灵图块中的Y坐标
  ty = (ly + 16) - sprite.y;
  if (sprite.y_flip()) {
    ty = (spriteHeight - 1) - ty;
  }

  // 获取图块索引
  tile = sprite.tile;
  if (spriteHeight === 16) {
    tile &= 0xFE;  // 忽略最低位
  }

  // 读取数据
  addr = 0x8000 + tile * 16 + ty * 2 + dataIndex;
  sprite_fetched_data[spriteIndex * 2 + dataIndex] = bus_read(addr);
}
```

#### 4. 压入精灵像素

```typescript
for (x = push_begin; x < push_end; x++) {
  pixel = { color: 0, palette: 0, bg_priority: true };

  for (s = 0; s < numFetchedSprites; s++) {
    sprite = fetchedSprites[s];
    spriteX = sprite.x - 8;
    offset = x - spriteX;

    if (offset < 0 || offset > 7) continue;

    // 读取像素颜色
    b1 = sprite_fetched_data[s * 2];
    b2 = sprite_fetched_data[s * 2 + 1];
    bit = sprite.x_flip() ? offset : (7 - offset);

    color = ((b2 >> bit) & 1) << 1 | ((b1 >> bit) & 1);

    if (color !== 0) {
      pixel.color = color;
      pixel.palette = sprite.dmg_palette() ? obp1 : obp0;
      pixel.bg_priority = sprite.priority();
      break;
    }
  }

  obj_queue.push_back(pixel);
}
```

### 精灵调色板

#### 0xFF48 (OBP0) 和 0xFF49 (OBP1)

与BGP类似，但色值00始终为透明：

```typescript
function applyObjectPalette(color: u8, palette: u8): u8 {
  if (color === 0) return 0;  // 透明
  switch (color) {
    case 1: return (palette >> 2) & 0x03;
    case 2: return (palette >> 4) & 0x03;
    case 3: return (palette >> 6) & 0x03;
  }
}
```

---

## 寄存器说明

### LCDC (0xFF40) - LCD控制寄存器

```
位7: LCD使能 (0=关闭, 1=开启)
位6: 窗口图块地图选择 (0=0x9800, 1=0x9C00)
位5: 窗口显示使能
位4: 背景/窗口图块数据区域 (0=0x8800, 1=0x8000)
位3: 背景图块地图选择 (0=0x9800, 1=0x9C00)
位2: 精灵尺寸 (0=8x8, 1=8x16)
位1: 精灵显示使能
位0: 背景/窗口显示使能
```

### STAT (0xFF41) - 状态寄存器

```
位6-7: 模式标志 (0=OAM Scan, 1=VBlank, 2=HBlank, 3=Drawing)
位5: OAM中断使能
位4: HBlank中断使能
位3: VBlank中断使能
位2: LYC=LY中断使能
位0-1: 未使用
```

### 其他关键寄存器

- **0xFF42 (SCY)**: 背景滚动Y
- **0xFF43 (SCX)**: 背景滚动X
- **0xFF44 (LY)**: 当前扫描线
- **0xFF45 (LYC)**: LY比较值
- **0xFF46 (DMA)**: DMA传输
- **0xFF47 (BGP)**: 背景调色板
- **0xFF48 (OBP0)**: 精灵调色板0
- **0xFF49 (OBP1)**: 精灵调色板1
- **0xFF4A (WY)**: 窗口Y坐标
- **0xFF4B (WX)**: 窗口X坐标

---

## 实现要点

### 1. 双缓冲渲染

```typescript
pixels: u8[PPU_XRES * PPU_YRES * 4 * 2];  // 两个缓冲区
current_back_buffer: u8;

// 完成一帧后交换
function onVBlank() {
  current_back_buffer = (current_back_buffer + 1) % 2;
}
```

### 2. 时序管理

```typescript
// 每行的时钟周期
const PPU_CYCLES_PER_LINE = 456;

// OAM Scan: 80周期
// Drawing: 172-289周期（可变）
// HBlank: 剩余周期
```

### 3. FIFO队列管理

```typescript
bgw_queue: FIFO<BGWPixel>;
obj_queue: FIFO<ObjectPixel>;

// Fetcher压入像素
if (bgw_queue.size() < 8) {
  // 解码并压入8个像素
  pushPixels();
}

// LCD驱动取出像素
if (bgw_queue.size() >= 8) {
  bg_pixel = bgw_queue.pop_front();
  obj_pixel = obj_queue.pop_front();
  drawPixel(bg_pixel, obj_pixel);
}
```

### 4. 窗口行计数器

```typescript
window_line: u8 = 0;

// LY增加时检查
function increaseLY() {
  if (window_visible() && ly >= wy && ly < wy + 144) {
    window_line++;
  }
  ly++;
}

// VBlank时重置
function onVBlank() {
  ly = 0;
  window_line = 0;
}
```

### 5. 边界处理

```typescript
// 丢弃屏幕左侧的像素
if (tile_x_begin + i < 0) {
  continue;  // 不压入队列
}

// 超出屏幕右侧的像素仍压入队列
// LCD驱动绘制160个像素后自动停止
```

---

## 测试建议

### 测试ROM

- **dmg-acid2.gb**: PPU功能全面测试
- 单卡带游戏: 《马力欧医生》、《俄罗斯方块》、《网球》

### 验证要点

1. 背景滚动正确性
2. 窗口显示和切换
3. 精灵位置和优先级
4. 精灵翻转功能
5. 调色板颜色映射
6. DMA传输功能
7. 时序准确性

---

## 参考资料

- [Pan Docs - Graphics](https://gbdev.io/pandocs/Graphics.html)
- [从零开始实现GameBoy模拟器 #7 PPU](https://zhuanlan.zhihu.com/p/681800791)
- [从零开始实现GameBoy模拟器 #8 绘制背景和窗口](https://zhuanlan.zhihu.com/p/682148896)
- [从零开始实现GameBoy模拟器 #9 绘制精灵](https://zhuanlan.zhihu.com/p/682604015)
