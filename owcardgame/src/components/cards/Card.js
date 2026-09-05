import React, { useContext, useState, useEffect } from 'react';
import { Draggable } from 'react-beautiful-dnd';
import gameContext from 'context/gameContext';
import turnContext from 'context/turnContext';
import CardEffects from 'components/cards/CardEffects';
import HealthCounter from 'components/counters/HealthCounter';
import ShieldCounter from 'components/counters/ShieldCounter';
import ArmorCounter from 'components/counters/ArmorCounter';
import ShieldBashOverlay from '../effects/ShieldBashOverlay';
import SuitedUpOverlay from '../effects/SuitedUpOverlay';
import MercyHealOverlay from '../effects/MercyHealOverlay';
import MercyDamageOverlay from '../effects/MercyDamageOverlay';
import AnnihilationOverlay from '../effects/AnnihilationOverlay';
import ForgeHammerOverlay from '../effects/ForgeHammerOverlay';
import ZaryaTokenOverlay from '../effects/ZaryaTokenOverlay';
import HarmonyTokenOverlay from '../effects/HarmonyTokenOverlay';
import DiscordTokenOverlay from '../effects/DiscordTokenOverlay';
import ZenyattaImmunityOverlay from '../effects/ZenyattaImmunityOverlay';
import JunkerQueenWoundOverlay from '../effects/JunkerQueenWoundOverlay';
import SylvainElectrifiedOverlay from '../effects/SylvainElectrifiedOverlay';
import JunkerQueenRampageCounterOverlay from '../effects/JunkerQueenRampageCounterOverlay';
import { heroCardImages } from '../../assets/imageImports';
import ContextMenu from './ContextMenu';
import actionsBus, { Actions } from '../../abilities/engine/actionsBus';
import effectsBus, { Effects } from '../../abilities/engine/effectsBus';
import data from 'data';
import { parseUltimateCost } from '../../game/abilityRules';
import { isDisoriented } from '../../game/disorient';
import { ownerNumOf, playerCardsKey } from '../../game/cardLookup';
import { handLockVisual, isRedeployLocked, skipsDropSettle, turbojackVisual } from '../../game/rules';
import useAltKey, { syncAltFromEvent } from './useAltKey';
import { shouldShowFace, showsMirageTell } from '../../game/practice';

export default function Card(props) {
    // Context
    const { gameState, dispatch } = useContext(gameContext);
    const { turnState, setTurnState } = useContext(turnContext);

    // Variables
    const playerHeroId = props.playerHeroId;
    const playerNum = props.playerNum;
    const ownerNum = ownerNumOf(playerHeroId) || playerNum;
    const playerCardsId = playerCardsKey(playerHeroId) || `player${playerNum}cards`;
    const rowId = props.rowId;
    const rowPosition = rowId[1];
    const index = props.index;

    // All hooks live above the missing-card guard below: an early return must not
    // change how many hooks run, or React loses its place between renders.
    const [imageLoaded, setImageLoaded] = useState(false);
    const [menu, setMenu] = useState(null);
    const [isResurrectOverlayVisible, setIsResurrectOverlayVisible] = useState(false);

    // Alt + hover previews the zoomed card, alongside the existing shift + click.
    const { setCardFocus } = props;
    const altHeld = useAltKey();
    const [isHovered, setIsHovered] = useState(false);

    useEffect(() => {
        if (props.faceDown || !altHeld || !isHovered || typeof setCardFocus !== 'function') return;

        setCardFocus({ playerHeroId, rowId, hover: true });

        // Releasing Alt, leaving the card, or unmounting closes the preview. The
        // guard stops a card that was just left from closing the next card's preview.
        return () =>
            setCardFocus((prev) =>
                prev && prev.playerHeroId === playerHeroId ? 'invisible' : prev
            );
    }, [altHeld, isHovered, playerHeroId, rowId, setCardFocus, props.faceDown]);

    useEffect(() => {
        const unsub = effectsBus.subscribe((event) => {
            if (!event || !event.type) return;
            // Only show resurrection overlay for the specific card that was resurrected
            if (event.type === 'fx:resurrect' && event.cardId === playerHeroId) {
                setIsResurrectOverlayVisible(true);
                setTimeout(() => setIsResurrectOverlayVisible(false), 1500);
            }
        });
        return unsub;
    }, [playerHeroId]);

    // Get card attributes from relevant player with safety guard
    const __cardSafe__ = gameState.playerCards?.[playerCardsId]?.cards?.[playerHeroId];
    if (!__cardSafe__) {
        // Defensive: card might have been removed or state not yet synced; avoid crash
        if (process?.env?.NODE_ENV !== 'production') {
            console.warn('Card.js: Missing card for', { playerHeroId, playerNum, playerCardsId, rowId });
        }
        return null;
    }
    const {
        id,
        name,
        health,
        power,
        synergy,
        shield,
        armor,
        effects,
        enemyEffects,
        allyEffects,
        isPlayed,
        isDiscarded,
    } = __cardSafe__;
    // Held only until the owner's next turn, so this is read against the clock
    // rather than stored as a flag that outlives its meaning.
    const heldInHand = isRedeployLocked(__cardSafe__, turnState.turnCount);

    function getStyle(style, snapshot) {
        if (!snapshot.isDropAnimating) return style;
        // Only a deploy cuts the settle short — the Pixi flyer is already
        // carrying that card. Everything else gets to land.
        if (!skipsDropSettle(rowId, snapshot.draggingOver)) return style;
        return {
            ...style,
            transitionDuration: '0.001s',
        };
    }

    function buildContextMenu(e) {
        e.preventDefault();
        if (props.faceDown) return;
        if (turnState.playerTurn !== ownerNum) return;
        const items = [];
        
        // Check if hero has already used ultimate this round
        const heroId = playerHeroId.slice(1);
        const playerKey = `player${ownerNum}`;
        const hasUsedUltimate = gameState.ultimateUsage?.[playerKey]?.includes(heroId);
        
        // Check if hero is affected by Shield Bash or Catnap (cannot use ultimate)
        const card = gameState.playerCards[playerCardsId]?.cards?.[playerHeroId];
        const ultLocked = Array.isArray(card?.effects) && card.effects.some(
            (effect) => effect?.id === 'shield-bash' || effect?.id === 'catnap-lock' || effect?.id === 'disorient'
        );
        const isMirage = id === 'mirage';
        
        if (!isMirage) items.push({
            label: hasUsedUltimate ? 'Ultimate (Used)' : ultLocked ? 'Ultimate (Locked)' : 'Ultimate',
            disabled: hasUsedUltimate || ultLocked,
            onClick: () => {
                if (hasUsedUltimate || ultLocked) return; // Don't allow if already used or shield bashed
                
                // Get current row synergy and ultimate cost
                const currentRow = gameState.rows[rowId];
                const currentSynergy = currentRow ? currentRow.synergy : 0;
                
                // Get ultimate cost from hero.json data
                const heroId = playerHeroId.slice(1);
                const heroJsonData = data.heroes[heroId];
                const ultimateCost = parseUltimateCost(heroJsonData?.ultimate, {
                    heroId,
                    currentSynergy,
                });
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
    const showsDisorient = isDisoriented(__cardSafe__);
    // Only the opponent's hand is dealt face-down; everything else is readable,
    // including your own hand while the AI is taking its turn.
    const showFace = shouldShowFace({ faceDown: props.faceDown });
    const handLock = handLockVisual(heldInHand);
    const turbojack = turbojackVisual(effects);
    // Your own mirage is marked; the opponent's is not, so theirs cannot be
    // told from the real Rajah.
    const showsIllusion = id === 'mirage'
        && showsMirageTell(ownerNum, !!window.__ow_practiceMode);

    return isDiscarded ? null : (
        <Draggable
            draggableId={playerHeroId}
            index={index}
            isDragDisabled={!!props.faceDown || isPlayed || heldInHand || turnState.playerTurn !== playerNum || isSuitedUp}
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
                            props.faceDown ? null : (
                            <CardEffects
                                type='enemy'
                                effects={enemyEffects}
                                setCardFocus={props.setCardFocus}
                            />
                            )
                        ) : (
                            props.faceDown ? null : (
                            <CardEffects
                                type='ally'
                                effects={allyEffects}
                                setCardFocus={props.setCardFocus}
                            />
                            )
                        )}
                        <div
                            id={`${playerHeroId}`}
                            className={`card ${health > 0 ? 'alive' : 'dead'} ${isSuitedUp ? 'suited-up' : ''} ${isFrozen ? 'frozen' : ''} ${showsDisorient ? 'disoriented' : ''} ${showsIllusion ? 'mirage-illusion' : ''} ${handLock ? handLock.className : ''}`}
                            title={handLock ? 'Held — playable again next turn' : undefined}
                            onMouseEnter={(e) => {
                                syncAltFromEvent(e);
                                setIsHovered(true);
                            }}
                            onMouseMove={syncAltFromEvent}
                            onMouseLeave={() => setIsHovered(false)}
                            onClick={(e) => {
                                if (props.faceDown) return;
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
                        {/* Column index badge (1-based); only show on board rows like 1f/1m/1b/2f/2m/2b */}
                        {/^([12])[fmb]$/.test(rowId) && (
                            <div className='column-badge'>
                                {(typeof props.index === 'number' ? (props.index + 1) : '')}
                            </div>
                        )}
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
                            {health > 0 && Array.isArray(effects) && effects.some(e => e?.id === 'jq-wound') && (
                                <JunkerQueenWoundOverlay cardId={playerHeroId} effects={effects} />
                            )}
                            {health > 0 && Array.isArray(effects) && effects.some(e => e?.id === 'electrified') && (
                                <SylvainElectrifiedOverlay cardId={playerHeroId} effects={effects} />
                            )}
                            {id === 'junkerqueen' && health > 0 && (
                                <JunkerQueenRampageCounterOverlay playerHeroId={playerHeroId} effects={effects} />
                            )}
                            {imageLoaded === playerHeroId &&
                                (showFace ? (
                                    <HealthCounter
                                        key={`${playerHeroId}-${effects?.length || 0}-${effects?.map(e => e.id).join(',') || ''}`}
                                        type='cardcounter'
                                        health={health}
                                        effects={effects}
                                        playerHeroId={playerHeroId}
                                    />
                                ) : null)}
                            {showFace
                                ? shield > 0 && (
                                      <ShieldCounter
                                          type='cardcounter'
                                          shield={shield}
                                      />
                                  )
                                : null}
                            {showFace
                                ? armor > 0 && (
                                      <ArmorCounter
                                          type='cardcounter'
                                          armor={armor}
                                      />
                                  )
                                : null}
                            {showFace
                                ? <ZaryaTokenOverlay cardId={playerHeroId} />
                                : null}
                            {/* Zenyatta Transcendence immunity visual */}
                            {showFace
                                ? <ZenyattaImmunityOverlay playerHeroId={playerHeroId} />
                                : null}
                            {showFace
                                ? <HarmonyTokenOverlay cardId={playerHeroId} />
                                : null}
                            {showFace
                                ? <DiscordTokenOverlay cardId={playerHeroId} />
                                : null}
                            <img
                                onLoad={() => setImageLoaded(playerHeroId)}
                                src={
                                    showFace
                                        ? heroCardImages[id]
                                        : heroCardImages['card-back']
                                }
                                className={`cardimg ${
                                    showFace
                                        ? 'show-card'
                                        : 'hide-card'
                                }`}
                                alt={`${name} Card`}
                            />
                            {handLock ? (
                                <div className='redeploy-locked-banner'>{handLock.label}</div>
                            ) : null}
                            {!handLock && turbojack ? (
                                <div className='redeploy-locked-banner turbojacked-banner'>
                                    {turbojack.label}
                                </div>
                            ) : null}
                        </div>
                        {menu && (
                            <ContextMenu
                                x={menu.x}
                                y={menu.y}
                                items={menu.items}
                                onClose={() => setMenu(null)}
                            />
                        )}
                        {props.faceDown ? null : playerNum === 2 ? (
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
            // overlay:damage and overlay:heal are drawn by the Pixi floating
            // numbers layer now, so they are deliberately not handled here.
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
