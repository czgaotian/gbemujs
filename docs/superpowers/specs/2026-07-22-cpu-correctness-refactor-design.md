# CPU Correctness and Maintainability Refactor

## Goal

Improve CPU correctness and maintainability together without changing the public `GameBoy` interface used by the web and CLI packages.

## Scope

- Keep `CPU.step()` and the opcode instruction table as the execution boundary.
- Keep address-mode operand fetching in `cpu/fetch.ts`.
- Split CB-prefixed instruction execution from `cpu/processor.ts` into a focused module.
- Extract small helpers for arithmetic results, flag calculations, conditions, and repeated CB read/write behavior.
- Enforce the Game Boy invariant that the lower four bits of register `F` are always zero, including direct `f` and `af` assignments.
- Preserve existing behavior for undefined opcodes (`NONE`).

## Architecture

`CPU` owns the instruction lifecycle: interrupt handling, opcode fetch, operand fetch, dispatch, HALT state, and IME state. `fetchData` resolves the instruction's addressing mode and produces its operand and any memory destination. The standard processor module handles non-CB instructions. A separate CB processor decodes the prefixed opcode and performs bit, rotate, shift, reset, and set operations.

Shared helpers must operate on a supplied CPU instance and have no hidden state. They may calculate values and flags, but timing remains explicit at the instruction site so each extra tick is visible in the handler.

## Correctness Rules

- Direct and indirect writes to `F` preserve only bits 7–4.
- 8-bit arithmetic masks its result to 8 bits and calculates half-carry and carry from the unmasked operands.
- Relative branch offsets are signed 8-bit values; conditional control flow changes PC and consumes the documented extra ticks only when taken.
- CB instructions preserve flags where the LR35902 requires it and apply the correct `(HL)` read/write cycles.
- `EI`, `DI`, and `HALT` retain their existing lifecycle API while receiving targeted regression coverage.

## Testing Strategy

Tests use the public `CPU.step()` path with a small memory-backed Game Boy fixture whenever the behavior spans fetch, decode, execution, or timing. Unit tests remain appropriate for register invariants and isolated arithmetic helpers. Initial coverage focuses on:

1. `F`/`AF` masking and register-pair behavior.
2. `ADD`, `ADC`, `SUB`, `SBC`, `CP`, and `DAA` result and flags.
3. Conditional `JR`, `JP`, `CALL`, and `RET` PC and cycle behavior.
4. `EI`, `DI`, and `HALT` state transitions.
5. CB operations against registers and `(HL)`.

Each behavior follows a red-green-refactor cycle: add one failing test, verify the expected failure, apply the smallest change, then run the affected and full core test suites. Final verification includes TypeScript checking/building where the package scripts support it.

## Non-goals

- Rebuilding all opcode definitions as a new micro-operation table.
- Altering public emulator APIs or web/CLI integration.
- Broad timing changes without an explicit failing regression test and documented instruction semantics.
