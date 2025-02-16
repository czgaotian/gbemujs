export const domString = `
  <div style="display: flex; margin-bottom: 10px;">
    <canvas id="screen" width="160" height="144" style="border: 1px solid #000;"></canvas>
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
      <div>Tiles in VRAM</div>
      <canvas id="tile-canvas" width="128" height="192" style="border: 1px solid #000;"></canvas>
    </div>
    <div>
      <div>Serial Output</div>
      <pre id="serial-output" style="width: 256px; margin: 0; border: 1px solid #000; min-height: 192px; overflow: auto;"></pre>
    </div>
  </div>
`

export const cssString = `
#screen {
  width: 320px;
  height: 288px;
}

#tile-canvas {
  width: 256px;
  height: 384px;
}
`