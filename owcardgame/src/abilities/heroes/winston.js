import { selectRowTarget } from '../engine/targeting';
import { selectCardTarget } from '../engine/targeting';
import { showMessage as showToast, clearMessage as clearToast } from '../engine/targetingBus';
import { playAudioByKey } from '../../assets/imageImports';
import { dealDamage } from '../engine/damageBus';
import effectsBus, { Effects } from '../engine/effectsBus';

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

export async function onUltimate({ playerHeroId, rowId, cost }) {
    const playerNum = parseInt(playerHeroId[0]);
    
    console.log('Winston Ultimate: Starting Primal Rage for', playerHeroId, 'in row', rowId);
    
    try {
        playAudioByKey('winston-ultimate');
    } catch {}
    
    showToast('Winston: Select row to move to');
    const targetRow = await selectRowTarget({ isBuff: true });
    
    console.log('Winston Ultimate: Target row selected:', targetRow);
    
    if (targetRow) {
        // Validate it's Winston's side
        const targetPlayerNum = parseInt(targetRow.rowId[0]);
        if (targetPlayerNum !== playerNum) {
            showToast('Winston: Can only move to your own rows');
            setTimeout(() => clearToast(), 1500);
            return;
        }
        
        // Move Winston to target row
        window.__ow_moveCardToRow?.(playerHeroId, targetRow.rowId);
        
        // Determine which enemy rows Winston can strike
        const winstonRowPosition = targetRow.rowId[1]; // 'f', 'm', 'b'
        let targetableEnemyRows = [];
        
        console.log('Winston Ultimate: Winston moved to row position', winstonRowPosition, 'player', playerNum);
        
        if (winstonRowPosition === 'f') {
            // Front row can strike middle row
            targetableEnemyRows = [`${playerNum === 1 ? 2 : 1}m`];
        } else if (winstonRowPosition === 'm') {
            // Middle row can strike front OR back row
            targetableEnemyRows = [`${playerNum === 1 ? 2 : 1}f`, `${playerNum === 1 ? 2 : 1}b`];
        } else if (winstonRowPosition === 'b') {
            // Back row can strike middle row
            targetableEnemyRows = [`${playerNum === 1 ? 2 : 1}m`];
        }
        
        console.log('Winston Ultimate: Targetable enemy rows:', targetableEnemyRows);
        
        if (targetableEnemyRows.length === 1) {
            // Only one target row, strike it automatically
            const enemyRowId = targetableEnemyRows[0];
            strikeEnemyRow(enemyRowId, playerHeroId);
        } else {
            // Multiple target rows, let player choose
            showToast('Winston: Select enemy row to strike');
            const strikeTarget = await selectRowTarget({ isDamage: true });
            
            if (strikeTarget && targetableEnemyRows.includes(strikeTarget.rowId)) {
                strikeEnemyRow(strikeTarget.rowId, playerHeroId);
            } else {
                showToast('Winston: Invalid target row');
                setTimeout(() => clearToast(), 1500);
            }
        }
    } else {
        showToast('Winston: Primal Rage cancelled');
        setTimeout(() => clearToast(), 1500);
    }
}

function strikeEnemyRow(enemyRowId, playerHeroId) {
    console.log('Winston Ultimate: Striking enemy row', enemyRowId);
    
    try {
        playAudioByKey('winston-ultimate-resolve');
    } catch {}
    
    // Deal 2 damage to all living enemies in the target row
    const enemyRow = window.__ow_getRow?.(enemyRowId);
    console.log('Winston Ultimate: Enemy row data:', enemyRow);
    
    if (enemyRow && enemyRow.cardIds) {
        let enemiesStruck = 0;
        
        console.log('Winston Ultimate: Processing', enemyRow.cardIds.length, 'cards in row');
        
        enemyRow.cardIds.forEach(cardId => {
            const card = window.__ow_getCard?.(cardId);
            console.log('Winston Ultimate: Checking card', cardId, 'health:', card?.health);
            
            if (card && card.health > 0) {
                console.log('Winston Ultimate: Dealing 2 damage to', cardId);
                dealDamage(cardId, enemyRowId, 2, false, playerHeroId);
                effectsBus.publish(Effects.showDamage(cardId, 2));
                enemiesStruck++;
            }
        });
        
        console.log('Winston Ultimate: Struck', enemiesStruck, 'enemies');
        showToast(`Winston: Primal Rage struck ${enemiesStruck} enemies!`);
        setTimeout(() => clearToast(), 2000);
    } else {
        console.log('Winston Ultimate: No enemy row found or no cards in row');
    }
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
