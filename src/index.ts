import { CPU } from './cpu/cpu';
import { MMU } from './mmu/mmu';
import { PPU } from './ppu/ppu';
import { APU } from './apu/apu';
import { Joypad } from './joypad/joypad';

export class GameBoy {
  private cpu: CPU;
  private mmu: MMU;
  private ppu: PPU;
  private apu: APU;
  private joypad: Joypad;

  public paused: boolean = false;
  public running: boolean = false;
  public ticks: number = 0;

  constructor() {
    this.mmu = new MMU();
    this.cpu = new CPU(this.mmu);
    this.ppu = new PPU(this.mmu);
    this.apu = new APU();
    this.joypad = new Joypad();
  }

  private loadROM(data: Uint8Array): void {
    this.mmu.loadROM(data);
    this.reset();
  }

  public reset(): void {
    this.cpu.reset();
    // TODO: 重置其他组件
  }

  public start(data: Uint8Array): void {
    this.loadROM(data);

    this.running = true;
    this.paused = false;
    this.ticks = 0;

    while (this.running) {
      if (!this.paused) {
        this.cpu.step();
      }
      this.ticks++;
    }
  }

  public emuCycle(cpuCycle: number) {}
}

export default GameBoy;
