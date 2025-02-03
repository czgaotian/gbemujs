export class Registers {
    // 8位寄存器
    public a: number = 0;
    public b: number = 0;
    public c: number = 0;
    public d: number = 0;
    public e: number = 0;
    public h: number = 0;
    public l: number = 0;
    public f: number = 0;

    // 16位程序计数器和栈指针
    public pc: number = 0;
    public sp: number = 0;

    public reset(): void {
        this.a = 0;
        this.b = 0;
        this.c = 0;
        this.d = 0;
        this.e = 0;
        this.h = 0;
        this.l = 0;
        this.f = 0;
        this.pc = 0;
        this.sp = 0;
    }

    // 获取16位组合寄存器
    public get af(): number {
        return (this.a << 8) | this.f;
    }

    public get bc(): number {
        return (this.b << 8) | this.c;
    }

    public get de(): number {
        return (this.d << 8) | this.e;
    }

    public get hl(): number {
        return (this.h << 8) | this.l;
    }
} 