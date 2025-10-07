import { showOnEnterChoice } from '../engine/modalController';
import { selectCardTarget } from '../engine/targeting';
import { showMessage as showToast, clearMessage as clearToast } from '../engine/targetingBus';
import { dealDamage } from '../engine/damageBus';
import { getAudioFile } from '../../assets/imageImports';
import { withAIContext } from '../engine/aiContextHelper';

// Helper function to play audio by key
function playAudioByKey(audioKey) {
    try {
        const audioFile = getAudioFile(audioKey);
        if (audioFile) {
            const audio = new Audio(audioFile);
            audio.play().catch(err => console.log('Audio play failed:', err));
        }
    } catch (error) {
        console.error(`Failed to play audio ${audioKey}:`, error);
    }
}

// On Enter - Repair Pack: Heal target ally by 3, excess becomes shields
export async function onEnter({ playerHeroId, rowId }) {
    const playerNum = parseInt(playerHeroId[0]);
    
    // Play enter sound
    try {
        playAudioByKey('brigitte-enter');
    } catch {}
    
    // For AI, automatically select a random ally hero
    if (window.__ow_aiTriggering || window.__ow_isAITurn) {
        const allyRows = [`${playerNum}f`, `${playerNum}m`, `${playerNum}b`];
        
        // Find all living ally heroes (excluding Brigitte herself)
        const livingAllies = [];
        for (const allyRowId of allyRows) {
            const row = window.__ow_getRow?.(allyRowId);
            if (row && row.cardIds) {
                for (const cardId of row.cardIds) {
                    if (cardId === playerHeroId) continue; // Skip Brigitte herself
                    const card = window.__ow_getCard?.(cardId);
                    if (card && card.health > 0) {
                        livingAllies.push({ cardId, rowId: allyRowId });
                    }
                }
            }
        }
        
        // If no other allies, heal Brigitte herself
        let targetAlly;
        if (livingAllies.length === 0) {
            targetAlly = { cardId: playerHeroId, rowId: rowId };
            console.log('Brigitte AI: No other allies, healing herself');
        } else {
            // Select random ally
            targetAlly = livingAllies[Math.floor(Math.random() * livingAllies.length)];
            console.log('Brigitte AI: Selected random ally:', targetAlly.cardId);
        }
        
        // Heal the target
        const currentHealth = window.__ow_getCard?.(targetAlly.cardId)?.health || 0;
        const maxHealth = window.__ow_getMaxHealth?.(targetAlly.cardId) || 3;
        const currentShield = window.__ow_getCard?.(targetAlly.cardId)?.shield || 0;
        
        let healingAmount = 3;
        let healthToHeal = Math.min(healingAmount, maxHealth - currentHealth);
        let shieldToAdd = Math.max(0, healingAmount - healthToHeal);
        
        // Apply health healing (Brigitte's Repair Pack can heal turrets up to max HP)
        if (healthToHeal > 0) {
            window.__ow_setCardHealth?.(targetAlly.cardId, currentHealth + healthToHeal);
        }
        
        // Apply shield (max 3 unless it's Wrecking Ball)
        if (shieldToAdd > 0) {
            const heroId = targetAlly.cardId.slice(1);
            const maxShield = heroId === 'wreckingball' ? 999 : 3; // Wrecking Ball exception
            const newShield = Math.min(currentShield + shieldToAdd, maxShield);
            
            // Update shield via dispatch
            window.__ow_dispatchShieldUpdate?.(targetAlly.cardId, newShield);
        }
        
        // Play audio after healing is applied
        try {
            playAudioByKey('brigitte-ability1');
        } catch {}
        
        // Play armor sound if shields were added
        if (shieldToAdd > 0) {
            try {
                playAudioByKey('brigitte-armor');
            } catch {}
        }
        
        showToast(`Brigitte AI: Healed ${healthToHeal} HP${shieldToAdd > 0 ? `, added ${shieldToAdd} shields` : ''}`);
        setTimeout(() => clearToast(), 2000);
        return;
    }
    
    showToast('Brigitte: Select ally to heal');

    try {
        const target = await selectCardTarget();
        if (target) {
            // Validate target is an ally
            const targetPlayerNum = parseInt(target.cardId[0]);
            if (targetPlayerNum !== playerNum) {
                showToast('Brigitte: Must target an ally!');
                setTimeout(() => clearToast(), 2000);
                return;
            }

            // Heal the target
            const currentHealth = window.__ow_getCard?.(target.cardId)?.health || 0;
            const maxHealth = window.__ow_getMaxHealth?.(target.cardId) || 3;
            const currentShield = window.__ow_getCard?.(target.cardId)?.shield || 0;
            
            let healingAmount = 3;
            let healthToHeal = Math.min(healingAmount, maxHealth - currentHealth);
            let shieldToAdd = Math.max(0, healingAmount - healthToHeal);
            
            // Apply health healing (Brigitte's Repair Pack can heal turrets up to max HP)
            if (healthToHeal > 0) {
                window.__ow_setCardHealth?.(target.cardId, currentHealth + healthToHeal);
            }
            
            // Apply shield (max 3 unless it's Wrecking Ball)
            if (shieldToAdd > 0) {
                const heroId = target.cardId.slice(1);
                const maxShield = heroId === 'wreckingball' ? 999 : 3; // Wrecking Ball exception
                const newShield = Math.min(currentShield + shieldToAdd, maxShield);
                
                // Update shield via dispatch
                window.__ow_dispatchShieldUpdate?.(target.cardId, newShield);
            }
            
            // Play audio after healing is applied
            try {
                playAudioByKey('brigitte-ability1');
            } catch {}
            
            // Play armor sound if shields were added
            if (shieldToAdd > 0) {
                try {
                    playAudioByKey('brigitte-armor');
                } catch {}
            }
            
            showToast(`Brigitte: Healed ${healthToHeal} HP${shieldToAdd > 0 ? `, added ${shieldToAdd} shields` : ''}`);
            setTimeout(() => clearToast(), 2000);
        } else {
            showToast('Brigitte ability cancelled');
            setTimeout(() => clearToast(), 1500);
        }
    } catch (error) {
        console.error('Brigitte onEnter error:', error);
        showToast('Brigitte ability cancelled');
        setTimeout(() => clearToast(), 1500);
    }
}

// Ultimate - Shield Bash (3): Gain 2 shields, turn target enemy 180°, lock their ultimate
export async function onUltimate({ playerHeroId, rowId, cost }) {
    const playerNum = parseInt(playerHeroId[0]);
    
    // Play ultimate start sound
    try {
        playAudioByKey('brigitte-ultimate');
    } catch {}
    
    // For AI, automatically select a random enemy hero
    if (window.__ow_aiTriggering || window.__ow_isAITurn) {
        const enemyPlayer = playerNum === 1 ? 2 : 1;
        const enemyRows = [`${enemyPlayer}f`, `${enemyPlayer}m`, `${enemyPlayer}b`];
        
        // Find all living enemy heroes
        const livingEnemies = [];
        for (const enemyRowId of enemyRows) {
            const row = window.__ow_getRow?.(enemyRowId);
            if (row && row.cardIds) {
                for (const cardId of row.cardIds) {
                    const card = window.__ow_getCard?.(cardId);
                    if (card && card.health > 0) {
                        livingEnemies.push({ cardId, rowId: enemyRowId });
                    }
                }
            }
        }
        
        if (livingEnemies.length === 0) {
            showToast('Brigitte AI: No enemies to target');
            setTimeout(() => clearToast(), 2000);
            return;
        }
        
        // Select random enemy
        const randomEnemy = livingEnemies[Math.floor(Math.random() * livingEnemies.length)];
        console.log('Brigitte AI Ultimate: Selected random enemy:', randomEnemy.cardId);
        
        // Give Brigitte 2 shields
        const currentShield = window.__ow_getCard?.(playerHeroId)?.shield || 0;
        const newShield = Math.min(currentShield + 2, 3); // Max 3 shields
        window.__ow_dispatchShieldUpdate?.(playerHeroId, newShield);
        
        // Apply Shield Bash effect to target
        window.__ow_appendCardEffect?.(randomEnemy.cardId, {
            id: 'shield-bash',
            hero: 'brigitte',
            type: 'debuff',
            sourceCardId: playerHeroId,
            sourceRowId: rowId,
            tooltip: 'Shield Bash: Cannot use ultimate this round',
            visual: 'mirror' // For 180° turn effect
        });
        
        // Play bash sound after effect is applied
        try {
            playAudioByKey('brigitte-bash');
        } catch {}
        
        showToast('Brigitte AI: Shield Bash complete - Target turned and ultimate locked');
        setTimeout(() => clearToast(), 2000);
        return;
    }
    
    showToast('Brigitte: Shield Bash - Select target enemy');
    
    try {
        // Select target enemy
        const target = await selectCardTarget();
        if (!target) {
            showToast('Brigitte ultimate cancelled');
            setTimeout(() => clearToast(), 1500);
            return;
        }
        
        // Give Brigitte 2 shields
        const currentShield = window.__ow_getCard?.(playerHeroId)?.shield || 0;
        const newShield = Math.min(currentShield + 2, 3); // Max 3 shields
        window.__ow_dispatchShieldUpdate?.(playerHeroId, newShield);
        
        // Apply Shield Bash effect to target
        window.__ow_appendCardEffect?.(target.cardId, {
            id: 'shield-bash',
            hero: 'brigitte',
            type: 'debuff',
            sourceCardId: playerHeroId,
            sourceRowId: rowId,
            tooltip: 'Shield Bash: Cannot use ultimate this round',
            visual: 'mirror' // For 180° turn effect
        });
        
        // Play bash sound after effect is applied
        try {
            playAudioByKey('brigitte-bash');
        } catch {}
        
        showToast('Brigitte: Shield Bash complete - Target turned and ultimate locked');
        setTimeout(() => clearToast(), 2000);
        
    } catch (error) {
        console.error('Brigitte Ultimate error:', error);
        showToast('Brigitte ultimate cancelled');
        setTimeout(() => clearToast(), 1500);
    }
}

// On Draw - play intro sound
export function onDraw({ playerHeroId }) {
    try {
        playAudioByKey('brigitte-intro');
    } catch {}
}

// On Death - clean up Shield Bash effects (though they should persist)
export function onDeath({ playerHeroId, rowId }) {
    // Shield Bash effects persist even after Brigitte dies
    // This is intentional per the requirements
    console.log(`Brigitte ${playerHeroId} died - Shield Bash effects persist`);
}

export default { onDraw, onEnter, onUltimate, onDeath };
