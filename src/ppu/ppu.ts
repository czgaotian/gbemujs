import { GameBoy } from '../emu/emu';
import { INTERRUPT_TYPE } from '../types/cpu';
import { PPU_MODE } from '../types/ppu';
import { bitGet, bitSet, bitTest } from '../utils';
import { tickOamScan, tickDrawing, tickHBlank, tickVBlank } from './statusMachine';

export class PPU {
  public emulator: GameBoy;

  // 0xff40 lcds - LCD control
  // 0xff41 lcds - LCD status
  // 0xff42 scrollY - Scroll Y
  // 0xff43 scrollX - Scroll X
  // 0xff44 ly - LCD Y coordinate [Read Only]
  // 0xff45 lyc - LCD Y compare
  // 0xff46 dma - DMA
  // 0xff47 bgp - BG Palette Data
  // 0xff48 obp0 - OBJ 0 Palette Data
  // 0xff49 obp1 - OBJ 1 Palette Data
  // 0xff4a wy - Window Y position plus 7
  // 0xff4b wx - Window X position plus 7
  private _registers = new Uint8Array(12);

  public lineCycles: number = 0;
  
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

    this.PPUMode = PPU_MODE.OAM_SCAN;
    this.lineCycles = 0;
  }

  tick() {
    if (!this.enabled) return;

    this.lineCycles++;

    switch (this.PPUMode) {
      case PPU_MODE.OAM_SCAN:
        this.tickOamScan();
        break;
      case PPU_MODE.DRAWING:
        this.tickDrawing();
        break;
      case PPU_MODE.HBLANK:
        this.tickHBlank();
        break;
      case PPU_MODE.VBLANK:
        this.tickVBlank();
        break;
    }
  }

  read(address: number) {
    if (address >= 0xff40 && address <= 0xff4b) {
      return this._registers[address - 0xff40];
    }
    // throw error
    return 0xff;
  }

  write(address: number, value: number) {
    if (address >= 0xff40 && address <= 0xff4b) {
      if (address === 0xff40 && this.enabled && !bitTest(value, 7)) {
        // Reset mode to HBLANK
        this.lcds &= 0x7c;
        this.ly = 0;
        this.lineCycles = 0;
      }
      if (address === 0xff41) {
        this.lcds = (this.lcds & 0x07) | (value & 0xf8);
        return;
      }
      if (address === 0xff44) return;
      this._registers[address - 0xff40] = value;
    }
  }

  get lcdc() {
    return this._registers[0];
  }

  set lcdc(value: number) {
    this._registers[0] = value;
  }

  get lcds() {
    return this._registers[1];
  }

  set lcds(value: number) {
    this._registers[1] = value;
  }

  get scrollY() {
    return this._registers[2];
  }

  set scrollY(value: number) {
    this._registers[2] = value; 
  }

  get scrollX() {
    return this._registers[3];
  } 

  set scrollX(value: number) {
    this._registers[3] = value;
  }   

  get ly() {
    return this._registers[4];
  }

  set ly(value: number) {
    this._registers[4] = value;
  } 

  get lyc() {
    return this._registers[5];
  }

  set lyc(value: number) {
    this._registers[5] = value;
  }

  get dma() {
    return this._registers[6];
  }

  set dma(value: number) {
    this._registers[6] = value;
  }   

  get bgp() {
    return this._registers[7];
  }

  set bgp(value: number) {
    this._registers[7] = value;
  }

  get obp0() {
    return this._registers[8];
  }

  set obp0(value: number) {
    this._registers[8] = value;
  }

  get obp1() {
    return this._registers[9];
  }

  set obp1(value: number) {
    this._registers[9] = value;
  }

  get wy() {
    return this._registers[10];
  }

  set wy(value: number) {
    this._registers[10] = value;
  }

  get wx() {
    return this._registers[11];
  }

  set wx(value: number) {
    this._registers[11] = value;
  }

  get enabled() {
    return bitTest(this.lcdc, 7);
  }

  get lycFlag() {
    return bitGet(this.lcds, 2);
  }

  set lycFlag(value: 0 | 1) {
    this.lcds = bitSet(this.lcds, 2, !!value);
  }

  get hblankIntEnabled() {
    return bitTest(this.lcds, 3);
  }

  get vblankIntEnabled() {
    return bitTest(this.lcds, 4);
  }

  get oamIntEnabled() {
    return bitTest(this.lcds, 5);
  }

  get lycIntEnabled() {
    return bitTest(this.lcds, 6);
  }

  get PPUMode(): PPU_MODE {
    return this.lcds & 0x03;
  }

  set PPUMode(mode: PPU_MODE) {
    this.lcds &= 0xfc;
    this.lcds |= mode;
  }

  tickOamScan = tickOamScan.bind(this);
  tickDrawing = tickDrawing.bind(this);
  tickHBlank = tickHBlank.bind(this);
  tickVBlank = tickVBlank.bind(this);

  increaseLy() {
    this.ly++;
    if (this.ly === this.lyc) {
      this.lycFlag = 1;
      if (this.lycIntEnabled) {
        this.emulator.intFlags |= INTERRUPT_TYPE.LCD_STAT;
      }
    } else {
      this.lycFlag = 0;
    }
  }
}
