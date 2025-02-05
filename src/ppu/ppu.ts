import { MMU } from '../mmu/mmu';

export class PPU {
  private mmu: MMU;

  constructor(mmu: MMU) {
    this.mmu = mmu;
  }
}
