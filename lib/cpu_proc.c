#include <cpu.h>
#include <emu.h>
#include <bus.h>
#include <stack.h>

// processes CPU instructions...

void cpu_set_flags(cpu_context *ctx, char z, char n, char h, char c)
{
  if (z != -1)
  {
    BIT_SET(ctx->regs.f, 7, z);
  }

  if (n != -1)
  {
    BIT_SET(ctx->regs.f, 6, n);
  }

  if (h != -1)
  {
    BIT_SET(ctx->regs.f, 5, h);
  }

  if (c != -1)
  {
    BIT_SET(ctx->regs.f, 4, c);
  }
}

static void proc_none(cpu_context *ctx)
{
  printf("INVALID INSTRUCTION!\n");
  exit(-7);
}

static void proc_nop(cpu_context *ctx)
{
}

static void proc_di(cpu_context *ctx)
{
  ctx->int_master_enabled = false;
}

static void proc_ld(cpu_context *ctx)
{
  if (ctx->dest_is_mem) // 写入内存 (dest_is_mem 为 true)
  {
    // LD (BC), A for instance...
    if (ctx->cur_inst->reg_2 >= RT_AF)
    {
      emu_cycles(1); // 16位数据写入，需要额外周期
      bus_write16(ctx->mem_dest, ctx->fetched_data);
    }
    else
    {
      bus_write(ctx->mem_dest, ctx->fetched_data);
    }

    return;
  }

  /*
  LD HL,SP+r8
  这个指令将SP加上r8的结果存入HL寄存器。它会设置以下标志位:

  零标志(Z)和负标志(N)被清零
  半进位标志(H):低4位相加≥0x10时置1
  进位标志(C):低8位相加≥0x100时置1
  */
  if (ctx->cur_inst->mode == AM_HL_SPR)
  {
    u8 hflag = (cpu_read_reg(ctx->cur_inst->reg_2) & 0xF) +
                   (ctx->fetched_data & 0xF) >=
               0x10;

    u8 cflag = (cpu_read_reg(ctx->cur_inst->reg_2) & 0xFF) +
                   (ctx->fetched_data & 0xFF) >=
               0x100;

    cpu_set_flags(ctx, 0, 0, hflag, cflag);
    cpu_set_reg(ctx->cur_inst->reg_1,
                cpu_read_reg(ctx->cur_inst->reg_2) + (char)ctx->fetched_data);

    return;
  }

  cpu_set_reg(ctx->cur_inst->reg_1, ctx->fetched_data); // 普通寄存器加载
}

static void proc_ldh(cpu_context *ctx)
{
  if (ctx->cur_inst->reg_1 == RT_A)
  {
    cpu_set_reg(ctx->cur_inst->reg_1, bus_read(0xFF00 | ctx->fetched_data));
  }
  else
  {
    bus_write(0xFF00 | ctx->fetched_data, ctx->regs.a);
  }

  emu_cycles(1);
}

static void proc_xor(cpu_context *ctx)
{
  ctx->regs.a ^= ctx->fetched_data & 0xFF;
  cpu_set_flags(ctx, ctx->regs.a == 0, 0, 0, 0);
}

static bool check_cond(cpu_context *ctx)
{
  bool z = CPU_FLAG_Z;
  bool c = CPU_FLAG_C;

  switch (ctx->cur_inst->cond)
  {
  case CT_NONE:
    return true;
  case CT_C:
    return c;
  case CT_NC:
    return !c;
  case CT_Z:
    return z;
  case CT_NZ:
    return !z;
  }

  return false;
}

static void goto_addr(cpu_context *ctx, u16 addr, bool pushpc)
{
  if (check_cond(ctx))
  {
    if (pushpc)
    {
      emu_cycles(2);
      stack_push16(ctx->regs.pc);
    }
    ctx->regs.pc = addr;
    emu_cycles(1);
  }
}

static void proc_jp(cpu_context *ctx)
{
  goto_addr(ctx, ctx->fetched_data, false);
}

static void proc_jr(cpu_context *ctx)
{
  // 直接转char以正确处理负数
  char rel = (char)(ctx->fetched_data & 0xFF);
  u16 addr = ctx->regs.pc + rel;
  goto_addr(ctx, addr, false);
}

static void proc_call(cpu_context *ctx)
{
  goto_addr(ctx, ctx->fetched_data, true);
}

static void proc_rst(cpu_context *ctx)
{
  goto_addr(ctx, ctx->cur_inst->param, true);
}

static void proc_ret(cpu_context *ctx)
{
  if (ctx->cur_inst->cond != CT_NONE)
  {
    emu_cycles(1);
  }

  if (check_cond(ctx))
  {
    u16 lo = stack_pop();
    emu_cycles(1);
    u16 hi = stack_pop();
    emu_cycles(1);

    u16 n = (hi << 8) | lo;
    ctx->regs.pc = n;

    emu_cycles(1);
  }
}

static void proc_reti(cpu_context *ctx)
{
  ctx->int_master_enabled = true;
  proc_ret(ctx);
}

static void proc_pop(cpu_context *ctx)
{
  u16 hi = stack_pop();
  emu_cycles(1);
  u16 lo = stack_pop();
  emu_cycles(1);

  u16 val = (hi << 8) | lo;

  cpu_set_reg(ctx->cur_inst->reg_1, val);

  // AF寄存器中的F部分(低8位)是标志寄存器(Flag Register),其低4位总是为0
  if (ctx->cur_inst->reg_1 == RT_AF)
  {
    cpu_set_reg(ctx->cur_inst->reg_1, val & 0xFFF0);
  }
}

static void proc_push(cpu_context *ctx)
{
  u16 hi = (cpu_read_reg(ctx->cur_inst->reg_1) >> 8) & 0xFF;
  emu_cycles(1);
  stack_push(hi);

  u16 lo = cpu_read_reg(ctx->cur_inst->reg_2) & 0xFF;
  emu_cycles(1);
  stack_push(lo);

  // 第三个周期是指令本身的执行周期, 为了精确模拟原始硬件的时序特性
  emu_cycles(1);
}

static IN_PROC processors[] = {
    [IN_NONE] = proc_none,
    [IN_NOP] = proc_nop,
    [IN_LD] = proc_ld,
    [IN_LDH] = proc_ldh,
    [IN_JP] = proc_jp,
    [IN_DI] = proc_di,
    [IN_POP] = proc_pop,
    [IN_PUSH] = proc_push,
    [IN_JR] = proc_jr,
    [IN_CALL] = proc_call,
    [IN_RST] = proc_rst,
    [IN_RET] = proc_ret,
    [IN_RETI] = proc_reti,
    [IN_XOR] = proc_xor};

IN_PROC inst_get_processor(in_type type)
{
  return processors[type];
}