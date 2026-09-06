// Central effects event bus. UI layers subscribe to render overlays/FX.

const listeners = new Set();

export function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

export function publish(event) {
    // event: { type, payload }
    for (const l of listeners) {
        try { l(event); } catch (e) {}
    }
}

// Common event creators
export const Effects = {
    // Overlays
    showDeath: (cardId) => ({ type: 'overlay:death', payload: { cardId } }),
    hideDeath: (cardId) => ({ type: 'overlay:death:hide', payload: { cardId } }),
    showHeal: (cardId, amount) => ({ type: 'overlay:heal', payload: { cardId, amount } }),
    showDamage: (cardId, amount) => ({ type: 'overlay:damage', payload: { cardId, amount } }),

    // FX
    muzzleFlash: (cardId) => ({ type: 'fx:muzzleFlash', payload: { cardId } }),
    rowBarrier: (rowId, durationMs = 800) => ({ type: 'fx:rowBarrier', payload: { rowId, durationMs } }),
    resurrect: (cardId, text = 'RESURRECTED', icon = null) => ({ type: 'fx:resurrect', payload: { cardId, text, icon } }),
    chainHook: (sourceCardId, targetCardId, duration = 1000) => ({ type: 'fx:chainHook', payload: { sourceCardId, targetCardId, duration } }),
    beam: (fromCardId, toCardId, durationMs = 320, options = {}) => ({
        type: 'fx:beam',
        payload: {
            fromCardId,
            toCardId,
            durationMs,
            color: options.color ?? 0xfa9c1e,
            width: options.width ?? 10,
        },
    }),
    chargeStart: (cardId, color = 0x4db8ff) => ({
        type: 'fx:chargeStart',
        payload: { cardId, color },
    }),
    chargeStop: (cardId = null) => ({ type: 'fx:chargeStop', payload: { cardId } }),
    impact: (cardId) => ({ type: 'fx:impact', payload: { cardId } }),
    zap: (cardId) => ({ type: 'fx:zap', payload: { cardId } }),
    shatter: (cardId) => ({ type: 'fx:shatter', payload: { cardId } }),
    ward: (cardId) => ({ type: 'fx:ward', payload: { cardId } }),
    pulse: (cardId, color = null) => ({ type: 'fx:pulse', payload: { cardId, color } }),
    rowWash: (rowId, color = 0xfa9c1e) => ({
        type: 'fx:rowWash',
        payload: { rowId, color },
    }),
    sideWash: (playerNum, color = 0xfa9c1e) => ({
        type: 'fx:sideWash',
        payload: { playerNum, color },
    }),
    lockOn: (cardId) => ({ type: 'fx:lockOn', payload: { cardId } }),
    crystalRain: (playerNum) => ({ type: 'fx:crystalRain', payload: { playerNum } }),
    focusingBeam: (fromCardId, toCardId) => ({
        type: 'fx:focusingBeam',
        payload: { fromCardId, toCardId },
    }),
    duplicate: (cardId) => ({ type: 'fx:duplicate', payload: { cardId } }),
    temporalRift: (cardId) => ({ type: 'fx:temporalRift', payload: { cardId } }),
    chronoshift: (fromCardId, toCardId) => ({
        type: 'fx:chronoshift',
        payload: { fromCardId, toCardId },
    }),
    mantisCloak: (cardId) => ({ type: 'fx:mantisCloak', payload: { cardId } }),
    energySlash: (cardId) => ({ type: 'fx:energySlash', payload: { cardId } }),
    bladeDance: (casterId, targetCardIds = []) => ({
        type: 'fx:bladeDance',
        payload: { casterId, targetCardIds },
    }),
    siphon: (fromCardId, toCardId) => ({
        type: 'fx:siphon',
        payload: { fromCardId, toCardId },
    }),
    bioticHeal: (fromCardId, toCardId) => ({
        type: 'fx:bioticHeal',
        payload: { fromCardId, toCardId },
    }),
    coalescence: (yellowIds, purpleIds) => ({
        type: 'fx:coalescence',
        payload: { yellowIds, purpleIds },
    }),
    suppressingFire: (fromCardId, rowId) => ({
        type: 'fx:suppressingFire',
        payload: { fromCardId, rowId },
    }),
    smash: (cardIds) => ({ type: 'fx:smash', payload: { cardIds } }),
    staffOrb: (fromCardId, targetCardIds) => ({
        type: 'fx:staffOrb',
        payload: { fromCardId, targetCardIds },
    }),
    tideWave: (cardId) => ({ type: 'fx:tideWave', payload: { cardId } }),
    /** Cryo Freeze closes over a whole row now, not a single card. */
    freezeSpiral: (rowId) => ({ type: 'fx:freezeSpiral', payload: { rowId } }),
    matrix: (cardId) => ({ type: 'fx:matrix', payload: { cardId } }),
    primalRage: (cardId, rowId) => ({
        type: 'fx:primalRage',
        payload: { cardId, rowId },
    }),
    burrow: (fromCardId, toCardId) => ({
        type: 'fx:burrow',
        payload: { fromCardId, toCardId },
    }),
    tectonic: (cardIds = []) => ({ type: 'fx:tectonic', payload: { cardIds } }),
    crevice: (fromCardId, toCardId) => ({
        type: 'fx:crevice',
        payload: { fromCardId, toCardId },
    }),
    bloodSpray: (cardId) => ({ type: 'fx:bloodSpray', payload: { cardId } }),
    concussive: (fromCardId, toCardId) => ({
        type: 'fx:concussive',
        payload: { fromCardId, toCardId },
    }),
    barrage: (cardId, targetCardIds = []) => ({
        type: 'fx:barrage',
        payload: { cardId, targetCardIds },
    }),
    shuriken: (fromCardId, targetCardIds = []) => ({
        type: 'fx:shuriken',
        payload: { fromCardId, targetCardIds },
    }),
    slice: (cardId) => ({ type: 'fx:slice', payload: { cardId } }),
    pack: (fromCardId, toCardId, color) => ({
        type: 'fx:pack',
        payload: { fromCardId, toCardId, color },
    }),
    punch: (fromCardId, toCardId) => ({
        type: 'fx:punch',
        payload: { fromCardId, toCardId },
    }),
    meteor: (cardId, targetCardId) => ({
        type: 'fx:meteor',
        payload: { cardId, targetCardId },
    }),
    rifle: (fromCardId, toCardId, delayMs = 0) => ({
        type: 'fx:rifle',
        payload: { fromCardId, toCardId, delayMs },
    }),
    orb: (fromCardId, toCardId, color) => ({
        type: 'fx:orb',
        payload: { fromCardId, toCardId, color },
    }),
    immortality: () => ({ type: 'fx:immortality', payload: {} }),
    grenade: (fromCardId, toRowId, color, cfg) => ({
        type: 'fx:grenade',
        payload: { fromCardId, toRowId, color, ...(cfg ? { cfg } : {}) },
    }),
    graviticFlux: (rowId, cardIds = [], sourceCardId) => ({
        type: 'fx:graviticFlux',
        payload: { rowId, cardIds, sourceCardId },
    }),
    annihilation: (lines = []) => ({ type: 'fx:annihilation', payload: { lines } }),
    wholeHog: (cardId, durationMs, targetCardIds = []) => ({
        type: 'fx:wholeHog',
        payload: { cardId, durationMs, targetCardIds },
    }),
    nanoBoost: (rowId) => ({ type: 'fx:nanoBoost', payload: { rowId } }),
    shockwave: (cardId) => ({ type: 'fx:shockwave', payload: { cardId } }),
    spikeBurst: (cardId) => ({ type: 'fx:spikeBurst', payload: { cardId } }),
    bioticField: (rowId) => ({ type: 'fx:bioticField', payload: { rowId } }),
    crosshair: (cardId, on = true) => ({ type: 'fx:crosshair', payload: { cardId, on } }),
    crosshairClear: () => ({ type: 'fx:crosshairClear', payload: {} }),
    pellets: (fromCardId, toCardId) => ({
        type: 'fx:pellets',
        payload: { fromCardId, toCardId },
    }),
    deathBlossom: (rowId, on = true) => ({
        type: 'fx:deathBlossom',
        payload: { rowId, on },
    }),
    bleed: (cardId) => ({ type: 'fx:bleed', payload: { cardId } }),
    tankForm: (cardId, on = true) => ({ type: 'fx:tankForm', payload: { cardId, on } }),
    rocket: (fromCardId, toCardId, count = 1) => ({
        type: 'fx:rocket',
        payload: { fromCardId, toCardId, count },
    }),
    /** `cfg` overrides the burst's timing and spread; omit it for pistols. */
    bullet: (fromCardId, toCardId, rounds = 1, cfg) => ({
        type: 'fx:bullet',
        payload: { fromCardId, toCardId, rounds, ...(cfg ? { cfg } : {}) },
    }),
    riptire: (fromCardId, toRowId) => ({
        type: 'fx:riptire',
        payload: { fromCardId, toRowId },
    }),
    orbitStart: (sidePlayerNum, token = 'seeker', sourceCardId = null) => ({
        type: 'fx:orbitStart',
        payload: { sidePlayerNum, token, sourceCardId },
    }),
    orbitStop: (token = 'seeker', targetCardId = null) => ({
        type: 'fx:orbitStop',
        payload: { token, targetCardId },
    }),
    shuffle: (cardId) => ({ type: 'fx:shuffle', payload: { cardId } }),
    mark: (cardId, on = true) => ({ type: 'fx:mark', payload: { cardId, on } }),
    catnap: (cardId) => ({ type: 'fx:catnap', payload: { cardId } }),
    push: (cardId, fromRowId, toRowId) => ({
        type: 'fx:push',
        payload: { cardId, fromRowId, toRowId },
    }),
    preview: (payload) => ({ type: 'fx:preview', payload }),
    previewClear: () => ({ type: 'fx:previewClear', payload: {} }),

    // Mauga. The cage is read from the row's lock; these two are events.
    /** A red pulse as Berserker takes on more health. */
    berserk: (cardId) => ({ type: 'fx:berserk', payload: { cardId } }),
    /** Mauga slamming into one hero in the cage. */
    maugaSmash: (fromCardId, toCardId) => ({
        type: 'fx:maugaSmash',
        payload: { fromCardId, toCardId },
    }),

    // Mercy.
    /** Light settling onto a card: gold to heal, deep blue to boost. */
    bestow: (cardId, color) => ({ type: 'fx:bestow', payload: { cardId, color } }),
    /**
     * The ambient light around Mercy while a resurrection is being chosen.
     * Toggled rather than timed: it holds until the hero actually lands.
     */
    rezAura: (cardId, on = true) => ({ type: 'fx:rezAura', payload: { cardId, on } }),
    /** The hero comes back: a slow wash of light, and wings on them and Mercy. */
    rezReturn: (cardId, mercyCardId) => ({
        type: 'fx:rezReturn',
        payload: { cardId, mercyCardId },
    }),

    /** A puff of smoke over one or more cards, all under one cloud. */
    smoke: (cardIds = []) => ({
        type: 'fx:smoke',
        payload: { cardIds: Array.isArray(cardIds) ? cardIds : [cardIds] },
    }),

    /**
     * Sombra's intrusion: binary swept left to right.
     *
     * With no `cardId` it crosses the whole board — that is E.M.P., which
     * strips both sides. Given one, it runs over that card only, so Hack
     * reads as the same intrusion at the scale of a single hero rather than
     * being mistaken for the ultimate.
     */
    hack: (cardId = null) => ({ type: 'fx:hack', payload: { cardId } }),

    // Lúcio. The row tokens are read from row state; only the ultimate is an event.
    soundBarrier: (rowId) => ({ type: 'fx:soundBarrier', payload: { rowId } }),

    // Zarya.
    zaryaOrb: (cardId) => ({ type: 'fx:zaryaOrb', payload: { cardId } }),
    particleBeam: (fromCardId, targetCardIds = []) => ({
        type: 'fx:particleBeam',
        payload: { fromCardId, targetCardIds },
    }),

    // Wrecking Ball. The minefield itself is read from row state; only a mine
    // actually going off is an event.
    mineBlast: (cardId) => ({ type: 'fx:mineBlast', payload: { cardId } }),
    sentryShot: (rowId, cardId) => ({ type: 'fx:sentryShot', payload: { rowId, cardId } }),
    lifeGrip: (fromCardId, toCardId) => ({ type: 'fx:lifeGrip', payload: { fromCardId, toCardId } }),
    treeOfLife: (cardIds = []) => ({
        type: 'fx:treeOfLife',
        payload: { cardIds: Array.isArray(cardIds) ? cardIds : [cardIds] },
    }),

    // Symmetra.
    shieldGenerator: (playerNum) => ({ type: 'fx:shieldGenerator', payload: { playerNum } }),
    teleport: (cardId, playerNum) => ({ type: 'fx:teleport', payload: { cardId, playerNum } }),

    // Hanzo. The sonar breath is read from the row's token; the shot is an event.
    sonicArrow: (fromCardId, toRowId) => ({
        type: 'fx:sonicArrow',
        payload: { fromCardId, toRowId },
    }),
    dragonstrike: (fromCardId, enemyPlayerNum, column) => ({
        type: 'fx:dragonstrike',
        payload: { fromCardId, enemyPlayerNum, column },
    }),

    // Brigitte and Cyclo.
    bash: (cardId) => ({ type: 'fx:bash', payload: { cardId } }),
    // The fling to the deck is not here: it is the shared `flyToDeck` overlay,
    // which the caller awaits so the reshuffle lands after the card has gone.
    turbojack: (fromCardId, toCardId) => ({
        type: 'fx:turbojack',
        payload: { fromCardId, toCardId },
    }),
};

export default { subscribe, publish, Effects };


