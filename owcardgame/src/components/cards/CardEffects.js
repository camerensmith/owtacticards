import HeroCounter from 'components/counters/HeroCounter';

export default function CardEffects(props) {
    const type = props.type;
    const effects = props.effects;

    return (
        <div className={`effectscontainer ${type}effects`}>
            {effects.length > 0 ? (
                <div className={`effects counterarea`}>
                    {effects &&
                        effects.map((effect) => {
                            return (
                                <HeroCounter
                                    heroId={effect.hero}
                                    key={effect.hero}
                                    playerHeroId={effect.playerHeroId}
                                    health={effect.health}
                                    setCardFocus={props.setCardFocus}
                                />
                            );
                        })}
                </div>
            ) : null}
        </div>
    );
}
