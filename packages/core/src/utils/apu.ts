export function dac(sample: number): number {
  // lerp from 0 to 1, then convert to float32
  return Math.fround(1 - (2 * sample) / 15);
}
