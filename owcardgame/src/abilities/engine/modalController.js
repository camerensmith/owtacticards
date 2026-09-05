// Modal controller: manages modal state and provides API for showing choice/interrupt modals
import { publish } from './actionsBus';
import { aiOwnsCurrentDecision } from '../../game/aiControl';

export const ModalTypes = {
    CHOICE: 'choice',
    INTERRUPT: 'interrupt',
    TARGETING: 'targeting',
    REORDER: 'reorder',
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

/**
 * `ownerPlayerNum` is whose card the choice belongs to.
 *
 * Without it the turn decides, which is wrong for an interrupt: Cyclo's
 * Chainsword is offered to its owner when *their* hero is attacked, and that
 * happens on the attacker's turn. Reading the turn alone handed the player's
 * retaliation to the AI to answer on their behalf.
 */
export const showChoiceModal = (heroName, choices, onSelect, ownerPlayerNum) => {
    const owned = ownerPlayerNum == null
        ? aiOwnsCurrentDecision()
        : Number(ownerPlayerNum) === 2 && !window.__ow_practiceMode;

    // The AI is never asked to answer for a card it does not own, and the human
    // is never asked to answer for one they do not. The auto-select callback
    // arrives through a dynamic import during setup, so it can still be missing
    // when an early choice surfaces — falling back to the first option keeps
    // the AI self-sufficient instead of putting its decision on screen.
    if (owned) {
        const aiChoice = aiAutoSelectCallback
            ? aiAutoSelectCallback(heroName, choices)
            : 0;
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
    if (aiOwnsCurrentDecision()) {
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

/**
 * Temporal Rift: drag-reorder a short list of upcoming hero ids, then Confirm.
 * AI owners keep the given order after a short think delay.
 */
export const showReorderModal = ({
    title = 'Reorder',
    heroName = '',
    heroIds = [],
    images = {},
    onConfirm,
    ownerPlayerNum,
} = {}) => {
    const owned = ownerPlayerNum == null
        ? aiOwnsCurrentDecision()
        : Number(ownerPlayerNum) === 2 && !window.__ow_practiceMode;

    if (owned) {
        const thinkingDelay = Math.floor(280 + Math.random() * 520);
        setTimeout(() => {
            if (typeof onConfirm === 'function') onConfirm([...(heroIds || [])]);
        }, thinkingDelay);
        return;
    }

    try { document.body.classList.add('modal-open'); } catch (e) {}
    modalState = {
        isOpen: true,
        type: ModalTypes.REORDER,
        data: { title, heroName, heroIds: [...(heroIds || [])], images, onConfirm },
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
export const showOnEnterChoice = (heroName, onEnter1, onEnter2, onSelect, ownerPlayerNum) => {
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
    showChoiceModal(heroName, choices, onSelect, ownerPlayerNum);
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
