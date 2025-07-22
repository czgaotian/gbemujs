import * as fs from 'fs';
import * as path from 'path';
import { GameBoy } from '@gbjs/core/emu/emu';
import { SERIAL } from '@gbjs/core/event';

// running in
function main() {
  const romPath = process.argv[2];
  if (!romPath) {
    console.error('Usage: bun cli.ts <path-to-rom>');
    process.exit(1);
  }

  const absoluteRomPath = path.resolve(romPath);
  if (!fs.existsSync(absoluteRomPath)) {
    console.error(`Error: ROM file not found at ${absoluteRomPath}`);
    process.exit(1);
  }

  try {
    const romData = fs.readFileSync(absoluteRomPath);
    const gameBoy = new GameBoy();

    // 监听串行端口输出，这对于调试和运行测试ROM很有用
    gameBoy.on(SERIAL, (data: number[]) => {
      const text = data.reduce(
        (acc, curr) => acc + String.fromCharCode(curr),
        ''
      );
      // 直接将输出打印到标准输出
      process.stdout.write(text);
    });

    console.log(`Starting emulation for ${path.basename(romPath)}...`);
    // gameBoy.startCli(romData);
  } catch (error) {
    console.error('Failed to load or run ROM:', error);
    process.exit(1);
  }
}

main();
