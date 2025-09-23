import React from 'react';
import Modal from './Modal';

export default function InterruptModal({ 
    isOpen, 
    onClose, 
    heroName, 
    abilityName, 
    cost, 
    currentSynergy, 
    onActivate 
}) {
    const canAfford = currentSynergy >= cost;

    const handleActivate = () => {
        if (canAfford) {
            onActivate();
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Interrupt Ability" type="interrupt">
            <div className="interrupt-content">
                <p>
                    <strong>{heroName}</strong> is about to take damage.
                </p>
                <p>
                    Do you want to use <strong>{abilityName}</strong>?
                </p>
                <div className="synergy-info">
                    <span>Cost: </span>
                    <span className={`synergy-cost ${canAfford ? '' : 'insufficient'}`}>
                        {cost}
                    </span>
                    <span> (You have {currentSynergy})</span>
                </div>
            </div>
            <div className="interrupt-buttons">
                <button
                    className="interrupt-button primary"
                    onClick={handleActivate}
                    disabled={!canAfford}
                >
                    Activate ({cost} Synergy)
                </button>
                <button
                    className="interrupt-button secondary"
                    onClick={onClose}
                >
                    Take Damage
                </button>
            </div>
        </Modal>
    );
}
