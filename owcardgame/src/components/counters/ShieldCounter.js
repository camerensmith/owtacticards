export default function ShieldCounter(props) {
    const shield = props.shield;
    const type = props.type;
    const isOvershield = shield > 3;

    return (
        <div className={`shieldcounter counter ${type} ${isOvershield ? 'overshield' : ''}`}>
            <span className={`shieldvalue ${isOvershield ? 'overshield-value' : ''}`}>{shield}</span>
        </div>
    );
}
