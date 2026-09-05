import { dealDamage } from '../engine/damageBus';
import effectsBus, { Effects } from '../engine/effectsBus';
import { playAudioByKey } from '../../assets/imageImports';
import { selectCardTarget } from '../engine/targeting';
import { showMessage as showToast, clearMessage as clearToast } from '../engine/targetingBus';
import { showOnEnterChoice } from '../engine/modalController';
import { collectLivingOnRows, enemyRowIds, turbojackOutcome } from '../../game/rosterRules';
import { TURBOJACK } from '../../presentation/pixi/fxMath';

function isAiOwned(cardId) {
    if (window.__ow_practiceMode) return false;
    return parseInt(String(cardId || '')[0], 10) === 2
        || !!window.__ow_aiTriggering
        || !!window.__ow_isAITurn;
}

export function onEnter({ playerHeroId }) {
    try { playAudioByKey('cyclo-enter'); } catch {}
    window.__ow_appendCardEffect?.(playerHeroId, {
        id: 'chainsword',
        hero: 'cyclo',
        type: 'retaliate',
        tooltip: 'Chainsword: When an enemy directly attacks a hero on this row, you may deal 1 to them',
    });
    try { effectsBus.publish(Effects.pulse(playerHeroId)); } catch {}
}

export function offerChainsword({ attackerCardId, attackerRowId, cycloId }) {
    if (!attackerCardId || !attackerRowId || !cycloId) return;
    const strike = () => {
        dealDamage(attackerCardId, attackerRowId, 1, false, cycloId);
        try { effectsBus.publish(Effects.showDamage(attackerCardId, 1)); } catch {}
    };
    if (isAiOwned(cycloId)) {
        strike();
        return;
    }
    // Named owner: this is an interrupt, raised on the attacker's turn. Without
    // it the turn decides who answers, and the AI took the player's retaliation
    // for them — most visibly against a Bastion token, which only ever fires
    // during the AI's own turn.
    showOnEnterChoice(
        'Cyclo',
        { name: 'Chainsword', description: 'Deal 1 damage to the attacker.' },
        { name: 'Hold', description: 'Do not retaliate.' },
        async (choiceIndex) => {
            if (choiceIndex !== 0) return;
            strike();
        },
        parseInt(String(cycloId)[0], 10)
    );
}

export async function onUltimate({ playerHeroId, rowId }) {
    const playerNum = parseInt(playerHeroId[0], 10);
    const enemies = collectLivingOnRows(enemyRowIds(playerNum), window.__ow_getRow, window.__ow_getCard)
        .filter((e) => !['turret', 'bob', 'nemesis'].includes(e.card?.id));
    if (!enemies.length) {
        showToast('Turbojack: No enemy heroes');
        setTimeout(() => clearToast(), 2000);
        return false;
    }

    let target;
    if (isAiOwned(playerHeroId)) {
        target = enemies[Math.floor(Math.random() * enemies.length)];
    } else {
        showToast('Turbojack: Select an enemy hero');
        target = await selectCardTarget({ isDamage: true });
        clearToast();
        if (!target) return false;
    }

    const frontId = `${playerNum}f`;
    const targetHealth = window.__ow_getCard?.(target.cardId)?.health || 0;
    const outcome = turbojackOutcome({
        sourceCardId: playerHeroId,
        targetCardId: target.cardId,
        targetHealth,
        cycloRowId: rowId,
        frontRowId: frontId,
        frontHasSpace: !window.__ow_isRowFull?.(frontId),
    });
    if (!outcome.resolved) return false;

    try { playAudioByKey('cyclo-ultimate'); } catch {}

    // The funnel crosses first, then a black swirl turns on the card it lands
    // on. Damage waits for the cyclone to arrive, so the hit reads as the
    // impact rather than something that happened as the button was pressed.
    try { effectsBus.publish(Effects.turbojack(playerHeroId, target.cardId)); } catch {}
    await new Promise((resolve) => setTimeout(resolve, TURBOJACK.cycloneMs));

    dealDamage(target.cardId, target.rowId, 3, true, playerHeroId, false, { skipProjectileFx: true });
    try { effectsBus.publish(Effects.showDamage(target.cardId, 3)); } catch {}

    if (outcome.reshuffleTarget) {
        try { effectsBus.publish(Effects.shuffle(target.cardId)); } catch {}
        if (window.__ow_flyToDeck) {
            await window.__ow_flyToDeck(target.cardId);
        }
        // Marked on the way out: when it comes back round it is playable, but
        // it does not get its on-enter a second time.
        window.__ow_reshuffleToDeck?.(target.cardId, { turbojacked: true });
    }

    if (outcome.moveCycloToFront) {
        window.__ow_moveCardToRow?.(playerHeroId, frontId);
        try { effectsBus.publish(Effects.push(playerHeroId, rowId, frontId)); } catch {}
    }

    showToast('Turbojack');
    setTimeout(() => clearToast(), 2000);
    return true;
}

export function onDeath({ playerHeroId }) {
    window.__ow_removeCardEffect?.(playerHeroId, 'chainsword');
}

export default { onEnter, onUltimate, offerChainsword, onDeath };
