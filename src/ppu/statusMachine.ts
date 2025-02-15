import { PPU_CYCLES_PER_LINE, PPU_LINES_PER_FRAME, PPU_XRES, PPU_YRES } from "../constants/ppu";
import { INTERRUPT_TYPE } from "../types/cpu";
import { PPU_FETCH_STATE, PPU_MODE } from "../types/ppu";
import { PPU } from "./ppu";
import { OamEntry } from "./oam";

export function tickOamScan(this: PPU) {
  if (this.lineCycles >= 80) {
    this.PPUMode = PPU_MODE.DRAWING;
    this.fetchWindow = false;
    this.fetchState = PPU_FETCH_STATE.IDLE;
    this.fetchX = 0;
    this.pushX = 0;
    this.drawX = 0;
    this.bgwQueue.length = 0;
  }

  // get all sprites in one cycle
  if (this.lineCycles === 1) {
    this.sprites.length = 0;
    
    const spriteHeight = this.objHeight;

    for (let i = 0; i < 40; i++) {
      if (this.sprites.length >= 10) {
        break;
      }

      // load sprite data from oam
      const entry = new OamEntry(
        this.emulator.oam[i],
        this.emulator.oam[i + 1],
        this.emulator.oam[i + 2],
        this.emulator.oam[i + 3]
      );

      if (entry.y <= this.ly + 16 && entry.y + spriteHeight > this.ly + 16) {
        const index = this.sprites.findIndex(s => s.x > entry.x);
        if (index === -1) {
          this.sprites.push(entry);
        } else {
          this.sprites.splice(index, 0, entry);
        }
      }
    }
  }
}

export function tickDrawing(this: PPU) {
  if ((this.lineCycles % 2) == 0) {
    switch (this.fetchState) {
      case PPU_FETCH_STATE.TILE:
        this.fetcherGetTile();
        break;
      case PPU_FETCH_STATE.DATA0:
        this.fetcherGetData(0);
        break;
      case PPU_FETCH_STATE.DATA1:
        this.fetcherGetData(1);
        break;
      case PPU_FETCH_STATE.IDLE:
        this.fetchState = PPU_FETCH_STATE.PUSH;
        break;
      case PPU_FETCH_STATE.PUSH:
        this.fetcherPushPixels();
        break;
      default:
        throw new Error(`Invalid fetch state: ${this.fetchState}`);
    }
  }
  if (this.drawX >= PPU_XRES) {
    // 289 cycles for drawing, add 80 cycles for oam
    if (this.lineCycles >= 252 && this.lineCycles <= 369) {
      throw new Error(`Drawing lineCycles: ${this.lineCycles}`);
    }
    this.PPUMode = PPU_MODE.HBLANK;
    if (this.hblankIntEnabled) {
      this.emulator.intFlags |= INTERRUPT_TYPE.LCD_STAT;
    }
  }
  this.lcdDrawPixel();
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
      // swap back buffers
      this.currentBackBuffer = (this.currentBackBuffer + 1) % 2;
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
      this.windowLine = 0;
      if (this.oamIntEnabled) {
        this.emulator.intFlags |= INTERRUPT_TYPE.LCD_STAT;
      }
    }
    this.lineCycles = 0;
  }
}