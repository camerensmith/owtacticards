import React from 'react';

const SuitedUpOverlay = ({ effects }) => {
    const suitedUpEffect = Array.isArray(effects) ? effects.find(effect => effect.id === 'suited-up') : null;
    
    if (!suitedUpEffect) return null;
    
    return (
        <div className="suited-up-overlay">
            <div className="suited-up-text">SUITED UP</div>
            <div className="suited-up-subtitle">Piloting MEKA</div>
        </div>
    );
};

export default SuitedUpOverlay;
