import { Effects } from './effectsBus';

test('preview event carries the hover hit set', () => {
    expect(Effects.preview({ cardIds: ['2reaper'], possibles: ['2genji'] })).toEqual({
        type: 'fx:preview',
        payload: { cardIds: ['2reaper'], possibles: ['2genji'] },
    });
});

test('previewClear names the clear event', () => {
    expect(Effects.previewClear()).toEqual({ type: 'fx:previewClear', payload: {} });
});

test('grenade event can carry a throw config', () => {
    const cfg = { travelMs: 200, arc: 40 };
    expect(Effects.grenade('1mccree', '2f', 0xfa9c1e, cfg).payload.cfg).toEqual(cfg);
});

test('mine blast, sentry shot, and Lifeweaver events name their payloads', () => {
    expect(Effects.mineBlast('2ana')).toEqual({ type: 'fx:mineBlast', payload: { cardId: '2ana' } });
    expect(Effects.sentryShot('2f', '2ana')).toEqual({ type: 'fx:sentryShot', payload: { rowId: '2f', cardId: '2ana' } });
    expect(Effects.lifeGrip('1ana', '1lifeweaver')).toEqual({
        type: 'fx:lifeGrip',
        payload: { fromCardId: '1ana', toCardId: '1lifeweaver' },
    });
    expect(Effects.treeOfLife(['1lifeweaver', '1ana'])).toEqual({
        type: 'fx:treeOfLife',
        payload: { cardIds: ['1lifeweaver', '1ana'] },
    });
});
