import { dealDamage } from '../engine/damageBus';
import { showMessage as showToast, clearMessage as clearToast } from '../engine/targetingBus';
import { selectCardTarget } from '../engine/targeting';
import { showOnEnterChoice } from '../engine/modalController';
import { playAudioByKey } from '../../assets/imageImports';
import effectsBus, { Effects } from '../engine/effectsBus';

// Tracer Ultimate System - Avoid Fatal Damage
let tracerUltimateUsed = false;
let tracerHpBeforeDamage = 0;

// Expose Tracer Ultimate function to window for damage bus
window.__ow_triggerTracerUltimate = triggerTracerUltimate;

// Trigger Tracer Ultimate (avoid fatal damage)
function triggerTracerUltimate(cardId, rowId, hpBeforeDamage) {
    if (tracerUltimateUsed) return; // Already used this game
    
    tracerUltimateUsed = true;
    tracerHpBeforeDamage = hpBeforeDamage;
    
    console.log(`Tracer Ultimate: Avoiding fatal damage for ${cardId}, restoring HP to ${hpBeforeDamage}`);
    
    // Play ultimate audio
    try {
        playAudioByKey('tracer-ultimate');
    } catch {}
    
    // Remove all effects from Tracer (like a revive)
    const card = window.__ow_getCard?.(cardId);
    if (card && Array.isArray(card.effects)) {
        const effectsToRemove = card.effects.map(effect => effect.id);
        effectsToRemove.forEach(effectId => {
            window.__ow_removeCardEffect?.(cardId, effectId);
        });
        console.log(`Tracer Ultimate: Removed ${effectsToRemove.length} effects from ${cardId}`);
    }
    
    // Restore HP to what it was before the fatal damage
    window.__ow_setCardHealth?.(cardId, hpBeforeDamage);
    
    // Consume synergy for ultimate (cost 2)
    window.__ow_updateSynergy?.(rowId, -2);
    console.log(`Tracer Ultimate: Consumed 2 synergy from ${rowId}`);
    
    // Mark ultimate as used
    window.__ow_dispatchAction?.({
        type: 'MARK_ULTIMATE_USED',
        payload: {
            playerNum: parseInt(cardId[0]),
            heroId: 'tracer'
        }
    });
    console.log(`Tracer Ultimate: Marked ultimate as used for ${cardId}`);
    
    // Show ultimate effect
    effectsBus.publish(Effects.showDamage(cardId, 0, 'AVOIDED!'));
    
    showToast(`Tracer: AVOIDED! HP restored to ${hpBeforeDamage}`);
    setTimeout(() => clearToast(), 2000);
}

// Pulse Pistols - Single Target
export async function onEnter1({ playerHeroId, rowId }) {
    const playerNum = parseInt(playerHeroId[0]);
    
    // Play ability sound on selection
    try {
        playAudioByKey('tracer-ability1');
    } catch {}
    
    showToast('Tracer: Select target enemy for Pulse Pistols');
    
    const target = await selectCardTarget();
    if (!target) {
        clearToast();
        return;
    }
    
    const targetCard = window.__ow_getCard?.(target.cardId);
    const targetPlayer = parseInt(target.cardId[0]);
    const isEnemy = targetPlayer !== playerNum;
    
    // Validate target (enemy, alive)
    if (!isEnemy || !targetCard || targetCard.health <= 0) {
        showToast('Tracer: Invalid target (must be living enemy)');
        setTimeout(() => clearToast(), 1500);
        return;
    }
    
    // Deal 2 damage
    dealDamage(target.cardId, target.rowId, 2, false, playerHeroId);
    effectsBus.publish(Effects.showDamage(target.cardId, 2));
    
    // Play ability resolve sound on damage
    try {
        playAudioByKey('tracer-ability1-resolve');
    } catch {}
    
    clearToast();
}

// Pulse Pistols - Dual Target
export async function onEnter2({ playerHeroId, rowId }) {
    const playerNum = parseInt(playerHeroId[0]);
    
    // Play ability sound on selection
    try {
        playAudioByKey('tracer-ability2');
    } catch {}
    
    showToast('Tracer: Select first target enemy');
    
    const target1 = await selectCardTarget();
    if (!target1) {
        clearToast();
        return;
    }
    
    const target1Card = window.__ow_getCard?.(target1.cardId);
    const target1Player = parseInt(target1.cardId[0]);
    const isEnemy1 = target1Player !== playerNum;
    
    // Validate first target
    if (!isEnemy1 || !target1Card || target1Card.health <= 0) {
        showToast('Tracer: Invalid first target (must be living enemy)');
        setTimeout(() => clearToast(), 1500);
        return;
    }
    
    showToast('Tracer: Select second target enemy (must be different)');
    
    const target2 = await selectCardTarget();
    if (!target2) {
        clearToast();
        return;
    }
    
    const target2Card = window.__ow_getCard?.(target2.cardId);
    const target2Player = parseInt(target2.cardId[0]);
    const isEnemy2 = target2Player !== playerNum;
    
    // Validate second target
    if (!isEnemy2 || !target2Card || target2Card.health <= 0) {
        showToast('Tracer: Invalid second target (must be living enemy)');
        setTimeout(() => clearToast(), 1500);
        return;
    }
    
    // Check if targets are different
    if (target1.cardId === target2.cardId) {
        showToast('Tracer: Cannot target the same enemy twice');
        setTimeout(() => clearToast(), 1500);
        return;
    }
    
    // Deal 1 damage to each target
    dealDamage(target1.cardId, target1.rowId, 1, false, playerHeroId);
    effectsBus.publish(Effects.showDamage(target1.cardId, 1));
    
    dealDamage(target2.cardId, target2.rowId, 1, false, playerHeroId);
    effectsBus.publish(Effects.showDamage(target2.cardId, 1));
    
    // Play ability resolve sound on damage
    try {
        playAudioByKey('tracer-ability2-resolve');
    } catch {}
    
    clearToast();
}

// Main onEnter function with modal choice
export function onEnter({ playerHeroId, rowId }) {
    const playerNum = parseInt(playerHeroId[0]);
    
    // Play enter sound
    try {
        playAudioByKey('tracer-enter');
    } catch {}
    
    const opt1 = { 
        name: 'Pulse Pistols (Single)', 
        description: 'Deal 2 damage to target enemy' 
    };
    const opt2 = { 
        name: 'Pulse Pistols (Dual)', 
        description: 'Deal 1 damage to two different enemies anywhere on the board' 
    };

    showOnEnterChoice('Tracer', opt1, opt2, async (choiceIndex) => {
        if (choiceIndex === 0) {
            await onEnter1({ playerHeroId, rowId });
        } else {
            await onEnter2({ playerHeroId, rowId });
        }
    });
}

// Manual Ultimate (Cost 2) - Not used in new system
export function onUltimate({ playerHeroId, rowId, cost }) {
    showToast('Tracer: Ultimate is automatic - activates when taking fatal damage');
    setTimeout(() => clearToast(), 2000);
}

// Cleanup when Tracer dies
export function onDeath({ playerHeroId, rowId }) {
    // Reset ultimate system if this Tracer dies
    if (tracerUltimateUsed) {
        tracerUltimateUsed = false;
        tracerHpBeforeDamage = 0;
        console.log('Tracer Ultimate: System reset due to death');
    }
}

export default { onEnter, onUltimate, onDeath };