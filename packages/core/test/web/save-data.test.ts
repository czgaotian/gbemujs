import { afterEach, describe, expect, test, vi } from 'vitest';
import {
  loadSaveData,
  saveCartridgeData,
  saveSaveData,
} from '../../../web/src/save-data';

class MemoryStorage {
  private values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('cartridge save data storage', () => {
  test('stores and restores binary save data under the uploaded filename', () => {
    const storage = new MemoryStorage();

    saveSaveData(storage, 'pokemon.gb', new Uint8Array([0x00, 0x7f, 0xff]));

    expect(loadSaveData(storage, 'pokemon.gb')).toEqual(
      new Uint8Array([0x00, 0x7f, 0xff]),
    );
  });

  test('does not write a save for cartridges without battery-backed RAM', () => {
    const storage = new MemoryStorage();

    saveSaveData(storage, 'tetris.gb', null);

    expect(storage.getItem('gbjs:save:tetris.gb')).toBeNull();
  });

  test('stores a full cartridge payload under the existing single save key', () => {
    const storage = new MemoryStorage();
    const getSaveData = vi.fn(
      () => new Uint8Array([0x47, 0x42, 0x4a, 0x53]),
    );
    const source = {
      getSaveData,
    };

    saveCartridgeData(storage, 'pokemon.gb', source);

    expect(loadSaveData(storage, 'pokemon.gb')).toEqual(
      new Uint8Array([0x47, 0x42, 0x4a, 0x53]),
    );
    expect(getSaveData).toHaveBeenCalledOnce();
    expect(getSaveData).toHaveBeenCalledWith();
    expect(storage.getItem('gbjs:rtc:pokemon.gb')).toBeNull();
  });
});
