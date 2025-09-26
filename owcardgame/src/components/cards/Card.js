import React, { useContext, useState, useEffect } from 'react';
import { Draggable } from 'react-beautiful-dnd';
import gameContext from 'context/gameContext';
import turnContext from 'context/turnContext';
import CardEffects from 'components/cards/CardEffects';
import HealthCounter from 'components/counters/HealthCounter';
import ShieldCounter from 'components/counters/ShieldCounter';
import ShieldBashOverlay from '../effects/ShieldBashOverlay';
import SuitedUpOverlay from '../effects/SuitedUpOverlay';
import { heroCardImages } from '../../assets/imageImports';
import ContextMenu from './ContextMenu';
import actionsBus, { Actions } from '../../abilities/engine/actionsBus';
import effectsBus, { Effects } from '../../abilities/engine/effectsBus';

export default function Card(props) {
    // Context
    const { gameState, dispatch } = useContext(gameContext);
    const { turnState, setTurnState } = useContext(turnContext);
    const [imageLoaded, setImageLoaded] = useState(false);

    // Variables
    const playerHeroId = props.playerHeroId;
    const playerNum = props.playerNum;
    const playerCardsId = `player${playerNum}cards`;
    const rowId = props.rowId;
    const rowPosition = rowId[1];
    const index = props.index;

    // Get card attributes from relevant player
    const {
        id,
        name,
        health,
        power,
        synergy,
        shield,
        effects,
        enemyEffects,
        allyEffects,
        isPlayed,
        isDiscarded,
    } = gameState.playerCards[playerCardsId].cards[playerHeroId];

    function getStyle(style, snapshot) {
        if (!snapshot.isDropAnimating) return style;
        return {
            ...style,
            transitionDuration: '0.001s',
        };
    }

    const [menu, setMenu] = useState(null);

    function buildContextMenu(e) {
        e.preventDefault();
        if (turnState.playerTurn !== playerNum) return;
        const items = [];
        
        // Check if hero has already used ultimate this round
        const heroId = playerHeroId.slice(1);
        const playerKey = `player${playerNum}`;
        const hasUsedUltimate = gameState.ultimateUsage?.[playerKey]?.includes(heroId);
        
        // Check if hero is affected by Shield Bash (cannot use ultimate)
        const card = gameState.playerCards[`player${playerNum}cards`]?.cards?.[playerHeroId];
        const hasShieldBash = Array.isArray(card?.effects) && card.effects.some(effect => effect?.id === 'shield-bash');
        
        items.push({
            label: hasUsedUltimate ? 'Ultimate (Used)' : hasShieldBash ? 'Ultimate (Shield Bashed)' : 'Ultimate',
            disabled: hasUsedUltimate || hasShieldBash,
            onClick: () => {
                if (hasUsedUltimate || hasShieldBash) return; // Don't allow if already used or shield bashed
                
                // Get current row synergy and ultimate cost
                const currentRow = gameState.rows[rowId];
                const currentSynergy = currentRow ? currentRow.synergy : 0;
                
                // Get ultimate cost from hero data
                const heroData = gameState.playerCards[playerCardsId]?.cards?.[playerHeroId];
                const ultimateCost = heroData?.ultimateCost || 3; // Default to 3 if not specified
                
                actionsBus.publish(Actions.requestUltimate(playerHeroId, rowId, ultimateCost));
                setMenu(null);
            },
        });
        if (id === 'ramattra') {
            items.push({
                label: 'Transform',
                onClick: () => {
                    actionsBus.publish(Actions.requestTransform(playerHeroId));
                    setMenu(null);
                },
            });
        }
        setMenu({ x: e.clientX, y: e.clientY, items });
    }

    // Check if D.Va is in "Suited Up" state (not draggable)
    const isSuitedUp = Array.isArray(effects) && effects.some(effect => effect?.id === 'suited-up');
    
    // Check if card is frozen (Mei Cryo Freeze)
    const isFrozen = Array.isArray(effects) && 
        effects.some(effect => effect?.id === 'cryo-freeze' && effect?.type === 'immunity');

    return isDiscarded ? null : (
        <Draggable
            draggableId={playerHeroId}
            index={index}
            isDragDisabled={isPlayed || turnState.playerTurn !== playerNum || isSuitedUp}
        >
            {(provided, snapshot) => (
                <div className={`cardcontainer`}>
                    <li
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className={`${
                            snapshot.isDragging ? 'dragging' : 'not-dragging'
                        }`}
                        ref={provided.innerRef}
                        style={getStyle(
                            provided.draggableProps.style,
                            snapshot
                        )}
                        onContextMenu={buildContextMenu}
                    >
                        {playerNum === 2 ? (
                            <CardEffects
                                type='enemy'
                                effects={enemyEffects}
                                setCardFocus={props.setCardFocus}
                            />
                        ) : (
                            <CardEffects
                                type='ally'
                                effects={allyEffects}
                                setCardFocus={props.setCardFocus}
                            />
                        )}
                        <div
                            id={`${playerHeroId}`}
                            className={`card ${health > 0 ? 'alive' : 'dead'} ${isSuitedUp ? 'suited-up' : ''} ${isFrozen ? 'frozen' : ''}`}
                            onClick={(e) => {
                                // SHIFT + LEFT CLICK should always open focus preview, regardless of turn
                                if (e.shiftKey) {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    props.setCardFocus({ playerHeroId, rowId });
                                    return;
                                }
                            }}
                        >
                            <EffectBadges playerHeroId={playerHeroId} />
                            <ShieldBashOverlay playerHeroId={playerHeroId} rowId={rowId} />
                            <SuitedUpOverlay effects={effects} />
                            {imageLoaded === playerHeroId &&
                                (turnState.playerTurn === playerNum ||
                                isPlayed ? (
                                    <HealthCounter
                                        type='cardcounter'
                                        health={health}
                                    />
                                ) : null)}
                            {turnState.playerTurn === playerNum || isPlayed
                                ? shield > 0 && (
                                      <ShieldCounter
                                          type='cardcounter'
                                          shield={shield}
                                      />
                                  )
                                : null}
                            <img
                                onLoad={() => setImageLoaded(playerHeroId)}
                                src={
                                    turnState.playerTurn === playerNum ||
                                    isPlayed
                                        ? heroCardImages[id]
                                        : heroCardImages['card-back']
                                }
                                className={`cardimg ${
                                    turnState.playerTurn === playerNum ||
                                    isPlayed
                                        ? 'show-card'
                                        : 'hide-card'
                                }`}
                                alt={`${name} Card`}
                            />
                        </div>
                        {menu && (
                            <ContextMenu
                                x={menu.x}
                                y={menu.y}
                                items={menu.items}
                                onClose={() => setMenu(null)}
                            />
                        )}
                        {playerNum === 2 ? (
                            <CardEffects
                                type='ally'
                                effects={allyEffects}
                                setCardFocus={props.setCardFocus}
                            />
                        ) : (
                            <CardEffects
                                type='enemy'
                                effects={enemyEffects}
                                setCardFocus={props.setCardFocus}
                            />
                        )}
                    </li>
                </div>
            )}
        </Draggable>
    );
}

function EffectBadges({ playerHeroId }) {
    const [badge, setBadge] = React.useState(null);
    React.useEffect(() => {
        const unsub = effectsBus.subscribe((event) => {
            if (!event || !event.type) return;
            if (event.type === 'overlay:heal' && event.payload.cardId === playerHeroId) {
                setBadge({ text: `+${event.payload.amount || 1}`, color: '#2ecc71' });
                setTimeout(() => setBadge(null), 900);
            }
            if (event.type === 'overlay:damage' && event.payload.cardId === playerHeroId) {
                setBadge({ text: `-${event.payload.amount || 1}`, color: '#e74c3c' });
                setTimeout(() => setBadge(null), 900);
            }
        });
        return unsub;
    }, [playerHeroId]);

    if (!badge) return null;
    const style = {
        position: 'absolute',
        top: '-10px',
        right: '-10px',
        fontWeight: '800',
        fontSize: '24px',
        color: badge.color,
        textShadow: '0 0 4px rgba(0,0,0,0.7)',
        zIndex: 3,
        pointerEvents: 'none',
    };
    return <div style={style}>{badge.text}</div>;
}
