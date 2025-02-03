import { CPU } from './cpu/cpu';
import { MMU } from './mmu/mmu';
import { PPU } from './ppu/ppu';
import { APU } from './apu/apu';
import { Joypad } from './joypad/joypad';

class GameBoy {
    private cpu: CPU;
    private mmu: MMU;
    private ppu: PPU;
    private apu: APU;
    private joypad: Joypad;

    constructor() {
        this.mmu = new MMU();
        this.cpu = new CPU(this.mmu);
        this.ppu = new PPU(this.mmu);
        this.apu = new APU();
        this.joypad = new Joypad();
    }

    public loadROM(data: Uint8Array): void {
        this.mmu.loadROM(data);
        this.reset();
    }

    public reset(): void {
        this.cpu.reset();
        // TODO: 重置其他组件
    }

    public runFrame(): void {
        // TODO: 实现帧循环
    }
}

export default GameBoy; 
