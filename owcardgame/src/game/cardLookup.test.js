import { ownerNumOf, playerCardsKey, getCardFromState } from './cardLookup';

test('ownerNumOf', () => {
    expect(ownerNumOf('1fika')).toBe(1);
    expect(ownerNumOf('2warden')).toBe(2);
    expect(ownerNumOf('')).toBeNull();
});

test('getCardFromState finds a card on the enemy row', () => {
    const gameState = {
        playerCards: {
            player1cards: { cards: { '1fika': { health: 2, power: { m: 3 } } } },
            player2cards: { cards: {} },
        },
    };
    expect(getCardFromState(gameState, '1fika').power.m).toBe(3);
});
