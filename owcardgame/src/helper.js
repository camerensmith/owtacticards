import data from 'data';

// Creates a card with its own health and id unique to the playerCard, returns player-specific ID
class PlayerCard {
    constructor(playerNum, heroId) {
        this.playerNum = playerNum;
        this.heroId = heroId;

        // Get card values from data
        let heroData = data.heroes[heroId];

        // Assign values not held in data
        const playerHeroId = `${playerNum}${heroId}`;
        let shield = 0;
        const enemyEffects = [];
        const allyEffects = [];
        let isDiscarded = false;
        let ability1Used = false;
        let ability2Used = false;
        let isPlayed = false;
        const maxHealth = heroData.health;

        // Summoned heroes contain special path
        // D.Va is a normal hero, not a summoned hero

        // Extract ultimate cost from ultimate description (e.g., "Call Mech (2)" -> 2)
        const ultimateCost = heroData.ultimate ? 
            (heroData.ultimate.match(/\((\d+)\)/) ? parseInt(heroData.ultimate.match(/\((\d+)\)/)[1]) : 3) : 3;

        // Combine values into one new hero object and assign to relevant player
        const newCard = {
            playerHeroId,
            ...heroData,
            maxHealth,
            shield,
            effects: [], // Initialize effects array for all cards
            enemyEffects,
            allyEffects,
            isPlayed,
            isDiscarded,
            ability1Used,
            ability2Used,
            ultimateCost,
        };

        // Add hero effects to card, and insert playerHeroId for future use
        if ('effects' in heroData) {
            // Deep copy of effects object is needed in order to not alter the original object later on
            let heroEffects = JSON.parse(JSON.stringify(heroData.effects));
            for (let key in heroEffects) {
                heroEffects[key]['playerHeroId'] = playerHeroId;
            }
            // Merge hero effects with the initialized effects array
            newCard['effects'] = [...newCard.effects, ...Object.values(heroEffects)];
        }

        return newCard;
    }
}

// Helper function - returns random number between min (inc) and max (exc)
const getRandInt = (min, max) => {
    return Math.floor(Math.random() * (max - min)) + min;
};

// Helper function to check if the div element is overflowing
function isOverflown(element) {
    return (
        element.scrollHeight > element.clientHeight ||
        element.scrollWidth > element.clientWidth
    );
}

export default getRandInt;
export { PlayerCard, isOverflown };
