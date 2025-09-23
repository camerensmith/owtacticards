import { useEffect } from 'react';

function Counter(props) {

    const styles = {
        power: {
            display: 'inline-flex',
            justifyContent: 'center',
            alignItems: 'center',
            width: '20px',
            height: '20px',
            backgroundColor: '#fa9c1e',
            color: 'white',
            borderRadius: '50%',
            fontSize: '1.5em',
        },
        match: {
            width: '20px',
            height: '20px',
            backgroundColor: '#fa9c1e',
            color: 'black',
            fontSize: '1.5em',
            margin: '2px',
        },
        health: {
            width: '20px',
            height: '20px',
            fontSize: '0.8em',
            borderRadius: '100%',
        },
        tutorial: {
            display: 'inline-flex',
            justifyContent: 'center',
            alignItems: 'center',
            borderRadius: '50%',
            margin: '4px',
            fontFamily: 'Big-Noodle-Titling',
        },
        synergy: {
            width: '20px',
            height: '20px',
            color: 'white',
            fontSize: '1em',
            border: '3px solid steelblue',
            backgroundColor: '#3f547a',
        },
        effect: {}
    };

    let composedStyle = {};
    useEffect(() => {
        function setStyles() {
            props.styles.forEach(style => {
                composedStyle = {...composedStyle, ...styles[style]};
            });
        }
        setStyles();
    });

    return (
        <span style={composedStyle}>
            {props.value}
        </span>
    );
}

export default Counter;