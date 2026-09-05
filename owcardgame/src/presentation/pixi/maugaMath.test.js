import {
    BERSERK,
    CAGE,
    MAUGA_SMASH,
    berserkSample,
    cageBars,
    maugaContactMs,
    maugaSmashMs,
    maugaSmashSample,
    maugaSmashTotalMs,
} from './fxMath';

const tallRow = { left: 100, top: 200, width: 150, height: 600 };
const wideRow = { left: 100, top: 200, width: 600, height: 150 };

describe('Cage Fight bars', () => {
    test('span the row and are evenly spaced', () => {
        const { bars } = cageBars(tallRow, 0);
        expect(bars).toHaveLength(CAGE.bars);
        for (const bar of bars) {
            expect(bar.a.x).toBeCloseTo(tallRow.left);
            expect(bar.b.x).toBeCloseTo(tallRow.left + tallRow.width);
            expect(bar.a.y).toBeGreaterThanOrEqual(tallRow.top);
            expect(bar.a.y).toBeLessThanOrEqual(tallRow.top + tallRow.height);
        }
    });

    test('run across the short side whichever way the row is laid out', () => {
        expect(cageBars(tallRow, 0).vertical).toBe(true);
        expect(cageBars(wideRow, 0).vertical).toBe(false);
    });

    // The cage stands until Mauga dies, so it must loop, never end or fade.
    test('shimmer travels along the bars and never goes dark', () => {
        for (let ms = 0; ms < CAGE.shimmerMs * 2; ms += 120) {
            for (const bar of cageBars(tallRow, ms).bars) {
                expect(bar.glow).toBeGreaterThanOrEqual(0);
                expect(bar.glow).toBeLessThanOrEqual(1);
            }
        }
        expect(cageBars(tallRow, 0).bars[0].glow)
            .not.toBeCloseTo(cageBars(tallRow, CAGE.shimmerMs / 3).bars[0].glow, 3);
    });

    test('the shimmer cycle loops seamlessly', () => {
        const start = cageBars(tallRow, 0).bars.map((b) => b.glow);
        cageBars(tallRow, CAGE.shimmerMs).bars.forEach((bar, i) => {
            expect(bar.glow).toBeCloseTo(start[i], 8);
        });
    });

    test('bars are offset from each other, so the glow sweeps', () => {
        const glows = cageBars(tallRow, 400).bars.map((b) => b.glow);
        expect(new Set(glows.map((v) => v.toFixed(4))).size).toBeGreaterThan(1);
    });
});

describe('Berserker pulse', () => {
    test('beats outward and clears', () => {
        expect(berserkSample(0).done).toBe(false);
        expect(berserkSample(BERSERK.ms).done).toBe(true);
        expect(berserkSample(BERSERK.ms * 0.8).rings[0].reach)
            .toBeGreaterThan(berserkSample(0).rings[0].reach);
    });

    test('rings set off one after another rather than together', () => {
        const early = berserkSample(BERSERK.ms * 0.1);
        expect(early.rings).toHaveLength(BERSERK.rings);
        expect(early.rings[0].alpha).toBeGreaterThan(0);
        expect(early.rings[1].alpha).toBe(0);
    });

    test('the flare on the card is gone before the rings are', () => {
        const late = berserkSample(BERSERK.ms * 0.7);
        expect(late.glow).toBe(0);
        expect(late.rings[0].alpha).toBeGreaterThan(0);
    });

    test('never brightens past its ceiling', () => {
        for (let ms = 0; ms <= BERSERK.ms; ms += 30) {
            const s = berserkSample(ms);
            expect(s.glow).toBeLessThanOrEqual(BERSERK.alpha);
            for (const ring of s.rings) expect(ring.alpha).toBeLessThanOrEqual(BERSERK.alpha);
        }
    });
});

describe('Cage Fight slams', () => {
    test('he works through them one at a time', () => {
        expect(maugaSmashMs(0)).toBe(0);
        expect(maugaSmashMs(1)).toBeGreaterThan(maugaSmashMs(0));
        expect(maugaSmashMs(2)).toBeGreaterThan(maugaSmashMs(1));
    });

    test('the last slam finishes inside the run', () => {
        const total = maugaSmashTotalMs(3);
        expect(maugaSmashMs(2) + MAUGA_SMASH.ms).toBe(total);
    });

    // The thud and the damage both belong on contact, not on the wind-up.
    test('contact lands after the lunge starts and before it ends', () => {
        for (const i of [0, 1, 2]) {
            expect(maugaContactMs(i)).toBeGreaterThan(maugaSmashMs(i));
            expect(maugaContactMs(i)).toBeLessThan(maugaSmashMs(i) + MAUGA_SMASH.ms);
        }
    });

    test('contact matches the moment the slam reports connecting', () => {
        const offset = maugaContactMs(0) - maugaSmashMs(0);
        expect(maugaSmashSample(offset).connected).toBe(true);
        expect(maugaSmashSample(offset - 1).connected).toBe(false);
    });

    test('each hero is struck in turn', () => {
        expect(maugaContactMs(1)).toBeGreaterThan(maugaContactMs(0));
        expect(maugaContactMs(2)).toBeGreaterThan(maugaContactMs(1));
    });

    test('he closes first, then connects', () => {
        expect(maugaSmashSample(MAUGA_SMASH.ms * 0.2).connected).toBe(false);
        expect(maugaSmashSample(MAUGA_SMASH.ms * 0.6).connected).toBe(true);
    });

    test('the lunge overshoots into the target rather than stopping short', () => {
        const contact = maugaSmashSample(MAUGA_SMASH.ms * 0.4);
        expect(contact.closing).toBeCloseTo(1, 5);
        expect(MAUGA_SMASH.lunge).toBeGreaterThan(0);
    });

    test('the impact spreads and fades', () => {
        const early = maugaSmashSample(MAUGA_SMASH.ms * 0.45);
        const late = maugaSmashSample(MAUGA_SMASH.ms * 0.95);
        expect(late.reach).toBeGreaterThan(early.reach);
        expect(late.impactAlpha).toBeLessThan(early.impactAlpha);
        expect(late.shardDistance).toBeGreaterThan(early.shardDistance);
    });

    test('nothing is drawn before contact', () => {
        const s = maugaSmashSample(MAUGA_SMASH.ms * 0.1);
        expect(s.impactAlpha).toBe(0);
        expect(s.shardAlpha).toBe(0);
        // The lunge is the only thing visible on the way in.
        expect(s.lungeAlpha).toBeGreaterThan(0);
    });

    test('alphas never go negative', () => {
        for (let ms = 0; ms <= MAUGA_SMASH.ms; ms += 20) {
            const s = maugaSmashSample(ms);
            expect(s.impactAlpha).toBeGreaterThanOrEqual(0);
            expect(s.shardAlpha).toBeGreaterThanOrEqual(0);
            expect(s.lungeAlpha).toBeGreaterThanOrEqual(0);
        }
    });
});
