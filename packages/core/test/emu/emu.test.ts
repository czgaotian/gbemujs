import { afterEach, expect, test, vi } from 'vitest';
import { GameBoy } from '../../src/emu/emu';
import type { LoopController } from '../../src/types';

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
});

const createLoopController = () => {
  const callbacks: Array<() => void> = [];
  const activeHandles = new Set<number>();
  let currentTime = 0;
  const controller: LoopController = {
    now: vi.fn(() => currentTime),
    schedule: vi.fn((callback) => {
      const handle = callbacks.length + 1;
      activeHandles.add(handle);
      callbacks.push(() => {
        activeHandles.delete(handle);
        callback();
      });
      return () => activeHandles.delete(handle);
    }),
  };
  return {
    controller,
    callbacks,
    activeHandles,
    setCurrentTime: (time: number) => {
      currentTime = time;
    },
  };
};

test('converts the controller clock from milliseconds to seconds before updating', () => {
  const { controller, callbacks, setCurrentTime } = createLoopController();
  const gameBoy = new GameBoy(controller);
  const update = vi.spyOn(gameBoy, 'update').mockImplementation(() => {});

  gameBoy.start(rom());
  setCurrentTime(16);
  callbacks[0]();

  expect(update).toHaveBeenCalledWith(0.016);
  expect(controller.schedule).toHaveBeenCalledTimes(2);
});

test('caps a scheduled delay at the maximum timestep', () => {
  const { controller, callbacks, setCurrentTime } = createLoopController();
  const gameBoy = new GameBoy(controller);
  const update = vi.spyOn(gameBoy, 'update').mockImplementation(() => {});

  gameBoy.start(rom());
  setCurrentTime(1000);
  callbacks[0]();

  expect(update).toHaveBeenCalledWith(0.125);
});

test('cancels the pending callback before restarting', () => {
  const { controller, activeHandles } = createLoopController();
  const gameBoy = new GameBoy(controller);

  gameBoy.start(rom());
  gameBoy.start(rom());

  expect(activeHandles).toEqual(new Set([2]));
});

test('cancels the pending callback when closed', () => {
  const { controller, activeHandles } = createLoopController();
  const gameBoy = new GameBoy(controller);

  gameBoy.start(rom());
  gameBoy.close();

  expect(activeHandles).toEqual(new Set());
});

test('does not reschedule after update closes the emulator', () => {
  const { controller, callbacks, activeHandles } = createLoopController();
  const gameBoy = new GameBoy(controller);
  vi.spyOn(gameBoy, 'update').mockImplementation(() => gameBoy.close());

  gameBoy.start(rom());
  callbacks[0]();

  expect(controller.schedule).toHaveBeenCalledTimes(1);
  expect(activeHandles).toEqual(new Set());
});

test('does not add a second loop after update restarts the emulator', () => {
  const { controller, callbacks, activeHandles } = createLoopController();
  const gameBoy = new GameBoy(controller);
  vi.spyOn(gameBoy, 'update').mockImplementation(() => gameBoy.start(rom()));

  gameBoy.start(rom());
  callbacks[0]();

  expect(controller.schedule).toHaveBeenCalledTimes(2);
  expect(activeHandles).toEqual(new Set([2]));
});
