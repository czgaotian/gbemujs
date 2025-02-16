import { bitGet, bitTest } from "../utils";

export class OamEntry {
  y: number;
  x: number;
  tile: number;
  flags: number;

  constructor(y: number, x: number, tile: number, flags: number) {
    this.y = y;
    this.x = x;
    // the tile index in vram
    this.tile = tile;
    // attribute flag
    this.flags = flags;
  }

  get dmgPalette() {
    return bitGet(this.flags, 4);
  }

  get xFlip() {
    return bitTest(this.flags, 5);
  }

  get yFlip() {
    return bitTest(this.flags, 6);
  }

  get priority() {
    return bitTest(this.flags, 7);
  }
}