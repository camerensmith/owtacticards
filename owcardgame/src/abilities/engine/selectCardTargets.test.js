import { selectCardTargets } from './targeting';
import targetingBus from './targetingBus';
import { REJECT } from '../../game/targetSelection';

jest.mock('./soundController', () => ({ playWithOverlay: jest.fn() }));

const cards = {
    '1ana': { id: 'ana', health: 3 },
    '2mercy': { id: 'mercy', health: 3 },
    '2mei': { id: 'mei', health: 3 },
    '2dead': { id: 'bastion', health: 0 },
};

let banners;

/** Queues what the player clicks; null stands for a right-click. */
function clicks(...sequence) {
    const queue = [...sequence];
    window.__ow_selectCardTarget = jest.fn(() => Promise.resolve(
        queue.length ? queue.shift() : null
    ));
}

beforeEach(() => {
    banners = [];
    targetingBus.subscribe((message) => banners.push(message));
    window.__ow_getCard = (id) => cards[id];
    window.__ow_getPlayerTurn = () => 2;
    window.__ow_practiceMode = false;
    window.__ow_isSandstormActive = () => false;
    window.__ow_aiUltimateTarget = null;
});

afterEach(() => {
    targetingBus.clearMessage();
    delete window.__ow_selectCardTarget;
    delete window.__ow_getPlayerTurn;
});

/*
 * Driven through the AI delegate because it is the one seam that feeds
 * `selectCardTarget` a decision without a real click. The loop under test —
 * refuse and re-ask, right-click to commit — is the same either way.
 */
const enemyRules = { side: 'enemy', casterPlayerNum: 2 };

describe('collecting several targets', () => {
    test('takes the number asked for', async () => {
        clicks({ cardId: '1ana', rowId: '1f' }, { cardId: '1ana', rowId: '1f' });

        const picked = await selectCardTargets({
            count: 2,
            rules: { casterPlayerNum: 2, unique: false },
        });

        expect(picked).toHaveLength(2);
    });

    test('stops early when the player right-clicks, keeping what is picked', async () => {
        clicks({ cardId: '1ana', rowId: '1f' }, null);

        const picked = await selectCardTargets({ count: 2, rules: enemyRules });

        expect(picked).toEqual([{ cardId: '1ana', rowId: '1f' }]);
    });

    test('returns nothing when the player backs out before picking', async () => {
        clicks(null);

        expect(await selectCardTargets({ count: 2, rules: enemyRules })).toEqual([]);
    });
});

/*
 * The bug this replaces: an invalid pick ended the ability outright, so a
 * misclick cost the whole on-enter instead of a click.
 */
describe('an invalid pick', () => {
    test('is refused and asked again rather than ending the ability', async () => {
        clicks(
            { cardId: '2mercy', rowId: '2f' },   // own hero — refused
            { cardId: '1ana', rowId: '1f' },     // accepted
        );

        const picked = await selectCardTargets({ count: 1, rules: enemyRules });

        expect(picked).toEqual([{ cardId: '1ana', rowId: '1f' }]);
    });

    test('says why, in the prompt so it is not overwritten', async () => {
        clicks({ cardId: '2mercy', rowId: '2f' }, { cardId: '1ana', rowId: '1f' });

        await selectCardTargets({ count: 1, rules: enemyRules });

        expect(banners).toContain(REJECT.ally);
    });

    test('refuses a hero already picked and takes a different one', async () => {
        clicks(
            { cardId: '1ana', rowId: '1f' },
            { cardId: '1ana', rowId: '1f' },     // same hero — refused
            null,
        );

        const picked = await selectCardTargets({ count: 2, rules: enemyRules });

        expect(picked).toEqual([{ cardId: '1ana', rowId: '1f' }]);
        expect(banners.some((b) => b && b.includes(REJECT.duplicate))).toBe(true);
    });

    test('refuses a hero that is already down', async () => {
        clicks({ cardId: '2dead', rowId: '2f' }, null);

        const picked = await selectCardTargets({
            count: 1,
            rules: { casterPlayerNum: 1 },
        });

        expect(picked).toEqual([]);
        expect(banners).toContain(REJECT.dead);
    });

    // A delegate that keeps returning the same refused pick must not spin.
    test('gives up rather than looping forever', async () => {
        window.__ow_selectCardTarget = jest.fn(() => Promise.resolve({ cardId: '2mercy', rowId: '2f' }));

        const picked = await selectCardTargets({ count: 2, rules: enemyRules });

        expect(picked).toEqual([]);
        expect(window.__ow_selectCardTarget.mock.calls.length).toBeLessThan(100);
    });
});

test('the banner is cleared when selection ends', async () => {
    clicks({ cardId: '1ana', rowId: '1f' });

    await selectCardTargets({ count: 1, rules: enemyRules });

    expect(targetingBus.getMessage()).toBeNull();
});
