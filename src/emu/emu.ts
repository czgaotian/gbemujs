import { CPU } from '../cpu/cpu';
import { busRead, busWrite, busRead16, busWrite16 } from './bus';
import { PPU } from '../ppu/ppu';
import { APU } from '../apu/apu';
import { Joypad } from '../joypad/joypad';
import { Cartridge } from '../cartridge/cartridge';
import { Timer } from '../timer/timer';
import { Serial } from '../serial/serial';
import { INTERRUPT_TYPE as IT } from '../types';
import { EventBus } from '../event/event';

export class GameBoy {
  public cpu: CPU;
  public cartridge: Cartridge;
  public ppu: PPU;
  public apu: APU;
  public joypad: Joypad;
  public timer: Timer;
  public serial: Serial;
  public event: EventBus;

  public lastTime: number;
  public clockCycles: number = 0;
  public clockSpeedScale: number = 1;
  public paused: boolean = false;
  public isDebug: boolean = false;

  public vram: Uint8Array = new Uint8Array(0x2000);
  public wram: Uint8Array = new Uint8Array(0x2000);
  public oam: Uint8Array = new Uint8Array(0xA0);
  public hram: Uint8Array = new Uint8Array(0x80);

  public intFlags: number;
  public intEnableFlags: number;

  constructor() {
    this.cartridge = new Cartridge();
    this.cpu = new CPU(this);
    this.ppu = new PPU(this);
    this.apu = new APU();
    this.joypad = new Joypad();
    this.timer = new Timer(this);
    this.serial = new Serial(this);

    this.lastTime = performance.now();

    // 0xFF0F - The interruption flags.
    this.intFlags = IT.NONE;
    // 0xFFFF - The interruption enabling flags.
    this.intEnableFlags = 0;

    this.event = new EventBus();
  }

  public loadROM(data: Uint8Array): void {
    this.cartridge.loadROM(data);
    console.log('Loaded cartridge:', this.cartridge.getCartridgeInfo());
    this.init();
  }

  public init(): void {
    this.paused = false;
    this.clockCycles = 0;
    this.lastTime = performance.now();

    this.cpu.init();
    this.ppu.init();
    this.timer.init();
    this.serial.init();

    this.vram.fill(0);
    this.wram.fill(0);
    this.oam.fill(0);
    this.hram.fill(0);

    this.intFlags = IT.NONE;
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
    const frameCycles = 4194304.0 * deltaTime * this.clockSpeedScale;
    const endCycles = this.clockCycles + frameCycles;
    while (this.clockCycles < endCycles && !this.paused) {
      this.cpu.step();

      if (this.serial.outputBuffer.length > 0) {
        this.emit('serial', [...this.serial.outputBuffer]);
      }
    }
    this.emit('frame-update', this);
  }

  public tick(cpuCycle: number) {
    const tickCycles = cpuCycle * 4;
    for (let i = 0; i < tickCycles; i++) {
      this.clockCycles++;
      this.timer.tick();
      if (this.clockCycles % 512 === 0) {
        // Serial is ticked at 8192Hz.
        this.serial.tick();
      }
      this.ppu.tick();
    }
  }

  /**
   * @param address u16
   * @return u8 number
   */
  public busRead = busRead.bind(this);
  /**
   * @param address u16
   * @param value u8 number
   * @return void
   */
  public busWrite = busWrite.bind(this);
  /**
   * @param address u16
   * @return u16 number
   */
  public busRead16 = busRead16.bind(this);
  /**
   * @param address u16
   * @param value u16 number
   * @return void
   */
  public busWrite16 = busWrite16.bind(this);

  public on(event: string, callback: (data: any) => void) {
    this.event.on(event, callback);
  }

  public off(event: string) {
    this.event.off(event);
  }

  public emit(event: string, data: any) {
    this.event.emit(event, data);
  }
}
