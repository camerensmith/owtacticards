import React, { useEffect, useMemo, useRef, useState } from 'react';
import data from 'data';
import { otherImages, heroCardImages } from '../../assets/imageImports';
import { AI_PERSONALITY } from '../../ai/AIController';
import './HomeScreen.css';

// Kept in step with package.json manually; CRA cannot import outside src/.
const APP_VERSION = '0.3.2';

const NAV_ITEMS = [
    { id: 'play', label: 'Play', icon: 'fas fa-crosshairs' },
    { id: 'collection', label: 'Collection', icon: 'fas fa-layer-group' },
    { id: 'intel', label: 'Intel', icon: 'fas fa-book' },
    { id: 'settings', label: 'Settings', icon: 'fas fa-sliders-h' },
];


const PERSONALITY_OPTIONS = [
    { value: AI_PERSONALITY.BALANCED, label: 'Balanced', description: 'Equal focus on power and synergy' },
    { value: AI_PERSONALITY.AGGRESSIVE, label: 'Aggressive', description: 'Prioritises immediate power and damage' },
    { value: AI_PERSONALITY.CALCULATED, label: 'Calculated', description: 'Focuses on synergy and long-term strategy' },
];

const ROLE_ICONS = {
    offense: otherImages.offenceClassIcon,
    defense: otherImages.defenceClassIcon,
    tank: otherImages.tankClassIcon,
    support: otherImages.supportClassIcon,
};

const ROLE_FILTERS = [
    { value: 'all', label: 'All' },
    { value: 'offense', label: 'Offense' },
    { value: 'defense', label: 'Defense' },
    { value: 'tank', label: 'Tank' },
    { value: 'support', label: 'Support' },
];

/** Playable roster: special cards (BOB, MEKA, turrets…) are summoned, never drawn. */
function getRoster() {
    return Object.values(data.heroes)
        .filter((hero) => hero && !hero.special && ROLE_ICONS[hero.role])
        .sort((a, b) => a.name.localeCompare(b.name));
}

function bestPower(power) {
    if (!power) return 0;
    return Math.max(power.f || 0, power.m || 0, power.b || 0);
}

export default function HomeScreen({
    onStartMatch,
    matchModes,
    aiPersonality,
    onPersonalityChange,
    playAudio,
    setPlayAudio,
}) {
    const [activePanel, setActivePanel] = useState('play');
    const [roleFilter, setRoleFilter] = useState('all');
    const audioRef = useRef(null);

    const roster = useMemo(getRoster, []);
    const visibleHeroes = useMemo(
        () => (roleFilter === 'all' ? roster : roster.filter((hero) => hero.role === roleFilter)),
        [roster, roleFilter]
    );

    // Menu owns its own theme playback; TitleCard's AudioPlayer takes over in a match.
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;
        audio.volume = 0.3;
        if (playAudio) {
            audio.play().catch(() => {});
        } else if (!audio.paused) {
            audio.pause();
        }
    }, [playAudio]);

    return (
        <div className='home-screen'>
            <div className='hs-grid-overlay' />

            <header className='hs-header'>
                <div className='hs-brand'>
                    <img src={otherImages.owlogo} alt='Overwatch Tacticards logo' />
                    <h1>Overwatch Tacticards</h1>
                </div>
                <div className='hs-header-actions'>
                    <button
                        type='button'
                        className={`hs-icon-btn${playAudio ? ' is-active' : ''}`}
                        onClick={() => setPlayAudio(!playAudio)}
                        title={playAudio ? 'Mute theme' : 'Play theme'}
                        aria-label={playAudio ? 'Mute theme' : 'Play theme'}
                    >
                        <i className={playAudio ? 'fas fa-volume-up' : 'fas fa-volume-mute'} />
                    </button>
                    <button
                        type='button'
                        className={`hs-icon-btn${activePanel === 'settings' ? ' is-active' : ''}`}
                        onClick={() => setActivePanel('settings')}
                        title='Settings'
                        aria-label='Settings'
                    >
                        <i className='fas fa-sliders-h' />
                    </button>
                </div>
            </header>

            <div className='hs-body'>
                <nav className='hs-rail'>
                    <div className='hs-rail-header'>
                        <div className='hs-avatar'>
                            <i className='fas fa-shield-alt' />
                        </div>
                        <h2 className='hs-rail-title'>Operative Hub</h2>
                        <p className='hs-rail-sub'>v{APP_VERSION} — Ready for combat</p>
                    </div>

                    <ul className='hs-nav'>
                        {NAV_ITEMS.map((item) => (
                            <li key={item.id}>
                                <button
                                    type='button'
                                    className={`hs-nav-btn${activePanel === item.id ? ' is-active' : ''}`}
                                    onClick={() => setActivePanel(item.id)}
                                >
                                    <i className={item.icon} />
                                    <span>{item.label}</span>
                                </button>
                            </li>
                        ))}
                    </ul>

                    <div className='hs-rail-footer'>
                        <a
                            className='hs-rail-link'
                            href={otherImages.howToPlayPdf}
                            target='_blank'
                            rel='noreferrer'
                        >
                            <i className='fas fa-file-alt' />
                            <span>Rules PDF</span>
                        </a>
                        <a
                            className='hs-rail-link'
                            href='https://github.com/camerensmith/owtacticards'
                            target='_blank'
                            rel='noreferrer'
                        >
                            <i className='fas fa-code-branch' />
                            <span>Source</span>
                        </a>
                    </div>
                </nav>

                <main className='hs-panel'>
                    {activePanel === 'play' && (
                        <PlayPanel
                            onStartMatch={onStartMatch}
                            matchModes={matchModes}
                            aiPersonality={aiPersonality}
                            onPersonalityChange={onPersonalityChange}
                        />
                    )}

                    {activePanel === 'collection' && (
                        <CollectionPanel
                            heroes={visibleHeroes}
                            total={roster.length}
                            roleFilter={roleFilter}
                            setRoleFilter={setRoleFilter}
                        />
                    )}

                    {activePanel === 'intel' && <IntelPanel />}

                    {activePanel === 'settings' && (
                        <SettingsPanel playAudio={playAudio} setPlayAudio={setPlayAudio} />
                    )}
                </main>
            </div>

            <footer className='hs-footer'>
                <div>
                    <span>Sys.ver {APP_VERSION}</span>
                    <span className='hs-status-dot' />
                    <span>Local match ready</span>
                </div>
                {/*
                  * The full attribution lives here rather than under the board:
                  * a match needs the vertical space more than it needs a legal
                  * strip, and this is the screen everyone passes through.
                  */}
                <div className='hs-footer-note'>
                    All characters, art and the Overwatch logo and brand are the property of
                    Blizzard Entertainment, Inc. This is a free, fan-made game that is not
                    affiliated with Blizzard Entertainment, Inc. in any way.
                </div>
                <div>
                    <span>{roster.length} heroes</span>
                </div>
            </footer>

            <audio
                ref={audioRef}
                src={otherImages.overwatchTheme}
                type='audio/mpeg'
                loop
                id='home-backgroundaudio'
            />
        </div>
    );
}

function PlayPanel({ onStartMatch, matchModes, aiPersonality, onPersonalityChange }) {
    return (
        <>
            <div className='hs-panel-head'>
                <h2>Deploy</h2>
                <p>You command Player 1. Player 2 is run by the AI — set its profile before you drop in.</p>
            </div>

            <div className='hs-play'>
                <div className='hs-play-main'>
                    <button
                        type='button'
                        className='hs-start-btn'
                        onClick={() => onStartMatch(matchModes?.VERSUS_AI)}
                    >
                        <span>Start Match</span>
                    </button>

                    <button
                        type='button'
                        className='hs-practice-btn'
                        onClick={() => onStartMatch(matchModes?.PRACTICE)}
                    >
                        <span>
                            <i className='fas fa-flask' /> Practice
                        </span>
                    </button>
                    <p className='hs-practice-note'>
                        Sandbox with no AI: you play both sides and can put any card,
                        specials included, into either hand.
                    </p>

                    <div className='hs-option-group'>
                        <h3>AI Personality</h3>
                        <div className='hs-option-row'>
                            {PERSONALITY_OPTIONS.map((option) => (
                                <button
                                    type='button'
                                    key={option.value}
                                    className={`hs-option${aiPersonality === option.value ? ' is-active' : ''}`}
                                    onClick={() => onPersonalityChange(option.value)}
                                    aria-pressed={aiPersonality === option.value}
                                >
                                    <strong>{option.label}</strong>
                                    <small>{option.description}</small>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className='hs-emblem'>
                    <div className='hs-ring hs-ring-outer' />
                    <div className='hs-ring hs-ring-inner' />
                    <div className='hs-emblem-plate'>
                        <img src={otherImages.owlogo} alt='' />
                    </div>
                </div>
            </div>
        </>
    );
}

function CollectionPanel({ heroes, total, roleFilter, setRoleFilter }) {
    return (
        <>
            <div className='hs-panel-head'>
                <h2>Collection</h2>
                <p>
                    {heroes.length} of {total} heroes shown. Each round deals you one hero from every role.
                </p>
            </div>

            <div className='hs-filters'>
                {ROLE_FILTERS.map((filter) => (
                    <button
                        type='button'
                        key={filter.value}
                        className={`hs-chip${roleFilter === filter.value ? ' is-active' : ''}`}
                        onClick={() => setRoleFilter(filter.value)}
                        aria-pressed={roleFilter === filter.value}
                    >
                        {ROLE_ICONS[filter.value] && <img src={ROLE_ICONS[filter.value]} alt='' />}
                        {filter.label}
                    </button>
                ))}
            </div>

            {heroes.length === 0 ? (
                <p className='hs-empty'>No heroes match that role.</p>
            ) : (
                <div className='hs-grid'>
                    {heroes.map((hero) => (
                        <div className='hs-hero' key={hero.id}>
                            <div className='hs-hero-art'>
                                {heroCardImages[hero.id] && (
                                    <img src={heroCardImages[hero.id]} alt={hero.name} loading='lazy' />
                                )}
                                {ROLE_ICONS[hero.role] && (
                                    <div className='hs-hero-role'>
                                        <img src={ROLE_ICONS[hero.role]} alt={hero.role} title={hero.role} />
                                    </div>
                                )}
                            </div>
                            <h3 className='hs-hero-name'>{hero.name}</h3>
                            <div className='hs-hero-stats'>
                                <span>
                                    <i className='fas fa-heart' />
                                    {hero.health}
                                </span>
                                <span>
                                    <i className='fas fa-bolt' />
                                    {bestPower(hero.power)}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </>
    );
}

function IntelPanel() {
    return (
        <>
            <div className='hs-panel-head'>
                <h2>Intel</h2>
                <p>The short version. The full rulebook is a click away.</p>
            </div>

            <div className='hs-cards'>
                <div className='hs-card'>
                    <h3>
                        <i className='fas fa-flag' />
                        Winning
                    </h3>
                    <ul>
                        <li>A match runs up to 3 rounds — first to 2 round wins takes it.</li>
                        <li>Highest total power at the end of a round wins that round.</li>
                        <li>Tied on power? The higher total synergy breaks it.</li>
                    </ul>
                </div>

                <div className='hs-card'>
                    <h3>
                        <i className='fas fa-users' />
                        Your Board
                    </h3>
                    <ul>
                        <li>Three rows: front, middle and back. Each hero scores differently per row.</li>
                        <li>Hold up to 6 cards in hand. Each row holds up to 4 heroes.</li>
                        <li>Every round deals 4 fresh cards — one offense, tank, support and defense.</li>
                    </ul>
                </div>

                <div className='hs-card'>
                    <h3>
                        <i className='fas fa-bolt' />
                        Abilities
                    </h3>
                    <ul>
                        <li>Playing a hero from your hand adds its synergy to that row.</li>
                        <li>On-enter abilities fire the moment a hero lands.</li>
                        <li>Ultimates spend synergy from the hero's own row — right-click a card to use one.</li>
                        <li>Damage hits row shields, then card shields, then Armor, then health. Armor is its own pool (like a shield under another name) — ignore-shields pierces it.</li>
                    </ul>
                </div>

                <div className='hs-card'>
                    <h3>
                        <i className='fas fa-hourglass-half' />
                        Turns
                    </h3>
                    <ul>
                        <li>Players alternate turns; 9 turns each caps a round.</li>
                        <li>Pass when you are done — the round ends once both players pass.</li>
                        <li>Player 2 is played by the AI, which varies how sharply it plays from turn to turn.</li>
                    </ul>
                </div>
            </div>

            <a className='hs-btn' href={otherImages.howToPlayPdf} target='_blank' rel='noreferrer'>
                <i className='fas fa-file-alt' />
                Open full rulebook
            </a>
        </>
    );
}

function SettingsPanel({ playAudio, setPlayAudio }) {
    return (
        <>
            <div className='hs-panel-head'>
                <h2>Settings</h2>
                <p>Preferences apply to this session.</p>
            </div>

            <div className='hs-card'>
                <div className='hs-toggle-row'>
                    <span>Theme music</span>
                    <button type='button' className='hs-btn' onClick={() => setPlayAudio(!playAudio)}>
                        <i className={playAudio ? 'fas fa-volume-up' : 'fas fa-volume-mute'} />
                        {playAudio ? 'On' : 'Off'}
                    </button>
                </div>
                <div className='hs-toggle-row'>
                    <span>Rulebook (PDF)</span>
                    <a className='hs-btn' href={otherImages.howToPlayPdf} target='_blank' rel='noreferrer'>
                        <i className='fas fa-external-link-alt' />
                        Open
                    </a>
                </div>
                <div className='hs-toggle-row'>
                    <span>Build</span>
                    <span>v{APP_VERSION}</span>
                </div>
            </div>
        </>
    );
}
