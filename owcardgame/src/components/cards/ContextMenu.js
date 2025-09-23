import React, { useEffect } from 'react';
import './ContextMenu.css';

export default function ContextMenu({ x, y, items, onClose }) {
    useEffect(() => {
        const handler = () => onClose && onClose();
        window.addEventListener('click', handler, { once: true });
        return () => window.removeEventListener('click', handler);
    }, [onClose]);

    if (!items || items.length === 0) return null;

    const style = { left: x, top: y };
    return (
        <div className='contextmenu' style={style}>
            {items.map((item, idx) => (
                <div key={idx} className='contextmenu-item' onClick={item.onClick}>
                    {item.label}
                </div>
            ))}
        </div>
    );
}


