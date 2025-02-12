import { PPU_CYCLES_PER_LINE, PPU_LINES_PER_FRAME, PPU_YRES } from "../constants/ppu";
import { INTERRUPT_TYPE } from "../types/cpu";
import { PPU_MODE } from "../types/ppu";
import { PPU } from "./ppu";

export function tickOamScan(this: PPU) {
  if (this.lineCycles >= 80) {
    this.PPUMode = PPU_MODE.DRAWING;
  }
}

export function tickDrawing(this: PPU) {
  // wait for 289 cycles for drawing, add 80 cycles for oam
  if (this.lineCycles >= 369) {
    this.PPUMode = PPU_MODE.HBLANK;
    if (this.hblankIntEnabled) {
      this.emulator.intFlags |= INTERRUPT_TYPE.VBLANK;
    }
  }
}

export function tickHBlank(this: PPU) {
  if (this.lineCycles >= PPU_CYCLES_PER_LINE) {
    this.increaseLy();

    if (this.ly >= PPU_YRES) {
      this.PPUMode = PPU_MODE.VBLANK;
      this.emulator.intFlags |= INTERRUPT_TYPE.VBLANK;
      if (this.vblankIntEnabled) {
        this.emulator.intFlags |= INTERRUPT_TYPE.LCD_STAT;
      }
    } else {
      this.PPUMode = PPU_MODE.OAM_SCAN;
      if (this.oamIntEnabled) {
        this.emulator.intFlags |= INTERRUPT_TYPE.LCD_STAT;
      }
    }

    this.lineCycles = 0;
  }
}

export function tickVBlank(this: PPU) {
  if (this.lineCycles >= PPU_CYCLES_PER_LINE) {
    this.increaseLy();
    if (this.ly >= PPU_LINES_PER_FRAME) {
      this.PPUMode = PPU_MODE.OAM_SCAN;
      this.ly = 0;
      if (this.oamIntEnabled) {
        this.emulator.intFlags |= INTERRUPT_TYPE.LCD_STAT;
      }
    }
    this.lineCycles = 0;
  }
}