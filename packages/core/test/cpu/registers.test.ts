import { Registers } from '../../src/cpu/registers';
import { REGISTER_TYPE as RT } from '../../src/types';
import { expect, describe, it, beforeEach } from 'vitest';

describe('Registers', () => {
  const registers = new Registers();

  beforeEach(() => {
    registers.init();
  });

  describe('initialization', () => {
    it('should initialize registers with correct values', () => {
      expect(registers.a).toBe(0x01);
      expect(registers.f).toBe(0xb0);
      expect(registers.b).toBe(0x00);
      expect(registers.c).toBe(0x13);
      expect(registers.d).toBe(0x00);
      expect(registers.e).toBe(0xd8);
      expect(registers.h).toBe(0x01);
      expect(registers.l).toBe(0x4d);
      expect(registers.pc).toBe(0x100);
      expect(registers.sp).toBe(0xfffe);
    });
  });

  describe('8-bit register operations', () => {
    it('should read and write 8-bit registers correctly', () => {
      registers.set8Bit(RT.A, 0xff);
      expect(registers.read8Bit(RT.A)).toBe(0xff);

      registers.set8Bit(RT.B, 0x80);
      expect(registers.read8Bit(RT.B)).toBe(0x80);
    });

    it('should handle overflow in 8-bit registers', () => {
      registers.set8Bit(RT.C, 0x1ff);
      expect(registers.read8Bit(RT.C)).toBe(0xff);
    });

    it('should handle overflow in 16-bit registers', () => {
      registers.set(RT.AF, 0x1ffff);
      expect(registers.read(RT.AF)).toBe(0xffff);
    });
  });

  describe('16-bit register operations', () => {
    it('should read and write 16-bit registers correctly', () => {
      registers.set(RT.AF, 0x1234);
      expect(registers.read(RT.AF)).toBe(0x1234);
      expect(registers.a).toBe(0x12);
      expect(registers.f).toBe(0x34);

      registers.set(RT.PC, 0xef01);
      expect(registers.read(RT.PC)).toBe(0xef01);
    });

    it('should handle overflow in 16-bit registers', () => {
      registers.set(RT.HL, 0x1ffff);
      expect(registers.read(RT.HL)).toBe(0xffff);
    });
  });

  describe('flag operations', () => {
    it('should set and read flags correctly', () => {
      registers.setFlags(1, 0, 1, 0);

      expect(registers.flagZ).toBe(1);
      expect(registers.flagN).toBe(0);
      expect(registers.flagH).toBe(1);
      expect(registers.flagC).toBe(0);
    });

    it('should preserve unmodified flags', () => {
      // Set initial flags
      registers.setFlags(1, 1, 1, 1);

      // Modify only Z and H flags
      registers.setFlags(0, -1, 0, -1);

      expect(registers.flagZ).toBe(0);
      expect(registers.flagN).toBe(1); // Preserved
      expect(registers.flagH).toBe(0);
      expect(registers.flagC).toBe(1); // Preserved
    });

    it('should keep lower 4 bits of F register as 0', () => {
      registers.set(RT.F, 0xff);
      expect(registers.f).toBe(0xf0);
    });
  });
});
