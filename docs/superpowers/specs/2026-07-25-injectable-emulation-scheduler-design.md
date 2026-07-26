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
  schedule(callback: () => void): () => void;
}
```

Time is expressed in milliseconds throughout the core. The core reads the
time when a scheduled callback runs and passes elapsed milliseconds directly
to `update()`. A scheduler only queues work; it does not need to provide a
timestamp to the callback.

`GameBoy` receives a `LoopController` at construction. It owns the loop
lifecycle: `start()` initializes and loads the emulator, records the initial
time, and schedules the first callback. Each callback advances the emulator
then schedules the next callback. `schedule()` returns a cancellation function,
which keeps scheduler-specific handles private to the host. Restarting and
closing invoke the pending cancellation function before discarding it.

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
- The pending cancellation function is private implementation state in `GameBoy`.
- Starting a ROM a second time cancels the previous pending callback, ensuring
  exactly one active loop.
- Closing the emulator stops the loop, then returns any persistent RAM data as
  it does today.

## Tests

Core tests use a fake `LoopController` to verify millisecond-to-second
conversion, maximum timestep clamping, restart cancellation, and close
cancellation. Web tests verify that the browser adapter delegates its clock,
scheduling, and cancellation operations to browser APIs.
