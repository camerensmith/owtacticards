import React, { useContext, useState, useEffect } from 'react';
import { Draggable } from 'react-beautiful-dnd';
import gameContext from 'context/gameContext';
import turnContext from 'context/turnContext';
import CardEffects from 'components/cards/CardEffects';
import HealthCounter from 'components/counters/HealthCounter';
import ShieldCounter from 'components/counters/ShieldCounter';
import ShieldBashOverlay from '../effects/ShieldBashOverlay';
import SuitedUpOverlay from '../effects/SuitedUpOverlay';
import MercyHealOverlay from '../effects/MercyHealOverlay';
import MercyDamageOverlay from '../effects/MercyDamageOverlay';
import AnnihilationOverlay from '../effects/AnnihilationOverlay';
import ChainHookOverlay from '../effects/ChainHookOverlay';
import ForgeHammerOverlay from '../effects/ForgeHammerOverlay';
import ZaryaTokenOverlay from '../effects/ZaryaTokenOverlay';
import HarmonyTokenOverlay from '../effects/HarmonyTokenOverlay';
import DiscordTokenOverlay from '../effects/DiscordTokenOverlay';
import ZenyattaImmunityOverlay from '../effects/ZenyattaImmunityOverlay';
import { heroCardImages } from '../../assets/imageImports';
import ContextMenu from './ContextMenu';
import actionsBus, { Actions } from '../../abilities/engine/actionsBus';
import effectsBus, { Effects } from '../../abilities/engine/effectsBus';
import data from 'data';

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
                
                // Get ultimate cost from hero.json data
                const heroId = playerHeroId.slice(1);
                const heroJsonData = data.heroes[heroId];
                
                // Special case for Wrecking Ball - cost is current row synergy
                if (heroId === 'wreckingball') {
                    const ultimateCost = currentSynergy;
                    actionsBus.publish(Actions.requestUltimate(playerHeroId, rowId, ultimateCost));
                } else {
                    // Parse ultimate cost from description text like "Shield Generator (2)"
                    let ultimateCost = 3; // Default to 3 if not specified
                    if (heroJsonData?.ultimate) {
                        const match = heroJsonData.ultimate.match(/\((\d+)\)/);
                        if (match) {
                            ultimateCost = parseInt(match[1]);
                        }
                    }
                    actionsBus.publish(Actions.requestUltimate(playerHeroId, rowId, ultimateCost));
                }
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
        if (id === 'reinhardt') {
            const hasBarrierField = Array.isArray(card?.effects) && 
                card.effects.some(effect => effect?.id === 'barrier-field' && effect?.type === 'barrier');
            const isAbsorbing = hasBarrierField && card.effects.find(effect => 
                effect?.id === 'barrier-field' && effect?.type === 'barrier'
            )?.absorbing;
            
            if (hasBarrierField) {
                items.push({
                    label: isAbsorbing ? 'Disable Damage Absorption' : 'Enable Damage Absorption',
                    onClick: () => {
                        console.log('Card.js - Reinhardt toggle clicked for:', playerHeroId);
                        console.log('Card.js - Reinhardt functions:', window.__ow_getReinhardtFunctions?.());
                        window.__ow_getReinhardtFunctions?.().toggleBarrierAbsorption?.(playerHeroId);
                        setMenu(null);
                    },
                });
            }
        }
        if (id === 'winston') {
            const hasBarrierProtector = Array.isArray(card?.effects) && 
                card.effects.some(effect => effect?.id === 'barrier-protector' && effect?.type === 'barrier');
            const isActive = hasBarrierProtector && card.effects.find(effect => 
                effect?.id === 'barrier-protector' && effect?.type === 'barrier'
            )?.active;
            
            if (hasBarrierProtector) {
                items.push({
                    label: isActive ? 'Disable Barrier Protector' : 'Enable Barrier Protector',
                    onClick: () => {
                        console.log('Card.js - Winston toggle clicked for:', playerHeroId);
                        // Import Winston's toggle function
                        import('../../abilities/heroes/winston').then(module => {
                            module.toggleBarrierProtector(playerHeroId);
                        });
                        setMenu(null);
                    },
                });
            }
        }
        setMenu({ x: e.clientX, y: e.clientY, items });
    }

    // Check if D.Va is in "Suited Up" state (not draggable)
    const isSuitedUp = Array.isArray(effects) && effects.some(effect => effect?.id === 'suited-up');
    
    // Check if card is frozen (Mei Cryo Freeze)
    const isFrozen = Array.isArray(effects) && 
        effects.some(effect => effect?.id === 'cryo-freeze' && effect?.type === 'immunity');

    const [isResurrectOverlayVisible, setIsResurrectOverlayVisible] = useState(false);
    const [chainHookEffect, setChainHookEffect] = useState(null);

    useEffect(() => {
        const unsub = effectsBus.subscribe((event) => {
            if (!event || !event.type) return;
            // Only show resurrection overlay for the specific card that was resurrected
            if (event.type === 'fx:resurrect' && event.cardId === playerHeroId) {
                setIsResurrectOverlayVisible(true);
                setTimeout(() => setIsResurrectOverlayVisible(false), 1500);
            }
            // Handle chain hook effect
            if (event.type === 'fx:chainHook' && event.payload) {
                if (event.payload.sourceCardId === playerHeroId || event.payload.targetCardId === playerHeroId) {
                    setChainHookEffect(event.payload);
                    setTimeout(() => setChainHookEffect(null), event.payload.duration || 1000);
                }
            }
        });
        return unsub;
    }, [playerHeroId]);

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
                            {isResurrectOverlayVisible && (
                                <div style={{
                                    position: 'absolute',
                                    top: '50%',
                                    left: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    zIndex: 120,
                                    pointerEvents: 'none'
                                }}>
                                    <img
                                        src={require('../../assets/mercyrez.png')}
                                        alt="Resurrected"
                                        style={{ width: '80px', height: '80px', objectFit: 'contain' }}
                                    />
                                </div>
                            )}
                            {/* Mercy overlays rendered inside the card so they follow position */}
                            {health > 0 && Array.isArray(effects) && effects.some(e => e?.id === 'mercy-heal') && (
                                <MercyHealOverlay playerHeroId={playerHeroId} rowId={rowId} />
                            )}
                            {health > 0 && Array.isArray(effects) && effects.some(e => e?.id === 'mercy-damage') && (
                                <MercyDamageOverlay playerHeroId={playerHeroId} rowId={rowId} />
                            )}
                            {health > 0 && Array.isArray(effects) && effects.some(e => e?.id === 'annihilation') && (
                                <AnnihilationOverlay playerHeroId={playerHeroId} rowId={rowId} />
                            )}
                            {health > 0 && Array.isArray(effects) && effects.some(e => e?.id === 'forge-hammer' && e?.hero === 'torbjorn') && (
                                <ForgeHammerOverlay playerHeroId={playerHeroId} rowId={rowId} />
                            )}
                            {chainHookEffect && (
                                <ChainHookOverlay 
                                    sourceCardId={chainHookEffect.sourceCardId} 
                                    targetCardId={chainHookEffect.targetCardId} 
                                    duration={chainHookEffect.duration} 
                                />
                            )}
                            {imageLoaded === playerHeroId &&
                                (turnState.playerTurn === playerNum ||
                                isPlayed ? (
                                    <HealthCounter
                                        key={`${playerHeroId}-${effects?.length || 0}-${effects?.map(e => e.id).join(',') || ''}`}
                                        type='cardcounter'
                                        health={health}
                                        effects={effects}
                                        playerHeroId={playerHeroId}
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
                            {turnState.playerTurn === playerNum || isPlayed
                                ? <ZaryaTokenOverlay cardId={playerHeroId} />
                                : null}
                            {/* Zenyatta Transcendence immunity visual */}
                            {turnState.playerTurn === playerNum || isPlayed
                                ? <ZenyattaImmunityOverlay playerHeroId={playerHeroId} />
                                : null}
                            {turnState.playerTurn === playerNum || isPlayed
                                ? <HarmonyTokenOverlay cardId={playerHeroId} />
                                : null}
                            {turnState.playerTurn === playerNum || isPlayed
                                ? <DiscordTokenOverlay cardId={playerHeroId} />
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
            if (event.type === 'fx:resurrect' && event.payload.cardId === playerHeroId) {
                setBadge({ 
                    text: event.payload.text || 'RESURRECTED', 
                    color: '#f39c12',
                    icon: event.payload.icon,
                    fontSize: '16px'
                });
                setTimeout(() => setBadge(null), 2000);
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
        fontSize: badge.fontSize || '24px',
        color: badge.color,
        textShadow: '0 0 4px rgba(0,0,0,0.7)',
        zIndex: 3,
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: '4px'
    };
    
    return (
        <div style={style}>
            {badge.icon && <img src={require('../../assets/mercyrez.png')} alt="" style={{ width: '20px', height: '20px' }} />}
            {badge.text}
        </div>
    );
}
