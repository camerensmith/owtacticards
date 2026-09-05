import { onEnter } from './rajah';

jest.mock('../../assets/imageImports', () => ({
    playAudioByKey: jest.fn(),
}));

test('Rajah onEnter places mirage on a random own row, never the hand', async () => {
    const actions = [];
    window.__ow_getRow = (id) => ({
        cardIds: id === '1f' ? ['1rajah'] : [],
    });
    window.__ow_dispatchAction = (action) => { actions.push(action); };
    window.__ow_moveCardToRow = jest.fn();

    await onEnter({ playerHeroId: '1rajah' });

    expect(actions.some((action) => action.type === 'add-card-to-hand')).toBe(false);
    expect(window.__ow_moveCardToRow).not.toHaveBeenCalled();

    const create = actions.find((action) => action.type === 'create-card');
    expect(create).toBeTruthy();
    expect(create.payload.heroId).toBe('mirage');
    expect(create.payload.playerNum).toBe(1);
    expect(['1f', '1m', '1b']).toContain(create.payload.rowId);
    expect(typeof create.payload.insertIndex).toBe('number');
    expect(create.payload.insertIndex).toBeGreaterThanOrEqual(0);
});
