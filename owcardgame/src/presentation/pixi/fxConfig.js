/**
 * Every tunable in the Pixi FX layer, in one place.
 *
 * These used to be scattered through fxMath.js between the functions that used
 * them, which meant hunting through ~700 lines to adjust a duration. Timings are
 * milliseconds; sizes are pixels unless a comment says otherwise.
 *
 * The maths lives in fxMath.js and re-exports everything here, so importing
 * either module works.
 */

/**
 * Shared palette.
 *
 * Effects of the same element should agree: before this there were three
 * near-identical blues for ice and three different oranges for embers, which
 * read as sloppy rather than varied.
 */
export const PALETTE = {
    // Fire and energy
    ember: 0xffb347,
    fire: 0xff8a3d,
    hot: 0xfff0c9,
    white: 0xffffff,
    outline: 0x000000,
    steel: 0x8f8f8f,
    soot: 0x2b2b2b,

    // Amber — targeting, barriers, the house colour
    amber: 0xfa9c1e,
    amberPale: 0xffd9a0,

    // Ice — Mei, Sigma, Reinhardt, crystal rain
    ice: 0x8fd8ff,
    icePale: 0xdff2ff,
    iceDeep: 0x4db8ff,

    // Blood
    blood: 0x9e1b1b,
    bloodDark: 0x6b0f0f,

    // Alerts
    red: 0xff2d2d,
    damage: 0xff5c5c,
    heal: 0x5ce08a,
    neutral: 0xdddddd,

    // Lockjaw — magnetic teal
    teal: 0x3ec6ff,
    tealPale: 0xa8f0ff,

    // Hazard — jagged stone with a teal crystal face
    spike: 0x7dcec4,
    stone: 0x9aa3a8,
    stoneDark: 0x3d474a,

    echoMagenta: 0xe85cff,
    echoCyan: 0x4ef6ff,
    moiraYellow: 0xffe566,
    moiraPurple: 0xb44cff,
    lava: 0xff2a00,
    lavaHot: 0xffc14d,
    water: 0x3ec6e8,
    waterPale: 0xb8f0ff,
    smoke: 0x9a958c,

    // Sigma's barrier reads as gravitic rather than icy; Bravo-X2's sight uses
    // the same blue-violet so machine effects are not mistaken for the amber
    // that means "you are being asked to aim".
    violet: 0x9b7bff,
    violetPale: 0xd6c8ff,
};

export const PREVIEW = {
    navy: 0x2e3651,
    grey: 0xdddbe0,
    pulseMin: 0.18,
    pulseMax: 0.42,
    pulsePeriodMs: 2400,
    stripePeriodMs: 4800,
    stripeWidth: 12,
};

export const DRONE = {
    launchMs: 950,
    /** Starts as a speck on the Warden card and grows as it flies out. */
    startScale: 0.15,
    width: 58,
    /** Two incommensurate rates, so the wander never repeats a loop. */
    driftXRate: 0.00021,
    driftYRate: 0.00034,
    driftXExtent: 0.34,
    driftYExtent: 0.28,
    beaconPeriodMs: 1400,
    beaconMinAlpha: 0.10,
    beaconMaxAlpha: 0.55,
    impactMs: 560,
    diveMs: 320,
    emberCount: 7,
};

export const LOCK_ON = {
    snapMs: 260,
    holdMs: 260,
    fadeMs: 220,
    /** Brackets start this much larger than the card and close in. */
    startScale: 1.85,
    /** Bites slightly inside the card on contact, then settles back to the edge. */
    overshoot: 0.93,
    /** Bracket arm length, as a fraction of the card's short side. */
    cornerRatio: 0.3,
    /** Slight rotation while converging; unwinds to square on lock. */
    spinFrom: 0.35,
    thickness: 3,
};

export const LOCK_ON_TOTAL_MS = LOCK_ON.snapMs + LOCK_ON.holdMs + LOCK_ON.fadeMs;

export const CHARGE = {
    ringPeriodMs: 900,
    ringCount: 3,
    /** Ring radii as multiples of the card's half-size: outside, closing in. */
    startRadius: 2.0,
    endRadius: 0.55,
    corePulseMs: 620,
    coreMinScale: 0.22,
    coreMaxScale: 0.6,
    coreMinAlpha: 0.3,
    coreMaxAlpha: 0.9,
    /** Power visibly builds over this long, then holds at full. */
    rampMs: 1600,
};

export const BLAST = {
    travelMs: 190,
    holdMs: 280,
    fadeMs: 330,
    /** White-hot inner column, as a fraction of the full beam width. */
    coreRatio: 0.36,
};

export const BLAST_TOTAL_MS = BLAST.travelMs + BLAST.holdMs + BLAST.fadeMs;

export const FLOAT = {
    lifeMs: 1050,
    /** How far it climbs, in pixels. */
    rise: 46,
    /** Overshoot scale at the moment it appears. */
    popScale: 1.45,
    popMs: 130,
    /** Fading starts this far through the life. */
    fadeFrom: 0.55,
    /** Sideways drift so stacked hits on one card do not overlap exactly. */
    driftX: 16,
    fontSize: 30,
    deathFontSize: 20,
};

export const PUSH = {
    travelMs: 380,
    /** Lifts off the board mid-flight so it reads as shoved, not slid. */
    lift: 26,
    peakScale: 1.12,
};

export const CRYSTAL = {
    count: 36,
    fallMs: 900,
    staggerMs: 32,
    length: 38,
    width: 16,
    /** Starts this far above the target area, in pixels. */
    dropIn: 80,
};

export const CRYSTAL_TOTAL_MS = CRYSTAL.staggerMs * (CRYSTAL.count - 1) + CRYSTAL.fallMs;

/** Hazard deploy: rock/crystal spikes erupting from the card edges. */
export const SPIKE_BURST = {
    count: 10,
    growMs: 280,
    holdMs: 90,
    fadeMs: 220,
    /** Tip length as a fraction of the card's shorter side. */
    lengthScale: 0.48,
    /** Base width as a fraction of the card's shorter side. */
    widthScale: 0.16,
};

export const SPIKE_BURST_TOTAL_MS =
    SPIKE_BURST.growMs + SPIKE_BURST.holdMs + SPIKE_BURST.fadeMs;

export const RIPTIRE = {
    windupMs: 0,
    travelMs: 2250,
    explodeMs: 520,
    size: 56,
    spinRate: 0.016,
    hopHeight: 14,
    hopPeriodMs: 420,
    loopTurns: 1.5,
    loopAmplitude: 90,
};

export const RIPTIRE_IMPACT_MS = (RIPTIRE.windupMs || 0) + RIPTIRE.travelMs;
export const RIPTIRE_TOTAL_MS = RIPTIRE_IMPACT_MS + RIPTIRE.explodeMs;

export const BARRIER = {
    segments: 26,
    /** Row shield: how far it bows out, as a fraction of the row's depth. */
    rowBulge: 0.16,
    /** ...and how far past the row's ends it bleeds. */
    rowOverhang: 0.04,
    /** Reinhardt's shield, relative to his card. */
    shieldSpan: 1.5,
    shieldBulge: 30,
    shieldStandoff: 0.55,
};

/** Sigma's Gravitic Flux: lift the row, hold, slam, and strip its synergy. */
export const FLUX = {
    liftMs: 700,
    hangMs: 260,
    slamMs: 180,
    settleMs: 420,
    /** Peak lift, as a fraction of a card's height. */
    lift: 0.85,
    /** Shadow shrinks as the card rises, so height reads on the ground too. */
    shadowMin: 0.45,
    swirlCount: 14,
    swirlMs: 900,
    swirlRadius: 90,
    /** Gravity tethers fade in over this window at cast. */
    beamFadeInMs: 120,
    /** Expanding ellipses at Sigma and lifted cards (lift+hang only). */
    rippleRings: 3,
    rippleCycleMs: 560,
    rippleRadius: 52,
    rippleAlpha: 0.72,
    /** Beam stroke relative to Annihilation (thinner gravity tether). */
    beamWidth: 10,
};

/** Nemesis's Annihilation: a black beam fizzing along the row and column. */
export const ANNIHILATE = {
    durationMs: 1100,
    width: 22,
    /** Sparks spat out along the beam as it burns. */
    fizzPerSecond: 90,
    fizzLifeMs: 380,
    fizzSpread: 16,
    fizzSize: 3,
};

/** Roadhog's Chain Hook: thrown out, held, then reeled back in. */
export const HOOK = {
    throwMs: 190,
    holdMs: 70,
    reelMs: 200,
    size: 42,
    /** Links drawn along the chain between Roadhog and the hook. */
    links: 9,
    linkRadius: 3.6,
    /** How far the chain bows under its own weight, in pixels. */
    sag: 16,
};

/**
 * Whole Hog: a chaotic spray fanning out from Roadhog for the length of the
 * ultimate. Particles are cheap and short-lived; the density does the work.
 */
export const HOG = {
    spawnPerSecond: 110,
    /** Half-angle of the V, in radians. */
    spread: 0.55,
    speed: 430,
    speedJitter: 0.55,
    lifeMs: 620,
    /** Chunks are jagged shrapnel, not dots, so they need a size range. */
    size: 7,
    sizeJitter: 0.6,
    spinRate: 0.012,
    durationMs: 4000,
};

/**
 * Marked-target blip (Warden's Tracking Shot).
 * A radar ping at the centre of the card: quiet, but always there.
 */
export const BLIP = {
    periodMs: 1600,
    dotRadius: 5,
    ringRadius: 20,
    minAlpha: 0.35,
    maxAlpha: 0.9,
};

/** D.Va's Defense Matrix: panels unfolding out from the card. */
export const MATRIX = {
    panels: 3,
    deployMs: 420,
    holdMs: 420,
    fadeMs: 340,
    /** Panel size relative to the card's width. */
    size: 0.5,
    /** How far the outermost panel travels, in card widths. */
    reach: 0.9,
};

/** Winston's Barrier Protector: a bubble for as long as shields hold. */
export const BUBBLE = {
    /** Radius relative to the card's larger side. */
    radius: 0.78,
    coreAlpha: 0.3,
    rimAlpha: 0.8,
    shimmerMs: 2400,
};

/** Primal Rage: Winston swells red, then pummels the row. */
export const PRIMAL = {
    growMs: 420,
    /** How much larger the raging card reads. */
    scale: 1.45,
    poundMs: 260,
    pounds: 3,
    settleMs: 320,
};

/** Venture's Drill Dash: a burrow that tunnels to the target. */
export const BURROW = {
    travelMs: 520,
    /** Mounds thrown up along the tunnel. */
    mounds: 9,
    moundSize: 13,
    /** How far the mounds scatter either side of the line. */
    scatter: 10,
    eruptMs: 320,
};

/** Tectonic Shock: everything caught in it is thrown around. */
export const TECTONIC = {
    durationMs: 900,
    /** Peak shake in pixels. */
    shake: 9,
    shakeHz: 22,
    /** Full turns a flipped card makes. */
    flips: 2,
};

/** Zenyatta's orbs: they hover over their holder and zoom when they jump. */
export const ORB_TOKEN = {
    size: 30,
    /** Height above the card centre, as a fraction of card height. */
    hover: 0.34,
    /** Gentle bob so a held orb still looks alive. */
    bobMs: 1900,
    bob: 4,
    /** How long the zoom to a new holder takes. */
    jumpMs: 340,
    /** Lift on the jump arc, in pixels. */
    jumpArc: 46,
    spinRate: 0.0015,
};

/** Transcendence: radiant rays, then a golden glow for the round. */
export const TRANSCEND = {
    burstMs: 1100,
    rays: 14,
    rayLength: 160,
    /** Persistent glow once the burst has passed. */
    glowPeriodMs: 2100,
    glowMin: 0.28,
    glowMax: 0.62,
};

/** Orisa's Supercharger: a faint charged line over each hero in the row. */
export const SUPERCHARGE = {
    segments: 22,
    /** Wave height as a fraction of the card's height. */
    amplitude: 0.12,
    waves: 2.5,
    speed: 0.0024,
    alpha: 0.5,
};

/** Widowmaker's Infra-Sight: a red sheen that sweeps the marked row. */
export const INFRA = {
    periodMs: 3200,
    /** Fraction of the period the sheen is actually crossing. */
    sweepFraction: 0.45,
    /** Width of the band, as a fraction of the row's long side. */
    bandWidth: 0.3,
    bands: 4,
    peakAlpha: 0.3,
};

/** Reinhardt's Earthshatter: a crevice torn down the column. */
export const CREVICE = {
    openMs: 220,
    holdMs: 260,
    closeMs: 420,
    /** Widest point of the wedge, in pixels. */
    maxWidth: 54,
    segments: 9,
    jag: 0.35,
};

/** Widowmaker's kill shot: splatter that stains the board briefly. */
export const SPRAY = {
    lifeMs: 2200,
    drops: 14,
    spread: 46,
    maxRadius: 9,
    /** Holds fully opaque for this fraction of its life, then fades. */
    holdFraction: 0.45,
};

/** Pharah's Concussive Blast: a ring that lands short, then shoves outward. */
export const CONCUSSIVE = {
    travelMs: 300,
    expandMs: 380,
    /** Lands this fraction of the way to the target — in front of it. */
    standoff: 0.78,
    startRadius: 7,
    endRadius: 52,
};

/** Pharah's Rocket Barrage: lift off, lock on, then salvo. */
export const BARRAGE = {
    liftMs: 420,
    /** How high she climbs, in card heights. */
    lift: 1.5,
    lockMs: 340,
    /** Gap between rockets leaving the tubes. */
    staggerMs: 150,
    rocketMs: 520,
    length: 20,
    width: 6,
    smokeCount: 8,
    smokeSpacing: 0.11,
    burstMs: 340,
    returnMs: 340,
};

/** Genji's Shuriken: bounces down a column. */
export const SHURIKEN = {
    size: 26,
    hopMs: 260,
    spinRate: 0.03,
    /** Height of each bounce between targets. */
    hop: 46,
};

/** Genji's Dragon Blade: a single clean slice. */
export const SLICE = {
    windupMs: 180,
    cutMs: 130,
    fadeMs: 260,
    /** Slash length relative to the card's diagonal. */
    reach: 1.5,
    thickness: 7,
};

/** Brigitte's Repair Pack: a tumbling square canister. */
export const PACK = {
    size: 22,
    spinRate: 0.009,
};

/** Doomfist's Rocket Punch: a streak that lands like a jab. */
export const PUNCH = {
    outMs: 130,
    holdMs: 90,
    backMs: 150,
    thickness: 16,
    headSize: 22,
};

/** Doomfist's Meteor Strike: off the board, down onto the target, back home. */
/**
 * Meteor Strike.
 *
 * The impact was three thin rings, which is not what falling out of the sky
 * should look like. The hang is now long enough to be anticipation — a shadow
 * gathering on the target — and the landing has a flash, cracks and debris.
 */
export const METEOR = {
    launchMs: 340,
    /** Long enough for the shadow to gather and the hit to be expected. */
    hangMs: 420,
    slamMs: 220,
    /** The aftermath, not just the ring. */
    rippleMs: 900,
    returnMs: 380,
    /** How high he climbs before vanishing, in card heights. */
    climb: 2.2,
    /** How far above the target he re-enters from. */
    dropFrom: 2.6,
    rippleRings: 5,
    /** The white-out at the moment of contact. */
    flashMs: 180,
    /** Fissures thrown out from the crater. */
    cracks: 9,
    crackSegments: 4,
    /** Chunks kicked up and falling back. */
    debris: 16,
};

/**
 * Lúcio's row tokens, drawn from row state so they last exactly as long as the
 * token does. Both are meant to sit under the cards, not compete with them.
 */
export const LUCIO_TOKEN = {
    /** Soundwave rings breathing out of the row. */
    rings: 3,
    cycleMs: 2400,
    /** Ring reach as a fraction of the row's shorter side. */
    reach: 0.55,
    healAlpha: 0.34,
    /** The shuffle cue instead chases arcs around the row. */
    shuffleAlpha: 0.32,
    swirlArms: 3,
    swirlMs: 3200,
};

/** Sound Barrier: a ripple running the row and bouncing back down it. */
export const SOUND_BARRIER = {
    /** One length of the row. */
    sweepMs: 620,
    /** Passes up and back before it dies out. */
    bounces: 4,
    /** Depth of the crest, as a fraction of the row's long side. */
    bandDepth: 0.22,
    /** Rings trailing the crest. */
    rings: 4,
    alpha: 0.55,
};

/** Emre's Synth Rifle / Override Protocol: thin red shots. */
export const RIFLE = {
    beamMs: 260,
    width: 6,
    /** Gap between Override Protocol's shots, so they land in sequence. */
    staggerMs: 110,
};

/** Biotic Launcher: a lobbed ball of heal or harm. */
export const ORB = {
    radius: 9,
    trail: 5,
    burstScale: 0.9,
};

/** Immortality Field: slots sparkle for as long as they are protected. */
export const SPARKLE = {
    perCard: 7,
    periodMs: 1400,
    size: 2.6,
    /** How far outside the card edge motes drift. */
    halo: 0.12,
};

/** Thrown grenade (Ana's biotic). Colour comes per-event. */
export const GRENADE = {
    travelMs: 620,
    size: 34,
    spinRate: 0.014,
    /** Height of the lob above the straight line, in pixels. */
    arc: 90,
    burstMs: 460,
    burstScale: 1.5,
};

/** McCree's Flashbang: a snap throw, timed to the toss in mccree-ability1. */
export const FLASHBANG = {
    ...GRENADE,
    travelMs: 200,
    spinRate: 0.028,
    arc: 40,
};

/** Dead Eye: a red orb settling onto each enemy while you hover the row. */
export const DEADEYE = {
    orbRadius: 13,
    /** Orbs start this much wider before zeroing in. */
    approach: 2.4,
    settleMs: 260,
    pulseMs: 720,
    labelSize: 20,
};

/** Nano Boost: arcs crawling over the boosted row. */
export const NANO = {
    durationMs: 2200,
    boltCount: 5,
    /** Segments per bolt; more means a more jagged arc. */
    segments: 7,
    jitter: 0.42,
    strikeMs: 260,
    ringMs: 620,
};

/** MEKA self-destruct: spool up, then level the board. */
export const MEKA = {
    /** How long the core charges before it goes off. */
    chargeMs: 1800,
    blastMs: 700,
    /** Blast radius relative to the card's larger side. */
    blastScale: 6,
};

/** Soldier 76's Biotic Field: a yellow fizz over the healed row. */
export const BIOTIC = {
    durationMs: 1150,
    bubbleCount: 24,
    bubbleRadius: 4.5,
    staggerMs: 26,
    /** How far a bubble rises, as a fraction of the row height. */
    rise: 0.85,
    flashMs: 260,
};

/** Tactical Visor crosshairs: held on each target until the volley fires. */
export const CROSSHAIR = {
    /** Radius as a fraction of the card's shorter side. */
    radius: 0.46,
    spinRate: 0.0011,
    pulseMs: 900,
    thickness: 2,
    /** Tick length as a fraction of the radius. */
    tick: 0.3,
    fadeMs: 180,
};

/** Shotgun pellets (Reaper). A tight spray that widens with distance. */
export const PELLET = {
    count: 9,
    travelMs: 165,
    staggerMs: 12,
    radius: 2.4,
    /** Half-angle of the cone, radians. */
    spread: 0.16,
    /** Scatter around the target on arrival, in pixels. */
    landScatter: 16,
    sparkMs: 130,
};

/** Death Blossom: the spinning centrepiece of Reaper's ultimate. */
export const BLOSSOM = {
    /** Size relative to a card's width. */
    scale: 2.6,
    spinRate: 0.009,
    fadeMs: 300,
    /** Gap between damage ticks. */
    tickMs: 130,
    pulseMs: 620,
};

/**
 * Bleed droplets (Junker Queen's wounds).
 * Beads form on the wounded card and run down it — the damage is happening to
 * them, so nothing should travel from the source.
 */
export const BLOOD = {
    count: 3,
    staggerMs: 130,
    dropMs: 900,
    /** Bead swells to full size over this long before it runs. */
    swellMs: 190,
    radius: 4.5,
    fall: 26,
    /** How much the bead stretches as it runs. */
    stretch: 1.9,
};

/**
 * Bastion's sentry token: a scanner sweeping the row it watches.
 * Subtle on purpose — it is ambient, not an attack.
 */
export const SENTRY = {
    sweepMs: 2800,
    beamWidth: 3,
    glowWidth: 30,
    minAlpha: 0.16,
    maxAlpha: 0.4,
};

/** Tank form drawn over Bastion's card while his ultimate is up. */
export const TANK_FORM = {
    /** Size relative to the card's width. */
    scale: 1.35,
    fadeMs: 260,
    bobMs: 1800,
    bob: 3,
};

/** Small rockets: Bastion's Tank Mode salvo. */
export const ROCKET = {
    travelMs: 430,
    staggerMs: 95,
    length: 15,
    width: 5,
    /** Lateral bow so a salvo fans out instead of overlapping. */
    arc: 30,
    smokeCount: 6,
    smokeSpacing: 0.13,
    explodeMs: 330,
};

/**
 * Pulse pistol rounds (Tracer).
 * Small, fast and elongated — read as tracer fire rather than a beam.
 */
export const BULLET = {
    travelMs: 175,
    /** Gap between rounds in a burst. Short: these are rapid-fire pistols. */
    burstGapMs: 65,
    length: 17,
    width: 3.4,
    /** Faint streak trailing the round. */
    trail: 26,
    sparkMs: 150,
    /** Perpendicular scatter so a burst is not one dead-straight line. */
    spread: 5,
};

/**
 * Torbjörn's turret: a short burst into one target rather than a beam.
 *
 * Slower between rounds than a pistol and tighter across the line of fire, so
 * it reads as an emplaced gun holding its aim.
 */
export const TURRET_BURST = {
    ...BULLET,
    rounds: 4,
    burstGapMs: 90,
    spread: 3,
};

/** One-shot hit punctuation. Kept brief so it does not fight the damage float. */
export const HIT = {
    impactMs: 300,
    muzzleMs: 180,
};

/** Targeting aim line. */
export const AIM = {
    glowWidth: 5,
    lineWidth: 2,
    chevrons: 3,
    chevronSize: 7,
    pulseMs: 180,
    originDot: 5,
    cursorRing: 8,
};

export const FROST = {
    spikeCount: 16,
    /** Spike depth as a fraction of the row's half-height. */
    spikeDepth: 0.55,
    shimmerMs: 2600,
    minAlpha: 0.42,
    maxAlpha: 0.78,
};

export const FREEZE = {
    durationMs: 950,
    turns: 2.6,
    points: 96,
    spinRate: 0.006,
    shardCount: 9,
    /** Spiral is fully drawn by this fraction of the life. */
    drawUntil: 0.6,
    /** Shards have finished forming by here; the rest is the fade. */
    holdUntil: 0.82,
};

/**
 * Magnetic Clamp: persistent jaws on a locked row.
 * Subtle on purpose — it is a status, not an attack.
 */
export const CLAMP = {
    pulseMs: 2200,
    minAlpha: 0.22,
    maxAlpha: 0.55,
    jawMin: 0.08,
    jawMax: 0.2,
    sparkCount: 6,
    sparkPeriodMs: 900,
    toothCount: 7,
};

/**
 * Sylvain tripwire: a thin neon cable between two adjacent rows.
 */
export const WIRE = {
    pulseMs: 1600,
    minAlpha: 0.4,
    maxAlpha: 0.95,
    sag: 0.18,
    sparkCount: 3,
    sparkPeriodMs: 1400,
};

/**
 * Axiom Stoneguard: the major relic bursts into shards, then wards nearby allies.
 */
export const SHATTER = {
    ms: 560,
    shardCount: 12,
};

export const WARD = {
    ms: 520,
    startR: 18,
    endR: 52,
};

/**
 * Killswitch: a local lightning snap on the affected card. Not a beam.
 */
export const ZAP = {
    ms: 420,
    bolts: 3,
    segments: 6,
    jitter: 12,
};

export const DUPLICATE = {
    ms: 720,
};

export const LAVA = {
    pulseMs: 900,
    veinCount: 5,
    segments: 4,
};

export const SUPPRESS = {
    rounds: 8,
    travelMs: 200,
    burstGapMs: 45,
    length: 16,
    width: 3,
};

export const SMASH = {
    ms: 560,
    slamAt: 0.32,
    drop: 42,
};

export const STAFF = {
    hopMs: 150,
    radius: 11,
    trail: 26,
};

/**
 * Guardian Tide: a wall of water, not a sliver.
 *
 * The first pass drew one thin quad sliding across, which read as a smear. The
 * crest now spans the enemy side and carries foam and spray with it.
 */
export const TIDE = {
    ms: 1400,
    halfWidth: 70,
    /** Crest width as a fraction of the enemy side. */
    crestSpan: 0.92,
    /** Points along the crest; more gives a smoother curl. */
    crestPoints: 26,
    /** How far the crest's middle bows ahead of its ends. */
    bow: 44,
    /** Foam caps riding the crest. */
    caps: 9,
    /** Droplets thrown ahead of the wave. */
    spray: 16,
    /** Depth of the wash dragged along behind. */
    wash: 120,
};

/**
 * Rajah's Sandstorm: grit hanging over the whole board.
 *
 * This runs for a full turn rather than a beat, so every value here is pitched
 * low and slow — it has to be readable as "something is up" without becoming
 * something you stare through for a minute.
 */
export const SANDSTORM = {
    /** Grains drifting across the board. */
    motes: 70,
    /** One crossing. Long, because nothing here should look hurried. */
    driftMs: 9000,
    moteRadius: 1.8,
    moteAlpha: 0.3,
    /** Fraction of the crossing spent fading in and out, so nothing pops. */
    moteFade: 0.12,
    /** Long thin gusts riding over the grains. */
    gusts: 7,
    gustMs: 5200,
    gustLength: 150,
    gustAlpha: 0.09,
    /** The haze sitting over everything. */
    hazeAlpha: 0.05,
    hazeBreatheMs: 4200,
};

/**
 * Mauga.
 *
 * The cage is read from the row's lock rather than timed — it stands until
 * Mauga dies, which may be several turns — so `shimmerMs` is a cycle, not a
 * lifetime.
 */
export const CAGE = {
    bars: 9,
    barWidth: 5,
    /** A slow glow travelling along the bars. */
    shimmerMs: 2600,
    alpha: 0.62,
    /** Corner brackets, in pixels. */
    corner: 26,
};

/** Berserker: a red pulse every time Mauga takes on more health. */
export const BERSERK = {
    ms: 700,
    rings: 2,
    /** Reach as a fraction of the card's longer side. */
    reach: 0.95,
    spikes: 8,
    alpha: 0.85,
};

/** Mauga bodily slamming into one hero in the cage. */
export const MAUGA_SMASH = {
    ms: 440,
    /** Gap between one slam and the next: he works through them one at a time. */
    staggerMs: 220,
    /** Impact reach as a fraction of the card's longer side. */
    reach: 0.95,
    shards: 9,
    /** How far the lunge overshoots into the target. */
    lunge: 0.35,
};

/**
 * Mercy's Caduceus beam, as a light settling onto whoever she is attached to:
 * warm gold to heal, deep blue to boost. Same shape, different colour, so the
 * two read as one mechanic with two modes.
 */
export const BESTOW = {
    /** Warm gold to heal. */
    heal: 0xffd24a,
    /** Deep blue to boost. */
    boost: 0x1f4fd8,
    ms: 1100,
    /** Column height, as a multiple of the card's height. */
    column: 2.4,
    columnWidth: 0.55,
    /** Ring settling onto the card. */
    ringReach: 0.85,
    motes: 12,
    /** How far motes drift up the column. */
    moteRise: 1.6,
    alpha: 0.8,
};

/**
 * Resurrection.
 *
 * The aura holds for as long as the choice takes — it is toggled off when the
 * hero lands, not timed — so these are cycle lengths, not lifetimes.
 */
export const REZ = {
    /** One breath of the ambient light around Mercy. */
    auraMs: 1800,
    /** Aura reach, as a multiple of the card's longer side. */
    auraReach: 1.9,
    auraAlpha: 0.42,
    /** Rays turning slowly inside the aura. */
    rays: 10,
    raySpinMs: 9000,
    /** The slow wash of light over the hero who came back. */
    flashMs: 1600,
    /** Wings over Mercy and her target. */
    wingsMs: 2200,
    wingsScale: 1.7,
    wingsBobMs: 1400,
};

/**
 * A puff of smoke over a card.
 *
 * Rajah and his mirage puff together, so the pair arrives under one cloud and
 * neither can be picked out by watching which landed first.
 */
export const SMOKE = {
    ms: 900,
    puffs: 9,
    /** Cloud reach as a fraction of the card's longer side. */
    reach: 0.75,
    puffRadius: 0.3,
    /** How far the cloud drifts upward as it thins. */
    rise: 0.35,
    alpha: 0.72,
};

/** Zarya's Projected Barrier: a crackling orb around whoever holds the tokens. */
export const ZARYA_ORB = {
    ms: 2200,
    /** Radius as a fraction of the card's longer side. */
    radius: 0.62,
    arcs: 7,
    arcSegments: 5,
    /** How far an arc kinks off the rim, as a fraction of the radius. */
    jitter: 0.24,
    /** Arc re-rolls per second. Snapping, not glowing. */
    flashHz: 7,
};

/** Particle Cannon: an orb settles on each target, then a beam blasts it. */
export const PARTICLE_BEAM = {
    /** Orbs bloom on every target first... */
    gatherMs: 520,
    /** ...then each is blasted in turn. */
    blastMs: 280,
    /** Gap between one target's blast and the next. */
    staggerMs: 130,
    orbRadius: 19,
    beamWidth: 15,
};

/** Wrecking Ball's Minefield: one mine drawn per remaining charge. */
export const MINEFIELD = {
    /** Scatter is seeded, so mines hold their spots between frames. */
    salt: 71,
    radius: 16,
    /** Keeps mines clear of the row's edge, as a fraction of each side. */
    inset: 0.16,
    blinkMs: 1500,
};

/** One mine going off. */
export const MINE_BLAST = {
    ms: 480,
    radius: 56,
    shards: 10,
};

/** Adaptive Shield: a faint ring breathing while the shields hold. */
export const ADAPTIVE = {
    radius: 0.58,
    breatheMs: 2000,
    /** Extra radius at the top of the breath, as a fraction of the base. */
    swell: 0.07,
    alpha: 0.5,
};

/** Symmetra's Shield Generator: blue washing over the allied rows. */
export const SHIELD_GEN = {
    ms: 1200,
    /** Rows light in sequence rather than all at once. */
    staggerMs: 140,
    /** Depth of the moving gradient band, as a fraction of the row. */
    bandDepth: 0.45,
    /** Bands quantising the gradient; Pixi has no gradient fill. */
    steps: 9,
};

/** Teleporter: the hero streaks off the board and into the hand. */
export const TELEPORT = {
    ms: 680,
    /** After-images left along the path. */
    ghosts: 5,
    /** How far the streak bows sideways. */
    arc: 90,
};

/** Sonic Arrow: the shot, then a slow sonar breath on the marked row. */
export const SONIC = {
    arrowMs: 440,
    arrowLength: 34,
    /** One full sonar breath while the token sits on the row. */
    pulseMs: 2600,
    arcs: 3,
    /** Bow of each sonar arc, as a fraction of the row's depth. */
    bow: 0.22,
    alpha: 0.44,
};

/** Dragonstrike: a slow twin helix boring through the column and off-screen. */
export const DRAGONSTRIKE = {
    /**
     * Deliberately long: the dragon should crawl. Damage timings are taken as
     * fractions of this, so slowing it keeps each hit on the card the helix is
     * touching.
     */
    ms: 4400,
    /** Samples along the visible body. */
    segments: 48,
    /** Full turns of the helix over its whole travel. */
    turns: 3.2,
    /** Half-width of the helix. */
    amplitude: 27,
    /** Visible body length, as a fraction of the travel. */
    bodyLength: 0.55,
};

/** Shield Bash: a short, hard spark on contact. */
export const BASH = {
    ms: 280,
    radius: 30,
    spikes: 8,
};

/** Turbojack: the cyclone in, the swirl on the target, the fling to the deck. */
export const TURBOJACK = {
    cycloneMs: 640,
    /** Turns the funnel makes as it crosses. */
    turns: 2.6,
    funnelWidth: 46,
    /** Ribs drawn down the funnel. */
    ribs: 9,
    swirlMs: 950,
    swirlArms: 4,
    swirlTurns: 2.2,
    flingMs: 780,
    /** How far the flung card bows off the straight line. */
    flingArc: 160,
    flingSpins: 2.5,
};

/** Life Grip: a petal ribbon from the wounded ally into Lifeweaver. */
export const LIFE_GRIP = {
    ms: 640,
    petals: 9,
    ribbonWidth: 12,
    arc: 56,
};

/** Tree of Life: a blossom opening on each healed hero. */
export const TREE_OF_LIFE = {
    ms: 980,
    petals: 8,
    reach: 0.72,
    trunk: 0.42,
};

/**
 * A card travelling from the hand to the slot it was dropped on.
 *
 * This one is not decoration — the board is locked while it runs and the card
 * does not exist in its new row until it lands, so its duration is felt as
 * input lag. It is deliberately short, and eased out rather than in and out:
 * the player has just thrown the card, so it should leave at speed and settle,
 * not creep away from the hand.
 */
export const CARD_FLIGHT = {
    ms: 230,
    /** Fraction of the drop's vertical span the arc rises above the straight line. */
    arc: 0.18,
    /** Slight overshoot in size on the way, so the card reads as nearer. */
    lift: 0.08,
};

/**
 * Fika's Catnap: sleepy Z / z glyphs rising off a locked card.
 * Loops while the catnap-lock effect is still on the hero.
 */
export const CATNAP = {
    /** How long one Z climbs before fading out. */
    riseMs: 1200,
    /** Pause before that lane's next Z. */
    gapMs: 220,
    /** Horizontal stagger between lanes. */
    staggerMs: 340,
    /** How many simultaneous Z streams per card. */
    perCard: 3,
    rise: 58,
    driftX: 16,
    fadeFrom: 0.55,
    fontSize: 22,
};

/** Vega Temporal Rift / Chronoshift warp rings. */
export const WARP = {
    riftMs: 900,
    chronoMs: 1100,
    rings: 4,
    reach: 0.72,
};

/** Mantis Cloak shroud, energy slash, and Blade Dance dervish. */
export const MANTIS = {
    /** Persistent camo: how many drifting smoke blobs orbit the card. */
    cloakPuffs: 7,
    cloakReach: 0.55,
    cloakPuffR: 0.22,
    cloakDriftMs: 2800,
    cloakAlpha: 0.42,
    /** Brief burst when Cloak first lands. */
    cloakBurstMs: 700,
    /** Energy slash (ability1 resolve / cloak trip). */
    slashMs: 520,
    slashReach: 0.85,
    slashWidth: 10,
    /** Blade Dance: caster shroud + spinning blades on hit cards. */
    danceMs: 1100,
    danceBlades: 3,
    danceReach: 0.7,
    danceSpinRate: 0.014,
    danceShroudAlpha: 0.5,
};

/**
 * Sombra's Hack: a wall of binary swept left to right across the whole board.
 *
 * The sweep is the effect — the target's shields and tokens fall off behind it —
 * so it crosses the board once rather than sitting on the hacked card.
 */
export const HACK = {
    sweepMs: 1150,
    /** Columns of glyphs across the board's width. */
    columns: 30,
    /** Glyphs stacked in each column. */
    rows: 14,
    /** How far ahead of and behind the front a column is still lit, in columns. */
    leadColumns: 1.5,
    trailColumns: 6,
    /** Glyphs re-roll on this cadence, so the wall reads as data, not texture. */
    rerollMs: 90,
    glyphWidth: 5,
    glyphHeight: 11,
    maxAlpha: 0.85,
    /** The bright edge riding the front of the sweep. */
    frontWidth: 3,
};
