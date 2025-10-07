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
        tooltip: 'Harmony: Heals 1 health at start of turn, then jumps to another ally',
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
        tooltip: 'Discord: Target takes +1 damage from attacks, jumps to another enemy at start of their turn',
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
        description: 'Heal ally and place token. Token heals 1 health at start of turn and jumps to another ally.'
    };
    const discordChoice = {
        name: 'Discord',
        title: 'Discord',
        description: 'Damage amplify enemy and place token. Target takes +1 damage from attacks, token jumps to another enemy at start of their turn.'
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

        showToast('Zenyatta: Select an ally to place Harmony token');

        // Target any friendly hero (including Zenyatta) - enforce ally-only
        const target = await selectCardTarget();
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

        showToast('Zenyatta: Select an enemy to place Discord token');

        // Target any enemy hero - enforce enemy-only
        const target = await selectCardTarget({ isDamage: true });
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
    
    if (newTarget) {
        // Remove token from current target
        window.__ow_removeCardEffect?.(cardId, harmonyToken.id);
        
        // Place token on new target preserving owner
        placeHarmonyToken(newTarget.cardId, owner);
        console.log(`Harmony: Jumped from ${cardId} to ${newTarget.cardId}`);
    }
}

export function processDiscordJump(cardId) {
    const card = window.__ow_getCard?.(cardId);
    if (!card || !Array.isArray(card.effects)) return;
    
    const discordToken = card.effects.find(effect => 
        effect?.hero === 'zenyatta' && effect?.type === 'discord'
    );
    
    if (!discordToken) return;
    
    // Try to jump to another enemy using token owner
    const owner = typeof discordToken.ownerPlayerNum === 'number' ? discordToken.ownerPlayerNum : (3 - parseInt(cardId[0]));
    const newTarget = findRandomEnemy(cardId, owner);
    
    if (newTarget) {
        // Remove token from current target
        window.__ow_removeCardEffect?.(cardId, discordToken.id);
        
        // Place token on new target preserving owner
        placeDiscordToken(newTarget.cardId, owner);
        console.log(`Discord: Jumped from ${cardId} to ${newTarget.cardId}`);
    }
}

export default { onEnter, onEnter1, onEnter2, onUltimate, processHarmonyJump, processDiscordJump };
