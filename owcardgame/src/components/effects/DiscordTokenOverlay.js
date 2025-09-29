import React, { useContext } from 'react';
import gameContext from '../../context/gameContext';

export default function DiscordTokenOverlay({ cardId }) {
    const { gameState } = useContext(gameContext);

    // Get the card data
    const playerNum = parseInt(cardId[0]);
    const card = gameState.playerCards[`player${playerNum}cards`]?.cards?.[cardId];
    
    if (!card || !Array.isArray(card.effects)) return null;

    // Find Discord token on this card
    const discordToken = card.effects.find(effect => 
        effect?.hero === 'zenyatta' && effect?.type === 'discord'
    );

    // Debug logging
    console.log(`DiscordTokenOverlay: Card ${cardId} has effects:`, card.effects);
    console.log(`DiscordTokenOverlay: Card ${cardId} has Discord token:`, discordToken);

    if (!discordToken) return null;

    return (
        <div className="discord-token-overlay" style={{
            position: 'absolute',
            top: '5px',
            right: '5px',
            zIndex: 15,
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        }}>
            <div className="discord-token-icon" style={{
                width: '24px',
                height: '24px',
                backgroundImage: 'url(/src/assets/discord.png)',
                backgroundSize: 'contain',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid #f44336',
                borderRadius: '50%',
                backgroundColor: 'rgba(0, 0, 0, 0.7)'
            }}>
            </div>
        </div>
    );
}
