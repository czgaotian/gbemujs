import { CPU } from "./cpu";
import { AddressMode as AM, RegisterType as RT } from "../types";

export function fetchData(this: CPU) {
  this.memoryDestination = 0;
  this.destinationIsMemory = false;

  if (!this.instruction) {
    return;
  }

  switch (this.instruction.addressMode) {
    case AM.IMPLIED:
      return;

    case AM.R:
      if (!this.instruction.registerType1) {
        throw new Error('Register type is required for R mode');
      }
      this.fetchedData = this.readRegister(this.instruction.registerType1);
      return;

    case AM.R_R:
      if (!this.instruction.registerType2) {
        throw new Error('Register type is required for R_R mode');
      }

      this.fetchedData = this.readRegister(this.instruction.registerType2); 
      return;

    case AM.R_D8:
      this.fetchedData = this.emulator.busRead(this.registers.pc);
      this.emulator.tick(1);
      this.registers.pc++;
      return;

    case AM.R_D16:
    case AM.D16:
      {
        const lo = this.emulator.busRead(this.registers.pc);
        this.emulator.tick(1);

        const hi = this.emulator.busRead(this.registers.pc + 1);
        this.emulator.tick(1);

        this.fetchedData = lo | (hi << 8);

        this.registers.pc += 2;

        return;
      }

    case AM.MR_R:
      if (!this.instruction.registerType2 || !this.instruction.registerType1) {
        throw new Error('Register type is required for MR_R mode');
      }

      this.fetchedData = this.readRegister(this.instruction.registerType2);
      this.memoryDestination = this.readRegister(this.instruction.registerType1);
      this.destinationIsMemory = true;

      if (this.instruction.registerType1 === RT.C) {
        this.memoryDestination |= 0xFF00;
      }
      return;

    case AM.R_MR:
      if (!this.instruction.registerType2) {
        throw new Error('Register type is required for R_MR mode');
      }

      let address = this.readRegister(this.instruction.registerType2);

      if (this.instruction.registerType2 === RT.C) {
        address |= 0xFF00;
      }

      this.fetchedData = this.emulator.busRead(address);
      this.emulator.tick(1);
      return;

    case AM.R_HLI:
      if (!this.instruction.registerType2) {
        throw new Error('Register type is required for R_HLI mode');
      }

      this.fetchedData = this.emulator.busRead(this.readRegister(this.instruction.registerType2));
      this.emulator.tick(1);
      this.setRegister(RT.HL, this.readRegister(RT.HL) + 1);
      return;

    case AM.R_HLD:
      if (!this.instruction.registerType2) {
        throw new Error('Register type is required for R_HLD mode');
      }

      this.fetchedData = this.emulator.busRead(this.readRegister(this.instruction.registerType2));
      this.emulator.tick(1);
      this.setRegister(RT.HL, this.readRegister(RT.HL) - 1);
      return;

    case AM.HLI_R:
      if (!this.instruction.registerType2 || !this.instruction.registerType1) {
        throw new Error('Register type is required for HLI_R mode');
      }

      this.fetchedData = this.readRegister(this.instruction.registerType2);
      this.memoryDestination = this.readRegister(this.instruction.registerType1);
      this.destinationIsMemory = true;
      this.setRegister(RT.HL, this.readRegister(RT.HL) + 1);
      return;

    case AM.HLD_R:
      if (!this.instruction.registerType2 || !this.instruction.registerType1) {
        throw new Error('Register type is required for HLD_R mode');
      }

      this.fetchedData = this.readRegister(this.instruction.registerType2);
      this.memoryDestination = this.readRegister(this.instruction.registerType1);
      this.destinationIsMemory = true;
      this.setRegister(RT.HL, this.readRegister(RT.HL) - 1);
      return;

    case AM.R_A8:
      this.fetchedData = this.emulator.busRead(this.registers.pc);
      this.emulator.tick(1);
      this.registers.pc++;
      return;

    case AM.A8_R:
      this.memoryDestination = this.emulator.busRead(this.registers.pc) | 0xFF00;
      this.destinationIsMemory = true;
      this.emulator.tick(1);
      this.registers.pc++;
      return;

    case AM.HL_SPR:
      this.fetchedData = this.emulator.busRead(this.registers.pc);
      this.emulator.tick(1);
      this.registers.pc++;
      return;

    case AM.D8:
      this.fetchedData = this.emulator.busRead(this.registers.pc);
      this.emulator.tick(1);
      this.registers.pc++;
      return;

    case AM.A16_R:
    case AM.D16_R:
      {
        if (!this.instruction.registerType2) {
          throw new Error('Register type is required for D16_R mode');
        }
        const lo = this.emulator.busRead(this.registers.pc);
        this.emulator.tick(1);

        const hi = this.emulator.busRead(this.registers.pc + 1);
        this.emulator.tick(1);

        this.memoryDestination = lo | (hi << 8);
        this.destinationIsMemory = true;

        this.registers.pc += 2;
        this.fetchedData = this.readRegister(this.instruction.registerType2);
        return;
      }

    case AM.MR_D8:
      if (!this.instruction.registerType1) {
        throw new Error('Register type is required for MR_D8 mode');
      }

      this.fetchedData = this.emulator.busRead(this.registers.pc);
      this.emulator.tick(1);
      this.registers.pc++;
      this.memoryDestination = this.readRegister(this.instruction.registerType1);
      this.destinationIsMemory = true;
      return;

    case AM.MR:
      if (!this.instruction.registerType1) {
        throw new Error('Register type is required for MR mode');
      }

      this.memoryDestination = this.readRegister(this.instruction.registerType1);
      this.destinationIsMemory = true;
      this.fetchedData = this.emulator.busRead(this.readRegister(this.instruction.registerType1));
      this.emulator.tick(1);
      return;

    case AM.R_A16:
      {
        const lo = this.emulator.busRead(this.registers.pc);
        this.emulator.tick(1);

        const hi = this.emulator.busRead(this.registers.pc + 1);
        this.emulator.tick(1);

        const addr = lo | (hi << 8);

        this.registers.pc += 2;
        this.fetchedData = this.emulator.busRead(addr);
        this.emulator.tick(1);
        return;
      }

    default:
      throw new Error(`Unknown Addressing Mode! ${this.instruction.addressMode} (${this.opcode.toString(16)})`);
  }
}
