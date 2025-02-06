import { Registers } from './registers';
import { AddressMode, Instruction, ConditionType, Flag, RegisterType } from '../types';
import { instructionMap } from './instruction';
import { getInstructionTypeName, instructionDisplay } from '../utils';
import { processorMap } from './processor';
import { GameBoy } from '../emu/emu';
import { stackPush, stackPush16, stackPop, stackPop16 } from './stack';

export class CPU {
  public emulator: GameBoy;
  public registers: Registers;

  public opcode: number = 0;
  public fetchedData: number = 0;
  public instruction?: Instruction;
  public memoryDestination: number = 0;
  public destinationIsMemory: boolean = false;
  public halted: boolean = false;
  public stepping: boolean = false;
  public intMasterEnabled: boolean = false;

  constructor(emulator: GameBoy) {
    this.emulator = emulator;
    this.registers = new Registers();
  }

  public reset(): void {
    this.registers.reset();
  }

  public step(): boolean {
    if (!this.halted) {
      this.fetchInstruction();
      this.fetchData();
      this.execute();
    } else {
      this.emulator.tick(1);
    }
    return true;
  }

  private fetchInstruction(): void {
    this.opcode = this.emulator.busRead(this.registers.pc++);
    this.instruction = instructionMap[this.opcode];
    if (!this.instruction) {
      throw new Error(`Instruction not found for opcode: ${this.opcode}`);
    }
    console.log(`${instructionDisplay.call(this)}`);
  }

  private fetchData(): void {
    this.memoryDestination = 0;
    this.destinationIsMemory = false;

    if (!this.instruction) {
      return;
    }

    switch (this.instruction.addressMode) {
      case AddressMode.IMPLIED:
        return;

      case AddressMode.R:
        if (!this.instruction.registerType1) {
          throw new Error('Register type is required for R mode');
        }
        this.fetchedData = this.cpuReadRegister(this.instruction.registerType1);
        return;

      case AddressMode.R_D8:
        this.fetchedData = this.emulator.busRead(this.registers.pc);
        this.registers.pc++;
        return;

      case AddressMode.D16:
        const lo = this.emulator.busRead(this.registers.pc);
        this.registers.pc++;

        const hi = this.emulator.busRead(this.registers.pc);
        this.registers.pc++;

        this.fetchedData = lo | (hi << 8);
        return;
    }
  }

  private execute(): void {
    if (!this.instruction) {
      throw new Error('Instruction not found');
    }
    const processor = processorMap[this.instruction.type];
    if (!processor) {
      throw new Error(`Processor not found for instruction: ${getInstructionTypeName(this.instruction.type)}`);
    }
    processor.call(this);
  }

  public cpuSetFlags(z: Flag, n: Flag, h: Flag, c: Flag) {
    this.registers.setFlags(z, n, h, c);
  }

  public cpuReadRegister(registerType: RegisterType): number {
    return this.registers.readRegister(registerType);
  }

  public cpuSetRegister(registerType: RegisterType, val: number) {
    this.registers.setRegister(registerType, val);
  }

  public stackPush = stackPush.bind(this);
  public stackPush16 = stackPush16.bind(this);
  public stackPop = stackPop.bind(this);
  public stackPop16 = stackPop16.bind(this);
}
