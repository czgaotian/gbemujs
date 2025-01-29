#include <dma.h>
#include <ppu.h>
#include <bus.h>

typedef struct
{
  bool active;
  u8 byte;
  u8 value;
  u8 start_delay;
} dma_context;

static dma_context ctx;

void dma_start(u8 start)
{
  ctx.active = true;
  ctx.byte = 0;
  /*
  当CPU发起DMA传输请求时，Game Boy的硬件需要一些时间来准备和同步这个操作。这个准备过程需要2个机器周期
  第1个周期：DMA控制器接收到请求
  第2个周期：DMA控制器进行内部准备
  */
  ctx.start_delay = 2;
  ctx.value = start;
}

void dma_tick()
{
  if (!ctx.active)
  {
    return;
  }

  if (ctx.start_delay)
  {
    ctx.start_delay--;
    return;
  }

  // DMA 从主内存快速复制到 OAM 内存中
  ppu_oam_write(ctx.byte, bus_read((ctx.value * 0x100) + ctx.byte));

  ctx.byte++;

  ctx.active = ctx.byte < 0xA0;
}

bool dma_transferring()
{
  return ctx.active;
}
