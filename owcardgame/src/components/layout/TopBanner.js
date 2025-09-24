import React, { useEffect, useState } from 'react';
import { subscribe } from '../../abilities/engine/targetingBus';
import aimLineBus from '../../abilities/engine/aimLineBus';
import './TopBanner.css';

export default function TopBanner() {
    const [message, setMessage] = useState(null);
    const [arrowSourceId, setArrowSourceId] = useState(null);

    useEffect(() => {
        const unsubMsg = subscribe(setMessage);
        const unsubArrow = aimLineBus.subscribe(setArrowSourceId);
        return () => { unsubMsg && unsubMsg(); unsubArrow && unsubArrow(); };
    }, []);

    return (
        <div>
            {message && (
                <div className='top-banner'>
                    {message}
                </div>
            )}
            {arrowSourceId && <CursorArrow sourceId={arrowSourceId} />}
        </div>
    );
}

function CursorArrow({ sourceId }) {
    const [pos, setPos] = useState({ x: 0, y: 0 });
    useEffect(() => {
        function onMove(e) { setPos({ x: e.clientX, y: e.clientY }); }
        window.addEventListener('mousemove', onMove);
        return () => window.removeEventListener('mousemove', onMove);
    }, []);

    const srcEl = document.getElementById(sourceId);
    if (!srcEl) return null;
    const rect = srcEl.getBoundingClientRect();
    const x1 = rect.left + rect.width / 2;
    const y1 = rect.top + rect.height / 2;
    const x2 = pos.x;
    const y2 = pos.y;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);

    const style = {
        position: 'fixed',
        left: `${x1}px`,
        top: `${y1}px`,
        width: `${length}px`,
        height: '2px',
        background: 'rgba(255,255,255,0.8)',
        transformOrigin: '0 0',
        transform: `rotate(${angle}deg)`,
        zIndex: 9999,
        pointerEvents: 'none',
    };
    return <div style={style} />;
}


