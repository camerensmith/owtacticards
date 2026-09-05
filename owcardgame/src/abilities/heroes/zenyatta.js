import { selectCardTarget } from '../engine/targeting';
import { dealDamage } from '../engine/damageBus';
import { playAudioByKey } from '../../assets/imageImports';
import { showMessage as showToast, clearMessage as clearToast } from '../engine/targetingBus';
import effectsBus, { Effects } from '../engine/effectsBus';
import { showOnEnterChoice } from '../engine/modalController';
import { withAIContext } from '../engine/aiContextHelper';

// Helper function to place Harmony token on a hero
function placeHarmonyToken(cardId, ownerPlayerNum) {
    const tokenId = `harmony-token-${Date.now()}`;
    const harmonyToken = {
        id: tokenId,
        hero: 'zenyatta',
        type: 'harmony',
        sourceCardId: cardId,
        ownerPlayerNum,
        tooltip: 'Harmony Orb: Heals 1 at the start of your turn, then jumps to a new ally. Discarded if the ally dies with it.',
        visual: 'harmony'
    };
    
    window.__ow_appendCardEffect?.(cardId, harmonyToken);
}

// Helper function to place Discord token on a hero
function placeDiscordToken(cardId, ownerPlayerNum) {
    const tokenId = `discord-token-${Date.now()}`;
    const discordToken = {
        id: tokenId,
        hero: 'zenyatta',
        type: 'discord',
        sourceCardId: cardId,
        ownerPlayerNum,
        tooltip: 'Discord Orb: +1 damage from attacks. Jumps to a new enemy at the start of their turn. Discarded if the enemy dies with it.',
        visual: 'discord'
    };
    
    window.__ow_appendCardEffect?.(cardId, discordToken);
}

// Helper function to find a random ally for Harmony to jump to
function findRandomAlly(excludeCardId, playerNum) {
    const friendlyRows = playerNum === 1 ? ['1f', '1m', '1b'] : ['2f', '2m', '2b'];
    const availableAllies = [];
    
    friendlyRows.forEach(rowId => {
        const row = window.__ow_getRow?.(rowId);
        if (row && row.cardIds) {
            row.cardIds.forEach(cardId => {
                if (cardId !== excludeCardId) {
                    const card = window.__ow_getCard?.(cardId);
                    if (card && card.health > 0) {
                        availableAllies.push({ cardId, rowId });
                    }
                }
            });
        }
    });
    
    if (availableAllies.length === 0) return null;
    return availableAllies[Math.floor(Math.random() * availableAllies.length)];
}

// Helper function to find a random enemy for Discord to jump to
function findRandomEnemy(excludeCardId, playerNum) {
    const enemyRows = playerNum === 1 ? ['2f', '2m', '2b'] : ['1f', '1m', '1b'];
    const availableEnemies = [];
    
    enemyRows.forEach(rowId => {
        const row = window.__ow_getRow?.(rowId);
        if (row && row.cardIds) {
            row.cardIds.forEach(cardId => {
                if (cardId !== excludeCardId) {
                    const card = window.__ow_getCard?.(cardId);
                    if (card && card.health > 0) {
                        availableEnemies.push({ cardId, rowId });
                    }
                }
            });
        }
    });
    
    if (availableEnemies.length === 0) return null;
    return availableEnemies[Math.floor(Math.random() * availableEnemies.length)];
}

export async function onEnter({ playerHeroId, rowId }) {
    const playerNum = parseInt(playerHeroId[0]);
    
    // For AI, automatically choose based on game state
    if (window.__ow_aiTriggering || window.__ow_isAITurn) {
        // AI logic: prefer Discord if enemies are present, otherwise Harmony
        const enemyRows = playerNum === 1 ? ['2f', '2m', '2b'] : ['1f', '1m', '1b'];
        const hasEnemies = enemyRows.some(rowId => {
            const row = window.__ow_getRow?.(rowId);
            return row?.cardIds?.length > 0;
        });
        
        if (hasEnemies) {
            await onEnter2({ playerHeroId, rowId, playerNum }); // Discord
        } else {
            await onEnter1({ playerHeroId, rowId, playerNum }); // Harmony
        }
        return;
    }
    
    // For human players, show choice modal
    const harmonyChoice = {
        name: 'Harmony',
        title: 'Harmony',
        description: 'Place Harmony Orb on an ally. They heal 1 at the start of your turn, then the orb jumps to a new ally. Discarded if they die with it.'
    };
    const discordChoice = {
        name: 'Discord',
        title: 'Discord',
        description: 'Place Discord Orb on an enemy. They take +1 from attacks. The orb jumps to a new enemy at the start of their turn. Discarded if they die with it.'
    };

    showOnEnterChoice('Zenyatta', harmonyChoice, discordChoice, async (choiceIndex) => {
        if (choiceIndex === 0) {
            await onEnter1({ playerHeroId, rowId, playerNum });
        } else if (choiceIndex === 1) {
            await onEnter2({ playerHeroId, rowId, playerNum });
        }
    });
}

export async function onEnter1({ playerHeroId, rowId, playerNum }) {
    if (!playerHeroId) {
        console.error("onEnter1: playerHeroId is undefined!");
        return;
    }
    try {
        // Play audio
        playAudioByKey('zenyatta-ability1');

        // For AI, auto-select a wounded ally (or any ally if none wounded)
        if (window.__ow_aiTriggering || window.__ow_isAITurn) {
            const friendlyRows = playerNum === 1 ? ['1f', '1m', '1b'] : ['2f', '2m', '2b'];
            let bestTarget = null;
            let bestScore = -1;
            for (const r of friendlyRows) {
                const row = window.__ow_getRow?.(r);
                if (!row?.cardIds) continue;
                for (const cid of row.cardIds) {
                    const card = window.__ow_getCard?.(cid);
                    if (!card || card.health <= 0) continue;
                    // Skip if already has harmony token
                    if (Array.isArray(card.effects) && card.effects.some(e => e?.type === 'harmony')) continue;
                    const maxH = card.maxHealth || card.health;
                    const score = card.health < maxH ? 2 : 1;
                    if (score > bestScore) { bestScore = score; bestTarget = cid; }
                }
            }
            if (!bestTarget) { clearToast(); return; }
            placeHarmonyToken(bestTarget, playerNum);
            clearToast();
            showToast('Harmony: Token placed - will heal at start of turn');
            setTimeout(() => clearToast(), 1500);
            return;
        }

        showToast('Zenyatta: Select an ally to place Harmony token');

        // Target any friendly hero (including Zenyatta) - enforce ally-only
        const target = await selectCardTarget({ isHeal: true, isBuff: true });
        if (!target) {
            clearToast();
            return;
        }

        // Safety check: ensure target.cardId is valid
        if (!target.cardId || typeof target.cardId !== 'string') {
            showToast('Zenyatta: Invalid target selected');
            setTimeout(() => clearToast(), 1500);
            return;
        }

        // Validate target is an ally
        const targetPlayerNum = parseInt(target.cardId[0]);
        if (targetPlayerNum !== playerNum) {
            showToast('Harmony: Must target an ally!');
            setTimeout(() => clearToast(), 2000);
            return;
        }

        // Place Harmony token with owner tracking
        placeHarmonyToken(target.cardId, playerNum);

        // Clear targeting message and show confirmation
        clearToast();
        showToast('Harmony: Token placed - will heal at start of turn');
        setTimeout(() => clearToast(), 1500);

    } catch (error) {
        console.error('Zenyatta Harmony Error:', error);
        showToast('Harmony: Error occurred');
        setTimeout(() => clearToast(), 1500);
    }
}

export async function onEnter2({ playerHeroId, rowId, playerNum }) {
    if (!playerHeroId) {
        console.error("onEnter2: playerHeroId is undefined!");
        return;
    }
    try {
        // Play audio
        playAudioByKey('zenyatta-ability2');

        // For AI, auto-select highest-power enemy that doesn't already have Discord
        if (window.__ow_aiTriggering || window.__ow_isAITurn) {
            const enemyRows = playerNum === 1 ? ['2f', '2m', '2b'] : ['1f', '1m', '1b'];
            let bestTarget = null;
            let bestScore = -1;
            for (const r of enemyRows) {
                const row = window.__ow_getRow?.(r);
                if (!row?.cardIds) continue;
                for (const cid of row.cardIds) {
                    const card = window.__ow_getCard?.(cid);
                    if (!card || card.health <= 0) continue;
                    // Skip immune targets
                    if (Array.isArray(card.effects) && card.effects.some(e => e?.type === 'immunity')) continue;
                    // Skip targets that already have discord
                    if (Array.isArray(card.effects) && card.effects.some(e => e?.type === 'discord')) continue;
                    const rowPos = r[1];
                    const score = (card[`${rowPos}_power`] || 0) + (card[`${rowPos}_synergy`] || 0);
                    if (score > bestScore) { bestScore = score; bestTarget = cid; }
                }
            }
            if (!bestTarget) { clearToast(); return; }
            placeDiscordToken(bestTarget, playerNum);
            clearToast();
            showToast('Discord: Token placed on target');
            setTimeout(() => clearToast(), 1500);
            return;
        }

        showToast('Zenyatta: Select an enemy to place Discord token');

        // Target any enemy hero - enforce enemy-only
        const target = await selectCardTarget({ isDamage: true, isDebuff: true });
        if (!target) {
            clearToast();
            return;
        }

        // Validate target is an enemy
        const targetPlayerNum = parseInt(target.cardId[0]);
        if (targetPlayerNum === playerNum) {
            showToast('Discord: Must target an enemy!');
            setTimeout(() => clearToast(), 2000);
            return;
        }

        // Validate target card exists and is alive
        const targetCard = window.__ow_getCard?.(target.cardId);
        if (!targetCard || targetCard.health <= 0) {
            showToast('Discord: Invalid or dead target');
            setTimeout(() => clearToast(), 1500);
            return;
        }

        // Place Discord token with owner tracking
        placeDiscordToken(target.cardId, playerNum);

        // Clear targeting message and show confirmation
        clearToast();
        showToast('Discord: Token placed on target');
        setTimeout(() => clearToast(), 1500);

    } catch (error) {
        console.error('Zenyatta Discord Error:', error);
        showToast('Discord: Error occurred');
        setTimeout(() => clearToast(), 1500);
    }
}

export async function onUltimate({ playerHeroId, rowId, cost }) {
    try {
        // Play ultimate audio
        playAudioByKey('zenyatta-ultimate');
        
        // Heal all allies in Zenyatta's row (excluding Zenyatta)
        const playerNum = parseInt(playerHeroId[0]);
        const currentRow = window.__ow_getRow?.(rowId);

        // AI gating: only use ultimate if at least one ally in row is damaged
        if (window.__ow_aiTriggering || window.__ow_isAITurn) {
            const anyDamaged = Array.isArray(currentRow?.cardIds) && currentRow.cardIds.some(cid => {
                if (cid === playerHeroId) return false;
                const c = window.__ow_getCard?.(cid);
                if (!c || c.health <= 0) return false;
                const maxH = c.maxHealth || c.health;
                return c.health < maxH;
            });
            if (!anyDamaged) {
                showToast('Zenyatta AI: Skipping Transcendence (no damaged ally in row)');
                setTimeout(() => clearToast(), 1500);
                return;
            }
        }
        
        if (currentRow && currentRow.cardIds) {
            currentRow.cardIds.forEach(cardId => {
                if (cardId !== playerHeroId) { // Exclude Zenyatta
                    const card = window.__ow_getCard?.(cardId);
                    if (card && card.health > 0) {
                        const currentHealth = card.health;
                        const maxHealth = card.maxHealth || 0;
                        const newHealth = Math.min(maxHealth, currentHealth + 2);
                        
                        if (newHealth > currentHealth) {
                            window.__ow_setCardHealth?.(cardId, newHealth);
                            
                            // Show floating healing text
                            effectsBus.publish(Effects.showHeal(cardId, 2));
                        }
                    }
                }
            });
        }
        
        // Make Zenyatta immune to damage for the remainder of the round
        const immunityToken = {
            id: `zenyatta-immunity-${Date.now()}`,
            hero: 'zenyatta',
            type: 'immunity',
            sourceCardId: playerHeroId,
            tooltip: 'Transcendence: Immune to all damage for the remainder of the round',
            visual: 'zenyatta-icon'
        };
        
        window.__ow_appendCardEffect?.(playerHeroId, immunityToken);
        
        // Ultimate is immediate, no resolve audio needed
        
        // Track ultimate usage
        window.__ow_trackUltimateUsed?.(playerHeroId);
        
        showToast('Transcendence: Allies healed, Zenyatta immune to damage');
        setTimeout(() => clearToast(), 2000);
        
    } catch (error) {
        console.error('Zenyatta Ultimate Error:', error);
        showToast('Transcendence: Error occurred');
        setTimeout(() => clearToast(), 1500);
    }
}

// Turn effects for token jumping
export function processHarmonyJump(cardId) {
    const card = window.__ow_getCard?.(cardId);
    if (!card || !Array.isArray(card.effects)) return;
    
    const harmonyToken = card.effects.find(effect => 
        effect?.hero === 'zenyatta' && effect?.type === 'harmony'
    );
    
    if (!harmonyToken) return;

    // Printed: orb is discarded if the ally dies with it — it does not jump.
    if ((card.health || 0) <= 0) {
        window.__ow_removeCardEffect?.(cardId, harmonyToken.id);
        return;
    }
    
    // Heal the target
    const currentHealth = card.health;
    const maxHealth = card.maxHealth || 0;
    const newHealth = Math.min(maxHealth, currentHealth + 1);
    
    if (newHealth > currentHealth) {
        window.__ow_setCardHealth?.(cardId, newHealth);
        
        // Show floating healing text
        effectsBus.publish(Effects.showHeal(cardId, 1));
    }
    
    // Try to jump to another ally using token owner
    const owner = typeof harmonyToken.ownerPlayerNum === 'number' ? harmonyToken.ownerPlayerNum : parseInt(cardId[0]);
    const newTarget = findRandomAlly(cardId, owner);
    
    // Remove from the current holder either way: the orb always leaves.
    window.__ow_removeCardEffect?.(cardId, harmonyToken.id);

    if (newTarget) {
        placeHarmonyToken(newTarget.cardId, owner);
        console.log(`Harmony: Jumped from ${cardId} to ${newTarget.cardId}`);
    } else {
        // Nowhere left to go — the orb winks out rather than sticking.
        console.log(`Harmony: No ally left to jump to; orb discarded from ${cardId}`);
    }
}

export function processDiscordJump(cardId) {
    const card = window.__ow_getCard?.(cardId);
    if (!card || !Array.isArray(card.effects)) return;
    
    const discordToken = card.effects.find(effect => 
        effect?.hero === 'zenyatta' && effect?.type === 'discord'
    );
    
    if (!discordToken) return;

    // Printed: discarded if the enemy dies whilst afflicted — it does not jump.
    if ((card.health || 0) <= 0) {
        window.__ow_removeCardEffect?.(cardId, discordToken.id);
        return;
    }
    
    // Try to jump to another enemy using token owner
    const owner = typeof discordToken.ownerPlayerNum === 'number' ? discordToken.ownerPlayerNum : (3 - parseInt(cardId[0]));
    const newTarget = findRandomEnemy(cardId, owner);
    
    window.__ow_removeCardEffect?.(cardId, discordToken.id);

    if (newTarget) {
        placeDiscordToken(newTarget.cardId, owner);
        console.log(`Discord: Jumped from ${cardId} to ${newTarget.cardId}`);
    } else {
        console.log(`Discord: No enemy left to jump to; orb discarded from ${cardId}`);
    }
}

export default { onEnter, onEnter1, onEnter2, onUltimate, processHarmonyJump, processDiscordJump };
