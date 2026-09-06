import { shouldBlockPreDealActions } from './matchStartGate';

test('blocks while the map title is up even if deal flags are still false', () => {
    expect(shouldBlockPreDealActions({
        openingDeal: false,
        theaterLocked: false,
        showMapTitle: true,
    })).toBe(true);
});

test('blocks while opening deal or theater lock is active', () => {
    expect(shouldBlockPreDealActions({ openingDeal: true })).toBe(true);
    expect(shouldBlockPreDealActions({ theaterLocked: true })).toBe(true);
});

test('allows play only after title and deal are clear', () => {
    expect(shouldBlockPreDealActions({
        openingDeal: false,
        theaterLocked: false,
        showMapTitle: false,
    })).toBe(false);
});
