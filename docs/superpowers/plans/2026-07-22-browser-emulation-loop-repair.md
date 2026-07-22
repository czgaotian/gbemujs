# Browser Emulation Loop Repair Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Correct browser pacing, retain one RAF loop, and emit frames at PPU completion.

**Architecture:** `GameBoy` owns a pending RAF handle and converts browser milliseconds to seconds. The PPU calls `GameBoy.updateFrame` when its buffer swap enters VBlank.

**Tech Stack:** TypeScript, Vitest 3, browser RAF.

## Global Constraints

- Preserve `MAX_TIME_STEP = 0.125` as a seconds cap.
- Do not add audio pacing, frame skipping, or a public stop API.
- Tests use fake RAF functions rather than a real browser.

---

### Task 1: Repair and test the browser scheduler

**Files:**

- Create: `packages/core/test/emu/emu.test.ts`
- Modify: `packages/core/src/emu/emu.ts:21-121`

**Interfaces:**

- Consumes: `GameBoy.start(data: Uint8Array): void` and `GameBoy.update(deltaTime: number): void`.
- Produces: a single scheduled callback and an update delta measured in seconds.

- [ ] **Step 1: Write failing tests**

```ts
test('converts RAF milliseconds to seconds before updating', () => {
  const callbacks: FrameRequestCallback[] = [];
  vi.stubGlobal('window', { document: {} });
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    callbacks.push(callback);
    return callbacks.length;
  });
  const gameBoy = new GameBoy();
  const update = vi.spyOn(gameBoy, 'update');
  gameBoy.start(new Uint8Array(0x8000));
  callbacks[0](gameBoy.lastTime + 16);
  expect(update).toHaveBeenCalledWith(0.016);
});
```

- [ ] **Step 2: Verify red**

Run `pnpm --filter core test packages/core/test/emu/emu.test.ts --run`.

Expected: FAIL because the implementation passes `0.125`, not `0.016`.

- [ ] **Step 3: Add the minimal implementation**

```ts
public animationFrameId: number | undefined;
const deltaTime = Math.min((currentTime - this.lastTime) / 1000, MAX_TIME_STEP);
if (this.animationFrameId !== undefined) cancelAnimationFrame(this.animationFrameId);
this.animationFrameId = requestAnimationFrame(browserLoop);
```

Add a second fake-RAF test that starts twice and expects the first handle to be cancelled.

- [ ] **Step 4: Verify green and commit**

Run `pnpm --filter core test packages/core/test/emu/emu.test.ts --run`; expect 2 passing tests. Stage `packages/core/src/emu/emu.ts` and `packages/core/test/emu/emu.test.ts`, then commit `fix: pace browser emulation loop correctly`.

### Task 2: Emit frames at PPU completion

**Files:**

- Modify: `packages/core/src/emu/emu.ts:120`
- Modify: `packages/core/src/ppu/statusMachine.ts:94-100`
- Modify: `packages/core/test/ppu/ppu.test.ts`

**Interfaces:**

- Consumes: `PPU.currentBackBuffer` and `GameBoy.updateFrame(): void`.
- Produces: one `FRAME_UPDATE` emission at the HBlank-to-VBlank transition.

- [ ] **Step 1: Write the failing PPU test**

```ts
test('emits a display frame when the PPU enters VBlank', () => {
  const gameBoy = createGameBoy();
  const updateFrame = vi.spyOn(gameBoy, 'updateFrame');
  Object.assign(gameBoy.ppu, { ly: 143, lineCycles: 456, PPUMode: PPU_MODE.HBLANK });
  gameBoy.ppu.tick();
  expect(gameBoy.ppu.PPUMode).toBe(PPU_MODE.VBLANK);
  expect(updateFrame).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 2: Verify red**

Run `pnpm --filter core test packages/core/test/ppu/ppu.test.ts --run`.

Expected: FAIL because frame emission currently occurs in `GameBoy.update`.

- [ ] **Step 3: Move the existing emission**

```ts
// Delete this.updateFrame() from GameBoy.update().
// After the VBlank buffer swap in tickHBlank():
this.emulator.updateFrame();
```

- [ ] **Step 4: Verify green, run the suite, and commit**

Run `pnpm --filter core test --run`; expect no failures. Stage `packages/core/src/emu/emu.ts`, `packages/core/src/ppu/statusMachine.ts`, and `packages/core/test/ppu/ppu.test.ts`, then commit `fix: emit display frames from PPU completion`.
