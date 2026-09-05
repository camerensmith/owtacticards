import { useEffect, useState } from 'react';
import { playClip } from '../../abilities/engine/soundController';
import {
    MAP_TITLE_FADE_MS,
    MAP_TITLE_HOLD_AFTER_VO_MS,
    MAP_TITLE_NO_VO_MS,
} from '../../assets/battlefieldMaps';
import './MatchMapTitleCard.css';

/**
 * Full-bleed map splash before the board. Plays the map announcer, holds the
 * name, then fades out to reveal the match (map already at board opacity).
 */
export default function MatchMapTitleCard({ map, onComplete }) {
    const [fading, setFading] = useState(false);

    useEffect(() => {
        if (!map) return undefined;
        let cancelled = false;
        let holdTimer;

        (async () => {
            if (map.announcerKey) {
                await playClip(map.announcerKey, {
                    awaitEnd: true,
                    fallbackMs: 2800,
                });
            } else {
                await new Promise((resolve) => {
                    holdTimer = setTimeout(resolve, MAP_TITLE_NO_VO_MS);
                });
            }
            if (cancelled) return;
            holdTimer = setTimeout(() => {
                if (!cancelled) setFading(true);
            }, MAP_TITLE_HOLD_AFTER_VO_MS);
        })();

        return () => {
            cancelled = true;
            if (holdTimer) clearTimeout(holdTimer);
        };
    }, [map]);

    if (!map) return null;

    return (
        <div
            className={`match-map-title${fading ? ' is-fading' : ''}`}
            style={{
                backgroundImage: `url(${map.image})`,
                transitionDuration: `${MAP_TITLE_FADE_MS}ms`,
            }}
            onTransitionEnd={(event) => {
                if (event.propertyName !== 'opacity' || !fading) return;
                onComplete?.();
            }}
            role="presentation"
            aria-hidden="true"
        >
            <div className="match-map-title__veil" />
            <h1 className="match-map-title__name">{map.displayName}</h1>
        </div>
    );
}
