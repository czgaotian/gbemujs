# Joypad Input Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make browser key events update exactly one Game Boy button with the correct pressed state, and make P1 expose and interrupt on valid low-nibble edges.

**Architecture:** Keep browser key-code translation as a small pure helper so it can be tested without a DOM. Keep P1 edge detection in `Joypad`, used both by host-input refreshes and CPU writes to `$FF00`.

**Tech Stack:** TypeScript, Vitest, pnpm workspaces.

## Global Constraints

- Preserve the existing W/A/S/D, G/H, and J/K mappings.
- Add regression tests before the corresponding implementation changes.
- Do not add dependencies.

---

### Task 1: P1 state and interrupt edges

**Files:**
- Modify: `packages/core/src/joypad/joypad.ts`
- Create: `packages/core/test/joypad/joypad.test.ts`

- [ ] Write tests for the idle P1 read value, selected key bit, host-input edge, and group-selection edge.
- [ ] Run the Joypad test file and confirm the new expectations fail.
- [ ] Centralize P1 refresh and falling-edge interrupt detection; initialize P1 to its idle readable state.
- [ ] Re-run the Joypad test file and the full core suite.

### Task 2: Browser key translation

**Files:**
- Create: `packages/web/src/key-input.ts`
- Create: `packages/web/test/key-input.test.ts`
- Modify: `packages/web/src/index.ts`

- [ ] Write tests asserting each mapped key updates only its matching property and that unknown keys do nothing.
- [ ] Run the web test file and confirm it fails because the mapping helper does not exist.
- [ ] Implement the pure mapping helper and pass `true` for `keydown`, `false` for `keyup` in the component.
- [ ] Re-run the web test file, full core tests, and TypeScript checking.
