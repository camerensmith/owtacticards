/**
 * Local player profile: username, avatar, match/round W–L.
 * Electron file (via preload) + localStorage key owtacticards.playerProfile.
 */

export const PROFILE_STORAGE_KEY = 'owtacticards.playerProfile';

export const DEFAULT_USERNAME = 'Operative';

export function createDefaultProfile() {
    return {
        username: DEFAULT_USERNAME,
        avatarDataUrl: null,
        matchWins: 0,
        matchLosses: 0,
        roundWins: 0,
        roundLosses: 0,
    };
}

function nonNegInt(value) {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) return 0;
    return Math.floor(n);
}

/** Coerce unknown storage into a safe profile object. */
export function normalizeProfile(raw) {
    const base = createDefaultProfile();
    if (!raw || typeof raw !== 'object') return base;

    const username =
        typeof raw.username === 'string' && raw.username.trim()
            ? raw.username.trim().slice(0, 24)
            : base.username;

    const avatarDataUrl =
        typeof raw.avatarDataUrl === 'string' && raw.avatarDataUrl.startsWith('data:image/')
            ? raw.avatarDataUrl
            : null;

    return {
        username,
        avatarDataUrl,
        matchWins: nonNegInt(raw.matchWins),
        matchLosses: nonNegInt(raw.matchLosses),
        roundWins: nonNegInt(raw.roundWins),
        roundLosses: nonNegInt(raw.roundLosses),
    };
}

/**
 * Round result for Player 1 perspective.
 * @param {1|2|3} winner — 3 = draw
 */
export function recordRoundResult(profile, winner) {
    const next = normalizeProfile(profile);
    if (winner === 1) next.roundWins += 1;
    else if (winner === 2) next.roundLosses += 1;
    return next;
}

/**
 * Match result for Player 1 perspective.
 * @param {1|2} winner — draws leave totals unchanged
 */
export function recordMatchResult(profile, winner) {
    const next = normalizeProfile(profile);
    if (winner === 1) next.matchWins += 1;
    else if (winner === 2) next.matchLosses += 1;
    return next;
}

export function readLocalProfile(storage = typeof localStorage !== 'undefined' ? localStorage : null) {
    if (!storage) return createDefaultProfile();
    try {
        const raw = storage.getItem(PROFILE_STORAGE_KEY);
        if (!raw) return createDefaultProfile();
        return normalizeProfile(JSON.parse(raw));
    } catch {
        return createDefaultProfile();
    }
}

export function writeLocalProfile(profile, storage = typeof localStorage !== 'undefined' ? localStorage : null) {
    const normalized = normalizeProfile(profile);
    if (!storage) return normalized;
    try {
        storage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(normalized));
    } catch {
        // Quota / private mode — ignore
    }
    return normalized;
}

let cache = null;
const listeners = new Set();

function emit(profile) {
    cache = profile;
    listeners.forEach((fn) => {
        try {
            fn(profile);
        } catch {
            // subscriber errors must not break saves
        }
    });
}

export function getCachedProfile() {
    return cache ? { ...cache } : createDefaultProfile();
}

export function subscribePlayerProfile(listener) {
    listeners.add(listener);
    if (cache) listener(cache);
    return () => listeners.delete(listener);
}

function electronBridge() {
    if (typeof window === 'undefined') return null;
    return window.owProfile || null;
}

async function persistBoth(profile) {
    const normalized = normalizeProfile(profile);
    writeLocalProfile(normalized);
    const bridge = electronBridge();
    if (bridge?.save) {
        try {
            await bridge.save(normalized);
        } catch {
            // File write failed — localStorage still holds a copy
        }
    }
    return normalized;
}

/** Boot: Electron file → localStorage → defaults; then sync both. */
export async function loadPlayerProfile() {
    const bridge = electronBridge();
    let fromFile = null;
    if (bridge?.load) {
        try {
            fromFile = await bridge.load();
        } catch {
            fromFile = null;
        }
    }

    let profile;
    if (fromFile && typeof fromFile === 'object') {
        profile = normalizeProfile(fromFile);
    } else {
        profile = readLocalProfile();
    }

    const saved = await persistBoth(profile);
    emit(saved);
    return saved;
}

export async function savePlayerProfile(profile) {
    const saved = await persistBoth(profile);
    emit(saved);
    return saved;
}

export async function applyRoundRecord(winner) {
    const current = cache || (await loadPlayerProfile());
    const next = recordRoundResult(current, winner);
    return savePlayerProfile(next);
}

export async function applyMatchRecord(winner) {
    const current = cache || (await loadPlayerProfile());
    const next = recordMatchResult(current, winner);
    return savePlayerProfile(next);
}

/**
 * Resize an image File to a JPEG data URL (max edge ~256px).
 * @returns {Promise<string>}
 */
export function resizeImageToDataUrl(file, maxEdge = 256, quality = 0.85) {
    return new Promise((resolve, reject) => {
        if (!file || !file.type?.startsWith('image/')) {
            reject(new Error('Not an image'));
            return;
        }
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            try {
                const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
                const w = Math.max(1, Math.round(img.width * scale));
                const h = Math.max(1, Math.round(img.height * scale));
                const canvas = document.createElement('canvas');
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, w, h);
                const dataUrl = canvas.toDataURL('image/jpeg', quality);
                URL.revokeObjectURL(url);
                resolve(dataUrl);
            } catch (err) {
                URL.revokeObjectURL(url);
                reject(err);
            }
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Image load failed'));
        };
        img.src = url;
    });
}

/** Test helper: clear in-memory cache between suites. */
export function __resetPlayerProfileCacheForTests() {
    cache = null;
}
