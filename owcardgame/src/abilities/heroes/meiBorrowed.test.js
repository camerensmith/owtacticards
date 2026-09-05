import { onUltimate } from './mei';
import { selectRowTarget } from '../engine/targeting';
import { BLIZZARD_TOKEN_ID, castsBlizzardWithFreeze } from '../../game/blizzard';

jest.mock('../../assets/imageImports', () => ({ playAudioByKey: jest.fn() }));
jest.mock('../engine/targeting', () => ({ selectRowTarget: jest.fn() }));
jest.mock('../engine/targetingBus', () => ({
    showMessage: jest.fn(),
    clearMessage: jest.fn(),
}));

let rows;

function setup() {
    rows = {
        '2f': { cardIds: ['2ana'], enemyEffects: [] },
        '2m': { cardIds: [], enemyEffects: [] },
        '2b': { cardIds: [], enemyEffects: [] },
    };
    window.__ow_getRow = (id) => rows[id];
    window.__ow_getCard = () => ({ health: 3 });
    window.__ow_appendRowEffect = jest.fn((rowId, bucket, effect) => {
        rows[rowId][bucket].push(effect);
    });
    window.__ow_removeRowEffect = jest.fn((rowId, bucket, id) => {
        rows[rowId][bucket] = rows[rowId][bucket].filter((e) => e.id !== id);
    });
    window.__ow_aiTriggering = false;
    window.__ow_isAITurn = false;
}

const tokenOn = (rowId) => rows[rowId].enemyEffects.find((e) => e.id === BLIZZARD_TOKEN_ID);

beforeEach(() => {
    jest.clearAllMocks();
    setup();
});

describe('who has to lay the Blizzard', () => {
    test('Mei freezes the row she already marked', () => {
        expect(castsBlizzardWithFreeze('1mei')).toBe(false);
    });

    test('anyone else has to lay one first', () => {
        expect(castsBlizzardWithFreeze('1echo')).toBe(true);
        expect(castsBlizzardWithFreeze('2echo')).toBe(true);
    });
});

/*
 * Echo copying Cryo Freeze has no on-enter behind it and never will, so
 * Blizzard is a dependency of the freeze rather than a prerequisite she failed
 * to meet: she picks a row and the row ends up marked and frozen in one cast.
 */
describe('Cryo Freeze cast by Echo', () => {
    test('asks Echo for a row and freezes it without an existing Blizzard', async () => {
        selectRowTarget.mockResolvedValue({ rowId: '2m' });

        await expect(onUltimate({ playerHeroId: '1echo', rowId: '1f' })).resolves.toBe(true);

        expect(selectRowTarget).toHaveBeenCalled();
        expect(tokenOn('2m')).toMatchObject({ frozen: true, value: 2 });
    });

    test('marks the row Echo chose, not the one Mei marked', async () => {
        rows['2f'].enemyEffects.push({ id: BLIZZARD_TOKEN_ID, frozen: false, value: 1 });
        selectRowTarget.mockResolvedValue({ rowId: '2b' });

        await onUltimate({ playerHeroId: '1echo', rowId: '1f' });

        expect(tokenOn('2b')).toMatchObject({ frozen: true });
        expect(tokenOn('2f').frozen).toBe(false);
    });

    test('refuses a friendly row', async () => {
        selectRowTarget.mockResolvedValue({ rowId: '1f' });

        await expect(onUltimate({ playerHeroId: '1echo', rowId: '1f' })).resolves.toBe(false);
        expect(window.__ow_appendRowEffect).not.toHaveBeenCalled();
    });

    // Refusing must not spend the ultimate: the handler charges synergy only
    // when the ability reports success.
    test('cancelling costs nothing', async () => {
        selectRowTarget.mockResolvedValue(null);

        await expect(onUltimate({ playerHeroId: '1echo', rowId: '1f' })).resolves.toBe(false);
        expect(window.__ow_appendRowEffect).not.toHaveBeenCalled();
    });

    test('an AI Echo picks its own row', async () => {
        window.__ow_isAITurn = true;

        await expect(onUltimate({ playerHeroId: '1echo', rowId: '1f' })).resolves.toBe(true);
        expect(selectRowTarget).not.toHaveBeenCalled();
        // The row holding the most enemies is the one worth freezing.
        expect(tokenOn('2f')).toMatchObject({ frozen: true });
    });
});

describe('Cryo Freeze cast by Mei', () => {
    test('still upgrades her own Blizzard row without asking', async () => {
        rows['2m'].enemyEffects.push({ id: BLIZZARD_TOKEN_ID, frozen: false, value: 1 });

        await expect(onUltimate({ playerHeroId: '1mei', rowId: '1f' })).resolves.toBe(true);

        expect(selectRowTarget).not.toHaveBeenCalled();
        expect(tokenOn('2m')).toMatchObject({ frozen: true });
    });

    test('still refuses with no Blizzard down', async () => {
        await expect(onUltimate({ playerHeroId: '1mei', rowId: '1f' })).resolves.toBe(false);
        expect(window.__ow_appendRowEffect).not.toHaveBeenCalled();
    });

    test('will not freeze a row twice', async () => {
        rows['2m'].enemyEffects.push({ id: BLIZZARD_TOKEN_ID, frozen: true, value: 2 });

        await expect(onUltimate({ playerHeroId: '1mei', rowId: '1f' })).resolves.toBe(false);
    });
});
