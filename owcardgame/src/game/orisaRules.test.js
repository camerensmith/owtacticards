import {
    SUPERCHARGER_BUFF_ID,
    SUPERCHARGER_ROW_ID,
    isSupercharged,
    createSuperchargerBuff,
    rowHasSupercharger,
    livingHeroIdsForSupercharger,
    superchargerPowerBonus,
} from './orisaRules';

test('supercharger buff is detectable on a card', () => {
    expect(isSupercharged({ effects: [{ id: SUPERCHARGER_BUFF_ID }] })).toBe(true);
    expect(isSupercharged({ effects: [] })).toBe(false);
    expect(createSuperchargerBuff().id).toBe(SUPERCHARGER_BUFF_ID);
});

test('rowHasSupercharger reads the row token', () => {
    expect(rowHasSupercharger({
        allyEffects: [{ id: SUPERCHARGER_ROW_ID }],
    })).toBe(true);
    expect(rowHasSupercharger({ allyEffects: [] })).toBe(false);
});

test('livingHeroIdsForSupercharger skips dead and turrets', () => {
    const cards = {
        '1orisa': { id: 'orisa', health: 5 },
        '1reaper': { id: 'reaper', health: 0 },
        '1turret': { id: 'turret', health: 2 },
        '1ana': { id: 'ana', health: 3 },
    };
    expect(livingHeroIdsForSupercharger(
        { cardIds: ['1orisa', '1reaper', '1turret', '1ana'] },
        (id) => cards[id],
    )).toEqual(['1orisa', '1ana']);
});

test('superchargerPowerBonus is +1 only while buffed', () => {
    expect(superchargerPowerBonus({ effects: [{ id: SUPERCHARGER_BUFF_ID }] })).toBe(1);
    expect(superchargerPowerBonus({ effects: [] })).toBe(0);
});

test('shouldApplySuperchargerOnEnter only for allies on a charged row', () => {
    const { shouldApplySuperchargerOnEnter } = require('./orisaRules');
    const getRow = (id) => (id === '1f'
        ? { allyEffects: [{ id: SUPERCHARGER_ROW_ID }] }
        : { allyEffects: [] });
    expect(shouldApplySuperchargerOnEnter({
        cardId: '1reaper',
        rowId: '1f',
        getRow,
    })).toBe(true);
    expect(shouldApplySuperchargerOnEnter({
        cardId: '2reaper',
        rowId: '1f',
        getRow,
    })).toBe(false);
    expect(shouldApplySuperchargerOnEnter({
        cardId: '1reaper',
        rowId: '1m',
        getRow,
    })).toBe(false);
});
