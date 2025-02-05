import { Registers } from './registers';
import { MMU } from '../mmu/mmu';
import { AddressMode, Instruction, ConditionType } from '../types';
import { instructionMap, instructionDisplay } from './instruction';
import { bitSet } from '../utils';
import { processorMap } from './processor';

export class CPU {
  private mmu: MMU;
  public registers: Registers;

  private opcode: number = 0;
  public fetchedData: number = 0;
  public instruction?: Instruction;
  private memoryDestination: number = 0;
  private destinationIsMemory: boolean = false;

  private halted: boolean = false;
  private stepping: boolean = false;

  public intMasterEnabled: boolean = false;

  constructor(mmu: MMU) {
    this.mmu = mmu;
    this.registers = new Registers();
  }

  public reset(): void {
    this.registers.reset();
  }

  private fetchInstruction(): void {
    this.opcode = this.mmu.readByte(this.registers.pc++);
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
        this.fetchedData = this.registers.readRegister(
          this.instruction.registerType1
        );
        return;

      case AddressMode.R_D8:
        this.fetchedData = this.mmu.readByte(this.registers.pc);
        this.registers.pc++;
        return;

      case AddressMode.D16:
        const lo = this.mmu.readByte(this.registers.pc);
        this.registers.pc++;

        const hi = this.mmu.readByte(this.registers.pc);
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

  public step(): boolean {
    if (!this.halted) {
      this.fetchInstruction();
      if (!this.instruction) return false;
      console.log(`${instructionDisplay.call(this)}`);
      this.fetchData();
      this.executeInstruction();
    }
    return true;
  }

  public cpuSetFlags(z: boolean, n: boolean, h: boolean, c: boolean) {
    if (z) {
      this.registers.f = bitSet(this.registers.f, 7, z);
    }

    if (n) {
      this.registers.f = bitSet(this.registers.f, 6, n);
    }

    if (h) {
      this.registers.f = bitSet(this.registers.f, 5, h);
    }

    if (c) {
      this.registers.f = bitSet(this.registers.f, 4, c);
    }
  }

  public checkCondition(): boolean {
    if (!this.instruction?.conditionType) {
      return false;
    }

    switch (this.instruction.conditionType) {
      case ConditionType.C:
        return this.flagC;
      case ConditionType.NC:
        return !this.flagC;
      case ConditionType.Z:
        return this.flagZ;
      case ConditionType.NZ:
        return !this.flagZ;
      default:
        return false;
    }
  }

  get flagZ(): boolean {
    return (this.registers.f & 0x80) !== 0;
  }

  get flagC(): boolean {
    return (this.registers.f & 0x10) !== 0;
  }
}
