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

reg_type rt_lookup[] = {
    RT_B,
    RT_C,
    RT_D,
    RT_E,
    RT_H,
    RT_L,
    RT_HL,
    RT_A};

reg_type decode_reg(u8 reg)
{
  if (reg > 0b111)
  {
    return RT_NONE;
  }

  return rt_lookup[reg];
}

static void proc_cb(cpu_context *ctx)
{
  u8 op = ctx->fetched_data;
  reg_type reg = decode_reg(op & 0b111);
  u8 bit = (op >> 3) & 0b111;   // 被操作的位或移位操作类型
  u8 bit_op = (op >> 6) & 0b11; // 操作类型（位测试、复位、置位或移位）
  u8 reg_val = cpu_read_reg8(reg);

  emu_cycles(1);

  if (reg == RT_HL)
  {
    emu_cycles(2);
  }

  switch (bit_op)
  {
  case 1:
    // BIT 位测试 测试寄存器值的指定位是否为 0，设置标志位
    cpu_set_flags(ctx, !(reg_val & (1 << bit)), 0, 1, -1);
    return;

  case 2:
    // RST 位复位
    reg_val &= ~(1 << bit);
    cpu_set_reg8(reg, reg_val);
    return;

  case 3:
    // SET 位置位
    reg_val |= (1 << bit);
    cpu_set_reg8(reg, reg_val);
    return;
  }
  // 其他情况, 根据 bit 值执行具体移位操作。

  bool flagC = CPU_FLAG_C;

  switch (bit)
  {
  case 0:
  {
    // RLC 带进位循环左移
    bool setC = false;
    u8 result = (reg_val << 1) & 0xFF;

    if ((reg_val & (1 << 7)) != 0)
    {
      result |= 1;
      setC = true;
    }

    cpu_set_reg8(reg, result);
    cpu_set_flags(ctx, result == 0, false, false, setC);
  }
    return;

  case 1:
  {
    // RRC /带进位循环右移
    u8 old = reg_val;
    reg_val >>= 1;
    reg_val |= (old << 7);

    cpu_set_reg8(reg, reg_val);
    cpu_set_flags(ctx, !reg_val, false, false, old & 1);
  }
    return;

  case 2:
  {
    // RL 通过进位标志循环左移
    u8 old = reg_val;
    reg_val <<= 1;
    reg_val |= flagC;

    cpu_set_reg8(reg, reg_val);
    cpu_set_flags(ctx, !reg_val, false, false, !!(old & 0x80));
  }
    return;

  case 3:
  {
    // RR  通过进位标志循环右移
    u8 old = reg_val;
    reg_val >>= 1;

    reg_val |= (flagC << 7);

    cpu_set_reg8(reg, reg_val);
    cpu_set_flags(ctx, !reg_val, false, false, old & 1);
  }
    return;

  case 4:
  {
    // SLA 算数左移
    u8 old = reg_val;
    reg_val <<= 1;

    cpu_set_reg8(reg, reg_val);
    cpu_set_flags(ctx, !reg_val, false, false, !!(old & 0x80));
  }
    return;

  case 5:
  {
    // SRA 算术右移
    u8 u = (int8_t)reg_val >> 1;
    cpu_set_reg8(reg, u);
    cpu_set_flags(ctx, !u, 0, 0, reg_val & 1);
  }
    return;

  case 6:
  {
    // SWAP
    reg_val = ((reg_val & 0xF0) >> 4) | ((reg_val & 0xF) << 4);
    cpu_set_reg8(reg, reg_val);
    cpu_set_flags(ctx, reg_val == 0, false, false, false);
  }
    return;

  case 7:
  {
    // SRL 逻辑右移
    u8 u = reg_val >> 1;
    cpu_set_reg8(reg, u);
    cpu_set_flags(ctx, !u, 0, 0, reg_val & 1);
  }
    return;
  }

  fprintf(stderr, "ERROR: INVALID CB: %02X", op);
  NO_IMPL
}

static void proc_rlca(cpu_context *ctx)
{
  u8 u = ctx->regs.a;
  bool c = (u >> 7) & 1;
  u = (u << 1) | c;
  ctx->regs.a = u;

  cpu_set_flags(ctx, 0, 0, 0, c);
}

static void proc_rrca(cpu_context *ctx)
{
  u8 b = ctx->regs.a & 1;
  ctx->regs.a >>= 1;
  ctx->regs.a |= (b << 7);

  cpu_set_flags(ctx, 0, 0, 0, b);
}

static void proc_rla(cpu_context *ctx)
{
  u8 u = ctx->regs.a;
  u8 cf = CPU_FLAG_C;
  u8 c = (u >> 7) & 1;

  ctx->regs.a = (u << 1) | cf;
  cpu_set_flags(ctx, 0, 0, 0, c);
}

static void proc_stop(cpu_context *ctx)
{
  fprintf(stderr, "STOPPING!\n");
  NO_IMPL
}

// Decimal Adjust Accumulator, 通常用于处理运算后的调整
static void proc_daa(cpu_context *ctx)
{
  u8 u = 0;
  int fc = 0; // Flag Carry, 用于指示是否需要设置进位标志

  /*
  如果半进位标志 H 被设置，或者上一次操作是加法（!CPU_FLAG_N）且累加器的低 4 位大于 9
  则需要将 u 设置为 6 (0b0110)，以便调整低 4 位
   */
  if (CPU_FLAG_H || (!CPU_FLAG_N && (ctx->regs.a & 0xF) > 9))
  {
    u = 6;
  }

  /*
  如果进位标志 C 被设置，或者上一次操作是加法（!CPU_FLAG_N）且累加器的值大于 0x99
  则需要将 u 的高 4 位设置为 6（即 0b01100000），并设置 fc 为 1，表示需要设置进位标志。
  */
  if (CPU_FLAG_C || (!CPU_FLAG_N && ctx->regs.a > 0x99))
  {
    u |= 0x60;
    fc = 1;
  }

  ctx->regs.a += CPU_FLAG_N ? -u : u;

  cpu_set_flags(ctx, ctx->regs.a == 0, -1, 0, fc);
}

static void proc_cpl(cpu_context *ctx)
{
  ctx->regs.a = ~ctx->regs.a;
  cpu_set_flags(ctx, -1, 1, 1, -1);
}

static void proc_scf(cpu_context *ctx)
{
  cpu_set_flags(ctx, -1, 0, 0, 1);
}

static void proc_ccf(cpu_context *ctx)
{
  cpu_set_flags(ctx, -1, 0, 0, CPU_FLAG_C ^ 1);
}

static void proc_halt(cpu_context *ctx)
{
  ctx->halted = true;
}

static void proc_rra(cpu_context *ctx)
{
  u8 carry = CPU_FLAG_C;
  u8 new_c = ctx->regs.a & 1;

  ctx->regs.a >>= 1;
  ctx->regs.a |= (carry << 7);

  cpu_set_flags(ctx, 0, 0, 0, new_c);
}

static void proc_and(cpu_context *ctx)
{
  ctx->regs.a &= ctx->fetched_data;
  cpu_set_flags(ctx, ctx->regs.a == 0, 0, 1, 0);
}

static void proc_xor(cpu_context *ctx)
{
  ctx->regs.a ^= ctx->fetched_data & 0xFF;
  cpu_set_flags(ctx, ctx->regs.a == 0, 0, 0, 0);
}

static void proc_or(cpu_context *ctx)
{
  ctx->regs.a |= ctx->fetched_data & 0xFF;
  cpu_set_flags(ctx, ctx->regs.a == 0, 0, 0, 0);
}

static void proc_cp(cpu_context *ctx)
{
  int n = (int)ctx->regs.a - (int)ctx->fetched_data;

  cpu_set_flags(ctx, n == 0, 1,
                ((int)ctx->regs.a & 0x0F) - ((int)ctx->fetched_data & 0x0F) < 0, n < 0);
}

static void proc_di(cpu_context *ctx)
{
  ctx->int_master_enabled = false;
}

static void proc_ei(cpu_context *ctx)
{
  ctx->enabling_ime = true;
}

static bool is_16_bit(reg_type rt)
{
  return rt >= RT_AF;
}

static void proc_ld(cpu_context *ctx)
{
  if (ctx->dest_is_mem) // 写入内存 (dest_is_mem 为 true)
  {
    // LD (BC), A for instance...
    if (is_16_bit(ctx->cur_inst->reg_2))
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

static void proc_inc(cpu_context *ctx)
{
  u16 val = cpu_read_reg(ctx->cur_inst->reg_1) + 1;

  if (is_16_bit(ctx->cur_inst->reg_1))
  {
    emu_cycles(1);
  }

  // 如果是对内存(HL)操作,则从总线读写数据
  if (ctx->cur_inst->reg_1 == RT_HL && ctx->cur_inst->mode == AM_MR)
  {
    val = bus_read(cpu_read_reg(RT_HL)) + 1;
    val &= 0xFF;
    bus_write(cpu_read_reg(RT_HL), val);
  }
  else
  {
    cpu_set_reg(ctx->cur_inst->reg_1, val);
    val = cpu_read_reg(ctx->cur_inst->reg_1);
  }

  // 检查操作码最后两位是否为 11(0x03), 如果是则不更新标志位
  if ((ctx->cur_opcode & 0x03) == 0x03)
  {
    return;
  }

  // 更新标志位: Z:结果是否为0 N:设为0 H:低4位是否溢出 C:保持不变
  cpu_set_flags(ctx, val == 0, 0, (val & 0x0F) == 0, -1);
}

static void proc_dec(cpu_context *ctx)
{
  u16 val = cpu_read_reg(ctx->cur_inst->reg_1) - 1;

  if (is_16_bit(ctx->cur_inst->reg_1))
  {
    emu_cycles(1);
  }

  if (ctx->cur_inst->reg_1 == RT_HL && ctx->cur_inst->mode == AM_MR)
  {
    val = bus_read(cpu_read_reg(RT_HL)) - 1;
    bus_write(cpu_read_reg(RT_HL), val);
  }
  else
  {
    cpu_set_reg(ctx->cur_inst->reg_1, val);
    val = cpu_read_reg(ctx->cur_inst->reg_1);
  }

  // 检查操作码是否匹配模式 xxxx1011(0x0B)。如果是，则直接返回不更新标志位
  if ((ctx->cur_opcode & 0x0B) == 0x0B)
  {
    return;
  }

  // 更新标志位: Z:结果是否为0 N:设为1 H:低4位是否借位 C:保持不变
  cpu_set_flags(ctx, val == 0, 1, (val & 0x0F) == 0x0F, -1);
}

static void proc_sub(cpu_context *ctx)
{
  u16 val = cpu_read_reg(ctx->cur_inst->reg_1) - ctx->fetched_data;

  int z = val == 0;
  int h = ((int)cpu_read_reg(ctx->cur_inst->reg_1) & 0xF) - ((int)ctx->fetched_data & 0xF) < 0;
  int c = ((int)cpu_read_reg(ctx->cur_inst->reg_1)) - ((int)ctx->fetched_data) < 0;

  cpu_set_reg(ctx->cur_inst->reg_1, val);
  cpu_set_flags(ctx, z, 1, h, c);
}

static void proc_sbc(cpu_context *ctx)
{
  u8 val = ctx->fetched_data + CPU_FLAG_C;

  int z = cpu_read_reg(ctx->cur_inst->reg_1) - val == 0;

  int h = ((int)cpu_read_reg(ctx->cur_inst->reg_1) & 0xF) - ((int)ctx->fetched_data & 0xF) - ((int)CPU_FLAG_C) < 0;
  int c = ((int)cpu_read_reg(ctx->cur_inst->reg_1)) - ((int)ctx->fetched_data) - ((int)CPU_FLAG_C) < 0;

  cpu_set_reg(ctx->cur_inst->reg_1, cpu_read_reg(ctx->cur_inst->reg_1) - val);
  cpu_set_flags(ctx, z, 1, h, c);
}

static void proc_adc(cpu_context *ctx)
{
  u16 u = ctx->fetched_data;
  u16 a = ctx->regs.a;
  u16 c = CPU_FLAG_C;

  ctx->regs.a = (a + u + c) & 0xFF;

  cpu_set_flags(ctx, ctx->regs.a == 0, 0,
                (a & 0xF) + (u & 0xF) + c > 0xF,
                a + u + c > 0xFF);
}

static void proc_add(cpu_context *ctx)
{
  u32 val = cpu_read_reg(ctx->cur_inst->reg_1) + ctx->fetched_data;

  bool is_16bit = is_16_bit(ctx->cur_inst->reg_1);

  if (is_16bit)
  {
    emu_cycles(1);
  }

  if (ctx->cur_inst->reg_1 == RT_SP)
  {
    val = cpu_read_reg(ctx->cur_inst->reg_1) + (char)ctx->fetched_data;
  }

  int z = (val & 0xFF) == 0;
  int h = (cpu_read_reg(ctx->cur_inst->reg_1) & 0xF) + (ctx->fetched_data & 0xF) >= 0x10;
  int c = (int)(cpu_read_reg(ctx->cur_inst->reg_1) & 0xFF) + (int)(ctx->fetched_data & 0xFF) >= 0x100;

  if (is_16bit)
  {
    z = -1;
    h = (cpu_read_reg(ctx->cur_inst->reg_1) & 0xFFF) + (ctx->fetched_data & 0xFFF) >= 0x1000;
    u32 n = ((u32)cpu_read_reg(ctx->cur_inst->reg_1)) + ((u32)ctx->fetched_data);
    c = n >= 0x10000;
  }

  if (ctx->cur_inst->reg_1 == RT_SP)
  {
    z = 0;
    h = (cpu_read_reg(ctx->cur_inst->reg_1) & 0xF) + (ctx->fetched_data & 0xF) >= 0x10;
    c = (int)(cpu_read_reg(ctx->cur_inst->reg_1) & 0xFF) + (int)(ctx->fetched_data & 0xFF) >= 0x100;
  }

  cpu_set_reg(ctx->cur_inst->reg_1, val & 0xFFFF);
  cpu_set_flags(ctx, z, 0, h, c);
}

static IN_PROC processors[] = {
    [IN_NONE] = proc_none,
    [IN_NOP] = proc_nop,
    [IN_LD] = proc_ld,
    [IN_LDH] = proc_ldh,
    [IN_JP] = proc_jp,
    [IN_DI] = proc_di,
    [IN_EI] = proc_ei,
    [IN_POP] = proc_pop,
    [IN_PUSH] = proc_push,
    [IN_JR] = proc_jr,
    [IN_CALL] = proc_call,
    [IN_RST] = proc_rst,
    [IN_RET] = proc_ret,
    [IN_RETI] = proc_reti,
    [IN_INC] = proc_inc,
    [IN_DEC] = proc_dec,
    [IN_ADD] = proc_add,
    [IN_ADC] = proc_adc,
    [IN_SUB] = proc_sub,
    [IN_SBC] = proc_sbc,
    [IN_AND] = proc_and,
    [IN_XOR] = proc_xor,
    [IN_OR] = proc_or,
    [IN_CP] = proc_cp,
    [IN_CB] = proc_cb,
    [IN_RRCA] = proc_rrca,
    [IN_RLCA] = proc_rlca,
    [IN_RRA] = proc_rra,
    [IN_RLA] = proc_rla,
    [IN_STOP] = proc_stop,
    [IN_HALT] = proc_halt,
    [IN_DAA] = proc_daa,
    [IN_CPL] = proc_cpl,
    [IN_SCF] = proc_scf,
    [IN_CCF] = proc_ccf,
};

IN_PROC inst_get_processor(in_type type)
{
  return processors[type];
}