export default function PowerCounter(props) {
    return (
        <span className='power'>
            <span
                id={`player${props.playerNum}power`}
                className='powercounter counter'
            >
                <span id={props.id} className='powervalue'>
                    {props.power}
                </span>
            </span>
        </span>
    );
}
