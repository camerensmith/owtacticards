import { onEnter } from './roadhog';
import { dealDamage } from '../engine/damageBus';
import { selectCardTarget } from '../engine/targeting';

jest.mock('../../assets/imageImports', () => ({
    playAudioByKey: jest.fn(),
}));

jest.mock('../engine/targeting', () => ({
    selectCardTarget: jest.fn(),
}));

jest.mock('../engine/damageBus', () => ({
    dealDamage: jest.fn(),
}));

jest.mock('../engine/targetingBus', () => ({
    showMessage: jest.fn(),
    clearMessage: jest.fn(),
}));

function setupBoard() {
    window.__ow_getRow = (id) => ({
        cardIds: id === '2m' ? ['2ana'] : [],
    });
    window.__ow_getCard = (id) => (
        id === '2ana'
            ? { id: 'ana', health: 3, shield: 2 }
            : { id: 'roadhog', health: 5 }
    );
    window.__ow_isRowFull = () => false;
    window.__ow_moveCardToRow = jest.fn();
    window.__ow_aiTriggering = false;
    window.__ow_isAITurn = false;
}

test('Chain Hook deals 2 damage that ignores shields and armor', async () => {
    setupBoard();
    selectCardTarget.mockResolvedValue({ cardId: '2ana', rowId: '2m' });

    await onEnter({ playerHeroId: '1roadhog', rowId: '1f' });

    // skipProjectileFx keeps the damage bus from firing a beam alongside the
    // hook — the hook itself is the projectile.
    expect(dealDamage).toHaveBeenCalledWith(
        '2ana', '2f', 2, true, '1roadhog', false, { skipProjectileFx: true },
    );
});
