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
    venture: 'offense'
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
            ultimate: 'Nano Boost (3): Place an Ana token in Ana\'s row. Token adds power equal to number of heroes in that row.',
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
            ultimate: 'Smash (1): Deal 1 damage and 1 Synergy damage to up to 3 adjacent enemies in target row.',
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
            ultimate: 'Shield Bash (3): Gain 2 shields, turn target enemy 180°, lock their ultimate.',
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
                b: 1,
            },
            synergy: {
                f: 1,
                m: 2,
                b: 3,
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
                f: 0,
                m: 0,
                b: 0,
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
            ultimate: 'Self Destruct (1): Deal 4 damage to all opponents AND allies in D.Va+MEKA\'s row and the opposing row. Replace D.Va+MEKA with D.Va, and remove D.Va+MEKA from the game.',
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
            ultimate: 'Duplicate (2): Copy the last ultimate ability that was used.',
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
            ultimate: 'Tree of Life (3): Give temporary HP to Lifeweaver and adjacent friendly heroes.',
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
            ultimate: 'Dead Eye (3): Deal 2 damage to all enemies in target row.',
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
                    value: 'double',
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
            ultimate: 'Cryo Freeze (3): Freeze target hero - immune to damage and abilities for remainder of round.',
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
            ultimate: 'Supercharger (3): Place Supercharger token on Orisa\'s row - +1 Synergy per Hero in this row.',
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
            ultimate: 'Ravenous Vortex (3): Pull enemies from target enemy row into the opposing ally row.',
            isImplemented: true,
        },

        nemesis: {
            id: 'nemesis',
            name: 'Ramattra (Nemesis)',
            image: 'assets/heroes/nemesis.png',
            health: 4,
            power: { f: 2, m: 2, b: 2 },
            synergy: { f: 2, m: 1, b: 1 },
            ultimate: 'Annihilation (3): All enemies in opposite row and column take 1 damage at start of turn.',
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
            ultimate: 'Death Blossom (4): Deal 3 damage to all living enemies in opposing row (ignores shields), then discard Reaper.',
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
            ultimate: 'Whole Hog (3)',
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
            ultimate: 'Shield Generator (3): Give 1 shield to all friendly deployed heroes.',
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
            ultimate: 'Recall (2): Automatic - activates when taking fatal damage to avoid death and restore HP.',
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
            ultimate: 'Primal Rage (3): Move to target row and deal 2 damage to all living enemies in selected adjacent enemy row.',
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
            ultimate: 'Cage Fight (3): Lock opposing row until end of round; deal HP difference to enemy opposite Mauga if Mauga HP > target HP.',
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
            ultimate: 'Tectonic Shock (3): Shuffle all enemy positions, then deal 2 damage to enemy in Venture\'s column.',
            isImplemented: true,
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
