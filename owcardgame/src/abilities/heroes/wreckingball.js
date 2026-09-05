import { selectRowTarget } from '../engine/targeting';
import { showMessage as showToast, clearMessage as clearToast } from '../engine/targetingBus';
import { playAudioByKey } from '../../assets/imageImports';
import { dealDamage } from '../engine/damageBus';
import effectsBus, { Effects } from '../engine/effectsBus';
import { isMinefieldToken, minefieldCharges, minefieldToken } from '../../game/minefield';

function placeMinefield(rowId, playerHeroId, sourceRowId, charges) {
    window.__ow_appendRowEffect?.(rowId, 'enemyEffects', minefieldToken({
        charges,
        sourceCardId: playerHeroId,
        sourceRowId,
    }));
}

export function onEnter({ playerHeroId, rowId }) {
    const playerNum = parseInt(playerHeroId[0]);
    
    try {
        playAudioByKey('wreckingball-enter');
    } catch {}
    
    // Count living enemies in opposing row
    const currentRowPosition = rowId[1]; // 'f', 'm', 'b'
    const enemyPlayer = playerNum === 1 ? 2 : 1;
    const opposingRowId = `${enemyPlayer}${currentRowPosition}`;
    
    const opposingRow = window.__ow_getRow?.(opposingRowId);
    let livingEnemies = 0;
    
    if (opposingRow && opposingRow.cardIds) {
        opposingRow.cardIds.forEach(cardId => {
            const card = window.__ow_getCard?.(cardId);
            if (card && card.health > 0) {
                livingEnemies++;
            }
        });
    }
    
    // Calculate shields: living enemies + 1, max 5
    const shieldAmount = Math.min(livingEnemies + 1, 5);
    
    // Apply shields to Wrecking Ball
    window.__ow_dispatchShieldUpdate?.(playerHeroId, shieldAmount);
    
    showToast(`Wrecking Ball: Adaptive Shield - ${shieldAmount} shields gained (${livingEnemies} enemies + 1)`);
    setTimeout(() => clearToast(), 2000);
}

export async function onUltimate({ playerHeroId, rowId, cost }) {
    const playerNum = parseInt(playerHeroId[0]);
    
    // Get current row synergy (cost is passed in, but we'll use current row synergy)
    const currentRow = window.__ow_getRow?.(rowId);
    const currentSynergy = currentRow?.synergy || 0;
    
    if (currentSynergy <= 0) {
        showToast('Wrecking Ball: No synergy in current row to deploy Minefield');
        setTimeout(() => clearToast(), 2000);
        return;
    }
    
    // For AI, automatically select the enemy row with the LEAST enemies
    if (window.__ow_aiTriggering || window.__ow_isAITurn) {
        const enemyPlayer = playerNum === 1 ? 2 : 1;
        const enemyRows = [`${enemyPlayer}f`, `${enemyPlayer}m`, `${enemyPlayer}b`];
        
        // Find the enemy row with the fewest cards
        let bestRow = enemyRows[0];
        let minEnemies = Number.POSITIVE_INFINITY;
        
        for (const enemyRowId of enemyRows) {
            const row = window.__ow_getRow?.(enemyRowId);
            const enemyCount = row?.cardIds?.length || 0;
            if (enemyCount < minEnemies) {
                minEnemies = enemyCount;
                bestRow = enemyRowId;
            }
        }
        
        placeMinefield(bestRow, playerHeroId, rowId, currentSynergy);
        try {
            playAudioByKey('wreckingball-ultimate');
        } catch {}
        showToast(`Wrecking Ball AI: Minefield deployed on ${bestRow} (${currentSynergy} mines)`);
        setTimeout(() => clearToast(), 2000);
        return;
    }
    
    showToast('Wrecking Ball: Select enemy row to deploy Minefield');
    const targetRow = await selectRowTarget();
    
    if (targetRow) {
        // Validate it's an enemy row
        const targetPlayerNum = parseInt(targetRow.rowId[0]);
        if (targetPlayerNum === playerNum) {
            showToast('Wrecking Ball: Can only deploy Minefield on enemy rows');
            setTimeout(() => clearToast(), 1500);
            return;
        }
        
        try {
            playAudioByKey('wreckingball-ultimate');
        } catch {}
        placeMinefield(targetRow.rowId, playerHeroId, rowId, currentSynergy);
        showToast(`Wrecking Ball: Minefield deployed with ${currentSynergy} charges`);
        setTimeout(() => clearToast(), 2000);
    } else {
        showToast('Wrecking Ball: Minefield cancelled');
        setTimeout(() => clearToast(), 1500);
    }
}

// Function to check for minefield triggers on movement
export function checkMinefieldTrigger(cardId, rowId) {
    const row = window.__ow_getRow?.(rowId);
    if (!row || !row.enemyEffects) {
        return;
    }

    const token = row.enemyEffects.find(isMinefieldToken);

    if (token && minefieldCharges(token) > 0) {
        // Check for immortality field before dealing damage
        const targetCard = window.__ow_getCard?.(cardId);
        if (targetCard && Array.isArray(targetCard.effects)) {
            const hasImmortality = targetCard.effects.some(effect =>
                effect?.id === 'immortality-field' && effect?.type === 'invulnerability'
            );
            if (hasImmortality) {
                return; // Don't consume charge or deal damage
            }
        }

        // The mine underfoot goes off. The field itself is drawn from this
        // token's charges, so removing one takes a mine off the board.
        effectsBus.publish(Effects.mineBlast(cardId));
        try { playAudioByKey('junkrat-explosion'); } catch {}

        dealDamage(cardId, rowId, 2, false, token.sourceCardId, false, { skipProjectileFx: true });
        effectsBus.publish(Effects.showDamage(cardId, 2));

        const newCharges = minefieldCharges(token) - 1;
        
        if (newCharges <= 0) {
            window.__ow_removeRowEffect?.(rowId, 'enemyEffects', token.id);
        } else {
            const updatedToken = {
                ...token,
                type: 'minefield',
                charges: newCharges,
                tooltip: `Minefield: Deals 2 damage when enemies move into or out of this row (${newCharges} charges)`
            };
            const currentEnemyEffects = window.__ow_getRow?.(rowId)?.enemyEffects || [];
            window.__ow_setRowArray?.(rowId, 'enemyEffects', currentEnemyEffects.map((effect) =>
                effect.id === token.id ? updatedToken : effect
            ));
        }
    }
}

export default { onEnter, onUltimate, checkMinefieldTrigger };
