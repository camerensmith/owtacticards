import { onUltimate } from './sombra';

jest.mock('../../assets/imageImports', () => ({ playAudioByKey: jest.fn() }));
jest.mock('../engine/targetingBus', () => ({
    showMessage: jest.fn(),
    clearMessage: jest.fn(),
}));
jest.mock('../engine/effectsBus', () => ({
    __esModule: true,
    default: { publish: jest.fn() },
    Effects: { showDamage: jest.fn(), orbitStop: jest.fn((t) => ({ type: 'fx:orbitStop', t })) },
}));

// CRA resets mock implementations between tests, so these are asserted on the
// call rather than on what the (now implementation-less) factory returned.
const { Effects } = require('../engine/effectsBus');

beforeEach(() => {
    jest.clearAllMocks();
    window.__ow_getRow = () => ({ cardIds: [], allyEffects: [], enemyEffects: [] });
    window.__ow_getCard = () => null;
    window.__ow_removeRowEffect = jest.fn();
    window.__ow_dispatchShieldUpdate = jest.fn();
    window.__ow_setCardHealth = jest.fn();
    window.__ow_seeker = null;
    window.__ow_getSeeker = () => window.__ow_seeker;
    window.__ow_setSeeker = jest.fn((value) => { window.__ow_seeker = value; });
});

/*
 * The Warden's drone is neither a card nor a row token — it lives on its own on
 * the bridge — so the EMP's sweeps over rows and cards walked straight past it
 * and left it circling a board it had just stripped bare.
 */
describe('E.M.P. and the Warden seeker', () => {
    test('shuts the drone down', async () => {
        window.__ow_seeker = { ownerPlayerNum: 1, damage: 3, sourceCardId: '1warden' };

        await onUltimate({ playerHeroId: '2sombra', rowId: '2f', cost: 3 });

        expect(window.__ow_setSeeker).toHaveBeenCalledWith(null);
        expect(window.__ow_getSeeker()).toBeNull();
    });

    test('clears the drone whoever launched it', async () => {
        window.__ow_seeker = { ownerPlayerNum: 2, damage: 3, sourceCardId: '2warden' };

        await onUltimate({ playerHeroId: '1sombra', rowId: '1f', cost: 3 });

        expect(window.__ow_setSeeker).toHaveBeenCalledWith(null);
    });

    test('stops the drone being drawn as well as tracked', async () => {
        window.__ow_seeker = { ownerPlayerNum: 1, damage: 3 };

        await onUltimate({ playerHeroId: '2sombra', rowId: '2f', cost: 3 });

        expect(Effects.orbitStop).toHaveBeenCalledWith('seeker');
    });

    test('does nothing about a drone that is not out', async () => {
        await onUltimate({ playerHeroId: '2sombra', rowId: '2f', cost: 3 });

        expect(window.__ow_setSeeker).not.toHaveBeenCalled();
    });
});
