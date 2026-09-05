import { onUltimate } from './mercy';
import { selectRowTarget } from '../engine/targeting';
import { selectFromGraveyard } from '../engine/graveyardBus';

jest.mock('../../assets/imageImports', () => ({
    playAudioByKey: jest.fn(),
    getAudioFile: jest.fn(() => null),
}));

jest.mock('../engine/targeting', () => ({
    selectCardTarget: jest.fn(),
    selectRowTarget: jest.fn(),
}));

jest.mock('../engine/graveyardBus', () => ({
    selectFromGraveyard: jest.fn(),
}));

jest.mock('../engine/targetingBus', () => ({
    showMessage: jest.fn(),
    clearMessage: jest.fn(),
}));

jest.mock('../engine/modalController', () => ({
    showOnEnterChoice: jest.fn(),
}));

// `Effects` is included so the publishes run for real rather than throwing
// into the `try/catch` around each one and hiding a broken call.
jest.mock('../engine/effectsBus', () => ({
    __esModule: true,
    default: { publish: jest.fn() },
    Effects: {
        showHeal: (cardId, amount) => ({ type: 'overlay:heal', payload: { cardId, amount } }),
        bestow: (cardId, color) => ({ type: 'fx:bestow', payload: { cardId, color } }),
        rezAura: (cardId, on) => ({ type: 'fx:rezAura', payload: { cardId, on } }),
        rezReturn: (cardId, mercyCardId) => ({
            type: 'fx:rezReturn',
            payload: { cardId, mercyCardId },
        }),
    },
}));

/** Mercy alive in 1m, one hero buried, room to place. */
function setupBoard({
    graveyard = [{ heroId: 'reaper', playerHeroId: '1reaper' }],
    rows = {},
    isAI = false,
} = {}) {
    const board = { '1f': [], '1m': ['1mercy'], '1b': [], ...rows };
    window.__ow_getRow = (id) => ({ cardIds: board[id] || [] });
    window.__ow_getCard = (id) => ({ id: id.slice(1), health: 4 });
    window.__ow_getGraveyard = jest.fn(() => graveyard);
    window.__ow_resurrectFromGraveyard = jest.fn(() => '1reaper');
    window.__ow_moveCardToRow = jest.fn();
    window.__ow_pickBestGraveyardTarget = jest.fn(() => graveyard[0] || null);
    window.__ow_aiTriggering = false;
    window.__ow_isAITurn = isAI;
    return board;
}

const ult = () => onUltimate({ playerHeroId: '1mercy', rowId: '1m', cost: 3 });

beforeEach(() => {
    jest.clearAllMocks();
    selectRowTarget.mockResolvedValue({ rowId: '1m' });
});

describe('Mercy resurrection from the graveyard', () => {
    test('revives the chosen hero into the row Mercy flew to', async () => {
        setupBoard();
        selectFromGraveyard.mockResolvedValue('reaper');

        await ult();

        expect(window.__ow_resurrectFromGraveyard).toHaveBeenCalledWith(1, 'reaper', '1m');
    });

    test('reads the graveyard, not corpses on the board', async () => {
        setupBoard();
        selectFromGraveyard.mockResolvedValue('reaper');

        await ult();

        expect(window.__ow_getGraveyard).toHaveBeenCalledWith(1);
    });

    test('does nothing when the graveyard is empty', async () => {
        setupBoard({ graveyard: [] });

        await ult();

        expect(selectFromGraveyard).not.toHaveBeenCalled();
        expect(window.__ow_resurrectFromGraveyard).not.toHaveBeenCalled();
    });

    test('cancelling the picker resurrects nobody', async () => {
        setupBoard();
        selectFromGraveyard.mockResolvedValue(null);

        await ult();

        expect(window.__ow_resurrectFromGraveyard).not.toHaveBeenCalled();
    });

    // Four is row capacity; resurrecting into a full row would overfill it.
    // The picker now opens before the row is chosen, so it is reached here —
    // the row is rejected after, and nobody comes back.
    test('refuses a full destination row', async () => {
        setupBoard({ rows: { '1m': ['1mercy', '1a', '1b2', '1c'] } });

        await ult();

        expect(window.__ow_resurrectFromGraveyard).not.toHaveBeenCalled();
    });

    // The graveyard is what decides whether the ultimate can do anything, so it
    // is asked first rather than after walking the player through a row pick.
    test('opens the graveyard before asking for a row', async () => {
        setupBoard();
        const order = [];
        selectFromGraveyard.mockImplementation(() => {
            order.push('graveyard');
            return Promise.resolve('reaper');
        });
        selectRowTarget.mockImplementation(() => {
            order.push('row');
            return Promise.resolve({ rowId: '1m' });
        });

        await ult();

        expect(order).toEqual(['graveyard', 'row']);
    });

    test('an empty graveyard fails before anything else is asked', async () => {
        setupBoard({ graveyard: [] });

        await ult();

        expect(selectFromGraveyard).not.toHaveBeenCalled();
        expect(selectRowTarget).not.toHaveBeenCalled();
        expect(window.__ow_resurrectFromGraveyard).not.toHaveBeenCalled();
    });
});

describe('AI resurrection', () => {
    test('AI uses the same resurrection path as the human', async () => {
        setupBoard({ isAI: true, graveyard: [{ heroId: 'reaper', playerHeroId: '1reaper' }] });

        await ult();

        // Never prompts, and goes through the shared bridge so on-enter stays suppressed.
        expect(selectFromGraveyard).not.toHaveBeenCalled();
        expect(window.__ow_resurrectFromGraveyard).toHaveBeenCalledWith(1, 'reaper', '1m');
    });

    test('AI skips when its graveyard is empty', async () => {
        setupBoard({ isAI: true, graveyard: [] });

        await ult();

        expect(window.__ow_resurrectFromGraveyard).not.toHaveBeenCalled();
    });

    // Mercy's own row is preferred, but a full row must not waste the ultimate.
    test('AI falls back to another friendly row when Mercy\'s is full', async () => {
        setupBoard({ isAI: true, rows: { '1m': ['1mercy', '1a', '1b2', '1c'] } });

        await ult();

        expect(window.__ow_resurrectFromGraveyard).toHaveBeenCalledWith(1, 'reaper', '1f');
        expect(window.__ow_moveCardToRow).toHaveBeenCalledWith('1mercy', '1f');
    });
});
