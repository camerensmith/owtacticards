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

    // For AI, automatically execute Call Mech
    if (window.__ow_aiTriggering || window.__ow_isAITurn) {
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
            
            console.log('D.Va AI: Call Mech executed - D.Va+MEKA added to hand');
            showToast('D.Va AI: Call Mech - D.Va+MEKA added to hand');
            setTimeout(() => clearToast(), 2000);
            
            // FORCE PLAY MEKA immediately after adding to hand
            console.log('D.Va AI: MEKA added - forcing immediate play');
            setTimeout(async () => {
                const handRow = window.__ow_getRow?.('player2hand');
                const handIds = handRow?.cardIds || [];
                const mekaCardId = '2dvameka';
                
                if (handIds.includes(mekaCardId)) {
                    console.log('D.Va AI: MEKA found in hand - MANDATORY play to front row');
                    try {
                        // Find best row for MEKA (prefer front for tanking, then middle, then back)
                        const rowCounts = {
                            front: window.__ow_getRow?.('2f')?.cardIds?.length || 0,
                            middle: window.__ow_getRow?.('2m')?.cardIds?.length || 0,
                            back: window.__ow_getRow?.('2b')?.cardIds?.length || 0
                        };
                        
                        let targetRow;
                        if (rowCounts.front < 4) targetRow = 'front';
                        else if (rowCounts.middle < 4) targetRow = 'middle';
                        else if (rowCounts.back < 4) targetRow = 'back';
                        else {
                            console.warn('D.Va AI: All rows full, cannot play MEKA');
                            return;
                        }
                        
                        // Force play MEKA
                        if (window.__ow_aiIntegration?.playCard) {
                            await window.__ow_aiIntegration.playCard(mekaCardId, targetRow);
                            console.log(`D.Va AI: Successfully force-played MEKA to ${targetRow} row`);
                        }
                    } catch (error) {
                        console.error('D.Va AI: Failed to force-play MEKA:', error);
                    }
                } else {
                    console.warn('D.Va AI: MEKA not found in hand after timeout');
                }
            }, 300);
            
            return;
        } catch (error) {
            console.error('D.Va AI Call Mech error:', error);
            showToast('D.Va AI ultimate failed');
            setTimeout(() => clearToast(), 1500);
            return;
        }
    }

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
