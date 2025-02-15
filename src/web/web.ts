import { GameBoy } from "../emu/emu";
import { PALETTE } from "../constants/ppu";
import { registerFDisplay } from "../utils/cpu";

export class GameBoyDom extends HTMLElement {
  gameBoy: GameBoy;

  constructor() {
    super();
    this.gameBoy = new GameBoy();
  }

  connectedCallback() {
    const shadow = this.attachShadow({ mode: "open" });

    const template = document.createElement('template');
    template.innerHTML = domString;
    shadow.appendChild(template.content);

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
      const serialOutput = shadow.getElementById('serial-output') as HTMLPreElement;
      const text = data.reduce((acc, curr) => acc + String.fromCharCode(curr), '');
      serialOutput.textContent = text;
    });

    const status = shadow.getElementById('status') as HTMLPreElement;
    this.gameBoy.on('frame-update', () => {
      status.textContent = `---- CPU ----
PC: ${this.gameBoy.cpu.registers.pc.toString(16).padStart(4, '0')} SP: ${this.gameBoy.cpu.registers.sp.toString(16).padStart(4, '0')}
A: ${this.gameBoy.cpu.registers.a.toString(16).padStart(4, '0')} F: ${registerFDisplay(this.gameBoy.cpu.registers.f)}
BC: ${this.gameBoy.cpu.registers.bc.toString(16).padStart(4, '0')} DE: ${this.gameBoy.cpu.registers.de.toString(16).padStart(4, '0')}
HL: ${this.gameBoy.cpu.registers.hl.toString(16).padStart(4, '0')}
`});

    const canvas = shadow.getElementById('tile-canvas') as HTMLCanvasElement;
    this.gameBoy.on('frame-update', () => {
      drawTilemap(canvas, this.gameBoy);
    });
  }
}

const domString = `
  <div style="display: flex; margin-bottom: 10px;">
    <canvas id="screen" width="320" height="288" style="border: 1px solid #000;"></canvas>
  </div>
  <div style="margin-bottom: 10px;">
    game rom: <input type="file" id="rom-file" title="Select ROM" />
    <button id="pause">Pause</button>
    <button id="step">Next Step</button>
    <button id="console">console</button>
  </div>
  <div>
  <div style="display: flex; gap: 8px;">
    <div>
      <div>Status</div>
      <pre id="status" style="width: 256px; margin: 0; border: 1px solid #000; min-height: 192px;"></pre>
    </div>
    <div>
      <div>Tiles</div>
      <canvas id="tile-canvas" width="256" height="384" style="border: 1px solid #000;"></canvas>
    </div>
    <div>
      <div>Serial Output</div>
      <pre id="serial-output" style="width: 256px; margin: 0; border: 1px solid #000; min-height: 192px; overflow: auto;"></pre>
    </div>
  </div>
`

function drawTilemap(canvas: HTMLCanvasElement, emulator: GameBoy): void {
  const scale = 2;
  const width = 128 * scale;
  const height = 192 * scale;
  const bitMap = new Uint8ClampedArray(width * height * 4);
  const vram = emulator.vram;

  for (let i = 0; i < 384; i += 1) {
    let px = (i % 16) * 8 * scale;
    let py = Math.floor(i / 16) * 8 * scale;

    for (let y = 0; y < 8; y += 1) {
      const tileLine1 = vram[i * 16 + y * 2];
      const tileLine2 = vram[i * 16 + y * 2 + 1];
      for (let x = 0; x < 8; x += 1) {
        const dx = 7 - x;
        const colorId = ((tileLine1 >> dx) & 1) | (((tileLine2 >> dx) & 1) << 1);
        const color = PALETTE[colorId];
        const ax = px + x * scale;
        const ay = py + y * scale;
         
        for (let dy = 0; dy < scale; dy += 1) {
          for (let dx = 0; dx < scale; dx += 1) {
            const index = ((ay + dy) * width + (ax + dx)) * 4;
            bitMap[index] = (color >>> 24) & 0xff;
            bitMap[index + 1] = (color >>> 16) & 0xff;
            bitMap[index + 2] = (color >>> 8) & 0xff;
            bitMap[index + 3] = color & 0xff;
          }
        }
      }
    }
  }

  const ctx = canvas.getContext('2d');
  const imgData = new ImageData(bitMap, width, height);
  ctx?.putImageData(imgData, 0, 0);
}