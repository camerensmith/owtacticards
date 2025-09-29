import { selectCardTarget } from '../engine/targeting';
import { dealDamage } from '../engine/damageBus';
import { showMessage as showToast, clearMessage as clearToast } from '../engine/targetingBus';
import { playAudioByKey } from '../../assets/imageImports';
import effectsBus, { Effects } from '../engine/effectsBus';

// Chain Hook - Move target enemy to front row and deal 2 damage
export async function onEnter({ playerHeroId, rowId }) {
    const playerNum = parseInt(playerHeroId[0]);
    
    // Play enter sound
    try {
        playAudioByKey('roadhog-enter');
    } catch {}
    
    showToast('Roadhog: Select target enemy');
    
    try {
        const target = await selectCardTarget();
        if (!target) {
            clearToast();
            return;
        }
        
        clearToast();
        
        // Check if target is turret (immobile)
        const targetCard = window.__ow_getCard?.(target.cardId);
        if (targetCard && targetCard.id === 'turret') {
            showToast('Roadhog: Cannot hook turret - it is immobile');
            setTimeout(() => clearToast(), 2000);
            return;
        }
        
        // Determine destination row (front -> middle -> back)
        const targetPlayerNum = parseInt(target.rowId[0]);
        const enemyPlayer = targetPlayerNum;
        const frontRow = `${enemyPlayer}f`;
        const middleRow = `${enemyPlayer}m`;
        const backRow = `${enemyPlayer}b`;
        
        let destinationRow = frontRow;
        
        // Check if front row is full
        if (window.__ow_isRowFull?.(frontRow)) {
            // Check if middle row is full
            if (window.__ow_isRowFull?.(middleRow)) {
                // Check if back row is full
                if (window.__ow_isRowFull?.(backRow)) {
                    // All rows full, just deal damage
                    destinationRow = null;
                } else {
                    destinationRow = backRow;
                }
            } else {
                destinationRow = middleRow;
            }
        }
        
        // Move target if possible
        if (destinationRow && destinationRow !== target.rowId) {
            window.__ow_moveCardToRow?.(target.cardId, destinationRow);
            
            // Show chain hook visual effect
            if (window.effectsBus) {
                window.effectsBus.publish({
                    type: 'fx:chainHook',
                    sourceCardId: playerHeroId,
                    targetCardId: target.cardId,
                    duration: 1000
                });
            }
        }
        
        // Deal damage (only to living heroes)
        if (targetCard && targetCard.health > 0) {
            dealDamage(target.cardId, destinationRow || target.rowId, 2, false, playerHeroId);
            try { effectsBus.publish(Effects.showDamage(target.cardId, 2)); } catch {}
        }
        
        // Play ability sound
        try {
            playAudioByKey('roadhog-ability1');
        } catch {}
        
    } catch (error) {
        console.log('Roadhog Chain Hook error:', error);
        clearToast();
    }
}

// Whole Hog - Deal random damage to all enemies over 4 seconds
export async function onUltimate({ playerHeroId, rowId, cost }) {
    const playerNum = parseInt(playerHeroId[0]);
    
    // Play ultimate sound
    try {
        playAudioByKey('roadhog-ultimate');
    } catch {}
    
    // Get all living enemies
    const enemyPlayer = playerNum === 1 ? 2 : 1;
    const enemyRows = [`${enemyPlayer}f`, `${enemyPlayer}m`, `${enemyPlayer}b`];
    const livingEnemies = [];
    
    for (const rowId of enemyRows) {
        const row = window.__ow_getRow?.(rowId);
        if (row && row.cardIds) {
            for (const cardId of row.cardIds) {
                const card = window.__ow_getCard?.(cardId);
                if (card && card.health > 0) {
                    livingEnemies.push({ cardId, rowId });
                }
            }
        }
    }
    
    // Check if there are any enemies
    if (livingEnemies.length === 0) {
        showToast('Roadhog: No enemies to damage');
        setTimeout(() => clearToast(), 2000);
        return;
    }
    
    // Calculate total damage (2 per enemy)
    const totalDamage = livingEnemies.length * 2;
    console.log(`Roadhog Whole Hog: ${livingEnemies.length} enemies, total damage: ${totalDamage}`);
    
    // Distribute damage randomly over 4 seconds
    const damageInstances = [];
    for (let i = 0; i < totalDamage; i++) {
        const randomEnemy = livingEnemies[Math.floor(Math.random() * livingEnemies.length)];
        damageInstances.push(randomEnemy);
    }
    console.log(`Roadhog Whole Hog: Damage instances:`, damageInstances.map(d => d.cardId));
    
    // Shuffle the damage instances for more randomness
    for (let i = damageInstances.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [damageInstances[i], damageInstances[j]] = [damageInstances[j], damageInstances[i]];
    }
    
    // Apply damage over 4 seconds
    const damageInterval = 4000 / totalDamage; // Spread over 4 seconds
    
    damageInstances.forEach((enemy, index) => {
        setTimeout(() => {
            // Check if enemy is still alive
            const currentCard = window.__ow_getCard?.(enemy.cardId);
            if (currentCard && currentCard.health > 0) {
                dealDamage(enemy.cardId, enemy.rowId, 1, false, playerHeroId);
                
                // Show floating damage text
                effectsBus.publish(Effects.showDamage(enemy.cardId, 1));
            }
        }, index * damageInterval);
    });
    
    // Ultimate damage sequence completes after 4 seconds
    // No additional resolve sound needed
}

export default { onEnter, onUltimate };
