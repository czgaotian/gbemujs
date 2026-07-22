# PPU correctness fixes

## Scope

Correct the PPU behaviors that contradict `docs/ppu/ppu-url.md` without
attempting a cycle-perfect FIFO implementation or CPU bus-access restrictions.

## Changes

- DMA reads all 160 OAM bytes from the contiguous source range beginning at
  `DMA << 8`, after the existing one-machine-cycle start delay.
- Background tile-map coordinates wrap at 256 pixels before tile-map address
  calculation. This applies independently to horizontal and vertical scroll.
- Object/background priority compares the object's priority bit with the
  background/window pixel's unpaletted two-bit colour index. Palette mapping
  happens only after layer selection.
- In 8x16 object mode, the tile's low bit remains clear and the row selected
  after Y-flip determines which of the two consecutive tiles is read.
- Disabling LCD resets scanline timing, `LY`, the window line counter, and the
  STAT mode bits to HBlank. Re-enabling LCD begins the normal OAM-scan path.

## Testing

Add focused PPU unit tests for each behavior. Each test will first fail on the
current implementation, then pass after the smallest corresponding fix. Run
the PPU test file and the core test suite after the changes.

## Non-goals

- Emulating the variable, dot-accurate length of mode 3.
- Enforcing CPU VRAM/OAM access restrictions during PPU modes or DMA.
- Changing frame-buffer presentation or public PPU APIs.
