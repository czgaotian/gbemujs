import { CPU } from "./cpu";

export function stackPush(this: CPU, data: number) {
  this.registers.sp--;
  this.emulator.busWrite(this.registers.sp, data);
}

export function stackPush16(this: CPU, data: number) {
  this.stackPush((data >> 8) & 0xFF);
  this.stackPush(data & 0xFF);
}

export function stackPop(this: CPU) {
  return this.emulator.busRead(this.registers.sp++);
}

export function stackPop16(this: CPU) {
  const low = this.stackPop();
  const high = this.stackPop();

  return (high << 8) | low;
}