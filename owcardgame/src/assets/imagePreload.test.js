import { preloadHeroCardImages } from './imagePreload';
import { heroCardImages } from './imageImports';

let requested = [];
let RealImage;

class FakeImage {
    set src(value) {
        requested.push(value);
    }
}

beforeEach(() => {
    requested = [];
    RealImage = global.Image;
    global.Image = FakeImage;
});

afterEach(() => {
    global.Image = RealImage;
});

/*
 * Player 2's hand is dealt face-down, so a card the AI plays has never been
 * rendered face-up: the <img> swaps from the card back to art the browser has
 * never fetched, and the slot is empty until it loads. That gap is the enemy
 * hero appearing to vanish before it lands.
 */
describe('warming the card faces', () => {
    test('requests every hero card face', () => {
        const expected = Object.values(heroCardImages).filter(Boolean);

        expect(preloadHeroCardImages()).toBe(expected.length);
        expect(requested).toEqual(expect.arrayContaining(expected));
    });

    test('covers the faces, not just the back', () => {
        preloadHeroCardImages();

        expect(requested).toContain(heroCardImages.ana);
        expect(requested).toContain(heroCardImages.tracer);
        expect(requested.length).toBeGreaterThan(20);
    });

    test('does nothing where there is no Image support', () => {
        global.Image = undefined;

        expect(preloadHeroCardImages()).toBe(0);
        expect(requested).toEqual([]);
    });
});
