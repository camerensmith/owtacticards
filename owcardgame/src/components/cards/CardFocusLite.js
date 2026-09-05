import React from 'react';
import { heroCardFocusImages, heroCardImages } from '../../assets/imageImports';

export default function CardFocusLite({ focus, onClose }) {
    if (!focus) return null;
    const { playerHeroId } = focus;
    const heroId = playerHeroId.slice(1);
    const img = heroCardFocusImages[heroId] || heroCardImages[heroId];
    if (!img) return null;

    // Alt+hover previews must not capture the pointer: the backdrop covers the
    // card underneath, which would fire mouseleave and flicker the preview.
    const isHoverPreview = !!focus.hover;

    const backdrop = {
        position: 'fixed',
        inset: 0,
        background: 'transparent', // No black overlay
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        pointerEvents: isHoverPreview ? 'none' : 'auto', // click-to-close only when pinned
    };
    const imgStyle = {
        maxWidth: '70vw',
        maxHeight: '80vh',
        boxShadow: '0 10px 30px rgba(0,0,0,0.8)',
        borderRadius: 8,
        border: '3px solid #fff',
    };

    return (
        <div
            style={backdrop}
            data-testid='card-focus-backdrop'
            onClick={isHoverPreview ? undefined : onClose}
        >
            <img src={img} style={imgStyle} alt="Card Focus" />
        </div>
    );
}


