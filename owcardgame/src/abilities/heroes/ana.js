import { playAudioByKey } from '../../assets/imageImports';
import { selectRowTarget } from '../engine/targeting';
import effectsBus, { Effects } from '../engine/effectsBus';
import { showMessage as showToast, clearMessage as clearToast } from '../engine/targetingBus';
import { dealDamage } from '../engine/damageBus';
import { PALETTE } from '../../presentation/pixi/fxConfig';
import { countNanoBoostHeroes, nanoBoostSynergyDelta } from '../../game/abilityRules';

/** Ana's biotic canister reads blue; McCree's flashbang is yellow. */
const BIOTIC_BLUE = PALETTE.iceDeep;

// Ana module scaffold

export function onDraw() {
    try { playAudioByKey('ana-intro'); } catch {}
}

export function onEnter({ playerHeroId, rowId }) {
    try { playAudioByKey('ana-enter'); } catch {}
}

export default { onDraw, onEnter, onEnterAbility1, onUltimate, recomputeAnaTokens };

export function recomputeAnaTokens() {
    const allRows = ['1f', '1m', '1b', '2f', '2m', '2b'];
    for (const rowId of allRows) {
        const row = window.__ow_getRow?.(rowId);
        if (!row) continue;
        const effects = row.allyEffects || [];
        const tokenIndex = effects.findIndex((effect) => effect?.id === 'ana-token');
        if (tokenIndex === -1) continue;

        const cards = (row.cardIds || []).map((pid) => {
            const heroId = pid.slice(1);
            return {
                heroId,
                health: window.__ow_getCard?.(pid)?.health ?? 0,
                isSpecial: !!window.__ow_isSpecial?.(heroId),
            };
        });
        const newCount = countNanoBoostHeroes(cards);
        const token = effects[tokenIndex];
        const delta = nanoBoostSynergyDelta(token.contribution, newCount);
        if (delta !== 0) {
            window.__ow_updateSynergy?.(rowId, delta);
        }
        if (token.contribution !== newCount) {
            const nextEffects = effects.map((effect, i) => (
                i === tokenIndex ? { ...effect, contribution: newCount } : effect
            ));
            window.__ow_setRowArray?.(rowId, 'allyEffects', nextEffects);
        }
    }
}

// Ana ultimate: Nano Boost (2)
// Place an Ana token in any row on the board, friendly or enemy. The token adds
// X synergy to that row, where X is the number of living heroes in it (special
// cards excluded, except 'nemesis'). It persists even if Ana dies, and the
// synergy tracks heroes entering, leaving and dying.

/** Living heroes standing in a row — what the token is worth there. */
function livingCount(rowId) {
    return (window.__ow_getRow?.(rowId)?.cardIds || []).filter((cid) => {
        const c = window.__ow_getCard?.(cid);
        return c && c.health > 0;
    }).length;
}

/**
 * Where Nano Boost lands.
 *
 * Ana picks any row on the board, hers or the enemy's — the boost is no longer
 * tied to whichever row she happens to be standing in. The AI takes its own
 * fullest row, since the token is worth one synergy per living hero on it.
 */
async function pickNanoRow(playerNum) {
    const friendly = [`${playerNum}f`, `${playerNum}m`, `${playerNum}b`];
    if (window.__ow_aiTriggering || window.__ow_isAITurn) {
        const best = friendly
            .map((rowId) => ({ rowId, living: livingCount(rowId) }))
            .sort((a, b) => b.living - a.living)[0];
        // Cost 2 — skip only if the row would gain less than that.
        if (!best || best.living < 2) {
            showToast('Ana AI: Skipping Nano Boost (need 2+ heroes in a row)');
            setTimeout(() => clearToast(), 1500);
            return null;
        }
        return best.rowId;
    }

    showToast('Ana: Select any row for Nano Boost');
    const target = await selectRowTarget();
    clearToast();
    return target?.rowId || null;
}

export async function onUltimate({ playerHeroId, rowId, cost }) {
    try {
        const anaRow = await pickNanoRow(parseInt(playerHeroId[0], 10));
        if (!anaRow) return false;

        const existing = (window.__ow_getRow?.(anaRow)?.allyEffects || []).some((e) => e?.id === 'ana-token');
        if (!existing) {
            const row = window.__ow_getRow?.(anaRow);
            const cards = (row?.cardIds || []).map((pid) => {
                const heroId = pid.slice(1);
                return {
                    heroId,
                    health: window.__ow_getCard?.(pid)?.health ?? 0,
                    isSpecial: !!window.__ow_isSpecial?.(heroId),
                };
            });
            const newCount = countNanoBoostHeroes(cards);
            // Arcs crackle over the boosted row.
            try { effectsBus.publish(Effects.nanoBoost(anaRow)); } catch {}
            window.__ow_appendRowEffect?.(anaRow, 'allyEffects', {
                id: 'ana-token',
                hero: 'ana',
                playerHeroId,
                type: 'rowSynergyBoost',
                contribution: newCount,
                tooltip: 'Nano Boost: +X Synergy (heroes in row)',
            });
            if (newCount) window.__ow_updateSynergy?.(anaRow, newCount);
        } else {
            recomputeAnaTokens();
        }

        try { playAudioByKey('ana-ult'); } catch {}
        return true;
    } catch (error) {
        // Reported rather than swallowed: returning undefined here charged the
        // synergy for an ultimate that had thrown.
        console.error('Ana Nano Boost error:', error);
        return false;
    }
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
            
            // Biotic grenade arcs into the row, same as the human path.
            try { effectsBus.publish(Effects.grenade(playerHeroId, bestRow, BIOTIC_BLUE)); } catch {}

            // Damage enemies
            const enemyRowData = window.__ow_getRow?.(enemyRow);
            let enemiesDamaged = 0;
            if (enemyRowData && enemyRowData.cardIds) {
                for (const cardId of enemyRowData.cardIds) {
                    const card = window.__ow_getCard?.(cardId);
                    if (card && card.health > 0) {
                        // The grenade is the projectile; suppress the damage
                        // bus's default beam from Ana to each enemy.
                        dealDamage(cardId, enemyRow, 1, false, playerHeroId, false, { skipProjectileFx: true });
                        effectsBus.publish(Effects.showDamage(cardId, 1));
                        enemiesDamaged++;
                    }
                }
            }
            
            showToast(`Ana AI: Healed ${alliesHealed} allies, damaged ${enemiesDamaged} enemies`);
            setTimeout(() => clearToast(), 2000);
            return;
        }
        
        // No aim line: the grenade's arc is the throw, and the line had to be
        // torn down by hand on every exit — which the cancel path did not do.
        showToast('Ana: Select a row');
        const target = await selectRowTarget({ allowAnyRow: true });
        clearToast();
        // Cancelling used to destructure null and throw, which is what left the
        // old aim line stuck on screen.
        if (!target?.rowId) return;
        const { rowId } = target;

        // Biotic grenade arcs into the chosen row.
        try { effectsBus.publish(Effects.grenade(playerHeroId, rowId, BIOTIC_BLUE)); } catch {}

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
                    dealDamage(pid, row, 1, false, playerHeroId, false, { skipProjectileFx: true });
                    // show -1 overlay
                    effectsBus.publish(Effects.showDamage(pid, 1));
                }
            }
        };

        healAllies(allyRow);
        damageEnemies(enemyRow);

        try { playAudioByKey('ana-ability1'); } catch {}
    } catch (e) {
        clearToast();
    }
}


