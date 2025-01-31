#pragma once

#include <common.h>

static const int LINES_PER_FRAME = 154; // 每帧的扫描线数
static const int TICKS_PER_LINE = 456;  // 每条扫描线的时钟周期
static const int YRES = 144;            // 垂直分辨率
static const int XRES = 160;            // 水平分辨率

typedef enum
{
  FS_TILE,  // 获取图块状态
  FS_DATA0, // 获取第一部分数据状态
  FS_DATA1, // 获取第二部分数据状态
  FS_IDLE,  // 空闲状态
  FS_PUSH   // 推送数据状态
} fetch_state;

typedef struct _fifo_entry
{
  struct _fifo_entry *next; // 指向下一个条目的指针
  u32 value;                // 32 bit color value.
} fifo_entry;

typedef struct
{
  fifo_entry *head; // 队列头指针
  fifo_entry *tail; // 队列尾指针
  u32 size;         // 队列当前大小
} fifo;

typedef struct
{
  fetch_state cur_fetch_state; // 当前获取状态
  fifo pixel_fifo;             // 像素FIFO队列
  u8 line_x;                   // 当前扫描线X坐标
  u8 pushed_x;                 // 已推送的X坐标, 表示在当前扫描行中已经有多少个像素被推送到视频缓冲区
  u8 fetch_x;                  // 获取操作的X坐标
  u8 bgw_fetch_data[3];        // 背景/窗口获取数据, 0: tile 编号, 1: tile 数据的低字节, 2: tile 数据的高字节
  u8 fetch_entry_data[6];      // OAM(对象属性内存)数据
  u8 map_y;                    // 图块地图Y坐标, pixel
  u8 map_x;                    // 图块地图X坐标, pixel
  u8 tile_y;                   // 图块内Y坐标, pixel
  u8 fifo_x;                   // FIFO的X位置
} pixel_fifo_context;

/*
  标志位域
  Bit7   BG and Window over OBJ (0=No, 1=BG and Window colors 1-3 over the OBJ)
  Bit6   Y flip          (0=Normal, 1=Vertically mirrored)
  Bit5   X flip          (0=Normal, 1=Horizontally mirrored)
  Bit4   Palette number  **Non CGB Mode Only** (0=OBP0, 1=OBP1)
  Bit3   Tile VRAM-Bank  **CGB Mode Only**     (0=Bank 0, 1=Bank 1)
  Bit2-0 Palette number  **CGB Mode Only**     (OBP0-7)
 */

typedef struct
{
  u8 y;    // Y 坐标
  u8 x;    // X 坐标
  u8 tile; // 图块编号

  // 标志位域
  u8 f_cgb_pn : 3;        // CGB 模式调色板号 (0-7)
  u8 f_cgb_vram_bank : 1; // CGB 模式 VRAM 库编号
  u8 f_pn : 1;            // 调色板号
  u8 f_x_flip : 1;        // X 轴翻转
  u8 f_y_flip : 1;        // Y 轴翻转
  u8 f_bgp : 1;           // 背景优先级
} oam_entry;

/*
  vram

  0x0000-0x17FF: tile 数据
  - 每个图块 8x8 像素
  - 每个图块占用 16 字节
  - 每个像素用 2 位表示
  - 可以存储 384 个 tile

  0x1800-0x1BFF: 背景地图 1
  - 32x32 的 tile 索引表
  - 每个索引 1 字节

  0x1C00-0x1FFF: 背景地图 2
  - 同样是 32x32 的 tile 索引表
*/
typedef struct
{
  oam_entry oam_ram[40];  // 40个精灵的OAM内存
  u8 vram[0x2000];        // 8KB的视频RAM
  pixel_fifo_context pfc; // 像素FIFO上下文
  u32 current_frame;      // 当前帧计数
  u32 line_ticks;         // 当前扫描线的时钟计数
  u32 *video_buffer;      // 视频缓冲区指针
} ppu_context;

void ppu_init();
void ppu_tick();

void ppu_oam_write(u16 address, u8 value);
u8 ppu_oam_read(u16 address);

void ppu_vram_write(u16 address, u8 value);
u8 ppu_vram_read(u16 address);

ppu_context *ppu_get_context();