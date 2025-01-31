#pragma once

#include <common.h>

typedef struct
{
  // registers...
  u8 lcdc;           // LCD 控制寄存器
  u8 lcds;           // LCD 状态寄存器
  u8 scroll_y;       // Y 滚动位置
  u8 scroll_x;       // X 滚动位置
  u8 ly;             // 当前扫描线
  u8 ly_compare;     // 扫描线比较值
  u8 dma;            // DMA 传输控制
  u8 bg_palette;     // 背景调色板
  u8 obj_palette[2]; // 精灵调色板
  u8 win_y;          // 窗口 Y 位置
  u8 win_x;          // 窗口 X 位置

  // other data...
  u32 bg_colors[4];  // 背景颜色
  u32 sp1_colors[4]; // 精灵调色板1颜色
  u32 sp2_colors[4]; // 精灵调色板2颜色

} lcd_context;

typedef enum
{
  MODE_HBLANK, // Mode 0, 水平消隐期
  MODE_VBLANK, // Mode 1, 垂直消隐期
  MODE_OAM,    // Mode 2, 扫描精灵阶段
  MODE_XFER    // Mode 3, 像素传输阶段
} lcd_mode;

lcd_context *lcd_get_context();

#define LCDC_BGW_ENABLE (BIT(lcd_get_context()->lcdc, 0))                      // 背景和窗口显示使能
#define LCDC_OBJ_ENABLE (BIT(lcd_get_context()->lcdc, 1))                      // 精灵显示使能
#define LCDC_OBJ_HEIGHT (BIT(lcd_get_context()->lcdc, 2) ? 16 : 8)             // 精灵高度 (8或16像素)
#define LCDC_BG_MAP_AREA (BIT(lcd_get_context()->lcdc, 3) ? 0x9C00 : 0x9800)   // 背景图块映射区域
#define LCDC_BGW_DATA_AREA (BIT(lcd_get_context()->lcdc, 4) ? 0x8000 : 0x8800) // 背景和窗口图案数据区域
#define LCDC_WIN_ENABLE (BIT(lcd_get_context()->lcdc, 5))                      // 窗口显示使能
#define LCDC_WIN_MAP_AREA (BIT(lcd_get_context()->lcdc, 6) ? 0x9C00 : 0x9800)  // 窗口图块映射区域
#define LCDC_LCD_ENABLE (BIT(lcd_get_context()->lcdc, 7))                      // LCD显示使能

// LCD状态模式设置和获取
#define LCDS_MODE ((lcd_mode)(lcd_get_context()->lcds & 0b11))
#define LCDS_MODE_SET(mode)           \
  {                                   \
    lcd_get_context()->lcds &= ~0b11; \
    lcd_get_context()->lcds |= mode;  \
  }

// LYC（行比较）标志
#define LCDS_LYC (BIT(lcd_get_context()->lcds, 2))
#define LCDS_LYC_SET(b) (BIT_SET(lcd_get_context()->lcds, 2, b))

typedef enum
{
  SS_HBLANK = (1 << 3),
  SS_VBLANK = (1 << 4),
  SS_OAM = (1 << 5),
  SS_LYC = (1 << 6),
} stat_src;

#define LCDS_STAT_INT(src) (lcd_get_context()->lcds & src)

void lcd_init();

u8 lcd_read(u16 address);
void lcd_write(u16 address, u8 value);