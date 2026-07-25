export interface LoopController {
  now(): number;
  schedule(callback: () => void): unknown;
  cancel(handle: unknown): void;
}
