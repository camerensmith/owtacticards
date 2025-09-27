import { dealDamage } from '../engine/damageBus';
import { showMessage as showToast, clearMessage as clearToast } from '../engine/targetingBus';
import { selectCardTarget, selectRowTarget } from '../engine/targeting';
import { playAudioByKey } from '../../assets/imageImports';

// Void Barrier - onEnter
export async function onEnter({ playerHeroId, rowId }) {
    const playerNum = parseInt(playerHeroId[0]);
    
    try { playAudioByKey('ramattra-enter'); } catch {}
    
    // Give Ramattra 1 shield
    const currentShield = window.__ow_getCard?.(playerHeroId)?.shield || 0;
    const newShield = Math.min(currentShield + 1, 3); // Max 3 shields
    window.__ow_dispatchShieldUpdate?.(playerHeroId, newShield);
    
    showToast('Ramattra: Select any ally to give 1 shield');
    
    try {
        const target = await selectCardTarget();
        if (!target) { 
            clearToast(); 
            return; 
        }
        
        const targetCard = window.__ow_getCard?.(target.cardId);
        const targetPlayer = parseInt(target.cardId[0]);
        const isAlly = targetPlayer === playerNum;
        
        // Validate target (ally, alive, not Ramattra himself)
        if (!isAlly || !targetCard || targetCard.health <= 0 || target.cardId === playerHeroId) {
            showToast('Ramattra: Must target a different living ally');
            setTimeout(() => clearToast(), 2000);
            return;
        }
        
        // Give target 1 shield
        const targetCurrentShield = targetCard.shield || 0;
        const targetNewShield = Math.min(targetCurrentShield + 1, 3); // Max 3 shields
        window.__ow_dispatchShieldUpdate?.(target.cardId, targetNewShield);
        
        // Play ability sound on resolve
        try { playAudioByKey('ramattra-ability1'); } catch {}
        
        clearToast();
        showToast('Ramattra: Void Barrier applied!');
        setTimeout(() => clearToast(), 2000);
        
    } catch (error) {
        console.error('Ramattra Void Barrier error:', error);
        showToast('Ramattra ability cancelled');
        setTimeout(() => clearToast(), 1500);
    }
}

// Ravenous Vortex - Ultimate (Cost 3)
export async function onUltimate({ playerHeroId, rowId, cost }) {
    const playerNum = parseInt(playerHeroId[0]);
    
    // Play ultimate activation sound
    try { playAudioByKey('ramattra-ultimate'); } catch {}
    
    showToast('Ramattra: Select enemy row to shuffle');
    
    try {
        const target = await selectRowTarget();
        if (!target) { 
            clearToast(); 
            return; 
        }
        
        const targetPlayer = parseInt(target.rowId[0]);
        const isEnemyRow = targetPlayer !== playerNum;
        
        // Validate target (enemy row)
        if (!isEnemyRow) {
            showToast('Ramattra: Must target an enemy row');
            setTimeout(() => clearToast(), 2000);
            return;
        }
        
        const targetRow = window.__ow_getRow?.(target.rowId);
        const enemyHeroes = targetRow?.cardIds || [];
        
        // Check if there are any heroes to shuffle
        if (enemyHeroes.length === 0) {
            showToast('Ramattra: No enemies in target row - transforming anyway');
            setTimeout(() => clearToast(), 2000);
        } else {
            // Shuffle the enemy heroes randomly
            const shuffledHeroes = [...enemyHeroes].sort(() => Math.random() - 0.5);
            window.__ow_setRowArray?.(target.rowId, shuffledHeroes);
            
            // Deal 1 damage to hero in same column as Ramattra
            const ramattraRow = window.__ow_getRow?.(rowId);
            const ramattraIndex = ramattraRow?.cardIds?.indexOf(playerHeroId) || 0;
            
            if (shuffledHeroes[ramattraIndex]) {
                const targetHero = shuffledHeroes[ramattraIndex];
                dealDamage(targetHero, target.rowId, 1, false, playerHeroId);
            }
        }
        
        // Transform to Nemesis immediately
        transformToNemesis(playerNum, playerHeroId, rowId);
        
        // Play ultimate resolve sound
        try { playAudioByKey('ramattra-ultimate-resolve'); } catch {}
        
        clearToast();
        showToast('Ramattra: Transformed to Nemesis!');
        setTimeout(() => clearToast(), 2000);
        
    } catch (error) {
        console.error('Ramattra Ravenous Vortex error:', error);
        showToast('Ramattra ultimate cancelled');
        setTimeout(() => clearToast(), 1500);
    }
}

// Transform Ramattra to Nemesis
function transformToNemesis(playerNum, playerHeroId, rowId) {
    console.log('Ramattra: Starting transformation to Nemesis');
    console.log('Ramattra: PlayerHeroId:', playerHeroId);
    console.log('Ramattra: PlayerNum:', playerNum);
    
    // Remove Ramattra from the board using the proper dispatch
    console.log('Ramattra: Dispatching REMOVE_ALIVE_CARD action');
    window.__ow_dispatchAction?.({
        type: 'remove-alive-card',
        payload: { cardId: playerHeroId }
    });
    
    // Add Nemesis to hand
    console.log('Ramattra: Adding Nemesis to hand');
    window.__ow_addSpecialCardToHand?.(playerNum, 'nemesis');
    
    // Show toast about ephemeral card
    showToast('Nemesis Ramattra added to hand (ephemeral - play this turn or discard)');
    setTimeout(() => clearToast(), 3000);
}

export default {
    onEnter,
    onUltimate
};
