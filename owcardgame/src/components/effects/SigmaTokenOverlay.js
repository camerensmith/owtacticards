import React, { useContext } from 'react';
import gameContext from '../../context/gameContext';
import ShieldCounter from '../counters/ShieldCounter';

export default function SigmaTokenOverlay({ rowId }) {
    const { gameState } = useContext(gameContext);
    
    // Check if this row has a Sigma token
    const row = gameState.rows[rowId];
    if (!row || !row.allyEffects) return null;
    
    const sigmaToken = row.allyEffects.find(effect => 
        effect?.id === 'sigma-token' && effect?.type === 'barrier'
    );
    
    if (!sigmaToken) return null;
    
    const remainingShields = sigmaToken.shields || 0;
    const maxShields = sigmaToken.maxShields || 3;
    
    return (
        <div className="sigma-token-overlay" style={{
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
            <div className="sigma-token-icon" style={{
                width: '40px',
                height: '40px',
                backgroundImage: 'url(/src/assets/heroes/sigma-icon.png)',
                backgroundSize: 'contain',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
                marginBottom: '5px'
            }} />
            <ShieldCounter 
                type="rowcounter" 
                shield={remainingShields} 
            />
        </div>
    );
}
