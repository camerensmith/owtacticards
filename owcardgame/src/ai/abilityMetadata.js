/**
 * Ability Metadata for AI Decision Making
 *
 * This metadata helps the AI understand what each ability does without
 * having to parse the actual ability code. It's used to make smarter
 * decisions about when to use abilities and what to target.
 */

export const abilityMetadata = {
    // Ability type classifications
    DAMAGE: 'damage',
    HEAL: 'heal',
    BUFF: 'buff',
    DEBUFF: 'debuff',
    DRAW: 'draw',
    SUMMON: 'summon',
    MOVE: 'move',
    CONTROL: 'control',
    UTILITY: 'utility',
};

// Targeting type classifications
export const targetingTypes = {
    SINGLE_ENEMY: 'single_enemy',
    SINGLE_ALLY: 'single_ally',
    SINGLE_ANY: 'single_any',
    AOE_ENEMY: 'aoe_enemy',
    AOE_ALLY: 'aoe_ally',
    AOE_ALL: 'aoe_all',
    ROW_ENEMY: 'row_enemy',
    ROW_ALLY: 'row_ally',
    SELF: 'self',
    NONE: 'none',
};

/**
 * Hero ability metadata
 * Each hero can have:
 * - onEnter: abilities that trigger when the card is played
 * - onUltimate: ultimate ability
 */
export const heroAbilities = {
    roadhog: {
        onEnter: {
            name: 'Chain Hook',
            type: abilityMetadata.DAMAGE,
            targeting: targetingTypes.SINGLE_ENEMY,
            damage: 2,
            effect: 'Move target enemy to front row',
            priority: 8, // High priority for removal/disruption
        },
        onUltimate: {
            name: 'Whole Hog',
            type: abilityMetadata.DAMAGE,
            targeting: targetingTypes.AOE_ENEMY,
            damage: 'variable',
            effect: 'Deal damage to all enemies',
            priority: 9,
        }
    },

    ana: {
        onEnter: {
            name: 'Biotic Rifle',
            type: [abilityMetadata.DAMAGE, abilityMetadata.HEAL],
            targeting: targetingTypes.SINGLE_ANY,
            value: 3,
            effect: 'Heal ally or damage enemy',
            priority: 7,
            hasChoice: true, // Has modal choice between heal/damage
        },
        onUltimate: {
            name: 'Nano Boost',
            type: abilityMetadata.BUFF,
            targeting: targetingTypes.ROW_ALLY,
            effect: 'Place Ana Token in row, adds X synergy where X = heroes in row',
            priority: 8,
        }
    },

    mercy: {
        onEnter: {
            name: 'Caduceus Staff',
            type: abilityMetadata.HEAL,
            targeting: targetingTypes.SINGLE_ALLY,
            healing: 2,
            priority: 6,
        },
        onUltimate: {
            name: 'Resurrect',
            type: abilityMetadata.SUMMON,
            targeting: targetingTypes.NONE,
            effect: 'Return dead ally to battlefield',
            priority: 10, // Very high priority
        }
    },

    reinhardt: {
        onEnter: {
            name: 'Charge',
            type: [abilityMetadata.DAMAGE, abilityMetadata.MOVE],
            targeting: targetingTypes.SINGLE_ENEMY,
            damage: 3,
            effect: 'Damage and reposition enemy',
            priority: 7,
        },
        onUltimate: {
            name: 'Earthshatter',
            type: abilityMetadata.DAMAGE,
            targeting: targetingTypes.ROW_ENEMY,
            damage: 3,
            effect: 'Damage entire enemy row',
            priority: 9,
        }
    },

    genji: {
        onEnter: {
            name: 'Swift Strike / Deflect',
            type: abilityMetadata.DAMAGE,
            targeting: targetingTypes.SINGLE_ENEMY,
            damage: 2,
            priority: 6,
            hasChoice: true,
        }
    },

    pharah: {
        onEnter: {
            name: 'Concussive Blast',
            type: abilityMetadata.DAMAGE,
            targeting: targetingTypes.SINGLE_ENEMY,
            damage: 2,
            priority: 5,
        },
        onUltimate: {
            name: 'Barrage',
            type: abilityMetadata.DAMAGE,
            targeting: targetingTypes.AOE_ENEMY,
            damage: 'high',
            priority: 9,
        }
    },

    reaper: {
        onEnter: {
            name: 'Wraith Form / Shadow Step',
            type: abilityMetadata.UTILITY,
            targeting: targetingTypes.SELF,
            priority: 4,
            hasChoice: true,
        }
    },

    tracer: {
        onEnter: {
            name: 'Blink / Recall',
            type: [abilityMetadata.DAMAGE, abilityMetadata.HEAL],
            hasChoice: true,
            priority: 6,
        }
    },

    widowmaker: {
        onEnter: {
            name: 'Venom Mine / Grappling Hook',
            type: abilityMetadata.DAMAGE,
            targeting: targetingTypes.SINGLE_ENEMY,
            damage: 2,
            priority: 6,
            hasChoice: true,
        }
    },

    hanzo: {
        onEnter: {
            name: 'Storm Arrows / Sonic Arrow',
            type: abilityMetadata.DAMAGE,
            targeting: targetingTypes.SINGLE_ENEMY,
            damage: 3,
            priority: 7,
            hasChoice: true,
        }
    },

    junkrat: {
        onEnter: {
            name: 'Concussion Mine',
            type: abilityMetadata.DAMAGE,
            targeting: targetingTypes.SINGLE_ENEMY,
            damage: 2,
            priority: 6,
        }
    },

    mei: {
        onEnter: {
            name: 'Endothermic Blaster / Ice Wall',
            type: [abilityMetadata.DAMAGE, abilityMetadata.CONTROL],
            hasChoice: true,
            priority: 6,
        }
    },

    bastion: {
        onEnter: {
            name: 'Configuration: Artillery',
            type: abilityMetadata.DAMAGE,
            targeting: targetingTypes.AOE_ENEMY,
            damage: 2,
            priority: 7,
        }
    },

    echo: {
        onEnter: {
            name: 'Focusing Beam / Flight',
            type: abilityMetadata.DAMAGE,
            hasChoice: true,
            priority: 6,
        },
        onUltimate: {
            name: 'Duplicate',
            type: abilityMetadata.UTILITY,
            effect: 'Copy last enemy ultimate',
            priority: 8,
        }
    },

    mccree: {
        onEnter: {
            name: 'Flashbang / Combat Roll',
            type: [abilityMetadata.DAMAGE, abilityMetadata.UTILITY],
            hasChoice: true,
            priority: 6,
        }
    },

    soldier: {
        onEnter: {
            name: 'Helix Rockets',
            type: abilityMetadata.DAMAGE,
            targeting: targetingTypes.SINGLE_ENEMY,
            damage: 3,
            priority: 7,
        }
    },

    sombra: {
        onEnter: {
            name: 'Hack / Stealth',
            type: abilityMetadata.DEBUFF,
            targeting: targetingTypes.SINGLE_ENEMY,
            priority: 7,
            hasChoice: true,
        }
    },

    doomfist: {
        onEnter: {
            name: 'Rocket Punch',
            type: abilityMetadata.DAMAGE,
            targeting: targetingTypes.SINGLE_ENEMY,
            damage: 4,
            priority: 8,
        }
    },

    ashe: {
        onEnter: {
            name: 'Dynamite / Coach Gun',
            type: abilityMetadata.DAMAGE,
            hasChoice: true,
            priority: 7,
        }
    },

    baptiste: {
        onEnter: {
            name: 'Biotic Launcher (Damage/Heal)',
            type: [abilityMetadata.DAMAGE, abilityMetadata.HEAL],
            hasChoice: true,
            priority: 7,
        }
    },

    brigitte: {
        onEnter: {
            name: 'Repair Pack / Shield Bash',
            type: [abilityMetadata.HEAL, abilityMetadata.DAMAGE],
            hasChoice: true,
            priority: 6,
        }
    },

    lucio: {
        onEnter: {
            name: 'Crossfade',
            type: [abilityMetadata.HEAL, abilityMetadata.BUFF],
            targeting: targetingTypes.AOE_ALLY,
            hasChoice: true,
            priority: 6,
        }
    },

    moira: {
        onEnter: {
            name: 'Biotic Orb',
            type: [abilityMetadata.HEAL, abilityMetadata.DAMAGE],
            hasChoice: true,
            priority: 6,
        }
    },

    zenyatta: {
        onEnter: {
            name: 'Orb of Harmony / Orb of Discord',
            type: [abilityMetadata.HEAL, abilityMetadata.DEBUFF],
            hasChoice: true,
            priority: 7,
        }
    },

    dva: {
        onEnter: {
            name: 'Micro Missiles',
            type: abilityMetadata.DAMAGE,
            targeting: targetingTypes.SINGLE_ENEMY,
            damage: 2,
            priority: 6,
        }
    },

    orisa: {
        onEnter: {
            name: 'Fortify / Halt',
            type: [abilityMetadata.BUFF, abilityMetadata.CONTROL],
            hasChoice: true,
            priority: 6,
        }
    },

    sigma: {
        onEnter: {
            name: 'Accretion / Kinetic Grasp',
            type: [abilityMetadata.DAMAGE, abilityMetadata.BUFF],
            hasChoice: true,
            priority: 6,
        }
    },

    winston: {
        onEnter: {
            name: 'Jump Pack',
            type: abilityMetadata.DAMAGE,
            targeting: targetingTypes.AOE_ENEMY,
            damage: 1,
            priority: 5,
        }
    },

    wreckingball: {
        onEnter: {
            name: 'Grappling Claw / Piledriver',
            type: abilityMetadata.DAMAGE,
            hasChoice: true,
            priority: 6,
        }
    },

    zarya: {
        onEnter: {
            name: 'Particle Barrier / Projected Barrier',
            type: abilityMetadata.BUFF,
            hasChoice: true,
            priority: 6,
        }
    },

    torbjorn: {
        onEnter: {
            name: 'Deploy Turret',
            type: abilityMetadata.SUMMON,
            targeting: targetingTypes.NONE,
            priority: 7,
        }
    },

    symmetra: {
        onEnter: {
            name: 'Sentry Turret / Teleporter',
            type: [abilityMetadata.DAMAGE, abilityMetadata.UTILITY],
            hasChoice: true,
            priority: 5,
        }
    },

    lifeweaver: {
        onEnter: {
            name: 'Healing Blossom / Life Grip',
            type: abilityMetadata.HEAL,
            hasChoice: true,
            priority: 6,
        }
    },

    ramattra: {
        onEnter: {
            name: 'Void Accelerator / Nemesis Form',
            type: [abilityMetadata.DAMAGE, abilityMetadata.BUFF],
            hasChoice: true,
            priority: 7,
        }
    },

    junkerqueen: {
        onEnter: {
            name: 'Jagged Blade / Commanding Shout',
            type: [abilityMetadata.DAMAGE, abilityMetadata.BUFF],
            hasChoice: true,
            priority: 7,
        }
    },

    mauga: {
        onEnter: {
            name: 'Overrun / Cardiac Overdrive',
            type: [abilityMetadata.DAMAGE, abilityMetadata.HEAL],
            hasChoice: true,
            priority: 7,
        }
    },

    hazard: {
        onEnter: {
            name: 'Jagged Wall / Violent Leap',
            type: [abilityMetadata.CONTROL, abilityMetadata.DAMAGE],
            hasChoice: true,
            priority: 6,
        }
    },

    venture: {
        onEnter: {
            name: 'Burrow / Drill Dash',
            type: abilityMetadata.DAMAGE,
            hasChoice: true,
            priority: 6,
        }
    },
};

/**
 * Get ability metadata for a hero
 */
export function getAbilityMetadata(heroId, abilityType = 'onEnter') {
    return heroAbilities[heroId]?.[abilityType] || null;
}

/**
 * Check if an ability has modal choices
 */
export function hasModalChoice(heroId, abilityType = 'onEnter') {
    const metadata = getAbilityMetadata(heroId, abilityType);
    return metadata?.hasChoice || false;
}

/**
 * Get ability priority (higher = more important)
 */
export function getAbilityPriority(heroId, abilityType = 'onEnter') {
    const metadata = getAbilityMetadata(heroId, abilityType);
    return metadata?.priority || 5;
}

/**
 * Check if ability targets enemies
 */
export function targetsEnemies(heroId, abilityType = 'onEnter') {
    const metadata = getAbilityMetadata(heroId, abilityType);
    if (!metadata) return false;

    const enemyTargets = [
        targetingTypes.SINGLE_ENEMY,
        targetingTypes.AOE_ENEMY,
        targetingTypes.ROW_ENEMY,
    ];

    return enemyTargets.includes(metadata.targeting);
}

/**
 * Check if ability targets allies
 */
export function targetsAllies(heroId, abilityType = 'onEnter') {
    const metadata = getAbilityMetadata(heroId, abilityType);
    if (!metadata) return false;

    const allyTargets = [
        targetingTypes.SINGLE_ALLY,
        targetingTypes.AOE_ALLY,
        targetingTypes.ROW_ALLY,
    ];

    return allyTargets.includes(metadata.targeting);
}

export default {
    heroAbilities,
    getAbilityMetadata,
    hasModalChoice,
    getAbilityPriority,
    targetsEnemies,
    targetsAllies,
};