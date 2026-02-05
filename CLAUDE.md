# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GBJS is a GameBoy emulator implemented in TypeScript. The project is organized as a monorepo using pnpm workspaces with three packages:

- `@gbjs/core` - Core emulation engine (CPU, PPU, APU, memory bus, cartridge system)
- `@gbjs/web` - Web-based frontend with custom Web Component UI
- `@gbjs/cli` - Command-line interface for running ROMs with debugging output

## Common Commands

```bash
# Install dependencies
pnpm install

# Development - start web dev server (Vite)
pnpm dev

# Run tests (Vitest)
pnpm test                    # Run all core tests
pnpm --filter core test      # Run core tests only
pnpm --filter web test       # Run web tests only

# Run CLI with ROM (requires Bun runtime)
pnpm doctor <path-to-rom>    # Run ROM with Gameboy Doctor integration

# Run single test file
pnpm --filter core test <test-file>

# Format code
pnpm prettier --write .
```

## Architecture Overview

### Core Package Structure

The emulator follows a component-based architecture with a central bus system:

```
GameBoy (emu.ts)
├── CPU - LR35902 processor with full instruction set
├── PPU - Picture Processing Unit (graphics rendering)
├── APU - Audio Processing Unit (placeholder)
├── Cartridge - ROM/RAM loading with MBC support
├── Timer - System timing
├── Serial - Serial communication
├── Joypad - Input handling
└── Bus - Memory-mapped I/O system
```

### Memory Map

The bus system (bus.ts) implements the GameBoy memory map:

- `0x0000-0x7FFF`: ROM (cartridge)
- `0x8000-0x9FFF`: VRAM
- `0xA000-0xBFFF`: Cartridge RAM
- `0xC000-0xDFFF`: Work RAM (WRAM)
- `0xFE00-0xFE9F`: OAM (Object Attribute Memory)
- `0xFF00-0xFF7F`: I/O Registers
- `0xFF80-0xFFFE`: High RAM (HRAM)
- `0xFFFF`: Interrupt Enable register

### CPU Architecture

The CPU uses a three-stage execution cycle:

1. **Fetch** (`fetch.ts`): Read opcode from memory
2. **Decode** (`instruction.ts`): Map opcode to instruction type and address mode
3. **Execute** (`processor.ts`): Execute instruction with operand

Instructions are defined in `cpu/instruction.ts` with mappings to their implementations in `cpu/processor.ts`. The CPU supports all 256 base opcodes plus 256 CB-prefixed opcodes.

### PPU Architecture

The PPU implements the GameBoy's tile-based graphics system:

- **Fetcher** (`ppu/fetcher.ts`): Fetches tile data from VRAM
- **Status Machine** (`ppu/statusMachine.ts`): Manages OAM search and pixel transfer modes
- **OAM** (`ppu/oam.ts`): Object Attribute Memory for sprites
- **Pixels**: Double-buffered frame buffer (PPU_XRES × PPU_YRES × 4 bytes)

### Event System

The `EventBus` (`event/index.ts`) provides loose coupling between components:

- `SERIAL`: Serial output events
- `FRAME_UPDATE`: New frame ready for display
- `DOCTOR_LOG`: Debug logging for Gameboy Doctor integration

## Gameboy Doctor Integration

The emulator integrates with [Gameboy Doctor](https://github.com/robert/gameboy-doctor) for debugging:

```bash
# Set environment variable and run
DOCTOR_ENV=true pnpm doctor <rom>
```

Doctor logs are emitted via the DOCTOR_LOG event when `DOCTOR_ENV=true`.

## Development Notes

### Conventions

- Type annotations use `u8`, `u16` suffixes for GameBoy's 8-bit and 16-bit values
- All memory operations return masked values (`& 0xff` or `& 0xffff`)
- CPU timing uses "ticks" (1 tick = 1 CPU cycle = 4 clock cycles)
- PPU timing is synchronized via `GameBoy.tick(cpuCycle)` after each CPU instruction

### CPU Instructions

When adding new CPU instructions:

1. Add to `cpu/instruction.ts` in `instructionMap`
2. Implement handler in `cpu/processor.ts` in `processorMap`
3. Test with ROMs in `roms/` directory

### Testing

Tests use Vitest and are located in `packages/core/test/`. Current test coverage:

- CPU register operations
- Instruction execution (SBC, DAA, LD)
- Basic CPU functionality

## Key Dependencies

- **vitest**: Test framework
- **vite**: Build tool for web package
- **typescript**: Language compiler (ES2020 target, CommonJS modules)
- **bun**: Runtime for CLI package

## Resources

- [GameBoy CPU (LR35902) instruction set](https://www.pastraiser.com/cpu/gameboy/gameboy_opcodes.html)
- [GameBoy Pan Docs](https://gbdev.io/pandocs/)
- [Gameboy Doctor](https://github.com/robert/gameboy-doctor)
