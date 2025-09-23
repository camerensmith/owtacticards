import BoardRow from './BoardRow';
import data from 'data';

export default function PlayerBoard(props) {
    const rows = data.rows;

    // Renders board rows according to the order in data.rows
    // Not ideal, but apparently Object.keys order is reliable
    return (
        <div id={`player${props.playerNum}board`} className='board'>
            {Object.keys(rows).map((rowId) => {
                if (parseInt(rowId[0]) === props.playerNum) {
                    return (
                        <BoardRow
                            setCardFocus={props.setCardFocus}
                            playerNum={props.playerNum}
                            label={rows[rowId].label}
                            rowId={rows[rowId].id}
                            key={rows[rowId].id}
                        />
                    );
                } else return null;
            })}
        </div>
    );
}
