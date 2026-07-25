# Injectable Emulation Scheduler Design

## Goal

Keep `GameBoy.start()` self-driving while removing all browser globals from
`@gbjs/core`. Each host supplies the clock and callback scheduler appropriate
to its runtime.

## Architecture

`@gbjs/core` exports a small `LoopController` interface:

```ts
interface LoopController {
  now(): number;
  schedule(callback: () => void): unknown;
  cancel(handle: unknown): void;
}
```

Time is expressed in milliseconds. The core reads the time when a scheduled
callback runs, then converts elapsed time to seconds before calling its
existing `update()` method. A scheduler only queues work; it does not need to
provide a timestamp to the callback.

`GameBoy` receives a `LoopController` at construction. It owns the loop
lifecycle: `start()` initializes and loads the emulator, records the initial
time, and schedules the first callback. Each callback advances the emulator
then schedules the next callback. Restarting cancels the pending callback
before scheduling a replacement. `close()` cancels a pending callback before
saving RAM.

The core package does not access `window`, `document`, `performance`,
`requestAnimationFrame`, or `cancelAnimationFrame`.

## Web Host

`@gbjs/web` supplies a browser `LoopController` backed by
`performance.now()`, `requestAnimationFrame`, and `cancelAnimationFrame`, and
passes it to `new GameBoy(...)`. The web component continues to call only
`gameBoy.start(...)`; it does not need to manually advance frames.

## Other Hosts

Node, native shells, tests, and other environments implement the same three
methods with their own clock and scheduling primitives. They retain the same
core API and the emulator remains responsible for invoking `update()`.

## Error Handling and Lifecycle

- A controller is required so core never needs environment detection or a
  fallback scheduler.
- The pending schedule handle is private implementation state in `GameBoy`.
- Starting a ROM a second time cancels the previous pending callback, ensuring
  exactly one active loop.
- Closing the emulator stops the loop, then returns any persistent RAM data as
  it does today.

## Tests

Core tests use a fake `LoopController` to verify millisecond-to-second
conversion, maximum timestep clamping, restart cancellation, and close
cancellation. Web tests verify that the browser adapter delegates its clock,
scheduling, and cancellation operations to browser APIs.
