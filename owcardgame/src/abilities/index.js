// Aggregate abilities here as we migrate heroes to per-file modules.
// Initially empty; HeroAbilities.js will continue to define most logic
// until migration progresses.

import ashe from './heroes/ashe';
import bob from './heroes/bob';
import ana from './heroes/ana';

export const abilities = {
    ashe,
    bob,
    ana,
};

export default abilities;


