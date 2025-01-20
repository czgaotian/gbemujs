#include <bus.h>

u8 bus_read(u16 address)
{
  // 0x0000-0x7FFF 用于存放游戏卡带的程序ROM
  if (address < 0x8000)
  {
    return cart_read(address);
  }

  NO_IMPL
}

void bus_write(u16 address, u8 value)
{
  if (address < 0x8000)
  {
    cart_write(address);
    return;
  }
}
