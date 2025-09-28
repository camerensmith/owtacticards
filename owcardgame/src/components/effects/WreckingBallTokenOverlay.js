import React, { useContext } from 'react';
import gameContext from '../../context/gameContext';

export default function WreckingBallTokenOverlay({ rowId }) {
    const { gameState } = useContext(gameContext);
    
    // Check if this row has Wrecking Ball minefield tokens
    const row = gameState.rows[rowId];
    if (!row || !row.enemyEffects) return null;
    
    const minefieldToken = row.enemyEffects.find(effect => 
        effect?.hero === 'wreckingball' && effect?.type === 'minefield'
    );
    
    if (!minefieldToken || minefieldToken.charges <= 0) return null;
    
    const totalCharges = minefieldToken.charges;
    
    return (
        <div className="wreckingball-token-overlay" style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            zIndex: 20,
            pointerEvents: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '5px'
        }}>
            <div className="wreckingball-token-icon" style={{
                width: '40px',
                height: '40px',
                backgroundImage: 'url(/src/assets/heroes/wreckingball-icon.png)',
                backgroundSize: 'contain',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <div style={{
                    fontSize: '16px',
                    fontWeight: 'bold',
                    color: '#ff6b35',
                    textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                    background: 'rgba(0, 0, 0, 0.6)',
                    borderRadius: '50%',
                    width: '24px',
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid #ff6b35',
                    position: 'absolute',
                    top: '-5px',
                    right: '-5px'
                }}>
                    {totalCharges}
                </div>
            </div>
        </div>
    );
}
