import { canDuplicateUltimate } from './abilityRules';

const used = (heroId, heroName = heroId) => ({ heroId, heroName, abilityName: 'Ultimate' });

describe('what Echo may duplicate', () => {
    test('copies an ordinary ultimate', () => {
        expect(canDuplicateUltimate(used('reaper')).ok).toBe(true);
        expect(canDuplicateUltimate(used('mei')).ok).toBe(true);
        expect(canDuplicateUltimate(used('hanzo')).ok).toBe(true);
    });

    /*
     * The bug: the block list was matched as a substring, and
     * `'dva'.includes('dvameka')` is false — so blocking the MEKA never blocked
     * the D.Va ultimate that summons it. Copying it put a second `<player>dvameka`
     * on the board, which collided with the MEKA already standing there.
     */
    test('refuses an ultimate that summons a unit', () => {
        expect(canDuplicateUltimate(used('dva'))).toEqual({ ok: false, reason: 'summon' });
        expect(canDuplicateUltimate(used('ashe'))).toEqual({ ok: false, reason: 'summon' });
        expect(canDuplicateUltimate(used('axiom'))).toEqual({ ok: false, reason: 'summon' });
    });

    // Ramattra's ultimate ends by transforming him into Nemesis, so a copy
    // would transform Echo.
    test('refuses an ultimate that transforms its caster', () => {
        expect(canDuplicateUltimate(used('ramattra'))).toEqual({ ok: false, reason: 'summon' });
    });

    test('refuses the summoned units\' own ultimates', () => {
        for (const unit of ['bob', 'dvameka', 'nemesis', 'turret', 'stoneguard']) {
            expect(canDuplicateUltimate(used(unit))).toEqual({ ok: false, reason: 'summon' });
        }
    });

    test('refuses ultimates that are not hers to cast', () => {
        expect(canDuplicateUltimate(used('tracer')).reason).toBe('blocked');
        expect(canDuplicateUltimate(used('echo')).reason).toBe('blocked');
    });

    test('reports having nothing to copy separately from a refusal', () => {
        expect(canDuplicateUltimate(null)).toEqual({ ok: false, reason: 'none' });
        expect(canDuplicateUltimate(used(''))).toEqual({ ok: false, reason: 'none' });
        expect(canDuplicateUltimate(used(undefined))).toEqual({ ok: false, reason: 'none' });
    });

    test('strips the owning player from the id first', () => {
        expect(canDuplicateUltimate(used('1dva')).reason).toBe('summon');
        expect(canDuplicateUltimate(used('2reaper')).ok).toBe(true);
    });

    // Matching must be exact both ways: a hero whose name merely contains a
    // blocked one is still copyable.
    test('does not block by substring', () => {
        expect(canDuplicateUltimate(used('bobsled')).ok).toBe(true);
        expect(canDuplicateUltimate(used('turretless')).ok).toBe(true);
    });
});
