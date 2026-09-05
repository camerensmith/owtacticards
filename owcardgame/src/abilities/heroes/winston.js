import { showMessage as showToast, clearMessage as clearToast } from '../engine/targetingBus';
import { playAudioByKey } from '../../assets/imageImports';
import { dealDamage } from '../engine/damageBus';
import effectsBus, { Effects } from '../engine/effectsBus';
import { planPrimalRage } from '../../game/rosterRules';

export function onEnter({ playerHeroId, rowId }) {
    const playerNum = parseInt(playerHeroId[0]);
    
    try {
        playAudioByKey('winston-enter');
    } catch {}
    
    // Winston gets 3 shield tokens when deployed
    window.__ow_dispatchShieldUpdate?.(playerHeroId, 3);
    
    // Add barrier toggle effect to Winston
    window.__ow_appendCardEffect?.(playerHeroId, {
        id: 'barrier-protector',
        hero: 'winston',
        type: 'barrier',
        active: false, // Toggle starts as inactive
        sourceCardId: playerHeroId,
        sourceRowId: rowId,
        tooltip: 'Barrier Protector: Toggle to absorb damage for heroes in Winston\'s row',
        visual: 'winston-barrier'
    });
    
    showToast('Winston: Barrier Protector active - 3 shield tokens gained');
    setTimeout(() => clearToast(), 2000);
}

export async function onUltimate({ playerHeroId, rowId }) {
    const playerNum = parseInt(playerHeroId[0], 10);
    const enemyPlayer = playerNum === 1 ? 2 : 1;
    const friendlyRowIds = [`${playerNum}f`, `${playerNum}m`, `${playerNum}b`];
    const enemyRowIds = [`${enemyPlayer}f`, `${enemyPlayer}m`, `${enemyPlayer}b`];

    try { playAudioByKey('winston-ultimate'); } catch {}

    const occupancy = {};
    const enemies = [];
    [...friendlyRowIds, ...enemyRowIds].forEach((rid) => {
        const ids = window.__ow_getRow?.(rid)?.cardIds || [];
        occupancy[rid] = ids.length;
        if (!enemyRowIds.includes(rid)) return;
        ids.forEach((cardId) => {
            const card = window.__ow_getCard?.(cardId);
            if (card && card.health > 0) enemies.push({ cardId, rowId: rid, health: card.health });
        });
    });

    const plan = planPrimalRage({
        winstonRowId: rowId,
        friendlyRowIds,
        enemyRowIds,
        enemies,
        occupancy,
    });

    if (plan.leapRowId && plan.leapRowId !== rowId) {
        window.__ow_moveCardToRow?.(playerHeroId, plan.leapRowId);
    }

    try { playAudioByKey('winston-ultimate-resolve'); } catch {}
    try { effectsBus.publish(Effects.primalRage(playerHeroId, plan.leapRowId)); } catch {}

    const shuffledIds = [];
    plan.shuffles.forEach((shuffle) => {
        if (shuffle.destRowId !== shuffle.fromRowId) {
            window.__ow_moveCardToRow?.(shuffle.cardId, shuffle.destRowId);
            try { effectsBus.publish(Effects.push(shuffle.cardId, shuffle.fromRowId, shuffle.destRowId)); } catch {}
        }
        dealDamage(shuffle.cardId, shuffle.destRowId, shuffle.damage, false, playerHeroId, false, { skipProjectileFx: true });
        try { effectsBus.publish(Effects.showDamage(shuffle.cardId, shuffle.damage)); } catch {}
        shuffledIds.push(shuffle.cardId);
    });

    try { effectsBus.publish(Effects.tectonic(shuffledIds)); } catch {}
    showToast(`Winston: Primal Rage shuffled ${plan.shuffles.length} ${plan.shuffles.length === 1 ? 'enemy' : 'enemies'}`);
    setTimeout(() => clearToast(), 2000);
}

// Toggle function for Barrier Protector
export function toggleBarrierProtector(playerHeroId) {
    const card = window.__ow_getCard?.(playerHeroId);
    if (!card || !Array.isArray(card.effects)) return;
    
    const barrierEffect = card.effects.find(effect => 
        effect?.id === 'barrier-protector' && effect?.type === 'barrier'
    );
    
    if (barrierEffect) {
        // Toggle the barrier
        const newActive = !barrierEffect.active;
        
        // Update the effect
        window.__ow_removeCardEffect?.(playerHeroId, 'barrier-protector');
        window.__ow_appendCardEffect?.(playerHeroId, {
            ...barrierEffect,
            active: newActive,
            tooltip: newActive ? 
                'Barrier Protector: ACTIVE - Absorbing damage for heroes in Winston\'s row' :
                'Barrier Protector: INACTIVE - Click to activate'
        });
        
        // Play toggle sound
        try {
            playAudioByKey('winston-ability1-toggle');
        } catch {}
        
        showToast(`Winston: Barrier Protector ${newActive ? 'ACTIVATED' : 'DEACTIVATED'}`);
        setTimeout(() => clearToast(), 1500);
    }
}

export default { onEnter, onUltimate, toggleBarrierProtector };
