import { describe, expect, test, vi } from 'vitest';
import { GameBoy } from '../../src/emu/emu';
import { PPU_MODE } from '../../src/types/ppu';

function createGameBoy() {
  const gameBoy = new GameBoy();
  gameBoy.init();
  return gameBoy;
}

describe('PPU', () => {
  test('copies OAM DMA bytes from the selected source page', () => {
    const gameBoy = createGameBoy();
    for (let offset = 0; offset < 0xa0; offset++) {
      gameBoy.wram[offset] = (offset * 3) & 0xff;
    }

    gameBoy.ppu.write(0xff46, 0xc0);
    for (let tick = 0; tick <= 0xa0; tick++) gameBoy.ppu.tickDma();

    expect([...gameBoy.oam]).toEqual(
      Array.from({ length: 0xa0 }, (_, offset) => (offset * 3) & 0xff)
    );
  });

  test('wraps background coordinates at 256 pixels', () => {
    const gameBoy = createGameBoy();
    Object.assign(gameBoy.ppu, {
      scrollX: 8,
      scrollY: 8,
      fetchX: 248,
      ly: 248,
    });
    gameBoy.vram[0x1800] = 0x2a;

    gameBoy.ppu.fetcherGetTile();

    expect(gameBoy.ppu.bgwDataAddrOffset).toBe(0x2a * 16);
  });

  test('uses the raw background colour for behind-background sprite priority', () => {
    const ppu = createGameBoy().ppu;
    ppu.bgwQueue = Array.from({ length: 8 }, () => ({
      color: 1,
      palette: 0xf3,
    }));
    ppu.objQueue = Array.from({ length: 8 }, () => ({
      color: 1,
      palette: 0xff,
      bgPriority: true,
    }));

    ppu.lcdDrawPixel();

    expect([...ppu.pixels.subarray(0, 4)]).toEqual([153, 161, 120, 255]);
  });

  test('starts OAM scan when LCD is enabled after being disabled', () => {
    const ppu = createGameBoy().ppu;
    ppu.write(0xff40, ppu.lcdc & ~0x80);

    ppu.write(0xff40, ppu.lcdc | 0x80);

    expect(ppu.PPUMode).toBe(PPU_MODE.OAM_SCAN);
  });

  test('emits a display frame when the PPU enters VBlank', () => {
    const gameBoy = createGameBoy();
    const updateFrame = vi.spyOn(gameBoy, 'updateFrame');
    Object.assign(gameBoy.ppu, {
      ly: 143,
      lineCycles: 456,
      PPUMode: PPU_MODE.HBLANK,
    });

    gameBoy.ppu.tick();

    expect(gameBoy.ppu.PPUMode).toBe(PPU_MODE.VBLANK);
    expect(updateFrame).toHaveBeenCalledTimes(1);
  });
});
