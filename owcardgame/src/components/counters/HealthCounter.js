export default function HealthCounter(props) {
    const type = props.type;
    const { health, effects, playerHeroId } = props;

    // Debug logging
    console.log(`HealthCounter for ${playerHeroId}:`, { health, effects, effectsLength: effects?.length });

    // Check for temporary HP effect
    const hasTempHP = Array.isArray(effects) && 
        effects.some(effect => effect?.id === 'temp-hp-display' && effect?.type === 'display');
    
    let displayHealth = health;
    let isTemporary = false;
    
    if (hasTempHP) {
        const tempHPEffect = effects.find(effect => 
            effect?.id === 'temp-hp-display' && effect?.type === 'display'
        );
        if (tempHPEffect && tempHPEffect.tempHP) {
            displayHealth = tempHPEffect.tempHP;
            isTemporary = true;
            console.log(`HealthCounter: Showing temporary HP ${displayHealth} for ${playerHeroId}`);
        }
    } else {
        console.log(`HealthCounter: Showing normal HP ${displayHealth} for ${playerHeroId}`);
    }

    return (
        <div className={`healthcounter counter ${type} ${isTemporary ? 'temporary-hp' : ''}`}>
            <span className={`healthvalue ${isTemporary ? 'temp-hp-value' : ''}`}>
                {displayHealth}
            </span>
        </div>
    );
}
