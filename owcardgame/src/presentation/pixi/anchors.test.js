import { boxOf, rowBox, rowRect, toLocalRect } from './anchors';

/** jsdom gives every element a zero rect, so sizes have to be stubbed. */
function addEl(id, rect) {
    const el = document.createElement('div');
    el.id = id;
    el.getBoundingClientRect = () => ({
        left: rect.left, top: rect.top, width: rect.width, height: rect.height,
        right: rect.left + rect.width, bottom: rect.top + rect.height,
    });
    document.body.appendChild(el);
    return el;
}

const app = { canvas: { getBoundingClientRect: () => ({ left: 0, top: 0, width: 1000, height: 800 }) } };

afterEach(() => {
    document.body.innerHTML = '';
});

describe('boxOf', () => {
    test('ignores elements with no size', () => {
        addEl('empty', { left: 0, top: 0, width: 0, height: 0 });
        expect(boxOf('empty')).toBeNull();
    });

    test('returns null for a missing id', () => {
        expect(boxOf('nope')).toBeNull();
    });
});

describe('rowBox', () => {
    // The bug: row effects were anchored to the <ul>, which sizes to its cards,
    // so an empty row collapsed and the effect grew as cards were added.
    test('prefers the row strip over the card list', () => {
        addEl('1f-boardrow', { left: 10, top: 20, width: 400, height: 100 });
        addEl('1f-list', { left: 15, top: 25, width: 60, height: 90 });

        const box = rowBox('1f');
        expect(box.width).toBe(400);
        expect(box.height).toBe(100);
    });

    test('an empty row still measures full size', () => {
        addEl('1m-boardrow', { left: 10, top: 20, width: 400, height: 100 });
        addEl('1m-list', { left: 15, top: 25, width: 0, height: 0 });

        expect(rowBox('1m').width).toBe(400);
    });

    test('the row strip does not grow as cards are added', () => {
        addEl('1b-boardrow', { left: 10, top: 20, width: 400, height: 100 });
        const list = addEl('1b-list', { left: 15, top: 25, width: 0, height: 0 });
        const empty = rowBox('1b').width;

        list.getBoundingClientRect = () => ({
            left: 15, top: 25, width: 300, height: 90, right: 315, bottom: 115,
        });
        expect(rowBox('1b').width).toBe(empty);
    });

    test('falls back through the card display to the list', () => {
        addEl('2f-carddisplay', { left: 0, top: 0, width: 380, height: 96 });
        addEl('2f-list', { left: 5, top: 5, width: 60, height: 90 });
        expect(rowBox('2f').width).toBe(380);

        document.body.innerHTML = '';
        addEl('2m-list', { left: 5, top: 5, width: 60, height: 90 });
        expect(rowBox('2m').width).toBe(60);
    });

    test('missing row measures as nothing rather than throwing', () => {
        expect(rowBox('2b')).toBeNull();
        expect(rowRect(app, '2b')).toBeNull();
    });
});

describe('coordinate conversion', () => {
    test('subtracts the canvas offset', () => {
        const offsetApp = {
            canvas: { getBoundingClientRect: () => ({ left: 100, top: 50, width: 800, height: 600 }) },
        };
        const rect = toLocalRect(offsetApp, { left: 150, top: 100, width: 40, height: 60 });
        expect(rect.left).toBe(50);
        expect(rect.top).toBe(50);
        // Centre point, for effects drawn around a middle.
        expect(rect.x).toBe(70);
        expect(rect.y).toBe(80);
    });

    test('handles a missing box or app', () => {
        expect(toLocalRect(app, null)).toBeNull();
        expect(toLocalRect(null, { left: 0, top: 0, width: 1, height: 1 })).toBeNull();
    });
});
