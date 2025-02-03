import { Registers } from './registers';
import { MMU } from '../mmu/mmu';

export class CPU {
    private registers: Registers;
    private mmu: MMU;
    private clock: number;

    constructor(mmu: MMU) {
        this.registers = new Registers();
        this.mmu = mmu;
        this.clock = 0;
    }

    public reset(): void {
        this.registers.reset();
        this.clock = 0;
    }

    public step(): number {
        // 读取下一条指令
        const opcode = this.mmu.readByte(this.registers.pc);
        // TODO: 实现指令执行
        return 4; // 返回指令执行所需的时钟周期
    }
} 