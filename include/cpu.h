#pragma once

#include <common.h>
#include <instructions.h>

typedef struct
{
  u8 a;
  u8 f; // 标志位寄存器
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

  // current fetch...
  u16 fetched_data;
  u16 mem_dest;
  bool dest_is_mem;
  u8 cur_opcode;
  instruction *cur_inst;

  bool halted;
  bool stepping;

  bool int_master_enabled; //  CPU 中断主控制开关, 通常通过 IME 指令来控制
  u8 ie_register;

} cpu_context;

cpu_registers *cpu_get_registers();

void cpu_init();
bool cpu_step();

typedef void (*IN_PROC)(cpu_context *);

IN_PROC inst_get_processor(in_type type);

#define CPU_FLAG_Z BIT(ctx->regs.f, 7)
#define CPU_FLAG_C BIT(ctx->regs.f, 4)

u16 cpu_read_reg(reg_type rt);
void cpu_set_reg(reg_type rt, u16 val);

u8 cpu_get_ie_register();
void cpu_set_ie_register(u8 val);
