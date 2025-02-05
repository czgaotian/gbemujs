import GameBoy from "./src";

const gb = new GameBoy();

console.log(gb);

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
