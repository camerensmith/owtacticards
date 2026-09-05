import {
    spreadDamageEvenly,
    countNanoBoostHeroes,
    nanoBoostSynergyDelta,
    parseUltimateCost,
    getTreeOfLifeTargetIds,
    canDuplicateUltimate,
    normalizeHeroId,
    findCardRowId,
    selfDestructTargets,
    isStructureCard,
    rowDistance,
    crushZoneMoves,
    clampBlocksMovement,
    killswitchRowCleanup,
    electrifiedTargets,
    rowsAreAdjacent,
} from './abilityRules';
import data from '../data';

describe('spreadDamageEvenly', () => {
    test('splits 9 damage across 3 targets as 3-3-3', () => {
        expect(spreadDamageEvenly(9, 3)).toEqual([3, 3, 3]);
    });

    test('splits 9 damage across 2 targets as 5-4', () => {
        expect(spreadDamageEvenly(9, 2)).toEqual([5, 4]);
    });

    test('gives all 9 to a single target', () => {
        expect(spreadDamageEvenly(9, 1)).toEqual([9]);
    });

    test('returns empty when there are no targets', () => {
        expect(spreadDamageEvenly(9, 0)).toEqual([]);
    });
});

describe('countNanoBoostHeroes', () => {
    test('counts living non-special heroes including nemesis', () => {
        expect(countNanoBoostHeroes([
            { heroId: 'ana', health: 3, isSpecial: false },
            { heroId: 'bob', health: 3, isSpecial: true },
            { heroId: 'nemesis', health: 2, isSpecial: true },
            { heroId: 'reaper', health: 0, isSpecial: false },
        ])).toBe(2);
    });
});

describe('nanoBoostSynergyDelta', () => {
    test('adds the full hero count on first apply', () => {
        expect(nanoBoostSynergyDelta(0, 3)).toBe(3);
    });

    test('only applies the difference when the row changes', () => {
        expect(nanoBoostSynergyDelta(3, 2)).toBe(-1);
        expect(nanoBoostSynergyDelta(2, 4)).toBe(2);
    });
});

describe('parseUltimateCost', () => {
    test('reads the number in parentheses', () => {
        expect(parseUltimateCost('Tree of Life (2): ...')).toBe(2);
        expect(parseUltimateCost('Rampage (4): ...')).toBe(4);
    });

    test('uses current synergy for Wrecking Ball', () => {
        expect(parseUltimateCost('Minefield (X): ...', {
            heroId: 'wreckingball',
            currentSynergy: 7,
        })).toBe(7);
    });

    test('BOB ultimate costs 1', () => {
        expect(parseUltimateCost('Smash (1): ...', { heroId: 'bob' })).toBe(1);
    });
});

describe('printed ultimate costs in data.js', () => {
    test('match hero.json costs for drifted heroes', () => {
        expect(parseUltimateCost(data.heroes.mei.ultimate)).toBe(2);
        expect(parseUltimateCost(data.heroes.lifeweaver.ultimate)).toBe(2);
        expect(parseUltimateCost(data.heroes.symmetra.ultimate)).toBe(2);
        expect(parseUltimateCost(data.heroes.nemesis.ultimate)).toBe(4);
        expect(parseUltimateCost(data.heroes.junkerqueen.ultimate)).toBe(3);
        expect(parseUltimateCost(data.heroes.echo.ultimate)).toBe(4);
        expect(parseUltimateCost(data.heroes.venture.ultimate)).toBe(4);
    });

    test('Ana is 2 HP and Nano Boost costs 2', () => {
        expect(data.heroes.ana.health).toBe(2);
        expect(parseUltimateCost(data.heroes.ana.ultimate)).toBe(2);
        expect(data.heroes.ana.ultimate).toMatch(/any friendly or enemy row/i);
    });

    test('Dead Eye text is the 9-damage even split', () => {
        expect(data.heroes.mccree.ultimate).toMatch(/9 damage/i);
    });

    test('Death Blossom hits adjacent to the enemy middle center', () => {
        expect(parseUltimateCost(data.heroes.reaper.ultimate)).toBe(4);
        expect(data.heroes.reaper.ultimate).toMatch(/Middle Center/i);
        expect(data.heroes.reaper.ultimate).toMatch(/ignoring shields/i);
    });

    test('Self Destruct costs 3 and hits all opponents and allies', () => {
        expect(parseUltimateCost(data.heroes.dvameka.ultimate)).toBe(3);
        expect(data.heroes.dvameka.ultimate).toMatch(/all opponents AND Allies/i);
        expect(data.heroes.dvameka.ultimate).not.toMatch(/opposing row/i);
    });

    test('Sylvain, Axiom, and Lockjaw match printed card stats and ult costs', () => {
        expect(data.heroes.tracer.health).toBe(2);
        expect(data.heroes.sylvain.health).toBe(3);
        expect(data.heroes.sylvain.power).toEqual({ f: 1, m: 1, b: 2 });
        expect(data.heroes.sylvain.synergy).toEqual({ f: 2, m: 2, b: 2 });
        expect(parseUltimateCost(data.heroes.sylvain.ultimate)).toBe(2);

        expect(data.heroes.axiom.health).toBe(4);
        expect(data.heroes.axiom.power).toEqual({ f: 2, m: 2, b: 2 });
        expect(data.heroes.axiom.synergy).toEqual({ f: 3, m: 2, b: 1 });
        expect(parseUltimateCost(data.heroes.axiom.ultimate)).toBe(3);
        expect(data.heroes.stoneguard.health).toBe(3);
        expect(data.heroes.stoneguard.special).toBe(true);
        expect(data.heroes.stoneguard.structure).toBe(true);

        expect(data.heroes.lockjaw.health).toBe(4);
        expect(data.heroes.lockjaw.power).toEqual({ f: 1, m: 2, b: 2 });
        expect(data.heroes.lockjaw.synergy).toEqual({ f: 2, m: 3, b: 3 });
        expect(parseUltimateCost(data.heroes.lockjaw.ultimate)).toBe(3);

        expect(parseUltimateCost(data.heroes.brigitte.ultimate)).toBe(3);
        expect(data.heroes.brigitte.ultimate).toMatch(/cannot use Ultimate/i);
    });

    test('Cage Fight costs 4 and hits every hero in the opposing row', () => {
        expect(parseUltimateCost(data.heroes.mauga.ultimate)).toBe(4);
        expect(data.heroes.mauga.ultimate).toMatch(/as long as Mauga is alive/i);
        expect(data.heroes.mauga.ultimate).toMatch(/all heroes/i);
    });
});

describe('getTreeOfLifeTargetIds', () => {
    test('includes self, left/right, and same-column adjacent rows', () => {
        const rows = {
            '1m': ['1ana', '1lifeweaver', '1mercy'],
            '1f': ['1reinhardt', '1orisa', '1winston'],
            '1b': ['1zenyatta'],
        };
        expect(getTreeOfLifeTargetIds({
            playerHeroId: '1lifeweaver',
            rowId: '1m',
            getRowCardIds: (id) => rows[id] || [],
        })).toEqual(['1lifeweaver', '1ana', '1mercy', '1orisa']);
    });

    test('front row only looks at middle, not back', () => {
        const rows = {
            '1f': ['1lifeweaver', '1mercy'],
            '1m': ['1orisa', '1reinhardt'],
            '1b': ['1zenyatta', '1lucio'],
        };
        expect(getTreeOfLifeTargetIds({
            playerHeroId: '1lifeweaver',
            rowId: '1f',
            getRowCardIds: (id) => rows[id] || [],
        })).toEqual(['1lifeweaver', '1mercy', '1orisa']);
    });
});

describe('canDuplicateUltimate', () => {
    test('rejects missing, special, tracer, and echo ultimates', () => {
        expect(canDuplicateUltimate(null).ok).toBe(false);
        expect(canDuplicateUltimate({ heroId: 'bob' }).ok).toBe(false);
        expect(canDuplicateUltimate({ heroId: 'tracer' }).ok).toBe(false);
        expect(canDuplicateUltimate({ heroId: 'echo' }).ok).toBe(false);
        expect(canDuplicateUltimate({ heroId: '1dvameka' }).ok).toBe(false);
        expect(canDuplicateUltimate({ heroId: 'stoneguard' }).ok).toBe(false);
    });

    test('allows a normal hero ultimate', () => {
        expect(canDuplicateUltimate({ heroId: 'soldier' })).toEqual({ ok: true });
    });
});

describe('normalizeHeroId', () => {
    test('strips the leading player digit', () => {
        expect(normalizeHeroId('1mccree')).toBe('mccree');
        expect(normalizeHeroId('mccree')).toBe('mccree');
    });
});

describe('findCardRowId', () => {
    test('finds the board row containing the card', () => {
        expect(findCardRowId('1ramattra', (id) => ({
            '1f': [],
            '1m': ['1orisa', '1ramattra'],
            '1b': [],
        }[id]))).toBe('1m');
    });

    test('returns null when the card is not on the board', () => {
        expect(findCardRowId('1ramattra', () => [])).toBe(null);
    });
});

describe('selfDestructTargets', () => {
    test('hits every living hero on both sides, not just the two facing rows', () => {
        const rows = {
            '1f': { cardIds: ['1ana'] },
            '1m': { cardIds: ['1dvameka'] },
            '1b': { cardIds: [] },
            '2f': { cardIds: [] },
            '2m': { cardIds: ['2mercy'] },
            '2b': { cardIds: ['2reaper'] },
        };
        const health = {
            '1ana': { health: 3 },
            '1dvameka': { health: 4 },
            '2mercy': { health: 3 },
            '2reaper': { health: 0 },
        };
        const ids = selfDestructTargets(
            (id) => rows[id],
            (id) => health[id],
        ).map((t) => t.cardId);
        expect(ids).toEqual(expect.arrayContaining(['1ana', '1dvameka', '2mercy']));
        expect(ids).not.toContain('2reaper');
        expect(ids).toHaveLength(3);
    });
});

describe('isStructureCard', () => {
    test('turrets and stoneguard relics are structures, heroes are not', () => {
        expect(isStructureCard({ id: 'turret', turret: true })).toBe(true);
        expect(isStructureCard({ id: 'stoneguard', structure: true })).toBe(true);
        expect(isStructureCard({ id: 'bob', special: true })).toBe(false);
        expect(isStructureCard({ id: 'brigitte' })).toBe(false);
    });
});

describe('rowDistance', () => {
    test('counts rows travelled on the same side', () => {
        expect(rowDistance('2f', '2f')).toBe(0);
        expect(rowDistance('2f', '2m')).toBe(1);
        expect(rowDistance('2f', '2b')).toBe(2);
        expect(rowDistance('1b', '1f')).toBe(2);
    });
});

describe('crushZoneMoves', () => {
    test('pulls heroes not structures, and damages by distance', () => {
        const moves = crushZoneMoves({
            cards: [
                { cardId: '2ana', rowId: '2f', card: { id: 'ana', health: 3 } },
                { cardId: '2turret', rowId: '2f', card: { id: 'turret', turret: true, health: 3 } },
                { cardId: '2reaper', rowId: '2b', card: { id: 'reaper', health: 2 } },
                { cardId: '2mercy', rowId: '2m', card: { id: 'mercy', health: 3 } },
            ],
            destRowId: '2m',
            capacity: 4,
        });
        // Lowest health travels first, and both reach the destination row.
        expect(moves.map((m) => m.cardId)).toEqual(['2reaper', '2ana']);
        expect(moves.find((m) => m.cardId === '2ana')).toMatchObject({
            fromRowId: '2f',
            toRowId: '2m',
            damage: 1,
        });
        expect(moves.find((m) => m.cardId === '2reaper')).toMatchObject({
            fromRowId: '2b',
            toRowId: '2m',
            damage: 1,
        });
        expect(moves.some((m) => m.cardId === '2turret')).toBe(false);
        // Already where it is being pulled to.
        expect(moves.some((m) => m.cardId === '2mercy')).toBe(false);
    });
});

describe('clampBlocksMovement', () => {
    test('blocks when the source row has a magnetic clamp', () => {
        expect(clampBlocksMovement({
            enemyEffects: [{ id: 'magnetic-clamp' }],
        })).toBe(true);
        expect(clampBlocksMovement({ enemyEffects: [] })).toBe(false);
        expect(clampBlocksMovement(null)).toBe(false);
    });
});

describe('rowsAreAdjacent', () => {
    test('allows front-middle and middle-back on the same half', () => {
        expect(rowsAreAdjacent('1f', '1m')).toBe(true);
        expect(rowsAreAdjacent('1m', '1b')).toBe(true);
        expect(rowsAreAdjacent('2b', '2m')).toBe(true);
    });

    test('rejects spanning front-back or crossing halves', () => {
        expect(rowsAreAdjacent('1f', '1b')).toBe(false);
        expect(rowsAreAdjacent('1f', '2f')).toBe(false);
        expect(rowsAreAdjacent('1f', '2m')).toBe(false);
        expect(rowsAreAdjacent('1f', '1f')).toBe(false);
        expect(rowsAreAdjacent(null, '1m')).toBe(false);
    });
});

describe('killswitchRowCleanup', () => {
    test('destroys structures and strips armor in wired rows', () => {
        const result = killswitchRowCleanup([
            { cardId: '2turret', card: { id: 'turret', turret: true, health: 3, armor: 0 } },
            { cardId: '2ana', card: { id: 'ana', health: 3, armor: 2 } },
            { cardId: '2reaper', card: { id: 'reaper', health: 2, armor: 0 } },
        ]);
        expect(result.destroyIds).toEqual(['2turret']);
        expect(result.stripArmorIds).toEqual(['2ana']);
    });
});

describe('electrifiedTargets', () => {
    test('returns living enemies marked electrified', () => {
        const cards = [
            { cardId: '2ana', card: { health: 2, effects: [{ id: 'electrified' }] } },
            { cardId: '2reaper', card: { health: 0, effects: [{ id: 'electrified' }] } },
            { cardId: '1sylvain', card: { health: 2, effects: [] } },
        ];
        expect(electrifiedTargets(cards).map((c) => c.cardId)).toEqual(['2ana']);
    });
});
