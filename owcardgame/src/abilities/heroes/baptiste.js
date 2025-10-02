import $ from 'jquery';
import { selectCardTarget } from '../engine/targeting';
import { showMessage as showToast, clearMessage as clearToast } from '../engine/targetingBus';
import aimLineBus from '../engine/aimLineBus';
import { dealDamage } from '../engine/damageBus';
import effectsBus, { Effects } from '../engine/effectsBus';
import { getAudioFile, playAudioByKey } from '../../assets/imageImports';
import { showOnEnterChoice } from '../engine/modalController';
import { withAIContext } from '../engine/aiContextHelper';

export function onDraw() {
    try { playAudioByKey('baptiste-intro'); } catch {}
}

const doDamageColumn = async (liIndex, playerNum, playerHeroId) => {
    console.log(`Baptiste doDamageColumn called: liIndex=${liIndex}, playerNum=${playerNum}, playerHeroId=${playerHeroId}`);
    const enemyPlayer = playerNum === 1 ? 2 : 1;
    const enemyRows = [`${enemyPlayer}f`, `${enemyPlayer}m`, `${enemyPlayer}b`];
    console.log(`Enemy rows:`, enemyRows);
    
    // Collect tuples of [pid, rowId] at the selected column index
    const rawTargets = enemyRows
        .map(r => {
            const cardIds = window.__ow_getRow?.(r)?.cardIds || [];
            console.log(`Row ${r} has cards:`, cardIds);
            if (liIndex < 0 || liIndex >= cardIds.length) return null;
            const pid = cardIds[liIndex];
            return pid ? [pid, r] : null;
        })
        .filter(Boolean);

    console.log(`Raw targets found:`, rawTargets);

    // De-duplicate by pid just in case
    const seen = new Set();
    const targets = [];
    for (const [pid, r] of rawTargets) {
        if (!seen.has(pid)) { seen.add(pid); targets.push([pid, r]); }
    }

    console.log(`Final targets:`, targets);

    // Apply damage to up to 3 (front/middle/back)
    for (const [pid, r] of targets) {
        console.log(`Dealing 1 damage to ${pid} in ${r}`);
        dealDamage(pid, r, 1, false, playerHeroId);
        effectsBus.publish(Effects.showDamage(pid, 1));
    }
    playAudioByKey('baptiste-ability1');
    console.log(`Baptiste damage column complete`);
};

const doHealColumn = async (liIndex, playerNum) => {
    const rows = [`${playerNum}f`, `${playerNum}m`, `${playerNum}b`];
    const candidates = rows.map(r => window.__ow_getRow?.(r)?.cardIds?.[liIndex]).filter(Boolean);
    for (const pid of candidates) {
        const card = window.__ow_getCard?.(pid);

        // Prevent turrets from being healed
        if (card && card.turret === true) {
            console.log(`Baptiste: Cannot heal turret ${pid} - turrets cannot be healed`);
            continue;
        }

        const max = window.__ow_getMaxHealth?.(pid) ?? (card?.health || 0);
        const cur = card?.health || 0;
        if (cur < max) {
            window.__ow_setCardHealth && window.__ow_setCardHealth(pid, Math.min(max, cur + 1));
            effectsBus.publish(Effects.showHeal(pid, 1));
        }
    }
    playAudioByKey('baptiste-ability2');
};

export function onEnter({ playerHeroId, rowId }) {
    const playerNum = parseInt(playerHeroId[0]);
    try { playAudioByKey('baptiste-enter'); } catch {}
    const opt1 = { name: 'Biotic Launcher (Damage)', title: 'Biotic Launcher (Damage)', description: 'Deal 1 damage to up to 3 adjacent enemies in target column (respects shields).' };
    const opt2 = { name: 'Biotic Launcher (Heal)', title: 'Biotic Launcher (Heal)', description: 'Heal 1 to up to 3 adjacent allies in target column (cap at max HP).' };

    showOnEnterChoice('Baptiste', opt1, opt2, withAIContext(playerHeroId, async (choiceIndex) => {
        console.log(`Baptiste onEnter choice made: ${choiceIndex} (0=damage, 1=heal)`);
        try {
            const sourceId = `${playerNum}baptiste`;
            aimLineBus.setArrowSource(sourceId);

            if (choiceIndex === 0) {
                console.log(`Baptiste chose damage option`);
                showToast('Baptiste: Pick an enemy column (click any enemy card)');
                const target = await selectCardTarget({ isDamage: true });
                if (!target) {
                    clearToast(); aimLineBus.clearArrow();
                    return;
                }

                // Validate target is enemy
                const targetPlayerNum = parseInt(target.cardId[0]);
                console.log(`Baptiste target validation: targetPlayerNum=${targetPlayerNum}, playerNum=${playerNum}`);
                if (targetPlayerNum === playerNum) {
                    showToast('Baptiste: Must target enemy column!');
                    setTimeout(() => clearToast(), 2000);
                    aimLineBus.clearArrow();
                    return;
                }

                // Compute column index from enemy rows, not DOM
                const enemyPlayer = playerNum === 1 ? 2 : 1;
                const enemyRows = [`${enemyPlayer}f`, `${enemyPlayer}m`, `${enemyPlayer}b`];
                let liIndex = -1;
                for (const r of enemyRows) {
                    const cardIds = window.__ow_getRow?.(r)?.cardIds || [];
                    const idx = cardIds.indexOf(target.cardId);
                    if (idx !== -1) { liIndex = idx; break; }
                }
                // Fallback: pick the densest existing column (0..max-1) among enemy rows
                if (liIndex === -1) {
                    let maxLen = Math.max(...enemyRows.map(r => (window.__ow_getRow?.(r)?.cardIds?.length || 0)));
                    if (!isFinite(maxLen) || maxLen <= 0) { clearToast(); aimLineBus.clearArrow(); return; }
                    // Choose column with most enemies (tie -> middle, then front)
                    let bestIdx = 0, bestScore = -1;
                    for (let c = 0; c < maxLen; c++) {
                        let score = 0;
                        for (const r of enemyRows) {
                            const ids = window.__ow_getRow?.(r)?.cardIds || [];
                            if (ids[c]) score += 1;
                        }
                        // prefer middle index in ties if exists
                        const tieBias = (Math.abs(c - Math.floor(maxLen/2)) === 0) ? 0.1 : 0;
                        if (score + tieBias > bestScore) { bestScore = score + tieBias; bestIdx = c; }
                    }
                    liIndex = bestIdx;
                }

                clearToast(); aimLineBus.clearArrow();
                console.log(`Baptiste calling doDamageColumn with liIndex=${liIndex}, playerNum=${playerNum}, playerHeroId=${playerHeroId}`);
                await doDamageColumn(liIndex, playerNum, playerHeroId);
                console.log(`Baptiste doDamageColumn finished`);
            } else {
                showToast('Baptiste: Pick a friendly column (click any ally card)');
                const target = await selectCardTarget({ isHeal: true });
                if (!target) {
                    clearToast(); aimLineBus.clearArrow();
                    return;
                }

                // Validate target is ally
                const targetPlayerNum = parseInt(target.cardId[0]);
                if (targetPlayerNum !== playerNum) {
                    showToast('Baptiste: Must target friendly column!');
                    setTimeout(() => clearToast(), 2000);
                    clearToast(); aimLineBus.clearArrow();
                    return;
                }

                clearToast(); aimLineBus.clearArrow();
                const liIndex = $(`#${target.cardId}`).closest('li').index();
                await doHealColumn(liIndex, playerNum);
            }
        } catch (e) {
            console.error('Baptiste onEnter error:', e);
            clearToast(); aimLineBus.clearArrow();
        }
    }));
}

export function onUltimate({ playerHeroId, rowId, cost }) {
    // Immortality Field - Cost 3 synergy
    // Makes Baptiste and adjacent slots invulnerable until start of next turn
    
    const playerNum = parseInt(playerHeroId[0]);
    const heroId = playerHeroId.slice(1);
    
    // Play ultimate sound (on resolve)
    try { 
        // Use provided ultimate file
        playAudioByKey('baptiste-ultimate'); 
    } catch {}
    
    // Set invulnerable slots using the new system
    window.__ow_setInvulnerableSlots?.(rowId, playerHeroId, rowId);
    
    // Add immortality field effect to the row for cleanup
    const immortalityEffect = {
        id: 'immortality-field',
        hero: 'baptiste',
        type: 'invulnerability',
        sourceCardId: playerHeroId,
        sourceRowId: rowId,
        on: 'turnstart', // Will be cleaned up on turn start
        tooltip: 'Immortality Field: Adjacent slots are invulnerable to damage'
    };
    
    // Add to row effects
    console.log('Adding immortality effect to row:', rowId, immortalityEffect);
    window.__ow_appendRowEffect?.(rowId, 'allyEffects', immortalityEffect);
    
    // Show toast message
    showToast('Immortality Field activated! Adjacent slots are invulnerable.');
    setTimeout(() => clearToast(), 2000);
    
    console.log(`Baptiste Immortality Field activated by ${playerHeroId} in ${rowId} (cost: ${cost})`);
}

// Cleanup function for turn start effects
export function cleanupImmortalityField(rowId) {
    console.log(`CLEANUP: Starting cleanup for row ${rowId}`);
    // Use the manual cleanup function
    window.__ow_cleanupImmortalityField?.(rowId);
    console.log(`CLEANUP: Immortality Field cleared for row ${rowId}`);
}

export default { onDraw, onEnter, onUltimate, cleanupImmortalityField };


