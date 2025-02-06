import { Registers } from './registers';
import { AddressMode, Instruction, ConditionType, Flag, RegisterType } from '../types';
import { instructionMap, instructionDisplay } from './instruction';
import { bitSet } from '../utils';
import { processorMap } from './processor';
import { GameBoy } from '../emu/emu';

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
      if (!this.instruction) return false;
      console.log(`${instructionDisplay.call(this)}`);
      this.fetchData();
      this.executeInstruction();
    } else {
      this.emulator.tick(1);
    }
    return true;
  }

  private fetchInstruction(): void {
    this.opcode = this.emulator.busRead(this.registers.pc++);
    this.instruction = instructionMap[this.opcode];
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

  private executeInstruction(): void {
    if (!this.instruction) {
      throw new Error('Instruction not found');
    }
    const processor = processorMap[this.instruction.type];
    if (!processor) {
      throw new Error(`Processor not found for instruction: ${this.instruction?.type}`);
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

  public checkCondition(): boolean {
    if (!this.instruction?.conditionType) {
      return false;
    }

    switch (this.instruction.conditionType) {
      case ConditionType.C:
        return this.registers.flagC;
      case ConditionType.NC:
        return !this.registers.flagC;
      case ConditionType.Z:
        return this.registers.flagZ;
      case ConditionType.NZ:
        return !this.registers.flagZ;
      default:
        return false;
    }
  }
}
