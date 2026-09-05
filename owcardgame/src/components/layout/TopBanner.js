import React, { useEffect, useState } from 'react';
import { subscribe } from '../../abilities/engine/targetingBus';
import './TopBanner.css';

export default function TopBanner() {
    const [message, setMessage] = useState(null);

    useEffect(() => {
        const unsubMsg = subscribe(setMessage);
        return () => { unsubMsg && unsubMsg(); };
    }, []);

    return (
        <div>
            {message && (
                <div className='top-banner'>
                    {message}
                </div>
            )}
        </div>
    );
}
