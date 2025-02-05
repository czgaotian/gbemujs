import GameBoy from "./src";
import { parseArgs } from "util";

const {
  values: { rom: romPath },
} = parseArgs({
  args: Bun.argv,
  options: {
    rom: {
      type: "string",
    },
  },
  strict: true,
  allowPositionals: true,
});

if (!romPath) {
  throw new Error("ROM path is required");
}

const rom = await Bun.file(romPath).bytes();

const gb = new GameBoy();

gb.start(rom);
