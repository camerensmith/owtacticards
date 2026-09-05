import {
    clearAIAutoSelect,
    closeModal,
    getModalState,
    setAIAutoSelect,
    showOnEnterChoice,
} from './modalController';

jest.mock('./actionsBus', () => ({ publish: jest.fn() }));

const a = { name: 'Chainsword', description: 'Deal 1 damage to the attacker.' };
const b = { name: 'Hold', description: 'Do not retaliate.' };

beforeEach(() => {
    jest.useFakeTimers();
    clearAIAutoSelect();
    closeModal();
    // The attacker's turn — which for an interrupt is not the same thing as
    // whose choice this is.
    window.__ow_getPlayerTurn = () => 2;
    window.__ow_practiceMode = false;
});

afterEach(() => {
    jest.useRealTimers();
    clearAIAutoSelect();
    closeModal();
    delete window.__ow_getPlayerTurn;
    delete window.__ow_practiceMode;
});

/*
 * Cyclo's Chainsword is offered to its owner when one of their heroes is
 * attacked, which happens on the attacker's turn. Deciding by turn alone handed
 * the player's retaliation to the AI to answer for them — most visibly against
 * a Bastion token, which only ever fires during the AI's own turn.
 */
describe('an interrupt raised on the opponent\'s turn', () => {
    test('is put to the human when it is their card', () => {
        setAIAutoSelect(() => 1);

        showOnEnterChoice('Cyclo', a, b, jest.fn(), 1);

        expect(getModalState().isOpen).toBe(true);
        expect(getModalState().data.heroName).toBe('Cyclo');
    });

    test('is taken by the AI when it is the AI\'s card', () => {
        setAIAutoSelect(() => 0);
        const onSelect = jest.fn();

        showOnEnterChoice('Cyclo', a, b, onSelect, 2);

        expect(getModalState().isOpen).toBe(false);
        jest.runAllTimers();
        expect(onSelect).toHaveBeenCalledWith(0);
    });

    test('is the human\'s in practice, where they hold both seats', () => {
        window.__ow_practiceMode = true;
        setAIAutoSelect(() => 1);

        showOnEnterChoice('Cyclo', a, b, jest.fn(), 2);

        expect(getModalState().isOpen).toBe(true);
    });
});

describe('a choice with no owner named', () => {
    test('still falls back to whose turn it is', () => {
        setAIAutoSelect(() => 0);
        const onSelect = jest.fn();

        showOnEnterChoice('Tracer', a, b, onSelect);

        expect(getModalState().isOpen).toBe(false);
        jest.runAllTimers();
        expect(onSelect).toHaveBeenCalledWith(0);
    });

    test('opens for the human on their own turn', () => {
        window.__ow_getPlayerTurn = () => 1;

        showOnEnterChoice('Tracer', a, b, jest.fn());

        expect(getModalState().isOpen).toBe(true);
    });
});
