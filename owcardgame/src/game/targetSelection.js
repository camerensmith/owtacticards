/**
 * What makes a pick invalid, and what to do about it.
 *
 * Abilities used to validate their targets after the click resolved and bail
 * out of the whole ability on a bad one: choose your own hero by mistake with
 * Tracer and the on-enter was gone, not retried. Worse for the ones that want
 * two targets in the same row — pick a second enemy from the wrong row and Ashe
 * lost her ability, and if only one enemy stood in that row she could never
 * finish at all.
 *
 * So rejection is separated from cancellation. A bad pick says why and asks
 * again; right-click resolves with whatever has been picked so far.
 */

/** Why a pick was refused. Written to be read by the player, not the log. */
export const REJECT = {
    ally: 'That is your own hero — choose an enemy',
    enemy: 'That is an enemy — choose one of your own',
    duplicate: 'Already chosen — pick a different hero',
    dead: 'That hero is already down',
    otherRow: 'Must be in the same row as your first target',
    structure: 'Cannot target a structure',
};

/**
 * The reason this pick cannot be accepted, or null if it can.
 *
 * `side` is 'enemy', 'ally' or undefined for either. `sameRow` ties every pick
 * after the first to the first one's row. `unique` stops the same card being
 * counted twice, which nothing checked before.
 */
export function rejectPick(target, picked = [], rules = {}) {
    if (!target?.cardId) return null;
    const {
        casterPlayerNum,
        side,
        sameRow = false,
        unique = true,
        allowDead = false,
        getCard,
    } = rules;

    const chosen = Array.isArray(picked) ? picked : [];
    if (unique && chosen.some((p) => p?.cardId === target.cardId)) {
        return REJECT.duplicate;
    }

    const owner = parseInt(String(target.cardId)[0], 10);
    const caster = Number(casterPlayerNum);
    if (Number.isFinite(caster) && Number.isFinite(owner)) {
        if (side === 'enemy' && owner === caster) return REJECT.ally;
        if (side === 'ally' && owner !== caster) return REJECT.enemy;
    }

    if (!allowDead) {
        const card = getCard?.(target.cardId);
        if (card && (card.health || 0) <= 0) return REJECT.dead;
    }

    if (sameRow && chosen.length > 0 && chosen[0]?.rowId !== target.rowId) {
        return REJECT.otherRow;
    }

    return null;
}

/**
 * Whether right-clicking out of selection should act on what is held.
 *
 * With something picked it commits — the only way to fire a two-target ability
 * when one enemy is left standing. With nothing picked it is a plain cancel,
 * which is how you decline an on-enter you have changed your mind about.
 */
export function commitsOnCancel(picked = []) {
    return (Array.isArray(picked) ? picked : []).length > 0;
}

/**
 * The banner shown while picking, e.g. "Ashe: Split Fire (2/2) — right-click to
 * stop here".
 *
 * A `reason` takes the label's place rather than being shown after it: the
 * selection loop re-prompts on the very next tick, so a refusal posted as its
 * own message would be overwritten before it could be read. Carrying it in the
 * prompt keeps it up until the next pick actually lands.
 */
export function selectionPrompt(label, chosenCount, total, reason) {
    const head = reason || label;
    if (!total || total <= 1) return head;
    return `${head} (${chosenCount + 1}/${total}) — right-click to stop here`;
}
