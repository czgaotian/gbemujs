import { PPU_XRES, PPU_YRES } from '../constants/ppu';
import { GameBoy } from '../emu/emu';
import { INTERRUPT_TYPE } from '../types/cpu';
import { BGWPixel, ObjectPixel, PPU_FETCH_STATE, PPU_MODE } from '../types/ppu';
import { bitGet, bitSet, bitTest } from '../utils';
import { tickOamScan, tickDrawing, tickHBlank, tickVBlank } from './statusMachine';
import { getTile, getData, pushPixels } from './fetcher';
import { applyPalette } from '../utils/ppu';
import { pixelOffset } from '../utils/ppu';
import { OamEntry } from './oam';

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

  // fetcher
  public bgwQueue: BGWPixel[] = [];
  fetchWindow = false;
  windowLine: number = 0;
  fetchState: PPU_FETCH_STATE = PPU_FETCH_STATE.IDLE;
  fetchX: number = 0;
  bgwDataAddrOffset: number = 0;
  tileXBegin: number = 0;
  // The fetched background/window data in PPU_FETCH_STATE.DATA0 and PPU_FETCH_STATE.DATA1 step.
  bgwFetchedData: [number, number] = [0, 0];
  pushX: number = 0;
  drawX: number = 0;

  public pixels = new Uint8ClampedArray(PPU_XRES * PPU_YRES * 4 * 2);
  public currentBackBuffer = 0;

  // dma
  dmaActive: boolean = false;
  dmaOffset: number = 0;
  dmaStartDelay: number = 0;

  public lineCycles: number = 0;

  // the FIFO queue for sprites
  objQueue: ObjectPixel[] = [];
  // the loaded sprites
  sprites: OamEntry[] = [];
  // the sprites used in current fetch
  fetchedSprites: OamEntry[] = [];
  numFetchedSprites: number = 0;
  // store the sprite pixels in FETCH_STATE.DATA0 and FETCH_STATE.DATA1
  spriteFetchedData = new Uint8Array(6);

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

    this.pixels.fill(0);
    this.currentBackBuffer = 0;

    this.dmaActive = false;
    this.dmaOffset = 0;
    this.dmaStartDelay = 0;

    this.lineCycles = 0;
  }

  tick() {
    if (this.emulator.clockCycles % 4 === 0) {
      this.tickDma();
    }

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

  tickDma() {
    if (!this.dmaActive) return;

    if (this.dmaStartDelay > 0) {
      this.dmaStartDelay--;
      return;
    }
    this.emulator.oam[this.dmaOffset] = this.emulator.busRead((this.dma << 8) + this.dmaOffset);
    this.dmaOffset++;
    this.dmaActive = this.dmaOffset < 0xA0;
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
      if (address === 0xff46) {
        this.dmaActive = true;
        this.dmaOffset = 0;
        this.dmaStartDelay = 1;
        return;
      }
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

  get windowMapArea() {
    return bitTest(this.lcdc, 6) ? 0x9c00 : 0x9800;
  }

  get windowEnabled() {
    return bitTest(this.lcdc, 5);
  }

  get bgwDataArea() {
    return bitTest(this.lcdc, 4) ? 0x8000 : 0x8800;
  }

  get bgMapArea() {
    return bitTest(this.lcdc, 3) ? 0x9c00 : 0x9800;
  }

  get objHeight() {
    return bitTest(this.lcdc, 2) ? 16 : 8;
  }

  get objEnabled() {
    return bitTest(this.lcdc, 1);
  }

  get bgWindowEnabled() {
    return bitTest(this.lcdc, 0);
  }


  get lycIntEnabled() {
    return bitTest(this.lcds, 6);
  }

  get oamIntEnabled() {
    return bitTest(this.lcds, 5);
  }

  get vblankIntEnabled() {
    return bitTest(this.lcds, 4);
  }

  get hblankIntEnabled() {
    return bitTest(this.lcds, 3);
  }

  get lycFlag() {
    return bitGet(this.lcds, 2);
  }

  set lycFlag(value: 0 | 1) {
    this.lcds = bitSet(this.lcds, 2, !!value);
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
    // check current line is crossing window
    if (this.windowVisible && this.ly >= this.wy && this.ly < this.wy + PPU_YRES) {
      this.windowLine++;
    }
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

  // 166 is hardware bug 
  // https://gbdev.io/pandocs/Scrolling.html#ff4aff4b--wy-wx-window-y-position-x-position-plus-7
  get windowVisible() {
    return this.windowEnabled && this.wx <= 166 && this.wy < PPU_YRES;
  }

  // + 7 is hardware bug 
  // https://gbdev.io/pandocs/Scrolling.html#ff4aff4b--wy-wx-window-y-position-x-position-plus-7
  isPixelWindow(screenX: number, screenY: number) {
    return this.windowVisible && (screenX + 7 >= this.wx) && (screenY >= this.wy);
  }

  fetcherGetTile = getTile.bind(this);
  fetcherGetData = getData.bind(this);
  fetcherPushPixels = pushPixels.bind(this);

  lcdDrawPixel(this: PPU) {
    if (this.bgwQueue.length >= 8) {
      if (this.drawX >= PPU_XRES) return;

      const bgwPixel = this.bgwQueue.shift() as BGWPixel;
      const objPixel = this.objQueue.shift() as ObjectPixel;

      const bgColor = applyPalette(bgwPixel.color, bgwPixel.palette);
      const drawObj = objPixel.color && (!objPixel.bgPriority || bgColor === 0);
      const objColor = applyPalette(objPixel.color, objPixel.palette & 0xfc);

      const color = drawObj ? objColor : bgColor;

      switch (color) {
        case 0: this.setPixel(this.drawX, this.ly, 153, 161, 120, 255); break;
        case 1: this.setPixel(this.drawX, this.ly, 87, 93, 67, 255); break;
        case 2: this.setPixel(this.drawX, this.ly, 42, 46, 32, 255); break;
        case 3: this.setPixel(this.drawX, this.ly, 10, 10, 2, 255); break;
      }

      this.drawX++;
    }
  }

  setPixel(this: PPU, x: number, y: number, r: number, g: number, b: number, a: number) {
    if (x < 0 || x >= PPU_XRES || y < 0 || y >= PPU_YRES) {
      throw new Error(`Invalid pixel coordinates: x=${x}, y=${y}`);
    };

    const offset = pixelOffset(this.currentBackBuffer * PPU_XRES * PPU_YRES * 4, x, y, 4, PPU_XRES * 4);

    this.pixels[offset] = r;
    this.pixels[offset + 1] = g;
    this.pixels[offset + 2] = b;
    this.pixels[offset + 3] = a;
  }
}
