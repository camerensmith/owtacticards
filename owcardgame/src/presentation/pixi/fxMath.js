import {
    PREVIEW,
    DRONE,
    LOCK_ON,
    LOCK_ON_TOTAL_MS,
    CHARGE,
    BLAST,
    BLAST_TOTAL_MS,
    FLOAT,
    PUSH,
    CRYSTAL,
    CRYSTAL_TOTAL_MS,
    RIPTIRE,
    RIPTIRE_TOTAL_MS,
    BARRIER,
    FROST,
    FREEZE,
    BULLET,
    SENTRY,
    TANK_FORM,
    ROCKET,
    BLOOD,
    PELLET,
    BLOSSOM,
    CLAMP,
    WIRE,
    ZAP,
    SHATTER,
    WARD,
    BIOTIC,
    CROSSHAIR,
    MEKA,
    GRENADE,
    FLASHBANG,
    DEADEYE,
    NANO,
    BLIP,
    DUPLICATE,
    LAVA,
    SUPPRESS,
    SMASH,
    STAFF,
    TIDE,
    HOOK,
    HOG,
    FLUX,
    ANNIHILATE,
    ORB,
    SPARKLE,
    PACK,
    PUNCH,
    METEOR,
    RIFLE,
    CONCUSSIVE,
    BARRAGE,
    SHURIKEN,
    SLICE,
    SUPERCHARGE,
    INFRA,
    CREVICE,
    SPRAY,
    ORB_TOKEN,
    TRANSCEND,
    MATRIX,
    BUBBLE,
    PRIMAL,
    BURROW,
    TECTONIC,
    SANDSTORM,
    SMOKE,
    CAGE,
    BERSERK,
    MAUGA_SMASH,
    BESTOW,
    REZ,
    LUCIO_TOKEN,
    SOUND_BARRIER,
    ZARYA_ORB,
    PARTICLE_BEAM,
    MINEFIELD,
    MINE_BLAST,
    ADAPTIVE,
    SHIELD_GEN,
    TELEPORT,
    SONIC,
    DRAGONSTRIKE,
    BASH,
    TURBOJACK,
    CARD_FLIGHT,
    LIFE_GRIP,
    TREE_OF_LIFE,
    CATNAP,
    WARP,
    MANTIS,
    HACK,
} from './fxConfig';


// Re-exported so callers can import knobs and maths from either module.
export {
    PREVIEW,
    DRONE,
    LOCK_ON,
    LOCK_ON_TOTAL_MS,
    CHARGE,
    BLAST,
    BLAST_TOTAL_MS,
    FLOAT,
    PUSH,
    CRYSTAL,
    CRYSTAL_TOTAL_MS,
    RIPTIRE,
    RIPTIRE_TOTAL_MS,
    BARRIER,
    FROST,
    FREEZE,
    BULLET,
    SENTRY,
    TANK_FORM,
    ROCKET,
    BLOOD,
    PELLET,
    BLOSSOM,
    CLAMP,
    WIRE,
    ZAP,
    SHATTER,
    WARD,
    BIOTIC,
    CROSSHAIR,
    MEKA,
    GRENADE,
    FLASHBANG,
    DEADEYE,
    NANO,
    BLIP,
    DUPLICATE,
    LAVA,
    SUPPRESS,
    SMASH,
    STAFF,
    TIDE,
    HOOK,
    HOG,
    FLUX,
    ANNIHILATE,
    ORB,
    SPARKLE,
    PACK,
    PUNCH,
    METEOR,
    RIFLE,
    CONCUSSIVE,
    BARRAGE,
    SHURIKEN,
    SLICE,
    SUPERCHARGE,
    INFRA,
    CREVICE,
    SPRAY,
    ORB_TOKEN,
    TRANSCEND,
    MATRIX,
    BUBBLE,
    PRIMAL,
    BURROW,
    TECTONIC,
    SANDSTORM,
    SMOKE,
    CAGE,
    BERSERK,
    MAUGA_SMASH,
    BESTOW,
    REZ,
    LUCIO_TOKEN,
    SOUND_BARRIER,
    ZARYA_ORB,
    PARTICLE_BEAM,
    MINEFIELD,
    MINE_BLAST,
    ADAPTIVE,
    SHIELD_GEN,
    TELEPORT,
    SONIC,
    DRAGONSTRIKE,
    BASH,
    TURBOJACK,
    CARD_FLIGHT,
    LIFE_GRIP,
    TREE_OF_LIFE,
    CATNAP,
    WARP,
    MANTIS,
    HACK,
};

export function clamp01(t) {
    return Math.max(0, Math.min(1, Number(t) || 0));
}

export function easeInOut(t) {
    return t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2;
}

export function easeOut(t) {
    const e = clamp01(t);
    return 1 - (1 - e) ** 3;
}

/**
 * A card carried from the hand to the slot it was dropped on.
 *
 * Eased out, not in and out: the player has just thrown it, so it leaves the
 * hand at speed and settles into the slot. An ease-in-out reads as the card
 * hesitating before it agrees to move, which is what made the drop feel slow
 * even before its duration is counted.
 *
 * The arc is a quadratic bezier through a control point lifted above the
 * straight line, scaled to the drop's own vertical span so a short hop across
 * one row does not bow as hard as a throw to the far side of the board.
 */
export function cardFlightSample(elapsedMs, from = {}, to = {}, cfg = CARD_FLIGHT) {
    const t = clamp01((Number(elapsedMs) || 0) / (cfg.ms || 1));
    const e = easeOut(t);
    const u = 1 - e;
    const fromX = from.x || 0;
    const fromY = from.y || 0;
    const toX = to.x || 0;
    const toY = to.y || 0;
    const midX = (fromX + toX) / 2;
    const midY = Math.min(fromY, toY) - Math.abs(toY - fromY) * cfg.arc;
    return {
        t,
        x: u * u * fromX + 2 * u * e * midX + e * e * toX,
        y: u * u * fromY + 2 * u * e * midY + e * e * toY,
        // Swells as it crosses and returns to size on landing, so the card
        // reads as passing over the board rather than sliding along it.
        scale: 1 + Math.sin(t * Math.PI) * cfg.lift,
        done: t >= 1,
    };
}

/** Pure land-burst timeline. t is 0..1. */
export function landBurstSample(t, radius = 40) {
    const e = Math.max(0, Math.min(1, t));
    return {
        radius: radius * (0.35 + 1.35 * e),
        alpha: 1 - e,
        innerAlpha: Math.max(0, 1 - e * 1.6),
    };
}

export function stripeOffset(elapsedMs, periodMs = PREVIEW.stripePeriodMs) {
    const period = periodMs || PREVIEW.stripePeriodMs;
    const t = ((elapsedMs % period) + period) % period;
    return t / period;
}

export function cardPulseAlpha(elapsedMs, isPossible = false) {
    const t = stripeOffset(elapsedMs, PREVIEW.pulsePeriodMs);
    const wave = 0.5 + 0.5 * Math.sin(t * Math.PI * 2);
    const alpha = PREVIEW.pulseMin + (PREVIEW.pulseMax - PREVIEW.pulseMin) * wave;
    return isPossible ? alpha * 0.5 : alpha;
}

export function chevronSamples(from, to, count = 3) {
    const n = Math.max(0, Number(count) || 0);
    const dx = (to?.x || 0) - (from?.x || 0);
    const dy = (to?.y || 0) - (from?.y || 0);
    const angle = Math.atan2(dy, dx);
    const out = [];
    for (let i = 1; i <= n; i += 1) {
        const u = i / (n + 1);
        out.push({
            x: (from?.x || 0) + dx * u,
            y: (from?.y || 0) + dy * u,
            angle,
        });
    }
    return out;
}

/* ---------------------------------------------------------------------------
 * Warden's Seeker Drone.
 * Pure timeline maths so the flight can be reasoned about without a renderer.
 * ------------------------------------------------------------------------- */

/**
 * Launch arc: Warden's card to the first orbit point, rising as it goes.
 * Returns scale too, so the drone reads as departing rather than sliding.
 */
export function droneLaunchSample(t, from = {}, to = {}, cfg = DRONE) {
    const e = easeInOut(clamp01(t));
    const u = 1 - e;
    const fx = from.x || 0;
    const fy = from.y || 0;
    const tx = to.x || 0;
    const ty = to.y || 0;
    // Lift the control point well above both ends for a lobbed launch.
    const midX = (fx + tx) / 2;
    const midY = Math.min(fy, ty) - Math.abs(ty - fy) * 0.45 - 40;
    return {
        x: u * u * fx + 2 * u * e * midX + e * e * tx,
        y: u * u * fy + 2 * u * e * midY + e * e * ty,
        scale: cfg.startScale + (1 - cfg.startScale) * e,
    };
}

/**
 * Lissajous wander inside the enemy half. `bounds` is a centre plus extents.
 * angle follows the derivative so the sprite banks into its own travel.
 */
export function droneOrbitSample(elapsedMs, bounds = {}, cfg = DRONE) {
    const ms = Number(elapsedMs) || 0;
    const rx = (bounds.width || 0) * cfg.driftXExtent;
    const ry = (bounds.height || 0) * cfg.driftYExtent;
    const ax = ms * cfg.driftXRate;
    const ay = ms * cfg.driftYRate + Math.PI / 3;
    const dx = rx * cfg.driftXRate * Math.cos(ax);
    const dy = ry * cfg.driftYRate * Math.cos(ay);
    return {
        x: (bounds.x || 0) + rx * Math.sin(ax),
        y: (bounds.y || 0) + ry * Math.sin(ay),
        angle: Math.atan2(dy, dx),
    };
}

/**
 * Red warning strobe: two sharp blinks per period over a dim floor, so it
 * reads as a searching beacon rather than a sine-wave glow.
 */
export function beaconAlpha(elapsedMs, cfg = DRONE) {
    const period = cfg.beaconPeriodMs || DRONE.beaconPeriodMs;
    const ms = Number(elapsedMs) || 0;
    const t = ((ms % period) + period) % period / period;
    const blink = (t * 2) % 1;
    const envelope = blink < 0.35 ? 1 - blink / 0.35 : 0;
    return cfg.beaconMinAlpha + (cfg.beaconMaxAlpha - cfg.beaconMinAlpha) * envelope;
}

/** Fiery impact: white-hot core, expanding shock ring, and thrown embers. */
export function impactFlashSample(t, radius = 46) {
    const e = clamp01(t);
    return {
        radius: radius * (0.2 + 1.7 * e),
        coreRadius: radius * 0.55 * Math.max(0, 1 - e * 2.2),
        alpha: 1 - e * e,
        coreAlpha: Math.max(0, 1 - e * 2.4),
        emberDistance: radius * (0.3 + 2.4 * e),
        emberRadius: Math.max(0, radius * 0.12 * (1 - e)),
        emberAlpha: Math.max(0, 1 - e * 1.3),
    };
}

/** Even ring of ember offsets; separated out so the layer stays declarative. */
export function emberOffsets(count = DRONE.emberCount, distance = 0) {
    const n = Math.max(0, Number(count) || 0);
    const out = [];
    for (let i = 0; i < n; i += 1) {
        const angle = (i / n) * Math.PI * 2;
        out.push({
            x: Math.cos(angle) * distance,
            y: Math.sin(angle) * distance,
            angle,
        });
    }
    return out;
}

/* ---------------------------------------------------------------------------
 * Lock On reticle (Bravo-X2).
 * Four orange corner brackets that converge on the target, snap tight with a
 * flash, then release. Square, not circular — it should read as a gun sight.
 * ------------------------------------------------------------------------- */

/**
 * Reticle timeline in three beats: converge, lock (with flash), release.
 * Returns everything the layer needs to draw a frame.
 */
export function lockOnSample(elapsedMs, cfg = LOCK_ON) {
    const ms = Math.max(0, Number(elapsedMs) || 0);
    const total = cfg.snapMs + cfg.holdMs + cfg.fadeMs;

    if (ms >= total) {
        return { scale: 1, alpha: 0, flashAlpha: 0, spin: 0, done: true };
    }

    if (ms < cfg.snapMs) {
        const e = easeInOut(clamp01(ms / cfg.snapMs));
        return {
            scale: cfg.startScale + (cfg.overshoot - cfg.startScale) * e,
            alpha: e,
            flashAlpha: 0,
            spin: (1 - e) * cfg.spinFrom,
            done: false,
        };
    }

    if (ms < cfg.snapMs + cfg.holdMs) {
        const e = clamp01((ms - cfg.snapMs) / cfg.holdMs);
        return {
            scale: cfg.overshoot + (1 - cfg.overshoot) * easeInOut(e),
            alpha: 1,
            // Bright on contact, gone quickly — the moment the lock lands.
            flashAlpha: Math.max(0, 1 - e * 3),
            spin: 0,
            done: false,
        };
    }

    const e = clamp01((ms - cfg.snapMs - cfg.holdMs) / cfg.fadeMs);
    return { scale: 1, alpha: 1 - e, flashAlpha: 0, spin: 0, done: false };
}

/**
 * The four corner brackets, as offsets from the box centre.
 * Each corner carries inward arm vectors, so the layer draws an L per corner.
 */
export function lockOnCorners(box = {}, scale = 1, cfg = LOCK_ON) {
    const width = box.width || 0;
    const height = box.height || 0;
    const hw = (width / 2) * scale;
    const hh = (height / 2) * scale;
    const arm = Math.max(4, Math.min(width, height) * cfg.cornerRatio);
    // top-left, top-right, bottom-right, bottom-left
    return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => ({
        x: hw * sx,
        y: hh * sy,
        armX: -sx * arm,
        armY: -sy * arm,
    }));
}

/* ---------------------------------------------------------------------------
 * Charge-up glow (Bravo-X2 spooling the Hyperion Cannon while you aim).
 * Loops for as long as targeting is open, so every value is periodic.
 * ------------------------------------------------------------------------- */

/** How far the charge has spooled up, 0..1, holding at 1. */
export function chargeRamp(elapsedMs, cfg = CHARGE) {
    return clamp01((Number(elapsedMs) || 0) / (cfg.rampMs || CHARGE.rampMs));
}

/**
 * Rings converging on the card, evenly staggered so one is always arriving.
 * Each fades in and back out across its travel, brightest mid-flight.
 */
export function chargeRingSamples(elapsedMs, cfg = CHARGE) {
    const ms = Math.max(0, Number(elapsedMs) || 0);
    const period = cfg.ringPeriodMs || CHARGE.ringPeriodMs;
    const count = Math.max(0, cfg.ringCount || 0);
    const ramp = chargeRamp(ms, cfg);
    const out = [];
    for (let i = 0; i < count; i += 1) {
        const u = (((ms / period) + i / count) % 1 + 1) % 1;
        out.push({
            scale: cfg.startRadius + (cfg.endRadius - cfg.startRadius) * u,
            alpha: Math.sin(u * Math.PI) * (0.35 + 0.65 * ramp),
        });
    }
    return out;
}

/** The core gathering on the card: grows with the ramp, pulses continuously. */
export function chargeCoreSample(elapsedMs, cfg = CHARGE) {
    const ms = Math.max(0, Number(elapsedMs) || 0);
    const ramp = chargeRamp(ms, cfg);
    const period = cfg.corePulseMs || CHARGE.corePulseMs;
    const wave = 0.5 + 0.5 * Math.sin((ms / period) * Math.PI * 2);
    return {
        scale: cfg.coreMinScale + (cfg.coreMaxScale - cfg.coreMinScale) * ramp,
        alpha: (cfg.coreMinAlpha + (cfg.coreMaxAlpha - cfg.coreMinAlpha) * wave) * (0.4 + 0.6 * ramp),
        ramp,
    };
}

/* ---------------------------------------------------------------------------
 * Beam blast (Hyperion Cannon).
 * A head races to the target, the column sustains, then collapses.
 * ------------------------------------------------------------------------- */

/**
 * `reach` is how far along the source-to-target line the beam has arrived,
 * `width` scales the column, and `impactT` drives the flash at the far end.
 */
export function blastSample(elapsedMs, cfg = BLAST) {
    const ms = Math.max(0, Number(elapsedMs) || 0);
    const travel = cfg.travelMs;
    const hold = cfg.holdMs;
    const total = travel + hold + cfg.fadeMs;

    if (ms >= total) {
        return { reach: 1, width: 0, alpha: 0, impactT: 1, done: true };
    }

    // The flash only begins once the beam actually lands.
    const impactT = ms <= travel ? 0 : clamp01((ms - travel) / (hold + cfg.fadeMs));

    if (ms < travel) {
        const e = easeInOut(ms / travel);
        return { reach: e, width: 0.5 + 0.5 * e, alpha: 1, impactT, done: false };
    }
    if (ms < travel + hold) {
        return { reach: 1, width: 1, alpha: 1, impactT, done: false };
    }
    const e = clamp01((ms - travel - hold) / cfg.fadeMs);
    return { reach: 1, width: 1 - e, alpha: 1 - e, impactT, done: false };
}

/** Beam geometry: the quad corners for a thick line from `from` to `to`. */
export function beamQuad(from = {}, to = {}, width = 10, reach = 1) {
    const fx = from.x || 0;
    const fy = from.y || 0;
    const dx = (to.x || 0) - fx;
    const dy = (to.y || 0) - fy;
    const hx = fx + dx * clamp01(reach);
    const hy = fy + dy * clamp01(reach);
    const len = Math.hypot(dx, dy) || 1;
    // Unit normal, so the column has thickness perpendicular to travel.
    const nx = (-dy / len) * (width / 2);
    const ny = (dx / len) * (width / 2);
    return {
        head: { x: hx, y: hy },
        angle: Math.atan2(dy, dx),
        points: [
            fx + nx, fy + ny,
            hx + nx, hy + ny,
            hx - nx, hy - ny,
            fx - nx, fy - ny,
        ],
    };
}

/* ---------------------------------------------------------------------------
 * Floating combat numbers (damage / heal).
 * Rise, hang, then fade — with a punch on arrival so a big hit reads as big.
 * ------------------------------------------------------------------------- */

/**
 * One float's state at time t.
 * `seed` (0..1) spreads simultaneous hits apart horizontally.
 */
export function floatSample(elapsedMs, seed = 0, cfg = FLOAT) {
    const t = clamp01((Number(elapsedMs) || 0) / cfg.lifeMs);

    // Ease-out rise: quick off the mark, drifting to a stop.
    const rise = 1 - (1 - t) ** 2;

    let scale = 1;
    const popT = clamp01((Number(elapsedMs) || 0) / cfg.popMs);
    if (popT < 1) {
        // Punch up past full size, then settle back.
        scale = popT < 0.5
            ? 1 + (cfg.popScale - 1) * (popT / 0.5)
            : cfg.popScale - (cfg.popScale - 1) * ((popT - 0.5) / 0.5);
    }

    const alpha = t < cfg.fadeFrom
        ? 1
        : 1 - (t - cfg.fadeFrom) / (1 - cfg.fadeFrom);

    return {
        offsetY: -cfg.rise * rise,
        offsetX: (seed - 0.5) * 2 * cfg.driftX,
        alpha: Math.max(0, alpha),
        scale,
        done: t >= 1,
    };
}

/* ---------------------------------------------------------------------------
 * Forced movement (Cyclo / Fika / Wuyang pushing a card between rows).
 * ------------------------------------------------------------------------- */

export function pushSample(t, from = {}, to = {}, cfg = PUSH) {
    const e = easeInOut(clamp01(t));
    const arc = Math.sin(clamp01(t) * Math.PI); // 0 at both ends, 1 mid-flight
    return {
        x: (from.x || 0) + ((to.x || 0) - (from.x || 0)) * e,
        y: (from.y || 0) + ((to.y || 0) - (from.y || 0)) * e - cfg.lift * arc,
        scale: 1 + (cfg.peakScale - 1) * arc,
    };
}

/* ---------------------------------------------------------------------------
 * Crystal rain (Hazard's Downpour).
 * Shards fall across the whole enemy side on a stagger, so it reads as weather
 * rather than a single burst.
 * ------------------------------------------------------------------------- */

/** Stable pseudo-random in 0..1, so a shard keeps its lane every frame. */
export function shardSeed(index, salt = 0) {
    const s = Math.sin((index + 1) * 12.9898 + salt * 78.233) * 43758.5453;
    return s - Math.floor(s);
}

/**
 * One shard's state. `area` is the enemy side rect (left/top/width/height).
 * Shards not yet released report visible:false.
 */
export function crystalSample(elapsedMs, index, area = {}, cfg = CRYSTAL) {
    const local = (Number(elapsedMs) || 0) - index * cfg.staggerMs;
    if (local < 0) return { visible: false, x: 0, y: 0, alpha: 0, scale: 1, tilt: 0, rot: 0 };

    const t = clamp01(local / cfg.fallMs);
    const laneX = (area.left || 0) + shardSeed(index) * (area.width || 0);
    const top = (area.top || 0) - cfg.dropIn;
    const travel = (area.height || 0) + cfg.dropIn;
    const spin = (shardSeed(index, 3) - 0.5) * 4.2;

    return {
        visible: t < 1,
        x: laneX,
        // Accelerating fall; shards speed up as they drop.
        y: top + travel * (t * t),
        // Fade in off the top edge, fade out as it lands.
        alpha: Math.min(1, t * 6) * (1 - clamp01((t - 0.75) / 0.25)),
        scale: 0.7 + 0.3 * shardSeed(index, 1),
        tilt: (shardSeed(index, 2) - 0.5) * 0.5,
        rot: (shardSeed(index, 4) - 0.5) * 0.6 + t * spin,
        t,
    };
}

/* ---------------------------------------------------------------------------
 * RIP-Tire (Junkrat). Rolls to the target row spinning and hopping, then blows.
 * ------------------------------------------------------------------------- */

export function riptireSample(elapsedMs, from = {}, to = {}, cfg = RIPTIRE) {
    const ms = Math.max(0, Number(elapsedMs) || 0);
    const windup = Math.max(0, Number(cfg.windupMs) || 0);
    if (ms < windup) {
        return {
            windup: true,
            travelling: false,
            x: from.x || 0,
            y: from.y || 0,
            rotation: 0,
            alpha: 0,
            explodeT: 0,
            done: false,
        };
    }

    const local = ms - windup;
    const travelling = local < cfg.travelMs;
    const t = clamp01(local / cfg.travelMs);
    const e = easeInOut(t);

    // Little hops along the way, flattening out as it arrives.
    const hop = Math.abs(Math.sin((local / cfg.hopPeriodMs) * Math.PI)) * cfg.hopHeight * (1 - t);
    const px = (to.x || 0) - (from.x || 0);
    const py = (to.y || 0) - (from.y || 0);
    const len = Math.hypot(px, py) || 1;
    const loop = Math.sin(t * Math.PI * 2 * (cfg.loopTurns || 0))
        * (cfg.loopAmplitude || 0)
        * Math.sin(Math.PI * t);

    return {
        windup: false,
        travelling,
        x: (from.x || 0) + px * e + (-py / len) * loop,
        y: (from.y || 0) + py * e + (px / len) * loop - hop,
        rotation: local * cfg.spinRate,
        alpha: travelling ? 1 : 0,
        explodeT: travelling ? 0 : clamp01((local - cfg.travelMs) / cfg.explodeMs),
        done: local >= cfg.travelMs + cfg.explodeMs,
    };
}

/* ---------------------------------------------------------------------------
 * Curved barriers (Sigma's Experimental Barrier, Reinhardt's Barrier Field).
 * ------------------------------------------------------------------------- */

/**
 * A parabolic arc bowing toward `facing` (-1 up, +1 down).
 *
 * Flat at the ends and deepest at the centre, so it bleeds off the thing it
 * protects instead of stopping dead at the edges.
 */
export function arcPoints(cx, cy, halfSpan, bulge, facing = -1, segments = BARRIER.segments) {
    const n = Math.max(2, Number(segments) || 2);
    const points = [];
    for (let i = 0; i <= n; i += 1) {
        const u = (i / n) * 2 - 1; // -1 .. 1
        points.push({
            x: cx + halfSpan * u,
            y: cy + facing * bulge * (1 - u * u),
        });
    }
    return points;
}

/** Sigma's row barrier: spans the row, bulging toward the enemy. */
export function rowBarrierArc(rect = {}, facing = -1, cfg = BARRIER) {
    const width = rect.width || 0;
    const height = rect.height || 0;
    const halfSpan = (width / 2) * (1 + cfg.rowOverhang);
    const bulge = height * cfg.rowBulge;
    const cy = (rect.y || 0) + facing * (height / 2);
    return arcPoints(rect.x || 0, cy, halfSpan, bulge, facing, cfg.segments);
}

/** Reinhardt's shield: planted in front of his card, wider than he is. */
export function heroShieldArc(rect = {}, facing = -1, cfg = BARRIER) {
    const width = rect.width || 0;
    const height = rect.height || 0;
    const halfSpan = (width / 2) * cfg.shieldSpan;
    const cy = (rect.y || 0) + facing * height * cfg.shieldStandoff;
    return arcPoints(rect.x || 0, cy, halfSpan, cfg.shieldBulge, facing, cfg.segments);
}

/* ---------------------------------------------------------------------------
 * Frost (Mei).
 * A persistent rime over the Blizzard row, and a one-shot spiral that closes
 * around whatever gets frozen.
 * ------------------------------------------------------------------------- */

/** Slow breathing so the rime looks cold rather than switched on. */
export function frostShimmer(elapsedMs, cfg = FROST) {
    const period = cfg.shimmerMs || FROST.shimmerMs;
    const wave = 0.5 + 0.5 * Math.sin(((Number(elapsedMs) || 0) / period) * Math.PI * 2);
    return cfg.minAlpha + (cfg.maxAlpha - cfg.minAlpha) * wave;
}

/**
 * Jagged rime creeping in from one edge of a rect.
 * `facing` is +1 for spikes growing downward (from the top edge), -1 for upward.
 * Depths vary per spike but are stable, so the ice does not crawl frame to frame.
 */
export function frostSpikes(rect = {}, facing = 1, cfg = FROST) {
    const count = Math.max(1, cfg.spikeCount || 1);
    const left = rect.left || 0;
    const width = rect.width || 0;
    const height = rect.height || 0;
    const edgeY = facing > 0 ? (rect.top || 0) : (rect.top || 0) + height;
    const step = width / count;
    const maxDepth = (height / 2) * cfg.spikeDepth;

    const spikes = [];
    for (let i = 0; i < count; i += 1) {
        const depth = maxDepth * (0.35 + 0.65 * shardSeed(i, facing > 0 ? 3 : 4));
        spikes.push({
            baseLeft: { x: left + i * step, y: edgeY },
            baseRight: { x: left + (i + 1) * step, y: edgeY },
            tip: { x: left + (i + 0.5) * step, y: edgeY + facing * depth },
        });
    }
    return spikes;
}

/**
 * Freeze spiral timeline: the spiral draws itself outward, ice shards
 * crystallise around the target, then the whole thing fades.
 */
export function freezeSample(elapsedMs, cfg = FREEZE) {
    const t = clamp01((Number(elapsedMs) || 0) / cfg.durationMs);
    const spin = (Number(elapsedMs) || 0) * cfg.spinRate;

    const progress = clamp01(t / cfg.drawUntil);
    const shardAlpha = t <= cfg.drawUntil
        ? 0
        : clamp01((t - cfg.drawUntil) / (cfg.holdUntil - cfg.drawUntil));
    const alpha = t <= cfg.holdUntil
        ? 1
        : 1 - clamp01((t - cfg.holdUntil) / (1 - cfg.holdUntil));

    return { progress, spin, alpha, shardAlpha, done: t >= 1 };
}

/**
 * Points along an Archimedean spiral, centred on the origin.
 * Only the first `progress` of the curve is returned, so it draws itself on.
 */
export function spiralPoints(radius, progress = 1, spin = 0, cfg = FREEZE) {
    const total = Math.max(2, cfg.points || 2);
    const drawn = Math.max(2, Math.floor(total * clamp01(progress)));
    const points = [];
    for (let i = 0; i < drawn; i += 1) {
        const u = i / (total - 1);
        const angle = u * cfg.turns * Math.PI * 2 + spin;
        const r = radius * u;
        points.push({ x: Math.cos(angle) * r, y: Math.sin(angle) * r });
    }
    return points;
}

/** Ice shards standing around the frozen target, pointing outward. */
export function freezeShards(radius, count = FREEZE.shardCount, spin = 0) {
    const n = Math.max(0, Number(count) || 0);
    const shards = [];
    for (let i = 0; i < n; i += 1) {
        const angle = (i / n) * Math.PI * 2 + spin * 0.25;
        const length = radius * (0.22 + 0.2 * shardSeed(i, 5));
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const baseR = radius * 0.82;
        shards.push({
            angle,
            base: { x: cos * baseR, y: sin * baseR },
            tip: { x: cos * (baseR + length), y: sin * (baseR + length) },
            width: radius * 0.09,
        });
    }
    return shards;
}

/* ---------------------------------------------------------------------------
 * Pulse pistol rounds (Tracer).
 * ------------------------------------------------------------------------- */

export function bulletTotalMs(rounds = 1, cfg = BULLET) {
    const n = Math.max(1, Number(rounds) || 1);
    return (n - 1) * cfg.burstGapMs + cfg.travelMs + cfg.sparkMs;
}

/**
 * One round of a burst.
 *
 * Rounds travel at a constant speed — easing would read as a thrown object
 * rather than a shot. `index` staggers the burst and seeds a small
 * perpendicular scatter so the rounds do not overlap into a single line.
 */
export function bulletSample(elapsedMs, index = 0, from = {}, to = {}, cfg = BULLET) {
    const local = (Number(elapsedMs) || 0) - index * cfg.burstGapMs;
    const idle = { visible: false, sparkT: 0, done: false };
    if (local < 0) return idle;

    const t = clamp01(local / cfg.travelMs);
    const fx = from.x || 0;
    const fy = from.y || 0;
    const dx = (to.x || 0) - fx;
    const dy = (to.y || 0) - fy;
    const len = Math.hypot(dx, dy) || 1;

    // Scatter across the line of fire, stable per round.
    const offset = (shardSeed(index, 7) - 0.5) * 2 * cfg.spread;
    const nx = (-dy / len) * offset;
    const ny = (dx / len) * offset;

    const headX = fx + dx * t + nx;
    const headY = fy + dy * t + ny;
    const ux = dx / len;
    const uy = dy / len;

    return {
        visible: t < 1,
        head: { x: headX, y: headY },
        tail: { x: headX - ux * cfg.length, y: headY - uy * cfg.length },
        trail: { x: headX - ux * (cfg.length + cfg.trail), y: headY - uy * (cfg.length + cfg.trail) },
        angle: Math.atan2(dy, dx),
        t,
        sparkT: t < 1 ? 0 : clamp01((local - cfg.travelMs) / cfg.sparkMs),
        done: local >= cfg.travelMs + cfg.sparkMs,
    };
}

/* ---------------------------------------------------------------------------
 * Bastion.
 * ------------------------------------------------------------------------- */

/**
 * Sentry scanner sweeping a row.
 * `u` is 0..1 across the row. Cosine ping-pong, so it decelerates at each end
 * the way a real scan head would rather than snapping back.
 */
export function sentrySweep(elapsedMs, cfg = SENTRY) {
    const period = cfg.sweepMs || SENTRY.sweepMs;
    const phase = (((Number(elapsedMs) || 0) % period) + period) % period / period;
    const u = 0.5 - 0.5 * Math.cos(phase * Math.PI * 2);
    // Brightest mid-sweep, dimmest as it turns around.
    const alpha = cfg.minAlpha + (cfg.maxAlpha - cfg.minAlpha) * Math.sin(u * Math.PI);
    return { u, alpha };
}

/** Tank form fade-in plus a slow idle bob, so it does not sit dead still. */
export function tankFormSample(elapsedMs, closing = false, cfg = TANK_FORM) {
    const ms = Math.max(0, Number(elapsedMs) || 0);
    const fade = clamp01(ms / cfg.fadeMs);
    return {
        alpha: closing ? 1 - fade : fade,
        offsetY: Math.sin((ms / cfg.bobMs) * Math.PI * 2) * cfg.bob,
        gone: closing && fade >= 1,
    };
}

/**
 * One rocket of a salvo.
 * Bows sideways, alternating direction per index so a salvo fans out, and
 * leaves a short trail of smoke puffs along the path already flown.
 */
export function rocketSample(elapsedMs, index = 0, from = {}, to = {}, cfg = ROCKET) {
    const local = (Number(elapsedMs) || 0) - index * cfg.staggerMs;
    if (local < 0) return { visible: false, smoke: [], explodeT: 0, done: false };

    const t = clamp01(local / cfg.travelMs);
    const fx = from.x || 0;
    const fy = from.y || 0;
    const dx = (to.x || 0) - fx;
    const dy = (to.y || 0) - fy;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    // Alternate the bow so consecutive rockets separate.
    const bow = (index % 2 === 0 ? 1 : -1) * cfg.arc * (0.6 + 0.4 * shardSeed(index, 9));

    const at = (p) => {
        const q = clamp01(p);
        const swing = Math.sin(q * Math.PI) * bow;
        return { x: fx + dx * q + nx * swing, y: fy + dy * q + ny * swing };
    };

    const head = at(t);
    const prev = at(t - 0.02);
    const ang = Math.atan2(head.y - prev.y, head.x - prev.x);

    const smoke = [];
    for (let i = 1; i <= cfg.smokeCount; i += 1) {
        const q = t - i * cfg.smokeSpacing;
        if (q <= 0) break;
        const puff = at(q);
        const age = i / cfg.smokeCount;
        smoke.push({ x: puff.x, y: puff.y, alpha: (1 - age) * 0.5, radius: 2 + age * 5 });
    }

    return {
        visible: t < 1,
        head,
        tail: { x: head.x - Math.cos(ang) * cfg.length, y: head.y - Math.sin(ang) * cfg.length },
        angle: ang,
        smoke,
        t,
        explodeT: t < 1 ? 0 : clamp01((local - cfg.travelMs) / cfg.explodeMs),
        done: local >= cfg.travelMs + cfg.explodeMs,
    };
}

/* ---------------------------------------------------------------------------
 * Bleed droplets (Junker Queen).
 * ------------------------------------------------------------------------- */

export function bloodTotalMs(cfg = BLOOD) {
    return (cfg.count - 1) * cfg.staggerMs + cfg.dropMs;
}

/**
 * One bead of a bleed.
 *
 * Beads form on the wounded card, swell, then run down it under gravity,
 * stretching as they go. Positions are seeded from the index so a bleed does
 * not put every bead in the same place.
 */
export function bloodDropSample(elapsedMs, index = 0, rect = {}, cfg = BLOOD) {
    const local = (Number(elapsedMs) || 0) - index * cfg.staggerMs;
    if (local < 0) return { visible: false, done: false };

    const t = clamp01(local / cfg.dropMs);
    const swell = clamp01(local / cfg.swellMs);

    const width = rect.width || 0;
    const height = rect.height || 0;
    // Spread across the middle of the card, starting in its upper half.
    const x = (rect.x || 0) + (shardSeed(index, 11) - 0.5) * width * 0.55;
    const top = (rect.y || 0) - height * 0.15 + (shardSeed(index, 12) - 0.5) * height * 0.2;

    // Runs slowly at first, then accelerates.
    const run = t * t;
    const stretch = 1 + (cfg.stretch - 1) * clamp01(run * 1.6);

    return {
        visible: t < 1,
        x,
        y: top + cfg.fall * run,
        radius: cfg.radius * swell,
        stretch,
        // Holds, then fades out over the last third of the run.
        alpha: 1 - clamp01((t - 0.65) / 0.35),
        t,
        done: t >= 1,
    };
}

/* ---------------------------------------------------------------------------
 * Reaper.
 * ------------------------------------------------------------------------- */

export function pelletTotalMs(cfg = PELLET) {
    return (cfg.count - 1) * cfg.staggerMs + cfg.travelMs + cfg.sparkMs;
}

/**
 * One pellet of a shotgun spray.
 *
 * Pellets leave together in a cone and widen as they travel, landing scattered
 * around the target rather than all on one point. Angles are seeded per pellet
 * so the spray is stable frame to frame.
 */
export function pelletSample(elapsedMs, index = 0, from = {}, to = {}, cfg = PELLET) {
    const local = (Number(elapsedMs) || 0) - index * cfg.staggerMs;
    if (local < 0) return { visible: false, sparkT: 0, done: false };

    const t = clamp01(local / cfg.travelMs);
    const fx = from.x || 0;
    const fy = from.y || 0;
    const dx = (to.x || 0) - fx;
    const dy = (to.y || 0) - fy;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;

    // Cone: lateral offset grows with distance travelled.
    const angle = (shardSeed(index, 13) - 0.5) * 2 * cfg.spread;
    const lateral = Math.tan(angle) * len * t;
    // Plus a little scatter so they do not all sit on one straight fan line.
    const jitter = (shardSeed(index, 14) - 0.5) * 2 * cfg.landScatter * t;

    const spread = lateral + jitter;
    return {
        visible: t < 1,
        x: fx + dx * t + nx * spread,
        y: fy + dy * t + ny * spread,
        radius: cfg.radius,
        t,
        sparkT: t < 1 ? 0 : clamp01((local - cfg.travelMs) / cfg.sparkMs),
        done: local >= cfg.travelMs + cfg.sparkMs,
    };
}

/** Death Blossom fade and spin. `closing` runs the fade the other way. */
export function blossomSample(elapsedMs, closing = false, cfg = BLOSSOM) {
    const ms = Math.max(0, Number(elapsedMs) || 0);
    const fade = clamp01(ms / cfg.fadeMs);
    const pulse = 0.85 + 0.15 * Math.sin((ms / cfg.pulseMs) * Math.PI * 2);
    return {
        alpha: (closing ? 1 - fade : fade) * pulse,
        rotation: ms * cfg.spinRate,
        gone: closing && fade >= 1,
    };
}

export function clampFieldSample(elapsedMs, cfg = CLAMP) {
    const period = cfg.pulseMs || CLAMP.pulseMs;
    const t = ((((Number(elapsedMs) || 0) % period) + period) % period) / period;
    const wave = 0.5 + 0.5 * Math.sin(t * Math.PI * 2);
    return {
        alpha: cfg.minAlpha + (cfg.maxAlpha - cfg.minAlpha) * wave,
        jaw: cfg.jawMin + (cfg.jawMax - cfg.jawMin) * wave,
    };
}

export function clampJaws(rect, jaw) {
    const depth = (rect?.height || 0) * (Number(jaw) || 0);
    return {
        top: { y: rect?.top || 0, depth },
        bottom: { y: (rect?.top || 0) + (rect?.height || 0), depth },
    };
}

export function clampSparks(rect, elapsedMs, cfg = CLAMP) {
    const n = Math.max(0, Number(cfg.sparkCount) || 0);
    const period = cfg.sparkPeriodMs || CLAMP.sparkPeriodMs;
    const t = ((((Number(elapsedMs) || 0) % period) + period) % period) / period;
    const left = rect?.left || 0;
    const width = rect?.width || 0;
    const top = rect?.top || 0;
    const height = rect?.height || 0;
    const sparks = [];
    for (let i = 0; i < n; i += 1) {
        const u = (i / n + t) % 1;
        sparks.push({
            x: left + width * u,
            y: top + height * (i % 2 === 0 ? 0.12 : 0.88),
            alpha: 0.35 + 0.45 * Math.abs(Math.sin((u + i * 0.3) * Math.PI)),
            r: 2 + (i % 3),
        });
    }
    return sparks;
}

export function wireControlPoint(from, to, sag = WIRE.sag) {
    const ax = Number(from?.x) || 0;
    const ay = Number(from?.y) || 0;
    const bx = Number(to?.x) || 0;
    const by = Number(to?.y) || 0;
    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.hypot(dx, dy) || 1;
    const amount = len * (Number(sag) || 0);
    return {
        x: (ax + bx) / 2 + (-dy / len) * amount,
        y: (ay + by) / 2 + (dx / len) * amount,
    };
}

export function wirePoint(from, to, t, sag = WIRE.sag) {
    const u = Math.max(0, Math.min(1, Number(t) || 0));
    const ax = Number(from?.x) || 0;
    const ay = Number(from?.y) || 0;
    const bx = Number(to?.x) || 0;
    const by = Number(to?.y) || 0;
    const c = wireControlPoint({ x: ax, y: ay }, { x: bx, y: by }, sag);
    const v = 1 - u;
    return {
        x: v * v * ax + 2 * v * u * c.x + u * u * bx,
        y: v * v * ay + 2 * v * u * c.y + u * u * by,
    };
}

export function wireSample(elapsedMs, cfg = WIRE) {
    const period = cfg.pulseMs || WIRE.pulseMs;
    const t = ((((Number(elapsedMs) || 0) % period) + period) % period) / period;
    const wave = 0.5 + 0.5 * Math.sin(t * Math.PI * 2);
    return {
        alpha: cfg.minAlpha + (cfg.maxAlpha - cfg.minAlpha) * wave,
    };
}

export function wireSparks(from, to, elapsedMs, cfg = WIRE) {
    const n = Math.max(0, Number(cfg.sparkCount) || 0);
    const period = cfg.sparkPeriodMs || WIRE.sparkPeriodMs;
    const t = ((((Number(elapsedMs) || 0) % period) + period) % period) / period;
    const sparks = [];
    for (let i = 0; i < n; i += 1) {
        const u = (i / n + t) % 1;
        const p = wirePoint(from, to, u, cfg.sag);
        sparks.push({
            x: p.x,
            y: p.y,
            alpha: 0.45 + 0.55 * Math.abs(Math.sin((u + i * 0.4) * Math.PI)),
            r: 2 + (i % 2),
        });
    }
    return sparks;
}

/** Jagged bolt down an affected card. Local — nothing travels in from the caster. */
export function zapBolt(rect, elapsedMs, index = 0, cfg = ZAP) {
    const ms = Math.max(0, Number(elapsedMs) || 0);
    const life = cfg.ms || ZAP.ms;
    const t = Math.min(1, ms / Math.max(1, life));
    const cx = Number(rect?.x) || 0;
    const cy = Number(rect?.y) || 0;
    const w = Number(rect?.width) || 0;
    const h = Number(rect?.height) || 0;
    const top = cy - h / 2;
    const segments = Math.max(2, Number(cfg.segments) || ZAP.segments);
    const jitter = (Number(cfg.jitter) || ZAP.jitter) * (1 - t);
    const offset = ((Number(index) || 0) - 1) * (w * 0.16);
    const points = [];
    for (let i = 0; i <= segments; i += 1) {
        const u = i / segments;
        const jag = Math.sin((u * 9 + index * 1.7 + ms * 0.05) * Math.PI) * jitter;
        points.push({
            x: cx + offset + jag,
            y: top + h * u,
        });
    }
    return {
        points,
        alpha: 1 - t,
        gone: t >= 1,
    };
}

/** Relic pieces flying out of a dying Stoneguard. Origin is the card centre. */
export function shatterShard(origin, elapsedMs, index = 0, cfg = SHATTER) {
    const ms = Math.max(0, Number(elapsedMs) || 0);
    const life = cfg.ms || SHATTER.ms;
    const t = Math.min(1, ms / Math.max(1, life));
    const count = Math.max(1, Number(cfg.shardCount) || SHATTER.shardCount);
    const angle = (index / count) * Math.PI * 2 + shardSeed(index, 30) * 0.5;
    const speed = 28 + shardSeed(index, 31) * 70;
    const dist = speed * t;
    const ox = Number(origin?.x) || 0;
    const oy = Number(origin?.y) || 0;
    return {
        x: ox + Math.cos(angle) * dist,
        y: oy + Math.sin(angle) * dist + t * t * 36,
        w: 5 + shardSeed(index, 32) * 10,
        h: 8 + shardSeed(index, 33) * 14,
        rot: angle + t * 4,
        alpha: 1 - t,
        gone: t >= 1,
    };
}

/** Expanding gold ring when a nearby ally gains armor. */
export function wardSample(elapsedMs, cfg = WARD) {
    const ms = Math.max(0, Number(elapsedMs) || 0);
    const life = cfg.ms || WARD.ms;
    const t = Math.min(1, ms / Math.max(1, life));
    return {
        radius: (cfg.startR || WARD.startR) + ((cfg.endR || WARD.endR) - (cfg.startR || WARD.startR)) * t,
        alpha: (1 - t) * 0.85,
        gone: t >= 1,
    };
}

/* ---------------------------------------------------------------------------
 * Soldier 76 and the MEKA self-destruct.
 * ------------------------------------------------------------------------- */

/** Quick bloom then a slow settle, so the heal reads as a pulse not a fade. */
export function bioticFlash(elapsedMs, cfg = BIOTIC) {
    const ms = Math.max(0, Number(elapsedMs) || 0);
    if (ms <= cfg.flashMs) return clamp01(ms / cfg.flashMs);
    return 1 - clamp01((ms - cfg.flashMs) / (cfg.durationMs - cfg.flashMs));
}

/**
 * Bubbles rising through the row. Lanes and sizes are seeded per bubble so the
 * fizz does not re-scatter every frame.
 */
export function bioticBubbles(elapsedMs, rect = {}, cfg = BIOTIC) {
    const ms = Math.max(0, Number(elapsedMs) || 0);
    const width = rect.width || 0;
    const height = rect.height || 0;
    const bottom = (rect.top || 0) + height;
    const out = [];

    for (let i = 0; i < cfg.bubbleCount; i += 1) {
        const local = ms - i * cfg.staggerMs;
        if (local < 0) continue;
        const t = clamp01(local / (cfg.durationMs - i * cfg.staggerMs || cfg.durationMs));
        if (t >= 1) continue;
        out.push({
            x: (rect.left || 0) + shardSeed(i, 21) * width,
            // Rises and slows as it goes, like something buoyant.
            y: bottom - height * cfg.rise * (1 - (1 - t) ** 2),
            radius: cfg.bubbleRadius * (0.45 + 0.55 * shardSeed(i, 22)),
            alpha: Math.sin(t * Math.PI) * 0.85,
        });
    }
    return out;
}

/** Crosshair held on a target: slow spin with a breathing pulse. */
export function crosshairSample(elapsedMs, closing = false, cfg = CROSSHAIR) {
    const ms = Math.max(0, Number(elapsedMs) || 0);
    const fade = clamp01(ms / cfg.fadeMs);
    const wave = 0.5 + 0.5 * Math.sin((ms / cfg.pulseMs) * Math.PI * 2);
    return {
        rotation: ms * cfg.spinRate,
        alpha: closing ? 1 - fade : fade,
        // Breathes slightly so a held lock still looks alive.
        scale: 0.94 + 0.06 * wave,
        gone: closing && fade >= 1,
    };
}

/** Self-destruct: charge, then blast. `t` is over the whole sequence. */
export function mekaSample(elapsedMs, cfg = MEKA) {
    const ms = Math.max(0, Number(elapsedMs) || 0);
    if (ms < cfg.chargeMs) {
        const charge = clamp01(ms / cfg.chargeMs);
        return {
            charging: true,
            // Ramps hard at the end, so the last moment feels critical.
            intensity: charge * charge,
            // Flashes faster as it nears detonation.
            flicker: 0.5 + 0.5 * Math.sin(ms * (0.008 + 0.03 * charge)),
            blastT: 0,
            done: false,
        };
    }
    const blastT = clamp01((ms - cfg.chargeMs) / cfg.blastMs);
    return {
        charging: false,
        intensity: 1,
        flicker: 1,
        blastT,
        done: ms >= cfg.chargeMs + cfg.blastMs,
    };
}

/* ---------------------------------------------------------------------------
 * Grenades, Dead Eye and Nano Boost.
 * ------------------------------------------------------------------------- */

export function grenadeTotalMs(cfg = GRENADE) {
    return cfg.travelMs + cfg.burstMs;
}

/** A lobbed grenade: high arc, spinning, then a burst where it lands. */
export function grenadeSample(elapsedMs, from = {}, to = {}, cfg = GRENADE) {
    const ms = Math.max(0, Number(elapsedMs) || 0);
    const t = clamp01(ms / cfg.travelMs);
    const fx = from.x || 0;
    const fy = from.y || 0;

    return {
        flying: ms < cfg.travelMs,
        x: fx + ((to.x || 0) - fx) * t,
        // Lob: peaks mid-flight and lands flat.
        y: fy + ((to.y || 0) - fy) * t - Math.sin(t * Math.PI) * cfg.arc,
        rotation: ms * cfg.spinRate,
        burstT: ms < cfg.travelMs ? 0 : clamp01((ms - cfg.travelMs) / cfg.burstMs),
        done: ms >= cfg.travelMs + cfg.burstMs,
    };
}

/** Orb closing onto its mark, then holding with a slow pulse. */
export function deadeyeOrbSample(elapsedMs, cfg = DEADEYE) {
    const ms = Math.max(0, Number(elapsedMs) || 0);
    const settle = clamp01(ms / cfg.settleMs);
    const eased = easeInOut(settle);
    const wave = 0.5 + 0.5 * Math.sin((ms / cfg.pulseMs) * Math.PI * 2);
    return {
        // Starts wide and zeroes in.
        spread: cfg.approach + (1 - cfg.approach) * eased,
        alpha: settle,
        pulse: 0.8 + 0.2 * wave,
    };
}

/**
 * A jagged bolt across a rect. Offsets are seeded per bolt and segment, so an
 * arc holds its shape for its whole life instead of shimmering every frame.
 */
export function nanoBolt(index, rect = {}, cfg = NANO) {
    const segments = Math.max(2, cfg.segments);
    const left = rect.left || 0;
    const width = rect.width || 0;
    const height = rect.height || 0;
    const midY = (rect.top || 0) + height / 2;
    const points = [];
    for (let i = 0; i <= segments; i += 1) {
        const u = i / segments;
        // Pinned at both ends, wildest in the middle.
        const swing = Math.sin(u * Math.PI) * height * cfg.jitter;
        const offset = (shardSeed(index * 31 + i, 17) - 0.5) * 2 * swing;
        points.push({ x: left + width * u, y: midY + offset });
    }
    return points;
}

/** When each bolt strikes and how brightly, staggered across the burst. */
export function nanoBoltSample(elapsedMs, index = 0, cfg = NANO) {
    const period = cfg.durationMs / cfg.boltCount;
    const start = index * period;
    const local = (Number(elapsedMs) || 0) - start;
    if (local < 0 || local > cfg.strikeMs) return { visible: false, alpha: 0 };
    const t = clamp01(local / cfg.strikeMs);
    return {
        visible: true,
        // Snaps bright, then decays — an arc, not a glow.
        alpha: 1 - t * t,
        ringRadius: t,
    };
}

export function nanoSample(elapsedMs, cfg = NANO) {
    const t = clamp01((Number(elapsedMs) || 0) / cfg.durationMs);
    return {
        // Fades out over the last quarter so it does not just stop.
        alpha: 1 - clamp01((t - 0.75) / 0.25),
        done: t >= 1,
    };
}

/**
 * Radar blip for a marked card.
 *
 * The dot never fully disappears — the mark is permanent, so it should read as
 * always-on rather than blinking away. The ring is the ping.
 */
export function blipSample(elapsedMs, cfg = BLIP) {
    const period = cfg.periodMs || BLIP.periodMs;
    const ms = Math.max(0, Number(elapsedMs) || 0);
    const t = ((ms % period) + period) % period / period;

    return {
        // Gentle breathing on the dot itself.
        dotAlpha: cfg.minAlpha + (cfg.maxAlpha - cfg.minAlpha) * (0.5 + 0.5 * Math.sin(t * Math.PI * 2)),
        // Ring expands out of the dot and fades, once per period.
        ringRadius: cfg.dotRadius + (cfg.ringRadius - cfg.dotRadius) * t,
        ringAlpha: (1 - t) * cfg.maxAlpha * 0.7,
    };
}

export function duplicateSample(elapsedMs, cfg = DUPLICATE) {
    const t = clamp01((Number(elapsedMs) || 0) / (cfg.ms || DUPLICATE.ms));
    return {
        radius: 16 + 48 * t,
        alpha: 1 - t,
        scan: t,
        gone: t >= 1,
    };
}

export function lavaVein(rect = {}, elapsedMs, index = 0, cfg = LAVA) {
    const segs = Math.max(2, Number(cfg.segments) || LAVA.segments);
    const pulse = 0.5 + 0.5 * Math.sin(((Number(elapsedMs) || 0) / (cfg.pulseMs || LAVA.pulseMs) + shardSeed(index, 7)) * Math.PI * 2);
    const left = Number(rect.left) || 0;
    const top = Number(rect.top) || 0;
    const width = Number(rect.width) || 0;
    const height = Number(rect.height) || 0;
    const points = [];
    for (let i = 0; i <= segs; i += 1) {
        const u = i / segs;
        const wobble = (shardSeed(index, i) - 0.5) * 0.45 + (pulse - 0.5) * 0.12;
        const x = left + width * clamp01(0.5 + wobble);
        points.push({ x, y: top + height * u });
    }
    return { points, alpha: 0.4 + 0.55 * pulse };
}

export function smashSample(elapsedMs, cfg = SMASH) {
    const t = clamp01((Number(elapsedMs) || 0) / (cfg.ms || SMASH.ms));
    const slamAt = cfg.slamAt ?? SMASH.slamAt;
    const drop = cfg.drop ?? SMASH.drop;
    if (t < slamAt) {
        const u = slamAt <= 0 ? 1 : t / slamAt;
        return { offsetY: -drop * (1 - u), squash: 1, smokeR: 8, gone: false };
    }
    const u = (t - slamAt) / Math.max(0.0001, 1 - slamAt);
    return {
        offsetY: 0,
        squash: 0.7 + 0.3 * u,
        smokeR: 10 + 48 * u,
        gone: t >= 1,
    };
}

export function suppressShot(elapsedMs, index, from = {}, area = {}, cfg = SUPPRESS) {
    const landX = (area.left || 0) + shardSeed(index, 1) * (area.width || 0);
    const landY = (area.top || 0) + shardSeed(index, 2) * (area.height || 0);
    const start = index * (cfg.burstGapMs || SUPPRESS.burstGapMs);
    const local = (Number(elapsedMs) || 0) - start;
    const t = clamp01(local / (cfg.travelMs || SUPPRESS.travelMs));
    const fx = from.x || 0;
    const fy = from.y || 0;
    return {
        x: landX,
        y: landY,
        head: { x: fx + (landX - fx) * t, y: fy + (landY - fy) * t },
        visible: local >= 0 && t < 1,
        done: t >= 1 || local < 0,
    };
}

/**
 * When the staff orb reaches target `index`.
 *
 * The orb's path is [caster, ...targets], so the first hop lands on target 0 —
 * hence the +1. Used to sound each strike as it connects.
 */
export function staffHitMs(index = 0, cfg = STAFF) {
    return (cfg.hopMs || STAFF.hopMs) * ((Math.max(0, Math.floor(index) || 0)) + 1);
}

export function staffHop(elapsedMs, points = [], cfg = STAFF) {
    const hops = Math.max(0, points.length - 1);
    const hopMs = cfg.hopMs || STAFF.hopMs;
    const total = hops * hopMs;
    const ms = Number(elapsedMs) || 0;
    const last = points[points.length - 1] || { x: 0, y: 0 };
    if (hops === 0 || ms >= total) {
        return { x: last.x, y: last.y, trail: last, gone: true };
    }
    const seg = Math.min(hops - 1, Math.floor(ms / hopMs));
    const t = clamp01((ms - seg * hopMs) / hopMs);
    const a = points[seg];
    const b = points[seg + 1];
    const x = a.x + (b.x - a.x) * t;
    const y = a.y + (b.y - a.y) * t;
    const trailT = Math.max(0, t - 0.38);
    return {
        x,
        y,
        trail: {
            x: a.x + (b.x - a.x) * trailT,
            y: a.y + (b.y - a.y) * trailT,
        },
        gone: false,
    };
}

export function tideSample(elapsedMs, from = {}, to = {}, cfg = TIDE) {
    const t = clamp01((Number(elapsedMs) || 0) / (cfg.ms || TIDE.ms));
    return {
        x: (from.x || 0) + ((to.x || 0) - (from.x || 0)) * t,
        y: (from.y || 0) + ((to.y || 0) - (from.y || 0)) * t,
        t,
        gone: t >= 1,
    };
}

/* ---------------------------------------------------------------------------
 * Roadhog.
 * ------------------------------------------------------------------------- */

export function hookTotalMs(cfg = HOOK) {
    return cfg.throwMs + cfg.holdMs + cfg.reelMs;
}

/**
 * Chain Hook: out, bite, back. `reach` is how far along the line the hook is,
 * so the chain can be drawn to match at any moment.
 */
export function hookSample(elapsedMs, cfg = HOOK) {
    const ms = Math.max(0, Number(elapsedMs) || 0);

    if (ms < cfg.throwMs) {
        return { reach: easeInOut(ms / cfg.throwMs), phase: 'throw', done: false };
    }
    if (ms < cfg.throwMs + cfg.holdMs) {
        return { reach: 1, phase: 'hold', done: false };
    }
    const t = clamp01((ms - cfg.throwMs - cfg.holdMs) / cfg.reelMs);
    return { reach: 1 - easeInOut(t), phase: 'reel', done: ms >= hookTotalMs(cfg) };
}

/** Chain links from Roadhog to the hook, sagging in the middle. */
export function chainLinkPoints(from = {}, to = {}, reach = 1, cfg = HOOK) {
    const fx = from.x || 0;
    const fy = from.y || 0;
    const hx = fx + ((to.x || 0) - fx) * clamp01(reach);
    const hy = fy + ((to.y || 0) - fy) * clamp01(reach);
    const dx = hx - fx;
    const dy = hy - fy;
    const len = Math.hypot(dx, dy) || 1;
    // Perpendicular, so the sag is across the chain rather than along it.
    const nx = -dy / len;
    const ny = dx / len;

    const points = [];
    const count = Math.max(2, cfg.links);
    for (let i = 0; i <= count; i += 1) {
        const u = i / count;
        // Slack is greatest mid-chain and vanishes at both ends.
        const droop = Math.sin(u * Math.PI) * cfg.sag * clamp01(reach);
        points.push({ x: fx + dx * u + nx * droop, y: fy + dy * u + ny * droop });
    }
    return points;
}

/**
 * One particle of the Whole Hog spray.
 *
 * `seed` fixes a particle's angle and speed for its whole life, so the stream
 * looks chaotic without individual particles jittering as they travel.
 */
export function hogParticleSample(seed = 0, ageMs = 0, origin = {}, aimAngle = 0, cfg = HOG) {
    const t = clamp01(ageMs / cfg.lifeMs);
    // Fan around whatever direction the spray is aimed, rather than a fixed axis.
    const angle = aimAngle + (shardSeed(seed, 31) - 0.5) * 2 * cfg.spread;
    const speed = cfg.speed * (1 - cfg.speedJitter / 2 + shardSeed(seed, 32) * cfg.speedJitter);
    const distance = speed * (ageMs / 1000);

    return {
        x: (origin.x || 0) + Math.cos(angle) * distance,
        y: (origin.y || 0) + Math.sin(angle) * distance,
        // Chunks tumble as they fly.
        rotation: angle + ageMs * cfg.spinRate * (shardSeed(seed, 33) > 0.5 ? 1 : -1),
        size: cfg.size * (1 - cfg.sizeJitter / 2 + shardSeed(seed, 34) * cfg.sizeJitter) * (1 - t * 0.4),
        // 0 yellow, 1 grey, 2 soot — mixed so the spray reads as debris.
        kind: Math.floor(shardSeed(seed, 35) * 3),
        alpha: (1 - t) * 0.9,
        done: t >= 1,
    };
}

/**
 * The edge of a rect that faces a given direction, plus its outward normal.
 *
 * Picks whichever axis actually separates the two sides, so this works whether
 * the board stacks the halves vertically or sets them side by side.
 */
export function frontEdge(rect = {}, facing = { x: 0, y: -1 }) {
    const hw = (rect.width || 0) / 2;
    const hh = (rect.height || 0) / 2;
    const cx = rect.x || 0;
    const cy = rect.y || 0;

    if (Math.abs(facing.x || 0) >= Math.abs(facing.y || 0)) {
        const sx = Math.sign(facing.x || 1) || 1;
        const x = cx + hw * sx;
        return {
            a: { x, y: cy - hh },
            b: { x, y: cy + hh },
            normal: { x: sx, y: 0 },
            length: hh * 2,
            // Extent along the normal: what a bulge should be measured against,
            // never the long side, or a tall row bows halfway across the board.
            depth: hw * 2,
        };
    }
    const sy = Math.sign(facing.y || 1) || 1;
    const y = cy + hh * sy;
    return {
        a: { x: cx - hw, y },
        b: { x: cx + hw, y },
        normal: { x: 0, y: sy },
        length: hw * 2,
        depth: hh * 2,
    };
}

/**
 * A shallow wall bowing outward along an edge's normal — the barrier sits
 * across the front of what it protects rather than over the top of it.
 */
export function frontBarrierArc(edge, bulge = 0, overhang = 0, segments = BARRIER.segments) {
    const n = Math.max(2, Number(segments) || 2);
    const ax = edge.a.x;
    const ay = edge.a.y;
    const dx = edge.b.x - ax;
    const dy = edge.b.y - ay;
    const points = [];
    for (let i = 0; i <= n; i += 1) {
        // Runs past both ends so it bleeds off the row it covers.
        const u = -overhang + (i / n) * (1 + overhang * 2);
        const bow = Math.sin(clamp01((u + overhang) / (1 + overhang * 2)) * Math.PI) * bulge;
        points.push({
            x: ax + dx * u + edge.normal.x * bow,
            y: ay + dy * u + edge.normal.y * bow,
        });
    }
    return points;
}

/* ---------------------------------------------------------------------------
 * Gravitic Flux and Annihilation.
 * ------------------------------------------------------------------------- */

export function fluxTotalMs(cfg = FLUX) {
    return cfg.liftMs + cfg.hangMs + cfg.slamMs + cfg.settleMs;
}

/** Elapsed ms when the row begins to slam (damage / synergy resolve here). */
export function fluxSlamAtMs(cfg = FLUX) {
    return cfg.liftMs + cfg.hangMs;
}

/**
 * Gravity tether opacity: present through lift+hang, gone once slam starts.
 */
export function fluxBeamAlpha(elapsedMs, cfg = FLUX) {
    const ms = Math.max(0, Number(elapsedMs) || 0);
    const windowMs = fluxSlamAtMs(cfg);
    if (ms >= windowMs) return 0;
    const fade = Math.max(1, Number(cfg.beamFadeInMs) || 1);
    return clamp01(ms / fade);
}

/**
 * Expanding gravity ellipses under a card while tethers are live.
 * `scale` shrinks enemy wells; `phaseOffset` staggers rings across a row.
 */
export function fluxGravityRipples(elapsedMs, opts = {}, cfg = FLUX) {
    const ms = Math.max(0, Number(elapsedMs) || 0);
    if (ms >= fluxSlamAtMs(cfg)) return [];
    const beamA = fluxBeamAlpha(ms, cfg);
    if (beamA <= 0) return [];

    const scale = Number(opts.scale) > 0 ? Number(opts.scale) : 1;
    const phaseOffset = Number(opts.phaseOffset) || 0;
    const rings = Math.max(1, Number(cfg.rippleRings) || 1);
    const cycleMs = Math.max(1, Number(cfg.rippleCycleMs) || 1);
    const maxR = (Number(cfg.rippleRadius) || 40) * scale;
    const peakA = (Number(cfg.rippleAlpha) || 0.7) * beamA;

    const out = [];
    for (let i = 0; i < rings; i += 1) {
        const t = ((ms / cycleMs) + phaseOffset + i / rings) % 1;
        out.push({
            rx: maxR * t,
            ry: maxR * t * 0.55,
            alpha: Math.sin(t * Math.PI) * peakA,
        });
    }
    return out;
}

/**
 * One card caught in the flux: hauled up, held, then dropped hard.
 * `shadow` shrinks as it rises so the height reads on the ground as well.
 */
export function fluxSample(elapsedMs, cardHeight = 90, cfg = FLUX) {
    const ms = Math.max(0, Number(elapsedMs) || 0);
    const peak = cardHeight * cfg.lift;

    if (ms < cfg.liftMs) {
        const e = easeInOut(ms / cfg.liftMs);
        return { phase: 'lift', height: peak * e, slamT: 0, done: false, shadow: 1 - e * (1 - cfg.shadowMin) };
    }
    if (ms < cfg.liftMs + cfg.hangMs) {
        return { phase: 'hang', height: peak, slamT: 0, done: false, shadow: cfg.shadowMin };
    }
    if (ms < cfg.liftMs + cfg.hangMs + cfg.slamMs) {
        // Falls fast: gravity, not a gentle descent.
        const t = clamp01((ms - cfg.liftMs - cfg.hangMs) / cfg.slamMs);
        return {
            phase: 'slam',
            height: peak * (1 - t * t),
            slamT: 0,
            done: false,
            shadow: cfg.shadowMin + (1 - cfg.shadowMin) * t * t,
        };
    }
    const t = clamp01((ms - cfg.liftMs - cfg.hangMs - cfg.slamMs) / cfg.settleMs);
    return { phase: 'settle', height: 0, slamT: t, done: ms >= fluxTotalMs(cfg), shadow: 1 };
}

/** Synergy motes spiralling away from the row after the slam. */
export function synergySwirlSample(index, elapsedMs, origin = {}, cfg = FLUX) {
    const t = clamp01(elapsedMs / cfg.swirlMs);
    if (t >= 1) return { visible: false };
    const base = (index / Math.max(1, cfg.swirlCount)) * Math.PI * 2;
    // Spirals outward and upward as it dissipates.
    const angle = base + t * Math.PI * 1.5;
    const radius = cfg.swirlRadius * t;
    return {
        visible: true,
        x: (origin.x || 0) + Math.cos(angle) * radius,
        y: (origin.y || 0) + Math.sin(angle) * radius * 0.45 - t * 30,
        radius: 4 * (1 - t),
        alpha: (1 - t) * 0.9,
    };
}

/** Annihilation beam: burns in, holds, then gutters out. */
export function annihilateSample(elapsedMs, cfg = ANNIHILATE) {
    const t = clamp01((Number(elapsedMs) || 0) / cfg.durationMs);
    return {
        // Opens fast, holds, then collapses.
        reach: clamp01(t / 0.2),
        width: t < 0.75 ? 1 : 1 - (t - 0.75) / 0.25,
        alpha: t < 0.75 ? 1 : 1 - (t - 0.75) / 0.25,
        done: t >= 1,
    };
}

/** A spark spat off the beam, drifting perpendicular as it dies. */
export function fizzSample(seed, ageMs, a = {}, b = {}, cfg = ANNIHILATE) {
    const t = clamp01(ageMs / cfg.fizzLifeMs);
    if (t >= 1) return { visible: false };
    const u = shardSeed(seed, 41);
    const dx = (b.x || 0) - (a.x || 0);
    const dy = (b.y || 0) - (a.y || 0);
    const len = Math.hypot(dx, dy) || 1;
    const drift = (shardSeed(seed, 42) - 0.5) * 2 * cfg.fizzSpread * t;
    return {
        visible: true,
        x: (a.x || 0) + dx * u + (-dy / len) * drift,
        y: (a.y || 0) + dy * u + (dx / len) * drift,
        radius: cfg.fizzSize * (1 - t),
        alpha: 1 - t,
    };
}

/**
 * A mote sparkling around a protected card.
 *
 * Each keeps its own orbit and phase, so a field twinkles rather than pulsing
 * in unison. Runs forever: the field lasts until the turn ends, so there is no
 * natural end to fade towards.
 */
export function sparkleSample(seed, elapsedMs, rect = {}, cfg = SPARKLE) {
    const period = cfg.periodMs || SPARKLE.periodMs;
    const phase = shardSeed(seed, 51);
    const t = (((Number(elapsedMs) || 0) / period) + phase) % 1;

    const angle = shardSeed(seed, 52) * Math.PI * 2 + t * Math.PI * 2;
    const hw = ((rect.width || 0) / 2) * (1 + cfg.halo);
    const hh = ((rect.height || 0) / 2) * (1 + cfg.halo);

    return {
        x: (rect.x || 0) + Math.cos(angle) * hw,
        y: (rect.y || 0) + Math.sin(angle) * hh,
        // Twinkle: brightest twice per orbit, never fully out.
        alpha: 0.25 + 0.75 * Math.abs(Math.sin(t * Math.PI * 2 + phase * Math.PI)),
        radius: cfg.size * (0.7 + 0.3 * shardSeed(seed, 53)),
    };
}

/* ---------------------------------------------------------------------------
 * Doomfist.
 * ------------------------------------------------------------------------- */

export function punchTotalMs(cfg = PUNCH) {
    return cfg.outMs + cfg.holdMs + cfg.backMs;
}

/** Rocket Punch: the streak snaps out, connects, then withdraws. */
export function punchSample(elapsedMs, cfg = PUNCH) {
    const ms = Math.max(0, Number(elapsedMs) || 0);
    if (ms < cfg.outMs) {
        // Fast on the way out: it is a jab, not a reach.
        const t = clamp01(ms / cfg.outMs);
        return { reach: t * t, tail: 0, alpha: 1, done: false };
    }
    if (ms < cfg.outMs + cfg.holdMs) {
        return { reach: 1, tail: 0, alpha: 1, done: false };
    }
    // The tail catches up to the head, so it retracts rather than fading.
    const t = clamp01((ms - cfg.outMs - cfg.holdMs) / cfg.backMs);
    return { reach: 1, tail: t, alpha: 1 - t * 0.4, done: ms >= punchTotalMs(cfg) };
}

export function meteorTotalMs(cfg = METEOR) {
    return cfg.launchMs + cfg.hangMs + cfg.slamMs + cfg.rippleMs + cfg.returnMs;
}

/**
 * Meteor Strike: Doomfist climbs off the board, drops onto the target, then
 * returns. `progress` is 0..1 between whichever two points the phase spans.
 */
export function meteorSample(elapsedMs, cfg = METEOR) {
    const ms = Math.max(0, Number(elapsedMs) || 0);

    if (ms < cfg.launchMs) {
        const t = easeInOut(ms / cfg.launchMs);
        return { phase: 'launch', progress: t, climb: cfg.climb * t, alpha: 1 - t, rippleT: 0, done: false };
    }
    if (ms < cfg.launchMs + cfg.hangMs) {
        // The shadow gathers on the target while he is out of sight. This is the
        // anticipation that makes the landing read as a landing.
        const hangT = clamp01((ms - cfg.launchMs) / cfg.hangMs);
        return {
            phase: 'hang', progress: 1, climb: cfg.climb, alpha: 0,
            hangT, shadow: 0.35 + 0.45 * hangT, slamT: 0, rippleT: 0, flash: 0, done: false,
        };
    }
    const slamStart = cfg.launchMs + cfg.hangMs;
    if (ms < slamStart + cfg.slamMs) {
        // Accelerating drop from above the target.
        const t = clamp01((ms - slamStart) / cfg.slamMs);
        return {
            phase: 'slam', progress: t * t, climb: cfg.dropFrom * (1 - t * t), alpha: 1,
            hangT: 1, slamT: t,
            // Shadow tightens to full size as he closes on the ground.
            shadow: 0.8 + 0.2 * (t * t),
            rippleT: 0, flash: 0, done: false,
        };
    }
    const rippleStart = slamStart + cfg.slamMs;
    if (ms < rippleStart + cfg.rippleMs) {
        const rippleT = clamp01((ms - rippleStart) / cfg.rippleMs);
        return {
            phase: 'ripple',
            progress: 0,
            climb: 0,
            alpha: 1,
            hangT: 1,
            slamT: 1,
            shadow: 1,
            rippleT,
            // A hard white-out over the first moments of contact only.
            flash: Math.max(0, 1 - (rippleT * cfg.rippleMs) / cfg.flashMs),
            done: false,
        };
    }
    const t = clamp01((ms - rippleStart - cfg.rippleMs) / cfg.returnMs);
    return {
        phase: 'return', progress: easeInOut(t), climb: 0, alpha: 1,
        hangT: 1, slamT: 1, shadow: 0, rippleT: 1, flash: 0,
        done: ms >= meteorTotalMs(cfg),
    };
}

/**
 * Fissures torn out from the crater.
 *
 * Seeded per crack and segment so each one keeps its shape as it lengthens,
 * rather than writhing frame to frame.
 */
export function meteorCracks(t, radius, cfg = METEOR) {
    const reach = clamp01(t) ** 0.6;
    const cracks = [];
    for (let i = 0; i < cfg.cracks; i += 1) {
        const angle = (i / cfg.cracks) * Math.PI * 2 + shardSeed(i, 81) * 0.4;
        const length = radius * (0.7 + shardSeed(i, 82) * 0.9) * reach;
        const points = [];
        for (let seg = 0; seg <= cfg.crackSegments; seg += 1) {
            const f = seg / cfg.crackSegments;
            // Kinks sideways as it travels, so it reads as split ground.
            const kink = (shardSeed(i * 7 + seg, 83) - 0.5) * radius * 0.16 * f;
            points.push({
                x: Math.cos(angle) * length * f - Math.sin(angle) * kink,
                y: Math.sin(angle) * length * f + Math.cos(angle) * kink,
            });
        }
        cracks.push({ points, alpha: Math.max(0, 1 - clamp01(t) * 1.1) });
    }
    return cracks;
}

/** Chunks kicked up by the impact, arcing out and falling back. */
export function meteorDebris(t, radius, cfg = METEOR) {
    const e = clamp01(t);
    const chunks = [];
    for (let i = 0; i < cfg.debris; i += 1) {
        const angle = shardSeed(i, 84) * Math.PI * 2;
        const speed = 0.5 + shardSeed(i, 85) * 1.1;
        const distance = radius * speed * e;
        chunks.push({
            x: Math.cos(angle) * distance,
            // Thrown up, then pulled back down.
            y: Math.sin(angle) * distance * 0.5 - Math.sin(e * Math.PI) * radius * 0.5 * speed,
            size: 2 + shardSeed(i, 86) * 4,
            rotation: e * Math.PI * 4 * (shardSeed(i, 87) > 0.5 ? 1 : -1),
            alpha: Math.max(0, 1 - e * 1.25),
        });
    }
    return chunks;
}

/* ---------------------------------------------------------------------------
 * Lúcio.
 * ------------------------------------------------------------------------- */

/**
 * Soundwave rings breathing off a row holding a Lúcio token.
 *
 * Rings are spread through the cycle so they roll outward one after another
 * instead of pulsing as one, and each fades in and out over its own travel.
 */
export function lucioRings(elapsedMs, cfg = LUCIO_TOKEN) {
    const ms = Math.max(0, Number(elapsedMs) || 0);
    const rings = [];
    for (let i = 0; i < cfg.rings; i += 1) {
        const t = ((ms / cfg.cycleMs) + i / cfg.rings) % 1;
        rings.push({ t, reach: cfg.reach * t, alpha: Math.sin(t * Math.PI) });
    }
    return rings;
}

/** The shuffle token instead chases arcs around the row. */
export function lucioSwirl(elapsedMs, cfg = LUCIO_TOKEN) {
    const ms = Math.max(0, Number(elapsedMs) || 0);
    const arms = [];
    for (let i = 0; i < cfg.swirlArms; i += 1) {
        const spin = (ms / cfg.swirlMs) * Math.PI * 2 + (i / cfg.swirlArms) * Math.PI * 2;
        arms.push({
            start: spin,
            sweep: Math.PI * 0.5,
            alpha: cfg.shuffleAlpha * (0.6 + 0.4 * Math.sin(spin)),
        });
    }
    return arms;
}

export function soundBarrierTotalMs(cfg = SOUND_BARRIER) {
    return cfg.sweepMs * cfg.bounces;
}

/**
 * Sound Barrier: a ripple running the length of the row and bouncing back.
 *
 * Direction flips on each pass and the energy drops, so it cascades up and
 * down and dies out rather than looping forever.
 */
export function soundBarrierSample(elapsedMs, cfg = SOUND_BARRIER) {
    const ms = Math.max(0, Number(elapsedMs) || 0);
    const total = soundBarrierTotalMs(cfg);
    const leg = ms / cfg.sweepMs;
    const bounce = Math.min(cfg.bounces - 1, Math.floor(leg));
    const f = clamp01(leg - bounce);
    // Odd passes run back the way they came.
    const along = bounce % 2 === 0 ? f : 1 - f;
    const energy = 1 - bounce / cfg.bounces;
    return {
        t: clamp01(ms / total),
        along,
        bounce,
        energy,
        // Each bounce comes back weaker than the last.
        alpha: cfg.alpha * energy,
        // The crest is widest at the start of a pass and tightens into the wall.
        depth: cfg.bandDepth * (0.6 + 0.4 * Math.sin(f * Math.PI)),
        done: ms >= total,
    };
}

/** Expanding shockwave rings under the slam. */
export function meteorRipple(index, t, radius, cfg = METEOR) {
    // Rings set off in sequence, so the wave reads as spreading.
    const local = clamp01((t - index * 0.14) / (1 - index * 0.14 || 1));
    return { radius: radius * (0.2 + 1.6 * local), alpha: (1 - local) * 0.8, visible: local > 0 };
}

/** Synth Rifle: a thin red shot that snaps out and fades. */
export function rifleSample(elapsedMs, cfg = RIFLE) {
    const t = clamp01((Number(elapsedMs) || 0) / cfg.beamMs);
    return {
        // Arrives almost instantly, then thins away.
        reach: clamp01(t / 0.25),
        width: 1 - clamp01((t - 0.4) / 0.6),
        alpha: 1 - clamp01((t - 0.3) / 0.7),
        done: t >= 1,
    };
}

/* ---------------------------------------------------------------------------
 * Pharah and Genji.
 * ------------------------------------------------------------------------- */

export function concussiveTotalMs(cfg = CONCUSSIVE) {
    return cfg.travelMs + cfg.expandMs;
}

/** Concussive Blast: the ring flies short of the target, then shoves outward. */
export function concussiveSample(elapsedMs, cfg = CONCUSSIVE) {
    const ms = Math.max(0, Number(elapsedMs) || 0);
    if (ms < cfg.travelMs) {
        const t = easeInOut(ms / cfg.travelMs);
        return {
            flying: true,
            // Stops short: the blast lands in front and pushes from there.
            reach: cfg.standoff * t,
            radius: cfg.startRadius,
            alpha: 1,
            done: false,
        };
    }
    const t = clamp01((ms - cfg.travelMs) / cfg.expandMs);
    return {
        flying: false,
        reach: cfg.standoff,
        radius: cfg.startRadius + (cfg.endRadius - cfg.startRadius) * t,
        alpha: 1 - t,
        done: ms >= concussiveTotalMs(cfg),
    };
}

/** When a given rocket of the barrage actually lands. */
export function barrageImpactMs(index, cfg = BARRAGE) {
    return cfg.liftMs + cfg.lockMs + index * cfg.staggerMs + cfg.rocketMs;
}

export function barrageTotalMs(count = 1, cfg = BARRAGE) {
    return barrageImpactMs(Math.max(0, count - 1), cfg) + cfg.burstMs + cfg.returnMs;
}

/** Pharah's own arc: up off the board, hold while firing, then back down. */
export function barrageLiftSample(elapsedMs, count = 1, cfg = BARRAGE) {
    const ms = Math.max(0, Number(elapsedMs) || 0);
    const lastImpact = barrageImpactMs(Math.max(0, count - 1), cfg) + cfg.burstMs;
    if (ms < cfg.liftMs) {
        return { lift: cfg.lift * easeInOut(ms / cfg.liftMs), done: false };
    }
    if (ms < lastImpact) return { lift: cfg.lift, done: false };
    const t = clamp01((ms - lastImpact) / cfg.returnMs);
    return { lift: cfg.lift * (1 - easeInOut(t)), done: t >= 1 };
}

/**
 * One rocket of the barrage: lock-on reticle, flight, smoke, then impact.
 * Damage is meant to land with `phase === 'burst'`, not when it is fired.
 */
export function barrageRocketSample(elapsedMs, index = 0, cfg = BARRAGE) {
    const ms = Math.max(0, Number(elapsedMs) || 0);
    const lockStart = cfg.liftMs;
    const fireStart = lockStart + cfg.lockMs + index * cfg.staggerMs;

    if (ms < lockStart) return { phase: 'wait', lockT: 0, reach: 0, burstT: 0, done: false };
    if (ms < fireStart) {
        return {
            phase: 'lock',
            lockT: clamp01((ms - lockStart) / cfg.lockMs),
            reach: 0,
            burstT: 0,
            done: false,
        };
    }
    const flight = ms - fireStart;
    if (flight < cfg.rocketMs) {
        const t = clamp01(flight / cfg.rocketMs);
        return { phase: 'fly', lockT: 1, reach: t * t, burstT: 0, done: false };
    }
    const burstT = clamp01((flight - cfg.rocketMs) / cfg.burstMs);
    return { phase: 'burst', lockT: 1, reach: 1, burstT, done: burstT >= 1 };
}

/**
 * Shuriken bouncing down a column: `index` is which hop, `t` its progress.
 * Returns the arc height so it visibly bounces between targets.
 */
export function shurikenSample(elapsedMs, hops = 1, cfg = SHURIKEN) {
    const ms = Math.max(0, Number(elapsedMs) || 0);
    const total = Math.max(1, hops) * cfg.hopMs;
    const index = Math.min(hops - 1, Math.floor(ms / cfg.hopMs));
    const t = clamp01((ms - index * cfg.hopMs) / cfg.hopMs);
    return {
        index,
        t,
        // Peaks mid-hop and lands flat on each target.
        hop: Math.sin(t * Math.PI) * cfg.hop,
        rotation: ms * cfg.spinRate,
        done: ms >= total,
    };
}

/** Dragon Blade: wind up, cut through, then let the trail fade. */
export function sliceSample(elapsedMs, cfg = SLICE) {
    const ms = Math.max(0, Number(elapsedMs) || 0);
    if (ms < cfg.windupMs) {
        return { phase: 'windup', cut: 0, alpha: clamp01(ms / cfg.windupMs) * 0.5, done: false };
    }
    if (ms < cfg.windupMs + cfg.cutMs) {
        // The cut itself is fast — that is what makes it read as a slice.
        return { phase: 'cut', cut: clamp01((ms - cfg.windupMs) / cfg.cutMs), alpha: 1, done: false };
    }
    const t = clamp01((ms - cfg.windupMs - cfg.cutMs) / cfg.fadeMs);
    return { phase: 'fade', cut: 1, alpha: 1 - t, done: t >= 1 };
}

/* ---------------------------------------------------------------------------
 * Orisa, Widowmaker and Reinhardt.
 * ------------------------------------------------------------------------- */

/**
 * Supercharger: an undulating line across a card.
 * Pinned at both ends so it reads as attached to the hero, not floating over it.
 */
export function superchargeWave(rect = {}, elapsedMs = 0, cfg = SUPERCHARGE) {
    const n = Math.max(2, cfg.segments);
    const width = rect.width || 0;
    const amplitude = (rect.height || 0) * cfg.amplitude;
    const left = (rect.x || 0) - width / 2;
    const phase = (Number(elapsedMs) || 0) * cfg.speed;

    const points = [];
    for (let i = 0; i <= n; i += 1) {
        const u = i / n;
        // Envelope: no wobble at the ends, most in the middle.
        const envelope = Math.sin(u * Math.PI);
        points.push({
            x: left + width * u,
            y: (rect.y || 0) + Math.sin(u * Math.PI * 2 * cfg.waves - phase) * amplitude * envelope,
        });
    }
    return points;
}

/**
 * Infra-Sight sheen: a band that crosses the row, then rests.
 * `active` is false for most of the period, which is what keeps it periodic
 * rather than a constant wash.
 */
export function infraSheenSample(elapsedMs, cfg = INFRA) {
    const period = cfg.periodMs || INFRA.periodMs;
    const t = (((Number(elapsedMs) || 0) % period) + period) % period / period;
    if (t > cfg.sweepFraction) return { active: false, u: 0, alpha: 0 };

    const u = t / cfg.sweepFraction;
    return {
        active: true,
        u,
        // Fades in and back out across the crossing.
        alpha: Math.sin(u * Math.PI) * cfg.peakAlpha,
    };
}

export function creviceTotalMs(cfg = CREVICE) {
    return cfg.openMs + cfg.holdMs + cfg.closeMs;
}

/** Earthshatter: the ground splits, holds, then grinds shut. */
export function creviceSample(elapsedMs, cfg = CREVICE) {
    const ms = Math.max(0, Number(elapsedMs) || 0);
    if (ms < cfg.openMs) {
        // Tears open fast — it is a slam, not a fissure creeping along.
        const t = clamp01(ms / cfg.openMs);
        return { open: t * t, alpha: 1, done: false };
    }
    if (ms < cfg.openMs + cfg.holdMs) {
        return { open: 1, alpha: 1, done: false };
    }
    const t = clamp01((ms - cfg.openMs - cfg.holdMs) / cfg.closeMs);
    return { open: 1 - t, alpha: 1 - t, done: ms >= creviceTotalMs(cfg) };
}

/**
 * The crack itself: a ragged wedge from `a` to `b`, widest in the middle.
 * Returns one closed polygon, so it can be filled as a hole in the board.
 */
export function creviceWedge(a = {}, b = {}, open = 1, cfg = CREVICE) {
    const n = Math.max(2, cfg.segments);
    const ax = a.x || 0;
    const ay = a.y || 0;
    const dx = (b.x || 0) - ax;
    const dy = (b.y || 0) - ay;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;

    const side = (sign) => {
        const pts = [];
        for (let i = 0; i <= n; i += 1) {
            const u = i / n;
            const taper = Math.sin(u * Math.PI);
            const jag = 1 + (shardSeed(i, sign > 0 ? 61 : 62) - 0.5) * 2 * cfg.jag;
            const w = (cfg.maxWidth / 2) * taper * jag * clamp01(open);
            pts.push({ x: ax + dx * u + nx * w * sign, y: ay + dy * u + ny * w * sign });
        }
        return pts;
    };

    // Down one edge and back along the other.
    return [...side(1), ...side(-1).reverse()];
}

/** Blood splatter: fixed where it landed, holding before it fades. */
export function bloodSpraySample(elapsedMs, cfg = SPRAY) {
    const t = clamp01((Number(elapsedMs) || 0) / cfg.lifeMs);
    return {
        // Splashes outward almost instantly, then simply sits there.
        spread: clamp01(t / 0.08),
        alpha: t <= cfg.holdFraction ? 1 : 1 - (t - cfg.holdFraction) / (1 - cfg.holdFraction),
        done: t >= 1,
    };
}

/** Where each drop of a splatter lands. Stable, so it does not crawl. */
export function bloodSprayDrops(rect = {}, cfg = SPRAY) {
    const drops = [];
    for (let i = 0; i < cfg.drops; i += 1) {
        const angle = shardSeed(i, 63) * Math.PI * 2;
        const distance = cfg.spread * Math.sqrt(shardSeed(i, 64));
        drops.push({
            dx: Math.cos(angle) * distance,
            dy: Math.sin(angle) * distance * 0.7,
            radius: cfg.maxRadius * (0.25 + 0.75 * shardSeed(i, 65)),
        });
    }
    return drops;
}

/* ---------------------------------------------------------------------------
 * Zenyatta.
 * ------------------------------------------------------------------------- */

/** Where an orb rests above the card holding it. */
export function orbRestPoint(rect = {}, elapsedMs = 0, cfg = ORB_TOKEN) {
    const bob = Math.sin(((Number(elapsedMs) || 0) / cfg.bobMs) * Math.PI * 2) * cfg.bob;
    return {
        x: rect.x || 0,
        y: (rect.y || 0) - (rect.height || 0) * cfg.hover + bob,
        rotation: (Number(elapsedMs) || 0) * cfg.spinRate,
    };
}

/**
 * The zoom between holders. Returns 1 once the jump is over, so a settled orb
 * simply sits on its rest point.
 */
export function orbJumpSample(elapsedMs, cfg = ORB_TOKEN) {
    const t = clamp01((Number(elapsedMs) || 0) / cfg.jumpMs);
    return {
        t: easeInOut(t),
        // Lifts off between the two cards so the jump is legible.
        arc: Math.sin(t * Math.PI) * cfg.jumpArc,
        // Squashes slightly at speed, which reads as urgency.
        scale: 1 + Math.sin(t * Math.PI) * 0.25,
        done: t >= 1,
    };
}

/**
 * Transcendence: a radiant burst, then a steady golden glow.
 * `burst` runs once; `glow` continues for as long as the effect is drawn.
 */
export function transcendSample(elapsedMs, cfg = TRANSCEND) {
    const ms = Math.max(0, Number(elapsedMs) || 0);
    const burstT = clamp01(ms / cfg.burstMs);
    const wave = 0.5 + 0.5 * Math.sin((ms / cfg.glowPeriodMs) * Math.PI * 2);

    return {
        bursting: burstT < 1,
        burstT,
        // Rays shoot out and fade; the glow underneath persists.
        rayLength: cfg.rayLength * burstT,
        rayAlpha: Math.sin(burstT * Math.PI),
        glow: cfg.glowMin + (cfg.glowMax - cfg.glowMin) * wave,
    };
}

/** Evenly spaced rays, turning slowly so the halo is not static. */
export function transcendRays(elapsedMs, count = TRANSCEND.rays) {
    const n = Math.max(0, Number(count) || 0);
    const spin = (Number(elapsedMs) || 0) * 0.0004;
    const out = [];
    for (let i = 0; i < n; i += 1) {
        // Alternating lengths give the classic radiant-burst silhouette.
        out.push({ angle: (i / n) * Math.PI * 2 + spin, scale: i % 2 === 0 ? 1 : 0.6 });
    }
    return out;
}

/* ---------------------------------------------------------------------------
 * D.Va, Winston and Venture.
 * ------------------------------------------------------------------------- */

export function matrixTotalMs(cfg = MATRIX) {
    return cfg.deployMs + cfg.holdMs + cfg.fadeMs;
}

/** Defense Matrix: panels slide out, hold, then fold away. */
export function matrixSample(elapsedMs, cfg = MATRIX) {
    const ms = Math.max(0, Number(elapsedMs) || 0);
    if (ms < cfg.deployMs) {
        return { deploy: easeInOut(ms / cfg.deployMs), alpha: 1, done: false };
    }
    if (ms < cfg.deployMs + cfg.holdMs) return { deploy: 1, alpha: 1, done: false };
    const t = clamp01((ms - cfg.deployMs - cfg.holdMs) / cfg.fadeMs);
    return { deploy: 1, alpha: 1 - t, done: ms >= matrixTotalMs(cfg) };
}

/**
 * Where each panel sits. They stagger outward, so the array reads as one
 * unfolding screen rather than three squares appearing at once.
 */
export function matrixPanels(rect = {}, deploy = 1, facing = { x: 1, y: 0 }, cfg = MATRIX) {
    const width = rect.width || 0;
    const panels = [];
    for (let i = 0; i < cfg.panels; i += 1) {
        // Outer panels lag behind the inner ones on the way out.
        const stagger = clamp01((deploy - i * 0.15) / (1 - (cfg.panels - 1) * 0.15));
        const distance = width * cfg.reach * ((i + 1) / cfg.panels) * stagger;
        panels.push({
            x: (rect.x || 0) + (facing.x || 0) * distance,
            y: (rect.y || 0) + (facing.y || 0) * distance,
            size: width * cfg.size * (1 - i * 0.12),
            alpha: stagger,
        });
    }
    return panels;
}

/** Winston's bubble: steady, with a slow shimmer so it is not flat. */
export function bubbleSample(elapsedMs, cfg = BUBBLE) {
    const wave = 0.5 + 0.5 * Math.sin(((Number(elapsedMs) || 0) / cfg.shimmerMs) * Math.PI * 2);
    return {
        coreAlpha: cfg.coreAlpha,
        rimAlpha: cfg.rimAlpha * (0.75 + 0.25 * wave),
        // Breathes very slightly; a fixed circle reads as a UI element.
        scale: 1 + 0.02 * wave,
    };
}

export function primalTotalMs(cfg = PRIMAL) {
    return cfg.growMs + cfg.pounds * cfg.poundMs + cfg.settleMs;
}

/** Primal Rage: swell up, hammer the row, then settle back. */
export function primalSample(elapsedMs, cfg = PRIMAL) {
    const ms = Math.max(0, Number(elapsedMs) || 0);
    if (ms < cfg.growMs) {
        const t = easeInOut(ms / cfg.growMs);
        return { phase: 'grow', scale: 1 + (cfg.scale - 1) * t, pound: 0, poundT: 0, poundIndex: -1, done: false };
    }
    const poundEnd = cfg.growMs + cfg.pounds * cfg.poundMs;
    if (ms < poundEnd) {
        const local = ms - cfg.growMs;
        const index = Math.floor(local / cfg.poundMs);
        const t = (local % cfg.poundMs) / cfg.poundMs;
        return {
            phase: 'pound',
            scale: cfg.scale,
            // Each pound slams down and rebounds.
            pound: Math.sin(t * Math.PI),
            // Progress through this one pound, 0..1. The shockwave ages on this,
            // not on `pound` — a flash driven by the rebound is born at the peak
            // and already faded at both ends, so it can never be seen.
            poundT: t,
            poundIndex: index,
            done: false,
        };
    }
    const t = clamp01((ms - poundEnd) / cfg.settleMs);
    return { phase: 'settle', scale: cfg.scale - (cfg.scale - 1) * t, pound: 0, poundT: 0, poundIndex: -1, done: ms >= primalTotalMs(cfg) };
}

export function burrowTotalMs(cfg = BURROW) {
    return cfg.travelMs + cfg.eruptMs;
}

/** Drill Dash: a mound races underground, then bursts up at the target. */
export function burrowSample(elapsedMs, cfg = BURROW) {
    const ms = Math.max(0, Number(elapsedMs) || 0);
    if (ms < cfg.travelMs) {
        return { digging: true, reach: easeInOut(ms / cfg.travelMs), eruptT: 0, done: false };
    }
    return {
        digging: false,
        reach: 1,
        eruptT: clamp01((ms - cfg.travelMs) / cfg.eruptMs),
        done: ms >= burrowTotalMs(cfg),
    };
}

/** Mounds of thrown earth left along the tunnel behind the drill head. */
export function burrowMounds(from = {}, to = {}, reach = 0, cfg = BURROW) {
    const fx = from.x || 0;
    const fy = from.y || 0;
    const dx = (to.x || 0) - fx;
    const dy = (to.y || 0) - fy;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;

    const mounds = [];
    for (let i = 0; i < cfg.mounds; i += 1) {
        const u = (i + 1) / cfg.mounds;
        if (u > reach) break;
        const offset = (shardSeed(i, 71) - 0.5) * 2 * cfg.scatter;
        // Freshest mounds sit nearest the head, so the trail settles behind it.
        const age = clamp01((reach - u) / Math.max(0.001, reach));
        mounds.push({
            x: fx + dx * u + nx * offset,
            y: fy + dy * u + ny * offset,
            size: cfg.moundSize * (0.6 + 0.4 * shardSeed(i, 72)) * (1 - age * 0.35),
            alpha: 1 - age * 0.5,
        });
    }
    return mounds;
}

/** Tectonic Shock: a card is shaken hard and tumbled end over end. */
export function tectonicSample(elapsedMs, seed = 0, cfg = TECTONIC) {
    const t = clamp01((Number(elapsedMs) || 0) / cfg.durationMs);
    // Violent at first, settling as it ends.
    const decay = 1 - t;
    const phase = shardSeed(seed, 73) * Math.PI * 2;
    return {
        offsetX: Math.sin((Number(elapsedMs) || 0) * 0.001 * cfg.shakeHz + phase) * cfg.shake * decay,
        offsetY: Math.cos((Number(elapsedMs) || 0) * 0.001 * cfg.shakeHz * 1.3 + phase) * cfg.shake * decay,
        rotation: t * Math.PI * 2 * cfg.flips * (shardSeed(seed, 74) > 0.5 ? 1 : -1),
        alpha: 1,
        done: t >= 1,
    };
}

/* ---------------------------------------------------------------------------
 * Rajah's Sandstorm.
 *
 * Continuous for as long as the storm is up, so all of this is driven from a
 * single running clock with no start or end state — the layer simply stops
 * drawing when the storm clears.
 * ------------------------------------------------------------------------- */

/** The haze over everything, breathing slowly. */
export function sandstormHaze(elapsedMs, cfg = SANDSTORM) {
    const wave = Math.sin((Math.max(0, Number(elapsedMs) || 0) / cfg.hazeBreatheMs) * Math.PI * 2);
    return { alpha: cfg.hazeAlpha * (0.75 + 0.25 * wave) };
}

/**
 * Grains drifting across the board.
 *
 * Lane, size and speed are seeded per grain so the field holds together frame
 * to frame, and each one fades in and out at the edges rather than popping as
 * it wraps around.
 */
export function sandstormMotes(elapsedMs, rect = {}, cfg = SANDSTORM) {
    const ms = Math.max(0, Number(elapsedMs) || 0);
    const left = rect.left || 0;
    const top = rect.top || 0;
    const width = rect.width || 0;
    const height = rect.height || 0;
    const motes = [];
    for (let i = 0; i < cfg.motes; i += 1) {
        const speed = 0.7 + shardSeed(i, 53) * 0.6;
        const f = (shardSeed(i, 51) + (ms / cfg.driftMs) * speed) % 1;
        const fade = Math.min(1, f / cfg.moteFade, (1 - f) / cfg.moteFade);
        motes.push({
            x: left + width * f,
            // Drifts along its lane with a slight bob, so it is not a straight line.
            y: top + height * shardSeed(i, 52) + Math.sin(ms * 0.001 + i) * 6,
            radius: cfg.moteRadius * (0.6 + shardSeed(i, 54) * 0.8),
            alpha: cfg.moteAlpha * fade * (0.5 + shardSeed(i, 55) * 0.5),
        });
    }
    return motes;
}

/** Long, faint wisps riding over the grains. */
export function sandstormGusts(elapsedMs, rect = {}, cfg = SANDSTORM) {
    const ms = Math.max(0, Number(elapsedMs) || 0);
    const left = rect.left || 0;
    const top = rect.top || 0;
    const width = rect.width || 0;
    const height = rect.height || 0;
    const gusts = [];
    for (let i = 0; i < cfg.gusts; i += 1) {
        const f = (shardSeed(i, 61) + ms / cfg.gustMs) % 1;
        const fade = Math.min(1, f / cfg.moteFade, (1 - f) / cfg.moteFade);
        const length = cfg.gustLength * (0.6 + shardSeed(i, 63) * 0.8);
        const x = left + width * f;
        const y = top + height * shardSeed(i, 62) + Math.sin(ms * 0.0006 + i * 2) * 14;
        gusts.push({
            x,
            y,
            // Trails back the way it came.
            tailX: x - length,
            tailY: y + length * 0.12,
            alpha: cfg.gustAlpha * fade,
        });
    }
    return gusts;
}

/* ---------------------------------------------------------------------------
 * Guardian Tide.
 *
 * `tideSample` gives the crest's travel; `tideCrest` gives its shape. A wave
 * needs both — the first pass had only the travel and drew a thin sliver, which
 * read as a smear rather than water.
 * ------------------------------------------------------------------------- */

/**
 * The crest line, bowed forward at its middle.
 *
 * `span` is how wide the wave is; `forward` points the way it travels, and the
 * crest is laid out along that vector's normal.
 */
export function tideCrest(centre = {}, forward = {}, span = 0, cfg = TIDE) {
    const n = Math.max(2, Math.floor(cfg.crestPoints));
    const nx = -(forward.y || 0);
    const ny = forward.x || 0;
    const half = span / 2;
    const points = [];
    for (let i = 0; i < n; i += 1) {
        const f = i / (n - 1);
        const along = (f - 0.5) * 2;
        // Bows most at the middle and flattens to nothing at the ends.
        const bow = Math.cos(along * Math.PI * 0.5) * cfg.bow;
        points.push({
            x: (centre.x || 0) + nx * half * along + (forward.x || 0) * bow,
            y: (centre.y || 0) + ny * half * along + (forward.y || 0) * bow,
            f,
        });
    }
    return points;
}

/** Foam caps riding the crest, and droplets thrown out ahead of it. */
export function tideFoam(elapsedMs, cfg = TIDE) {
    const ms = Math.max(0, Number(elapsedMs) || 0);
    const caps = [];
    for (let i = 0; i < cfg.caps; i += 1) {
        caps.push({
            f: (i + 0.5) / cfg.caps,
            radius: 5 + shardSeed(i, 21) * 9,
            // Caps bob rather than sitting still on the crest line.
            lift: Math.sin(ms * 0.006 + i) * 5,
            alpha: 0.5 + shardSeed(i, 22) * 0.4,
        });
    }
    const spray = [];
    for (let i = 0; i < cfg.spray; i += 1) {
        spray.push({
            f: shardSeed(i, 23),
            ahead: 10 + shardSeed(i, 24) * 46,
            side: (shardSeed(i, 25) - 0.5) * 46,
            radius: 1.5 + shardSeed(i, 26) * 2.5,
            alpha: 0.35 + shardSeed(i, 27) * 0.5,
        });
    }
    return { caps, spray };
}

/* ---------------------------------------------------------------------------
 * Mauga.
 * ------------------------------------------------------------------------- */

/**
 * Bars across a caged row, with a glow travelling along them.
 *
 * The cage stands until Mauga dies, so this loops rather than ending: the
 * shimmer is a cycle, and nothing here fades out.
 */
export function cageBars(rect = {}, elapsedMs = 0, cfg = CAGE) {
    const ms = Math.max(0, Number(elapsedMs) || 0);
    const left = rect.left || 0;
    const top = rect.top || 0;
    const width = rect.width || 0;
    const height = rect.height || 0;
    // Bars run across the row's short side, so they read as a cage either way.
    const vertical = height >= width;
    const span = vertical ? height : width;
    const bars = [];
    for (let i = 0; i < cfg.bars; i += 1) {
        const f = (i + 0.5) / cfg.bars;
        // The glow sweeps along the bars and wraps.
        const wave = ((ms / cfg.shimmerMs) + f) % 1;
        bars.push({
            f,
            a: vertical
                ? { x: left, y: top + span * f }
                : { x: left + span * f, y: top },
            b: vertical
                ? { x: left + width, y: top + span * f }
                : { x: left + span * f, y: top + height },
            glow: Math.sin(wave * Math.PI * 2) * 0.5 + 0.5,
        });
    }
    return { bars, vertical };
}

/** Berserker: a red pulse as Mauga takes on more health. */
export function berserkSample(elapsedMs, cfg = BERSERK) {
    const t = clamp01((Number(elapsedMs) || 0) / cfg.ms);
    const rings = [];
    for (let i = 0; i < cfg.rings; i += 1) {
        // Rings set off one after another, so it beats rather than flashes.
        const local = clamp01((t - i * 0.22) / (1 - i * 0.22 || 1));
        rings.push({
            reach: cfg.reach * (0.3 + 0.9 * local),
            alpha: local > 0 ? (1 - local) * cfg.alpha : 0,
        });
    }
    const spikes = [];
    for (let i = 0; i < cfg.spikes; i += 1) {
        spikes.push({
            angle: (i / cfg.spikes) * Math.PI * 2,
            inner: cfg.reach * 0.45,
            outer: cfg.reach * (0.6 + 0.5 * t),
        });
    }
    return {
        t,
        rings,
        spikes,
        // A hard flare on the card itself, gone before the rings are.
        glow: Math.max(0, 1 - t * 1.8) * cfg.alpha,
        spikeAlpha: Math.max(0, 1 - t * 1.3) * cfg.alpha,
        done: t >= 1,
    };
}

/** When Mauga reaches the hero at `index`; they are worked through one by one. */
export function maugaSmashMs(index = 0, cfg = MAUGA_SMASH) {
    return Math.max(0, Math.floor(index) || 0) * cfg.staggerMs;
}

export function maugaSmashTotalMs(count = 1, cfg = MAUGA_SMASH) {
    return maugaSmashMs(Math.max(0, count - 1), cfg) + cfg.ms;
}

/**
 * When the slam on `index` actually connects.
 *
 * He is still closing for the first 40% of the swing, so the hit sound and the
 * damage both land here rather than when the lunge starts.
 */
export function maugaContactMs(index = 0, cfg = MAUGA_SMASH) {
    return maugaSmashMs(index, cfg) + cfg.ms * 0.4;
}

/**
 * One slam: he lunges in, connects, and the impact spreads.
 *
 * This is published for every hero in the cage, including those the damage
 * formula leaves untouched — he still hits them.
 */
export function maugaSmashSample(elapsedMs, cfg = MAUGA_SMASH) {
    const t = clamp01((Number(elapsedMs) || 0) / cfg.ms);
    // Closes fast over the first stretch, then the impact plays out.
    const closing = clamp01(t / 0.4);
    const impact = clamp01((t - 0.4) / 0.6);
    return {
        t,
        closing: easeInOut(closing),
        connected: t >= 0.4,
        impactT: impact,
        reach: cfg.reach * (0.15 + 1.5 * impact),
        impactAlpha: t >= 0.4 ? 1 - impact * impact : 0,
        shardDistance: cfg.reach * (0.2 + 1.8 * impact),
        shardAlpha: t >= 0.4 ? Math.max(0, 1 - impact * 1.35) : 0,
        // The lunge streak fades once he has landed it.
        lungeAlpha: t < 0.4 ? closing : Math.max(0, 1 - impact * 2.2),
        done: t >= 1,
    };
}

/* ---------------------------------------------------------------------------
 * Mercy.
 * ------------------------------------------------------------------------- */

/**
 * Light settling onto a card.
 *
 * Colour is the layer's business; the shape is shared, so healing and the
 * damage boost read as one mechanic with two moods.
 */
export function bestowSample(elapsedMs, cfg = BESTOW) {
    const t = clamp01((Number(elapsedMs) || 0) / cfg.ms);
    // Comes down fast, settles, then fades from the top.
    const descend = easeInOut(clamp01(t / 0.45));
    return {
        t,
        descend,
        // The column shortens onto the card as the light lands.
        columnHeight: cfg.column * (1 - descend * 0.65),
        columnAlpha: cfg.alpha * (t < 0.45 ? descend : Math.max(0, 1 - (t - 0.45) / 0.55)),
        // The ring blooms once the light has arrived.
        ringReach: cfg.ringReach * easeInOut(clamp01((t - 0.35) / 0.65)),
        ringAlpha: t > 0.35 ? Math.max(0, 1 - (t - 0.35) / 0.65) : 0,
        glow: Math.sin(clamp01(t / 0.7) * Math.PI) * cfg.alpha,
        done: t >= 1,
    };
}

/** Motes drifting up the column of light. */
export function bestowMotes(elapsedMs, size = 0, cfg = BESTOW) {
    const ms = Math.max(0, Number(elapsedMs) || 0);
    const t = clamp01(ms / cfg.ms);
    const motes = [];
    for (let i = 0; i < cfg.motes; i += 1) {
        // Each mote runs its own loop up the column.
        const f = (shardSeed(i, 101) + (ms / cfg.ms) * (0.7 + shardSeed(i, 102) * 0.6)) % 1;
        motes.push({
            x: (shardSeed(i, 103) - 0.5) * size * cfg.columnWidth,
            y: -f * size * cfg.moteRise,
            radius: 1.5 + shardSeed(i, 104) * 2,
            // Fades at both ends of its run, and with the effect as a whole.
            alpha: cfg.alpha * Math.sin(f * Math.PI) * (1 - t * 0.6),
        });
    }
    return motes;
}

/**
 * The ambient light around Mercy while a resurrection is being chosen.
 *
 * Loops: this is held open until the hero lands, so it has no end state.
 */
export function rezAuraSample(elapsedMs, cfg = REZ) {
    const ms = Math.max(0, Number(elapsedMs) || 0);
    const breath = Math.sin((ms / cfg.auraMs) * Math.PI * 2);
    return {
        reach: cfg.auraReach * (1 + 0.08 * breath),
        alpha: cfg.auraAlpha * (0.75 + 0.25 * breath),
        spin: (ms / cfg.raySpinMs) * Math.PI * 2,
    };
}

/** Rays turning inside the aura. */
export function rezAuraRays(spin, cfg = REZ) {
    const rays = [];
    for (let i = 0; i < cfg.rays; i += 1) {
        rays.push({
            angle: spin + (i / cfg.rays) * Math.PI * 2,
            // Alternating lengths keep it from reading as a clean wheel.
            scale: 0.7 + shardSeed(i, 105) * 0.5,
        });
    }
    return rays;
}

/** The slow wash of light over the hero who came back. */
export function rezFlashSample(elapsedMs, cfg = REZ) {
    const t = clamp01((Number(elapsedMs) || 0) / cfg.flashMs);
    return {
        t,
        // Swells and clears rather than snapping: they are easing back in.
        alpha: Math.sin(t * Math.PI) ** 0.7,
        // A band of light sweeping down the card.
        sweep: t,
        done: t >= 1,
    };
}

/** Wings over Mercy and the hero she brought back. */
export function wingsSample(elapsedMs, cfg = REZ) {
    const ms = Math.max(0, Number(elapsedMs) || 0);
    const t = clamp01(ms / cfg.wingsMs);
    // In over the first fifth, held, then out over the last third.
    const fadeIn = clamp01(t / 0.2);
    const fadeOut = 1 - clamp01((t - 0.67) / 0.33);
    return {
        t,
        alpha: Math.min(fadeIn, fadeOut),
        scale: cfg.wingsScale * (0.85 + 0.15 * fadeIn),
        // A slow beat, so they are not a static decal.
        lift: Math.sin((ms / cfg.wingsBobMs) * Math.PI * 2) * 4,
        done: t >= 1,
    };
}

/**
 * A puff of smoke over a card: billows out, rises and thins.
 *
 * Offsets are seeded per puff so the cloud holds its shape, and two cards
 * puffed at the same moment read as one event rather than two.
 */
export function smokePuffs(elapsedMs, size = 0, cfg = SMOKE) {
    const t = clamp01((Number(elapsedMs) || 0) / cfg.ms);
    const grow = t ** 0.55;
    const puffs = [];
    for (let i = 0; i < cfg.puffs; i += 1) {
        const angle = shardSeed(i, 91) * Math.PI * 2;
        const spread = 0.35 + shardSeed(i, 92) * 0.65;
        puffs.push({
            x: Math.cos(angle) * size * cfg.reach * spread * grow,
            y: Math.sin(angle) * size * cfg.reach * spread * grow * 0.7
                - size * cfg.rise * t,
            radius: size * cfg.puffRadius * (0.5 + shardSeed(i, 93) * 0.8) * (0.6 + grow),
            // Each puff thins on its own schedule, so the cloud frays.
            alpha: cfg.alpha * Math.max(0, 1 - t * (1.1 + shardSeed(i, 94) * 0.5)),
        });
    }
    return { t, puffs, done: t >= 1 };
}

/* ---------------------------------------------------------------------------
 * Zarya.
 * ------------------------------------------------------------------------- */

/** Projected Barrier: the orb crackles, snapping bright and dark as it fades. */
export function zaryaOrbSample(elapsedMs, cfg = ZARYA_ORB) {
    const ms = Math.max(0, Number(elapsedMs) || 0);
    const t = clamp01(ms / cfg.ms);
    const flash = 0.55 + 0.45 * Math.abs(Math.sin((ms / 1000) * Math.PI * cfg.flashHz));
    return {
        t,
        flash,
        // Holds strong, then drops away over the last stretch.
        alpha: (1 - t * t) * flash,
        // Breathes slightly rather than sitting at a fixed size.
        scale: 1 + Math.sin(ms * 0.009) * 0.05,
        done: t >= 1,
    };
}

/**
 * One kinked arc around the orb's rim.
 *
 * Offsets are seeded from a step counter rather than raw time, so the arcs snap
 * to new shapes at `flashHz` instead of crawling smoothly every frame.
 */
export function zaryaArcPoints(centre = {}, radius = 0, index = 0, elapsedMs = 0, cfg = ZARYA_ORB) {
    const step = Math.floor((Math.max(0, Number(elapsedMs) || 0) / 1000) * cfg.flashHz);
    const sweep = (Math.PI * 2) / cfg.arcs;
    const base = index * sweep;
    const points = [];
    for (let i = 0; i <= cfg.arcSegments; i += 1) {
        const f = i / cfg.arcSegments;
        const angle = base + f * sweep;
        const kink = (shardSeed(index * 31 + i * 7, step) - 0.5) * 2 * cfg.jitter;
        const r = radius * (1 + kink);
        points.push({
            x: (centre.x || 0) + Math.cos(angle) * r,
            y: (centre.y || 0) + Math.sin(angle) * r,
        });
    }
    return points;
}

export function particleBeamTotalMs(count = 1, cfg = PARTICLE_BEAM) {
    const n = Math.max(1, Math.floor(count) || 1);
    return cfg.gatherMs + (n - 1) * cfg.staggerMs + cfg.blastMs;
}

/**
 * When one target's blast lands, so the damage resolves with the beam rather
 * than the instant the shot is ordered.
 */
export function particleBlastMs(index = 0, cfg = PARTICLE_BEAM) {
    return cfg.gatherMs + Math.max(0, Math.floor(index) || 0) * cfg.staggerMs + cfg.blastMs * 0.6;
}

/**
 * Particle Cannon, one target's state.
 *
 * Every orb blooms first, then each is blasted in turn — so the shot reads as
 * "gather, then resolve" rather than one indistinct flash.
 */
export function particleBeamSample(elapsedMs, index = 0, count = 1, cfg = PARTICLE_BEAM) {
    const ms = Math.max(0, Number(elapsedMs) || 0);
    const gather = clamp01(ms / cfg.gatherMs);
    const blastStart = cfg.gatherMs + index * cfg.staggerMs;
    const blastT = clamp01((ms - blastStart) / cfg.blastMs);
    const blasting = ms >= blastStart && blastT < 1;
    return {
        gather,
        // Orb pops in, then holds while the rest gather.
        orbRadius: cfg.orbRadius * easeInOut(gather) * (1 + Math.sin(ms * 0.012 + index) * 0.08),
        orbAlpha: gather * (blastT > 0 ? 1 - blastT : 1),
        blasting,
        blastT,
        // The beam wipes out from the caster to the orb.
        beamReach: easeInOut(blastT),
        beamAlpha: blastT > 0 ? 1 - blastT * blastT : 0,
        done: ms >= particleBeamTotalMs(count, cfg),
    };
}

/* ---------------------------------------------------------------------------
 * Wrecking Ball.
 * ------------------------------------------------------------------------- */

/**
 * Where the mines sit on a row — one per remaining charge.
 *
 * Seeded from each mine's index, so spending a charge removes the last mine
 * instead of reshuffling the whole field.
 */
export function minefieldPositions(rect = {}, count = 0, cfg = MINEFIELD) {
    const n = Math.max(0, Math.floor(count) || 0);
    const left = rect.left || 0;
    const top = rect.top || 0;
    const width = rect.width || 0;
    const height = rect.height || 0;
    const mines = [];
    for (let i = 0; i < n; i += 1) {
        const fx = cfg.inset + shardSeed(i, cfg.salt) * (1 - cfg.inset * 2);
        const fy = cfg.inset + shardSeed(i, cfg.salt + 1) * (1 - cfg.inset * 2);
        mines.push({ x: left + width * fx, y: top + height * fy, seed: i });
    }
    return mines;
}

/** A mine's idle blink, staggered per mine so the field does not pulse as one. */
export function minefieldBlink(elapsedMs, seed = 0, cfg = MINEFIELD) {
    const phase = shardSeed(seed, cfg.salt + 2) * Math.PI * 2;
    const wave = Math.sin((Math.max(0, Number(elapsedMs) || 0) / cfg.blinkMs) * Math.PI * 2 + phase);
    return { alpha: 0.55 + 0.45 * Math.max(0, wave), radius: cfg.radius * (1 + 0.12 * wave) };
}

/** A mine going off underfoot. */
export function mineBlastSample(elapsedMs, cfg = MINE_BLAST) {
    const t = clamp01((Number(elapsedMs) || 0) / cfg.ms);
    return {
        t,
        radius: cfg.radius * (0.15 + 1.5 * t),
        alpha: 1 - t * t,
        coreRadius: cfg.radius * 0.4 * Math.max(0, 1 - t * 2.4),
        shardDistance: cfg.radius * (0.2 + 1.9 * t),
        shardAlpha: Math.max(0, 1 - t * 1.4),
        done: t >= 1,
    };
}

/** Adaptive Shield: a slow breath, held for as long as the shields are up. */
export function adaptiveSample(elapsedMs, cfg = ADAPTIVE) {
    const wave = Math.sin((Math.max(0, Number(elapsedMs) || 0) / cfg.breatheMs) * Math.PI * 2);
    return {
        scale: 1 + cfg.swell * wave,
        alpha: cfg.alpha * (0.7 + 0.3 * wave),
    };
}

/* ---------------------------------------------------------------------------
 * Symmetra.
 * ------------------------------------------------------------------------- */

/**
 * Shield Generator, one row's state.
 *
 * Rows are staggered so the light sweeps across the side rather than every row
 * flicking on at once.
 */
export function shieldGenSample(elapsedMs, index = 0, cfg = SHIELD_GEN) {
    const ms = Math.max(0, Number(elapsedMs) || 0) - index * cfg.staggerMs;
    if (ms < 0) return { t: 0, band: 0, alpha: 0, started: false, done: false };
    const t = clamp01(ms / cfg.ms);
    return {
        t,
        // The band travels the row's depth plus a band's worth beyond it, so it
        // enters and leaves cleanly instead of appearing already half-way.
        band: t * (1 + cfg.bandDepth) - cfg.bandDepth,
        alpha: Math.sin(t * Math.PI),
        started: true,
        done: t >= 1,
    };
}

export function shieldGenTotalMs(rows = 3, cfg = SHIELD_GEN) {
    return cfg.ms + Math.max(0, rows - 1) * cfg.staggerMs;
}

/** Teleporter: the hero streaks off the board and into the hand, bowing as it goes. */
export function teleportSample(elapsedMs, from = {}, to = {}, cfg = TELEPORT) {
    const t = clamp01((Number(elapsedMs) || 0) / cfg.ms);
    const e = easeInOut(t);
    const dx = (to.x || 0) - (from.x || 0);
    const dy = (to.y || 0) - (from.y || 0);
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const ghosts = [];
    for (let i = 0; i < cfg.ghosts; i += 1) {
        const lag = easeInOut(clamp01(e - (i + 1) * 0.09));
        const bow = Math.sin(lag * Math.PI) * cfg.arc;
        ghosts.push({
            x: (from.x || 0) + dx * lag + nx * bow,
            y: (from.y || 0) + dy * lag + ny * bow,
            alpha: (1 - t) * (1 - (i + 1) / (cfg.ghosts + 1)) * 0.6,
        });
    }
    const bow = Math.sin(t * Math.PI) * cfg.arc;
    return {
        t,
        x: (from.x || 0) + dx * e + nx * bow,
        y: (from.y || 0) + dy * e + ny * bow,
        // Shrinks as it is drawn into the hand.
        scale: 1 - 0.75 * e,
        alpha: 1 - t * t,
        ghosts,
        done: t >= 1,
    };
}

/* ---------------------------------------------------------------------------
 * Hanzo.
 * ------------------------------------------------------------------------- */

/** Sonic Arrow in flight. */
export function sonicArrowSample(elapsedMs, from = {}, to = {}, cfg = SONIC) {
    const t = clamp01((Number(elapsedMs) || 0) / cfg.arrowMs);
    const e = easeInOut(t);
    const dx = (to.x || 0) - (from.x || 0);
    const dy = (to.y || 0) - (from.y || 0);
    return {
        t,
        x: (from.x || 0) + dx * e,
        y: (from.y || 0) + dy * e,
        angle: Math.atan2(dy, dx),
        alpha: t < 0.85 ? 1 : Math.max(0, 1 - (t - 0.85) / 0.15),
        done: t >= 1,
    };
}

/**
 * Sonar arcs breathing across a marked row.
 *
 * Each arc is offset in the cycle, so they roll outward one after another
 * instead of throbbing together.
 */
export function sonicPulseArcs(elapsedMs, cfg = SONIC) {
    const ms = Math.max(0, Number(elapsedMs) || 0);
    const arcs = [];
    for (let i = 0; i < cfg.arcs; i += 1) {
        const t = ((ms / cfg.pulseMs) + i / cfg.arcs) % 1;
        arcs.push({
            t,
            // Fades in and back out across its travel, so nothing pops.
            alpha: cfg.alpha * Math.sin(t * Math.PI),
        });
    }
    return arcs;
}

/**
 * When the helix reaches each row of the column, so damage lands as the dragon
 * passes rather than the instant it is loosed.
 */
export function dragonstrikeHitMs(index = 0, cfg = DRAGONSTRIKE) {
    return cfg.ms * 0.42 + Math.max(0, Math.floor(index) || 0) * cfg.ms * 0.12;
}

/** Dragonstrike's travel. The body runs a length behind the head. */
export function dragonstrikeSample(elapsedMs, cfg = DRAGONSTRIKE) {
    const t = clamp01((Number(elapsedMs) || 0) / cfg.ms);
    return {
        t,
        // Runs past 1 so the tail clears the far edge before the effect ends.
        head: t * (1 + cfg.bodyLength),
        alpha: t > 0.85 ? Math.max(0, 1 - (t - 0.85) / 0.15) : 1,
        done: t >= 1,
    };
}

/**
 * One strand of the twin helix. `strand` is 0 or 1; they run half a turn apart.
 * Points outside the travel are dropped, so the body slides on and then off.
 */
export function dragonstrikeStrand(head, from = {}, to = {}, strand = 0, cfg = DRAGONSTRIKE) {
    const dx = (to.x || 0) - (from.x || 0);
    const dy = (to.y || 0) - (from.y || 0);
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const points = [];
    for (let i = 0; i <= cfg.segments; i += 1) {
        const along = head - (i / cfg.segments) * cfg.bodyLength;
        if (along < 0 || along > 1) continue;
        const twist = along * Math.PI * 2 * cfg.turns + strand * Math.PI;
        // Thins toward the tail so the body tapers off.
        const taper = 1 - (i / cfg.segments) * 0.55;
        const swing = Math.sin(twist) * cfg.amplitude * taper;
        points.push({
            x: (from.x || 0) + dx * along + nx * swing,
            y: (from.y || 0) + dy * along + ny * swing,
            // Depth cue, so the strand reads as passing in front and behind.
            depth: Math.cos(twist),
            width: 3 + 3 * taper,
            alpha: taper,
        });
    }
    return points;
}

/* ---------------------------------------------------------------------------
 * Brigitte and Cyclo.
 * ------------------------------------------------------------------------- */

/** Shield Bash landing: a hard, short spark. */
export function bashSample(elapsedMs, cfg = BASH) {
    const t = clamp01((Number(elapsedMs) || 0) / cfg.ms);
    const spikes = [];
    for (let i = 0; i < cfg.spikes; i += 1) {
        spikes.push({
            angle: (i / cfg.spikes) * Math.PI * 2 + shardSeed(i, 41) * 0.3,
            inner: cfg.radius * 0.25,
            outer: cfg.radius * (0.5 + 1.1 * t) * (0.7 + shardSeed(i, 42) * 0.6),
        });
    }
    return {
        t,
        // Bright and gone: a thud, not a bloom.
        alpha: Math.max(0, 1 - t * 1.6),
        ringRadius: cfg.radius * (0.3 + 1.4 * t),
        spikes,
        done: t >= 1,
    };
}

export function turbojackTotalMs(cfg = TURBOJACK) {
    return cfg.cycloneMs + Math.max(cfg.swirlMs, cfg.flingMs);
}

/** The funnel crossing to the target. */
export function cycloneSample(elapsedMs, from = {}, to = {}, cfg = TURBOJACK) {
    const t = clamp01((Number(elapsedMs) || 0) / cfg.cycloneMs);
    const e = easeInOut(t);
    const dx = (to.x || 0) - (from.x || 0);
    const dy = (to.y || 0) - (from.y || 0);
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const nx = -uy;
    const ny = ux;
    const x = (from.x || 0) + dx * e;
    const y = (from.y || 0) + dy * e;

    const ribs = [];
    const last = cfg.ribs - 1 || 1;
    for (let i = 0; i < cfg.ribs; i += 1) {
        const f = i / last;
        const spin = t * Math.PI * 2 * cfg.turns + f * Math.PI * 2;
        // Wide at the tail, pinched at the tip.
        const width = cfg.funnelWidth * (0.25 + 0.75 * f) * Math.abs(Math.cos(spin * 0.5)) + 4;
        const back = -f * cfg.funnelWidth * 1.4;
        ribs.push({
            x: x + ux * back + nx * Math.sin(spin) * width * 0.35,
            y: y + uy * back + ny * Math.sin(spin) * width * 0.35,
            width,
            alpha: (1 - f * 0.7) * (t < 0.9 ? 1 : Math.max(0, (1 - t) * 10)),
        });
    }
    return { t, x, y, ribs, done: t >= 1 };
}

/** The black swirl left turning on the target, in card-local coordinates. */
export function swirlArms(elapsedMs, radius = 40, cfg = TURBOJACK) {
    const ms = Math.max(0, Number(elapsedMs) || 0);
    const t = clamp01(ms / cfg.swirlMs);
    const arms = [];
    for (let a = 0; a < cfg.swirlArms; a += 1) {
        const points = [];
        for (let i = 0; i <= 16; i += 1) {
            const f = i / 16;
            const angle = (a / cfg.swirlArms) * Math.PI * 2
                + f * Math.PI * 2 * cfg.swirlTurns
                + (ms / cfg.swirlMs) * Math.PI * 2;
            // Spirals inward: the arm is swallowed by the middle.
            const r = radius * (1 - f) * (1 - t * 0.35);
            points.push({ x: Math.cos(angle) * r, y: Math.sin(angle) * r });
        }
        arms.push(points);
    }
    return { t, arms, alpha: Math.sin(t * Math.PI), done: t >= 1 };
}

/** The target card flung off toward the deck. */
export function flingSample(elapsedMs, from = {}, to = {}, cfg = TURBOJACK) {
    const t = clamp01((Number(elapsedMs) || 0) / cfg.flingMs);
    const e = easeInOut(t);
    const dx = (to.x || 0) - (from.x || 0);
    const dy = (to.y || 0) - (from.y || 0);
    const len = Math.hypot(dx, dy) || 1;
    const bow = Math.sin(t * Math.PI) * cfg.flingArc;
    return {
        t,
        x: (from.x || 0) + dx * e + (-dy / len) * bow,
        y: (from.y || 0) + dy * e + (dx / len) * bow,
        rotation: t * Math.PI * 2 * cfg.flingSpins,
        scale: 1 - 0.7 * e,
        alpha: 1 - t * t,
        done: t >= 1,
    };
}

/* ---------------------------------------------------------------------------
 * Lifeweaver.
 * ------------------------------------------------------------------------- */

/** Petal ribbon from the wounded ally into Lifeweaver. */
export function lifeGripSample(elapsedMs, from = {}, to = {}, cfg = LIFE_GRIP) {
    const t = clamp01((Number(elapsedMs) || 0) / cfg.ms);
    const e = easeInOut(t);
    const fx = from.x || 0;
    const fy = from.y || 0;
    const dx = (to.x || 0) - fx;
    const dy = (to.y || 0) - fy;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const bow = Math.sin(t * Math.PI) * cfg.arc;
    const head = { x: fx + dx * e + nx * bow, y: fy + dy * e + ny * bow };
    const petals = [];
    for (let i = 0; i < cfg.petals; i += 1) {
        const f = (i + 0.5) / cfg.petals;
        if (f > e) continue;
        const along = f / Math.max(e, 0.001);
        const px = fx + dx * along * e + nx * Math.sin(along * Math.PI) * cfg.arc * (1 - t * 0.4);
        const py = fy + dy * along * e + ny * Math.sin(along * Math.PI) * cfg.arc * (1 - t * 0.4);
        petals.push({
            x: px,
            y: py,
            radius: 4 + shardSeed(i, 41) * 5,
            alpha: (1 - t) * (0.55 + shardSeed(i, 42) * 0.45),
        });
    }
    return {
        t,
        head,
        from: { x: fx, y: fy },
        width: cfg.ribbonWidth * (1 - t * 0.45),
        alpha: 1 - t * t,
        petals,
        done: t >= 1,
    };
}

/** A blossom opening on a healed card. */
export function treeOfLifeSample(elapsedMs, cfg = TREE_OF_LIFE) {
    const t = clamp01((Number(elapsedMs) || 0) / cfg.ms);
    const open = easeOut(Math.min(1, t / 0.45));
    const fade = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3;
    const petals = [];
    for (let i = 0; i < cfg.petals; i += 1) {
        const angle = (i / cfg.petals) * Math.PI * 2 + t * 0.6;
        petals.push({
            angle,
            reach: cfg.reach * open,
            alpha: fade * 0.85,
        });
    }
    return {
        t,
        open,
        alpha: fade,
        trunk: cfg.trunk * open,
        petals,
        done: t >= 1,
    };
}

/* ---------------------------------------------------------------------------
 * Fika Catnap — sleepy Z glyphs rising off a locked card.
 * ------------------------------------------------------------------------- */

const CATNAP_LABELS = ['z', 'Z', 'z'];

/**
 * One rising Z for a catnap-locked card. `seed` picks lane + stagger so
 * neighbours do not float in lockstep.
 */
export function catnapZzzSample(seed, elapsedMs, rect = {}, cfg = CATNAP) {
    const cycle = Math.max(1, cfg.riseMs + cfg.gapMs);
    const phase = (((Number(elapsedMs) || 0) + seed * cfg.staggerMs) % cycle + cycle) % cycle;
    if (phase >= cfg.riseMs) {
        return {
            visible: false,
            x: rect.x || 0,
            y: rect.y || 0,
            alpha: 0,
            scale: 1,
            label: CATNAP_LABELS[seed % CATNAP_LABELS.length],
        };
    }

    const t = clamp01(phase / cfg.riseMs);
    const rise = 1 - (1 - t) ** 2;
    const lane = (seed % 3) - 1;
    const cx = rect.x || 0;
    const cy = rect.y || 0;
    const h = rect.height || 80;

    return {
        visible: true,
        x: cx + lane * cfg.driftX + Math.sin(seed * 1.7 + t * 4) * 3,
        y: cy - h * 0.08 - cfg.rise * rise,
        alpha: t < cfg.fadeFrom
            ? 0.95
            : Math.max(0, 0.95 * (1 - (t - cfg.fadeFrom) / (1 - cfg.fadeFrom))),
        scale: 0.7 + t * 0.6,
        label: CATNAP_LABELS[seed % CATNAP_LABELS.length],
    };
}

/* ---------------------------------------------------------------------------
 * Vega — temporal warp rings.
 * ------------------------------------------------------------------------- */

/** Expanding / collapsing violet rings over a card rect. */
export function warpSample(elapsedMs, cfg = WARP, durationKey = 'riftMs') {
    const life = cfg[durationKey] || cfg.riftMs;
    const t = clamp01((Number(elapsedMs) || 0) / life);
    const pulse = Math.sin(t * Math.PI);
    return {
        t,
        open: pulse,
        alpha: pulse,
        done: t >= 1,
    };
}

/* ---------------------------------------------------------------------------
 * Mantis — cloak camo, energy slash, blade-dance dervish.
 * ------------------------------------------------------------------------- */

/** One-shot cloak burst when Cloak first attaches. */
export function mantisCloakBurstSample(elapsedMs, cfg = MANTIS) {
    const t = clamp01((Number(elapsedMs) || 0) / cfg.cloakBurstMs);
    return {
        t,
        open: Math.sin(t * Math.PI),
        alpha: Math.sin(t * Math.PI) * 0.85,
        done: t >= 1,
    };
}

/** Continuous camo puffs for a cloaked Mantis (looping). */
export function mantisCloakCamoPuffs(elapsedMs, cfg = MANTIS) {
    const ms = Number(elapsedMs) || 0;
    const puffs = [];
    for (let i = 0; i < cfg.cloakPuffs; i += 1) {
        const phase = (ms / cfg.cloakDriftMs) * Math.PI * 2 + (i / cfg.cloakPuffs) * Math.PI * 2;
        const wobble = 0.55 + 0.45 * Math.sin(phase * 1.3 + i);
        puffs.push({
            angle: phase,
            radius: cfg.cloakReach * wobble,
            puffR: cfg.cloakPuffR * (0.7 + 0.4 * Math.sin(phase * 0.7)),
            alpha: cfg.cloakAlpha * (0.45 + 0.55 * Math.abs(Math.sin(phase))),
        });
    }
    return { puffs };
}

/** Diagonal energy slash across a card. */
export function mantisEnergySlashSample(elapsedMs, cfg = MANTIS) {
    const t = clamp01((Number(elapsedMs) || 0) / cfg.slashMs);
    const cut = clamp01(t / 0.45);
    const fade = t < 0.55 ? 1 : 1 - (t - 0.55) / 0.45;
    return {
        t,
        cut,
        alpha: fade * (0.4 + 0.6 * cut),
        done: t >= 1,
    };
}

/** Blade Dance: spinning curved blades + shroud pulse. */
export function mantisBladeDanceSample(elapsedMs, cfg = MANTIS) {
    const t = clamp01((Number(elapsedMs) || 0) / cfg.danceMs);
    const spin = (Number(elapsedMs) || 0) * cfg.danceSpinRate;
    const blades = [];
    for (let i = 0; i < cfg.danceBlades; i += 1) {
        blades.push({
            angle: spin + (i / cfg.danceBlades) * Math.PI * 2,
            length: cfg.danceReach,
            alpha: (1 - t * 0.35) * (0.65 + 0.35 * Math.sin(spin * 2 + i)),
        });
    }
    return {
        t,
        shroudAlpha: cfg.danceShroudAlpha * Math.sin(clamp01(t * 1.2) * Math.PI),
        blades,
        done: t >= 1,
    };
}

/**
 * Sombra's Hack, sweeping left to right across the board.
 *
 * `t` is the front's position as a fraction of the board's width. Columns light
 * as the front reaches them and decay behind it, so the wall reads as advancing
 * rather than blinking on all at once.
 */
export function hackSample(elapsedMs, cfg = HACK) {
    const t = clamp01((Number(elapsedMs) || 0) / cfg.sweepMs);
    return { t, front: t, done: t >= 1 };
}

/**
 * How lit one column is, given where the front has reached.
 *
 * Ahead of the front a column glows faintly — the intrusion arriving — and
 * behind it fades over a longer tail, which is what gives the sweep direction.
 */
export function hackColumnAlpha(columnIndex, front, cfg = HACK) {
    const columns = Math.max(1, cfg.columns);
    const frontColumn = clamp01(front) * columns;
    const distance = frontColumn - columnIndex;

    if (distance < 0) {
        const lead = Math.max(0.0001, cfg.leadColumns);
        if (-distance > lead) return 0;
        return cfg.maxAlpha * 0.35 * (1 + distance / lead);
    }
    const trail = Math.max(0.0001, cfg.trailColumns);
    if (distance > trail) return 0;
    return cfg.maxAlpha * (1 - distance / trail);
}

/**
 * Whether a glyph currently reads as a 1 rather than a 0.
 *
 * Derived from its position and a coarse time step rather than Math.random, so
 * the wall re-rolls on a visible cadence instead of hissing every frame, and
 * two layers drawing the same glyph agree about it.
 */
export function hackGlyphIsOne(columnIndex, rowIndex, elapsedMs, cfg = HACK) {
    const step = Math.floor((Number(elapsedMs) || 0) / cfg.rerollMs);
    const n = Math.sin((columnIndex + 1) * 12.9898 + (rowIndex + 1) * 78.233 + step * 37.719) * 43758.5453;
    return (n - Math.floor(n)) > 0.5;
}
