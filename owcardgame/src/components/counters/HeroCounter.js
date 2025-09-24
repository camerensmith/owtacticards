import { heroIconImages, heroCardImages } from '../../assets/imageImports';

export default function HeroCounter(props) {
    const playerHeroId = props.playerHeroId;
    const heroId = props.heroId;
    const playerNum = props.playerNum;
    const rowId = props.rowId;
    const health = props.health;
    const tooltip = props.tooltip;

    return (
        <div
            className='counter'
            onClick={(e) => {
                // Only focus card on SHIFT + LEFT CLICK
                if (e.shiftKey) {
                    props.setCardFocus({ playerHeroId: playerHeroId, rowId: rowId });
                }
            }}
            title={tooltip || ''}
        >
            <img
                src={heroIconImages[`${heroId}-icon`] || heroCardImages[heroId]}
                className='counter herocounter'
                alt='Hero Counter'
            />
            {health && (
                <span className='herocounterhealth'>
                    <h4>{health}</h4>
                </span>
            )}
        </div>
    );
}
