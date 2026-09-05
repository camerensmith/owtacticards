import { onUltimate } from './junkrat';
import { dealDamage } from '../engine/damageBus';
import { selectRowTarget } from '../engine/targeting';
import effectsBus from '../engine/effectsBus';
import { RIPTIRE_IMPACT_MS } from '../../presentation/pixi/fxConfig';

jest.mock('../../assets/imageImports', () => ({
    playAudioByKey: jest.fn(),
}));

jest.mock('../engine/targeting', () => ({
    selectRowTarget: jest.fn(),
}));

jest.mock('../engine/damageBus', () => ({
    dealDamage: jest.fn(),
    subscribe: jest.fn(() => () => {}),
}));

jest.mock('../engine/targetingBus', () => ({
    showMessage: jest.fn(),
    clearMessage: jest.fn(),
}));

function setupBoard() {
    window.__ow_getRow = (id) => {
        if (id === '1f') return { cardIds: ['1junkrat'], synergy: 4 };
        if (id === '2f') return { cardIds: ['2ana', '2reaper'], synergy: 0 };
        return { cardIds: [], synergy: 0 };
    };
    window.__ow_getCard = (id) => (
        id === '1junkrat'
            ? { id: 'junkrat', health: 3 }
            : { id: id.slice(1), health: 3 }
    );
    window.__ow_isRowFull = () => false;
    window.__ow_moveCardToRow = jest.fn();
    window.__ow_aiTriggering = false;
    window.__ow_isAITurn = false;
}

test('RIP-Tire waits for impact before dealing damage, and skips beams', async () => {
    jest.useFakeTimers();
    setupBoard();
    dealDamage.mockClear();
    selectRowTarget.mockResolvedValue({ rowId: '2f' });
    const published = [];
    const publishSpy = jest.spyOn(effectsBus, 'publish').mockImplementation((event) => {
        published.push(event);
    });

    const pending = onUltimate({ playerHeroId: '1junkrat', rowId: '1f' });
    await selectRowTarget.mock.results[0].value;
    await Promise.resolve();

    expect(published.some((event) => event.type === 'fx:riptire')).toBe(true);
    expect(dealDamage).not.toHaveBeenCalled();

    jest.advanceTimersByTime(RIPTIRE_IMPACT_MS - 1);
    await Promise.resolve();
    expect(dealDamage).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);
    await Promise.resolve();
    await pending;
    publishSpy.mockRestore();

    expect(dealDamage).toHaveBeenCalledWith(
        '2ana', '2f', 4, false, '1junkrat', false, { skipProjectileFx: true },
    );
    expect(dealDamage).toHaveBeenCalledWith(
        '2reaper', '2f', 4, false, '1junkrat', false, { skipProjectileFx: true },
    );
    expect(published.some((event) => event.type === 'fx:beam')).toBe(false);
    jest.useRealTimers();
});
