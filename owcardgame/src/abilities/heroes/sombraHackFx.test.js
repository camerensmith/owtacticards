import { onEnter, onUltimate } from './sombra';

jest.mock('../../assets/imageImports', () => ({ playAudioByKey: jest.fn() }));
jest.mock('../engine/targeting', () => ({ selectCardTarget: jest.fn() }));
jest.mock('../engine/targetingBus', () => ({
    showMessage: jest.fn(),
    clearMessage: jest.fn(),
}));
jest.mock('../engine/effectsBus', () => ({
    __esModule: true,
    default: { publish: jest.fn() },
    Effects: {
        hack: jest.fn(),
        showHeal: jest.fn(),
        showDamage: jest.fn(),
        orbitStop: jest.fn(),
    },
}));

const { Effects } = require('../engine/effectsBus');
const { selectCardTarget } = require('../engine/targeting');

beforeEach(() => {
    jest.clearAllMocks();
    const rows = {
        '1f': { cardIds: ['1sombra'], allyEffects: [], enemyEffects: [] },
        '1m': { cardIds: [], allyEffects: [], enemyEffects: [] },
        '1b': { cardIds: [], allyEffects: [], enemyEffects: [] },
        '2f': { cardIds: ['2ana'], allyEffects: [], enemyEffects: [] },
        '2m': { cardIds: [], allyEffects: [], enemyEffects: [] },
        '2b': { cardIds: [], allyEffects: [], enemyEffects: [] },
    };
    window.__ow_getRow = (id) => rows[id];
    window.__ow_getCard = (id) => (id === '2ana' ? { id: 'ana', health: 3, shield: 2 } : null);
    window.__ow_dispatchShieldUpdate = jest.fn();
    window.__ow_removeRowEffect = jest.fn();
    window.__ow_setCardHealth = jest.fn();
    window.__ow_getSeeker = () => null;
    window.__ow_setSeeker = jest.fn();
    window.__ow_isAITurn = false;
    window.__ow_aiTriggering = false;
});

afterEach(() => {
    delete window.__ow_isAITurn;
});

/*
 * E.M.P. strips both sides of the board, so its sweep crosses the whole board.
 * Hack takes one hero, and must not be mistaken for the ultimate — the sweep
 * used to be published only from Hack, which left E.M.P. with no visual at all.
 */
describe('the intrusion sweep', () => {
    test('E.M.P. sweeps the whole board', async () => {
        await onUltimate({ playerHeroId: '1sombra', rowId: '1f', cost: 3 });

        expect(Effects.hack).toHaveBeenCalledWith();
    });

    test('Hack sweeps only the card it hit', async () => {
        selectCardTarget.mockResolvedValue({ cardId: '2ana', rowId: '2f' });

        await onEnter({ playerHeroId: '1sombra', rowId: '1f' });

        expect(Effects.hack).toHaveBeenCalledWith('2ana');
    });

    test('an AI Hack scopes to its own pick too', async () => {
        window.__ow_isAITurn = true;

        await onEnter({ playerHeroId: '1sombra', rowId: '1f' });

        expect(Effects.hack).toHaveBeenCalledWith('2ana');
    });

    test('a cancelled Hack sweeps nothing', async () => {
        selectCardTarget.mockResolvedValue(null);

        await onEnter({ playerHeroId: '1sombra', rowId: '1f' });

        expect(Effects.hack).not.toHaveBeenCalled();
    });

    test('Hack refused for targeting an ally sweeps nothing', async () => {
        selectCardTarget.mockResolvedValue({ cardId: '1sombra', rowId: '1f' });

        await onEnter({ playerHeroId: '1sombra', rowId: '1f' });

        expect(Effects.hack).not.toHaveBeenCalled();
    });
});
