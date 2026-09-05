import { spreadDamageEvenly } from './abilityRules';
import {
    collectLivingOnRows,
    enemyRowIds,
    overkillAmount,
    unusedSynergy,
} from './rosterRules';

export function emptyPreview() {
    return {
        cardIds: [],
        rowIds: [],
        column: null,
        possibles: [],
        fromCardId: null,
        // cardId -> damage, for abilities that can show what a hit will cost.
        amounts: {},
    };
}

export function previewKey(preview) {
    const p = preview || emptyPreview();
    return JSON.stringify({
        c: [...(p.cardIds || [])].slice().sort(),
        r: [...(p.rowIds || [])].slice().sort(),
        p: [...(p.possibles || [])].slice().sort(),
        col: p.column || null,
        from: p.fromCardId || null,
    });
}

export function columnCardIds(playerNum, index, getRow) {
    if (!Number.isInteger(index) || index < 0) return [];
    return [`${playerNum}f`, `${playerNum}m`, `${playerNum}b`]
        .map((rid) => getRow?.(rid)?.cardIds?.[index])
        .filter(Boolean);
}

export function livingOnRow(rowId, getRow, getCard) {
    return (getRow?.(rowId)?.cardIds || []).filter((id) => (getCard?.(id)?.health || 0) > 0);
}

function normalize(raw, fromCardId) {
    const cardIds = [...new Set(raw?.cardIds || [])];
    const possibles = [...new Set(raw?.possibles || [])].filter((id) => !cardIds.includes(id));
    return {
        cardIds,
        rowIds: [...new Set(raw?.rowIds || [])],
        column: raw?.column || null,
        possibles,
        fromCardId: raw?.fromCardId ?? fromCardId ?? null,
        amounts: raw?.amounts || {},
    };
}

export function isLegalCardTarget(cardId, options = {}, currentPlayerNum, getCard) {
    if (!cardId) return false;
    const card = getCard?.(cardId);
    if (card && Array.isArray(card.effects) && card.effects.some((effect) => effect?.type === 'immunity')) {
        return false;
    }
    if (options.allowAnyTarget === true) return true;
    const playerOfTarget = parseInt(String(cardId)[0], 10);
    const requireAlly = options.isHeal === true || options.isBuff === true;
    const requireEnemy = options.isDamage === true || options.isDebuff === true;
    if (requireAlly && playerOfTarget !== currentPlayerNum) return false;
    if (requireEnemy && playerOfTarget === currentPlayerNum) return false;
    return true;
}

export function isLegalRowTarget(rowId, options = {}, currentPlayerNum) {
    if (!rowId || !/^[12][fmb]$/.test(String(rowId))) return false;
    if (options.allowAnyRow === true) return true;
    const rowPlayerNum = parseInt(String(rowId)[0], 10);
    if (!Number.isFinite(rowPlayerNum)) return false;
    if ((options.isDamage === true || options.isDebuff === true) && rowPlayerNum === currentPlayerNum) {
        return false;
    }
    if (options.isBuff === true && rowPlayerNum !== currentPlayerNum) {
        return false;
    }
    return true;
}

export function hyperionHoverPreview(hover, opts = {}) {
    const certainId = hover?.cardId;
    const fromCardId = opts.fromCardId || null;
    if (!certainId) return emptyPreview();
    const { getRow, getCard, playerNum } = opts;
    const enemyNum = parseInt(String(certainId)[0], 10);
    const dmg = unusedSynergy(
        opts.unusedFront ?? getRow?.(`${enemyNum}f`)?.synergy,
        opts.unusedMiddle ?? getRow?.(`${enemyNum}m`)?.synergy,
        opts.unusedBack ?? getRow?.(`${enemyNum}b`)?.synergy,
    );
    const hp = getCard?.(certainId)?.health || 0;
    const leftover = overkillAmount(dmg, hp);
    const others = leftover > 0
        ? collectLivingOnRows(enemyRowIds(playerNum), getRow, getCard)
            .filter((e) => e.cardId !== certainId)
            .filter((e) => !['turret', 'bob', 'nemesis'].includes(e.card?.id))
            .map((e) => e.cardId)
        : [];
    return normalize({
        cardIds: [certainId],
        possibles: others,
        fromCardId,
    }, fromCardId);
}

/**
 * Dead Eye: hovering an enemy row shows who is caught and exactly how the
 * damage splits between them, so the spread is visible before committing.
 */
export function deadeyeHoverPreview(hover, opts = {}) {
    const rowId = hover?.rowId;
    if (!rowId) return emptyPreview();

    const { getRow, getCard, playerNum, total = 9, fromCardId = null } = opts;
    // Enemy rows only; hovering your own side should show nothing.
    if (parseInt(String(rowId)[0], 10) === playerNum) return emptyPreview();

    const cardIds = livingOnRow(rowId, getRow, getCard);
    if (!cardIds.length) return emptyPreview();

    const split = spreadDamageEvenly(total, cardIds.length);
    const amounts = {};
    cardIds.forEach((cardId, i) => {
        amounts[cardId] = split[i];
    });

    return normalize({ cardIds, rowIds: [rowId], amounts, fromCardId }, fromCardId);
}

export function previewEventForHover(hover, options = {}, currentPlayerNum, getRow, getCard) {
    if (!hover || !/^[12][fmb]$/.test(String(hover.rowId || ''))) {
        return { type: 'clear' };
    }
    const shape = options.previewShape || (hover.cardId ? 'card' : 'row');
    if (shape === 'row') {
        if (!isLegalRowTarget(hover.rowId, options, currentPlayerNum)) {
            return { type: 'clear' };
        }
    } else if (hover.cardId) {
        if (!isLegalCardTarget(hover.cardId, options, currentPlayerNum, getCard)) {
            return { type: 'clear' };
        }
    } else {
        return { type: 'clear' };
    }
    const payload = resolveTargetPreview(hover, options, getRow, getCard);
    if (!payload.cardIds.length && !payload.rowIds.length && !payload.column && !payload.possibles.length) {
        return { type: 'clear' };
    }
    return { type: 'preview', payload };
}

export function resolveTargetPreview(hover, options = {}, getRow, getCard) {
    const fromCardId = options.fromCardId || options.sourceCardId || null;
    if (typeof options.preview === 'function') {
        return normalize(options.preview(hover, { getRow, getCard }) || {}, fromCardId);
    }
    if (!hover) return emptyPreview();
    const shape = options.previewShape || (hover.cardId ? 'card' : 'row');
    if (shape === 'column' && hover.cardId) {
        const playerNum = parseInt(String(hover.rowId || hover.cardId)[0], 10);
        const index = Number.isInteger(hover.liIndex) && hover.liIndex >= 0
            ? hover.liIndex
            : (getRow?.(hover.rowId)?.cardIds || []).indexOf(hover.cardId);
        const cardIds = columnCardIds(playerNum, index, getRow);
        return normalize({
            cardIds,
            column: Number.isInteger(index) && index >= 0 ? { playerNum, index } : null,
            fromCardId,
        }, fromCardId);
    }
    if (shape === 'row' && hover.rowId) {
        return normalize({
            cardIds: livingOnRow(hover.rowId, getRow, getCard),
            rowIds: [hover.rowId],
            fromCardId,
        }, fromCardId);
    }
    if (hover.cardId) {
        return normalize({ cardIds: [hover.cardId], fromCardId }, fromCardId);
    }
    return emptyPreview();
}
