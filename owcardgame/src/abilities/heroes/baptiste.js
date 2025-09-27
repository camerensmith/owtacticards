import $ from 'jquery';
import { selectCardTarget } from '../engine/targeting';
import { showMessage as showToast, clearMessage as clearToast } from '../engine/targetingBus';
import aimLineBus from '../engine/aimLineBus';
import { dealDamage } from '../engine/damageBus';
import effectsBus, { Effects } from '../engine/effectsBus';
import { getAudioFile, playAudioByKey } from '../../assets/imageImports';
import { showOnEnterChoice } from '../engine/modalController';

export function onDraw() {
    try { playAudioByKey('baptiste-intro'); } catch {}
}

export function onEnter({ playerHeroId, rowId }) {
    const playerNum = parseInt(playerHeroId[0]);
    try { playAudioByKey('baptiste-enter'); } catch {}
    const opt1 = { name: 'Biotic Launcher (Damage)', description: 'Deal 1 damage to up to 3 adjacent enemies in target column (respects shields).' };
    const opt2 = { name: 'Biotic Launcher (Heal)', description: 'Heal 1 to up to 3 adjacent allies in target column (cap at max HP).' };

    showOnEnterChoice('Baptiste', opt1, opt2, async (choiceIndex) => {
        try {
            const sourceId = `${playerNum}baptiste`;
            aimLineBus.setArrowSource(sourceId);
            showToast('Baptiste: Pick a column (click any card in it)');
            const { cardId, rowId: clickedRow } = await selectCardTarget();
            clearToast(); aimLineBus.clearArrow();
            const liIndex = $(`#${cardId}`).closest('li').index();

            const doDamageColumn = async () => {
                const enemyPlayer = playerNum === 1 ? 2 : 1;
                const enemyRows = [`${enemyPlayer}f`, `${enemyPlayer}m`, `${enemyPlayer}b`];
                // Collect tuples of [pid, rowId] at the selected column index
                const rawTargets = enemyRows
                    .map(r => {
                        const cardIds = window.__ow_getRow?.(r)?.cardIds || [];
                        if (liIndex < 0 || liIndex >= cardIds.length) return null;
                        const pid = cardIds[liIndex];
                        return pid ? [pid, r] : null;
                    })
                    .filter(Boolean);

                // De-duplicate by pid just in case
                const seen = new Set();
                const targets = [];
                for (const [pid, r] of rawTargets) {
                    if (!seen.has(pid)) { seen.add(pid); targets.push([pid, r]); }
                }

                // Apply damage to up to 3 (front/middle/back)
                for (const [pid, r] of targets) {
                    dealDamage(pid, r, 1, false, playerHeroId);
                    effectsBus.publish(Effects.showDamage(pid, 1));
                }
                playAudioByKey('baptiste-ability1');
            };

            const doHealColumn = async () => {
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

            if (choiceIndex === 0) {
                await doDamageColumn();
            } else {
                await doHealColumn();
            }
        } catch (e) {
            clearToast(); aimLineBus.clearArrow();
        }
    });
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


