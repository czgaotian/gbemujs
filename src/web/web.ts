import { GameBoy } from "../emu/emu";

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
  <div style="display: flex; gap: 10px;">
    <div style="flex: 1">
      <div>Serial Output</div>
      <pre id="serial-output" style="margin: 0; border: 1px solid #000; min-height: 1rem;"></pre>
    </div>
    <div style="flex: 1">
      <div>Tiles</div>
      <canvas id="tile-canvas" width="160" height="144" style="border: 1px solid #000;"></canvas>
    </div>
  </div>
`