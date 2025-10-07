// Lightweight targeting helpers used by abilities. These wrap the jQuery
// click-capture pattern currently used inside HeroAbilities.js into
// Promise-based utilities we can call from hero modules.

import $ from 'jquery';
import { playWithOverlay } from './soundController';

// Simple cancellation flag and API so other parts of the app (e.g. End Turn)
// can abort in-progress targeting flows gracefully
let isCancelled = false;
export function cancelTargeting() {
    try { isCancelled = true; } catch {}
    // Also emit a DOM event so any attached handlers can listen if needed
    try { document.dispatchEvent(new CustomEvent('ow:targeting:cancel')); } catch {}
}
// Expose on window for legacy callers
try { window.__ow_cancelTargeting = cancelTargeting; } catch {}

// Resolves with an object: { cardId, rowId, liIndex }
export function selectCardTarget(options = {}) {
    // If AI has already provided a target (e.g., for ultimates), only use it on AI turn
    if (window.__ow_aiUltimateTarget) {
        const getTurn = typeof window.__ow_getPlayerTurn === 'function' ? window.__ow_getPlayerTurn : null;
        const currentPlayer = getTurn ? getTurn() : null;
        if (currentPlayer === 2) {
            const pre = window.__ow_aiUltimateTarget;
            console.log('Using AI pre-selected target:', pre);
            try { window.__ow_aiUltimateTarget = null; } catch {}
            return Promise.resolve(pre);
        } else {
            // Human turn – ignore and clear any stale AI preselection
            try { window.__ow_aiUltimateTarget = null; } catch {}
        }
    }

    // Check if AI should handle targeting
    const isAITurn = !!window.__ow_isAITurn;
    const aiTriggering = !!window.__ow_aiTriggering;
    const getTurn = typeof window.__ow_getPlayerTurn === 'function' ? window.__ow_getPlayerTurn : null;
    const currentPlayer = getTurn ? getTurn() : null;
    // Delegate ONLY when AI explicitly triggered this flow and it's AI's turn
    if (window.__ow_selectCardTarget && aiTriggering && currentPlayer === 2) {
        console.log('Delegating to AI card targeting with options:', options);
        return window.__ow_selectCardTarget(options);
    }

    return new Promise((resolve) => {
        isCancelled = false;
        let dragStartPos = null;
        let isDragging = false;
        const DRAG_THRESHOLD = 15; // pixels - minimum movement to consider it a drag (increased for better detection)
        
        // Add visual feedback for targeting mode
        const addTargetingVisuals = () => {
            try {
                document.body.classList.add('targeting-mode');
                // Add a subtle overlay to indicate targeting is active
                if (!document.getElementById('targeting-overlay')) {
                    const overlay = document.createElement('div');
                    overlay.id = 'targeting-overlay';
                    overlay.style.cssText = `
                        position: fixed;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        background: rgba(0, 0, 255, 0.02);
                        pointer-events: none;
                        z-index: 1000;
                        transition: opacity 0.2s ease;
                    `;
                    document.body.appendChild(overlay);
                }
            } catch (e) {
                console.log('Could not add targeting visuals:', e);
            }
        };
        
        const removeTargetingVisuals = () => {
            try {
                document.body.classList.remove('targeting-mode');
                const overlay = document.getElementById('targeting-overlay');
                if (overlay) {
                    overlay.remove();
                }
            } catch (e) {
                console.log('Could not remove targeting visuals:', e);
            }
        };
        
        // Track mouse down to detect drag start
        const mouseDownHandler = (e) => {
            dragStartPos = { x: e.clientX, y: e.clientY };
            isDragging = false;
        };
        
        // Track mouse movement to detect drag
        const mouseMoveHandler = (e) => {
            if (dragStartPos) {
                const deltaX = Math.abs(e.clientX - dragStartPos.x);
                const deltaY = Math.abs(e.clientY - dragStartPos.y);
                if (deltaX > DRAG_THRESHOLD || deltaY > DRAG_THRESHOLD) {
                    isDragging = true;
                    console.log('Targeting: Drag detected - movement:', deltaX, deltaY);
                }
            }
        };
        
        // Track mouse up to reset drag state
        const mouseUpHandler = (e) => {
            dragStartPos = null;
            // Reset dragging state after a short delay to allow click handler to check it
            // Increased delay to prevent accidental cancellation
            setTimeout(() => { isDragging = false; }, 100);
        };
        
        const handler = (e) => {
            // Ignore clicks that were actually drags
            if (isDragging) {
                console.log('Targeting: Ignoring click - was a drag operation');
                // Reset dragging state after processing
                isDragging = false;
                return;
            }
            
            const $target = $(e.target);
            // If AI flags are accidentally set during human click, ignore by forcing human path
            try {
                const currentPlayerNum = typeof window.__ow_getPlayerTurn === 'function' ? window.__ow_getPlayerTurn() : 1;
                if (currentPlayerNum === 1) {
                    window.__ow_aiTriggering = false;
                }
            } catch {}
            const cardId = $target.closest('.card').attr('id');
            const rowId = $target.closest('.row').attr('id');
            const liIndex = $target.closest('li').index();

            console.log('Card click:', { cardId, rowId, targetElement: e.target.className });

            // Safety check: ensure cardId is valid
            if (!cardId || typeof cardId !== 'string') {
                console.log('Targeting: Invalid cardId, ignoring click');
                return; // Don't resolve, keep listening for valid targets
            }

            // Check if target card is frozen (has immunity effect)
            const targetCard = window.__ow_getCard?.(cardId);
            if (targetCard && Array.isArray(targetCard.effects)) {
                const isFrozen = targetCard.effects.some(effect =>
                    effect?.id === 'cryo-freeze' && effect?.type === 'immunity'
                );
                if (isFrozen) {
                    console.log(`Targeting: Cannot target frozen card ${cardId}`);
                    return; // Don't resolve, keep listening for valid targets
                }
            }

            // Enforce ally/enemy intent when available
            try {
                const playerOfTarget = parseInt(cardId?.[0]);
                const currentPlayerNum = typeof window.__ow_getPlayerTurn === 'function' ? window.__ow_getPlayerTurn() : 1;
                const requireAlly = options.isHeal === true || options.isBuff === true;
                const requireEnemy = options.isDamage === true || options.isDebuff === true;
                const allowAnyTarget = options.allowAnyTarget === true;
                
                // Skip validation if allowAnyTarget is true
                if (!allowAnyTarget) {
                    if (requireAlly && playerOfTarget !== currentPlayerNum) {
                        // Wrong team for ally targeting
                        return;
                    }
                    if (requireEnemy && playerOfTarget === currentPlayerNum) {
                        // Wrong team for enemy targeting
                        return;
                    }
                }
            } catch {}

            // If rowId is missing, try to find which row the card is in
            let finalRowId = rowId;
            if (!finalRowId && cardId && window.__ow_getRow) {
                const allRows = ['1f', '1m', '1b', '2f', '2m', '2b'];
                for (const r of allRows) {
                    const row = window.__ow_getRow(r);
                    if (row && row.cardIds && row.cardIds.includes(cardId)) {
                        finalRowId = r;
                        console.log('Targeting: Inferred rowId', r, 'for card', cardId);
                        break;
                    }
                }
            }

            // Final validation
            if (!cardId || !finalRowId) {
                console.warn('Click did not hit a valid card, ignoring', { cardId, rowId: finalRowId });
                return; // Keep listening
            }
            $('.card').off('click', handler);
            removeTargetingVisuals();

            resolve({ cardId, rowId: finalRowId, liIndex });
        };
        const cancelHandler = () => {
            $('.card').off('click', handler);
            $('.card').off('mousedown', mouseDownHandler);
            $('.card').off('mouseup', mouseUpHandler);
            document.removeEventListener('mousemove', mouseMoveHandler);
            document.removeEventListener('ow:targeting:cancel', cancelHandler);
            document.removeEventListener('contextmenu', contextCancel, true);
            removeTargetingVisuals();
            resolve(null);
        };
        const contextCancel = (e) => {
            try { e.preventDefault(); e.stopPropagation(); } catch {}
            cancelHandler();
        };
        // Start targeting mode with visual feedback
        addTargetingVisuals();
        
        $('.card').on('click', handler);
        $('.card').on('mousedown', mouseDownHandler);
        $('.card').on('mouseup', mouseUpHandler);
        document.addEventListener('mousemove', mouseMoveHandler);
        document.addEventListener('ow:targeting:cancel', cancelHandler);
        document.addEventListener('contextmenu', contextCancel, true);
    });
}

// Resolves with an object: { rowId, rowPosition }
export function selectRowTarget(options = {}) {
    // If AI has already provided a target (e.g., for ultimates), only use it on AI turn
    if (window.__ow_aiUltimateTarget) {
        const getTurn = typeof window.__ow_getPlayerTurn === 'function' ? window.__ow_getPlayerTurn : null;
        const currentPlayer = getTurn ? getTurn() : null;
        if (currentPlayer === 2) {
            const pre = window.__ow_aiUltimateTarget;
            console.log('Using AI pre-selected row target:', pre);
            try { window.__ow_aiUltimateTarget = null; } catch {}
            return Promise.resolve(pre);
        } else {
            // Human turn – ignore and clear any stale AI preselection
            try { window.__ow_aiUltimateTarget = null; } catch {}
        }
    }

    // Check if AI should handle targeting
    const isAITurn = !!window.__ow_isAITurn;
    const aiTriggering = !!window.__ow_aiTriggering;
    const getTurn = typeof window.__ow_getPlayerTurn === 'function' ? window.__ow_getPlayerTurn : null;
    const currentPlayer = getTurn ? getTurn() : null;
    // Delegate ONLY when AI explicitly triggered this flow and it's AI's turn
    if (window.__ow_selectRowTarget && aiTriggering && currentPlayer === 2) {
        console.log('Delegating to AI row targeting with options:', options);
        return window.__ow_selectRowTarget(options);
    }

    return new Promise((resolve) => {
        isCancelled = false;
        let dragStartPos = null;
        let isDragging = false;
        const DRAG_THRESHOLD = 15; // pixels - minimum movement to consider it a drag (increased for better detection)

        // Determine current player for validation
        const currentPlayerNum = getTurn ? getTurn() : 1;
        const isDamage = options.isDamage || false;
        const isBuff = options.isBuff || false;
        const isDebuff = options.isDebuff || false;
        const allowAnyRow = options.allowAnyRow || false;
        
        // Add visual feedback for targeting mode
        const addTargetingVisuals = () => {
            try {
                document.body.classList.add('targeting-mode');
                // Add a subtle overlay to indicate targeting is active
                if (!document.getElementById('targeting-overlay')) {
                    const overlay = document.createElement('div');
                    overlay.id = 'targeting-overlay';
                    overlay.style.cssText = `
                        position: fixed;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        background: rgba(0, 0, 255, 0.02);
                        pointer-events: none;
                        z-index: 1000;
                        transition: opacity 0.2s ease;
                    `;
                    document.body.appendChild(overlay);
                }
            } catch (e) {
                console.log('Could not add targeting visuals:', e);
            }
        };
        
        const removeTargetingVisuals = () => {
            try {
                document.body.classList.remove('targeting-mode');
                const overlay = document.getElementById('targeting-overlay');
                if (overlay) {
                    overlay.remove();
                }
            } catch (e) {
                console.log('Could not remove targeting visuals:', e);
            }
        };
        
        // Track mouse down to detect drag start
        const mouseDownHandler = (e) => {
            dragStartPos = { x: e.clientX, y: e.clientY };
            isDragging = false;
        };
        
        // Track mouse movement to detect drag
        const mouseMoveHandler = (e) => {
            if (dragStartPos) {
                const deltaX = Math.abs(e.clientX - dragStartPos.x);
                const deltaY = Math.abs(e.clientY - dragStartPos.y);
                if (deltaX > DRAG_THRESHOLD || deltaY > DRAG_THRESHOLD) {
                    isDragging = true;
                    console.log('Targeting: Drag detected - movement:', deltaX, deltaY);
                }
            }
        };
        
        // Track mouse up to reset drag state
        const mouseUpHandler = (e) => {
            dragStartPos = null;
            // Reset dragging state after a short delay to allow click handler to check it
            // Increased delay to prevent accidental cancellation
            setTimeout(() => { isDragging = false; }, 100);
        };

        const handler = (e) => {
            // Ignore clicks that were actually drags
            if (isDragging) {
                console.log('Row targeting: Ignoring click - was a drag operation');
                // Reset dragging state after processing
                isDragging = false;
                return;
            }
            
            try { e.preventDefault(); e.stopPropagation(); } catch {}
            const $target = $(e.target);
            // If AI flags are accidentally set during human click, ignore by forcing human path
            try {
                const currentPlayerNum = typeof window.__ow_getPlayerTurn === 'function' ? window.__ow_getPlayerTurn() : 1;
                if (currentPlayerNum === 1) {
                    window.__ow_aiTriggering = false;
                }
            } catch {}
            // Support clicks on elements with class 'row' or the known row ids
            const rowIds = ['1f','1m','1b','2f','2m','2b','player1hand','player2hand'];
            let rowId = $target.closest('.row').attr('id');
            if (!rowId) {
                for (const rid of rowIds) {
                    if ($target.closest(`#${rid}`).length) { rowId = rid; break; }
                }
            }
            if (!rowId) {
                // Ignore clicks not in a row; keep handler active
                return;
            }

            // Skip hand rows
            if (rowId.includes('hand')) {
                return;
            }

            // Validate row based on ability type (unless allowAnyRow)
            if (!allowAnyRow) {
                const rowPlayerNum = parseInt(rowId[0]);
                const isEnemyRow = rowPlayerNum !== currentPlayerNum;
                const isFriendlyRow = rowPlayerNum === currentPlayerNum;

                // Damage/debuff abilities should only target enemy rows
                if ((isDamage || isDebuff) && !isEnemyRow) {
                    console.log(`Row targeting: Cannot target friendly row ${rowId} with damage/debuff ability`);
                    return; // Keep listening
                }

                // Buff abilities should only target friendly rows
                if (isBuff && !isFriendlyRow) {
                    console.log(`Row targeting: Cannot target enemy row ${rowId} with buff ability`);
                    return; // Keep listening
                }
            }

            const rowPosition = rowId[1];
            $('.row').off('click', handler);
            for (const rid of rowIds) { $(document).off('click', handler, `#${rid}`); }
            resolve({ rowId, rowPosition });
        };
        const cancelHandler = () => {
            $('.row').off('click', handler);
            $('.row').off('mousedown', mouseDownHandler);
            $('.row').off('mouseup', mouseUpHandler);
            const rowIds = ['1f','1m','1b','2f','2m','2b','player1hand','player2hand'];
            for (const rid of rowIds) { 
                $(document).off('click', handler, `#${rid}`);
                $(`#${rid}`).off('mousedown', mouseDownHandler);
                $(`#${rid}`).off('mouseup', mouseUpHandler);
            }
            document.removeEventListener('mousemove', mouseMoveHandler);
            document.removeEventListener('ow:targeting:cancel', cancelHandler);
            document.removeEventListener('contextmenu', contextCancel, true);
            resolve(null);
        };
        const contextCancel = (e) => {
            try { e.preventDefault(); e.stopPropagation(); } catch {}
            cancelHandler();
        };
        // Attach to generic row containers and specific ids as fallback
        $('.row').on('click', handler);
        $('.row').on('mousedown', mouseDownHandler);
        $('.row').on('mouseup', mouseUpHandler);
        const rowIds = ['1f','1m','1b','2f','2m','2b','player1hand','player2hand'];
        for (const rid of rowIds) { 
            $(`#${rid}`).on('click', handler);
            $(`#${rid}`).on('mousedown', mouseDownHandler);
            $(`#${rid}`).on('mouseup', mouseUpHandler);
        }
        document.addEventListener('mousemove', mouseMoveHandler);
        document.addEventListener('ow:targeting:cancel', cancelHandler);
        document.addEventListener('contextmenu', contextCancel, true);
    });
}

// Convenience: select a row and immediately trigger a sound/overlay event.
// Use eventName = 'onRowTarget' by default.
export async function selectRowTargetWithSound(heroId, cardId, eventName = 'onRowTarget') {
    const result = await selectRowTarget();
    if (heroId && cardId) {
        playWithOverlay(heroId, cardId, eventName);
    }
    return result;
}


