import {
    POOL_LIMIT,
    acquireAudio,
    playSrc,
    pooledCount,
    resetAudioPool,
    warmAudio,
} from './audioPool';

let built = [];

class FakeAudio {
    constructor(src) {
        this.src = src;
        this.paused = true;
        this.ended = false;
        this.currentTime = 0;
        this.readyState = 0;
        this.preload = 'none';
        this.loads = 0;
        this.plays = 0;
        this.listeners = {};
        built.push(this);
    }

    load() {
        this.loads += 1;
        this.readyState = 4;
    }

    play() {
        this.plays += 1;
        this.paused = false;
        this.ended = false;
        return Promise.resolve();
    }

    addEventListener(name, fn) {
        (this.listeners[name] = this.listeners[name] || []).push(fn);
    }

    emit(name) {
        (this.listeners[name] || []).forEach((fn) => fn());
    }
}

beforeEach(() => {
    built = [];
    resetAudioPool();
    global.Audio = FakeAudio;
});

afterEach(() => {
    resetAudioPool();
    delete global.Audio;
});

describe('audio pooling', () => {
    // The point of the pool: a repeat play must not pay for a second fetch
    // and decode, which is what made sounds arrive after the action.
    test('replays one element rather than building a new one', () => {
        const first = playSrc('bang.mp3');
        first.paused = true;
        first.ended = true;
        const second = playSrc('bang.mp3');

        expect(second).toBe(first);
        expect(built).toHaveLength(1);
        expect(first.plays).toBe(2);
    });

    test('rewinds a reused element so it plays from the top', () => {
        const el = playSrc('bang.mp3');
        el.currentTime = 1.4;
        el.ended = true;

        playSrc('bang.mp3');

        expect(el.currentTime).toBe(0);
    });

    test('gives each source its own pool', () => {
        playSrc('bang.mp3');
        playSrc('thud.mp3');

        expect(pooledCount('bang.mp3')).toBe(1);
        expect(pooledCount('thud.mp3')).toBe(1);
    });

    test('overlapping plays of one clip get their own elements', () => {
        const a = playSrc('bang.mp3');
        const b = playSrc('bang.mp3');

        expect(b).not.toBe(a);
        expect(pooledCount('bang.mp3')).toBe(2);
    });

    // A key fired in a tight loop must not grow the pool without bound.
    test('stops growing at the limit and reuses the furthest-along copy', () => {
        for (let i = 0; i < POOL_LIMIT + 3; i += 1) {
            playSrc('bang.mp3').currentTime = i * 0.1;
        }

        expect(pooledCount('bang.mp3')).toBe(POOL_LIMIT);
    });

    test('a busy pool recycles the copy nearest its end', () => {
        const els = [];
        for (let i = 0; i < POOL_LIMIT; i += 1) els.push(playSrc('bang.mp3'));
        els.forEach((el, i) => { el.currentTime = i * 0.5; });

        expect(playSrc('bang.mp3')).toBe(els[POOL_LIMIT - 1]);
    });
});

describe('seeking into a clip', () => {
    test('waits for metadata before seeking a cold element', () => {
        const el = playSrc('long.mp3', { startAtMs: 1700 });

        expect(el.plays).toBe(0);
        el.readyState = 1;
        el.emit('loadedmetadata');
        expect(el.currentTime).toBeCloseTo(1.7);
        expect(el.plays).toBe(1);
    });

    test('seeks straight away once the element knows its duration', () => {
        const el = playSrc('long.mp3', { startAtMs: 1700 });
        el.readyState = 4;
        el.emit('loadedmetadata');
        el.paused = true;
        el.ended = true;

        playSrc('long.mp3', { startAtMs: 1700 });

        expect(el.currentTime).toBeCloseTo(1.7);
        expect(el.plays).toBe(2);
    });
});

describe('warming', () => {
    test('buffers each source once, without playing it', () => {
        expect(warmAudio(['a.mp3', 'b.mp3'])).toBe(2);
        expect(built).toHaveLength(2);
        expect(built.every((el) => el.loads === 1 && el.plays === 0)).toBe(true);
    });

    test('a warmed clip plays from the element already buffered', () => {
        warmAudio(['a.mp3']);
        const el = playSrc('a.mp3');

        expect(built).toHaveLength(1);
        expect(el.plays).toBe(1);
    });

    test('skips sources already held and ignores blanks', () => {
        warmAudio(['a.mp3']);
        expect(warmAudio(['a.mp3', null, ''])).toBe(0);
        expect(built).toHaveLength(1);
    });
});

test('does nothing where there is no Audio support', () => {
    delete global.Audio;

    expect(acquireAudio('bang.mp3')).toBeNull();
    expect(playSrc('bang.mp3')).toBeNull();
    expect(warmAudio(['bang.mp3'])).toBe(0);
});
