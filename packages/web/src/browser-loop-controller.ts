import type { LoopController } from '@gbjs/core/types';

export const browserLoopController: LoopController = {
  now: () => performance.now(),
  schedule: (callback) => requestAnimationFrame(callback),
  cancel: (handle) => cancelAnimationFrame(handle as number),
};
