import GameBoy from './src';
import { instructionDisplay, registerFDisplay } from './src/utils/cpu';

const gb = new GameBoy();

console.log('Emulator init:', gb);

const fileInput = document.getElementById('rom-file') as HTMLInputElement;

fileInput.addEventListener('change', (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e: Event) => {
    const arrayBuffer = (e.target as FileReader).result;
    const uint8Array = new Uint8Array(arrayBuffer as ArrayBuffer);
    gb.start(uint8Array);
  };
  reader.readAsArrayBuffer(file);
});

const pauseButton = document.getElementById('pause') as HTMLButtonElement;
pauseButton.addEventListener('click', () => {
  if (gb.paused) {
    gb.resume();
    pauseButton.textContent = 'Pause';
  } else {
    gb.pause();
    pauseButton.textContent = 'Resume';
  }
});

const stepButton = document.getElementById('step') as HTMLButtonElement;
stepButton.addEventListener('click', () => {
  // gb.isDebug = true;
  gb.cpu.step();
  // gb.isDebug = false;
});

const consoleButton = document.getElementById('console') as HTMLButtonElement;
consoleButton.addEventListener('click', () => {
  console.log(gb);
});
