import { selectCardTarget } from '../engine/targeting';
import { showMessage as showToast, clearMessage as clearToast } from '../engine/targetingBus';
import { playAudioByKey } from '../../assets/imageImports';
import { repairPackApply } from '../../game/rules';
import effectsBus, { Effects } from '../engine/effectsBus';
import { PALETTE } from '../../presentation/pixi/fxConfig';

/** Repair Pack reads as a med-canister. */
const REPAIR_GREEN = PALETTE.heal;

function isAiOwned(cardId) {
    if (window.__ow_practiceMode) return false;
    return parseInt(String(cardId || '')[0], 10) === 2
        || !!window.__ow_aiTriggering
        || !!window.__ow_isAITurn;
}

function applyRepairPack(cardId) {
    const card = window.__ow_getCard?.(cardId);
    if (!card || card.health <= 0) return null;
    const maxHealth = card.maxHealth ?? window.__ow_getMaxHealth?.(cardId) ?? 3;
    const result = repairPackApply({
        health: card.health,
        maxHealth,
        armor: card.armor || 0,
        amount: 2,
    });
    if (result.healed > 0) {
        window.__ow_setCardHealth?.(cardId, result.health, false, { allowStructureHeal: true });
    }
    if (result.armorGained > 0) {
        window.__ow_dispatchArmorUpdate?.(cardId, result.armor);
        try { playAudioByKey('brigitte-armor'); } catch {}
    }
    return result;
}

function livingAllies(playerNum, includeSelfId) {
    const out = [];
    for (const rowId of [`${playerNum}f`, `${playerNum}m`, `${playerNum}b`]) {
        const row = window.__ow_getRow?.(rowId);
        for (const cardId of row?.cardIds || []) {
            const card = window.__ow_getCard?.(cardId);
            if (card && card.health > 0) {
                out.push({ cardId, rowId, card });
            }
        }
    }
    if (!out.length && includeSelfId) {
        const card = window.__ow_getCard?.(includeSelfId);
        if (card && card.health > 0) {
            out.push({ cardId: includeSelfId, card });
        }
    }
    return out;
}

export async function onEnter({ playerHeroId, rowId }) {
    const playerNum = parseInt(playerHeroId[0], 10);
    try { playAudioByKey('brigitte-enter'); } catch {}

    let target;
    if (isAiOwned(playerHeroId)) {
        const allies = livingAllies(playerNum, playerHeroId);
        const others = allies.filter((a) => a.cardId !== playerHeroId);
        const damaged = others.filter((a) => a.card.health < (a.card.maxHealth ?? window.__ow_getMaxHealth?.(a.cardId)));
        const pick = (damaged[0] || others[0] || allies[0]);
        target = pick ? { cardId: pick.cardId, rowId: pick.rowId } : { cardId: playerHeroId, rowId };
    } else {
        showToast('Repair Pack: Select an ally (structures allowed)');
        target = await selectCardTarget({ isHeal: true });
        clearToast();
        if (!target) return;
        if (parseInt(target.cardId[0], 10) !== playerNum) {
            showToast('Repair Pack: Must target an ally');
            setTimeout(() => clearToast(), 2000);
            return;
        }
    }

    // The pack is lobbed across before it takes effect.
    try { effectsBus.publish(Effects.pack(playerHeroId, target.cardId, REPAIR_GREEN)); } catch {}
    const result = applyRepairPack(target.cardId);
    try { playAudioByKey('brigitte-ability1'); } catch {}
    if (!result) return;
    const bits = [];
    if (result.healed > 0) bits.push(`healed ${result.healed}`);
    if (result.armorGained > 0) bits.push(`+${result.armorGained} armor`);
    showToast(`Repair Pack: ${bits.join(', ') || 'already full'}`);
    setTimeout(() => clearToast(), 2000);
}

export async function onUltimate({ playerHeroId, rowId }) {
    const playerNum = parseInt(playerHeroId[0], 10);
    try { playAudioByKey('brigitte-ultimate'); } catch {}

    let target;
    if (isAiOwned(playerHeroId)) {
        const enemy = playerNum === 1 ? 2 : 1;
        const living = [];
        for (const enemyRowId of [`${enemy}f`, `${enemy}m`, `${enemy}b`]) {
            const row = window.__ow_getRow?.(enemyRowId);
            for (const cardId of row?.cardIds || []) {
                const card = window.__ow_getCard?.(cardId);
                if (card && card.health > 0) living.push({ cardId, rowId: enemyRowId });
            }
        }
        if (!living.length) {
            showToast('Shield Bash: No enemies');
            setTimeout(() => clearToast(), 2000);
            return;
        }
        target = living[Math.floor(Math.random() * living.length)];
    } else {
        showToast('Shield Bash: Select an enemy hero');
        target = await selectCardTarget({ isDamage: true });
        clearToast();
        if (!target) return;
        if (parseInt(target.cardId[0], 10) === playerNum) {
            showToast('Shield Bash: Must target an enemy');
            setTimeout(() => clearToast(), 2000);
            return;
        }
    }

    window.__ow_appendCardEffect?.(target.cardId, {
        id: 'shield-bash',
        hero: 'brigitte',
        type: 'debuff',
        sourceCardId: playerHeroId,
        sourceRowId: rowId,
        tooltip: 'Shield Bash: Cannot use ultimate this round',
    });
    // A short, hard spark where the shield lands.
    try { effectsBus.publish(Effects.bash(target.cardId)); } catch {}
    try { playAudioByKey('brigitte-bash'); } catch {}
    showToast('Shield Bash: Ultimate locked this round');
    setTimeout(() => clearToast(), 2000);
}

export function onDraw() {
    try { playAudioByKey('brigitte-intro'); } catch {}
}

export function onDeath() {}

export default { onDraw, onEnter, onUltimate, onDeath };
