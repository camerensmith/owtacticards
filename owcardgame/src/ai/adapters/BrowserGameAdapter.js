import GameAdapter from './GameAdapter';

export default class BrowserGameAdapter extends GameAdapter {
    constructor(gameState = null) {
        super(gameState);
    }

    getRow(rowId) {
        const fromWin = typeof window !== 'undefined' && window.__ow_getRow ? window.__ow_getRow(rowId) : null;
        if (fromWin && fromWin.cardIds) return fromWin;
        const fromState = this.gameState?.rows?.[rowId];
        return fromState || null;
    }

    getCard(cardId) {
        const fromWin = typeof window !== 'undefined' && window.__ow_getCard ? window.__ow_getCard(cardId) : null;
        if (fromWin) return { ...fromWin, cardId };
        const lookup = this.gameState?.cards?.[cardId];
        return lookup ? { ...lookup, cardId } : null;
    }

    async playCard(cardId, rowKey) {
        // Use in-app dispatch bridge to move the card and trigger onEnter
        if (typeof window === 'undefined') throw new Error('playCard requires browser environment');

        const map = { front: '2f', middle: '2m', back: '2b' };
        let rowId = map[rowKey];
        if (!rowId) {
            // Fallback to middle
            rowId = '2m';
        }

        // Capacity check - double check with actual row data
        const currentRow = window.__ow_getRow?.(rowId);
        const currentCount = currentRow?.cardIds?.length || 0;
        
        if (currentCount >= 4) {
            console.log(`Row ${rowId} is full (${currentCount}/4), finding alternative`);
            // Find least-filled available row
            const counts = ['2f','2m','2b'].map(id => ({ 
                id, 
                n: window.__ow_getRow?.(id)?.cardIds?.length || 0 
            }));
            const available = counts.filter(c => c.n < 4);
            if (available.length === 0) {
                console.log('All rows full, cannot place card');
                throw new Error('All rows full');
            }
            available.sort((a,b)=>a.n-b.n);
            rowId = available[0].id;
            console.log(`Switching to row ${rowId} (${available[0].n}/4)`);
        }

        // Enforce per-side max heroes (6) before placing
        const totalOnBoard = (window.__ow_getRow?.('2f')?.cardIds?.length || 0) +
                             (window.__ow_getRow?.('2m')?.cardIds?.length || 0) +
                             (window.__ow_getRow?.('2b')?.cardIds?.length || 0);
        const maxPerSide = typeof window.__ow_getGameLogic === 'function' ? (window.__ow_getGameLogic()?.maxHeroesPerPlayer || 6) : 6;
        if (totalOnBoard >= maxPerSide) {
            console.log(`AI placement blocked: side capacity ${totalOnBoard}/${maxPerSide}`);
            throw new Error('Side capacity reached');
        }

        const handRow = window.__ow_getRow?.('player2hand');
        const startIndex = handRow?.cardIds?.indexOf(cardId);
        if (startIndex === -1 || startIndex === undefined) throw new Error('Card not found in hand');

        // Move card to target row
        window.__ow_dispatch?.({
            type: 'move-card',
            payload: {
                targetCardId: cardId,
                startRowId: 'player2hand',
                finishRowId: rowId,
                startIndex,
                finishIndex: 0
            }
        });

        // Mark as played and set enteredTurn
        window.__ow_dispatch?.({
            type: 'edit-card',
            payload: {
                playerNum: 2,
                targetCardId: cardId,
                editKeys: ['isPlayed', 'enteredTurn', 'synergy'],
                editValues: [true, window.__ow_getTurnCount?.() || 1, { f: 0, m: 0, b: 0 }]
            }
        });

        // Apply synergy to the row if any
        const finishPosition = rowId[1];
        const card = window.__ow_getCard?.(cardId);
        const addSynergy = card?.synergy?.[finishPosition] || 0;
        if (addSynergy > 0) {
            window.__ow_dispatch?.({
                type: 'update-synergy',
                payload: { rowId, synergyCost: addSynergy }
            });
        }

        // Trigger onEnter abilities (AI targeting overrides handle choice)
        if (window.__ow_triggerOnEnter) {
            setTimeout(() => window.__ow_triggerOnEnter(cardId, rowId, 2), 300);
        }

        return true;
    }

    async useAbility(cardId, abilityKey, target) {
        if (typeof window !== 'undefined' && window.__ow_useAbility) {
            return await window.__ow_useAbility(cardId, abilityKey, target);
        }
        // Gracefully succeed if no bridge exists yet
        return false;
    }

    async useUltimate(cardId, target) {
        if (typeof window !== 'undefined' && window.__ow_useUltimate) {
            return await window.__ow_useUltimate(cardId, target);
        }
        // Gracefully succeed if no bridge exists yet
        return false;
    }
}


