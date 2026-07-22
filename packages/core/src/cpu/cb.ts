import { REGISTER_TYPE as RT } from '../types';
import { CPU } from './cpu';

const registerLookup = [RT.B, RT.C, RT.D, RT.E, RT.H, RT.L, RT.HL, RT.A];

function none() {
  console.log('INVALID INSTRUCTION!\n');
}

function decodeRegister(reg: number) {
  if (reg > 0b111) {
    return RT.NONE;
  }

  return registerLookup[reg];
}

export function executeCb(this: CPU): void {
  const op = this.fetchedData;
  const reg = decodeRegister(op & 0b111);
  const bit = (op >>> 3) & 0b111;
  const bitOperation = (op >>> 6) & 0b11;
  let value = this.readRegister8Bit(reg);

  if (reg === RT.HL) {
    this.emulator.tick(1);
  }

  switch (bitOperation) {
    case 1:
      this.setFlags(!(value & (1 << bit)), 0, 1, -1);
      return;

    case 2:
      value &= ~(1 << bit);
      this.setRegister8Bit(reg, value);
      if (reg === RT.HL) {
        this.emulator.tick(1);
      }
      return;

    case 3:
      value |= 1 << bit;
      this.setRegister8Bit(reg, value);
      if (reg === RT.HL) {
        this.emulator.tick(1);
      }
      return;
  }

  const flagC = this.registers.flagC;

  switch (bit) {
    case 0: {
      const setC = !!(value & (1 << 7));
      const result = ((value << 1) & 0xff) | (setC ? 1 : 0);
      this.setRegister8Bit(reg, result);
      if (reg === RT.HL) {
        this.emulator.tick(1);
      }
      this.setFlags(result === 0, false, false, setC);
      return;
    }

    case 1: {
      const old = value;
      value = ((value >>> 1) & 0xff) | ((old & 1) << 7);
      this.setRegister8Bit(reg, value);
      if (reg === RT.HL) {
        this.emulator.tick(1);
      }
      this.setFlags(value === 0, false, false, !!(old & 1));
      return;
    }

    case 2: {
      const c = !!(value & 0x80);
      value = ((value << 1) & 0xff) | flagC;
      this.setRegister8Bit(reg, value);
      if (reg === RT.HL) {
        this.emulator.tick(1);
      }
      this.setFlags(value === 0, false, false, c);
      return;
    }

    case 3: {
      const c = !!(value & 1);
      value = ((value >>> 1) & 0xff) | (flagC << 7);
      this.setRegister8Bit(reg, value);
      if (reg === RT.HL) {
        this.emulator.tick(1);
      }
      this.setFlags(value === 0, false, false, c);
      return;
    }

    case 4: {
      const c = !!(value & 0x80);
      value = (value << 1) & 0xff;
      this.setRegister8Bit(reg, value);
      if (reg === RT.HL) {
        this.emulator.tick(1);
      }
      this.setFlags(value === 0, false, false, c);
      return;
    }

    case 5: {
      const c = !!(value & 1);
      value = (value & 0x80) | ((value >> 1) & 0x7f);
      this.setRegister8Bit(reg, value);
      if (reg === RT.HL) {
        this.emulator.tick(1);
      }
      this.setFlags(value === 0, false, false, c);
      return;
    }

    case 6: {
      value = ((value & 0xf0) >>> 4) | ((value & 0xf) << 4);
      this.setRegister8Bit(reg, value);
      if (reg === RT.HL) {
        this.emulator.tick(1);
      }
      this.setFlags(value === 0, false, false, false);
      return;
    }

    case 7: {
      const old = value;
      value = value >>> 1;
      this.setRegister8Bit(reg, value);
      if (reg === RT.HL) {
        this.emulator.tick(1);
      }
      this.setFlags(value === 0, false, false, !!(old & 1));
      return;
    }
  }

  console.log(`ERROR: INVALID CB: ${op.toString(16)}`);
  none.call(this);
}
