import {
    TURBOJACK_MARK,
    handLockVisual,
    isTurbojacked,
    turbojackVisual,
} from './rules';

const mark = { id: TURBOJACK_MARK, hero: 'cyclo', type: 'debuff' };

describe('The Turbojack mark', () => {
    test('is recognised on a card that carries it', () => {
        expect(isTurbojacked([mark])).toBe(true);
        expect(isTurbojacked([{ id: 'shield-bash' }, mark])).toBe(true);
    });

    test('is absent on an ordinary card', () => {
        expect(isTurbojacked([])).toBe(false);
        expect(isTurbojacked([{ id: 'shield-bash' }])).toBe(false);
        expect(isTurbojacked(undefined)).toBe(false);
        expect(isTurbojacked(null)).toBe(false);
    });

    test('shows a banner saying what happened', () => {
        expect(turbojackVisual([mark])).toEqual({
            className: 'turbojacked',
            label: 'TURBOJACK',
        });
        expect(turbojackVisual([])).toBeNull();
    });

    // Held and Turbojacked mean opposite things — one cannot be played, the
    // other can — so they must not be mistaken for each other.
    test('is a different banner from a held card', () => {
        expect(turbojackVisual([mark]).label).not.toBe(handLockVisual(true).label);
        expect(turbojackVisual([mark]).className).not.toBe(handLockVisual(true).className);
    });
});
