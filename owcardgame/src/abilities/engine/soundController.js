// Sound controller: centralized, optional sound playback per hero and event.
// Events: onDraw, onPlacement, onUltimate, onDamaged, onHealed, onDeath,
// onRez, onFlavor, onAcquaintance, onEnemy, onInterrupt, onAbility, onGameEvent.

import { getAudioFile } from '../../assets/imageImports';

// Canonical event names
export const SoundEvents = {
    onDraw: 'onDraw',
    onPlacement: 'onPlacement',
    onUltimate: 'onUltimate',
    onDamaged: 'onDamaged',
    onHealed: 'onHealed',
    onDeath: 'onDeath',
    onRez: 'onRez',
    onFlavor: 'onFlavor',
    onAcquaintance: 'onAcquaintance',
    onEnemy: 'onEnemy',
    onRowTarget: 'onRowTarget',
    onInterrupt: 'onInterrupt',
    onAbility: 'onAbility',
    onGameEvent: 'onGameEvent',
};

// Available audio files organized by category for easy reference
export const AvailableAudio = {
    // Game Events
    gameEvents: {
        placement: 'placement',
        endturn: 'endturn',
        victory: 'announcer-victory',
        defeat: 'announcer-defeat',
        round1: 'announcer-round1',
        round2: 'announcer-round2',
        round3: 'announcer-round3',
        initiatingMatch: 'announcer-initiatingmatch',
        prepareToAttack: 'announcer-preparetoattack',
    },
    
    // Hero Intros (all heroes have intro sounds)
    heroIntros: {
        ana: 'ana-intro',
        ashe: 'ashe-intro',
        baptiste: 'baptiste-intro',
        bastion: 'bastion-intro',
        brigitte: 'brigitte-intro',
        doomfist: 'doomfist-intro',
        dva: 'dvameka-intro',
        echo: 'echo-intro',
        genji: 'genji-intro',
        hanzo: 'hanzo-intro',
        junkrat: 'junkrat-intro',
        lucio: 'lucio-intro',
        mccree: 'mccree-intro',
        mei: 'mei-intro',
        mercy: 'mercy-intro',
        moira: 'moira-intro',
        orisa: 'orisa-intro',
        pharah: 'pharah-intro',
        ramattra: 'ramattra-intro',
        reaper: 'reaper-intro',
        reinhardt: 'reinhardt-intro',
        roadhog: 'roadhog-intro',
        sigma: 'sigma-intro',
        soldier: 'soldier-intro',
        sombra: 'sombra-intro',
        symmetra: 'symmetra-intro',
        torbjorn: 'torbjorn-intro',
        tracer: 'tracer-intro',
        widowmaker: 'widowmaker-intro',
        winston: 'winston-intro',
        wreckingball: 'wreckingball-intro',
        zarya: 'zarya-intro',
        zenyatta: 'zenyatta-intro',
    },
    
    // Hero Ultimates
    heroUltimates: {
        ana: 'ana-ult',
        ashe: 'ashe-bob',
        baptiste: 'baptiste-immortality',
        bastion: 'bastion-ult',
        brigitte: 'brigitte-ult',
        doomfist: 'doomfist-ult',
        dva: 'dva-ult',
        echo: 'echo-ult',
        genji: 'genji-ult',
        hanzo: 'hanzo-ult',
        junkrat: 'junkrat-ult',
        lucio: 'lucio-ult',
        mccree: 'mccree-ult',
        mei: 'mei-ult',
        mercy: 'mercy-ult',
        moira: 'moira-ult',
        orisa: 'orisa-ult',
        pharah: 'pharah-ult',
        ramattra: 'ramattra-nemesis-annihilation',
        reaper: 'reaper-ult',
        reinhardt: 'reinhardt-ult',
        roadhog: 'roadhog-hogwild',
        sigma: 'sigma-ult',
        soldier: 'soldier-ult',
        sombra: 'sombra-ult',
        symmetra: 'symmetra-teleporter',
        torbjorn: 'torbjorn-ult',
        tracer: 'tracer-imback',
        widowmaker: 'widowmaker-widowskiss',
        winston: 'winston-angry',
        wreckingball: 'wreckingball-ult',
        zarya: 'zarya-ult',
        zenyatta: 'zenyatta-ult',
    },
    
    // Hero Abilities (key abilities with unique sounds)
    heroAbilities: {
        ana: ['ana-grenade'],
        ashe: ['ashe-deadlockgang'],
        baptiste: ['baptiste-notover'],
        doomfist: ['doomfist-punch'],
        dva: ['dvameka-nerfthis', 'dvameka-apm'],
        echo: ['echo-burning'],
        genji: ['genji-cutting'],
        hanzo: ['hanzo-marked'],
        junkrat: ['junkrat-laugh'],
        lucio: ['lucio-ampitup', 'lucio-heal'],
        mccree: ['mccree-fishinabarrel'],
        mei: ['mei-goticed'],
        mercy: ['mercy-heal', 'mercy-damageboost', 'mercy-medicalemergency', 'mercy-watchingover'],
        moira: ['moira-grasp'],
        orisa: ['orisa-barrier'],
        pharah: ['pharah-clear'],
        ramattra: ['ramattra-voidbarrier', 'ramattra-vortex', 'ramattra-nemesis', 'ramattra-nemesis2'],
        reaper: ['reaper-lastwords'],
        reinhardt: ['reinhardt-barrier'],
        roadhog: ['roadhog-hook', 'roadhog-hook2', 'roadhog-hook3'],
        sigma: ['sigma-barrier'],
        soldier: ['soldier-targetrich', 'soldier-teamheal'],
        sombra: ['sombra-hack'],
        symmetra: ['symmetra-shield'],
        torbjorn: ['torbjorn-turret'],
        tracer: ['tracer-dejavu', 'tracer-smarts'],
        turret: ['turret-deploy'],
        widowmaker: ['widowmaker-oneshot', 'widowmaker-noonecanhide', 'widowmaker-noonecanhide-fr'],
        winston: ['winston-barrier', 'winston-protect', 'winston-rescue', 'winston-takecover'],
        wreckingball: ['wreckingball-shields', 'wreckingball-squeaks'],
        zarya: ['zarya-barrier', 'zarya-barrierally'],
        zenyatta: ['zenyatta-discord', 'zenyatta-discord2', 'zenyatta-harmony'],
    },
};

// Simple in-memory registry; hero modules can register their sound keys here.
// Example structure:
// registry[heroId] = {
//   onDraw: ['tracer-intro'],
//   onUltimate: ['tracer-imback'],
//   onDamaged: ['winston-protect','winston-takecover']
// }
const registry = {};

export function registerHeroSounds(heroId, mapping) {
    registry[heroId] = { ...(registry[heroId] || {}), ...mapping };
}

// Helper: pick next sound from an array (random for now; could be round-robin)
function pickSoundKey(keys) {
    if (!Array.isArray(keys) || keys.length === 0) return undefined;
    const idx = Math.floor(Math.random() * keys.length);
    return keys[idx];
}

export function playHeroEventSound(heroId, eventName) {
    const heroMap = registry[heroId];
    if (!heroMap) return;
    const keys = heroMap[eventName];
    const key = Array.isArray(keys) ? pickSoundKey(keys) : keys;
    if (!key) return;
    const src = getAudioFile(key);
    if (!src) return;
    const audio = new Audio(src);
    audio.play().catch(() => {});
}

// Overlay hook: callers can subscribe to be notified when to show a speech icon
// above a specific card. This stays UI-agnostic; UI registers a callback.
let overlayListener = null;
export function setOverlayListener(listener) {
    overlayListener = listener;
}

export function notifyOverlay(cardId, eventName) {
    if (overlayListener) overlayListener({ cardId, eventName });
}

// Combined helper used by callers: plays audio, then notifies overlay
export function playWithOverlay(heroId, cardId, eventName) {
    playHeroEventSound(heroId, eventName);
    notifyOverlay(cardId, eventName);
}

// Convenience wrappers for common events
export function playRowTarget(heroId, cardId) {
    playWithOverlay(heroId, cardId, SoundEvents.onRowTarget);
}

// Direct sound playback functions (bypasses hero registry)
export function playGameEvent(eventName) {
    const audioKey = AvailableAudio.gameEvents[eventName];
    if (!audioKey) {
        console.warn(`Unknown game event: ${eventName}`);
        return;
    }
    const src = getAudioFile(audioKey);
    if (!src) return;
    const audio = new Audio(src);
    audio.play().catch(() => {});
}

export function playHeroIntro(heroId) {
    const audioKey = AvailableAudio.heroIntros[heroId];
    if (!audioKey) {
        console.warn(`No intro sound for hero: ${heroId}`);
        return;
    }
    const src = getAudioFile(audioKey);
    if (!src) return;
    const audio = new Audio(src);
    audio.play().catch(() => {});
}

export function playHeroUltimate(heroId) {
    const audioKey = AvailableAudio.heroUltimates[heroId];
    if (!audioKey) {
        console.warn(`No ultimate sound for hero: ${heroId}`);
        return;
    }
    const src = getAudioFile(audioKey);
    if (!src) return;
    const audio = new Audio(src);
    audio.play().catch(() => {});
}

export function playHeroAbility(heroId, abilityIndex = 0) {
    const abilities = AvailableAudio.heroAbilities[heroId];
    if (!abilities || !abilities[abilityIndex]) {
        console.warn(`No ability sound for hero: ${heroId}, ability: ${abilityIndex}`);
        return;
    }
    const audioKey = abilities[abilityIndex];
    const src = getAudioFile(audioKey);
    if (!src) return;
    const audio = new Audio(src);
    audio.play().catch(() => {});
}

export function playRandomHeroAbility(heroId) {
    const abilities = AvailableAudio.heroAbilities[heroId];
    if (!abilities || abilities.length === 0) {
        console.warn(`No ability sounds for hero: ${heroId}`);
        return;
    }
    const randomIndex = Math.floor(Math.random() * abilities.length);
    playHeroAbility(heroId, randomIndex);
}

// Auto-register all hero sounds based on AvailableAudio
export function autoRegisterAllHeroSounds() {
    Object.keys(AvailableAudio.heroIntros).forEach(heroId => {
        const sounds = {
            [SoundEvents.onDraw]: [AvailableAudio.heroIntros[heroId]],
            [SoundEvents.onPlacement]: [AvailableAudio.heroIntros[heroId]],
        };
        
        // Add ultimate sound if available
        if (AvailableAudio.heroUltimates[heroId]) {
            sounds[SoundEvents.onUltimate] = [AvailableAudio.heroUltimates[heroId]];
        }
        
        // Add ability sounds if available
        if (AvailableAudio.heroAbilities[heroId]) {
            sounds[SoundEvents.onAbility] = AvailableAudio.heroAbilities[heroId];
        }
        
        registerHeroSounds(heroId, sounds);
    });
}

export default {
    registerHeroSounds,
    playHeroEventSound,
    playWithOverlay,
    playRowTarget,
    setOverlayListener,
    notifyOverlay,
    SoundEvents,
    AvailableAudio,
    playGameEvent,
    playHeroIntro,
    playHeroUltimate,
    playHeroAbility,
    playRandomHeroAbility,
    autoRegisterAllHeroSounds,
};


