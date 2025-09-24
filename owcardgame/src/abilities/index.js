// Aggregate abilities here as we migrate heroes to per-file modules.
// Initially empty; HeroAbilities.js will continue to define most logic
// until migration progresses.

import ashe from './heroes/ashe';
import bob from './heroes/bob';

export const abilities = {
    ashe,
    bob,
};

export default abilities;


