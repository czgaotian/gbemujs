#pragma once

#include <common.h>

typedef struct
{
  u16 div; // 除频器寄存器
  u8 tima; // 定时器计数器
  u8 tma;  // 定时器模数寄存器
  /*
  定时器控制寄存器

  位2: 启用/禁用定时器
  位1-0: 选择频率
  00 = 1024Hz (检查 DIV 的第9位)
  01 = 16384Hz (检查 DIV 的第3位)
  10 = 4096Hz (检查 DIV 的第5位)
  11 = 1024Hz (检查 DIV 的第7位)
  */
  u8 tac;
} timer_context;

void timer_init();
void timer_tick();

void timer_write(u16 address, u8 value);
u8 timer_read(u16 address);

timer_context *timer_get_context();