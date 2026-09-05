import { onUltimate } from './reaper';
import { dealDamage } from '../engine/damageBus';
import { BLOSSOM } from '../../presentation/pixi/fxConfig';

jest.mock('../../assets/imageImports', () => ({
    playAudioByKey: jest.fn(),
}));

jest.mock('../engine/damageBus', () => ({
    dealDamage: jest.fn(),
}));

jest.mock('../engine/targetingBus', () => ({
    showMessage: jest.fn(),
    clearMessage: jest.fn(),
}));

jest.mock('../engine/modalController', () => ({
    showOnEnterChoice: jest.fn(),
}));

jest.mock('../engine/aiContextHelper', () => ({
    withAIContext: (fn) => fn,
}));

/** Reaper in 1f; the enemy fields a full middle row and one flanker. */
function setupBoard() {
    const rows = {
        '1f': { cardIds: ['1reaper'] },
        '2f': { cardIds: ['2a', '2b', '2c', '2d'] },
        '2m': { cardIds: ['2e', '2f2', '2g', '2h'] },
        '2b': { cardIds: [] },
    };
    window.__ow_getRow = (id) => rows[id];
    window.__ow_getCard = () => ({ health: 5 });
    window.__ow_dispatchAction = jest.fn();
    window.__ow_aiTriggering = false;
    window.__ow_isAITurn = false;
}

/**
 * Jest 27 has no async timer helpers, so each tick is advanced synchronously
 * and the microtask queue drained by hand to let the ability's await resume.
 */
async function step() {
    jest.advanceTimersByTime(BLOSSOM.tickMs);
    for (let i = 0; i < 6; i += 1) await Promise.resolve();
}

async function runUltimate() {
    const pending = onUltimate({ playerHeroId: '1reaper', rowId: '1f' });
    // Comfortably more steps than the 12 ticks this board produces.
    for (let i = 0; i < 30; i += 1) await step();
    await pending;
}

beforeEach(() => {
    jest.useFakeTimers();
    setupBoard();
    dealDamage.mockClear();
});

afterEach(() => {
    jest.useRealTimers();
});

test('every target in the cross takes exactly 3, one point at a time', async () => {
    await runUltimate();

    const perTarget = dealDamage.mock.calls.reduce((acc, [cardId, , amount]) => {
        acc[cardId] = (acc[cardId] || 0) + amount;
        return acc;
    }, {});

    // Centre columns of the front and middle rows; back row is empty.
    expect(perTarget).toEqual({ '2b': 3, '2c': 3, '2f2': 3, '2g': 3 });

    // Delivered as single points, never one lump.
    for (const call of dealDamage.mock.calls) {
        expect(call[2]).toBe(1);
    }
    expect(dealDamage).toHaveBeenCalledTimes(12);
});

// Without fixedDamage each tick re-applies Discord / Mercy boost / Infra-Sight,
// so a boosted target would take those modifiers three times over.
test('ticks are fixed damage, so per-hit modifiers cannot stack up', async () => {
    await runUltimate();

    for (const call of dealDamage.mock.calls) {
        const [, , amount, ignoreShields, sourceCardId, fixedDamage] = call;
        expect(amount).toBe(1);
        expect(ignoreShields).toBe(true);
        expect(sourceCardId).toBe('1reaper');
        expect(fixedDamage).toBe(true);
    }
});

test('the outer columns are never hit', async () => {
    await runUltimate();

    const hit = new Set(dealDamage.mock.calls.map(([cardId]) => cardId));
    for (const outer of ['2a', '2d', '2e', '2h']) {
        expect(hit.has(outer)).toBe(false);
    }
});

test('a target that dies partway through stops taking ticks', async () => {
    const dead = new Set();
    window.__ow_getCard = (id) => ({ health: dead.has(id) ? 0 : 5 });
    dealDamage.mockImplementation((cardId) => {
        // '2b' dies on its first tick.
        if (cardId === '2b') dead.add(cardId);
    });

    await runUltimate();

    const hits = dealDamage.mock.calls.filter(([cardId]) => cardId === '2b').length;
    expect(hits).toBe(1);
    dealDamage.mockImplementation(() => {});
});
