/**
 * Redeploy economy helpers — synergy is spent once; On-Enter is suppressed
 * on most hand returns; Tracer Recall is the Enter exception.
 */

export const TRACER_RECALL_COST = 2;

export function canTracerRecall({
    rowSynergy = 0,
    alreadyUsed = false,
    cost = TRACER_RECALL_COST,
} = {}) {
    if (alreadyUsed) return false;
    return (Number(rowSynergy) || 0) >= (Number(cost) || TRACER_RECALL_COST);
}

/** Symmetra Teleporter (and similar) set this so redeploy skips On-Enter. */
export function shouldSuppressEnterOnDeploy(card) {
    return !!card?.suppressEnterOnRedeploy;
}
