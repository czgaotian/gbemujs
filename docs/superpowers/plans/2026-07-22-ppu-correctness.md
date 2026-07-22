# PPU Correctness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Correct documented DMG PPU behavior for DMA, scroll wrapping, sprite composition, and LCD reset.

**Architecture:** Keep the current PPU fetcher/status-machine design. Add a focused Vitest PPU regression suite, then change only the calculations disproven by those tests.

**Tech Stack:** TypeScript, Vitest 3, pnpm workspaces.

## Global Constraints

- Preserve existing public PPU and emulator APIs.
- Do not implement dot-accurate mode 3 timing or CPU bus-access restrictions.
- Write each regression test before its corresponding production fix.

---

### Task 1: DMA source addressing

**Files:**
- Create: `packages/core/test/ppu/ppu.test.ts`
- Modify: `packages/core/src/ppu/ppu.ts:96-111`

**Interfaces:** `ppu.write(0xff46, value)` and `ppu.tickDma()` copy OAM byte `offset` from `(dma << 8) + offset`.

- [x] **Step 1: Write the failing test**

```ts
test('copies OAM DMA bytes from the selected source page', () => {
  const gameBoy = createGameBoy();
  for (let offset = 0; offset < 0xa0; offset++) gameBoy.wram[offset] = offset;
  gameBoy.ppu.write(0xff46, 0xc0);
  for (let tick = 0; tick <= 0xa0; tick++) gameBoy.ppu.tickDma();
  expect([...gameBoy.oam]).toEqual(Array.from({ length: 0xa0 }, (_, i) => i));
});
```

- [ ] **Step 2: Verify RED**

Run: `pnpm --filter core test test/ppu/ppu.test.ts --run`

Expected: FAIL because DMA does not read consecutive source addresses.

- [x] **Step 3: Write minimal production code**

```ts
this.emulator.oam[this.dmaOffset] = this.emulator.busRead(
  (this.dma << 8) + this.dmaOffset
);
this.dma = value;
```

- [ ] **Step 4: Verify GREEN**

Run: `pnpm --filter core test packages/core/test/ppu/ppu.test.ts --run`

Expected: PASS.

### Task 2: Background-coordinate wrap

**Files:**
- Modify: `packages/core/test/ppu/ppu.test.ts`
- Modify: `packages/core/src/ppu/fetcher.ts:79-105`

**Interfaces:** `fetcherGetTile()` reduces `scrollX + fetchX` and `scrollY + ly` to 8-bit coordinates before selecting a tilemap entry.

- [x] **Step 1: Write the failing test**

```ts
test('wraps background coordinates at 256 pixels', () => {
  const gameBoy = createGameBoy();
  Object.assign(gameBoy.ppu, { scrollX: 8, scrollY: 8, fetchX: 248, ly: 248 });
  gameBoy.vram[0x1800] = 0x2a;
  gameBoy.ppu.fetcherGetTile();
  expect(gameBoy.ppu.bgwDataAddrOffset).toBe(0x2a * 16);
});
```

- [ ] **Step 2: Verify RED**

Run: `pnpm --filter core test test/ppu/ppu.test.ts --run`

Expected: FAIL because an unwrapped tilemap address is selected.

- [x] **Step 3: Write minimal production code**

```ts
const mapY = (ppu.ly + ppu.scrollY) & 0xff;
const mapX = (ppu.fetchX + ppu.scrollX) & 0xff;
```

- [ ] **Step 4: Verify GREEN**

Run: `pnpm --filter core test packages/core/test/ppu/ppu.test.ts --run`

Expected: PASS.

### Task 3: Sprite composition

**Files:**
- Modify: `packages/core/test/ppu/ppu.test.ts`
- Modify: `packages/core/src/ppu/ppu.ts:365-370`
- Modify: `packages/core/src/ppu/fetcher.ts:142-157`

**Interfaces:** `lcdDrawPixel()` compares priority against `bgwPixel.color`; `getSpriteData()` selects `tile + floor(ty / 8)` and `ty % 8` for 8×16 sprites.

- [x] **Step 1: Write the failing tests**

```ts
test('uses raw background colour for behind-background sprite priority', () => {
  const ppu = createGameBoy().ppu;
  ppu.bgwQueue = Array.from({ length: 8 }, () => ({ color: 0, palette: 0xfc }));
  ppu.objQueue = Array.from({ length: 8 }, () => ({ color: 1, palette: 0xff, bgPriority: true }));
  ppu.lcdDrawPixel();
  expect([...ppu.pixels.subarray(0, 4)]).toEqual([87, 93, 67, 255]);
});
```

```ts
test('uses the second tile for the top row of a Y-flipped 8x16 sprite', () => {
  const gameBoy = createGameBoy();
  const ppu = gameBoy.ppu;
  ppu.lcdc |= 0x06;
  ppu.fetchedSprites = [new OamEntry(16, 8, 2, 0x40)];
  ppu.numFetchedSprites = 1;
  gameBoy.vram[2 * 16 + 14] = 0x11;
  gameBoy.vram[3 * 16 + 14] = 0x22;
  ppu.fetcherGetData(0);
  expect(ppu.spriteFetchedData[0]).toBe(0x22);
});
```

- [ ] **Step 2: Verify RED**

Run: `pnpm --filter core test test/ppu/ppu.test.ts --run`

Expected: both tests FAIL.

- [ ] **Step 3: Write minimal production code**

```ts
const drawObj = objPixel.color && (!objPixel.bgPriority || bgwPixel.color === 0);
const tileRow = ty % 8;
if (spriteHeight === 16) tile += Math.floor(ty / 8);
```

- [ ] **Step 4: Verify GREEN**

Run: `pnpm --filter core test packages/core/test/ppu/ppu.test.ts --run`

Expected: PASS.

### Task 4: LCD-off reset state

**Files:**
- Modify: `packages/core/test/ppu/ppu.test.ts`
- Modify: `packages/core/src/ppu/ppu.ts:129-137`

**Interfaces:** re-enabling LCD with `ppu.write(0xff40, value)` starts a new OAM-scan phase.

- [ ] **Step 1: Write the failing test**

```ts
test('starts OAM scan when LCD is enabled after being disabled', () => {
  const ppu = createGameBoy().ppu;
  ppu.write(0xff40, ppu.lcdc & ~0x80);
  ppu.write(0xff40, ppu.lcdc | 0x80);
  expect(ppu.PPUMode).toBe(PPU_MODE.OAM_SCAN);
});
```

- [ ] **Step 2: Verify RED**

Run: `pnpm --filter core test packages/core/test/ppu/ppu.test.ts --run`

Expected: FAIL because the PPU remains in HBlank.

- [ ] **Step 3: Write minimal production code**

```ts
this.PPUMode = PPU_MODE.OAM_SCAN;
this.lineCycles = 0;
```

- [ ] **Step 4: Verify GREEN and the full core suite**

Run: `pnpm --filter core test test/ppu/ppu.test.ts --run && pnpm --filter core test --run`

Expected: both commands pass with no failures.
