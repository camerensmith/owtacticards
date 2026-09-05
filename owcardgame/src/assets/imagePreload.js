import { heroCardImages } from './imageImports';

/**
 * Pulls every hero card face into the browser's image cache.
 *
 * The AI's hand is dealt face-down, so a card it plays has never been rendered
 * face-up anywhere: when it lands on the board the `<img>` src switches from
 * the card back to art the browser has never fetched, and the slot sits empty
 * until it loads. That is the gap where an enemy hero seems to vanish before
 * reappearing on the field.
 *
 * Warming it once per match costs nothing visible — the same files back the
 * player's own hand — and makes the swap instant for both sides.
 *
 * This is the DOM image cache, which is not the same store as the GPU textures
 * `preloadCardTextures` uploads for the flying sprite. Both are needed.
 */
export function preloadHeroCardImages() {
    if (typeof Image !== 'function') return 0;
    let started = 0;
    for (const url of Object.values(heroCardImages)) {
        if (!url) continue;
        try {
            const img = new Image();
            img.decoding = 'async';
            img.src = url;
            started += 1;
        } catch {
            // A card that will not preload still renders, just later.
        }
    }
    return started;
}
