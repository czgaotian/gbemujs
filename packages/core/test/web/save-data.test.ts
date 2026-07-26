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
    const savedAt = 1_700_000_000;
    const source = {
      getSaveData(timestamp: number): Uint8Array | null {
        expect(timestamp).toBe(savedAt);
        return new Uint8Array([0x47, 0x42, 0x4a, 0x53]);
      },
    };

    saveCartridgeData(storage, 'pokemon.gb', source, savedAt);

    expect(loadSaveData(storage, 'pokemon.gb')).toEqual(
      new Uint8Array([0x47, 0x42, 0x4a, 0x53]),
    );
    expect(storage.getItem('gbjs:rtc:pokemon.gb')).toBeNull();
  });

  test('uses whole UNIX seconds by default', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_999_000);
    let receivedTimestamp = 0;
    const source = {
      getSaveData(timestamp: number): Uint8Array {
        receivedTimestamp = timestamp;
        return new Uint8Array([0x47]);
      },
    };

    saveCartridgeData(new MemoryStorage(), 'pokemon.gb', source);

    expect(receivedTimestamp).toBe(1_700_000_999);
  });
});
