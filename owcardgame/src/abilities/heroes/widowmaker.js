import { selectRowTarget } from '../engine/targeting';
import { selectCardTarget } from '../engine/targeting';
import { showMessage as showToast, clearMessage as clearToast } from '../engine/targetingBus';
import { playAudioByKey } from '../../assets/imageImports';

export async function onEnter({ playerHeroId, rowId }) {
    const playerNum = parseInt(playerHeroId[0]);

    showToast('Widowmaker: Place Infra-Sight on enemy row');
    const target = await selectRowTarget({ isDebuff: true });
    if (target) {
        // Validate it's an enemy row
        const targetPlayerNum = parseInt(target.rowId[0]);
        if (targetPlayerNum === playerNum) {
            showToast('Widowmaker: Can only target enemy rows');
            setTimeout(() => clearToast(), 1500);
            return;
        }
        
        // Place Widowmaker Token on the enemy row
        const widowmakerToken = {
            id: 'widowmaker-token',
            hero: 'widowmaker',
            type: 'damageAmplification',
            value: 1,
            sourceCardId: playerHeroId,
            sourceRowId: rowId,
            tooltip: 'Infra-Sight: All damage dealt to enemies in this row is increased by 1',
            visual: 'widowmaker-icon'
        };
        
        window.__ow_appendRowEffect?.(target.rowId, 'enemyEffects', widowmakerToken);
        
        // Play ability sound when token is successfully placed
        try {
            playAudioByKey('widowmaker-ability1');
        } catch {}
        
        showToast('Widowmaker: Infra-Sight placed on enemy row');
        setTimeout(() => clearToast(), 2000);
    } else {
        // Targeting was cancelled (right-click or other cancellation)
        showToast('Widowmaker: Infra-Sight cancelled');
        setTimeout(() => clearToast(), 1500);
    }
}

export async function onUltimate({ playerHeroId, rowId, cost }) {
    const playerNum = parseInt(playerHeroId[0]);
    
    try {
        playAudioByKey('widowmaker-ultimate');
    } catch {}
    
    // Determine opposing row based on Widowmaker's position
    const widowmakerPosition = rowId[1]; // f, m, or b
    const enemyPlayer = playerNum === 1 ? 2 : 1;
    const opposingRowId = `${enemyPlayer}${widowmakerPosition}`;
    
    showToast(`Widowmaker: Select enemy in ${opposingRowId} to defeat`);
    const target = await selectCardTarget({ isDamage: true });
    if (target) {
        // Validate target is in the opposing row
        if (target.rowId !== opposingRowId) {
            showToast(`Widowmaker: Must target enemy in ${opposingRowId}`);
            setTimeout(() => clearToast(), 1500);
            return;
        }
        
        // Validate it's an enemy
        const targetPlayerNum = parseInt(target.cardId[0]);
        if (targetPlayerNum === playerNum) {
            showToast('Widowmaker: Can only target enemies');
            setTimeout(() => clearToast(), 1500);
            return;
        }
        
        // Deal 999 damage to defeat the target
        window.__ow_dealDamage?.(target.cardId, target.rowId, 999);
        
        try {
            playAudioByKey('widowmaker-ultimate-resolve');
        } catch {}
        
        showToast('Widowmaker: Target defeated');
        setTimeout(() => clearToast(), 2000);
    } else {
        // Targeting was cancelled (right-click or other cancellation)
        showToast('Widowmaker: Widow\'s Kiss cancelled');
        setTimeout(() => clearToast(), 1500);
    }
}

export function onDeath({ playerHeroId, rowId }) {
    // Clean up all Widowmaker tokens when she dies
    const allRows = ['1f', '1m', '1b', '2f', '2m', '2b'];
    allRows.forEach(rowId => {
        window.__ow_removeRowEffect?.(rowId, 'enemyEffects', 'widowmaker-token');
    });
    console.log(`${playerHeroId} died - Infra-Sight tokens cleaned up`);
}

export default { onEnter, onUltimate, onDeath };
