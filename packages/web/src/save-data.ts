export interface SaveStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface CartridgeSaveSource {
  getSaveData(savedTimestamp: number): Uint8Array | null;
}

function saveKey(fileName: string): string {
  return `gbjs:save:${fileName}`;
}

function encode(data: Uint8Array): string {
  let binary = '';
  for (const byte of data) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function decode(value: string): Uint8Array | null {
  try {
    const binary = atob(value);
    const data = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      data[index] = binary.charCodeAt(index);
    }
    return data;
  } catch {
    return null;
  }
}

export function loadSaveData(
  storage: SaveStorage,
  fileName: string,
): Uint8Array | null {
  const value = storage.getItem(saveKey(fileName));
  return value === null ? null : decode(value);
}

export function saveSaveData(
  storage: SaveStorage,
  fileName: string,
  data: Uint8Array | null,
): void {
  if (data === null) return;
  storage.setItem(saveKey(fileName), encode(data));
}

export function saveCartridgeData(
  storage: SaveStorage,
  fileName: string,
  source: CartridgeSaveSource,
  savedUnixSeconds = Math.floor(Date.now() / 1000),
): void {
  saveSaveData(storage, fileName, source.getSaveData(savedUnixSeconds));
}
