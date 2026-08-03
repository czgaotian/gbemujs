import { describe, expect, it } from 'vitest';
import { GameBoy } from '../../src/emu/emu';

describe('Channel 1 control registers', () => {
  it('routes channel 1 to the outputs selected by NR51', () => {
    const gameBoy = new GameBoy(() => () => {});

    gameBoy.apu.setRegister(0x15, 0x10);
    expect(gameBoy.apu.channel1.leftEnabled).toBe(true);
    expect(gameBoy.apu.channel1.rightEnabled).toBe(false);

    gameBoy.apu.setRegister(0x15, 0x01);
    expect(gameBoy.apu.channel1.leftEnabled).toBe(false);
    expect(gameBoy.apu.channel1.rightEnabled).toBe(true);
  });

  it('derives the channel 1 DAC state from NR12', () => {
    const gameBoy = new GameBoy(() => () => {});

    gameBoy.apu.setRegister(0x02, 0xf8);
    gameBoy.apu.setRegister(0x12, 0x00);
    expect(gameBoy.apu.channel1.dacOn).toBe(true);

    gameBoy.apu.setRegister(0x02, 0x00);
    gameBoy.apu.setRegister(0x12, 0xf8);
    expect(gameBoy.apu.channel1.dacOn).toBe(false);
  });
});
