import { playAudioByKey } from '../../assets/imageImports';
import { dealDamage, subscribe as subscribeToDamage } from '../engine/damageBus';
import effectsBus, { Effects } from '../engine/effectsBus';
import { getTreeOfLifeTargetIds } from '../../game/abilityRules';
import { pickRandomIds, nearestOtherIds } from '../../game/rosterRules';

let lastDamageSource = null;

function trackDamageSource(event) {
    if (event?.type !== 'damage' || !event.targetCardId || !event.sourceCardId) return;
    const target = window.__ow_getCard?.(event.targetCardId);
    if (target && (target.id === 'stoneguard' || target.heroId === 'stoneguard')) {
        lastDamageSource = { cardId: event.sourceCardId, rowId: event.targetRow };
    }
}

subscribeToDamage(trackDamageSource);

export function onEnter({ playerHeroId }) {
    try { playAudioByKey('stoneguard-enter'); } catch {}
    try { effectsBus.publish(Effects.smash([playerHeroId])); } catch {}
}

export function onDeath({ playerHeroId, rowId }) {
    const playerNum = parseInt(playerHeroId[0], 10);
    try { playAudioByKey('stoneguard-explode'); } catch {}
    try { effectsBus.publish(Effects.shatter(playerHeroId)); } catch {}

    const attackerId = lastDamageSource?.cardId;
    const attackerRow = attackerId
        ? (['1f', '1m', '1b', '2f', '2m', '2b'].find((rid) =>
            (window.__ow_getRow?.(rid)?.cardIds || []).includes(attackerId)
        ) || lastDamageSource?.rowId)
        : null;

    if (attackerId && attackerRow) {
        // The relic burst above is the effect, and Stoneguard is already off the
        // board — a beam from his card would start from nowhere.
        dealDamage(attackerId, attackerRow, 1, false, playerHeroId, false, { skipProjectileFx: true });
        const attackerRowCards = window.__ow_getRow?.(attackerRow)?.cardIds || [];
        const neighbors = nearestOtherIds(attackerRowCards, attackerRowCards.indexOf(attackerId), 2);
        neighbors.forEach((id) => {
            const card = window.__ow_getCard?.(id);
            if (!card || card.health <= 0) return;
            if (parseInt(id[0], 10) === playerNum) return;
            dealDamage(id, attackerRow, 1, false, playerHeroId, false, { skipProjectileFx: true });
        });
    }

    window.__ow_updateSynergy?.(rowId, 1);
    try { effectsBus.publish(Effects.rowWash(rowId, 0xffd9a0)); } catch {}

    const adjacentIds = getTreeOfLifeTargetIds({
        playerHeroId,
        rowId,
        getRowCardIds: (rid) => window.__ow_getRow?.(rid)?.cardIds || [],
    }).filter((id) => id !== playerHeroId);
    const livingAllies = adjacentIds.filter((id) => {
        const card = window.__ow_getCard?.(id);
        return card && card.health > 0 && parseInt(id[0], 10) === playerNum;
    });
    pickRandomIds(livingAllies, 2).forEach((id) => {
        const card = window.__ow_getCard?.(id);
        window.__ow_dispatchArmorUpdate?.(id, (card?.armor || 0) + 1);
        try { effectsBus.publish(Effects.ward(id)); } catch {}
    });
}

export default { onEnter, onDeath };
