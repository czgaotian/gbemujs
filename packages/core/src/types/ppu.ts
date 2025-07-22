export enum PPU_MODE {
  HBLANK = 0,
  VBLANK = 1,
  OAM_SCAN = 2,
  DRAWING = 3,
}

export enum PPU_FETCH_STATE {
  TILE = 0,
  DATA0 = 1,
  DATA1 = 2,
  IDLE = 3,
  PUSH = 4,
}

export type BGWPixel = {
  color: number;
  palette: number;
}

export type ObjectPixel = BGWPixel & {
  bgPriority: boolean;
}