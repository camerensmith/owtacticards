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
let aiAutoSelectCallback = null; // When set, AI automatically selects instead of showing modal

export const subscribeToModal = (listener) => {
    modalListeners.push(listener);
    return () => modalListeners.filter(l => l !== listener);
};

const notifyModalListeners = () => {
    modalListeners.forEach(listener => listener(modalState));
};

export const showChoiceModal = (heroName, choices, onSelect) => {
    // If AI is acting AND it is actually Player 2's turn, let AI choose without showing modal
    const getTurn = typeof window.__ow_getPlayerTurn === 'function' ? window.__ow_getPlayerTurn : null;
    const currentPlayer = getTurn ? getTurn() : null;
    const aiActing = (!!window.__ow_isAITurn || !!window.__ow_aiTriggering) && currentPlayer === 2;
    if (aiActing && aiAutoSelectCallback) {
        console.log(`AI auto-selecting for ${heroName} from ${choices.length} choices:`, choices.map(c => c.title));
        const aiChoice = aiAutoSelectCallback(heroName, choices);
        console.log(`AI selected choice index ${aiChoice}: "${choices[aiChoice]?.title}"`);
        const thinkingDelay = Math.floor(300 + Math.random() * 700);
        setTimeout(() => { onSelect(aiChoice); }, thinkingDelay);
        return;
    }

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
    const getTurn = typeof window.__ow_getPlayerTurn === 'function' ? window.__ow_getPlayerTurn : null;
    const currentPlayer = getTurn ? getTurn() : null;
    const aiActing = (!!window.__ow_isAITurn || !!window.__ow_aiTriggering) && currentPlayer === 2;
    if (aiActing) {
        // When AI is acting, never show the modal; publish an AI-targeting event instead
        try {
            publish('ai-targeting-request', { heroName, abilityName, targetType, validTargets });
        } catch {}
        return;
    }

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

// AI mode: set callback to auto-select choices
export const setAIAutoSelect = (callback) => {
    aiAutoSelectCallback = callback;
};

// AI mode: clear auto-select
export const clearAIAutoSelect = () => {
    aiAutoSelectCallback = null;
};
