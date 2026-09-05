import { playAudioByKey } from '../../assets/imageImports';
import { MEKA } from '../../presentation/pixi/fxConfig';

import { showMessage as showToast, clearMessage as clearToast } from '../engine/targetingBus';
import { dealDamage } from '../engine/damageBus';
import effectsBus from '../engine/effectsBus';
import { Effects } from '../engine/effectsBus';
import { selfDestructTargets } from '../../game/abilityRules';

/** Angry red core while the MEKA spools up. */
const MEKA_CORE = 0xff5c3d;

function waitMs(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}


// Defense Matrix — D.Va+MEKA gains 2 Shields if placed in the Front Row, or 1 Shield if placed in the Middle or Back
export function onEnter({ playerHeroId, rowId }) {
    const playerNum = parseInt(playerHeroId[0]);
    
    try {
        playAudioByKey('dvameka-enter');
    } catch {}

    // Determine shield amount based on row position
    const rowPosition = rowId[1]; // f, m, or b
    const shieldAmount = rowPosition === 'f' ? 2 : 1; // Front = 2, Middle/Back = 1

    // Matrix panels unfold as the shields come up.
    try { effectsBus.publish(Effects.matrix(playerHeroId)); } catch {}
    
    // Apply shields
    const currentShield = window.__ow_getCard?.(playerHeroId)?.shield || 0;
    const newShield = Math.min(currentShield + shieldAmount, 3); // Max 3 shields
    window.__ow_dispatchShieldUpdate?.(playerHeroId, newShield);
    
    showToast(`D.Va+MEKA: Defense Matrix - ${shieldAmount} shields gained!`);
    setTimeout(() => clearToast(), 2000);
}

// Self Destruct (3): Deal 4 damage to all opponents AND Allies. D.Va still ejects into the same row.
export async function onUltimate({ playerHeroId, rowId, cost }) {
    const playerNum = parseInt(playerHeroId[0]);

    try {
        playAudioByKey('dvameka-ultimate');
    } catch {}

    showToast('D.Va+MEKA: Self Destruct - Preparing to explode!');

    try {
        // Spool the core, then detonate. Damage waits for the blast so the
        // charge-up is a real warning rather than decoration.
        try { effectsBus.publish(Effects.chargeStart(playerHeroId, MEKA_CORE)); } catch {}
        await waitMs(MEKA.chargeMs);
        try { effectsBus.publish(Effects.chargeStop(playerHeroId)); } catch {}
        try { effectsBus.publish(Effects.shockwave(playerHeroId)); } catch {}

        const targets = selfDestructTargets(window.__ow_getRow, window.__ow_getCard);
        for (const target of targets) {
            dealDamage(target.cardId, target.rowId, 4, false, playerHeroId, false, { skipProjectileFx: true });
            effectsBus.publish(Effects.showDamage(target.cardId, 4));
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
    } finally {
        // A throw during the 1.8s wind-up must not leave the core charging.
        try { effectsBus.publish(Effects.chargeStop(playerHeroId)); } catch {}
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
