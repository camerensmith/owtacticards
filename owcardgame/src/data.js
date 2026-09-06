// Data for all hero cards

// Hero role mapping from hero.json
const heroRoles = {
    ana: 'support',
    ashe: 'offense', 
    baptiste: 'support',
    bastion: 'defense',
    bob: 'offense', // BOB is offense class
    brigitte: 'support',
    doomfist: 'offense',
    dva: 'tank',
    dvameka: 'tank', // MEKA is tank class
    echo: 'offense',
    genji: 'offense',
    hanzo: 'defense',
    junkrat: 'defense',
    lifeweaver: 'support',
    lucio: 'support',
    mccree: 'offense',
    mei: 'defense',
    mercy: 'support',
    moira: 'support',
    nemesis: 'tank', // Nemesis is tank class
    orisa: 'tank',
    pharah: 'offense',
    ramattra: 'tank',
    reaper: 'offense',
    reinhardt: 'tank',
    roadhog: 'tank',
    sigma: 'tank',
    soldier: 'offense',
    sombra: 'offense',
    symmetra: 'defense',
    torbjorn: 'defense',
    tracer: 'offense',
    turret: 'defense', // Turret is defense class
    widowmaker: 'defense',
    winston: 'tank',
    wreckingball: 'tank',
    zarya: 'tank',
    zenyatta: 'support',
    hazard: 'defense',
    mauga: 'tank',
    junkerqueen: 'offense',
    venture: 'offense',
    bravox2: 'offense',
    cyclo: 'tank',
    emre: 'offense',
    fika: 'support',
    rajah: 'defense',
    mirage: 'defense',
    warden: 'offense',
    wuyang: 'support',
    sylvain: 'defense',
    axiom: 'support',
    lockjaw: 'defense',
    stoneguard: 'defense',
    vega: 'support',
    mantis: 'offense',
};

/* hero effects API is as follows:

player: ally, enemy
  target: 
    card, 
    row
  type: 
    damage,  //affects hero damage
    attack,  // attacks enemy when triggered 
    healing, 
    synergy, 
    power
  value:      // how much more damage/healing etc to be added
    integer, 
    double, 
    allies,   // proportionate to the number of allies, usually in a given row
  on:         // when does the effect take place
    turnstart, 
    movein, 
    moveout, 
    attack, 
    heal, 
    activate, // effect triggers once when ability is activated, never again 
    ability,  // usage of any of a card's abilities
    ultimate,  // usage of a card's ultimate ability

*/

const data = {
    heroes: {
        ana: {
            id: 'ana',
            name: 'Ana',
            image: 'assets/heroes/ana.png',
            icon: 'assets/heroes/ana-icon.png',
            effects: {
                anaUltimateEffect: {
                    id: 'anaUltimateEffect',
                    hero: 'ana',
                    player: 'ally',
                    target: 'row',
                    type: 'power',
                    on: 'activate',
                    value: 'allies',
                },
            },
            health: 2,
            power: {
                f: 1,
                m: 2,
                b: 2,
            },
            synergy: {
                f: 3,
                m: 2,
                b: 2,
            },
            ultimate: 'Nano Boost (2): Choose any friendly or enemy row. Add +X synergy to the row, where X is the number of Heroes on that row.',
            isImplemented: true,
        },

        ashe: {
            id: 'ashe',
            name: 'Ashe',
            image: 'assets/heroes/ashe.png',
            health: 3,
            power: {
                f: 2,
                m: 1,
                b: 3,
            },
            synergy: {
                f: 2,
                m: 3,
                b: 1,
            },
            isImplemented: true,
        },

        baptiste: {
            id: 'baptiste',
            name: 'Baptiste',
            image: 'assets/heroes/baptiste.png',
            icon: 'assets/heroes/baptiste-icon.png',
            effects: {
                baptisteAllyEffect: {
                    id: 'baptisteAllyEffect',
                    hero: 'baptiste',
                    player: 'ally',
                    target: 'row',
                    health: 3,
                    type: 'immortality',
                    on: 'activate',
                },
            },
            health: 3,
            power: {
                f: 3,
                m: 2,
                b: 1,
            },
            synergy: {
                f: 1,
                m: 2,
                b: 3,
            },
            ultimate: 'Immortality Field (3): Makes Baptiste and adjacent slots invulnerable until start of next turn.',
            isImplemented: true,
        },

        bastion: {
            id: 'bastion',
            name: 'Bastion',
            image: 'assets/heroes/bastion.png',
            icon: 'assets/heroes/bastion-icon.png',
            effects: {
                bastionEnemyEffect: {
                    id: 'bastionEnemyEffect',
                    hero: 'bastion',
                    player: 'enemy',
                    target: 'row',
                    type: 'attack',
                    value: 2,
                    on: 'movein',
                },
            },
            health: 4,
            power: {
                f: 1,
                m: 2,
                b: 3,
            },
            synergy: {
                f: 3,
                m: 2,
                b: 1,
            },
            ultimate: 'Tank Mode (3): Deal 2 damage to one enemy + 2 damage to up to 2 enemies in any row.',
            isImplemented: true,
        },

        bob: {
            id: 'bob',
            name: 'Bob',
            image: 'assets/heroes/bob.png',
            icon: 'assets/heroes/bob-icon.png',
            effects: {
                bobEnemyEffect: {
                    id: 'bobEnemyEffect',
                    hero: 'bob',
                    player: 'enemy',
                    target: 'row',
                    type: 'synergy',
                    on: 'ultimate',
                    value: 2,
                },
            },
            health: 3,
            power: {
                f: 1,
                m: 1,
                b: 1,
            },
            synergy: {
                f: 0,
                m: 0,
                b: 0,
            },
            ultimate: 'Smash (2): Deal X damage to an enemy in the opposite row, where X is the number of turns B.O.B. has been on the field.',
            special: true,
        },

        brigitte: {
            id: 'brigitte',
            name: 'Brigitte',
            image: 'assets/heroes/brigitte.png',
            health: 4,
            power: {
                f: 3,
                m: 2,
                b: 1,
            },
            synergy: {
                f: 1,
                m: 2,
                b: 3,
            },
            ultimate: 'Shield Bash (3): Bash enemy Hero. They cannot use Ultimate this round.',
            isImplemented: true,
        },

        doomfist: {
            id: 'doomfist',
            name: 'Doomfist',
            image: 'assets/heroes/doomfist.png',
            health: 4,
            power: {
                f: 3,
                m: 2,
                b: 2,
            },
            synergy: {
                f: 1,
                m: 3,
                b: 2,
            },
            ultimate: 'Meteor Strike (3): Deal 3 damage to target enemy + 1 damage to adjacent enemies.',
            isImplemented: true,
        },

        dva: {
            id: 'dva',
            name: 'D.va',
            image: 'assets/heroes/dva.png',
            health: 2,
            power: {
                f: 1,
                m: 1,
                b: 1,
            },
            synergy: {
                f: 1,
                m: 1,
                b: 1,
            },
            ultimate: 'Call Mech (2): Place D.Va+MEKA into your hand.',
            isImplemented: true,
        },

        dvameka: {
            id: 'dvameka',
            name: 'D.va + Meka',
            image: 'assets/heroes/dvameka.png',
            health: 4,
            power: {
                f: 2,
                m: 3,
                b: 1,
            },
            synergy: {
                f: 2,
                m: 1,
                b: 3,
            },
            ultimate: 'Self Destruct (3): Deal 4 damage to all opponents AND Allies.',
            isImplemented: true,
            special: true,
        },

        echo: {
            id: 'echo',
            name: 'Echo',
            image: 'assets/heroes/echo.png',
            health: 4,
            power: {
                f: 1,
                m: 3,
                b: 2,
            },
            synergy: {
                f: 3,
                m: 1,
                b: 2,
            },
            ultimate: 'Duplicate (4): Copy the last ultimate ability that was used.',
            isImplemented: true,
        },

        genji: {
            id: 'genji',
            name: 'Genji',
            image: 'assets/heroes/genji.png',
            health: 4,
            power: {
                f: 3,
                m: 2,
                b: 1,
            },
            synergy: {
                f: 1,
                m: 2,
                b: 3,
            },
            ultimate: 'Dragon Blade (3): Defeat one damaged enemy Hero.',
            isImplemented: true,
        },

        hanzo: {
            id: 'hanzo',
            name: 'Hanzo',
            image: 'assets/heroes/hanzo.png',
            icon: 'assets/heroes/hanzo-icon.png',
            effects: {
                hanzoEnemyEffect: {
                    id: 'hanzoEnemyEffect',
                    hero: 'hanzo',
                    player: 'enemy',
                    target: 'row',
                    type: 'damage',
                    on: 'attack',
                    value: 1,
                },
            },
            health: 4,
            power: {
                f: 1,
                m: 3,
                b: 2,
            },
            synergy: {
                f: 3,
                m: 1,
                b: 2,
            },
            ultimate: 'Dragonstrike (3): Deal 3 damage to all enemies in target column.',
            isImplemented: true,
        },

        junkrat: {
            id: 'junkrat',
            name: 'Junkrat',
            image: 'assets/heroes/junkrat.png',
            health: 3,
            power: {
                f: 3,
                m: 2,
                b: 1,
            },
            synergy: {
                f: 1,
                m: 2,
                b: 3,
            },
            ultimate: 'RIP-Tire (4): Choose row to move to, deal synergy damage to opposing row.',
            isImplemented: true,
        },

        lifeweaver: {
            id: 'lifeweaver',
            name: 'Lifeweaver',
            image: 'assets/heroes/lifeweaver.png',
            health: 3,
            power: {
                f: 1,
                m: 2,
                b: 3,
            },
            synergy: {
                f: 1,
                m: 2,
                b: 1,
            },
            ultimate: 'Tree of Life (2): Lifeweaver and all adjacent friendly Heroes gain +1 temporary HP until the start of your next turn.',
            isImplemented: true,
        },

        lucio: {
            id: 'lucio',
            name: 'Lucio',
            image: 'assets/heroes/lucio.png',
            icon: 'assets/heroes/lucio-icon.png',
            effects: {
                lucioAllyEffect: {
                    id: 'lucioAllyEffect',
                    hero: 'lucio',
                    player: 'ally',
                    target: 'row',
                    type: 'healing',
                    on: 'turnstart',
                    value: 1,
                },
            },
            health: 3,
            power: {
                f: 2,
                m: 1,
                b: 2,
            },
            synergy: {
                f: 2,
                m: 3,
                b: 2,
            },
            ultimate: 'Sound Barrier (3): All heroes in row gain 2 shields.',
            isImplemented: true,
        },

        mccree: {
            id: 'mccree',
            name: 'McCree',
            image: 'assets/heroes/mccree.png',
            health: 3,
            power: {
                f: 2,
                m: 3,
                b: 1,
            },
            synergy: {
                f: 2,
                m: 1,
                b: 3,
            },
            ultimate: 'Dead Eye (3): Deal 9 damage spread as evenly as possible (your choice) within a single row.',
            isImplemented: true,
        },

        mei: {
            id: 'mei',
            name: 'Mei',
            image: 'assets/heroes/mei.png',
            icon: 'assets/heroes/mei-icon.png',
            effects: {
                meiEnemyEffect: {
                    id: 'meiEnemyEffect',
                    hero: 'mei',
                    player: 'enemy',
                    target: 'row',
                    type: 'synergy',
                    // Blizzard adds; Cryo Freeze upgrades the same mark to double.
                    value: 1,
                    on: 'ultimate',
                },
            },
            health: 4,
            power: {
                f: 2,
                m: 3,
                b: 1,
            },
            synergy: {
                f: 2,
                m: 1,
                b: 3,
            },
            ultimate: 'Cryo Freeze (2): Synergy costs for Ultimates in the affected Blizzard row are doubled.',
            isImplemented: true,
        },

        mercy: {
            id: 'mercy',
            name: 'Mercy',
            image: 'assets/heroes/mercy.png',
            icon: 'assets/heroes/mercy-icon.png',
            effects: {
                mercyAllyEffect1: {
                    id: 'mercyAllyEffect1',
                    hero: 'mercy',
                    player: 'ally',
                    target: 'card',
                    type: 'healing',
                    on: 'turnstart',
                    value: 1,
                },
                mercyAllyEffect2: {
                    id: 'mercyAllyEffect2',
                    hero: 'mercy',
                    player: 'ally',
                    target: 'card',
                    type: 'damage',
                    value: 1,
                    on: 'attack',
                },
            },
            health: 3,
            power: {
                f: 1,
                m: 2,
                b: 2,
            },
            synergy: {
                f: 3,
                m: 2,
                b: 2,
            },
            ultimate: 'Guardian Angel (3): Move to friendly row and resurrect a defeated hero.',
            isImplemented: true,
        },
        moira: {
            id: 'moira',
            name: 'Moira',
            image: 'assets/heroes/moira.png',
            health: 3,
            power: {
                f: 2,
                m: 1,
                b: 2,
            },
            synergy: {
                f: 2,
                m: 3,
                b: 2,
            },
            ultimate: 'Coalescence (3): Heal allies in target column by 2; deal 2 to enemies in opposing column ignoring shields.',
            isImplemented: true,
        },

        orisa: {
            id: 'orisa',
            name: 'Orisa',
            image: 'assets/heroes/orisa.png',
            icon: 'assets/heroes/orisa-icon.png',
            effects: {
                orisaAllyEffect: {
                    id: 'orisaAllyEffect',
                    hero: 'orisa',
                    player: 'ally',
                    target: 'row',
                    type: 'damage',
                    on: 'attack',
                    value: -1,
                },
                orisaUltimateEffect: {
                    id: 'orisaUltimateEffect',
                    hero: 'orisa',
                    player: 'ally',
                    target: 'row',
                    type: 'power',
                    on: 'activate',
                    value: 'allies',
                },
            },
            health: 5,
            power: {
                f: 1,
                m: 2,
                b: 3,
            },
            synergy: {
                f: 3,
                m: 2,
                b: 1,
            },
            ultimate: 'Supercharger (3): Place Supercharger token on Orisa\'s row — +1 Power to each Hero in this row (including Orisa). Heroes that enter the row also gain +1 Power.',
            isImplemented: true,
        },

        pharah: {
            id: 'pharah',
            name: 'Pharah',
            image: 'assets/heroes/pharah.png',
            health: 4,
            power: {
                f: 1,
                m: 3,
                b: 2,
            },
            synergy: {
                f: 3,
                m: 1,
                b: 2,
            },
            ultimate: 'Barrage (3): Deal damage equal to (total synergy - cost) to up to 3 enemies. Consumes all synergy.',
            isImplemented: true,
        },

        // Added from hero.json
        ramattra: {
            id: 'ramattra',
            name: 'Ramattra',
            image: 'assets/heroes/ramattra.png',
            health: 4,
            power: { f: 1, m: 2, b: 3 },
            synergy: { f: 3, m: 2, b: 1 },
            ultimate: 'Ravenous Vortex (3): Shuffle all enemy positions in target row. Deal 2 damage to all units shuffled this way. After, remove Ramattra and put Nemesis Ramattra into your hand.',
            isImplemented: true,
        },

        nemesis: {
            id: 'nemesis',
            name: 'Ramattra (Nemesis)',
            image: 'assets/heroes/nemesis.png',
            health: 4,
            power: { f: 2, m: 2, b: 2 },
            synergy: { f: 2, m: 1, b: 1 },
            ultimate: 'Annihilation (4): All enemies in opposite row and column take 1 damage at start of turn.',
            isImplemented: true,
            special: true,
        },
        reaper: {
            id: 'reaper',
            name: 'Reaper',
            image: 'assets/heroes/reaper.png',
            health: 4,
            power: {
                f: 2,
                m: 1,
                b: 3,
            },
            synergy: {
                f: 2,
                m: 3,
                b: 1,
            },
            ultimate: 'Death Blossom (4): Discard Reaper and deal 3 damage, ignoring shields, to all enemies immediately adjacent to your enemy\'s Middle Center.',
            isImplemented: true,
        },

        reinhardt: {
            id: 'reinhardt',
            name: 'Reinhardt',
            image: 'assets/heroes/reinhardt.png',
            health: 4,
            power: {
                f: 3,
                m: 2,
                b: 1,
            },
            synergy: {
                f: 1,
                m: 2,
                b: 3,
            },
            ultimate: 'Earthshatter (3): Deal 2 damage to all enemies in target column and remove 1 synergy from all enemy rows.',
            isImplemented: true,
        },

        roadhog: {
            id: 'roadhog',
            name: 'Roadhog',
            image: 'assets/heroes/roadhog.png',
            health: 5,
            power: {
                f: 3,
                m: 2,
                b: 1,
            },
            synergy: {
                f: 1,
                m: 2,
                b: 2,
            },
            ultimate: 'Whole Hog (3): Deal (+2 per enemy) damage spread randomly between each and all enemy targets.',
            isImplemented: true,
        },

        sigma: {
            id: 'sigma',
            name: 'Sigma',
            image: 'assets/heroes/sigma.png',
            icon: 'assets/heroes/sigma-icon.png',
            health: 4,
            power: {
                f: 1,
                m: 3,
                b: 2,
            },
            synergy: {
                f: 3,
                m: 1,
                b: 2,
            },
            ultimate: 'Gravitic Flux (3): Deal 1 damage to all enemies in target row and remove all synergy.',
            isImplemented: true,
        },

        soldier: {
            id: 'soldier',
            name: 'Soldier 76',
            image: 'assets/heroes/soldier.png',
            health: 4,
            power: {
                f: 2,
                m: 3,
                b: 1,
            },
            synergy: {
                f: 2,
                m: 1,
                b: 3,
            },
            ultimate: 'Tactical Visor (3): Deal fixed damage to 3 enemies (3, 2, 1 damage).',
            isImplemented: true,
        },

        sombra: {
            id: 'sombra',
            name: 'Sombra',
            image: 'assets/heroes/sombra.png',
            health: 3,
            power: {
                f: 3,
                m: 1,
                b: 2,
            },
            synergy: {
                f: 1,
                m: 3,
                b: 2,
            },
            ultimate: 'E.M.P. (3): Remove all Hero and Shield Tokens from both sides, destroy turrets.',
            isImplemented: true,
        },

        symmetra: {
            id: 'symmetra',
            name: 'Symmetra',
            image: 'assets/heroes/symmetra.png',
            health: 3,
            power: {
                f: 2,
                m: 1,
                b: 2,
            },
            synergy: {
                f: 2,
                m: 3,
                b: 2,
            },
            ultimate: 'Shield Generator (2): Give 1 shield to all friendly deployed heroes.',
            isImplemented: true,
        },

        torbjorn: {
            id: 'torbjorn',
            name: 'Torbjorn',
            image: 'assets/heroes/torbjorn.png',
            icon: 'assets/heroes/torbjorn-icon.png',
            effects: {
                torbjornEnemyEffect: {
                    id: 'torbjornEnemyEffect',
                    hero: 'torbjorn',
                    player: 'enemy',
                    target: 'row',
                    type: 'attack',
                    on: 'turnstart',
                    value: 1,
                },
            },
            health: 3,
            power: {
                f: 3,
                m: 1,
                b: 2,
            },
            synergy: {
                f: 1,
                m: 3,
                b: 2,
            },
            ultimate: 'Forge Hammer (3): Turret now does 2 damage to two Heroes, regardless of row.',
            isImplemented: true,
        },

        tracer: {
            id: 'tracer',
            name: 'Tracer',
            image: 'assets/heroes/tracer.png',
            health: 2,
            power: {
                f: 3,
                m: 2,
                b: 1,
            },
            synergy: {
                f: 1,
                m: 2,
                b: 3,
            },
            ultimate: 'Recall (2): When Tracer dies, if her row has at least 2 synergy, spend it and return her to hand. Redeploy to fire Pulse Pistols again. Cannot Recall twice.',
            isImplemented: true,
        },

        turret: {
            id: 'turret',
            name: 'Turret',
            image: 'assets/heroes/turret.png',
            health: 3,
            power: { f: 0, m: 0, b: 0 },
            synergy: { f: 0, m: 0, b: 0 },
            isImplemented: true,
            special: true,
            turret: true,
        },

        widowmaker: {
            id: 'widowmaker',
            name: 'Widowmaker',
            image: 'assets/heroes/widowmaker.png',
            icon: 'assets/heroes/widowmaker-icon.png',
            effects: {
                widowmakerEnemyEffect: {
                    id: 'widowmakerEnemyEffect',
                    hero: 'widowmaker',
                    player: 'enemy',
                    target: 'row',
                    type: 'damage',
                    on: 'attack',
                    value: 1,
                },
            },
            health: 3,
            power: {
                f: 1,
                m: 1,
                b: 3,
            },
            synergy: {
                f: 1,
                m: 2,
                b: 2,
            },
            ultimate: 'Widow\'s Kiss (3): Defeat target enemy in opposing row.',
            isImplemented: true,
        },

        winston: {
            id: 'winston',
            name: 'Winston',
            image: 'assets/heroes/winston.png',
            health: 4,
            power: {
                f: 3,
                m: 2,
                b: 1,
            },
            synergy: {
                f: 1,
                m: 2,
                b: 3,
            },
            ultimate: 'Primal Rage (3): Winston leaps to a random friendly row and randomly shuffles 1-5 enemies around the board. Enemies take 1 damage each time they\'re shuffled.',
            isImplemented: true,
        },

        wreckingball: {
            id: 'wreckingball',
            name: 'Wrecking Ball',
            image: 'assets/heroes/wreckingball.png',
            icon: 'assets/heroes/wreckingball-icon.png',
            effects: {
                wreckingballEnemyEffect: {
                    id: 'wreckingballEnemyEffect',
                    hero: 'wreckingball',
                    player: 'enemy',
                    target: 'row',
                    type: 'attack',
                    value: 2,
                    on: 'ability',
                    health: 'synergy',
                },
            },
            health: 3,
            power: {
                f: 2,
                m: 3,
                b: 1,
            },
            synergy: {
                f: 2,
                m: 1,
                b: 3,
            },
            ultimate: 'Minefield (varies): Deploy minefield on enemy row with charges equal to current synergy. Deals 2 damage on movement.',
            isImplemented: true,
        },

        zarya: {
            id: 'zarya',
            name: 'Zarya',
            image: 'assets/heroes/zarya.png',
            icon: 'assets/heroes/zarya-icon.png',
            health: 4,
            power: {
                f: 2,
                m: 3,
                b: 1,
            },
            synergy: {
                f: 2,
                m: 1,
                b: 3,
            },
            ultimate: 'Particle Cannon (3): Deal (4 - zarya tokens) damage to up to 3 enemies (minimum 1 damage).',
            isImplemented: true,
            zaryaShieldRemaining: 0,
        },

        zenyatta: {
            id: 'zenyatta',
            name: 'Zenyatta',
            image: 'assets/heroes/zenyatta.png',
            icon: 'assets/heroes/zenyatta-icon.png',
            effects: {
                zenyattaAllyEffect: {
                    id: 'zenyattaAllyEffect',
                    hero: 'zenyatta',
                    player: 'ally',
                    target: 'card',
                    type: 'healing',
                    on: 'turnstart',
                    value: 1,
                },
                zenyattaEnemyEffect: {
                    id: 'zenyattaEnemyEffect',
                    hero: 'zenyatta',
                    player: 'enemy',
                    target: 'card',
                    type: 'damage',
                    on: 'attack',
                    value: 1,
                },
            },
            health: 2,
            power: {
                f: 2,
                m: 2,
                b: 1,
            },
            synergy: {
                f: 2,
                m: 2,
                b: 3,
            },
            ultimate: 'Transcendence (3): Heal all allies in Zenyatta\'s row by 2, make Zenyatta immune to damage for remainder of round.',
            isImplemented: true,
        },

        hazard: {
            id: 'hazard',
            name: 'Hazard',
            image: 'assets/heroes/hazard.png',
            icon: 'assets/heroes/hazard-icon.png',
            health: 4,
            power: { f: 1, m: 2, b: 2 },
            synergy: { f: 2, m: 2, b: 2 },
            ultimate: 'Downpour (3): Deal 1 damage to all enemies ignoring shields.',
            isImplemented: true,
        },

        mauga: {
            id: 'mauga',
            name: 'Mauga',
            image: 'assets/heroes/mauga.png',
            icon: 'assets/heroes/mauga-icon.png',
            health: 4,
            power: { f: 3, m: 1, b: 1 },
            synergy: { f: 3, m: 1, b: 1 },
            ultimate: 'Cage Fight (4): Mauga\'s opposing row becomes locked as long as Mauga is alive. No heroes can enter or leave. Then, Mauga deals all heroes in that row damage based on the difference between their and Mauga\'s HP respectively.',
            isImplemented: true,
        },

        junkerqueen: {
            id: 'junkerqueen',
            name: 'Junker Queen',
            image: 'assets/heroes/junkerqueen.png',
            icon: 'assets/heroes/junkerqueen-icon.png',
            health: 3,
            power: { f: 1, m: 3, b: 2 },
            synergy: { f: 2, m: 2, b: 1 },
            ultimate: 'Rampage (3): Distribute total wound damage this round evenly among all living enemies.',
            isImplemented: true,
        },

        venture: {
            id: 'venture',
            name: 'Venture',
            image: 'assets/heroes/venture.png',
            icon: 'assets/heroes/venture-icon.png',
            health: 4,
            power: { f: 2, m: 3, b: 2 },
            synergy: { f: 1, m: 1, b: 2 },
            ultimate: 'Tectonic Shock (4): Shuffle all enemy positions, then deal 2 damage to enemy in Venture\'s column.',
            isImplemented: true,
        },

        bravox2: {
            id: 'bravox2',
            name: 'Bravo-X2',
            image: 'assets/heroes/bravox2.png',
            health: 3,
            power: { f: 2, m: 1, b: 2 },
            synergy: { f: 1, m: 2, b: 2 },
            ultimate: 'Hyperion Cannon (4): Deal damage to an enemy Hero equal to unused synergy on their side. Overkill spreads randomly among other enemy Heroes.',
            isImplemented: true,
        },
        cyclo: {
            id: 'cyclo',
            name: 'Cyclo',
            image: 'assets/heroes/cyclo.png',
            health: 4,
            power: { f: 3, m: 2, b: 1 },
            synergy: { f: 1, m: 1, b: 1 },
            ultimate: 'Turbojack (3): Ram an enemy Hero for up to 3, ignoring shields. If they survive, reshuffle into their deck keeping HP. Cyclo moves to front.',
            isImplemented: true,
        },
        emre: {
            id: 'emre',
            name: 'Emre',
            image: 'assets/heroes/emre.png',
            health: 3,
            power: { f: 2, m: 2, b: 2 },
            synergy: { f: 1, m: 2, b: 1 },
            ultimate: 'Override Protocol (3): Deal 0-3 damage to every enemy on the board.',
            isImplemented: true,
        },
        fika: {
            id: 'fika',
            name: 'Fika',
            image: 'assets/heroes/fika.png',
            health: 2,
            power: { f: 3, m: 3, b: 3 },
            synergy: { f: 1, m: 1, b: 1 },
            ultimate: 'Catnap (4): Move into an enemy row. Up to 3 nearest enemies there have ultimates disabled. Fika power counts for the enemy.',
            isImplemented: true,
        },
        rajah: {
            id: 'rajah',
            name: 'Rajah',
            image: 'assets/heroes/rajah.png',
            health: 3,
            power: { f: 1, m: 2, b: 1 },
            synergy: { f: 2, m: 1, b: 2 },
            ultimate: 'Sandstorm (3): Direct targeting of all units is disabled until the start of your next turn.',
            isImplemented: true,
        },
        mirage: {
            id: 'mirage',
            name: 'Rajah',
            image: 'assets/heroes/rajah.png',
            // Matches Rajah's health so the counter on the card is not a tell.
            // Any damage, enemy targeted ability, or enemy movement pops it and
            // Disorients the source. Displayed HP stays 3 until it dies.
            health: 3,
            power: { f: 1, m: 2, b: 1 },
            synergy: { f: 0, m: 0, b: 0 },
            ultimate: '',
            special: true,
            isImplemented: true,
        },
        warden: {
            id: 'warden',
            name: 'Warden',
            image: 'assets/heroes/warden.png',
            health: 3,
            power: { f: 1, m: 3, b: 1 },
            synergy: { f: 1, m: 3, b: 1 },
            ultimate: 'Seeker Drone (3): Next enemy card that comes into play takes up to 3 damage after its ability resolves.',
            isImplemented: true,
        },
        wuyang: {
            id: 'wuyang',
            name: 'Wuyang',
            image: 'assets/heroes/wuyang.png',
            health: 3,
            power: { f: 1, m: 2, b: 2 },
            synergy: { f: 3, m: 2, b: 2 },
            ultimate: 'Guardian Tide (3): Heal all allies in front of Wuyang by 1 and push all enemies back 1 row.',
            isImplemented: true,
        },
        sylvain: {
            id: 'sylvain',
            name: 'Sylvain',
            image: 'assets/heroes/sylvain.png',
            health: 3,
            power: { f: 1, m: 1, b: 2 },
            synergy: { f: 2, m: 2, b: 2 },
            ultimate: 'Killswitch (2): Destroy Structures and Armor in a Tripwire row, then 2 damage to all Electrified enemies.',
            isImplemented: true,
        },
        axiom: {
            id: 'axiom',
            name: 'Axiom',
            image: 'assets/heroes/axiom.png',
            health: 4,
            power: { f: 2, m: 2, b: 2 },
            synergy: { f: 3, m: 2, b: 1 },
            ultimate: 'Stoneguard (3): Place a major relic with 3 HP on your side. Adds 1 Power and 1 Synergy. When defeated: 1 to its attacker and 2 adjacent enemies, +1 synergy to its row, +1 armor to up to 2 random adjacent heroes.',
            isImplemented: true,
        },
        lockjaw: {
            id: 'lockjaw',
            name: 'Lockjaw',
            image: 'assets/heroes/lockjaw.png',
            health: 4,
            power: { f: 1, m: 2, b: 2 },
            synergy: { f: 2, m: 3, b: 3 },
            ultimate: 'Crush Zone (3): Remove Clamp. Pull enemy Heroes into a target row, if able. Damage based on distance travelled. Structures unaffected.',
            isImplemented: true,
        },
        vega: {
            id: 'vega',
            name: 'Vega',
            image: 'assets/heroes/vega.png',
            health: 3,
            power: { f: 1, m: 2, b: 3 },
            synergy: { f: 2, m: 2, b: 2 },
            ultimate: 'Chronoshift (3): Activate target Ally\'s Enter ability once again.',
            isImplemented: true,
        },
        mantis: {
            id: 'mantis',
            name: 'Mantis',
            image: 'assets/heroes/mantis.png',
            health: 3,
            power: { f: 1, m: 2, b: 3 },
            synergy: { f: 1, m: 2, b: 2 },
            ultimate: 'Blade Dance (2): Deal X damage split randomly among enemy Heroes, where X is the number of enemy targets in play (heroes, turrets, and other summons).',
            isImplemented: true,
        },
        stoneguard: {
            id: 'stoneguard',
            name: 'Stoneguard',
            image: 'assets/heroes/stoneguard.png',
            health: 3,
            power: { f: 1, m: 1, b: 1 },
            synergy: { f: 1, m: 1, b: 1 },
            isImplemented: true,
            special: true,
            structure: true,
        },
    },
    playerCards: {
        player1cards: {
            id: 'player1cards',
            cards: {},
        },
        player2cards: {
            id: 'player2cards',
            cards: {},
        },
    },
    // Track which heroes have used their ultimate this round
    ultimateUsage: {
        player1: [], // Array of hero IDs that have used ultimate
        player2: [],
    },
    // Defeated heroes, per player. Entries are { heroId, playerHeroId }.
    // Fills automatically on death, empties back into the deck on reshuffle.
    graveyards: {
        player1: [],
        player2: [],
    },
    // Track the last ultimate ability used for Echo's Duplicate
    lastUltimateUsed: null, // { heroId, heroName, abilityName, playerNum, rowId, cost }
    rows: {
        player1hand: {
            id: 'player1hand',
            cardIds: [],
            cardsPlayed: 0,
            power: {
                f: 0,
                m: 0,
                b: 0,
            },
            totalPower() {
                const totalPower = Object.values(this.power).reduce(
                    (a, b) => a + b,
                    0
                );
                return totalPower;
            },
        },
        player2hand: {
            id: 'player2hand',
            cardIds: [],
            cardsPlayed: 0,
            power: {
                f: 0,
                m: 0,
                b: 0,
            },
            totalPower() {
                const totalPower = Object.values(this.power).reduce(
                    (a, b) => a + b,
                    0
                );
                return totalPower;
            },
        },
        '1b': {
            id: '1b',
            label: 'Back',
            cardIds: [],
            synergy: 0,
            allyEffects: [],
            enemyEffects: [],
            shield: [],
            totalShield() {
                let totalShield = 0;
                for (let shieldEntry of this.shield) {
                    totalShield += shieldEntry.shieldValue;
                }
                return totalShield;
            },
        },
        '1m': {
            id: '1m',
            label: 'Middle',
            cardIds: [],
            synergy: 0,
            allyEffects: [],
            enemyEffects: [],
            shield: [],
            totalShield() {
                let totalShield = 0;
                for (let shieldEntry of this.shield) {
                    totalShield += shieldEntry.shieldValue;
                }
                return totalShield;
            },
        },
        '1f': {
            id: '1f',
            label: 'Front',
            cardIds: [],
            synergy: 0,
            allyEffects: [],
            enemyEffects: [],
            shield: [],
            totalShield() {
                let totalShield = 0;
                for (let shieldEntry of this.shield) {
                    totalShield += shieldEntry.shieldValue;
                }
                return totalShield;
            },
        },
        '2f': {
            id: '2f',
            label: 'Front',
            cardIds: [],
            synergy: 0,
            allyEffects: [],
            enemyEffects: [],
            shield: [],
            totalShield() {
                let totalShield = 0;
                for (let shieldEntry of this.shield) {
                    totalShield += shieldEntry.shieldValue;
                }
                return totalShield;
            },
        },
        '2m': {
            id: '2m',
            label: 'Middle',
            cardIds: [],
            synergy: 0,
            allyEffects: [],
            enemyEffects: [],
            shield: [],
            totalShield() {
                let totalShield = 0;
                for (let shieldEntry of this.shield) {
                    totalShield += shieldEntry.shieldValue;
                }
                return totalShield;
            },
        },
        '2b': {
            id: '2b',
            label: 'Back',
            cardIds: [],
            synergy: 0,
            allyEffects: [],
            enemyEffects: [],
            shield: [],
            totalShield() {
                let totalShield = 0;
                for (let shieldEntry of this.shield) {
                    totalShield += shieldEntry.shieldValue;
                }
                return totalShield;
            },
        },
    },
};

// Automatically assign roles to all heroes
Object.keys(data.heroes).forEach(heroId => {
    if (heroRoles[heroId]) {
        data.heroes[heroId].role = heroRoles[heroId];
    }
});

export default data;
