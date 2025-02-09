import { CPU } from '../cpu/cpu';
import { cpuLog } from '../utils';

const logStack: string[] = [];
let isShowLog = false;

export function debug(pc: number, cpu: CPU) {
  const log = cpuLog(pc, cpu);

  logStack.push(log);

  if (logStack.length > 10) {
    logStack.shift();
  }

  if (`${pc.toString(16).padStart(2, '0')}` === 'c369') {
    // console.log(logStack);
    // cpu.emulator.paused = true;
  }

  if (cpu.emulator.isDebug) {
    if (!isShowLog) { 
      console.log(logStack);
      isShowLog = true;
    } else {
      console.log(log);
    }
    cpu.emulator.paused = true;
  }
}
