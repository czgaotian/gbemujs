import { CPU } from '../cpu/cpu';
import { busRead, busWrite, busRead16, busWrite16 } from './bus';
import { PPU } from '../ppu/ppu';
import { APU } from '../apu/apu';
import { Joypad } from '../joypad/joypad';
import { Cartridge } from '../cartridge/cartridge';
import { Timer } from '../timer/timer';
import { Serial } from '../serial/serial';

export class GameBoy {
  public cpu: CPU;
  public cartridge: Cartridge;
  public ppu: PPU;
  public apu: APU;
  public joypad: Joypad;
  public timer: Timer;
  public serial: Serial;

  public lastTime: number;
  public clockCycles: number = 0;
  public clockSpeedScale: number = 1;
  public paused: boolean = false;
  public isDebug: boolean = false;

  public vram: Uint8Array;
  public wram: Uint8Array;
  public hram: Uint8Array;

  public intFlags: number;
  public intEnableFlags: number;

  constructor() {
    this.cartridge = new Cartridge();
    this.cpu = new CPU(this);
    this.ppu = new PPU(this);
    this.apu = new APU();
    this.joypad = new Joypad();
    this.timer = new Timer();
    this.serial = new Serial(this);

    this.lastTime = performance.now();

    this.vram = new Uint8Array(0x2000); // video ram
    this.wram = new Uint8Array(0x2000); // working ram
    this.hram = new Uint8Array(0x80); // high ram

    // 0xFF0F - The interruption flags.
    this.intFlags = 0;
    // 0xFFFF - The interruption enabling flags.
    this.intEnableFlags = 0;
  }

  public loadROM(data: Uint8Array): void {
    this.cartridge.loadROM(data);
    console.log("Loaded cartridge:", this.cartridge.getCartridgeInfo());
    this.init();
  }

  public init(): void {
    this.paused = false;
    this.clockCycles = 0;
    this.lastTime = performance.now();

    this.cpu.init();
    this.timer.init();
    this.serial.init();

    this.wram.fill(0);
    this.hram.fill(0);

    this.intFlags = 0;
    this.intEnableFlags = 0;
  }

  public start(data: Uint8Array): void {
    this.loadROM(data);
    requestAnimationFrame(this.emulatorLoop.bind(this));
  }

  public pause(): void {
    this.paused = true;
  }

  public resume(): void {
    this.paused = false;
  }

  public emulatorLoop(currentTime: number) {
    const deltaTime = Math.min(currentTime - this.lastTime, 0.125);
    this.lastTime = currentTime;
    this.update(deltaTime);
    requestAnimationFrame(this.emulatorLoop.bind(this));
  }

  public update(deltaTime: number) {
    // clock speed is 4194304Hz
    const frameCycles = (4194304.0 * deltaTime) * this.clockSpeedScale;
    const endCycles = this.clockCycles + frameCycles;
    while (this.clockCycles < endCycles && !this.paused) {
      this.cpu.step();

      if (this.serial.outputBuffer.length > 0) {
        let c = this.serial.outputBuffer.shift();
        if (c) {
          console.log(String.fromCharCode(c));
        }
      }
    }
  }

  public tick(cpuCycle: number) {
    for (let i = 0; i < cpuCycle; i++) {
      for (let j = 0; j < 4; j++) {
        this.clockCycles++;
        this.timer.tick();
        if ((this.clockCycles % 512) ===  0) {
          // Serial is ticked at 8192Hz.
          this.serial.tick();
        }
      }
    }
  }

  /**
   * @param address
   * @return u8 number
   */
  public busRead = busRead.bind(this);
  /**
   * @param address
   * @param value u8 number
   * @return void
   */
  public busWrite = busWrite.bind(this);
  /**
   * @param address
   * @return u16 number
   */
  public busRead16 = busRead16.bind(this);
  /**
   * @param address
   * @param value u16 number
   * @return void
   */
  public busWrite16 = busWrite16.bind(this);
}
