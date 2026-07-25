# Rename RAM Read API

## Goal

Rename the core API that returns the cartridge's current RAM contents from
`saveRAMData()` to `getRAMData()`. The new name describes the operation as a
read and avoids conflating it with persistence.

## Scope

- Rename `Cartridge.saveRAMData()` to `Cartridge.getRAMData()`.
- Rename `GameBoy.saveRAMData()` to `GameBoy.getRAMData()`.
- Update core tests and web callers of those two methods.
- Keep the web helper `saveRAMData(storage, fileName, data)` unchanged because
  it writes data to browser storage.

## Behavior

This is an API-only rename. Return types, returned bytes, null behavior, and
browser persistence behavior remain unchanged.

## Verification

- Add or update API-level tests so the old method name fails before the rename
  and the new method name passes afterward.
- Run the relevant core and web tests.
- Search the repository to ensure no core `saveRAMData()` method references
  remain.
