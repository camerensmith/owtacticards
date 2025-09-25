import { playAudioByKey } from '../../assets/imageImports';
import { showMessage as showToast, clearMessage as clearToast } from '../engine/targetingBus';

// D.Va has no onEnter ability
export function onEnter({ playerHeroId, rowId }) {
    // D.Va has no onEnter ability per hero.json
    return;
}

// Call Mech (2): Place D.Va+MEKA on top of your hand
export async function onUltimate({ playerHeroId, rowId, cost }) {
    const playerNum = parseInt(playerHeroId[0]);

    try {
        playAudioByKey('dva-ultimate');
    } catch {}

    showToast('D.Va: Call Mech - Moving to hand and adding D.Va+MEKA');
    
    try {
        // Move D.Va to hand first (this frees up deployment space)
        window.__ow_returnDvaToHand?.(playerNum);
        
        // Add "Suited Up" effect to D.Va in hand
        const dvaCardId = `${playerNum}dva`;
        window.__ow_appendCardEffect?.(dvaCardId, {
            id: 'suited-up',
            hero: 'dvameka',
            type: 'status',
            sourceCardId: playerHeroId,
            sourceRowId: rowId,
            tooltip: 'Suited Up: D.Va is piloting her MEKA',
            visual: 'overlay'
        });
        
        // Add D.Va+MEKA to hand (special card, ignores hand size limit)
        window.__ow_addSpecialCardToHand?.(playerNum, 'dvameka');
        
        showToast('D.Va suited up! D.Va+MEKA added to hand (this turn only)');
        setTimeout(() => clearToast(), 2000);
        
    } catch (error) {
        console.error('D.Va Call Mech error:', error);
        showToast('D.Va ultimate failed');
        setTimeout(() => clearToast(), 1500);
    }
}

// D.Va has no onDraw ability
export function onDraw({ playerHeroId }) {
    // D.Va has no onDraw ability
    return;
}

export default { onEnter, onUltimate, onDraw };
