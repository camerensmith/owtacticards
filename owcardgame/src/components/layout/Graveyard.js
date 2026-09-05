import React, { useContext, useEffect, useState } from 'react';
import gameContext from 'context/gameContext';
import data from 'data';
import { heroCardImages } from '../../assets/imageImports';
import graveyardBus from '../../abilities/engine/graveyardBus';
import './Graveyard.css';

// Keep in step with the modal transition in Graveyard.css.
const CLOSE_MS = 240;
const MAX_STACK_CARDS = 3;

export default function Graveyard({ playerNum }) {
    const { gameState } = useContext(gameContext);
    const entries = gameState.graveyards?.[`player${playerNum}`] || [];

    const [isBrowsing, setIsBrowsing] = useState(false);
    const [selectRequest, setSelectRequest] = useState(null);

    // A hero module (Mercy) can open this graveyard in select mode.
    useEffect(() => {
        return graveyardBus.subscribe((request) => {
            setSelectRequest(request && request.playerNum === playerNum ? request : null);
        });
    }, [playerNum]);

    const isSelecting = !!selectRequest;
    const isOpen = isBrowsing || isSelecting;

    // Kept mounted through the close transition so it animates out, not just vanishes.
    const [isMounted, setIsMounted] = useState(false);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setIsMounted(true);
            // Paint once closed, then flip to open so the transition has two states.
            const raf = requestAnimationFrame(() => setIsVisible(true));
            return () => cancelAnimationFrame(raf);
        }
        setIsVisible(false);
        const timer = setTimeout(() => setIsMounted(false), CLOSE_MS);
        return () => clearTimeout(timer);
    }, [isOpen]);

    const close = () => {
        if (isSelecting) {
            graveyardBus.cancelSelection();
            return;
        }
        setIsBrowsing(false);
    };

    useEffect(() => {
        if (!isOpen) return;
        const onKeyDown = (e) => {
            if (e.key === 'Escape') close();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, isSelecting]);

    const choose = (heroId) => {
        if (!isSelecting) return;
        graveyardBus.resolveSelection(heroId);
    };

    const cardBack = heroCardImages['card-back'];
    const stackDepth = Math.min(entries.length, MAX_STACK_CARDS);

    return (
        <>
            <div
                className={`graveyard-pile${entries.length === 0 ? ' is-empty' : ''}`}
                onClick={() => entries.length > 0 && setIsBrowsing(true)}
                title={
                    entries.length === 0
                        ? 'Graveyard is empty'
                        : `View graveyard (${entries.length})`
                }
            >
                <div className='graveyard-stack'>
                    {stackDepth === 0 ? (
                        <div className='graveyard-stack-empty' />
                    ) : (
                        Array.from({ length: stackDepth }, (_, i) => (
                            <div
                                key={i}
                                className='graveyard-stack-card'
                                style={{
                                    backgroundImage: cardBack ? `url(${cardBack})` : undefined,
                                    transform: `translate(${i * 2}px, ${-i * 2}px)`,
                                    zIndex: i,
                                }}
                            />
                        ))
                    )}
                </div>
                <div className='graveyard-label'>
                    <span>Graveyard</span>
                    <span className='graveyard-count'>{entries.length}</span>
                </div>
            </div>

            {isMounted && (
                <div
                    className={`graveyard-modal-backdrop${isVisible ? ' is-open' : ''}`}
                    onClick={close}
                >
                    <div className='graveyard-modal' onClick={(e) => e.stopPropagation()}>
                        <div className='graveyard-modal-head'>
                            <div>
                                <h2>
                                    {isSelecting
                                        ? 'Resurrect a hero'
                                        : `Player ${playerNum} graveyard`}
                                </h2>
                                <p>
                                    {isSelecting
                                        ? 'Choose a fallen hero to bring back. Esc to cancel.'
                                        : `${entries.length} fallen — returns to the deck when it runs dry.`}
                                </p>
                            </div>
                            <button
                                type='button'
                                className='graveyard-close'
                                onClick={close}
                                aria-label='Close graveyard'
                            >
                                <i className='fas fa-times' />
                            </button>
                        </div>

                        <div className='graveyard-modal-body'>
                            {entries.length === 0 ? (
                                <p className='graveyard-empty'>No heroes have fallen yet.</p>
                            ) : (
                                <div className='graveyard-grid'>
                                    {entries.map((entry, i) => {
                                        const hero = data.heroes[entry.heroId];
                                        const image = heroCardImages[entry.heroId];
                                        return (
                                            <button
                                                type='button'
                                                key={`${entry.heroId}-${i}`}
                                                className={`graveyard-entry${isSelecting ? ' is-selectable' : ''}`}
                                                style={{ animationDelay: `${Math.min(i, 12) * 25}ms` }}
                                                onClick={() => choose(entry.heroId)}
                                                disabled={!isSelecting}
                                            >
                                                {image && (
                                                    <img src={image} alt={hero?.name || entry.heroId} />
                                                )}
                                                <p className='graveyard-entry-name'>
                                                    {hero?.name || entry.heroId}
                                                </p>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
