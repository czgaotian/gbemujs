import { GameBoy } from '../emu/emu';

export class PPU {
  public emulator: GameBoy;

  constructor(emulator: GameBoy) {
    this.emulator = emulator;
  }
}
