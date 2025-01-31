#include <ppu.h>
#include <lcd.h>
#include <bus.h>

void pixel_fifo_push(u32 value)
{
  fifo_entry *next = malloc(sizeof(fifo_entry));
  next->next = NULL;
  next->value = value;

  if (!ppu_get_context()->pfc.pixel_fifo.head)
  {
    // first entry...
    ppu_get_context()->pfc.pixel_fifo.head = ppu_get_context()->pfc.pixel_fifo.tail = next;
  }
  else
  {
    ppu_get_context()->pfc.pixel_fifo.tail->next = next;
    ppu_get_context()->pfc.pixel_fifo.tail = next;
  }

  ppu_get_context()->pfc.pixel_fifo.size++;
}

u32 pixel_fifo_pop()
{
  if (ppu_get_context()->pfc.pixel_fifo.size <= 0)
  {
    fprintf(stderr, "ERR IN PIXEL FIFO!\n");
    exit(-8);
  }

  fifo_entry *popped = ppu_get_context()->pfc.pixel_fifo.head;
  ppu_get_context()->pfc.pixel_fifo.head = popped->next;
  ppu_get_context()->pfc.pixel_fifo.size--;

  u32 val = popped->value;
  free(popped);

  return val;
}

bool pipeline_fifo_add()
{
  if (ppu_get_context()->pfc.pixel_fifo.size > 8)
  {
    // fifo is full!
    return false;
  }

  // 计算实际的 X 坐标，考虑背景滚动偏移
  int x = ppu_get_context()->pfc.fetch_x - (8 - (lcd_get_context()->scroll_x % 8));

  for (int i = 0; i < 8; i++)
  {
    int bit = 7 - i;
    u8 hi = !!(ppu_get_context()->pfc.bgw_fetch_data[1] & (1 << bit));
    u8 lo = !!(ppu_get_context()->pfc.bgw_fetch_data[2] & (1 << bit)) << 1;
    u32 color = lcd_get_context()->bg_colors[hi | lo];

    if (x >= 0)
    {
      pixel_fifo_push(color);
      ppu_get_context()->pfc.fifo_x++;
    }
  }

  return true;
}

// 获取 tile 数据
void pipeline_fetch()
{
  switch (ppu_get_context()->pfc.cur_fetch_state)
  {
  case FS_TILE:
  {
    if (LCDC_BGW_ENABLE)
    {
      /*
      从背景地图区域读取 tile 编号
      map_x/8 和 map_y/8 用于定位 32x32 的背景地图中的具体 tile
      乘 32 是因为每行 32 个 tile
      */
      ppu_get_context()->pfc.bgw_fetch_data[0] = bus_read(LCDC_BG_MAP_AREA +
                                                          (ppu_get_context()->pfc.map_x / 8) +
                                                          (((ppu_get_context()->pfc.map_y / 8)) * 32));

      // 如果 tile 数据区域是 0x8800 模式, tile 编号的范围是 -128 到 127, 因此需要将读取的 tile 编号加上 128，将其转换为无符号数
      if (LCDC_BGW_DATA_AREA == 0x8800)
      {
        ppu_get_context()->pfc.bgw_fetch_data[0] += 128;
      }
    }

    ppu_get_context()->pfc.cur_fetch_state = FS_DATA0;
    ppu_get_context()->pfc.fetch_x += 8;
  }
  break;

  case FS_DATA0:
  {
    /*
    读取 tile 数据的低字节
    每个 tile 占 16 字节，tile_y 用于定位具体的行
    */
    ppu_get_context()->pfc.bgw_fetch_data[1] = bus_read(LCDC_BGW_DATA_AREA +
                                                        (ppu_get_context()->pfc.bgw_fetch_data[0] * 16) +
                                                        ppu_get_context()->pfc.tile_y);

    ppu_get_context()->pfc.cur_fetch_state = FS_DATA1;
  }
  break;

  case FS_DATA1:
  {
    // 读取 tile 数据的高字节（在低字节地址 +1 的位置）
    ppu_get_context()->pfc.bgw_fetch_data[2] = bus_read(LCDC_BGW_DATA_AREA +
                                                        (ppu_get_context()->pfc.bgw_fetch_data[0] * 16) +
                                                        ppu_get_context()->pfc.tile_y + 1);

    ppu_get_context()->pfc.cur_fetch_state = FS_IDLE;
  }
  break;

  case FS_IDLE:
  {
    ppu_get_context()->pfc.cur_fetch_state = FS_PUSH;
  }
  break;

  case FS_PUSH:
  {
    /*
    尝试将像素数据添加到FIFO
    如果成功，则返回获取新 tile 的状态
    */
    if (pipeline_fifo_add())
    {
      ppu_get_context()->pfc.cur_fetch_state = FS_TILE;
    }
  }
  break;
  }
}

// 从FIFO中推送像素到屏幕
void pipeline_push_pixel()
{
  if (ppu_get_context()->pfc.pixel_fifo.size > 8)
  {
    u32 pixel_data = pixel_fifo_pop();

    // 处理水平滚动的偏移
    if (ppu_get_context()->pfc.line_x >= (lcd_get_context()->scroll_x % 8))
    {
      ppu_get_context()->video_buffer[ppu_get_context()->pfc.pushed_x +
                                      (lcd_get_context()->ly * XRES)] = pixel_data;

      ppu_get_context()->pfc.pushed_x++;
    }

    ppu_get_context()->pfc.line_x++;
  }
}

void pipeline_process()
{
  // 计算在背景地图中的Y坐标
  ppu_get_context()->pfc.map_y = (lcd_get_context()->ly + lcd_get_context()->scroll_y);
  // 计算在背景地图中的X坐标
  ppu_get_context()->pfc.map_x = (ppu_get_context()->pfc.fetch_x + lcd_get_context()->scroll_x);
  // 计算 tile 内的具体行位置
  ppu_get_context()->pfc.tile_y = ((lcd_get_context()->ly + lcd_get_context()->scroll_y) % 8) * 2;

  // 每两个时钟周期执行一次获取操作
  if (!(ppu_get_context()->line_ticks & 1))
  {
    pipeline_fetch();
  }

  pipeline_push_pixel();
}

void pipeline_fifo_reset()
{
  while (ppu_get_context()->pfc.pixel_fifo.size)
  {
    pixel_fifo_pop();
  }

  ppu_get_context()->pfc.pixel_fifo.head = 0;
}