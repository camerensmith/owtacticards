import { onEnter, forcePlayTurret } from './torbjorn';

jest.mock('../../assets/imageImports', () => ({
    playAudioByKey: jest.fn(),
}));

jest.mock('../engine/targetingBus', () => ({
    showMessage: jest.fn(),
    clearMessage: jest.fn(),
}));

function setupBoard(rows, hand = []) {
    const state = { ...rows, player2hand: hand };
    window.__ow_getRow = (id) => ({ cardIds: state[id] || [] });
    window.__ow_addSpecialCardToHand = jest.fn(() => {
        state.player2hand = [...state.player2hand, '2turret'];
    });
    window.__ow_aiIntegration = { playCard: jest.fn(() => Promise.resolve(true)) };
    return state;
}

const EMPTY = { '2f': [], '2m': [], '2b': [] };
const FULL = ['a', 'b', 'c', 'd'];

beforeEach(() => {
    window.__ow_isAITurn = true;
    window.__ow_aiTriggering = false;
});

afterEach(() => {
    window.__ow_isAITurn = false;
    jest.useRealTimers();
});

describe('the AI always gets its turret onto the board', () => {
    test('plays it to the back row by default', async () => {
        setupBoard(EMPTY);

        await onEnter({ playerHeroId: '2torbjorn', rowId: '2m' });

        expect(window.__ow_aiIntegration.playCard).toHaveBeenCalledWith('2turret', 'back');
    });

    test('falls back through middle to front as rows fill', async () => {
        setupBoard({ '2f': [], '2m': [], '2b': FULL }, ['2turret']);
        expect(await forcePlayTurret(2)).toBe(true);
        expect(window.__ow_aiIntegration.playCard).toHaveBeenCalledWith('2turret', 'middle');

        setupBoard({ '2f': [], '2m': FULL, '2b': FULL }, ['2turret']);
        expect(await forcePlayTurret(2)).toBe(true);
        expect(window.__ow_aiIntegration.playCard).toHaveBeenCalledWith('2turret', 'front');
    });

    // Rows can carry holes; counting array length would read a gap as a body
    // and strand the turret in hand with space still on the board.
    test('a row with a hole in it still counts as having room', async () => {
        setupBoard({ '2f': FULL, '2m': FULL, '2b': ['a', null, 'c', 'd'] }, ['2turret']);

        expect(await forcePlayTurret(2)).toBe(true);
        expect(window.__ow_aiIntegration.playCard).toHaveBeenCalledWith('2turret', 'back');
    });

    test('gives up only when every row is genuinely full', async () => {
        setupBoard({ '2f': FULL, '2m': FULL, '2b': FULL }, ['2turret']);

        expect(await forcePlayTurret(2)).toBe(false);
        expect(window.__ow_aiIntegration.playCard).not.toHaveBeenCalled();
    });

    // The old version waited a flat 300ms and gave up, so a slow state flush
    // left the turret in hand for the rest of the game.
    test('waits for a slow flush instead of giving up on a fixed delay', async () => {
        const state = setupBoard(EMPTY, []);
        setTimeout(() => { state.player2hand = ['2turret']; }, 400);

        expect(await forcePlayTurret(2)).toBe(true);
        expect(window.__ow_aiIntegration.playCard).toHaveBeenCalledWith('2turret', 'back');
    });

    test('reports failure when the card never arrives', async () => {
        setupBoard(EMPTY, []);

        expect(await forcePlayTurret(2)).toBe(false);
        expect(window.__ow_aiIntegration.playCard).not.toHaveBeenCalled();
    });

    test('a refused play is reported, not swallowed as success', async () => {
        setupBoard(EMPTY, ['2turret']);
        window.__ow_aiIntegration.playCard = jest.fn(() => Promise.resolve(false));

        expect(await forcePlayTurret(2)).toBe(false);
    });

    test('a throwing adapter does not break the turn', async () => {
        setupBoard(EMPTY, ['2turret']);
        window.__ow_aiIntegration.playCard = jest.fn(() => Promise.reject(new Error('locked')));

        await expect(forcePlayTurret(2)).resolves.toBe(false);
    });

    test('the human player is left to place their own turret', async () => {
        window.__ow_isAITurn = false;
        setupBoard(EMPTY);

        await onEnter({ playerHeroId: '1torbjorn', rowId: '1m' });

        expect(window.__ow_aiIntegration.playCard).not.toHaveBeenCalled();
    });
});
