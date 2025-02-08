import { AddressMode, Instruction, ConditionType, Flag, RegisterType } from '../types';
import { instructionMap } from './instruction';
import { bitGet, consoleCpu, getInstructionTypeName, instructionDisplay, registerFDisplay } from '../utils';
import { processorMap } from './processor';
import { fetchData } from './fetch';
import { GameBoy } from '../emu/emu';
import { stackPush, stackPush16, stackPop, stackPop16 } from './stack';
import { Registers } from './registers'
import { handleInterrupts } from './interrupts';

export class CPU {
  public emulator: GameBoy;
  public registers: Registers;

  private _opcode: number = 0;
  private _fetchedData: number = 0;
  public instruction?: Instruction;
  private _memoryDestination: number = 0;
  public destinationIsMemory: boolean = false;
  public halted: boolean = false;

  public interruptMasterEnabled: boolean = false;
  public interruptMasterEnablingCountdown: number = 0;

  constructor(emulator: GameBoy) {
    this.emulator = emulator;
    this.registers = new Registers();
  }

  public init(): void {
    this.registers.init();

    this.halted = false;
    this.interruptMasterEnabled = false;
    this.interruptMasterEnablingCountdown = 0;
  }

  public step() {
    if (!this.halted) {
      if (this.interruptMasterEnabled && !!(this.emulator.intEnableFlags & this.emulator.intFlags)) {
        this.handleInterrupts();
      } else {
        const pc = this.registers.pc;

        this.fetchInstruction();
        this.emulator.tick(1);
        this.fetchData();

        this.emulator.isDebug && consoleCpu(pc, this);

        this.execute();
      }
    } else {
      this.emulator.tick(1);
      if (this.emulator.intEnableFlags & this.emulator.intFlags) {
        this.halted = false;
      }
    }
    if (this.interruptMasterEnablingCountdown) {
      --this.interruptMasterEnablingCountdown;
      if (!this.interruptMasterEnablingCountdown) {
        this.interruptMasterEnabled = true;
      }
    }
  }

  private handleInterrupts = handleInterrupts.bind(this);

  private fetchInstruction(): void {
    this.opcode = this.emulator.busRead(this.registers.pc);
    this.registers.pc++;
    this.instruction = instructionMap[this.opcode];
    if (!this.instruction) {
      throw new Error(`Instruction not found for opcode: 0x${this.opcode.toString(16)}`);
    }
  }

  private fetchData = fetchData.bind(this);

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

  /**
   * @param registerType
   * @return u16 number
   */
  public readRegister(registerType: RegisterType) {
    return this.registers.read(registerType);
  }

  /**
   * @param registerType
   * @param value u16 number
   * @return void
   */
  public setRegister(registerType: RegisterType, value: number) {
    this.registers.set(registerType, value);
  }

  /**
   * @param registerType
   * @return u8 number
   */
  public readRegister8Bit(registerType: RegisterType) {
    if (registerType === RegisterType.HL) {
      return this.emulator.busRead(this.readRegister(RegisterType.HL));
    }
    return this.registers.read8Bit(registerType);
  }

  /**
   * @param registerType
   * @param value u8 number
   * @return void
   */
  public setRegister8Bit(registerType: RegisterType, value: number) {
    if (registerType === RegisterType.HL) {
      this.emulator.busWrite(this.readRegister(RegisterType.HL), value);
    } else {
      this.registers.set8Bit(registerType, value);
    }
  }

  public setFlags(z: Flag, n: Flag, h: Flag, c: Flag) {
    this.registers.setFlags(z, n, h, c);
  }

  public stackPush = stackPush.bind(this);
  public stackPush16 = stackPush16.bind(this);
  public stackPop = stackPop.bind(this);
  public stackPop16 = stackPop16.bind(this);

  public enableInterruptMaster() {
    this.interruptMasterEnablingCountdown = 2;
  }

  public disableInterruptMaster() {
    this.interruptMasterEnabled = false;
    this.interruptMasterEnablingCountdown = 0;
  }

  get opcode() {
    return this._opcode & 0xFF;
  }

  set opcode(value: number) {
    this._opcode = value & 0xFF;
  }

  get fetchedData() {
    return this._fetchedData & 0xFFFF;
  }

  set fetchedData(value: number) {
    this._fetchedData = value & 0xFFFF;
  }

  get memoryDestination() {
    return this._memoryDestination & 0xFFFF;
  }

  set memoryDestination(value: number) {
    this._memoryDestination = value & 0xFFFF;
  }
}
