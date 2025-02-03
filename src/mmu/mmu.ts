import { Cartridge } from '../cartridge/cartridge';

export class MMU {
    private memory: Uint8Array;
    private cartridge: Cartridge;

    constructor() {
        this.memory = new Uint8Array(0x10000); // 64KB 内存空间
        this.cartridge = new Cartridge();
    }

    public readByte(address: number): number {
        // 卡带ROM和RAM区域
        if (address < 0x8000 || (address >= 0xA000 && address < 0xC000)) {
            return this.cartridge.readByte(address);
        }
        
        // 其他内存区域
        return this.memory[address];
    }

    public writeByte(address: number, value: number): void {
        // 卡带ROM和RAM区域
        if (address < 0x8000 || (address >= 0xA000 && address < 0xC000)) {
            this.cartridge.writeByte(address, value);
            return;
        }
        
        // 其他内存区域
        this.memory[address] = value;
    }

    public loadROM(data: Uint8Array): void {
        this.cartridge.loadROM(data);
        console.log('Loaded cartridge:', this.cartridge.getCartridgeInfo());
    }

    // 保存游戏存档
    public getSaveData(): Uint8Array | null {
        return this.cartridge.getSaveData();
    }

    // 加载游戏存档
    public loadSaveData(data: Uint8Array): void {
        this.cartridge.loadSaveData(data);
    }
} 