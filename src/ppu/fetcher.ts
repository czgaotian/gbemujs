import { ObjectPixel, PPU_FETCH_STATE } from "../types/ppu";
import { bitGet } from "../utils";
import { PPU } from "./ppu";

export function getTile(this: PPU) {
  if (this.bgWindowEnabled) {
    if (this.fetchWindow) {
      getWindowTile(this);
    } else {
      getBackgroundTile(this);
    }
  } else {
    // if bg and window render closed, still need to update tileXBegin for sprite rendering
    this.tileXBegin = this.fetchX;
  }

  if (this.objEnabled) {
    getSpriteTile(this);
  }

  this.fetchState = PPU_FETCH_STATE.DATA0;
  this.fetchX += 8;
}

export function getData(this: PPU, dataIndex: number) {
  if (this.bgWindowEnabled) {
    this.bgwFetchedData[dataIndex] = this.emulator.busRead(this.bgwDataArea + this.bgwDataAddrOffset + dataIndex);
  }
  if (this.objEnabled) {
    getSpriteData(this, dataIndex);
  }
  if (dataIndex === 0) this.fetchState = PPU_FETCH_STATE.DATA1;
  else this.fetchState = PPU_FETCH_STATE.IDLE;
}

export function pushPixels(this: PPU) {
  let pushed = false;
  
  if (this.bgwQueue.length < 8) {
    const pushBegin = this.pushX;
    pushBgwPixels(this);
    const pushEnd = this.pushX;
    pushSpritePixels(this, pushBegin, pushEnd);
    pushed = true;
  }

  if (pushed) this.fetchState = PPU_FETCH_STATE.TILE;
}


function getWindowTile(ppu: PPU) {
  const windowX = ppu.fetchX + 7 - ppu.wx;
  const windowY = ppu.windowLine;

  const addr = ppu.windowMapArea + Math.floor(windowX / 8) + (Math.floor(windowY / 8) * 32);

  let tileIndex = ppu.emulator.busRead(addr);

  if (ppu.bgwDataArea === 0x8800) {
    tileIndex = tileIndex + 128;
  } 

  ppu.bgwDataAddrOffset = tileIndex * 16 + (windowY % 8) * 2;
  // wx is Window X position plus 7, so the start x is fetchX - (wx - 7)
  ppu.tileXBegin = Math.floor((ppu.fetchX - (ppu.wx - 7)) / 8) * 8 - (ppu.wx - 7);
}

function getBackgroundTile(ppu: PPU) {
  // the position of next pixel to fetch 
  const mapY = ppu.ly + ppu.scrollY;
  const mapX = ppu.fetchX + ppu.scrollX;

  // the address to index of tile
  const addr = ppu.bgMapArea + Math.floor(mapX / 8) + (Math.floor(mapY / 8) * 32);

  let tileIndex = ppu.emulator.busRead(addr);
  if (ppu.bgwDataArea === 0x8800) {
    // if bgwTile start at 0x8800, the index area is -128 to 127
    tileIndex = tileIndex + 128;
  } 

  // every tile is 16 bytes, and each line is 2 bytes
  ppu.bgwDataAddrOffset = tileIndex * 16 + (mapY % 8) * 2;
  ppu.tileXBegin = Math.floor((ppu.fetchX + ppu.scrollX) / 8) * 8 - ppu.scrollX;
}

function getSpriteTile(ppu: PPU) {
  // TODO maybe remove this property
  ppu.numFetchedSprites = 0;

  for (let i = 0; i < ppu.sprites.length; i++) {
    const sprite = ppu.sprites[i];
    const spriteX = sprite.x - 8;

    // if first or last pixel of the sprite is in the tile
    if (((spriteX >= ppu.tileXBegin) && (spriteX < ppu.tileXBegin + 8)) ||
      ((spriteX + 7 > ppu.tileXBegin) && (spriteX + 7 < ppu.tileXBegin + 8))) {
        ppu.fetchedSprites[ppu.numFetchedSprites] = sprite;
        ppu.numFetchedSprites += 1;
    }

    if (ppu.numFetchedSprites >= 3) {
      return;
    }
  }
}

function getSpriteData(ppu: PPU, dataIndex: number) {
  const spriteHeight = ppu.objHeight;

  ppu.fetchedSprites.forEach((sprite, index) => {
    let ty = ppu.ly + 16 - sprite.y;

    if (sprite.yFlip) {
      ty = spriteHeight - ty - 1;
    }

    let tile = sprite.tile;

    if (spriteHeight === 16) {
      tile &= 0xFE;
    }

    ppu.spriteFetchedData[index * 2 + dataIndex] = ppu.emulator.busRead(0x8000 + (tile * 16) + ty * 2 + dataIndex);
  })
}

function pushBgwPixels(ppu: PPU) {
  const [b1, b2] = ppu.bgwFetchedData;

  for (let i = 0; i < 8; i++) {
    if (ppu.tileXBegin + i < 0) {
      continue;
    }

    if (!ppu.fetchWindow && ppu.isPixelWindow(ppu.pushX, ppu.ly)) {
      ppu.fetchWindow = true;
      ppu.fetchX = ppu.pushX;
      break;
    }

    const pixel = {
      color: 0,
      palette: 0,
    };
    if (ppu.bgWindowEnabled) {
      if (ppu.fetchWindow) {
        const lo = bitGet(b1, 7 - i);
        const hi = bitGet(b2, 7 - i);
        pixel.color = lo | hi;
        pixel.palette = ppu.bgp;
      }
    }
    ppu.bgwQueue.push(pixel);
    ppu.pushX += 1;
  }
}

function pushSpritePixels(ppu: PPU, pushBegin: number, pushEnd: number) {
  for (let i = pushBegin; i < pushEnd; i++) {
    const pixel: ObjectPixel = {
      color: 0,
      palette: 0,
      bgPriority: true,
    };

    if (ppu.objEnabled) {
      ppu.fetchedSprites.forEach((sprite, index) => {
        const spriteX = sprite.x - 8;
        const offset = index - spriteX;

        if (offset < 0 || offset> 7) return;

        const b1 = ppu.spriteFetchedData[index * 2];
        const b2 = ppu.spriteFetchedData[index * 2 + 1];
        let bit = 7 - offset;

        if (sprite.xFlip) {
          bit = offset;
        }
        
        const lo = bitGet(b1, bit);
        const hi = bitGet(b2, bit) << 1;
        const color = lo | hi;

        if (color == 0){
          return;
        }

        pixel.color = color;
        pixel.palette = sprite.dmgPalette ? ppu.obp1 : ppu.obp0;
        pixel.bgPriority = sprite.priority;
      })
    }
    
    ppu.objQueue.push(pixel);
  }
}
