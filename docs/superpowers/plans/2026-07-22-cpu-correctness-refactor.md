# CPU Correctness and Maintainability Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the LR35902 CPU core easier to maintain while adding regression coverage for register invariants, arithmetic, control flow, interrupt state, and CB-prefixed instructions.

**Architecture:** Keep `CPU.step()` as the fetch/decode/execute lifecycle and retain the existing opcode map. Extract CB execution into its own module and introduce narrow helpers for flag calculations and CB operand access; keep explicit timing at instruction handlers. Test full instruction behavior through `CPU.step()` with ROM bytes loaded at `0x0100`.

**Tech Stack:** TypeScript 5, Vitest 3, pnpm workspace (`@gbjs/core`).

## Global Constraints

- Do not change the public `GameBoy` interface used by web or CLI packages.
- Preserve the existing undefined-opcode `NONE` behavior.
- `F` bits 0–3 must always read as zero after every write path.
- Add a failing test and observe the expected failure before production changes.
- Do not alter instruction timing without a targeted test that asserts the relevant `clockCycles` delta.

---

## File Structure

- Modify `packages/core/src/cpu/registers.ts`: centralize byte masking and enforce `F` invariants for byte and pair setters.
- Modify `packages/core/test/cpu/registers.test.ts`: cover direct register-property and pair writes to `F`.
- Create `packages/core/src/cpu/cb.ts`: decode and execute CB-prefixed rotate, shift, bit, reset, and set instructions.
- Modify `packages/core/src/cpu/processor.ts`: import the CB handler, remove CB-specific implementation, and use small arithmetic helpers where they remove duplicated flag rules.
- Modify `packages/core/test/cpu/processor.test.ts`: retain focused direct-handler tests and move fixture setup into helpers.
- Create `packages/core/test/cpu/cpu-step.test.ts`: execute instruction bytes through `CPU.step()` and cover arithmetic, branches, stack flow, interrupt state, and CB behavior.

### Task 1: Enforce the flag-register invariant

**Files:**
- Modify: `packages/core/src/cpu/registers.ts`
- Modify: `packages/core/test/cpu/registers.test.ts`

**Interfaces:**
- Produces: `Registers.f` and `Registers.af` setters that discard bits 0–3 of `F`.
- Produces: existing `Registers.set(RT.F, value)` and `Registers.set(RT.AF, value)` behavior with the same invariant.

- [ ] **Step 1: Write the failing test**

```ts
it('masks the lower flag bits for direct F and AF assignments', () => {
  registers.f = 0xff;
  expect(registers.f).toBe(0xf0);

  registers.af = 0x12ff;
  expect(registers.af).toBe(0x12f0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter core test packages/core/test/cpu/registers.test.ts`

Expected: FAIL because direct `f` or `af` assignment retains lower flag bits.

- [ ] **Step 3: Write minimal implementation**

```ts
set f(value: number) {
  this._register.setUint8(1, value & 0xf0);
}

set af(value: number) {
  this._register.setUint16(0, value & 0xfff0);
}
```

Update the existing pair-write expectation from `0x1234` to `0x1230` and retain the high-byte assertion.

- [ ] **Step 4: Run focused tests**

Run: `pnpm --filter core test packages/core/test/cpu/registers.test.ts`

Expected: PASS with all register tests green.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/cpu/registers.ts packages/core/test/cpu/registers.test.ts
git commit -m "fix(cpu): preserve flag register invariant"
```

### Task 2: Add a CPU-step fixture and arithmetic regressions

**Files:**
- Create: `packages/core/test/cpu/cpu-step.test.ts`
- Modify: `packages/core/src/cpu/processor.ts`

**Interfaces:**
- Consumes: `GameBoy.loadROM(data)` and `CPU.step()`.
- Produces: test-local `createCpu(...bytes: number[]): GameBoy` which places program bytes at ROM offset `0x0100`.
- Produces: correct result and Z/N/H/C flags for `ADD`, `ADC`, `SUB`, `SBC`, `CP`, and `DAA`.

- [ ] **Step 1: Write the failing tests**

```ts
const createCpu = (...bytes: number[]) => {
  const emu = new GameBoy();
  const rom = new Uint8Array(0x8000);
  rom.set(bytes, 0x0100);
  emu.loadROM(rom);
  return emu;
};

test('ADC includes carry in half-carry and carry flags', () => {
  const emu = createCpu(0xce, 0x00);
  emu.cpu.registers.a = 0xff;
  emu.cpu.registers.f = 0x10;

  emu.cpu.step();

  expect(emu.cpu.registers.a).toBe(0x00);
  expect(emu.cpu.registers.f).toBe(0xb0);
});

test('CP changes flags without changing A', () => {
  const emu = createCpu(0xfe, 0x01);
  emu.cpu.registers.a = 0x00;

  emu.cpu.step();

  expect(emu.cpu.registers.a).toBe(0x00);
  expect(emu.cpu.registers.f).toBe(0x70);
});
```

Add vectors for `ADD A,$01` from `0x0f`, `SUB $01` from `0x10`, `SBC A,$ff` with carry, plus one addition- and subtraction-mode `DAA` vector.

- [ ] **Step 2: Run test to verify the baseline**

Run: `pnpm --filter core test packages/core/test/cpu/cpu-step.test.ts`

Expected: at least one test FAILS if arithmetic diverges; otherwise retain all passing vectors as characterization coverage and do not change production code solely to force a failure.

- [ ] **Step 3: Extract minimal duplicated flag helpers if a test requires a correction**

```ts
const add8Flags = (left: number, right: number, carry = 0) => ({
  h: (left & 0x0f) + (right & 0x0f) + carry > 0x0f,
  c: left + right + carry > 0xff,
});

const subtract8Flags = (left: number, right: number, borrow = 0) => ({
  h: (left & 0x0f) < (right & 0x0f) + borrow,
  c: left < right + borrow,
});
```

Use these only in 8-bit `ADD`/ `ADC` and `SUB`/ `SBC`/ `CP`; leave 16-bit behavior explicit.

- [ ] **Step 4: Run arithmetic regression tests**

Run: `pnpm --filter core test packages/core/test/cpu/cpu-step.test.ts packages/core/test/cpu/processor.test.ts`

Expected: PASS with no failures.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/cpu/processor.ts packages/core/test/cpu/cpu-step.test.ts
git commit -m "test(cpu): cover arithmetic through instruction steps"
```

### Task 3: Isolate CB-prefixed instruction execution

**Files:**
- Create: `packages/core/src/cpu/cb.ts`
- Modify: `packages/core/src/cpu/processor.ts`
- Modify: `packages/core/test/cpu/cpu-step.test.ts`

**Interfaces:**
- Produces: `export function executeCb(this: CPU): void` in `cpu/cb.ts`.
- Consumes: `CPU.fetchedData`, `CPU.readRegister8Bit`, `CPU.setRegister8Bit`, `CPU.setFlags`, and explicit `emulator.tick(1)` calls for `(HL)` access.
- Produces: `processorMap[IT.CB]` mapped to `executeCb`.

- [ ] **Step 1: Write failing CB tests**

```ts
test('CB RLC B rotates through bit 7 and updates flags', () => {
  const emu = createCpu(0xcb, 0x00);
  emu.cpu.registers.b = 0x80;

  emu.cpu.step();

  expect(emu.cpu.registers.b).toBe(0x01);
  expect(emu.cpu.registers.f).toBe(0x10);
});

test('CB BIT 0, (HL) preserves carry and does not write memory', () => {
  const emu = createCpu(0xcb, 0x46);
  emu.cpu.registers.hl = 0xc000;
  emu.wram[0] = 0x00;
  emu.cpu.registers.f = 0x10;

  emu.cpu.step();

  expect(emu.wram[0]).toBe(0x00);
  expect(emu.cpu.registers.f).toBe(0xb0);
});
```

Add `RES 0,(HL)` and `SWAP A` vectors.

- [ ] **Step 2: Run tests before moving code**

Run: `pnpm --filter core test packages/core/test/cpu/cpu-step.test.ts`

Expected: PASS or a failure tied to a documented CB behavior; do not move code until any failure is understood.

- [ ] **Step 3: Move CB implementation to the new module**

```ts
// packages/core/src/cpu/cb.ts
export function executeCb(this: CPU): void {
  const opcode = this.fetchedData;
  const registerType = decodeRegister(opcode & 0b111);
  // Move existing CB bit-operation branches here.
}

// packages/core/src/cpu/processor.ts
import { executeCb } from './cb';
// processorMap entry:
[IT.CB]: executeCb,
```

Keep `decodeRegister` and its register lookup private in `cb.ts`; remove `CB`, `registerLookup`, and `decodeRegister` from `processor.ts` after the move.

- [ ] **Step 4: Run focused CPU tests**

Run: `pnpm --filter core test packages/core/test/cpu/cpu-step.test.ts packages/core/test/cpu/processor.test.ts`

Expected: PASS with CB and arithmetic cases green.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/cpu/cb.ts packages/core/src/cpu/processor.ts packages/core/test/cpu/cpu-step.test.ts
git commit -m "refactor(cpu): isolate CB instruction execution"
```

### Task 4: Cover control flow and interrupt lifecycle

**Files:**
- Modify: `packages/core/test/cpu/cpu-step.test.ts`
- Modify only if a regression test fails: `packages/core/src/cpu/cpu.ts`, `packages/core/src/cpu/processor.ts`, or `packages/core/src/cpu/interrupts.ts`

**Interfaces:**
- Consumes: `CPU.step()`, `GameBoy.intFlags`, `GameBoy.intEnableFlags`, `CPU.interruptMasterEnabled`, and `CPU.halted`.
- Produces: tests for taken/not-taken branches, stack return addresses, delayed `EI`, immediate `DI`, and HALT wake-up.

- [ ] **Step 1: Write failing lifecycle tests**

```ts
test('JR NZ takes a signed offset only when Z is clear', () => {
  const emu = createCpu(0x20, 0xfe);
  emu.cpu.registers.f = 0x00;

  emu.cpu.step();

  expect(emu.cpu.registers.pc).toBe(0x0100);
});

test('EI enables IME after the following instruction', () => {
  const emu = createCpu(0xfb, 0x00);
  emu.cpu.step();
  expect(emu.cpu.interruptMasterEnabled).toBe(false);

  emu.cpu.step();
  expect(emu.cpu.interruptMasterEnabled).toBe(true);
});
```

Add vectors for `JR NZ` not taken with Z set, `CALL $0105` followed by `RET`, `DI` cancelling a pending enable, and `HALT` waking when an enabled interrupt is pending.

- [ ] **Step 2: Run tests to observe control-flow failures**

Run: `pnpm --filter core test packages/core/test/cpu/cpu-step.test.ts`

Expected: any failure identifies a specific PC, stack, or interrupt-state mismatch.

- [ ] **Step 3: Apply only the correction named by a failing test**

```ts
if (checkCondition(this)) {
  this.registers.pc = target;
  this.emulator.tick(1);
}
```

For an `EI` failure, keep the existing two-step countdown contract and adjust only its decrement location. For a HALT failure, change only the tested pending-interrupt branch; do not add a new execution loop.

- [ ] **Step 4: Run complete core tests**

Run: `pnpm --filter core test --run`

Expected: PASS with zero test failures.

- [ ] **Step 5: Commit**

```bash
git add packages/core/test/cpu/cpu-step.test.ts
git add packages/core/src/cpu/cpu.ts packages/core/src/cpu/processor.ts packages/core/src/cpu/interrupts.ts
git commit -m "test(cpu): cover control flow and interrupt lifecycle"
```

Before committing, remove unchanged paths from the index so the commit includes only files modified by this task.

### Task 5: Final verification

**Files:**
- Modify only if verification exposes a type error: the file named in compiler output.

**Interfaces:**
- Consumes: completed CPU modules and Vitest suites.
- Produces: fresh evidence that tests and strict TypeScript compilation pass.

- [ ] **Step 1: Type-check**

Run: `pnpm exec tsc --noEmit`

Expected: exit code 0 and no diagnostics.

- [ ] **Step 2: Run all core tests in a clean process**

Run: `pnpm --filter core test --run`

Expected: exit code 0 with every test passing.

- [ ] **Step 3: Inspect scope**

Run: `git diff HEAD~4..HEAD -- packages/core/src/cpu packages/core/test/cpu docs/superpowers`

Expected: only CPU refactor, CPU tests, and design/plan documents; no web, CLI, dependency, or `AGENTS.md` changes.

- [ ] **Step 4: Commit a compiler-only correction when needed**

```bash
git add path/reported-by-tsc.ts
git commit -m "fix(cpu): satisfy strict type checking"
```

Skip this step if type-checking already exits 0 and there is no compiler correction.

