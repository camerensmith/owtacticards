export default function ShieldCounter(props) {
    const shield = props.shield;
    const type = props.type;

    return (
        <div className={`shieldcounter counter ${type}`}>
            <span className='shieldvalue'>{shield}</span>
        </div>
    );
}
