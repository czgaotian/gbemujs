import type { LoopController } from '@gbjs/core/types';

export const browserLoopController: LoopController = {
  now: () => performance.now(),
  schedule: (callback) => {
    const handle = requestAnimationFrame(callback);
    return () => cancelAnimationFrame(handle);
  },
};
