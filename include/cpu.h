#pragma once

#include <common.h>
#include <instructions.h>

typedef struct
{
  u8 a;
  u8 f;
  u8 b;
  u8 c;
  u8 d;
  u8 e;
  u8 h;
  u8 l;
  u16 pc; // Program Counter, 程序计数器, 指向下一条要执行的指令
  u16 sp; // Stack Pointer, 堆栈指针, 指向当前堆栈顶部
} cpu_registers;

typedef struct
{
  cpu_registers regs;

  // current fetch
  u16 fetched_data;
  u16 mem_dest;
  bool dest_ist_mem;
  u8 cur_opcode;
  instruction *cur_inst;

  bool halted;
  bool stepping;

} cpu_context;

void cpu_init();
bool cpu_step();
