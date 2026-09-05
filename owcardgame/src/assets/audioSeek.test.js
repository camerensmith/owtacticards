import { playAudioByKey } from './imageImports';

/**
 * `startAtMs` exists for clips with a long run-up, so the part that matters
 * lands with the effect instead of trailing it.
 *
 * A real key is used throughout: an unknown one resolves to no source and
 * never reaches the Audio element at all. Debouncing is off so repeated
 * plays of that key across tests are not swallowed.
 */
describe('playAudioByKey start offset', () => {
    const KEY = 'hanzo-ultimate';
    let instances;
    let OriginalAudio;

    function play(options) {
        playAudioByKey(KEY, { debounceMs: 0, ...options });
        expect(instances).toHaveLength(1);
        return instances[0];
    }

    beforeEach(() => {
        instances = [];
        OriginalAudio = global.Audio;
        global.Audio = class FakeAudio {
            constructor(src) {
                this.src = src;
                this.currentTime = 0;
                this.readyState = 0;
                this.listeners = {};
                this.play = jest.fn(() => Promise.resolve());
                instances.push(this);
            }

            addEventListener(name, fn) {
                this.listeners[name] = fn;
            }

            emit(name) {
                this.listeners[name]?.();
            }
        };
    });

    afterEach(() => {
        global.Audio = OriginalAudio;
    });

    test('plays from the top when no offset is given', () => {
        const audio = play();
        expect(audio.play).toHaveBeenCalled();
        expect(audio.currentTime).toBe(0);
    });

    test('waits for metadata before seeking, so the opening never blips', () => {
        const audio = play({ startAtMs: 1700 });
        expect(audio.play).not.toHaveBeenCalled();

        audio.emit('loadedmetadata');
        expect(audio.currentTime).toBeCloseTo(1.7);
        expect(audio.play).toHaveBeenCalled();
    });

    test('seeks straight away when the duration is already known', () => {
        const Ready = global.Audio;
        global.Audio = class extends Ready {
            constructor(src) {
                super(src);
                this.readyState = 4;
            }
        };

        const audio = play({ startAtMs: 1700 });
        expect(audio.currentTime).toBeCloseTo(1.7);
        expect(audio.play).toHaveBeenCalled();
    });

    test('a browser that refuses the seek still plays', () => {
        const audio = play({ startAtMs: 1700 });
        Object.defineProperty(audio, 'currentTime', {
            set() { throw new Error('InvalidStateError'); },
            get() { return 0; },
        });

        expect(() => audio.emit('loadedmetadata')).not.toThrow();
        expect(audio.play).toHaveBeenCalled();
    });
});
