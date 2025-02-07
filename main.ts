import GameBoy from "./src";
import { instructionDisplay, registerFDisplay } from "./src/utils/cpu";

const gb = new GameBoy();

console.log("Emulator init:", gb);

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
    console.log(gb);
    pauseButton.textContent = 'Resume';
  }
});

const stepButton = document.getElementById('step') as HTMLButtonElement;
stepButton.addEventListener('click', () => {
  gb.cpu.step();

  console.log(`${gb.clockCycles} - ${gb.cpu.pc.toString(16).padStart(2, '0')} : ${instructionDisplay(gb.cpu)} (${gb.cpu.opcode.toString(16).padStart(2, '0')
    } ${gb.busRead(gb.cpu.pc + 1).toString(16).padStart(2, '0')
    } ${gb.busRead(gb.cpu.pc + 2).toString(16).padStart(2, '0')
    }) A: ${gb.cpu.a.toString(16).padStart(2, '0')
    } F: ${registerFDisplay(gb.cpu)
    } BC: ${gb.cpu.b.toString(16).padStart(2, '0')
    }${gb.cpu.c.toString(16).padStart(2, '0')
    } DE: ${gb.cpu.d.toString(16).padStart(2, '0')
    }${gb.cpu.e.toString(16).padStart(2, '0')
    } HL: ${gb.cpu.h.toString(16).padStart(2, '0')
    }${gb.cpu.l.toString(16).padStart(2, '0')
    }`);
});
