import { GameBoy } from '../emu/emu';
import { PPU_MODE } from '../types/ppu';
import { bitTest } from '../utils';

export class PPU {
  public emulator: GameBoy;

  // 0xff40 - LCD control
  lcdc: number = 0;
  // 0xff41 - LCD status
  lcds: number = 0;
  // 0xff42 - Scroll Y
  scrollY: number = 0;
  // 0xff43 - Scroll X
  scrollX: number = 0;
  // 0xff44 - LY LCD Y coordinate [Read Only]
  ly: number = 0;
  // 0xff45 - LY LCD Y copare
  lyc: number = 0;
  // 0xff46 - DMA
  dma: number = 0;
  // 0xff47 - BG Palette Data
  bgp: number = 0;
  // 0xff48 - OBJ 0 Palette Data
  obp0: number = 0;
  // 0xff49 - OBJ 1 Palette Data
  obp1: number = 0;
  // 0xff4a - WY (Window Y position plus 7)
  wy: number = 0;
  // 0xff4b - WX (Window X position plus 7)
  wx: number = 0;
  
  constructor(emulator: GameBoy) {
    this.emulator = emulator;
  }

  init() {
    this.lcdc = 0x91;
    this.lcds = 0;
    this.scrollY = 0;
    this.scrollX = 0;
    this.ly = 0;
    this.lyc = 0;
    this.dma = 0;
    this.bgp = 0xfc;
    this.obp0 = 0xff;
    this.obp1 = 0xff;
    this.wy = 0;
    this.wx = 0;
  }

  get enabled() {
    return bitTest(this.lcdc, 7);
  }

  get PPUMode(): PPU_MODE {
    return this.lcds & 0x03;
  }

  set PPUMode(mode: PPU_MODE) {
    this.lcds &= 0xfc;
    this.lcds |= mode;
  }

  
}
