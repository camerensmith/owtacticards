import { openingDealBeats } from './openingDeal';
import { runOpeningDealBeats } from './runOpeningDeal';

test('shuffle UI must paint before the first card of that seat is dealt', async () => {
    const events = [];
    const beats = openingDealBeats({
        round: 1,
        includeInitiating: false,
        firstPlayer: 1,
        timing: { initiatingFallbackMs: 0, shuffleMs: 1, drawGapMs: 1 },
    });

    await runOpeningDealBeats(beats, {
        playAudio: async () => { events.push('audio'); },
        wait: async () => { events.push('wait'); },
        ensurePainted: async () => { events.push('paint'); },
        onShuffle: (playerNum) => { events.push(`shuffle:${playerNum}`); },
        onDraw: (playerNum, role) => { events.push(`draw:${playerNum}:${role}`); },
    });

    const firstShuffle = events.indexOf('shuffle:1');
    const firstPaint = events.indexOf('paint');
    const firstDraw = events.indexOf('draw:1:offense');

    expect(firstShuffle).toBeGreaterThanOrEqual(0);
    expect(firstPaint).toBeGreaterThan(firstShuffle);
    expect(firstDraw).toBeGreaterThan(firstPaint);
});

test('second seat also paints shuffle before its first draw', async () => {
    const events = [];
    const beats = openingDealBeats({
        round: 2,
        includeInitiating: false,
        firstPlayer: 2,
        timing: { initiatingFallbackMs: 0, shuffleMs: 1, drawGapMs: 0 },
    });

    await runOpeningDealBeats(beats, {
        playAudio: async () => {},
        wait: async () => {},
        ensurePainted: async () => { events.push('paint'); },
        onShuffle: (playerNum) => { events.push(`shuffle:${playerNum}`); },
        onDraw: (playerNum, role) => { events.push(`draw:${playerNum}:${role}`); },
    });

    const shuffle2 = events.indexOf('shuffle:2');
    const paints = events
        .map((e, i) => (e === 'paint' ? i : -1))
        .filter((i) => i >= 0);
    const paintAfterShuffle2 = paints.find((i) => i > shuffle2);
    const draw2 = events.indexOf('draw:2:offense');

    expect(paintAfterShuffle2).toBeGreaterThan(shuffle2);
    expect(draw2).toBeGreaterThan(paintAfterShuffle2);
});
