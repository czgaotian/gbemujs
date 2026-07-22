# Browser emulation loop repair

## Goal

Run the emulator at the Game Boy clock rate in browsers without accumulating
duplicate animation loops or rendering the same PPU frame more than once.

## Design

- Treat the timestamp supplied by `requestAnimationFrame` as milliseconds and
  convert the elapsed value to seconds before passing it to `GameBoy.update`.
  `MAX_TIME_STEP` remains `0.125`, which caps catch-up work at 125 ms.
- Store the pending browser animation-frame handle on `GameBoy`. Starting a
  ROM cancels any existing browser loop before scheduling the new one.
- Have the PPU emit the frame-ready event when it flips its back buffer at the
  end of a completed frame. `GameBoy.update` no longer emits a frame merely
  because the browser repaint loop ran.
- Add focused tests for elapsed-time conversion and single-loop scheduling,
  plus a PPU frame-completion test if the existing PPU state-machine seam makes
  it practical. Tests use fake RAF callbacks rather than a real browser.

## Boundaries

The change does not introduce audio pacing, frame skipping, background-tab
catch-up beyond the existing 125 ms cap, or a new public lifecycle API.
