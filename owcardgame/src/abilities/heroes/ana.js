import $ from 'jquery';
import { getAudioFile } from '../../assets/imageImports';
import { selectRowTarget } from '../engine/targeting';
import effectsBus, { Effects } from '../engine/effectsBus';
import aimLineBus from '../engine/aimLineBus';
import { showMessage as showToast, clearMessage as clearToast } from '../engine/targetingBus';
import { subscribe as subscribeDamage, dealDamage } from '../engine/damageBus';

// Ana module scaffold

export function onDraw() {
    try { const s = getAudioFile('ana-intro'); if (s) new Audio(s).play().catch(()=>{}); } catch {}
}

export function onEnter({ playerHeroId, rowId }) {
    const playerNum = parseInt(playerHeroId[0]);
    try { const s = getAudioFile('ana-enter'); if (s) new Audio(s).play().catch(()=>{}); } catch {}
    // Ensure no AI auto when it is human turn
    if (!(window.__ow_aiTriggering || window.__ow_isAITurn) || (typeof window.__ow_getPlayerTurn === 'function' && window.__ow_getPlayerTurn() !== 2)) {
        // human-only path; do nothing here, actual choices via onEnterAbility1
        return;
    }
}

export default { onDraw, onEnter, onEnterAbility1, onUltimate };

// Ana ultimate: Nano Boost (3)
// Place an Ana token in Ana's row. Token adds X power to that row, where X equals the
// number of heroes (alive) in that row (exclude special=true except 'nemesis').
// This persists even if Ana dies; power adjusts dynamically as heroes enter/leave/die.
export function onUltimate({ playerHeroId, rowId, cost }) {
    try {
        const playerNum = parseInt(playerHeroId[0]);
        // Find Ana's current row by scanning rows for playerHeroId
        const rows = [`${playerNum}f`, `${playerNum}m`, `${playerNum}b`];
        let anaRow = null;
        for (const r of rows) {
            const arr = window.__ow_getRow?.(r)?.cardIds || [];
            if (arr.includes(playerHeroId)) { anaRow = r; break; }
        }
        if (!anaRow) return;

        // Add Ana token icon to the row effects with tooltip
        const modifier = {
            id: 'ana-token',
            hero: 'ana',
            playerHeroId,
            type: 'rowSynergyBoost',
            tooltip: 'Nano Boost: +X Synergy (heroes in row)',
        };
        if (window.__ow_appendRowEffect) {
            window.__ow_appendRowEffect(anaRow, 'allyEffects', modifier);
        }

        // Subscribe to row changes and recompute X → set synergy for that row position
        // For now, compute once immediately
        const recompute = () => {
            const cards = window.__ow_getRow?.(anaRow)?.cardIds || [];
            let heroes = 0;
            for (const pid of cards) {
                const heroId = pid.slice(1);
                const isSpecial = !!window.__ow_isSpecial?.(heroId);
                const countsAsHero = !isSpecial || heroId === 'nemesis';
                const alive = (window.__ow_getCard?.(pid)?.health ?? 0) > 0;
                if (countsAsHero && alive) heroes += 1;
            }
            // Store the computed X in the row for reference (optional) and set synergy slot
            const rowPos = anaRow[1];
            const synergyIndex = { f:'f', m:'m', b:'b' }[rowPos];
            // Set absolute synergy contribution for this row position
            window.__ow_setRowSynergy && window.__ow_setRowSynergy(playerNum, synergyIndex, heroes);
        };
        recompute();

        try { const s = getAudioFile('ana-ult'); if (s) new Audio(s).play().catch(()=>{}); } catch {}
    } catch {}
}

// Ana onEnter ability 1:
// Select any row (ally or enemy). Heal all allies in that row by 1 (to max),
// and deal 1 damage to all enemies in the opposing row (does not pierce shields).
export async function onEnterAbility1({ playerNum, playerHeroId }) {
    try {
        // For AI, automatically select the row with most wounded allies
        if (window.__ow_aiTriggering || window.__ow_isAITurn) {
            const friendlyRows = [`${playerNum}f`, `${playerNum}m`, `${playerNum}b`];
            
            // Find the row with most wounded allies
            let bestRow = friendlyRows[0];
            let maxWoundedAllies = 0;
            
            for (const friendlyRowId of friendlyRows) {
                const row = window.__ow_getRow?.(friendlyRowId);
                let woundedAllies = 0;
                if (row && row.cardIds) {
                    for (const cardId of row.cardIds) {
                        const card = window.__ow_getCard?.(cardId);
                        if (card && card.health > 0 && card.health < (card.maxHealth || card.health)) {
                            woundedAllies++;
                        }
                    }
                }
                if (woundedAllies > maxWoundedAllies) {
                    maxWoundedAllies = woundedAllies;
                    bestRow = friendlyRowId;
                }
            }
            
            console.log(`Ana AI: Selected row ${bestRow} with ${maxWoundedAllies} wounded allies`);
            
            // Heal allies in selected row and damage enemies in opposing row
            const pos = bestRow[1]; // f/m/b
            const allyRow = `${playerNum}${pos}`;
            const enemyPlayer = playerNum === 1 ? 2 : 1;
            const enemyRow = `${enemyPlayer}${pos}`;
            
            // Heal allies
            const allyRowData = window.__ow_getRow?.(allyRow);
            let alliesHealed = 0;
            if (allyRowData && allyRowData.cardIds) {
                for (const cardId of allyRowData.cardIds) {
                    const card = window.__ow_getCard?.(cardId);
                    if (card && card.health > 0 && card.health < (card.maxHealth || card.health)) {
                        window.__ow_setCardProperty?.(cardId, 'health', Math.min(card.health + 1, card.maxHealth || card.health));
                        alliesHealed++;
                    }
                }
            }
            
            // Damage enemies
            const enemyRowData = window.__ow_getRow?.(enemyRow);
            let enemiesDamaged = 0;
            if (enemyRowData && enemyRowData.cardIds) {
                for (const cardId of enemyRowData.cardIds) {
                    const card = window.__ow_getCard?.(cardId);
                    if (card && card.health > 0) {
                        dealDamage(cardId, enemyRow, 1, false, playerHeroId);
                        effectsBus.publish(Effects.showDamage(cardId, 1));
                        enemiesDamaged++;
                    }
                }
            }
            
            showToast(`Ana AI: Healed ${alliesHealed} allies, damaged ${enemiesDamaged} enemies`);
            setTimeout(() => clearToast(), 2000);
            return;
        }
        
        // Draw aim line from Ana card to cursor while selecting
        if (playerHeroId) {
            aimLineBus.setArrowSource(playerHeroId);
        }
        showToast('Ana: Select a row');
        const { rowId } = await selectRowTarget({ allowAnyRow: true });
        clearToast();
        aimLineBus.clearArrow();

        // Always heal Ana's side (playerNum) and damage the opposing side, at the same row position
        const pos = rowId[1]; // f/m/b
        const allyRow = `${playerNum}${pos}`;
        const enemyPlayer = playerNum === 1 ? 2 : 1;
        const enemyRow = `${enemyPlayer}${pos}`;

        // Heal allies in allyRow by 1 up to max health
        const healAllies = (row) => {
            const cards = window.__ow_getRow?.(row)?.cardIds || [];
            for (const pid of cards) {
                // Safety check: ensure pid is valid before processing
                if (!pid || typeof pid !== 'string') continue;
                
                const card = window.__ow_getCard?.(pid);
                if (!card) continue;
                
                // Prevent turrets from being healed
                if (card.turret === true) {
                    console.log(`Ana: Cannot heal turret ${pid} - turrets cannot be healed`);
                    continue;
                }
                
                const cur = card.health || 0;
                const max = window.__ow_getMaxHealth?.(pid) ?? cur;
                if (cur < max) {
                    window.__ow_setCardHealth && window.__ow_setCardHealth(pid, Math.min(max, cur + 1));
                    // show +1 overlay
                    effectsBus.publish(Effects.showHeal(pid, 1));
                }
            }
        };

        // Damage all enemies in enemyRow by 1 (respect shields)
        const damageEnemies = (row) => {
            const cards = window.__ow_getRow?.(row)?.cardIds || [];
            for (const pid of cards) {
                // Safety check: ensure pid is valid before processing
                if (pid && typeof pid === 'string') {
                    dealDamage(pid, row, 1, false, playerHeroId);
                    // show -1 overlay
                    effectsBus.publish(Effects.showDamage(pid, 1));
                }
            }
        };

        healAllies(allyRow);
        damageEnemies(enemyRow);

        try { const s = getAudioFile('ana-ability1'); if (s) new Audio(s).play().catch(()=>{}); } catch {}
    } catch (e) {
        clearToast();
    }
}


