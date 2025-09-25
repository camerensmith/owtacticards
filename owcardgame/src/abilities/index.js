// Aggregate abilities here as we migrate heroes to per-file modules.
// Initially empty; HeroAbilities.js will continue to define most logic
// until migration progresses.

import ashe from './heroes/ashe';
import bob from './heroes/bob';
import ana from './heroes/ana';
import baptiste from './heroes/baptiste';
import bastion from './heroes/bastion';
import brigitte from './heroes/brigitte';
import doomfist from './heroes/doomfist';

export const abilities = {
    ashe,
    bob,
    ana,
    baptiste,
    bastion,
    brigitte,
    doomfist,
};

export default abilities;


