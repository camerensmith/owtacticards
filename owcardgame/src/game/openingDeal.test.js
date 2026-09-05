import {
    OPENING_ROLES,
    openingDealBeats,
    openingHandSize,
    shouldDrawOnTurnStart,
    nextRoundFirstPlayer,
    pickHeroFromRole,
    roundAnnouncerKey,
    matchResultAnnouncerKey,
} from './openingDeal';

test('both players are dealt the same four roles; nobody gets a bonus fifth', () => {
    const beats = openingDealBeats({ round: 1, includeInitiating: true, firstPlayer: 1 });
    expect(beats[0]).toEqual(expect.objectContaining({
        type: 'audio',
        key: 'announcer-initiatingmatch',
        awaitEnd: true,
    }));
    expect(beats.find((b) => b.key === 'announcer-round1')).toBeTruthy();
    expect(beats.filter((b) => b.type === 'draw').map((b) => [b.playerNum, b.role])).toEqual([
        [1, 'offense'],
        [1, 'tank'],
        [1, 'support'],
        [1, 'defense'],
        [2, 'offense'],
        [2, 'tank'],
        [2, 'support'],
        [2, 'defense'],
    ]);
    expect(beats.filter((b) => b.key === 'drawcard')).toHaveLength(8);
    expect(beats.find((b) => b.type === 'shuffle').playerNum).toBe(1);
});

test('when player 2 goes first, they are still dealt four and player 1 is dealt four', () => {
    const draws = openingDealBeats({ round: 1, includeInitiating: false, firstPlayer: 2 })
        .filter((b) => b.type === 'draw')
        .map((b) => [b.playerNum, b.role]);
    expect(draws.slice(0, 4).every(([p]) => p === 2)).toBe(true);
    expect(draws.slice(4).every(([p]) => p === 1)).toBe(true);
    expect(draws).toHaveLength(8);
    expect(draws.some(([, role]) => role === 'bonus')).toBe(false);
});

test('openingHandSize is 4 for both seats', () => {
    expect(openingHandSize(1, 1)).toBe(4);
    expect(openingHandSize(2, 1)).toBe(4);
    expect(openingHandSize(2, 2)).toBe(4);
    expect(openingHandSize(1, 2)).toBe(4);
});

test('first player skips the opening draw step; second player draws on theirs', () => {
    expect(shouldDrawOnTurnStart(1)).toBe(false);
    expect(shouldDrawOnTurnStart(2)).toBe(true);
    expect(shouldDrawOnTurnStart(3)).toBe(true);
});

test('winner of the round opens the next; draws randomize', () => {
    expect(nextRoundFirstPlayer(1)).toBe(1);
    expect(nextRoundFirstPlayer(2)).toBe(2);
    expect(nextRoundFirstPlayer(3, () => 0.1)).toBe(1);
    expect(nextRoundFirstPlayer(3, () => 0.9)).toBe(2);
});

test('later rounds skip initiating and use the matching round announcer', () => {
    expect(roundAnnouncerKey(2)).toBe('announcer-round2');
    expect(roundAnnouncerKey(3)).toBe('announcer-round3');
    const beats = openingDealBeats({ round: 2, includeInitiating: false, firstPlayer: 1 });
    expect(beats.some((b) => b.key === 'announcer-initiatingmatch')).toBe(false);
    expect(beats[0].key).toBe('announcer-round2');
    expect(openingDealBeats({ round: 3, includeInitiating: false })[0].key).toBe('announcer-round3');
});

test('match result announcer is victory for the human and defeat otherwise', () => {
    expect(matchResultAnnouncerKey(1)).toBe('announcer-victory');
    expect(matchResultAnnouncerKey(2)).toBe('announcer-defeat');
    expect(matchResultAnnouncerKey(3)).toBeNull();
    expect(matchResultAnnouncerKey(2, 2)).toBe('announcer-victory');
});

test('pickHeroFromRole skips already drawn ids in that role', () => {
    const picked = pickHeroFromRole(
        'tank',
        ['reinhardt'],
        { tank: ['reinhardt', 'roadhog'] },
        ['reinhardt', 'roadhog', 'ana'],
    );
    expect(picked).toBe('roadhog');
    expect(OPENING_ROLES).toHaveLength(4);
});

test('bonus draws any remaining hero', () => {
    expect(pickHeroFromRole('bonus', ['ana'], { offense: ['reaper'] }, ['ana', 'reaper'])).toBe('reaper');
});
