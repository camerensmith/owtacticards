import { createDirector } from './director';
import { playCardIntent } from './intents';

function deferred() {
    let resolve;
    const promise = new Promise((r) => { resolve = r; });
    return { promise, resolve };
}

test('locks during animate and commits after', async () => {
    const fly = deferred();
    const commits = [];
    const director = createDirector({
        animatePlay: () => fly.promise,
        commitPlay: (intent) => { commits.push(intent.cardId); },
        watchdogMs: 8000,
    });
    const intent = playCardIntent({
        cardId: '1ana', startRowId: 'player1hand', finishRowId: '1f', slotIndex: 0, playerNum: 1,
    });
    const done = director.enqueue(intent);
    expect(director.isLocked()).toBe(true);
    expect(commits).toEqual([]);
    fly.resolve();
    await done;
    expect(commits).toEqual(['1ana']);
    expect(director.isLocked()).toBe(false);
});

test('ignores a second PlayCard while locked', async () => {
    const fly = deferred();
    const commits = [];
    const director = createDirector({
        animatePlay: () => fly.promise,
        commitPlay: (intent) => { commits.push(intent.cardId); },
    });
    const a = playCardIntent({ cardId: '1ana', startRowId: 'player1hand', finishRowId: '1f', slotIndex: 0, playerNum: 1 });
    const b = playCardIntent({ cardId: '1mei', startRowId: 'player1hand', finishRowId: '1m', slotIndex: 0, playerNum: 1 });
    const first = director.enqueue(a);
    expect(director.enqueue(b)).toBe(false);
    fly.resolve();
    await first;
    expect(commits).toEqual(['1ana']);
});

test('watchdog commits and unlocks if animate hangs', async () => {
    jest.useFakeTimers();
    const commits = [];
    const director = createDirector({
        animatePlay: () => new Promise(() => {}),
        commitPlay: (intent) => { commits.push(intent.cardId); },
        watchdogMs: 8000,
    });
    const p = director.enqueue(playCardIntent({
        cardId: '1ana', startRowId: 'player1hand', finishRowId: '1f', slotIndex: 0, playerNum: 1,
    }));
    jest.advanceTimersByTime(8000);
    await p;
    expect(commits).toEqual(['1ana']);
    expect(director.isLocked()).toBe(false);
    jest.useRealTimers();
});
