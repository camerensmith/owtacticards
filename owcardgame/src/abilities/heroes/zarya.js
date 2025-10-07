import { selectCardTarget } from '../engine/targeting';
import { showMessage as showToast, clearMessage as clearToast } from '../engine/targetingBus';
import { playAudioByKey } from '../../assets/imageImports';
import { dealDamage } from '../engine/damageBus';
import effectsBus, { Effects } from '../engine/effectsBus';

export async function onEnter({ playerHeroId, rowId }) {
    const playerNum = parseInt(playerHeroId[0]);
    
    try {
        playAudioByKey('zarya-enter');
    } catch {}
    
    showToast('Zarya: Select ally hero or right-click to place tokens on Zarya');
    
    try {
        // Use AI targeting system
        const target = await selectCardTarget();
        if (target) {
            // Validate target is on same team
            const targetPlayerNum = parseInt(target.cardId[0]);
            if (targetPlayerNum !== playerNum) {
                showToast('Zarya: Can only place tokens on ally heroes');
                setTimeout(() => clearToast(), 2000);
                return;
            }
            
            // Place 3 Zarya tokens on target
            placeZaryaTokens(target.cardId, 3);
            
            try {
                playAudioByKey('zarya-ability1');
            } catch {}
            
            showToast(`Zarya: Placed 3 Zarya tokens on ${target.cardId}`);
            setTimeout(() => clearToast(), 2000);
        } else {
            // Right-click cancelled - place tokens on Zarya herself
            placeZaryaTokens(playerHeroId, 3);
            
            try {
                playAudioByKey('zarya-ability1');
            } catch {}
            
            showToast('Zarya: Placed 3 Zarya tokens on herself');
            setTimeout(() => clearToast(), 2000);
        }
    } catch (error) {
        console.error('Zarya onEnter error:', error);
        // Fallback: place tokens on Zarya herself
        placeZaryaTokens(playerHeroId, 3);
        showToast('Zarya: Placed 3 Zarya tokens on herself');
        setTimeout(() => clearToast(), 2000);
    }
}

export async function onUltimate({ playerHeroId, rowId, cost }) {
    const playerNum = parseInt(playerHeroId[0]);
    
    // Count Zarya tokens on your side of the board
    const zaryaTokens = countZaryaTokensOnSide(playerNum);
    
    const selectedTargets = [];
    const maxTargets = 3;
    
    // AI AUTO-SELECT: If AI is triggering, automatically select up to 3 random enemy targets
    const isAI = window.__ow_isAITurn || window.__ow_aiTriggering;
    if (isAI) {
        // Get all enemy heroes
        const enemyPlayerNum = playerNum === 1 ? 2 : 1;
        const enemyRows = [`${enemyPlayerNum}f`, `${enemyPlayerNum}m`, `${enemyPlayerNum}b`];
        const enemyHeroes = [];
        
        enemyRows.forEach(enemyRowId => {
            const row = window.__ow_getRow?.(enemyRowId);
            if (row && row.cardIds) {
                row.cardIds.forEach(cardId => {
                    const card = window.__ow_getCard?.(cardId);
                    if (card && card.health > 0) {
                        const power = card[`${enemyRowId[1]}_power`] || 0;
                        enemyHeroes.push({ cardId, rowId: enemyRowId, power, health: card.health });
                    }
                });
            }
        });
        
        // Shuffle randomly and take up to 3
        for (let i = enemyHeroes.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [enemyHeroes[i], enemyHeroes[j]] = [enemyHeroes[j], enemyHeroes[i]];
        }
        selectedTargets.push(...enemyHeroes.slice(0, maxTargets));
        console.log('Zarya AI selected targets:', selectedTargets);
    } else {
        // MANUAL SELECTION for human player
        showToast('Zarya: Select up to 3 enemy heroes (right-click when done)');
        let targetCount = 0;
        
        // Allow selecting up to 3 targets
        while (targetCount < maxTargets) {
            const target = await selectCardTarget();
        
        if (target) {
            // Validate target is enemy
            const targetPlayerNum = parseInt(target.cardId[0]);
            if (targetPlayerNum === playerNum) {
                showToast('Zarya: Can only target enemy heroes');
                setTimeout(() => clearToast(), 1500);
                continue;
            }
            
            // Check if already selected
            if (selectedTargets.some(t => t.cardId === target.cardId)) {
                showToast('Zarya: Hero already selected');
                setTimeout(() => clearToast(), 1500);
                continue;
            }
            
            selectedTargets.push(target);
            targetCount++;
            
            showToast(`Zarya: Selected ${targetCount}/3 targets (right-click when done)`);
        } else {
            // Right-click - finish targeting
            break;
        }
    }
    
    
    }  // End of else (manual selection)
    if (selectedTargets.length > 0) {
        // Play ultimate sound
        try {
            playAudioByKey('zarya-ultimate');
        } catch {}
        
        // Calculate damage per target (4 - zarya tokens, minimum 1)
        const damagePerTarget = Math.max(1, 4 - zaryaTokens);
        
        // Deal damage to all selected targets
        selectedTargets.forEach(target => {
            dealDamage(target.cardId, target.rowId, damagePerTarget, false, playerHeroId);
            effectsBus.publish(Effects.showDamage(target.cardId, damagePerTarget));
        });
        
        // Play resolve sound
        try {
            playAudioByKey('zarya-ultimate-resolve');
        } catch {}
        
        showToast(`Zarya: Particle Cannon dealt ${damagePerTarget} damage to ${selectedTargets.length} targets`);
        setTimeout(() => clearToast(), 2000);
    } else {
        showToast('Zarya: Particle Cannon cancelled');
        setTimeout(() => clearToast(), 1500);
    }
}

// Helper function to place Zarya tokens on a hero
function placeZaryaTokens(cardId, amount) {
    console.log(`Placing ${amount} Zarya tokens on ${cardId}`);
    
    // Create a single token with the total amount
    const tokenId = `zarya-token-${Date.now()}`;
    const zaryaToken = {
        id: tokenId,
        hero: 'zarya',
        type: 'zarya-shield',
        amount: amount, // Total number of tokens
        sourceCardId: cardId,
        tooltip: `Zarya Token: Absorbs damage like shields, reduces Particle Cannon damage (${amount} charges)`,
        visual: 'zarya-icon'
    };
    
    console.log('Zarya token created:', zaryaToken);
    
    // Add to card effects using the proper function
    if (window.__ow_appendCardEffect) {
        window.__ow_appendCardEffect(cardId, zaryaToken);
        console.log(`Zarya token added to ${cardId}`);
    } else {
        console.error('window.__ow_appendCardEffect not available');
    }
}

// Helper function to count Zarya tokens on your side
function countZaryaTokensOnSide(playerNum) {
    let totalTokens = 0;
    
    // Check all rows on your side
    const yourRows = [`${playerNum}f`, `${playerNum}m`, `${playerNum}b`];
    
    yourRows.forEach(rowId => {
        const row = window.__ow_getRow?.(rowId);
        if (row && row.cardIds) {
            row.cardIds.forEach(cardId => {
                const card = window.__ow_getCard?.(cardId);
                if (card && Array.isArray(card.effects)) {
                    const zaryaToken = card.effects.find(effect => 
                        effect?.hero === 'zarya' && effect?.type === 'zarya-shield'
                    );
                    if (zaryaToken) {
                        totalTokens += zaryaToken.amount || 0;
                    }
                }
            });
        }
    });
    
    return totalTokens;
}

export default { onEnter, onUltimate };
