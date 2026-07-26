import { afterEach, expect, test, vi } from 'vitest';
import { browserLoopController } from '../../../web/src/browser-loop-controller';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

test('reads the browser performance clock', () => {
  vi.spyOn(performance, 'now').mockReturnValue(42);

  expect(browserLoopController.now()).toBe(42);
});

test('returns a cancellation function for the scheduled browser RAF', () => {
  const callback = vi.fn();
  const requestAnimationFrame = vi.fn(() => 7);
  const cancelAnimationFrame = vi.fn();
  vi.stubGlobal('requestAnimationFrame', requestAnimationFrame);
  vi.stubGlobal('cancelAnimationFrame', cancelAnimationFrame);

  const cancel = browserLoopController.schedule(callback);
  cancel();

  expect(requestAnimationFrame).toHaveBeenCalledWith(callback);
  expect(cancelAnimationFrame).toHaveBeenCalledWith(7);
});
