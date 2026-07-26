export interface LoopController {
  now(): number;
  schedule(callback: () => void): () => void;
}
