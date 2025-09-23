import React, { useState } from 'react';
import Modal from './Modal';

export default function ChoiceModal({ isOpen, onClose, title, choices, onSelect, heroName }) {
    const [selectedChoice, setSelectedChoice] = useState(null);

    const handleSelect = () => {
        if (selectedChoice !== null) {
            onSelect(selectedChoice);
            setSelectedChoice(null);
        }
    };

    const handleClose = () => {
        setSelectedChoice(null);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title={title} type="choice">
            <div className="choice-prompt">
                <p>Choose an ability for <strong>{heroName}</strong>:</p>
            </div>
            <div className="choices">
                {choices.map((choice, index) => (
                    <button
                        key={index}
                        className={`choice-button ${selectedChoice === index ? 'selected' : ''}`}
                        onClick={() => setSelectedChoice(index)}
                    >
                        <div className="choice-title">{choice.title}</div>
                        <div className="choice-description">{choice.description}</div>
                    </button>
                ))}
            </div>
            <div className="choice-actions">
                <button
                    className="interrupt-button primary"
                    onClick={handleSelect}
                    disabled={selectedChoice === null}
                >
                    Select
                </button>
                <button
                    className="interrupt-button secondary"
                    onClick={handleClose}
                >
                    Cancel
                </button>
            </div>
        </Modal>
    );
}
