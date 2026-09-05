import { selectRowTarget } from '../engine/targeting';
import { showMessage as showToast, clearMessage as clearToast } from '../engine/targetingBus';
import { playAudioByKey } from '../../assets/imageImports';
import effectsBus, { Effects } from '../engine/effectsBus';
import { pickRandomBoardSlot, allyRowIds } from '../../game/rosterRules';
import { PALETTE } from '../../presentation/pixi/fxConfig';

const RELIC = PALETTE.amberPale;

function isAiOwned(cardId) {
    if (window.__ow_practiceMode) return false;
    return parseInt(String(cardId || '')[0], 10) === 2
        || !!window.__ow_aiTriggering
        || !!window.__ow_isAITurn;
}

function minorRelicEffect(playerHeroId, rowId) {
    return {
        id: 'minor-relic',
        hero: 'axiom',
        type: 'buff',
        visual: 'relic',
        sourceCardId: playerHeroId,
        sourceRowId: rowId,
        playerHeroId,
        tooltip: 'Minor relic: +1 synergy',
    };
}

export function onDraw() {
    try { playAudioByKey('axiom-intro'); } catch {}
}

export async function onEnter({ playerHeroId, rowId }) {
    const playerNum = parseInt(playerHeroId[0], 10);
    try { playAudioByKey('axiom-enter'); } catch {}

    let dest;
    if (isAiOwned(playerHeroId)) {
        dest = allyRowIds(playerNum)[Math.floor(Math.random() * 3)];
    } else {
        showToast('Enchant: Select an allied row');
        dest = (await selectRowTarget({ isBuff: true }))?.rowId;
        clearToast();
        if (!dest) return;
        if (parseInt(dest[0], 10) !== playerNum) {
            showToast('Enchant: Must be an allied row');
            setTimeout(() => clearToast(), 2000);
            return;
        }
    }

    window.__ow_appendRowEffect?.(dest, 'allyEffects', minorRelicEffect(playerHeroId, rowId));
    window.__ow_updateSynergy?.(dest, 1);
    try { playAudioByKey('axiom-ability1-resolve'); } catch {}
    try { effectsBus.publish(Effects.rowWash(dest, RELIC)); } catch {}
    showToast('Enchant: +1 synergy');
    setTimeout(() => clearToast(), 2000);
}

export async function onUltimate({ playerHeroId }) {
    const playerNum = parseInt(playerHeroId[0], 10);
    const relicId = `${playerNum}stoneguard`;
    const existing = window.__ow_getCard?.(relicId);
    const inHand = (window.__ow_getRow?.(`player${playerNum}hand`)?.cardIds || []).includes(relicId);
    if ((existing && existing.health > 0) || inHand) {
        showToast('Stoneguard: Relic already in play');
        setTimeout(() => clearToast(), 2000);
        return;
    }

    try { playAudioByKey('axiom-ultimate'); } catch {}
    window.__ow_addSpecialCardToHand?.(playerNum, 'stoneguard');
    showToast('Stoneguard: Play it this turn or it is lost');
    setTimeout(() => clearToast(), 2000);

    if (isAiOwned(playerHeroId)) {
        await forcePlayStoneguard(playerNum);
    }
}

async function waitForCardInHand(cardId, handRowId, attempts = 12, everyMs = 60) {
    for (let attempt = 0; attempt < attempts; attempt += 1) {
        if ((window.__ow_getRow?.(handRowId)?.cardIds || []).includes(cardId)) return true;
        await new Promise((resolve) => setTimeout(resolve, everyMs));
    }
    return false;
}

async function forcePlayStoneguard(playerNum = 2) {
    const relicId = `${playerNum}stoneguard`;
    if (!await waitForCardInHand(relicId, `player${playerNum}hand`)) return false;
    const rows = allyRowIds(playerNum).map((id) => ({
        id,
        cardIds: window.__ow_getRow?.(id)?.cardIds || [],
    }));
    const slot = pickRandomBoardSlot(rows);
    if (!slot?.rowId) return false;
    const pos = slot.rowId[1] === 'f' ? 'front' : slot.rowId[1] === 'b' ? 'back' : 'middle';
    try {
        return await window.__ow_aiIntegration?.playCard(relicId, pos);
    } catch {
        return false;
    }
}

export default { onDraw, onEnter, onUltimate };
