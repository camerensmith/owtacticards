import {
    canTracerRecall,
    TRACER_RECALL_COST,
    shouldSuppressEnterOnDeploy,
} from './redeployRules';

test('canTracerRecall requires unused ult and enough row synergy', () => {
    expect(canTracerRecall({ rowSynergy: 2, alreadyUsed: false })).toBe(true);
    expect(canTracerRecall({ rowSynergy: 1, alreadyUsed: false })).toBe(false);
    expect(canTracerRecall({ rowSynergy: 5, alreadyUsed: true })).toBe(false);
    expect(TRACER_RECALL_COST).toBe(2);
});

test('shouldSuppressEnterOnDeploy only when the return flag is set', () => {
    expect(shouldSuppressEnterOnDeploy(undefined)).toBe(false);
    expect(shouldSuppressEnterOnDeploy({})).toBe(false);
    expect(shouldSuppressEnterOnDeploy({ suppressEnterOnRedeploy: true })).toBe(true);
    expect(shouldSuppressEnterOnDeploy({ suppressEnterOnRedeploy: false })).toBe(false);
});
