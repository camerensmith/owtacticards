import { firstEmptySlot, isRedeployLocked, occupiedCount } from '../../game/rules';
import { playCardIntent } from '../../presentation/intents';
import { disguiseMirageForAi } from '../../game/rosterRules';
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
        const lookup = fromWin || this.gameState?.cards?.[cardId] || null;
        if (!lookup) return null;
        const owner = parseInt(String(cardId || '')[0], 10);
        const seen = owner === 1 ? disguiseMirageForAi(lookup) : lookup;
        return { ...seen, cardId };
    }

    async playCard(cardId, rowKey) {
        // Use in-app dispatch bridge to move the card and trigger onEnter
        if (typeof window === 'undefined') throw new Error('playCard requires browser environment');

        const heroId = String(cardId || '').slice(1);
        // Mantis Cloak: AI deploys onto the enemy (player 1) rows.
        const allyMap = { front: '2f', middle: '2m', back: '2b' };
        const enemyMap = { front: '1f', middle: '1m', back: '1b' };
        const map = heroId === 'mantis' ? enemyMap : allyMap;
        let rowId = map[rowKey];
        if (!rowId) {
            rowId = heroId === 'mantis' ? '1m' : '2m';
        }

        if (isRedeployLocked(window.__ow_getCard?.(cardId), window.__ow_getTurnCount?.())) {
            throw new Error('Held until next turn');
        }

        // Capacity check - double check with actual row data
        const sideRows = heroId === 'mantis' ? ['1f', '1m', '1b'] : ['2f', '2m', '2b'];
        const currentRow = window.__ow_getRow?.(rowId);
        const currentCount = occupiedCount(currentRow?.cardIds);
        
        if (currentCount >= 4) {
            console.log(`Row ${rowId} is full (${currentCount}/4), finding alternative`);
            const counts = sideRows.map(id => ({ 
                id, 
                n: occupiedCount(window.__ow_getRow?.(id)?.cardIds)
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

        const handRow = window.__ow_getRow?.('player2hand');
        const startIndex = handRow?.cardIds?.indexOf(cardId);
        if (startIndex === -1 || startIndex === undefined) {
            console.warn('playCard: card not in Player 2 hand', cardId);
            return false;
        }

        const slotIndex = firstEmptySlot(window.__ow_getRow?.(rowId)?.cardIds);
        if (slotIndex < 0) throw new Error('All rows full');

        const queued = window.__ow_enqueuePlayCard?.(playCardIntent({
            cardId,
            startRowId: 'player2hand',
            finishRowId: rowId,
            slotIndex,
            playerNum: 2,
        }));
        if (queued === false || queued == null) {
            throw new Error('Theater locked');
        }
        await queued;
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


