import { cardPulseAlpha, chevronSamples, stripeOffset } from './fxMath';

test('stripeOffset wraps 0..1 over the period', () => {
    expect(stripeOffset(0, 4000)).toBe(0);
    expect(stripeOffset(2000, 4000)).toBe(0.5);
    expect(stripeOffset(4000, 4000)).toBe(0);
    expect(stripeOffset(6000, 4000)).toBe(0.5);
});

test('cardPulseAlpha stays low and is quieter for possibles', () => {
    const certain = cardPulseAlpha(0, false);
    const possible = cardPulseAlpha(0, true);
    expect(certain).toBeGreaterThan(0.1);
    expect(certain).toBeLessThan(0.5);
    expect(possible).toBeLessThan(certain);
    expect(cardPulseAlpha(1100, false)).not.toBe(certain);
});

test('chevronSamples sit between caster and target pointing along the path', () => {
    const samples = chevronSamples({ x: 0, y: 0 }, { x: 100, y: 0 }, 3);
    expect(samples).toHaveLength(3);
    expect(samples[0].x).toBeGreaterThan(0);
    expect(samples[2].x).toBeLessThan(100);
    expect(samples[0].angle).toBe(0);
    expect(samples[1].y).toBe(0);
});
