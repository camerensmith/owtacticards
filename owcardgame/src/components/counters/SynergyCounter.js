export default function SynergyCounter(props) {
    return (
        <div className='synergycontainer'>
            <div className='synergycounter counter rowcounter'>
                <span id={props.id}>
                    <h4>{props.synergy}</h4>
                </span>
            </div>
        </div>
    );
}
