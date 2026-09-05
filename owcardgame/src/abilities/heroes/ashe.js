import $ from 'jquery';
import { showOnEnterChoice } from '../engine/modalController';
import { dealDamage } from '../engine/damageBus';
import effectsBus, { Effects } from '../engine/effectsBus';
import crosshair from '../../assets/crosshair.svg';
import { clearMessage, showMessage as showToast, clearMessage as clearToast } from '../engine/targetingBus';
import { selectCardTargets } from '../engine/targeting';
import { getAudioFile, playAudioByKey } from '../../assets/imageImports';
import { withAIContext } from '../engine/aiContextHelper';

function setTargetingCursor(active) {
    try {
        if (active) {
            document.body.style.cursor = `url(${crosshair}) 5 5, crosshair`;
        } else {
            document.body.style.cursor = '';
        }
    } catch (e) {}
}

function playAbilitySound(abilityNumber) {
    try {
        const audioSrc = getAudioFile(`ashe-ability${abilityNumber}`);
        if (audioSrc) {
            console.log(`Playing Ashe ability ${abilityNumber} sound...`);
            const audio = new Audio(audioSrc);
            audio.play().then(() => {
                console.log(`Ashe ability ${abilityNumber} sound played successfully`);
            }).catch(err => {
                console.log(`Ashe ability ${abilityNumber} sound play failed:`, err);
            });
        }
    } catch (err) {
        console.log(`Ashe ability ${abilityNumber} audio creation failed:`, err);
    }
}

// Ashe modular onEnter implementation
export async function onEnter({ playerHeroId, rowId }) {
    const playerNum = parseInt(playerHeroId[0]);
    const choice1 = {
        name: 'The Viper',
        title: 'The Viper',
        description: 'Deal 2 damage to one enemy ignoring shields.'
    };
    const choice2 = {
        name: 'The Viper (Split Fire)',
        title: 'The Viper (Split Fire)',
        description: 'Deal 1 damage to two enemies in the same row ignoring shields.'
    };

    // For AI, automatically choose based on game state
    if (window.__ow_aiTriggering || window.__ow_isAITurn) {
        // AI logic: prefer single target for more damage
        await onEnter1({ playerHeroId, rowId, playerNum });
        return;
    }
    
    // For human players, show choice modal
    showOnEnterChoice('Ashe', choice1, choice2, async (choiceIndex) => {
        if (choiceIndex === 0) {
            await onEnter1({ playerHeroId, rowId, playerNum });
        } else if (choiceIndex === 1) {
            await onEnter2({ playerHeroId, rowId, playerNum });
        }
    });
}

// Single target damage (2 damage ignoring shields)
export async function onEnter1({ playerHeroId, rowId, playerNum }) {
    // For AI, automatically select a random enemy
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
            showToast('Ashe AI: No enemies to target');
            setTimeout(() => clearToast(), 2000);
            return;
        }
        
        // Select random enemy
        const randomEnemy = livingEnemies[Math.floor(Math.random() * livingEnemies.length)];
        console.log('Ashe AI: Selected random enemy:', randomEnemy.cardId);
        
        // Deal damage
        dealDamage(randomEnemy.cardId, randomEnemy.rowId, 2, true, playerHeroId);
        try { effectsBus.publish(Effects.showDamage(randomEnemy.cardId, 2)); } catch {}
        playAbilitySound(1);
        playAudioByKey('ashe-shoot1');
        
        showToast('Ashe AI: The Viper - 2 damage to enemy');
        setTimeout(() => clearToast(), 2000);
        return;
    }
    
    // Human player logic
    setTargetingCursor(true);

    try {
        const [target] = await selectCardTargets({
            label: 'Ashe: The Viper — choose an enemy',
            isDamage: true,
            sourceCardId: playerHeroId,
            rules: { side: 'enemy', casterPlayerNum: playerNum },
        });
        if (!target) {
            setTargetingCursor(false);
            clearMessage();
            return;
        }

        dealDamage(target.cardId, target.rowId, 2, true, playerHeroId);
        try { effectsBus.publish(Effects.showDamage(target.cardId, 2)); } catch {}
        playAbilitySound(1);
        playAudioByKey('ashe-shoot1');

    } catch (error) {
        console.error('Ashe ability 1 error:', error);
    }

    setTargetingCursor(false);
    clearMessage();
}

// Dual target damage (1 damage to two enemies in same row)
export async function onEnter2({ playerHeroId, rowId, playerNum }) {
    // For AI, automatically select two enemies in the same row
    if (window.__ow_aiTriggering || window.__ow_isAITurn) {
        const enemyPlayer = playerNum === 1 ? 2 : 1;
        const enemyRows = [`${enemyPlayer}f`, `${enemyPlayer}m`, `${enemyPlayer}b`];
        
        // Find all living enemy heroes grouped by row
        const enemiesByRow = {};
        for (const enemyRowId of enemyRows) {
            enemiesByRow[enemyRowId] = [];
            const row = window.__ow_getRow?.(enemyRowId);
            if (row && row.cardIds) {
                for (const cardId of row.cardIds) {
                    const card = window.__ow_getCard?.(cardId);
                    if (card && card.health > 0) {
                        enemiesByRow[enemyRowId].push({ cardId, rowId: enemyRowId });
                    }
                }
            }
        }
        
        // Find a row with at least 2 enemies
        let targetRow = null;
        for (const [rowId, enemies] of Object.entries(enemiesByRow)) {
            if (enemies.length >= 2) {
                targetRow = rowId;
                break;
            }
        }
        
        if (!targetRow) {
            showToast('Ashe AI: No row with 2+ enemies for split fire');
            setTimeout(() => clearToast(), 2000);
            return;
        }
        
        // Select 2 random enemies from that row
        const rowEnemies = enemiesByRow[targetRow];
        const shuffled = [...rowEnemies].sort(() => Math.random() - 0.5);
        const targets = shuffled.slice(0, 2);
        
        console.log('Ashe AI: Selected 2 enemies for split fire:', targets.map(t => t.cardId));
        
        // Deal damage to both targets
        dealDamage(targets[0].cardId, targets[0].rowId, 1, true, playerHeroId);
        dealDamage(targets[1].cardId, targets[1].rowId, 1, true, playerHeroId);
        try { effectsBus.publish(Effects.showDamage(targets[0].cardId, 1)); } catch {}
        try { effectsBus.publish(Effects.showDamage(targets[1].cardId, 1)); } catch {}
        playAbilitySound(2);
        playAudioByKey('ashe-shoot2');
        
        showToast('Ashe AI: Split Fire - 1 damage to 2 enemies');
        setTimeout(() => clearToast(), 2000);
        return;
    }
    
    // Human player logic
    setTargetingCursor(true);

    try {
        /*
         * Two enemies in one row, but one is enough to shoot.
         *
         * Split Fire used to demand both picks and abandon the ability if the
         * second was in another row — which meant it could never be cast at all
         * against a row holding a single defender. Right-clicking after the
         * first pick now fires at just that target.
         */
        const targets = await selectCardTargets({
            count: 2,
            label: 'Ashe: Split Fire — choose enemies in one row',
            isDamage: true,
            sourceCardId: playerHeroId,
            rules: { side: 'enemy', sameRow: true, casterPlayerNum: playerNum },
        });

        if (targets.length === 0) {
            setTargetingCursor(false);
            clearMessage();
            return;
        }

        for (const target of targets) {
            dealDamage(target.cardId, target.rowId, 1, true, playerHeroId);
            try { effectsBus.publish(Effects.showDamage(target.cardId, 1)); } catch {}
        }
        playAbilitySound(2);
        playAudioByKey('ashe-shoot2');
    } catch (error) {
        console.error('Ashe ability 2 error:', error);
    }

    setTargetingCursor(false);
    clearMessage();
}

// Ultimate - B.O.B. (3): Draw the B.O.B. Hero Card into your hand
export async function onUltimate({ playerHeroId, rowId, cost }) {
    const playerNum = parseInt(playerHeroId[0]);
    
    // Play ultimate sound
    try {
        playAudioByKey('ashe-ultimate');
    } catch {}
    
    showToast('Ashe: Deploying B.O.B.!');
    
    try {
        // Add B.O.B. to hand
        window.__ow_addSpecialCardToHand?.(playerNum, 'bob');
        
        // Play ultimate resolve sound
        try {
            playAudioByKey('ashe-ultimate-resolve');
        } catch {}
        
        showToast('Ashe: B.O.B. added to hand!');
        setTimeout(() => clearToast(), 2000);
        
        // FOR AI: Force play BOB immediately after adding to hand
        if (playerNum === 2 && (window.__ow_aiTriggering || window.__ow_isAITurn)) {
            console.log('Ashe AI: BOB added - forcing immediate play');
            setTimeout(async () => {
                const handRow = window.__ow_getRow?.('player2hand');
                const handIds = handRow?.cardIds || [];
                const bobCardId = '2bob';
                
                if (handIds.includes(bobCardId)) {
                    console.log('Ashe AI: BOB found in hand - MANDATORY play to front row');
                    try {
                        // Find best row for BOB (prefer front for tanking, then middle, then back)
                        const rowCounts = {
                            front: window.__ow_getRow?.('2f')?.cardIds?.length || 0,
                            middle: window.__ow_getRow?.('2m')?.cardIds?.length || 0,
                            back: window.__ow_getRow?.('2b')?.cardIds?.length || 0
                        };
                        
                        let targetRow;
                        if (rowCounts.front < 4) targetRow = 'front';
                        else if (rowCounts.middle < 4) targetRow = 'middle';
                        else if (rowCounts.back < 4) targetRow = 'back';
                        else {
                            console.warn('Ashe AI: All rows full, cannot play BOB');
                            return;
                        }
                        
                        // Force play BOB
                        if (window.__ow_aiIntegration?.playCard) {
                            await window.__ow_aiIntegration.playCard(bobCardId, targetRow);
                            console.log(`Ashe AI: Successfully force-played BOB to ${targetRow} row`);
                        }
                    } catch (error) {
                        console.error('Ashe AI: Failed to force-play BOB:', error);
                    }
                } else {
                    console.warn('Ashe AI: BOB not found in hand after timeout');
                }
            }, 300);
        }
        
    } catch (error) {
        console.error('Ashe B.O.B. ultimate error:', error);
        showToast('Ashe ultimate cancelled');
        setTimeout(() => clearToast(), 1500);
    }
}

export default { onEnter, onUltimate };


