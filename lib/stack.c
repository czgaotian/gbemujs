#include <stack.h>
#include <cpu.h>
#include <bus.h>

void stack_push(u8 data)
{
  cpu_get_registers()->sp--;
  bus_write(cpu_get_registers()->sp, data);
}

void stack_push16(u16 data)
{
  stack_push((data >> 8) & 0xFF);
  stack_push(data & 0xFF);
}

u8 stack_pop()
{
  return bus_read(cpu_get_registers()->sp++);
}

u16 stack_pop16()
{
  u16 hi = stack_pop();
  u16 lo = stack_pop();
  return (hi << 8) | lo;
}