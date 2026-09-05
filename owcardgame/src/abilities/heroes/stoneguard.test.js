import { onDeath, onEnter } from './stoneguard';
import { dealDamage } from '../engine/damageBus';
import { playAudioByKey } from '../../assets/imageImports';
import effectsBus, { Effects } from '../engine/effectsBus';

var onDamage;

jest.mock('../../assets/imageImports', () => ({
    playAudioByKey: jest.fn(),
}));

jest.mock('../engine/damageBus', () => ({
    dealDamage: jest.fn(),
    subscribe: (fn) => {
        onDamage = fn;
        return () => {};
    },
}));

jest.mock('../engine/effectsBus', () => {
    const Effects = {
        shatter: (cardId) => ({ type: 'fx:shatter', payload: { cardId } }),
        ward: (cardId) => ({ type: 'fx:ward', payload: { cardId } }),
        impact: (cardId) => ({ type: 'fx:impact', payload: { cardId } }),
        smash: (cardIds) => ({ type: 'fx:smash', payload: { cardIds } }),
        rowWash: (rowId, color) => ({ type: 'fx:rowWash', payload: { rowId, color } }),
    };
    return {
        __esModule: true,
        default: { publish: jest.fn(), subscribe: jest.fn() },
        Effects,
    };
});

function setup() {
    const cards = {
        '1stoneguard': { id: 'stoneguard', health: 0, armor: 0 },
        '1ana': { id: 'ana', health: 3, armor: 0 },
        '1mercy': { id: 'mercy', health: 2, armor: 1 },
        '2reaper': { id: 'reaper', health: 3 },
        '2widow': { id: 'widowmaker', health: 2 },
        '2hanzo': { id: 'hanzo', health: 2 },
    };
    window.__ow_getCard = (id) => cards[id];
    window.__ow_getRow = (id) => {
        if (id === '1m') return { cardIds: ['1ana', '1stoneguard', '1mercy'] };
        if (id === '2f') return { cardIds: ['2reaper', '2widow', '2hanzo'] };
        return { cardIds: [] };
    };
    window.__ow_updateSynergy = jest.fn();
    window.__ow_dispatchArmorUpdate = jest.fn();
    return cards;
}

test('Stoneguard death shatters, hits the attacker and neighbors, and wards nearby allies', () => {
    setup();
    onDamage({
        type: 'damage',
        targetCardId: '1stoneguard',
        sourceCardId: '2reaper',
        targetRow: '1m',
    });

    onDeath({ playerHeroId: '1stoneguard', rowId: '1m' });

    expect(effectsBus.publish).toHaveBeenCalledWith(Effects.shatter('1stoneguard'));
    expect(playAudioByKey).toHaveBeenCalledWith('stoneguard-explode');
    // The relic burst is the effect, and Stoneguard has already left the board,
    // so no beam may be drawn from his card.
    const burst = { skipProjectileFx: true };
    expect(dealDamage).toHaveBeenCalledWith('2reaper', '2f', 1, false, '1stoneguard', false, burst);
    expect(dealDamage).toHaveBeenCalledWith('2widow', '2f', 1, false, '1stoneguard', false, burst);
    expect(dealDamage).toHaveBeenCalledWith('2hanzo', '2f', 1, false, '1stoneguard', false, burst);
    expect(window.__ow_updateSynergy).toHaveBeenCalledWith('1m', 1);
    expect(window.__ow_dispatchArmorUpdate).toHaveBeenCalledWith('1ana', 1);
    expect(window.__ow_dispatchArmorUpdate).toHaveBeenCalledWith('1mercy', 2);
    expect(effectsBus.publish).toHaveBeenCalledWith(Effects.ward('1ana'));
    expect(effectsBus.publish).toHaveBeenCalledWith(Effects.ward('1mercy'));
});

test('Stoneguard enter slams with dust and plays enter audio', () => {
    setup();
    onEnter({ playerHeroId: '1stoneguard', rowId: '1m' });
    expect(playAudioByKey).toHaveBeenCalledWith('stoneguard-enter');
    expect(effectsBus.publish).toHaveBeenCalledWith(Effects.smash(['1stoneguard']));
});
