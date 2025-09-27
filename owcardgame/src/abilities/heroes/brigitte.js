import { showOnEnterChoice } from '../engine/modalController';
import { selectCardTarget } from '../engine/targeting';
import { showMessage as showToast, clearMessage as clearToast } from '../engine/targetingBus';
import { dealDamage } from '../engine/damageBus';
import { getAudioFile } from '../../assets/imageImports';

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
    
    showToast('Brigitte: Select ally to heal');
    
    try {
        const target = await selectCardTarget();
        if (target) {
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
