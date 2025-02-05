import { InstructionType as IN, InstructionType } from '../types';
import { CPU } from './cpu';

function NOP() {}

function NONE() {
  console.log('INVALID INSTRUCTION!\n');
  process.exit(-7);
}

function DI(this: CPU) {
  this.intMasterEnabled = false;
}

function LD(this: CPU) {
  // TODO...
}

function XOR(this: CPU) {
  this.registers.a ^= this.fetchedData & 0xff;
  this.cpuSetFlags(this.registers.a == 0, false, false, false);
}

function JP( this: CPU) {
  if (this.checkCondition()) {
    this.registers.pc = this.fetchedData;
    // this.emuCycle(1);
  }
}

export const processorMap: Record<InstructionType, Function> = {
  [IN.NONE]: NONE,
  [IN.NOP]: NOP,
  [IN.LD]: LD,
  [IN.JP]: JP,
  [IN.DI]: DI,
  [IN.XOR]: XOR,
};
