import { rankWidowmakerTargets, shouldSelfDestruct } from './ultimateDecisions';
import BrowserGameAdapter from './adapters/BrowserGameAdapter';

test.each([null, { heroId: 'dva' }, { heroId: 'echo' }, { heroId: 'tracer' }])(
    'AI adapter refuses an uncopyable Echo ultimate: %j', async lastUltimate => {
        window.__ow_getLastUltimateUsed = () => lastUltimate;
        window.__ow_useUltimate = jest.fn();
        expect(await new BrowserGameAdapter().useUltimate('2echo')).toBe(false);
        expect(window.__ow_useUltimate).not.toHaveBeenCalled();
    },
);

test('AI adapter allows a copyable Echo ultimate', async () => {
    window.__ow_getLastUltimateUsed = () => ({ heroId: 'soldier' });
    window.__ow_useUltimate = jest.fn(() => true);
    expect(await new BrowserGameAdapter().useUltimate('2echo')).toBe(true);
});

function board(enemyHealth = 3, allyHealth = 6, enemyPower = 4, allyPower = 2) {
    const cards = {
        '2dvameka': { id: 'dvameka', health: 4, power: { f: 2 } },
        '2ana': { id: 'ana', health: allyHealth, power: { f: allyPower } },
        '1soldier': { id: 'soldier', health: enemyHealth, power: { f: enemyPower } },
    };
    const rows = { '2f': { cardIds: ['2dvameka', '2ana'] }, '1f': { cardIds: ['1soldier'] } };
    return { cards, rows, args: { cardId: '2dvameka', getRow: id => rows[id], getCard: id => cards[id] } };
}

test('Self Destruct accepts a blast that improves the margin and leaves allied power ahead', () => {
    expect(shouldSelfDestruct(board().args)).toBe(true);
});

test('Self Destruct rejects sacrificing more allied power than enemy power', () => {
    expect(shouldSelfDestruct(board(3, 3, 1, 5).args)).toBe(false);
});

test('Self Destruct rejects a blast that leaves the enemy ahead', () => {
    expect(shouldSelfDestruct(board(6, 3).args)).toBe(false);
});

test('Self Destruct accounts for enemy shields, armor and invulnerability', () => {
    for (const protection of [{ shield: 4 }, { armor: 4 }]) {
        const state = board();
        Object.assign(state.cards['1soldier'], protection);
        expect(shouldSelfDestruct(state.args)).toBe(false);
    }
    expect(shouldSelfDestruct({ ...board().args, isSlotInvulnerable: row => row === '1f' })).toBe(false);
});

test('Self Destruct consumes shared row shields in target order without changing the board', () => {
    const state = board(3, 3, 4, 5);
    state.rows['2f'].shield = [{ shieldValue: 6 }];
    const snapshot = JSON.stringify(state.rows);
    expect(shouldSelfDestruct(state.args)).toBe(true);
    expect(JSON.stringify(state.rows)).toBe(snapshot);
});

test('Self Destruct holds when reactive effects make the projected outcome uncertain', () => {
    const state = board();
    state.rows['1f'].allyEffects = [{ id: 'immortality-field' }];
    expect(shouldSelfDestruct(state.args)).toBe(false);
});

test('Widowmaker prioritizes unused ultimates, then current health', () => {
    const cards = { '1ana': { health: 2 }, '1soldier': { health: 5 }, '1roadhog': { health: 8 } };
    const used = jest.fn((player, hero) => hero === 'roadhog');
    expect(rankWidowmakerTargets(Object.keys(cards), id => cards[id], used))
        .toEqual(['1soldier', '1ana', '1roadhog']);
    expect(used).toHaveBeenCalledWith(1, 'roadhog');
});
