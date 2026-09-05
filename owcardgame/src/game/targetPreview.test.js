import {
    columnCardIds,
    emptyPreview,
    hyperionHoverPreview,
    isLegalCardTarget,
    isLegalRowTarget,
    livingOnRow,
    previewEventForHover,
    previewKey,
    resolveTargetPreview,
} from './targetPreview';

function board() {
    const rows = {
        '1f': { cardIds: ['1baptiste'], synergy: 0 },
        '1m': { cardIds: ['1ana'], synergy: 0 },
        '1b': { cardIds: ['1mercy'], synergy: 2 },
        '2f': { cardIds: ['2reaper', '2tracer'], synergy: 1 },
        '2m': { cardIds: ['2genji'], synergy: 0 },
        '2b': { cardIds: ['2widow'], synergy: 3 },
    };
    const cards = {
        '1baptiste': { id: 'baptiste', health: 4 },
        '1ana': { id: 'ana', health: 3 },
        '1mercy': { id: 'mercy', health: 3 },
        '2reaper': { id: 'reaper', health: 2 },
        '2tracer': { id: 'tracer', health: 2 },
        '2genji': { id: 'genji', health: 3 },
        '2widow': { id: 'widowmaker', health: 2 },
    };
    return {
        getRow: (id) => rows[id],
        getCard: (id) => cards[id],
        rows,
        cards,
    };
}

test('columnCardIds collects the same slot across front, middle, and back', () => {
    const { getRow } = board();
    expect(columnCardIds(2, 0, getRow)).toEqual(['2reaper', '2genji', '2widow']);
    expect(columnCardIds(2, 1, getRow)).toEqual(['2tracer']);
    expect(columnCardIds(1, 0, getRow)).toEqual(['1baptiste', '1ana', '1mercy']);
});

test('livingOnRow skips dead cards', () => {
    const { getRow, getCard, cards } = board();
    cards['2tracer'].health = 0;
    expect(livingOnRow('2f', getRow, getCard)).toEqual(['2reaper']);
});

test('default card hover previews only that card', () => {
    const { getRow, getCard } = board();
    const preview = resolveTargetPreview(
        { cardId: '2reaper', rowId: '2f', liIndex: 0 },
        { fromCardId: '1baptiste' },
        getRow,
        getCard,
    );
    expect(preview.cardIds).toEqual(['2reaper']);
    expect(preview.rowIds).toEqual([]);
    expect(preview.column).toBeNull();
    expect(preview.possibles).toEqual([]);
    expect(preview.fromCardId).toBe('1baptiste');
});

test('column hover previews every card in that slot index', () => {
    const { getRow, getCard } = board();
    const preview = resolveTargetPreview(
        { cardId: '2reaper', rowId: '2f', liIndex: 0 },
        { previewShape: 'column', fromCardId: '1baptiste' },
        getRow,
        getCard,
    );
    expect(preview.cardIds).toEqual(['2reaper', '2genji', '2widow']);
    expect(preview.column).toEqual({ playerNum: 2, index: 0 });
});

test('row hover previews the trough and living cards on it', () => {
    const { getRow, getCard } = board();
    const preview = resolveTargetPreview(
        { rowId: '2f' },
        { previewShape: 'row', fromCardId: '1junkrat' },
        getRow,
        getCard,
    );
    expect(preview.rowIds).toEqual(['2f']);
    expect(preview.cardIds).toEqual(['2reaper', '2tracer']);
});

test('custom preview override wins over shape defaults', () => {
    const { getRow, getCard } = board();
    const preview = resolveTargetPreview(
        { cardId: '2reaper', rowId: '2f', liIndex: 0 },
        {
            previewShape: 'card',
            preview: () => ({ cardIds: ['2reaper'], possibles: ['2genji'] }),
        },
        getRow,
        getCard,
    );
    expect(preview.cardIds).toEqual(['2reaper']);
    expect(preview.possibles).toEqual(['2genji']);
});

test('empty hover returns an empty preview', () => {
    const { getRow, getCard } = board();
    expect(resolveTargetPreview(null, {}, getRow, getCard)).toEqual(emptyPreview());
});

test('hyperionHoverPreview marks other living enemies possible only when overkill would apply', () => {
    const { getRow, getCard } = board();
    const hover = { cardId: '2reaper', rowId: '2f', liIndex: 0 };
    const withOverkill = hyperionHoverPreview(hover, {
        playerNum: 1,
        fromCardId: '1bravox2',
        getRow,
        getCard,
        unusedFront: 2,
        unusedMiddle: 0,
        unusedBack: 3,
    });
    expect(withOverkill.cardIds).toEqual(['2reaper']);
    expect(withOverkill.possibles.sort()).toEqual(['2genji', '2tracer', '2widow']);

    const noOverkill = hyperionHoverPreview(hover, {
        playerNum: 1,
        fromCardId: '1bravox2',
        getRow,
        getCard,
        unusedFront: 1,
        unusedMiddle: 0,
        unusedBack: 0,
    });
    expect(noOverkill.cardIds).toEqual(['2reaper']);
    expect(noOverkill.possibles).toEqual([]);
});

test('isLegalCardTarget respects damage vs heal sides', () => {
    expect(isLegalCardTarget('2reaper', { isDamage: true }, 1)).toBe(true);
    expect(isLegalCardTarget('1ana', { isDamage: true }, 1)).toBe(false);
    expect(isLegalCardTarget('1ana', { isHeal: true }, 1)).toBe(true);
    expect(isLegalCardTarget('2reaper', { isHeal: true }, 1)).toBe(false);
});

test('isLegalRowTarget skips hands and wrong-side rows', () => {
    expect(isLegalRowTarget('player1hand', { isDamage: true }, 1)).toBe(false);
    expect(isLegalRowTarget('1f', { isDamage: true }, 1)).toBe(false);
    expect(isLegalRowTarget('2f', { isDamage: true }, 1)).toBe(true);
    expect(isLegalRowTarget('1f', { isBuff: true }, 1)).toBe(true);
});

test('previewEventForHover clears illegal and hand hovers', () => {
    const { getRow, getCard } = board();
    expect(previewEventForHover(
        { cardId: '1ana', rowId: '1m', liIndex: 0 },
        { isDamage: true },
        1,
        getRow,
        getCard,
    ).type).toBe('clear');
    expect(previewEventForHover(
        { cardId: '1ana', rowId: 'player1hand', liIndex: 0 },
        {},
        1,
        getRow,
        getCard,
    ).type).toBe('clear');
    expect(previewEventForHover(
        { cardId: '2reaper', rowId: 'player2area', liIndex: 0 },
        { isDamage: true },
        1,
        getRow,
        getCard,
    ).type).toBe('clear');
});

test('previewEventForHover publishes a column payload for Baptiste-style hover', () => {
    const { getRow, getCard } = board();
    const event = previewEventForHover(
        { cardId: '2reaper', rowId: '2f', liIndex: 0 },
        { previewShape: 'column', isDamage: true, fromCardId: '1baptiste' },
        1,
        getRow,
        getCard,
    );
    expect(event.type).toBe('preview');
    expect(event.payload.cardIds).toEqual(['2reaper', '2genji', '2widow']);
    expect(event.payload.column).toEqual({ playerNum: 2, index: 0 });
});

test('previewKey is stable for equal sets in any order', () => {
    const a = { cardIds: ['2a', '2b'], rowIds: ['2f'], column: null, possibles: ['2c'], fromCardId: '1x' };
    const b = { cardIds: ['2b', '2a'], rowIds: ['2f'], column: null, possibles: ['2c'], fromCardId: '1x' };
    expect(previewKey(a)).toBe(previewKey(b));
});
