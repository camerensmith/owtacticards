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
        if (heroId === 'dva') {
            isPlayed = true;
        }

        // Combine values into one new hero object and assign to relevant player
        const newCard = {
            playerHeroId,
            ...heroData,
            maxHealth,
            shield,
            enemyEffects,
            allyEffects,
            isPlayed,
            isDiscarded,
            ability1Used,
            ability2Used,
        };

        // Add hero effects to card, and insert playerHeroId for future use
        if ('effects' in heroData) {
            // Deep copy of effects object is needed in order to not alter the original object later on
            let effects = JSON.parse(JSON.stringify(heroData.effects));
            for (let key in effects) {
                effects[key]['playerHeroId'] = playerHeroId;
            }
            newCard['effects'] = effects;
        }

        console.log(newCard);

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
