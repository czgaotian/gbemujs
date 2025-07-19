import { ObjectPixel, PPU_FETCH_STATE } from '../types/ppu';
import { bitGet } from '../utils';
import { PPU } from './ppu';

let count = 0;

export function getTile(this: PPU) {
  if (this.bgWindowEnabled) {
    count++;
    if (count === 3170) {
      // throw new Error('test');
    }
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
    // console.log('address', this.bgwDataArea.toString(16).padStart(4, '0'), (this.bgwDataArea + this.bgwDataAddrOffset + dataIndex).toString(16).padStart(4, '0'));
    this.bgwFetchedData[dataIndex] = this.emulator.busRead(
      this.bgwDataArea + this.bgwDataAddrOffset + dataIndex
    );
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

  // console.log('window', 'x:', windowX, 'y:', windowY);

  const addr =
    ppu.windowMapArea + Math.floor(windowX / 8) + Math.floor(windowY / 8) * 32;

  let tileIndex = ppu.emulator.busRead(addr);

  // console.log('win tile index', tileIndex.toString(16).padStart(4, '0'));

  if (ppu.bgwDataArea === 0x8800) {
    tileIndex = ((tileIndex << 24) >> 24) + 128;
  }

  ppu.bgwDataAddrOffset = tileIndex * 16 + (windowY % 8) * 2;
  ppu.tileXBegin = Math.floor((ppu.fetchX - (ppu.wx - 7)) / 8) * 8 + ppu.wx - 7;
}

function getBackgroundTile(ppu: PPU) {
  // console.log(
  //   'scroll',
  //   'x:',
  //   ppu.scrollX,
  //   'y:',
  //   ppu.scrollY,
  //   ppu.fetchX,
  //   ppu.ly
  // );
  // the position of next pixel to fetch
  const mapY = ppu.ly + ppu.scrollY;
  const mapX = ppu.fetchX + ppu.scrollX;
  // console.log('bg', 'x:', mapX, 'y:', mapY);

  // the address to index of tile
  const addr = ppu.bgMapArea + Math.floor(mapX / 8) + Math.floor(mapY / 8) * 32;
  // console.log(addr.toString(16).padStart(4, '0'))

  // console.log(addr.toString(16).padStart(4, '0'));

  let tileIndex = ppu.emulator.busRead(addr);
  // if (tileIndex) {
  //   count++;
  //   if (count === 400) {
  //     throw new Error('test');
  //   }
  // console.log('x:', mapX,'y:', mapY,addr.toString(16).padStart(4, '0'), tileIndex)
  // };
  // console.log('bg tile index', tileIndex.toString(16).padStart(4, '0'));
  if (ppu.bgwDataArea === 0x8800) {
    // if bgwTile start at 0x8800, the index area is -128 to 127
    tileIndex = ((tileIndex << 24) >> 24) + 128;
  }

  // every tile is 16 bytes, and each line is 2 bytes
  ppu.bgwDataAddrOffset = tileIndex * 16 + (mapY % 8) * 2;
  // console.log('bg', ppu.bgwDataAddrOffset.toString(16).padStart(4, '0'));
  ppu.tileXBegin = Math.floor((ppu.fetchX + ppu.scrollX) / 8) * 8 - ppu.scrollX;
}

function getSpriteTile(ppu: PPU) {
  // TODO maybe remove this propert
  ppu.numFetchedSprites = 0;

  for (let i = 0; i < ppu.sprites.length; i++) {
    const sprite = ppu.sprites[i];
    const spriteX = sprite.x - 8;

    // if first or last pixel of the sprite is in the tile
    if (
      (spriteX >= ppu.tileXBegin && spriteX < ppu.tileXBegin + 8) ||
      (spriteX + 7 > ppu.tileXBegin && spriteX + 7 < ppu.tileXBegin + 8)
    ) {
      ppu.fetchedSprites[ppu.numFetchedSprites] = sprite;
      ppu.numFetchedSprites += 1;
    }

    if (ppu.numFetchedSprites >= 3) {
      break;
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
      tile &= 0xfe;
    }

    ppu.spriteFetchedData[index * 2 + dataIndex] = ppu.emulator.busRead(
      0x8000 + tile * 16 + ty * 2 + dataIndex
    );
  });
}

function pushBgwPixels(ppu: PPU) {
  const [b1, b2] = ppu.bgwFetchedData;

  for (let i = 0; i < 8; i++) {
    if (ppu.tileXBegin + i < 0) {
      continue;
    }

    // console.log('pushX', ppu.pushX);

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
      const lo = bitGet(b1, 7 - i);
      const hi = bitGet(b2, 7 - i) << 1;
      pixel.color = hi | lo;
      pixel.palette = ppu.bgp;
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
      // ppu.fetchedSprites.forEach((sprite, index) => {
      for (let s = 0; s < ppu.numFetchedSprites; s++) {
        const sprite = ppu.fetchedSprites[s];
        const spriteX = sprite.x - 8;
        const offset = i - spriteX;

        if (offset < 0 || offset > 7) continue;

        const b1 = ppu.spriteFetchedData[s * 2];
        const b2 = ppu.spriteFetchedData[s * 2 + 1];
        let bit = 7 - offset;

        if (sprite.xFlip) {
          bit = offset;
        }

        const lo = bitGet(b1, bit);
        const hi = bitGet(b2, bit) << 1;
        const color = hi | lo;

        if (color == 0) {
          continue;
        }

        pixel.color = color;
        pixel.palette = sprite.dmgPalette ? ppu.obp1 : ppu.obp0;
        pixel.bgPriority = sprite.priority;
        break;
      }
    }

    ppu.objQueue.push(pixel);
  }
}
