import React, { useContext, useMemo, useState } from 'react';
import gameContext from 'context/gameContext';
import turnContext from 'context/turnContext';
import data from 'data';
import { ACTIONS } from 'App';
import { heroCardImages } from '../../assets/imageImports';
import { practiceRoster } from '../../game/practice';
import './PracticePanel.css';

/**
 * Practice sandbox controls.
 *
 * Puts any hero — including summon-only specials — into either player's hand on
 * demand, so a card can be tested against any other card without waiting on the
 * deck. Only mounted in practice mode.
 */
export default function PracticePanel() {
    const { gameState, dispatch } = useContext(gameContext);
    const { turnState, setTurnState } = useContext(turnContext);

    const [isOpen, setIsOpen] = useState(true);
    const [side, setSide] = useState(1);
    const [query, setQuery] = useState('');

    const roster = useMemo(() => practiceRoster(data.heroes), []);
    const visible = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return roster;
        return roster.filter((hero) => hero.name.toLowerCase().includes(q));
    }, [roster, query]);

    const cardsInPlay = gameState.playerCards?.[`player${side}cards`]?.cards || {};

    const addCard = (heroId) => {
        const playerHeroId = `${side}${heroId}`;
        dispatch({ type: ACTIONS.CREATE_CARD, payload: { playerNum: side, heroId } });
        dispatch({ type: ACTIONS.ADD_CARD_TO_HAND, payload: { playerNum: side, playerHeroId } });
    };

    // Card ids are `${playerNum}${heroId}`, so a side can only hold one of each
    // hero at a time. It frees up again once that copy dies.
    const alreadyInPlay = (heroId) => Boolean(cardsInPlay[`${side}${heroId}`]);

    const switchTurn = () => {
        setTurnState((prev) => ({ ...prev, playerTurn: prev.playerTurn === 1 ? 2 : 1 }));
    };

    if (!isOpen) {
        return (
            <div className='practice-panel'>
                <button type='button' className='practice-toggle' onClick={() => setIsOpen(true)}>
                    Practice
                </button>
            </div>
        );
    }

    return (
        <div className='practice-panel'>
            <button type='button' className='practice-toggle' onClick={() => setIsOpen(false)}>
                Hide
            </button>

            <div className='practice-body'>
                <div className='practice-head'>
                    <h3>Practice</h3>
                    <p>No AI. You play both sides.</p>
                </div>

                <div className='practice-controls'>
                    <div className='practice-sides'>
                        {[1, 2].map((num) => (
                            <button
                                type='button'
                                key={num}
                                className={`practice-side${side === num ? ' is-active' : ''}`}
                                onClick={() => setSide(num)}
                                aria-pressed={side === num}
                            >
                                Player {num}
                            </button>
                        ))}
                    </div>
                    <input
                        className='practice-search'
                        type='search'
                        value={query}
                        placeholder='Search heroes…'
                        onChange={(e) => setQuery(e.target.value)}
                    />
                </div>

                <div className='practice-list'>
                    {visible.length === 0 ? (
                        <p className='practice-empty'>No hero matches “{query}”.</p>
                    ) : (
                        visible.map((hero) => {
                            const inPlay = alreadyInPlay(hero.id);
                            return (
                                <button
                                    type='button'
                                    key={hero.id}
                                    className='practice-card'
                                    onClick={() => addCard(hero.id)}
                                    disabled={inPlay}
                                    title={
                                        inPlay
                                            ? `Player ${side} already has ${hero.name}`
                                            : `Add ${hero.name} to Player ${side}'s hand`
                                    }
                                >
                                    {heroCardImages[hero.id] && (
                                        <img src={heroCardImages[hero.id]} alt={hero.name} loading='lazy' />
                                    )}
                                    <span className={hero.special ? 'practice-special' : undefined}>
                                        {hero.name}
                                    </span>
                                </button>
                            );
                        })
                    )}
                </div>

                <div className='practice-foot'>
                    Turn: Player {turnState.playerTurn}{' '}
                    <button type='button' className='practice-side' onClick={switchTurn}>
                        Switch
                    </button>
                </div>
            </div>
        </div>
    );
}
