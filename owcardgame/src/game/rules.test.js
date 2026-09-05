import {
    applyDefenderDamage,
    applyRowShieldDamage,
    decideRoundWinner,
    totalRowSynergy,
    isDeployFromHand,
    wouldDamageBeFatal,
    countsAsDeployHero,
    firstEmptySlot,
    canDeployFromHand,
    resolveInsertSlot,
    previewShiftIndices,
    applyWellDrop,
    healedHealth,
    repairPackApply,
    handLockVisual,
} from './rules';

describe('applyRowShieldDamage', () => {
    test('never drives a shield entry below 0', () => {
        const result = applyRowShieldDamage(
            [{ playerHeroId: '1orisa', shieldValue: 2 }],
            5
        );
        expect(result.shields).toEqual([]);
        expect(result.damageDone).toBe(2);
        expect(result.remaining).toBe(3);
    });

    test('removes consecutive depleted entries', () => {
        const result = applyRowShieldDamage(
            [
                { playerHeroId: '1a', shieldValue: 1 },
                { playerHeroId: '1b', shieldValue: 1 },
                { playerHeroId: '1c', shieldValue: 2 },
            ],
            3
        );
        expect(result.shields).toEqual([{ playerHeroId: '1c', shieldValue: 1 }]);
        expect(result.damageDone).toBe(3);
        expect(result.remaining).toBe(0);
    });

    test('treats missing damage as 0', () => {
        const shields = [{ playerHeroId: '1a', shieldValue: 2 }];
        const result = applyRowShieldDamage(shields, undefined);
        expect(result.shields).toEqual(shields);
        expect(result.damageDone).toBe(0);
    });
});

describe('applyDefenderDamage', () => {
    test('row shields absorb before card shields and health', () => {
        const result = applyDefenderDamage({
            amount: 4,
            ignoreShields: false,
            health: 3,
            cardShield: 1,
            rowShields: [{ playerHeroId: '1orisa', shieldValue: 2 }],
        });
        expect(result.rowShields).toEqual([]);
        expect(result.cardShield).toBe(0);
        expect(result.health).toBe(2);
        expect(result.rowShieldDamage).toBe(2);
        expect(result.died).toBe(false);
    });

    test('ignoreShields skips row and card shields', () => {
        const result = applyDefenderDamage({
            amount: 2,
            ignoreShields: true,
            health: 3,
            cardShield: 5,
            rowShields: [{ playerHeroId: '1orisa', shieldValue: 4 }],
        });
        expect(result.rowShields).toEqual([{ playerHeroId: '1orisa', shieldValue: 4 }]);
        expect(result.cardShield).toBe(5);
        expect(result.health).toBe(1);
    });

    test('does not revive or go negative, and flags death', () => {
        const result = applyDefenderDamage({
            amount: 10,
            ignoreShields: true,
            health: 2,
            cardShield: 0,
            rowShields: [],
        });
        expect(result.health).toBe(0);
        expect(result.died).toBe(true);
    });

    test('already-dead hero does not re-flag death', () => {
        const result = applyDefenderDamage({
            amount: 1,
            ignoreShields: true,
            health: 0,
            cardShield: 0,
            rowShields: [],
        });
        expect(result.died).toBe(false);
        expect(result.health).toBe(0);
    });

    test('armor absorbs after shields and before health', () => {
        const result = applyDefenderDamage({
            amount: 4,
            health: 3,
            armor: 2,
            cardShield: 1,
            rowShields: [{ playerHeroId: '1orisa', shieldValue: 1 }],
        });
        expect(result.rowShields).toEqual([]);
        expect(result.cardShield).toBe(0);
        expect(result.armor).toBe(0);
        expect(result.health).toBe(3);
        expect(result.died).toBe(false);
    });

    test('ignoreShields pierces armor like other shields', () => {
        const result = applyDefenderDamage({
            amount: 2,
            ignoreShields: true,
            health: 3,
            armor: 2,
            cardShield: 5,
            rowShields: [{ playerHeroId: '1orisa', shieldValue: 4 }],
        });
        expect(result.rowShields).toEqual([{ playerHeroId: '1orisa', shieldValue: 4 }]);
        expect(result.cardShield).toBe(5);
        expect(result.armor).toBe(2);
        expect(result.health).toBe(1);
        expect(result.died).toBe(false);
    });

    test('depleting armor then health is fatal', () => {
        const result = applyDefenderDamage({
            amount: 5,
            health: 2,
            armor: 2,
        });
        expect(result.armor).toBe(0);
        expect(result.health).toBe(0);
        expect(result.died).toBe(true);
    });
});

describe('decideRoundWinner', () => {
    test('higher power wins', () => {
        expect(decideRoundWinner(5, 3, 0, 10)).toBe(1);
        expect(decideRoundWinner(1, 4, 9, 0)).toBe(2);
    });

    test('equal power uses total synergy as tiebreak', () => {
        expect(decideRoundWinner(4, 4, 3, 1)).toBe(1);
        expect(decideRoundWinner(4, 4, 1, 3)).toBe(2);
    });

    test('equal power and synergy is a draw', () => {
        expect(decideRoundWinner(4, 4, 2, 2)).toBe(3);
    });

    test('does not add unit counts into the score', () => {
        // If corpses were added as +1 each, 3 power + 2 dead would beat 4 power.
        expect(decideRoundWinner(3, 4, 0, 0)).toBe(2);
    });
});

describe('totalRowSynergy', () => {
    test('sums front, middle, and back for a player', () => {
        const rows = {
            '1f': { synergy: 2 },
            '1m': { synergy: 1 },
            '1b': { synergy: 3 },
            '2f': { synergy: 9 },
        };
        expect(totalRowSynergy(rows, 1)).toBe(6);
        expect(totalRowSynergy(rows, 2)).toBe(9);
    });
});

describe('isDeployFromHand', () => {
    test('hand rows are deploys', () => {
        expect(isDeployFromHand('player1hand')).toBe(true);
        expect(isDeployFromHand('player2hand')).toBe(true);
    });

    test('board rows are not deploys', () => {
        expect(isDeployFromHand('1f')).toBe(false);
        expect(isDeployFromHand('2m')).toBe(false);
    });
});

describe('firstEmptySlot', () => {
    test('returns length when under capacity', () => {
        expect(firstEmptySlot(['1ana', '1mei'], 4)).toBe(2);
    });
    test('returns -1 when full', () => {
        expect(firstEmptySlot(['a', 'b', 'c', 'd'], 4)).toBe(-1);
    });
});

describe('countsAsDeployHero', () => {
    test('excludes turret and bob', () => {
        expect(countsAsDeployHero('ana')).toBe(true);
        expect(countsAsDeployHero('turret')).toBe(false);
        expect(countsAsDeployHero('bob')).toBe(false);
        expect(countsAsDeployHero('stoneguard')).toBe(false);
    });
});

describe('canDeployFromHand', () => {
    const rows = {
        '1f': { cardIds: [], locked: false },
        '1m': { cardIds: ['1orisa'], locked: false },
        '1b': { cardIds: [], locked: false },
        player1hand: { cardIds: ['1ana'] },
    };
    const getCard = (id) => ({ id: id.slice(1) });

    // Symmetra pulled this hero off the board on turn 3, so it may go back out
    // from turn 4 — the owner's next turn — and not before.
    const held = (id) => ({ id: id.slice(1), redeployLockedUntilTurn: 4 });
    const deploy = (turnCount, cards) => canDeployFromHand({
        playerTurn: 1,
        turnCount,
        startRowId: 'player1hand',
        finishRowId: '1f',
        cardId: '1ana',
        rows,
        getCard: cards,
    });

    test('rejects a hero returned to hand on this turn', () => {
        expect(deploy(3, held).reason).toBe('returned-this-turn');
    });

    test('lets the same hero out again once the turn has moved on', () => {
        expect(deploy(4, held).ok).toBe(true);
        expect(deploy(5, held).ok).toBe(true);
    });

    test('a hero that was never returned is not held', () => {
        expect(deploy(3, getCard).ok).toBe(true);
    });

    test('a returned hero shows a HELD lock on the card', () => {
        expect(handLockVisual(true)).toEqual({
            className: 'redeploy-locked',
            label: 'HELD',
        });
        expect(handLockVisual(false)).toBeNull();
    });

    test('rejects enemy row, locked row, and a full row', () => {
        expect(canDeployFromHand({
            playerTurn: 1, startRowId: 'player1hand', finishRowId: '2f',
            cardId: '1ana', rows: { ...rows, '2f': { cardIds: [], locked: false } }, getCard,
        }).ok).toBe(false);

        const locked = { ...rows, '1f': { cardIds: [], locked: true } };
        expect(canDeployFromHand({
            playerTurn: 1, startRowId: 'player1hand', finishRowId: '1f',
            cardId: '1ana', rows: locked, getCard,
        }).reason).toBe('locked');

        const full = { ...rows, '1f': { cardIds: ['a', 'b', 'c', 'd'], locked: false } };
        expect(canDeployFromHand({
            playerTurn: 1, startRowId: 'player1hand', finishRowId: '1f',
            cardId: '1ana', rows: full, getCard,
        }).reason).toBe('row-full');
    });

    test('Mantis may deploy onto an enemy row only', () => {
        const board = { ...rows, '2f': { cardIds: [], locked: false } };
        expect(canDeployFromHand({
            playerTurn: 1, startRowId: 'player1hand', finishRowId: '2f',
            cardId: '1mantis', rows: board, getCard,
        }).ok).toBe(true);
        expect(canDeployFromHand({
            playerTurn: 1, startRowId: 'player1hand', finishRowId: '1f',
            cardId: '1mantis', rows: board, getCard,
        }).ok).toBe(false);
    });

    test('a locked row still accepts a turret drop, not a hero', () => {
        const locked = { ...rows, '1f': { cardIds: [], locked: true } };
        expect(canDeployFromHand({
            playerTurn: 1, startRowId: 'player1hand', finishRowId: '1f',
            cardId: '1ana', rows: locked, getCard,
        }).reason).toBe('locked');
        expect(canDeployFromHand({
            playerTurn: 1, startRowId: 'player1hand', finishRowId: '1f',
            cardId: '1turret', rows: locked, getCard,
        }).ok).toBe(true);
        expect(canDeployFromHand({
            playerTurn: 1, startRowId: 'player1hand', finishRowId: '1f',
            cardId: '1stoneguard', rows: locked, getCard,
        }).ok).toBe(true);
    });

    test('allows filling another row even when 6 heroes are already deployed', () => {
        const six = {
            ...rows,
            '1f': { cardIds: ['1a', '1b', '1c', '1d'], locked: false },
            '1m': { cardIds: ['1e', '1g'], locked: false },
        };
        expect(canDeployFromHand({
            playerTurn: 1, startRowId: 'player1hand', finishRowId: '1b',
            cardId: '1ana', rows: six, getCard,
        }).ok).toBe(true);
    });

    test('allows bob onto a board that already has 6 heroes', () => {
        const six = {
            '1f': { cardIds: ['1a', '1b', '1c', '1d'], locked: false },
            '1m': { cardIds: ['1e', '1g'], locked: false },
            '1b': { cardIds: [], locked: false },
            player1hand: { cardIds: ['1bob'] },
        };
        expect(canDeployFromHand({
            playerTurn: 1, startRowId: 'player1hand', finishRowId: '1b',
            cardId: '1bob', rows: six, getCard: (id) => ({ id: id.slice(1) }),
        }).ok).toBe(true);
    });

    test('accepts insert at 0 when the row already has two cards', () => {
        const occupied = {
            ...rows,
            '1f': { cardIds: ['1ana', '1mei'], locked: false },
            player1hand: { cardIds: ['1winston'] },
        };
        expect(canDeployFromHand({
            playerTurn: 1,
            startRowId: 'player1hand',
            finishRowId: '1f',
            cardId: '1winston',
            rows: occupied,
            getCard,
            requestedIndex: 0,
        })).toEqual({ ok: true, slotIndex: 0 });
    });
});

describe('resolveInsertSlot', () => {
    test('empty row inserts at 0', () => {
        expect(resolveInsertSlot({ cardIds: [], requestedIndex: 0 })).toEqual({ ok: true, slotIndex: 0 });
    });
    test('empty row appends even if a later seat was requested', () => {
        expect(resolveInsertSlot({ cardIds: [], requestedIndex: 2 }).slotIndex).toBe(0);
    });
    test('inserts at requested index when under capacity', () => {
        expect(resolveInsertSlot({ cardIds: ['a', 'b'], requestedIndex: 0 }).slotIndex).toBe(0);
        expect(resolveInsertSlot({ cardIds: ['a', 'b'], requestedIndex: 1 }).slotIndex).toBe(1);
    });
    test('clamps past the end to append', () => {
        expect(resolveInsertSlot({ cardIds: ['a', 'b'], requestedIndex: 5 }).slotIndex).toBe(2);
        expect(resolveInsertSlot({ cardIds: [], requestedIndex: -1 }).slotIndex).toBe(0);
    });
    test('rejects a full row', () => {
        expect(resolveInsertSlot({
            cardIds: ['a', 'b', 'c', 'd'],
            requestedIndex: 0,
        })).toEqual({ ok: false, reason: 'row-full' });
    });
});

describe('applyWellDrop', () => {
    test('places onto an empty row packed left', () => {
        expect(applyWellDrop([], 2, 'winston').cardIds).toEqual(['winston']);
    });
    test('shifts right when dropping onto an occupied seat', () => {
        expect(applyWellDrop(['ana', 'mei'], 0, 'winston').cardIds).toEqual(['winston', 'ana', 'mei']);
    });
});

describe('previewShiftIndices', () => {
    test('inserting at 0 shifts occupants right', () => {
        expect(previewShiftIndices(['ana', 'mei'], 0, 'winston')).toEqual({
            winston: 0,
            ana: 1,
            mei: 2,
        });
    });
});

describe('wouldDamageBeFatal', () => {
    test('shields prevent a fatal hit', () => {
        expect(wouldDamageBeFatal({
            amount: 3,
            health: 1,
            cardShield: 2,
            rowShieldTotal: 1,
            ignoreShields: false,
        })).toBe(false);
    });

    test('ignoreShields can still be fatal', () => {
        expect(wouldDamageBeFatal({
            amount: 3,
            health: 1,
            cardShield: 5,
            rowShieldTotal: 5,
            ignoreShields: true,
        })).toBe(true);
    });

    test('armor is a shield pool against a lethal hit', () => {
        expect(wouldDamageBeFatal({
            amount: 2,
            health: 1,
            armor: 2,
            ignoreShields: false,
        })).toBe(false);
        expect(wouldDamageBeFatal({
            amount: 3,
            health: 1,
            armor: 2,
            ignoreShields: false,
        })).toBe(true);
    });

    test('ignoreShields pierces armor when checking lethality', () => {
        expect(wouldDamageBeFatal({
            amount: 1,
            health: 1,
            armor: 5,
            ignoreShields: true,
        })).toBe(true);
    });
});

describe('healedHealth', () => {
    test('heals up to base HP and not past it', () => {
        expect(healedHealth(2, 1, 3)).toBe(3);
        expect(healedHealth(3, 1, 3)).toBe(3);
        expect(healedHealth(1, 5, 3)).toBe(3);
    });

    test('does not reduce extra HP already above base', () => {
        expect(healedHealth(5, 1, 3)).toBe(5);
    });

    test('does not revive a dead card', () => {
        expect(healedHealth(0, 2, 3)).toBe(0);
    });
});

describe('repairPackApply', () => {
    test('heals 2 and converts overflow past base HP into armor', () => {
        expect(repairPackApply({ health: 3, maxHealth: 4, armor: 0, amount: 2 })).toEqual({
            health: 4,
            armor: 1,
            healed: 1,
            armorGained: 1,
        });
    });

    test('full HP becomes armor only', () => {
        expect(repairPackApply({ health: 4, maxHealth: 4, armor: 1, amount: 2 })).toEqual({
            health: 4,
            armor: 3,
            healed: 0,
            armorGained: 2,
        });
    });

    test('does not revive or armor a dead card', () => {
        expect(repairPackApply({ health: 0, maxHealth: 3, armor: 0, amount: 2 })).toEqual({
            health: 0,
            armor: 0,
            healed: 0,
            armorGained: 0,
        });
    });
});
