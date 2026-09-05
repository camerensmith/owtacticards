import {
    clearAIAutoSelect,
    closeModal,
    getModalState,
    setAIAutoSelect,
    showChoiceModal,
} from './modalController';

jest.mock('./actionsBus', () => ({ publish: jest.fn() }));

const choices = [
    { title: 'Pulse Pistols', description: '2 damage to one enemy' },
    { title: 'Pulse Pistols', description: '1 damage to two enemies' },
];

beforeEach(() => {
    jest.useFakeTimers();
    clearAIAutoSelect();
    closeModal();
    window.__ow_getPlayerTurn = () => 2;
    window.__ow_practiceMode = false;
    window.__ow_isAITurn = false;
    window.__ow_aiTriggering = false;
});

afterEach(() => {
    jest.useRealTimers();
    clearAIAutoSelect();
    closeModal();
    delete window.__ow_getPlayerTurn;
    delete window.__ow_practiceMode;
});

describe('an on-enter choice on the AI turn', () => {
    test('is taken by the AI, not put on screen', () => {
        setAIAutoSelect(() => 1);
        const onSelect = jest.fn();

        showChoiceModal('Tracer', choices, onSelect);

        expect(getModalState().isOpen).toBe(false);
        jest.runAllTimers();
        expect(onSelect).toHaveBeenCalledWith(1);
    });

    /*
     * The auto-select callback reaches the controller through a dynamic import
     * during AI setup, so an early choice can find none installed. It must
     * still not become the human's decision — the AI takes the first option
     * rather than stopping and asking.
     */
    test('falls back to the first option when no callback is installed', () => {
        const onSelect = jest.fn();

        showChoiceModal('Tracer', choices, onSelect);

        expect(getModalState().isOpen).toBe(false);
        jest.runAllTimers();
        expect(onSelect).toHaveBeenCalledWith(0);
    });

    test('is taken even with both AI flags cleared', () => {
        setAIAutoSelect(() => 1);
        const onSelect = jest.fn();

        showChoiceModal('Tracer', choices, onSelect);

        expect(getModalState().isOpen).toBe(false);
        jest.runAllTimers();
        expect(onSelect).toHaveBeenCalledWith(1);
    });
});

describe('an on-enter choice that is really the human\'s', () => {
    test('opens the modal on the human turn', () => {
        window.__ow_getPlayerTurn = () => 1;

        showChoiceModal('Tracer', choices, jest.fn());

        expect(getModalState().isOpen).toBe(true);
        expect(getModalState().data.heroName).toBe('Tracer');
    });

    // Practice hands Player 2 to the human, so their choices are their own.
    test('opens the modal for Player 2 in practice', () => {
        window.__ow_practiceMode = true;
        setAIAutoSelect(() => 1);

        showChoiceModal('Tracer', choices, jest.fn());

        expect(getModalState().isOpen).toBe(true);
    });
});
