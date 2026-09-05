import { selectBestAction } from './tacticalPlanner';

function emptyBoard() {
    return { front: [], middle: [], back: [] };
}

function enemyBoardWithBodies() {
    return {
        front: [{ id: 'junkrat', name: 'Junkrat', health: 3, power: { f: 3, m: 2, b: 1 } }],
        middle: [{ id: 'warden', name: 'Warden', health: 3, power: { f: 2, m: 3, b: 2 } }],
        back: [{ id: 'sigma', name: 'Sigma', health: 3, power: { f: 1, m: 2, b: 3 } }],
    };
}

function handOf(names) {
    return names.map((id) => ({
        id,
        name: id,
        cardId: `2${id}`,
        health: 3,
        role: 'Offense',
        power: { f: 2, m: 2, b: 2 },
        synergy: { f: 1, m: 1, b: 1 },
    }));
}

test('when behind with an empty board, still deploys instead of passing', () => {
    const action = selectBestAction(
        handOf(['reaper', 'soldier', 'pharah', 'tracer', 'genji', 'ashe']),
        emptyBoard(),
        enemyBoardWithBodies(),
        {},
        'hard',
        { next: () => 0.1 },
    );

    expect(action.type).toBe('play_card');
    expect(action.card).toBeTruthy();
    expect(['front', 'middle', 'back']).toContain(action.row);
});

test('empty hand with no board waits', () => {
    const action = selectBestAction(
        [],
        emptyBoard(),
        enemyBoardWithBodies(),
        {},
        'hard',
        { next: () => 0.1 },
    );

    expect(action.type).toBe('wait');
});
