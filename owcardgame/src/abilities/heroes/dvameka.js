import { playAudioByKey } from '../../assets/imageImports';
import { showMessage as showToast, clearMessage as clearToast } from '../engine/targetingBus';
import { dealDamage } from '../engine/damageBus';
import effectsBus from '../engine/effectsBus';
import { Effects } from '../engine/effectsBus';

// Defense Matrix — D.Va+MEKA gains 2 Shields if placed in the Front Row, or 1 Shield if placed in the Middle or Back
export function onEnter({ playerHeroId, rowId }) {
    const playerNum = parseInt(playerHeroId[0]);
    
    try {
        playAudioByKey('dvameka-enter');
    } catch {}

    // Determine shield amount based on row position
    const rowPosition = rowId[1]; // f, m, or b
    const shieldAmount = rowPosition === 'f' ? 2 : 1; // Front = 2, Middle/Back = 1
    
    // Apply shields
    const currentShield = window.__ow_getCard?.(playerHeroId)?.shield || 0;
    const newShield = Math.min(currentShield + shieldAmount, 3); // Max 3 shields
    window.__ow_dispatchShieldUpdate?.(playerHeroId, newShield);
    
    showToast(`D.Va+MEKA: Defense Matrix - ${shieldAmount} shields gained!`);
    setTimeout(() => clearToast(), 2000);
}

// Self Destruct (3): Deal 4 damage to all opponents AND allies in D.Va+MEKA's row and the opposing row. Replace D.Va+MEKA with D.Va, and remove D.Va+MEKA from the game.
export async function onUltimate({ playerHeroId, rowId, cost }) {
    const playerNum = parseInt(playerHeroId[0]);

    try {
        playAudioByKey('dvameka-ultimate');
    } catch {}

    showToast('D.Va+MEKA: Self Destruct - Preparing to explode!');
    
    try {
        // Determine opposing row
        const enemyPlayer = playerNum === 1 ? 2 : 1;
        const currentRowPos = rowId[1]; // f, m, or b
        const opposingRowId = `${enemyPlayer}${currentRowPos}`;
        
        // Deal 4 damage to all units in both rows (respects shields)
        const currentRowCards = window.__ow_getRow?.(rowId)?.cardIds || [];
        const opposingRowCards = window.__ow_getRow?.(opposingRowId)?.cardIds || [];
        
        // Damage all cards in current row (including D.Va+MEKA)
        for (const cardId of currentRowCards) {
            dealDamage(cardId, rowId, 4);
            effectsBus.publish(Effects.showDamage(cardId, 4));
        }
        
        // Damage all cards in opposing row
        for (const cardId of opposingRowCards) {
            dealDamage(cardId, opposingRowId, 4);
            effectsBus.publish(Effects.showDamage(cardId, 4));
        }
        
        // Play explosion sound after damage
        try {
            playAudioByKey('dvameka-explosion');
        } catch {}
        
        // Replace D.Va+MEKA with D.Va in the same row slot
        // (suited-up effect removal is handled in REPLACE_WITH_DVA action)
        window.__ow_replaceWithDva?.(playerHeroId, rowId, playerNum);
        
        showToast('D.Va+MEKA: Self Destruct complete - D.Va ejected!');
        setTimeout(() => clearToast(), 2000);
        
    } catch (error) {
        console.error('D.Va+MEKA Self Destruct error:', error);
        showToast('D.Va+MEKA ultimate failed');
        setTimeout(() => clearToast(), 1500);
    }
}

// D.Va+MEKA has no onDraw ability
export function onDraw({ playerHeroId }) {
    return;
}

// When D.Va+MEKA dies, replace with D.Va
export function onDeath({ playerHeroId, rowId }) {
    const playerNum = parseInt(playerHeroId[0]);
    
    try {
        // Replace D.Va+MEKA with D.Va in the same row slot
        // (suited-up effect removal is handled in REPLACE_WITH_DVA action)
        window.__ow_replaceWithDva?.(playerHeroId, rowId, playerNum);
        
        showToast('D.Va+MEKA destroyed - D.Va ejected!');
        setTimeout(() => clearToast(), 2000);
        
    } catch (error) {
        console.error('D.Va+MEKA death replacement error:', error);
    }
}

export default { onEnter, onUltimate, onDraw, onDeath };
