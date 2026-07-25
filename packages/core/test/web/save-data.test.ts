import { describe, expect, test } from 'vitest';
import { loadRAMData, saveRAMData } from '../../../web/src/save-data';

class MemoryStorage {
  private values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

describe('RAM save data storage', () => {
  test('stores and restores binary RAM data under the uploaded filename', () => {
    const storage = new MemoryStorage();

    saveRAMData(storage, 'pokemon.gb', new Uint8Array([0x00, 0x7f, 0xff]));

    expect(loadRAMData(storage, 'pokemon.gb')).toEqual(
      new Uint8Array([0x00, 0x7f, 0xff]),
    );
  });

  test('does not write a save for cartridges without battery-backed RAM', () => {
    const storage = new MemoryStorage();

    saveRAMData(storage, 'tetris.gb', null);

    expect(storage.getItem('gbjs:save:tetris.gb')).toBeNull();
  });
});
