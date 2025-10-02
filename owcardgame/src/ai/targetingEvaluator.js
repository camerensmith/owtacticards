/**
 * Minimal targeting heuristics for AI.
 * These helpers use only adapter-visible state and simple rules.
 */

export function pickAllyHealTarget(adapter) {
    const board = adapter?.getBoard(2) || { front: [], middle: [], back: [] };
    const all = [...(board.front||[]), ...(board.middle||[]), ...(board.back||[])];
    if (all.length === 0) return null;
    // Lowest health first, then prioritize supports/tanks by role if tied
    const rolePriority = { Support: 2, Tank: 1, Damage: 0 };
    const sorted = all
        .filter(c => typeof c.health === 'number')
        .sort((a, b) => (a.health - b.health) || ((rolePriority[b.role]||0) - (rolePriority[a.role]||0)));
    return sorted[0] || null;
}

export function pickEnemyRemovalTarget(adapter) {
    const board = adapter?.getBoard(1) || { front: [], middle: [], back: [] };
    const all = [...(board.front||[]), ...(board.middle||[]), ...(board.back||[])];
    if (all.length === 0) return null;
    // Highest threat: power sum + has ultimate/enter abilities as tie-breakers
    const threatScore = (c) => {
        const power = (c.front_power||0) + (c.middle_power||0) + (c.back_power||0);
        const abil = (c.ultimate ? 2 : 0) + ((c.on_enter1||c.on_enter2) ? 1 : 0);
        return power * 1.0 + abil * 3.0;
    };
    const sorted = all.sort((a, b) => threatScore(b) - threatScore(a));
    return sorted[0] || null;
}

export function pickRowTarget(adapter, forEnemy = true) {
    // Pick the row with most enemy power or most ally units depending on intent
    const pid = forEnemy ? 1 : 2;
    const board = adapter?.getBoard(pid) || { front: [], middle: [], back: [] };
    const rowPower = (row) => row.reduce((acc, c) => acc + ((c.front_power||0)+(c.middle_power||0)+(c.back_power||0)), 0);
    const entries = [
        ['front', rowPower(board.front||[])],
        ['middle', rowPower(board.middle||[])],
        ['back', rowPower(board.back||[])],
    ];
    entries.sort((a, b) => b[1] - a[1]);
    return entries[0]?.[0] || 'middle';
}

export function inferIntentFromAbilityKey(abilityKey) {
    if (!abilityKey) return 'generic';
    const key = String(abilityKey).toLowerCase();
    if (key.includes('heal') || key.includes('shield') || key.includes('buff')) return 'ally';
    if (key.includes('damage') || key.includes('snipe') || key.includes('blast') || key.includes('shot')) return 'enemy';
    if (key.includes('row') || key.includes('aoe')) return 'row';
    return 'generic';
}

export function resolveRowTargetForEffect(adapter, effectIntent /* 'ally'|'enemy'|'both' */) {
    // Map effect intent to player rows
    const toRowKey = (rid) => rid.endsWith('f') ? 'front' : rid.endsWith('m') ? 'middle' : 'back'
    if (effectIntent === 'ally') {
        // Choose ally row with most beneficiaries
        const board = adapter?.getBoard(2) || { front: [], middle: [], back: [] }
        const entries = [ ['front', board.front.length], ['middle', board.middle.length], ['back', board.back.length] ]
        entries.sort((a,b) => b[1]-a[1])
        return { player: 2, row: entries[0][0] }
    }
    if (effectIntent === 'enemy') {
        // Choose enemy row with highest power to debuff/damage
        const board = adapter?.getBoard(1) || { front: [], middle: [], back: [] }
        const rowPower = (row) => row.reduce((acc, c) => acc + ((c.front_power||0)+(c.middle_power||0)+(c.back_power||0)), 0)
        const entries = [ ['front', rowPower(board.front||[])], ['middle', rowPower(board.middle||[])], ['back', rowPower(board.back||[])] ]
        entries.sort((a,b) => b[1]-a[1])
        return { player: 1, row: entries[0][0] }
    }
    // both: decide based on maximizing net benefit; simple heuristic: buff allies if we have more, otherwise hit enemies
    const allyBoard = adapter?.getBoard(2) || { front: [], middle: [], back: [] }
    const enemyBoard = adapter?.getBoard(1) || { front: [], middle: [], back: [] }
    const allyUnits = (allyBoard.front?.length||0)+(allyBoard.middle?.length||0)+(allyBoard.back?.length||0)
    const enemyUnits = (enemyBoard.front?.length||0)+(enemyBoard.middle?.length||0)+(enemyBoard.back?.length||0)
    if (allyUnits >= enemyUnits) {
        const entries = [ ['front', allyBoard.front.length], ['middle', allyBoard.middle.length], ['back', allyBoard.back.length] ]
        entries.sort((a,b) => b[1]-a[1])
        return { player: 2, row: entries[0][0] }
    } else {
        const rowPower = (row) => row.reduce((acc, c) => acc + ((c.front_power||0)+(c.middle_power||0)+(c.back_power||0)), 0)
        const entries = [ ['front', rowPower(enemyBoard.front||[])], ['middle', rowPower(enemyBoard.middle||[])], ['back', rowPower(enemyBoard.back||[])] ]
        entries.sort((a,b) => b[1]-a[1])
        return { player: 1, row: entries[0][0] }
    }
}

export function inferRowEffectIntent(effectKey) {
    const k = String(effectKey||'').toLowerCase()
    if (k.includes('ally') || k.includes('buff') || k.includes('heal')) return 'ally'
    if (k.includes('enemy') || k.includes('debuff') || k.includes('damage') || k.includes('aoe')) return 'enemy'
    return 'both'
}


