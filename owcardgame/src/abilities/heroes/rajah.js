import effectsBus, { Effects } from '../engine/effectsBus';
import { playAudioByKey } from '../../assets/imageImports';
import { showMessage as showToast, clearMessage as clearToast } from '../engine/targetingBus';
import { allyRowIds, pickRandomBoardSlot } from '../../game/rosterRules';
import { popMirage } from './mirage';

export async function onEnter({ playerHeroId }) {
    try { playAudioByKey('rajah-ability1'); } catch {}
    const playerNum = parseInt(playerHeroId[0], 10);
    const slot = pickRandomBoardSlot(allyRowIds(playerNum).map((id) => ({
        id,
        cardIds: window.__ow_getRow?.(id)?.cardIds || [],
    })));
    if (!slot) {
        showToast('Mirage: No space for an illusion');
        setTimeout(() => clearToast(), 2000);
        return;
    }
    const mirageId = `${playerNum}mirage`;
    window.__ow_dispatchAction?.({
        type: 'create-card',
        payload: {
            playerNum,
            heroId: 'mirage',
            rowId: slot.rowId,
            insertIndex: slot.insertIndex,
            enteredTurn: window.__ow_getTurnCount?.() || 0,
        },
    });
    // One cloud over the pair, published as a single event so both puff on the
    // same frame. Watching which card settled first must not give the illusion
    // away, so the smoke has to cover the arrival of both.
    try { effectsBus.publish(Effects.smoke([playerHeroId, mirageId])); } catch {}
    showToast('Mirage');
    setTimeout(() => clearToast(), 2000);
}

export async function onUltimate() {
    try { playAudioByKey('rajah-ultimate'); } catch {}
    const ownerPlayerNum = window.__ow_getPlayerTurn?.() || 1;
    const armedOnTurn = window.__ow_getTurnCount?.() || 0;
    window.__ow_setSandstorm?.({ ownerPlayerNum, armedOnTurn });
    try { effectsBus.publish(Effects.sideWash(1, 0xc2b280)); } catch {}
    try { effectsBus.publish(Effects.sideWash(2, 0xc2b280)); } catch {}
    showToast('Sandstorm: targeting disabled');
    setTimeout(() => clearToast(), 2000);
}

/**
 * The illusion is Rajah's, and nothing holds it up once he is gone.
 *
 * It reads as a 3-health hero and is destroyed by any direct targeting, damage
 * or not — but its own health was never what kept it on the board.
 */
export function onDeath({ playerHeroId }) {
    const playerNum = parseInt(playerHeroId[0], 10);
    // Rajah is named as the source on purpose. Disorient is the penalty for
    // picking the illusion, and nobody picked it here — naming an owner-side
    // card is what stops it landing. Left blank, `popMirage` would fall back to
    // whichever ability happened to be resolving, and disorient whoever killed
    // him.
    popMirage({ mirageId: `${playerNum}mirage`, sourceCardId: playerHeroId });
}

export default { onEnter, onUltimate, onDeath };
