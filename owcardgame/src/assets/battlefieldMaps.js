import antarctica from './maps/antarctica.png';
import busan from './maps/busan.png';
import circuitroyale from './maps/circuitroyale.png';
import colosseo from './maps/colosseo.png';
import eichenwalde from './maps/eichenwalde.png';
import hanamura from './maps/hanamura.png';
import havana from './maps/havana.png';
import kingsrow from './maps/kingsrow.png';
import lijiang from './maps/lijiang.png';
import nepal from './maps/nepal.png';
import numbani from './maps/numbani.png';
import paraiso from './maps/paraiso.png';
import rialto from './maps/rialto.png';
import route66 from './maps/route66.png';

/**
 * One entry per playable battlefield. `id` matches the art filename and the
 * `announcer-<id>` clip when that VO exists.
 */
export const BATTLEFIELD_MAPS = [
    { id: 'antarctica', displayName: 'Antarctica', image: antarctica, announcerKey: 'announcer-antarctica' },
    { id: 'busan', displayName: 'Busan', image: busan, announcerKey: 'announcer-busan' },
    { id: 'circuitroyale', displayName: 'Circuit Royale', image: circuitroyale, announcerKey: 'announcer-circuitroyale' },
    { id: 'colosseo', displayName: 'Colosseo', image: colosseo, announcerKey: 'announcer-colosseo' },
    { id: 'eichenwalde', displayName: 'Eichenwalde', image: eichenwalde, announcerKey: 'announcer-eichenwalde' },
    { id: 'hanamura', displayName: 'Hanamura', image: hanamura, announcerKey: 'announcer-hanamura' },
    { id: 'havana', displayName: 'Havana', image: havana, announcerKey: 'announcer-havana' },
    { id: 'kingsrow', displayName: "King's Row", image: kingsrow, announcerKey: 'announcer-kingsrow' },
    { id: 'lijiang', displayName: 'Lijiang Tower', image: lijiang, announcerKey: null },
    { id: 'nepal', displayName: 'Nepal', image: nepal, announcerKey: 'announcer-nepal' },
    { id: 'numbani', displayName: 'Numbani', image: numbani, announcerKey: 'announcer-numbani' },
    { id: 'paraiso', displayName: 'Paraíso', image: paraiso, announcerKey: 'announcer-paraiso' },
    { id: 'rialto', displayName: 'Rialto', image: rialto, announcerKey: 'announcer-rialto' },
    { id: 'route66', displayName: 'Route 66', image: route66, announcerKey: 'announcer-route66' },
];

export const BATTLEFIELD_MAP_OPACITY = 0.3;

/** Hold after map VO before the title card begins fading out. */
export const MAP_TITLE_HOLD_AFTER_VO_MS = 400;

/** Fade duration for the full-bleed title card → board. */
export const MAP_TITLE_FADE_MS = 900;

/** Fallback if a map has no announcer clip. */
export const MAP_TITLE_NO_VO_MS = 1800;

export function pickBattlefieldMap(random = Math.random) {
    const maps = BATTLEFIELD_MAPS;
    if (!maps.length) return null;
    const index = Math.min(maps.length - 1, Math.floor(random() * maps.length));
    return maps[index];
}
