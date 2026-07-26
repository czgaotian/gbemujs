import { CPU } from '../cpu/cpu';
import { busRead, busWrite, busRead16, busWrite16 } from './bus';
import { PPU } from '../ppu/ppu';
import { APU } from '../apu/apu';
import { Joypad } from '../joypad/joypad';
import { Cartridge } from '../cartridge/cartridge';
import { Timer } from '../timer/timer';
import { Serial } from '../serial/serial';
import { INTERRUPT_TYPE as IT, type LoopController } from '../types';
import { EventBus, SERIAL, FRAME_UPDATE } from '../event';
import { PPU_XRES, PPU_YRES } from '../constants/ppu';
import { TICKS_PER_SEC, MAX_TIME_STEP } from '../constants';

const eventBus = new EventBus();

export class GameBoy {
  public cpu: CPU;
  public cartridge: Cartridge;
  public ppu: PPU;
  public apu: APU;
  public joypad: Joypad;
  public timer: Timer;
  public serial: Serial;

  private lastTime = 0;
  private cancelScheduled?: () => void;
  private loopGeneration = 0;
  private isRunning = false;
  public clockCycles: number = 0;
  public clockSpeedScale: number = 1;
  public paused: boolean = false;
  public isDebug: boolean = false;

  public vram: Uint8Array = new Uint8Array(0x2000);
  public wram: Uint8Array = new Uint8Array(0x2000);
  public oam: Uint8Array = new Uint8Array(0xa0);
  public hram: Uint8Array = new Uint8Array(0x80);

  public intFlags: number;
  public intEnableFlags: number;

  constructor(private readonly loopController: LoopController) {
    this.cartridge = new Cartridge();
    this.cpu = new CPU(this);
    this.ppu = new PPU(this);
    this.apu = new APU();
    this.joypad = new Joypad(this);
    this.timer = new Timer(this);
    this.serial = new Serial(this);

    // 0xFF0F - The interruption flags.
    this.intFlags = IT.NONE;
    // 0xFFFF - The interruption enabling flags.
    this.intEnableFlags = 0;
  }

  public loadROM(data: Uint8Array): void {
    this.init();
    this.cartridge.loadROM(data);
    console.log('Loaded cartridge:', this.cartridge.getCartridgeInfo());
  }

  public init(): void {
    this.paused = false;
    this.clockCycles = 0;
    this.cpu.init();
    this.ppu.init();
    this.joypad.init();
    this.timer.init();
    this.serial.init();

    this.vram.fill(0);
    this.wram.fill(0);
    this.oam.fill(0);
    this.hram.fill(0);

    this.intFlags = IT.NONE;
    this.intEnableFlags = 0;
  }

  public start(data: Uint8Array, ramData?: Uint8Array): void {
    this.loadROM(data);
    if (ramData) this.loadRAMData(ramData);

    this.isRunning = true;
    this.loopGeneration += 1;
    this.lastTime = this.loopController.now();
    this.scheduleLoop();
  }

  public close(): void {
    this.isRunning = false;
    this.loopGeneration += 1;
    this.cancelLoop();
  }

  private readonly runLoop = (generation: number): void => {
    if (!this.isRunning || generation !== this.loopGeneration) return;

    this.cancelScheduled = undefined;

    const currentTime = this.loopController.now();
    const deltaTime = Math.min(
      (currentTime - this.lastTime) / 1000,
      MAX_TIME_STEP,
    );
    this.lastTime = currentTime;
    this.update(deltaTime);
    if (this.isRunning && generation === this.loopGeneration) {
      this.scheduleLoop();
    }
  };

  private scheduleLoop(): void {
    this.cancelLoop();
    const generation = this.loopGeneration;
    this.cancelScheduled = this.loopController.schedule(() =>
      this.runLoop(generation),
    );
  }

  private cancelLoop(): void {
    this.cancelScheduled?.();
    this.cancelScheduled = undefined;
  }

  public pause(): void {
    this.paused = true;
  }

  public resume(): void {
    this.paused = false;
  }

  public update(deltaTime: number) {
    this.joypad.update();
    // clock speed is 4194304Hz
    const frameCycles = TICKS_PER_SEC * deltaTime * this.clockSpeedScale;
    const endCycles = this.clockCycles + frameCycles;
    while (this.clockCycles < endCycles && !this.paused) {
      this.cpu.step();

      if (this.serial.outputBuffer.length > 0) {
        this.emit(SERIAL, [...this.serial.outputBuffer]);
      }
    }
  }

  updateFrame() {
    const offset =
      ((this.ppu.currentBackBuffer + 1) % 2) * PPU_XRES * PPU_YRES * 4;
    const frame = this.ppu.pixels.subarray(
      offset,
      offset + PPU_XRES * PPU_YRES * 4,
    );
    this.emit(FRAME_UPDATE, frame);
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

  // 加载持久化的存档数据
  public loadRAMData(data: Uint8Array): boolean {
    return this.cartridge.loadRAMData(data);
  }

  // 获取要持久化的存档数据
  public getRAMData(): Uint8Array | null {
    return this.cartridge.getRAMData();
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

  public on = eventBus.on.bind(eventBus);
  public off = eventBus.off.bind(eventBus);
  public emit = eventBus.emit.bind(eventBus);
}
