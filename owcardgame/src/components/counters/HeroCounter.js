import { heroIconImages, heroCardImages } from '../../assets/imageImports';
import ShieldCounter from './ShieldCounter';

export default function HeroCounter(props) {
    const playerHeroId = props.playerHeroId;
    const heroId = props.heroId;
    const playerNum = props.playerNum;
    const rowId = props.rowId;
    const health = props.health;
    const tooltip = props.tooltip;
    const shields = props.shields;

    return (
        <div
            className='counter'
            style={{ position: 'relative' }}
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
            {shields && shields > 0 && (
                <div style={{ 
                    position: 'absolute', 
                    top: '50%', 
                    left: '50%', 
                    transform: 'translate(-50%, -50%)',
                    zIndex: 1000
                }}>
                    <div style={{ 
                        fontSize: '12px',
                        fontWeight: 'bold',
                        color: '#00ff00',
                        textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                        background: 'rgba(0, 0, 0, 0.7)',
                        borderRadius: '50%',
                        width: '20px',
                        height: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px solid #00ff00'
                    }}>
                        {shields}
                    </div>
                </div>
            )}
        </div>
    );
}
