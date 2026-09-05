import { playAudioByKey, heroCardImages } from '../../assets/imageImports';
import { selectCardTarget } from '../engine/targeting';
import { showMessage as showToast, clearMessage as clearToast } from '../engine/targetingBus';
import effectsBus, { Effects } from '../engine/effectsBus';
import { showReorderModal } from '../engine/modalController';
import {
    sampleUpcomingHeroes,
    mergeDrawQueue,
    excludeQueuedFromPool,
} from '../../game/drawQueue';
import {
    chronoshiftEligibleAllies,
    orderUpcomingForAi,
    pickBestChronoshiftAlly,
} from '../../game/vegaRules';
import { getAbilityMetadata } from '../../ai/abilityMetadata';

function hasOnEnter(heroId) {
    const mod = window.__ow_getAbilityModule?.(heroId);
    return !!(mod && (typeof mod.onEnter === 'function' || typeof mod.onEnterAbility1 === 'function'));
}

function availableUndrawn(playerNum) {
    const drawn = window.__ow_getDrawnHeroes?.(playerNum) || [];
    const drawnSet = new Set(drawn);
    const heroes = window.__ow_getHeroRoster?.() || {};
    const queued = window.__ow_getDrawQueue?.(playerNum) || [];
    const pool = Object.keys(heroes).filter((id) => (
        heroes[id] && !heroes[id].special && !drawnSet.has(id)
    ));
    return excludeQueuedFromPool(pool, queued);
}

function enterPriority(heroId) {
    return Number(getAbilityMetadata(heroId, 'onEnter')?.priority) || 0;
}

export function onDraw() {
    try { playAudioByKey('vega-intro'); } catch {}
}

/** Temporal Rift — peek and reorder the next 3 undrawn heroes. */
export async function onEnter({ playerHeroId }) {
    const playerNum = parseInt(playerHeroId[0], 10);
    try { playAudioByKey('vega-temporalrift'); } catch {}
    try { effectsBus.publish(Effects.temporalRift(playerHeroId)); } catch {}

    const pool = availableUndrawn(playerNum);
    let sample = sampleUpcomingHeroes(pool, 3);
    if (!sample.length) {
        showToast('Temporal Rift: No cards left to peek');
        setTimeout(() => clearToast(), 2000);
        return;
    }

    // AI prefers high-value Enters drawn sooner.
    if (Number(playerNum) === 2 && !window.__ow_practiceMode) {
        sample = orderUpcomingForAi(sample, enterPriority);
    }

    showToast('Temporal Rift: Arrange the next draws');
    const ordered = await new Promise((resolve) => {
        showReorderModal({
            title: 'Temporal Rift',
            heroName: 'Vega',
            heroIds: sample,
            images: heroCardImages,
            ownerPlayerNum: playerNum,
            onConfirm: (ids) => resolve(ids || sample),
        });
    });
    clearToast();

    const existing = window.__ow_getDrawQueue?.(playerNum) || [];
    window.__ow_setDrawQueue?.(playerNum, mergeDrawQueue(existing, ordered));
    showToast(`Temporal Rift: next ${ordered.length}`);
    setTimeout(() => clearToast(), 2000);
}

/** Chronoshift (3) — replay target ally Enter. */
export async function onUltimate({ playerHeroId }) {
    try { playAudioByKey('vega-ult-start'); } catch {}

    const eligible = chronoshiftEligibleAllies({
        vegaCardId: playerHeroId,
        getRow: window.__ow_getRow,
        getCard: window.__ow_getCard,
        hasOnEnter,
    });
    if (!eligible.length) {
        showToast('Chronoshift: No ally Enter to copy');
        setTimeout(() => clearToast(), 2000);
        return false;
    }

    let target = null;
    const aiOwned = Number(playerHeroId[0]) === 2 && !window.__ow_practiceMode;
    if (aiOwned || window.__ow_aiTriggering) {
        target = pickBestChronoshiftAlly(eligible, enterPriority);
    } else {
        showToast('Chronoshift: Select an ally');
        const picked = await selectCardTarget({
            isBuff: true,
            targets: eligible.map((e) => ({ cardId: e.cardId, rowId: e.rowId })),
        });
        clearToast();
        if (!picked?.cardId) return false;
        target = eligible.find((e) => e.cardId === picked.cardId);
        if (!target) {
            showToast('Chronoshift: Must select an allied hero with an Enter');
            setTimeout(() => clearToast(), 2000);
            return false;
        }
    }

    try { effectsBus.publish(Effects.chronoshift(playerHeroId, target.cardId)); } catch {}
    try { playAudioByKey('vega-ult-resolve'); } catch {}

    const ok = await window.__ow_rerunEnterAbility?.(target.cardId, target.rowId);
    if (ok === false) {
        showToast('Chronoshift: Enter failed');
        setTimeout(() => clearToast(), 2000);
        return false;
    }
    showToast(`Chronoshift: ${target.heroId}`);
    setTimeout(() => clearToast(), 2000);
    return true;
}

export default { onDraw, onEnter, onUltimate };
