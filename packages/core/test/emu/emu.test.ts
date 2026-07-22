import { afterEach, expect, test, vi } from 'vitest';
import { GameBoy } from '../../src/emu/emu';

const rom = (): Uint8Array => {
  const data = new Uint8Array(0x8000);
  let checksum = 0;
  for (let address = 0x0134; address <= 0x014c; address++) {
    checksum = checksum - data[address] - 1;
  }
  data[0x014d] = checksum & 0xff;
  return data;
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

test('converts RAF milliseconds to seconds before updating', () => {
  const callbacks: FrameRequestCallback[] = [];
  vi.spyOn(performance, 'now').mockReturnValue(0);
  vi.stubGlobal('window', { document: {} });
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    callbacks.push(callback);
    return callbacks.length;
  });
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  const gameBoy = new GameBoy();
  const update = vi.spyOn(gameBoy, 'update').mockImplementation(() => {});

  gameBoy.start(rom());
  callbacks[0](gameBoy.lastTime + 16);

  expect(update).toHaveBeenCalledWith(0.016);
});

test('cancels the pending browser callback when started twice', () => {
  const callbacks: FrameRequestCallback[] = [];
  const cancelAnimationFrame = vi.fn();
  vi.stubGlobal('window', { document: {} });
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    callbacks.push(callback);
    return callbacks.length;
  });
  vi.stubGlobal('cancelAnimationFrame', cancelAnimationFrame);
  const gameBoy = new GameBoy();

  gameBoy.start(rom());
  gameBoy.start(rom());

  expect(cancelAnimationFrame).toHaveBeenCalledWith(1);
});
