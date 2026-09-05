import React, { useState } from 'react';
import Modal from './Modal';
import './ReorderModal.css';

/**
 * Drag-reorder a short list of hero card faces, then Confirm.
 * Used by Vega Temporal Rift for the next draws.
 */
export default function ReorderModal({
    isOpen,
    onClose,
    title = 'Temporal Rift',
    heroName = 'Vega',
    heroIds = [],
    images = {},
    onConfirm,
}) {
    const [order, setOrder] = useState(() => [...heroIds]);
    const [dragIndex, setDragIndex] = useState(null);

    // Keep local order in sync when a new rift opens with a fresh sample.
    React.useEffect(() => {
        if (isOpen) setOrder([...(heroIds || [])]);
    }, [isOpen, heroIds]);

    const move = (from, to) => {
        if (from === to || from == null || to == null) return;
        setOrder((prev) => {
            const next = [...prev];
            const [item] = next.splice(from, 1);
            next.splice(to, 0, item);
            return next;
        });
    };

    const handleConfirm = () => {
        if (typeof onConfirm === 'function') onConfirm(order);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} type="reorder">
            <div className="reorder-prompt">
                <p>
                    Drag to set the next draws for <strong>{heroName}</strong>
                    {' '}(top = drawn first).
                </p>
            </div>
            <div className="reorder-strip">
                {order.map((id, index) => (
                    <div
                        key={`${id}-${index}`}
                        className={`reorder-card${dragIndex === index ? ' is-dragging' : ''}`}
                        draggable
                        onDragStart={(e) => {
                            setDragIndex(index);
                            try { e.dataTransfer.setData('text/plain', String(index)); } catch {}
                            e.dataTransfer.effectAllowed = 'move';
                        }}
                        onDragOver={(e) => {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = 'move';
                        }}
                        onDrop={(e) => {
                            e.preventDefault();
                            let from = dragIndex;
                            try {
                                const raw = e.dataTransfer.getData('text/plain');
                                if (raw !== '') from = Number(raw);
                            } catch {}
                            move(from, index);
                            setDragIndex(null);
                        }}
                        onDragEnd={() => setDragIndex(null)}
                    >
                        <span className="reorder-index">{index + 1}</span>
                        <img
                            src={images[id] || images['card-back']}
                            alt={id}
                            draggable={false}
                        />
                        <span className="reorder-name">{id}</span>
                    </div>
                ))}
            </div>
            <div className="choice-actions">
                <button className="interrupt-button primary" onClick={handleConfirm}>
                    Confirm
                </button>
                <button
                    className="interrupt-button secondary"
                    onClick={() => {
                        if (typeof onConfirm === 'function') onConfirm([...(heroIds || [])]);
                    }}
                >
                    Keep order
                </button>
            </div>
        </Modal>
    );
}
