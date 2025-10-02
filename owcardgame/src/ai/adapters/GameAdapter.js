/**
 * GameAdapter defines the read/write contract the AI uses to interact with the game.
 * Provide environment-specific implementations (e.g., BrowserGameAdapter, MockAdapter).
 */

export default class GameAdapter {
    /**
     * @param {object} gameState optional reference to game state if needed by the adapter
     */
    constructor(gameState = null) {
        this.gameState = gameState;
    }

    /**
     * Retrieve a row by id (e.g., '1f', '2m', 'player2hand').
     * Expected to return an object with at least { cardIds?: string[], power?: number, synergy?: number, allyEffects?: any[], enemyEffects?: any[] }.
     */
    getRow(rowId) {
        throw new Error('getRow not implemented');
    }

    /**
     * Retrieve multiple rows at once.
     */
    getRows(rowIds) {
        return rowIds.map(id => this.getRow(id));
    }

    /**
     * Retrieve a card by id. Should return a canonical card object and preserve cardId when possible.
     */
    getCard(cardId) {
        throw new Error('getCard not implemented');
    }

    /**
     * Return array of full card objects in player's hand with cardId preserved.
     */
    getHand(playerNum) {
        const handId = `player${playerNum}hand`;
        const row = this.getRow(handId);
        const cardIds = row?.cardIds || [];
        return cardIds
            .map(id => {
                const card = this.getCard(id);
                return card ? { ...card, cardId: id } : null;
            })
            .filter(Boolean);
    }

    /**
     * Return board structure: { front: Card[], middle: Card[], back: Card[] }
     */
    getBoard(playerNum) {
        const mapIdToKey = id => (id.endsWith('f') ? 'front' : id.endsWith('m') ? 'middle' : 'back');
        const rows = [`${playerNum}f`, `${playerNum}m`, `${playerNum}b`];
        const board = { front: [], middle: [], back: [] };
        rows.forEach(rowId => {
            const row = this.getRow(rowId);
            const key = mapIdToKey(rowId);
            const cardIds = row?.cardIds || [];
            board[key] = cardIds
                .map(id => this.getCard(id))
                .filter(Boolean);
        });
        return board;
    }

    /**
     * Command: play a card into a row. Should validate and trigger game logic.
     */
    async playCard(cardId, rowKey /* 'front'|'middle'|'back' */) {
        throw new Error('playCard not implemented');
    }

    /**
     * Command: use a card ability with a target.
     */
    async useAbility(cardId, abilityKey, target) {
        throw new Error('useAbility not implemented');
    }

    /**
     * Command: use an ultimate ability with a target.
     */
    async useUltimate(cardId, target) {
        throw new Error('useUltimate not implemented');
    }
}


