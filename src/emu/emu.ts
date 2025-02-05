import { CPU } from '../cpu/cpu';
import { Bus } from '../bus/bus';
import { PPU } from '../ppu/ppu';
import { APU } from '../apu/apu';
import { Joypad } from '../joypad/joypad';
import { Cartridge } from '../cartridge/cartridge';

export class GameBoy {
  public cpu: CPU;
  public cartridge: Cartridge;
  public bus: Bus;
  public ppu: PPU;
  public apu: APU;
  public joypad: Joypad;

  public paused: boolean = false;
  public running: boolean = false;
  public ticks: number = 0;

  constructor() {
    this.cartridge = new Cartridge();
    this.bus = new Bus(this);
    this.cpu = new CPU(this);
    this.ppu = new PPU(this);
    this.apu = new APU();
    this.joypad = new Joypad();
  }

  public loadROM(data: Uint8Array): void {
    this.cartridge.loadROM(data);
    console.log("Loaded cartridge:", this.cartridge.getCartridgeInfo());
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

  public emulatorCycle(cpuCycle: number) {
    for (let i = 0; i < cpuCycle; i++)
    {
      for (let j = 0; j < 4; j++)
      {
          this.ticks++;
      }
    }
  }
}
