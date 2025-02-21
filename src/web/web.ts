import { GameBoy } from '../emu/emu';
import { PALETTE, PPU_XRES, PPU_YRES } from '../constants/ppu';
import { registerFDisplay } from '../utils/cpu';
import { cssString, domString } from './template';

export class GameBoyDom extends HTMLElement {
  gameBoy: GameBoy;

  constructor() {
    super();
    this.gameBoy = new GameBoy();
  }

  connectedCallback() {
    const shadow = this.attachShadow({ mode: 'open' });

    const template = document.createElement('template');
    template.innerHTML = domString;
    const css = document.createElement('style');
    css.textContent = cssString;

    shadow.appendChild(template.content);
    shadow.appendChild(css);

    const fileInput = shadow.getElementById('rom-file') as HTMLInputElement;
    fileInput.addEventListener('change', (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e: Event) => {
        const arrayBuffer = (e.target as FileReader).result;
        const uint8Array = new Uint8Array(arrayBuffer as ArrayBuffer);
        this.gameBoy.start(uint8Array);
      };
      reader.readAsArrayBuffer(file);
    });

    const pauseButton = shadow.getElementById('pause') as HTMLButtonElement;
    pauseButton.addEventListener('click', () => {
      if (this.gameBoy.paused) {
        this.gameBoy.resume();
        pauseButton.textContent = 'Pause';
      } else {
        this.gameBoy.pause();
        pauseButton.textContent = 'Resume';
      }
    });

    const stepButton = shadow.getElementById('step') as HTMLButtonElement;
    stepButton.addEventListener('click', () => {
      // gb.isDebug = true;
      this.gameBoy.cpu.step();
      // gb.isDebug = false;
    });

    const consoleButton = shadow.getElementById('console') as HTMLButtonElement;
    consoleButton.addEventListener('click', () => {
      console.log(this.gameBoy);
    });

    this.gameBoy.on('serial', (data: number[]) => {
      const serialOutput = shadow.getElementById(
        'serial-output'
      ) as HTMLPreElement;
      const text = data.reduce(
        (acc, curr) => acc + String.fromCharCode(curr),
        ''
      );
      serialOutput.textContent = text;
    });

    const screen = shadow.getElementById('screen') as HTMLCanvasElement;
    const canvas = shadow.getElementById('tile-canvas') as HTMLCanvasElement;
    const status = shadow.getElementById('status') as HTMLPreElement;

    this.gameBoy.on('frame-update', (frame: Uint8ClampedArray) => {
      emuInfoRender(status, this.gameBoy);
      tileRender(canvas, this.gameBoy);
      screenRender(screen, frame);
    });

    window.addEventListener('keyup', (e) => handleKeyEvent(e, true));
    window.addEventListener('keydown', (e) => handleKeyEvent(e, false));

    const handleKeyEvent = (e: KeyboardEvent, isPressed: boolean) => {
      switch (e.code) {
        case 'KeyW':
          this.gameBoy.joypad.up = isPressed;
        case 'KeyA':
          this.gameBoy.joypad.left = isPressed;
        case 'KeyS':
          this.gameBoy.joypad.down = isPressed;
        case 'KeyD':
          this.gameBoy.joypad.right = isPressed;
        case 'KeyG':
          this.gameBoy.joypad.select = isPressed;
        case 'KeyH':
          this.gameBoy.joypad.start = isPressed;
        case 'KeyJ':
          this.gameBoy.joypad.a = isPressed;
        case 'KeyK':
          this.gameBoy.joypad.b = isPressed;
      }
    };
  }
}

function emuInfoRender(dom: HTMLPreElement, gameBoy: GameBoy) {
  dom.textContent = `---- CPU ----
PC: ${gameBoy.cpu.registers.pc
    .toString(16)
    .padStart(4, '0')} SP: ${gameBoy.cpu.registers.sp
    .toString(16)
    .padStart(4, '0')}
A: ${gameBoy.cpu.registers.a
    .toString(16)
    .padStart(4, '0')} F: ${registerFDisplay(gameBoy.cpu.registers.f)}
BC: ${gameBoy.cpu.registers.bc
    .toString(16)
    .padStart(4, '0')} DE: ${gameBoy.cpu.registers.de
    .toString(16)
    .padStart(4, '0')}
HL: ${gameBoy.cpu.registers.hl.toString(16).padStart(4, '0')}
`;
}

function tileRender(canvas: HTMLCanvasElement, emulator: GameBoy): void {
  const width = 128;
  const height = 192;
  const bitMap = new Uint8ClampedArray(width * height * 4);
  const vram = emulator.vram;

  for (let i = 0; i < 384; i += 1) {
    let px = (i % 16) * 8;
    let py = Math.floor(i / 16) * 8;

    for (let y = 0; y < 8; y += 1) {
      const tileLine1 = vram[i * 16 + y * 2];
      const tileLine2 = vram[i * 16 + y * 2 + 1];
      for (let x = 0; x < 8; x += 1) {
        const dx = 7 - x;
        const colorId =
          ((tileLine1 >> dx) & 1) | (((tileLine2 >> dx) & 1) << 1);
        const color = PALETTE[colorId];
        const ax = px + x;
        const ay = py + y;

        const index = (ay * width + ax) * 4;
        bitMap[index] = (color >>> 24) & 0xff;
        bitMap[index + 1] = (color >>> 16) & 0xff;
        bitMap[index + 2] = (color >>> 8) & 0xff;
        bitMap[index + 3] = color & 0xff;
      }
    }
  }

  const ctx = canvas.getContext('2d');
  const imgData = new ImageData(bitMap, width, height);
  ctx?.putImageData(imgData, 0, 0);
}

function screenRender(
  canvas: HTMLCanvasElement,
  frame: Uint8ClampedArray
): void {
  const ctx = canvas.getContext('2d');
  const imgData = new ImageData(frame, PPU_XRES, PPU_YRES);
  ctx?.putImageData(imgData, 0, 0);
}
