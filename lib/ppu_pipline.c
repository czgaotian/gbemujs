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

u32 fetch_sprite_pixels(int bit, u32 color, u8 bg_color)
{
  for (int i = 0; i < ppu_get_context()->fetched_entry_count; i++)
  {
    // 根据 Sprite 的 x 坐标和水平滚动偏移 (scroll_x % 8), 计算 Sprite 在屏幕上的实际显示位置
    int sp_x = (ppu_get_context()->fetched_entries[i].x - 8) +
               ((lcd_get_context()->scroll_x % 8));

    if (sp_x + 8 < ppu_get_context()->pfc.fifo_x)
    {
      // past pixel point already...
      continue;
    }

    int offset = ppu_get_context()->pfc.fifo_x - sp_x;

    if (offset < 0 || offset > 7)
    {
      // out of bounds..
      continue;
    }

    bit = (7 - offset);

    // 如果 Sprite 设置了水平翻转，则像素的位索引是从右到左的。
    if (ppu_get_context()->fetched_entries[i].f_x_flip)
    {
      bit = offset;
    }

    u8 hi = !!(ppu_get_context()->pfc.fetch_entry_data[i * 2] & (1 << bit));
    u8 lo = !!(ppu_get_context()->pfc.fetch_entry_data[(i * 2) + 1] & (1 << bit)) << 1;

    bool bg_priority = ppu_get_context()->fetched_entries[i].f_bgp;

    if (!(hi | lo))
    {
      // transparent
      continue;
    }

    // 如果精灵设置了背景优先级（f_bgp），并且背景像素颜色不为 0，则保留背景颜色
    if (!bg_priority || bg_color == 0)
    {
      color = (ppu_get_context()->fetched_entries[i].f_pn) ? lcd_get_context()->sp2_colors[hi | lo] : lcd_get_context()->sp1_colors[hi | lo];

      if (hi | lo)
      {
        break;
      }
    }
  }

  return color;
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

    if (!LCDC_BGW_ENABLE)
    {
      color = lcd_get_context()->bg_colors[0];
    }

    if (LCDC_OBJ_ENABLE)
    {
      color = fetch_sprite_pixels(bit, color, hi | lo);
    }

    if (x >= 0)
    {
      pixel_fifo_push(color);
      ppu_get_context()->pfc.fifo_x++;
    }
  }

  return true;
}

// 遍历当前扫描线上的精灵链表，筛选出与当前渲染位置（fetch_x）相关的精灵，并将其存储到 fetched_entries 数组中
void pipeline_load_sprite_tile()
{
  oam_line_entry *le = ppu_get_context()->line_sprites;

  while (le)
  {
    int sp_x = (le->entry.x - 8) + (lcd_get_context()->scroll_x % 8);

    /*
    如果精灵的显示范围（sp_x 到 sp_x + 8）与当前渲染位置（fetch_x 到 fetch_x + 8）重叠
    则将该精灵添加到 fetched_entries 数组中
    */
    if ((sp_x >= ppu_get_context()->pfc.fetch_x && sp_x < ppu_get_context()->pfc.fetch_x + 8) ||
        ((sp_x + 8) >= ppu_get_context()->pfc.fetch_x && (sp_x + 8) < ppu_get_context()->pfc.fetch_x + 8))
    {
      // need to add entry
      ppu_get_context()->fetched_entries[ppu_get_context()->fetched_entry_count++] = le->entry;
    }

    le = le->next;

    if (!le || ppu_get_context()->fetched_entry_count >= 3)
    {
      // max checking 3 sprites on pixels
      break;
    }
  }
}

// 从 VRAM 中加载已筛选 Sprite 的 tile 数据，并将其存储到 fetch_entry_data 中
void pipeline_load_sprite_data(u8 offset)
{
  int cur_y = lcd_get_context()->ly;
  u8 sprite_height = LCDC_OBJ_HEIGHT;

  for (int i = 0; i < ppu_get_context()->fetched_entry_count; i++)
  {
    /*
    计算行号 ty

    cur_y + 16 是当前扫描线在 Sprite 坐标系统中的位置
    ppu_get_context()->fetched_entries[i].y 是 Sprite 的 y 坐标
    乘 2 因为每行数据占 2 字节
    */
    u8 ty = ((cur_y + 16) - ppu_get_context()->fetched_entries[i].y) * 2;

    // 如果 Sprite 设置了垂直翻转（f_y_flip），则调整行号
    if (ppu_get_context()->fetched_entries[i].f_y_flip)
    {
      // flipped upside down...
      ty = ((sprite_height * 2) - 2) - ty;
    }

    u8 tile_index = ppu_get_context()->fetched_entries[i].tile;

    if (sprite_height == 16)
    {
      tile_index &= ~(1); // remove last bit...
    }

    /*
    tile 数据的起始地址为 0x8000
    每个 tile 占 16 字节 (8 行，每行 2 字节)
    图块编号 tile_index 用于定位具体的图块
    ty 行号
    offset 高低位
    */
    ppu_get_context()->pfc.fetch_entry_data[(i * 2) + offset] =
        bus_read(0x8000 + (tile_index * 16) + ty + offset);
  }
}

// 获取 tile 数据
void pipeline_fetch()
{
  switch (ppu_get_context()->pfc.cur_fetch_state)
  {
  case FS_TILE:
  {
    ppu_get_context()->fetched_entry_count = 0;

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

    if (LCDC_OBJ_ENABLE && ppu_get_context()->line_sprites)
    {
      pipeline_load_sprite_tile();
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

    pipeline_load_sprite_data(0);

    ppu_get_context()->pfc.cur_fetch_state = FS_DATA1;
  }
  break;

  case FS_DATA1:
  {
    // 读取 tile 数据的高字节（在低字节地址 +1 的位置）
    ppu_get_context()->pfc.bgw_fetch_data[2] = bus_read(LCDC_BGW_DATA_AREA +
                                                        (ppu_get_context()->pfc.bgw_fetch_data[0] * 16) +
                                                        ppu_get_context()->pfc.tile_y + 1);

    pipeline_load_sprite_data(1);

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