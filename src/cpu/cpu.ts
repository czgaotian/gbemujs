import { AddressMode, Instruction, ConditionType, Flag, RegisterType } from '../types';
import { instructionMap } from './instruction';
import { bitGet, getInstructionTypeName, instructionDisplay } from '../utils';
import { processorMap } from './processor';
import { fetchData } from './fetch';
import { GameBoy } from '../emu/emu';
import { stackPush, stackPush16, stackPop, stackPop16 } from './stack';
import { setFlags, setRegister, readRegister, setRegister8Bit, readRegister8Bit } from './registers'
import { handleInterrupts } from './interrupts';

export class CPU {
  public emulator: GameBoy;

  public opcode: number = 0;
  public fetchedData: number = 0;
  public instruction?: Instruction;
  public memoryDestination: number = 0;
  public destinationIsMemory: boolean = false;
  public halted: boolean = false;

  public interruptMasterEnabled: boolean = false;
  public interruptMasterEnablingCountdown: number = 0;

  // 8位寄存器
  public a: number = 0;
  public b: number = 0;
  public c: number = 0;
  public d: number = 0;
  public e: number = 0;
  public h: number = 0;
  public l: number = 0;
  public f: number = 0;

  // 16位程序计数器和栈指针
  public pc: number = 0;
  public sp: number = 0;

  constructor(emulator: GameBoy) {
    this.emulator = emulator;
  }

  public init(): void {
    this.a = 0x01;
    this.b = 0x00;
    this.c = 0x13;
    this.d = 0x00;
    this.e = 0xd8;
    this.h = 0x01;
    this.l = 0x4d;
    this.f = 0xb0;

    this.sp = 0xfffe;
    this.pc = 0x100; // 0x100 是游戏程序的入口点

    this.halted = false;
    this.interruptMasterEnabled = false;
    this.interruptMasterEnablingCountdown = 0;
  }

  public step() {
    if (!this.halted) {
      if (this.interruptMasterEnabled && (this.emulator.intEnableFlags & this.emulator.intFlags)) {
        this.handleInterrupts();
      } else {
        this.fetchInstruction();
        this.emulator.tick(1);
        this.fetchData();
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
    this.opcode = this.emulator.busRead(this.pc++);
    this.instruction = instructionMap[this.opcode];
    if (!this.instruction) {
      throw new Error(`Instruction not found for opcode: 0x${this.opcode.toString(16)}`);
    }
    console.log(`${instructionDisplay.call(this)}`);
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

  public readRegister = readRegister.bind(this);
  public setRegister = setRegister.bind(this);
  public readRegister8Bit = readRegister8Bit.bind(this);
  public setRegister8Bit = setRegister8Bit.bind(this);
  public setFlags = setFlags.bind(this);

  public get flagZ() {
    return bitGet(this.f, 7);
  }

  public get flagC() {
    return bitGet(this.f, 4);
  }

  public get flagH() {
    return bitGet(this.f, 2);
  }

  public get flagN() {
    return bitGet(this.f, 6);
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
}
