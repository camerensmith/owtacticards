export class SeededRNG {
    constructor(seed = 123456789) {
        this._seed = seed >>> 0;
    }
    next() {
        // xorshift32
        let x = this._seed;
        x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
        this._seed = x >>> 0;
        return (this._seed & 0xffffffff) / 0x100000000;
    }
    pick(array) {
        if (!array || array.length === 0) return undefined;
        const idx = Math.floor(this.next() * array.length);
        return array[idx];
    }
}


