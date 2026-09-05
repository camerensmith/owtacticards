import { onEnter, onUltimate, onDeath } from './mei';
import { selectRowTarget } from '../engine/targeting';
import effectsBus, { Effects } from '../engine/effectsBus';
import { rowUltimateCost } from '../../game/blizzard';

jest.mock('../../assets/imageImports', () => ({ playAudioByKey: jest.fn() }));
jest.mock('../engine/targeting', () => ({
    selectCardTarget: jest.fn(),
    selectRowTarget: jest.fn(),
}));
jest.mock('../engine/targetingBus', () => ({
    showMessage: jest.fn(),
    clearMessage: jest.fn(),
}));
jest.mock('../engine/effectsBus', () => ({
    __esModule: true,
    default: { publish: jest.fn() },
    Effects: {
        freezeSpiral: (rowId) => ({ type: 'fx:freezeSpiral', payload: { rowId } }),
    },
}));

/** All six rows, since onDeath sweeps every one of them. */
function setup(rows = {}) {
    const board = {
        '1f': { cardIds: ['1mei'], enemyEffects: [] },
        '1m': { cardIds: [], enemyEffects: [] },
        '1b': { cardIds: [], enemyEffects: [] },
        '2f': { cardIds: ['2ana'], enemyEffects: [] },
        '2m': { cardIds: ['2reaper', '2rein'], enemyEffects: [] },
        '2b': { cardIds: [], enemyEffects: [] },
        ...rows,
    };
    window.__ow_getRow = (id) => board[id];
    window.__ow_getCard = (id) => ({ id: id.slice(1), health: 3 });
    window.__ow_appendRowEffect = jest.fn((rowId, key, effect) => {
        if (!board[rowId]) return;
        board[rowId][key] = [...(board[rowId][key] || []), effect];
    });
    window.__ow_removeRowEffect = jest.fn((rowId, key, effectId) => {
        if (!board[rowId]) return;
        board[rowId][key] = (board[rowId][key] || []).filter((e) => e.id !== effectId);
    });
    window.__ow_aiTriggering = false;
    window.__ow_isAITurn = false;
    return board;
}

const tokenOn = (board, rowId) =>
    (board[rowId].enemyEffects || []).find((e) => e.id === 'mei-token');

beforeEach(() => {
    jest.clearAllMocks();
    selectRowTarget.mockResolvedValue({ rowId: '2m' });
});

describe('Blizzard', () => {
    test('marks the chosen enemy row for +1 synergy', async () => {
        const board = setup();

        await onEnter({ playerHeroId: '1mei', rowId: '1f' });

        const token = tokenOn(board, '2m');
        expect(token).toBeDefined();
        expect(token.frozen).toBe(false);
        expect(rowUltimateCost(3, board['2m'].enemyEffects)).toBe(4);
    });

    test('refuses a friendly row', async () => {
        const board = setup();
        selectRowTarget.mockResolvedValue({ rowId: '1f' });

        await onEnter({ playerHeroId: '1mei', rowId: '1f' });

        expect(tokenOn(board, '1f')).toBeUndefined();
    });

    test('the AI marks the busiest enemy row without asking anyone', async () => {
        const board = setup();
        window.__ow_isAITurn = true;

        await onEnter({ playerHeroId: '1mei', rowId: '1f' });

        expect(selectRowTarget).not.toHaveBeenCalled();
        expect(tokenOn(board, '2m')).toBeDefined();
    });
});

describe('Cryo Freeze', () => {
    test('freezes the row Blizzard already marked, doubling its costs', async () => {
        const board = setup();
        await onEnter({ playerHeroId: '1mei', rowId: '1f' });

        await expect(onUltimate({ playerHeroId: '1mei', rowId: '1f' })).resolves.toBe(true);

        const token = tokenOn(board, '2m');
        expect(token.frozen).toBe(true);
        expect(rowUltimateCost(3, board['2m'].enemyEffects)).toBe(6);
    });

    // It upgrades the mark rather than stacking a second one, so there is still
    // only one thing for onDeath to sweep up.
    test('leaves exactly one token on the row', async () => {
        const board = setup();
        await onEnter({ playerHeroId: '1mei', rowId: '1f' });
        await onUltimate({ playerHeroId: '1mei', rowId: '1f' });

        expect(board['2m'].enemyEffects.filter((e) => e.id === 'mei-token')).toHaveLength(1);
    });

    test('the spiral closes over the row, not a card', async () => {
        setup();
        await onEnter({ playerHeroId: '1mei', rowId: '1f' });
        await onUltimate({ playerHeroId: '1mei', rowId: '1f' });

        expect(effectsBus.publish).toHaveBeenCalledWith(Effects.freezeSpiral('2m'));
    });

    test('does nothing without a Blizzard row to freeze', async () => {
        setup();

        await expect(onUltimate({ playerHeroId: '1mei', rowId: '1f' })).resolves.toBe(false);
        expect(window.__ow_appendRowEffect).not.toHaveBeenCalled();
    });

    test('will not freeze the same row twice', async () => {
        setup();
        await onEnter({ playerHeroId: '1mei', rowId: '1f' });
        await onUltimate({ playerHeroId: '1mei', rowId: '1f' });

        await expect(onUltimate({ playerHeroId: '1mei', rowId: '1f' })).resolves.toBe(false);
    });

    // No target to pick means no chance of the AI handing the choice to the player.
    test('never asks for a target, on either side', async () => {
        setup();
        await onEnter({ playerHeroId: '1mei', rowId: '1f' });
        window.__ow_isAITurn = true;
        selectRowTarget.mockClear();

        await onUltimate({ playerHeroId: '1mei', rowId: '1f' });

        expect(selectRowTarget).not.toHaveBeenCalled();
    });
});

test('Mei dying thaws the row she froze', async () => {
    const board = setup();
    await onEnter({ playerHeroId: '1mei', rowId: '1f' });
    await onUltimate({ playerHeroId: '1mei', rowId: '1f' });

    onDeath({ playerHeroId: '1mei', rowId: '1f' });

    expect(tokenOn(board, '2m')).toBeUndefined();
    expect(rowUltimateCost(3, board['2m'].enemyEffects)).toBe(3);
});
