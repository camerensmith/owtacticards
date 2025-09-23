// Modal controller: manages modal state and provides API for showing choice/interrupt modals
import { publish } from './actionsBus';

export const ModalTypes = {
    CHOICE: 'choice',
    INTERRUPT: 'interrupt',
    TARGETING: 'targeting'
};

let modalState = {
    isOpen: false,
    type: null,
    data: null
};

let modalListeners = [];

export const subscribeToModal = (listener) => {
    modalListeners.push(listener);
    return () => modalListeners.filter(l => l !== listener);
};

const notifyModalListeners = () => {
    modalListeners.forEach(listener => listener(modalState));
};

export const showChoiceModal = (heroName, choices, onSelect) => {
    try { document.body.classList.add('modal-open'); } catch (e) {}
    modalState = {
        isOpen: true,
        type: ModalTypes.CHOICE,
        data: { heroName, choices, onSelect }
    };
    notifyModalListeners();
};

export const showInterruptModal = (heroName, abilityName, cost, currentSynergy) => {
    try { document.body.classList.add('modal-open'); } catch (e) {}
    modalState = {
        isOpen: true,
        type: ModalTypes.INTERRUPT,
        data: { heroName, abilityName, cost, currentSynergy }
    };
    notifyModalListeners();
};

export const showTargetingModal = (heroName, abilityName, targetType, validTargets) => {
    try { document.body.classList.add('modal-open'); } catch (e) {}
    modalState = {
        isOpen: true,
        type: ModalTypes.TARGETING,
        data: { heroName, abilityName, targetType, validTargets }
    };
    notifyModalListeners();
};

export const closeModal = () => {
    modalState = {
        isOpen: false,
        type: null,
        data: null
    };
    notifyModalListeners();
    try { document.body.classList.remove('modal-open'); } catch (e) {}
};

export const getModalState = () => modalState;

// Helper functions for common modal scenarios
export const showOnEnterChoice = (heroName, onEnter1, onEnter2, onSelect) => {
    const choices = [
        {
            title: onEnter1.name || 'Primary Ability',
            description: onEnter1.description || onEnter1
        },
        {
            title: onEnter2.name || 'Secondary Ability', 
            description: onEnter2.description || onEnter2
        }
    ];
    showChoiceModal(heroName, choices, onSelect);
};

export const showInterruptPrompt = (heroName, abilityName, cost, currentSynergy) => {
    if (currentSynergy >= cost) {
        showInterruptModal(heroName, abilityName, cost, currentSynergy);
        return true;
    }
    return false;
};
