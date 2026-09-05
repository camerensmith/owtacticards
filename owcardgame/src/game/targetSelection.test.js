import {
    REJECT,
    commitsOnCancel,
    rejectPick,
    selectionPrompt,
} from './targetSelection';

const cards = {
    '1ana': { id: 'ana', health: 3 },
    '1reaper': { id: 'reaper', health: 4 },
    '2mercy': { id: 'mercy', health: 3 },
    '2mei': { id: 'mei', health: 3 },
    '2dead': { id: 'bastion', health: 0 },
};
const getCard = (id) => cards[id];
const enemyRules = { side: 'enemy', casterPlayerNum: 1, getCard };

describe('refusing a pick', () => {
    test('accepts a living enemy', () => {
        expect(rejectPick({ cardId: '2mercy', rowId: '2f' }, [], enemyRules)).toBeNull();
    });

    test('refuses your own hero when an enemy is wanted', () => {
        expect(rejectPick({ cardId: '1ana', rowId: '1f' }, [], enemyRules)).toBe(REJECT.ally);
    });

    test('refuses an enemy when an ally is wanted', () => {
        const healRules = { side: 'ally', casterPlayerNum: 1, getCard };
        expect(rejectPick({ cardId: '2mercy', rowId: '2f' }, [], healRules)).toBe(REJECT.enemy);
        expect(rejectPick({ cardId: '1ana', rowId: '1f' }, [], healRules)).toBeNull();
    });

    test('takes either side when none is required', () => {
        const anyRules = { casterPlayerNum: 1, getCard };
        expect(rejectPick({ cardId: '1ana', rowId: '1f' }, [], anyRules)).toBeNull();
        expect(rejectPick({ cardId: '2mercy', rowId: '2f' }, [], anyRules)).toBeNull();
    });

    test('refuses a hero that is already down', () => {
        expect(rejectPick({ cardId: '2dead', rowId: '2f' }, [], enemyRules)).toBe(REJECT.dead);
    });

    // Nothing checked this before, so a two-target ability could be aimed
    // twice at the same hero.
    test('refuses a hero already chosen', () => {
        const picked = [{ cardId: '2mercy', rowId: '2f' }];
        expect(rejectPick({ cardId: '2mercy', rowId: '2f' }, picked, enemyRules))
            .toBe(REJECT.duplicate);
        expect(rejectPick({ cardId: '2mei', rowId: '2f' }, picked, enemyRules)).toBeNull();
    });

    test('allows a repeat where the ability wants one', () => {
        const picked = [{ cardId: '2mercy', rowId: '2f' }];
        expect(rejectPick(
            { cardId: '2mercy', rowId: '2f' },
            picked,
            { ...enemyRules, unique: false },
        )).toBeNull();
    });

    // Ashe's Split Fire ties both shots to one row.
    test('refuses a second pick from another row', () => {
        const picked = [{ cardId: '2mercy', rowId: '2f' }];
        const rules = { ...enemyRules, sameRow: true };
        expect(rejectPick({ cardId: '2mei', rowId: '2b' }, picked, rules)).toBe(REJECT.otherRow);
        expect(rejectPick({ cardId: '2mei', rowId: '2f' }, picked, rules)).toBeNull();
    });

    test('the first pick sets the row rather than being judged against it', () => {
        expect(rejectPick({ cardId: '2mei', rowId: '2b' }, [], { ...enemyRules, sameRow: true }))
            .toBeNull();
    });

    test('survives missing input', () => {
        expect(rejectPick(null, [], enemyRules)).toBeNull();
        expect(rejectPick({ cardId: '2mercy' }, null, {})).toBeNull();
        expect(rejectPick({ cardId: '2mercy' })).toBeNull();
    });
});

/*
 * Right-click means two different things depending on what is in hand, and
 * conflating them is what lost abilities: with a target picked it fires at what
 * has been chosen, with nothing picked it declines the ability.
 */
describe('backing out of selection', () => {
    test('commits what has been picked', () => {
        expect(commitsOnCancel([{ cardId: '2mercy' }])).toBe(true);
        expect(commitsOnCancel([{ cardId: '2mercy' }, { cardId: '2mei' }])).toBe(true);
    });

    test('cancels outright with nothing picked', () => {
        expect(commitsOnCancel([])).toBe(false);
        expect(commitsOnCancel()).toBe(false);
    });
});

describe('the selection prompt', () => {
    test('shows progress and the way out for a multi-target pick', () => {
        expect(selectionPrompt('Ashe: Split Fire', 0, 2))
            .toBe('Ashe: Split Fire (1/2) — right-click to stop here');
        expect(selectionPrompt('Ashe: Split Fire', 1, 2))
            .toBe('Ashe: Split Fire (2/2) — right-click to stop here');
    });

    test('stays plain for a single target', () => {
        expect(selectionPrompt('Ashe: The Viper', 0, 1)).toBe('Ashe: The Viper');
    });

    // The loop re-prompts immediately, so a refusal has to ride in the prompt
    // or it would be overwritten before it could be read.
    test('carries a refusal in place of the label', () => {
        expect(selectionPrompt('Ashe: Split Fire', 1, 2, REJECT.otherRow))
            .toBe(`${REJECT.otherRow} (2/2) — right-click to stop here`);
        expect(selectionPrompt('Ashe: The Viper', 0, 1, REJECT.ally)).toBe(REJECT.ally);
    });
});
