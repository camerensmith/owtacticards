import React from 'react';
import { heroCardFocusImages, heroCardImages } from '../../assets/imageImports';

export default function CardFocusLite({ focus, onClose }) {
    if (!focus) return null;
    const { playerHeroId } = focus;
    const heroId = playerHeroId.slice(1);
    const img = heroCardFocusImages[heroId] || heroCardImages[heroId];
    if (!img) return null;

    const backdrop = {
        position: 'fixed',
        inset: 0,
        background: 'transparent', // No black overlay
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        pointerEvents: 'auto', // Allow clicks to close
    };
    const imgStyle = {
        maxWidth: '60vw',
        maxHeight: '60vh',
        boxShadow: '0 10px 30px rgba(0,0,0,0.8)',
        borderRadius: 8,
        border: '3px solid #fff',
    };

    return (
        <div style={backdrop} onClick={onClose}>
            <img src={img} style={imgStyle} alt="Card Focus" />
        </div>
    );
}


