import { LIFE_GRIP, TREE_OF_LIFE, lifeGripSample, treeOfLifeSample } from './fxMath';

const from = { x: 80, y: 400 };
const to = { x: 400, y: 200 };

describe('Life Grip', () => {
    test('travels from the ally to Lifeweaver', () => {
        expect(lifeGripSample(0, from, to).head.x).toBeCloseTo(from.x);
        const end = lifeGripSample(LIFE_GRIP.ms, from, to);
        expect(end.head.x).toBeCloseTo(to.x);
        expect(end.done).toBe(true);
    });

    test('petals sit on the ribbon and never go negative', () => {
        const mid = lifeGripSample(LIFE_GRIP.ms * 0.5, from, to);
        expect(mid.petals.length).toBeGreaterThan(0);
        expect(mid.alpha).toBeGreaterThan(0);
    });
});

describe('Tree of Life', () => {
    test('opens then fades', () => {
        const early = treeOfLifeSample(TREE_OF_LIFE.ms * 0.2);
        const late = treeOfLifeSample(TREE_OF_LIFE.ms * 0.9);
        expect(early.open).toBeGreaterThan(0);
        expect(late.alpha).toBeLessThan(early.alpha);
        expect(treeOfLifeSample(TREE_OF_LIFE.ms).done).toBe(true);
    });

    test('has one petal per spoke', () => {
        expect(treeOfLifeSample(TREE_OF_LIFE.ms * 0.4).petals).toHaveLength(TREE_OF_LIFE.petals);
    });
});
