import {
    PROFILE_STORAGE_KEY,
    createDefaultProfile,
    normalizeProfile,
    recordRoundResult,
    recordMatchResult,
    readLocalProfile,
    writeLocalProfile,
    loadPlayerProfile,
    savePlayerProfile,
    applyRoundRecord,
    applyMatchRecord,
    __resetPlayerProfileCacheForTests,
} from './playerProfile';

beforeEach(() => {
    __resetPlayerProfileCacheForTests();
    localStorage.clear();
    delete window.owProfile;
});

describe('normalizeProfile', () => {
    test('defaults for null / garbage', () => {
        expect(normalizeProfile(null)).toEqual(createDefaultProfile());
        expect(normalizeProfile('x')).toEqual(createDefaultProfile());
    });

    test('clamps username and counters', () => {
        const p = normalizeProfile({
            username: '  Tracer  ',
            avatarDataUrl: 'data:image/png;base64,abc',
            matchWins: 3.9,
            matchLosses: -2,
            roundWins: '5',
            roundLosses: undefined,
        });
        expect(p.username).toBe('Tracer');
        expect(p.avatarDataUrl).toBe('data:image/png;base64,abc');
        expect(p.matchWins).toBe(3);
        expect(p.matchLosses).toBe(0);
        expect(p.roundWins).toBe(5);
        expect(p.roundLosses).toBe(0);
    });

    test('rejects non-image avatar strings', () => {
        expect(normalizeProfile({ avatarDataUrl: 'https://evil' }).avatarDataUrl).toBeNull();
    });
});

describe('record helpers', () => {
    test('round win / loss / draw', () => {
        const base = createDefaultProfile();
        expect(recordRoundResult(base, 1).roundWins).toBe(1);
        expect(recordRoundResult(base, 2).roundLosses).toBe(1);
        expect(recordRoundResult(base, 3)).toEqual(base);
    });

    test('match win / loss / ignore draw', () => {
        const base = createDefaultProfile();
        expect(recordMatchResult(base, 1).matchWins).toBe(1);
        expect(recordMatchResult(base, 2).matchLosses).toBe(1);
        expect(recordMatchResult(base, 3)).toEqual(base);
    });
});

describe('localStorage', () => {
    test('round-trips through read/write', () => {
        const written = writeLocalProfile({
            username: 'Ana',
            matchWins: 2,
            matchLosses: 1,
            roundWins: 4,
            roundLosses: 3,
        });
        expect(localStorage.getItem(PROFILE_STORAGE_KEY)).toBeTruthy();
        expect(readLocalProfile()).toEqual(written);
    });
});

describe('load / save with Electron bridge', () => {
    test('prefers Electron file when present', async () => {
        const fromFile = {
            username: 'Echo',
            matchWins: 9,
            matchLosses: 1,
            roundWins: 20,
            roundLosses: 8,
            avatarDataUrl: null,
        };
        window.owProfile = {
            load: jest.fn(async () => fromFile),
            save: jest.fn(async () => {}),
        };
        const loaded = await loadPlayerProfile();
        expect(loaded.username).toBe('Echo');
        expect(loaded.matchWins).toBe(9);
        expect(window.owProfile.save).toHaveBeenCalled();
        expect(readLocalProfile().username).toBe('Echo');
    });

    test('falls back to localStorage when Electron returns null', async () => {
        writeLocalProfile({ username: 'Winston', matchWins: 1 });
        window.owProfile = {
            load: jest.fn(async () => null),
            save: jest.fn(async () => {}),
        };
        const loaded = await loadPlayerProfile();
        expect(loaded.username).toBe('Winston');
        expect(window.owProfile.save).toHaveBeenCalled();
    });

    test('applyRoundRecord and applyMatchRecord persist', async () => {
        await loadPlayerProfile();
        await applyRoundRecord(1);
        await applyMatchRecord(2);
        const p = readLocalProfile();
        expect(p.roundWins).toBe(1);
        expect(p.matchLosses).toBe(1);
    });

    test('savePlayerProfile updates cache subscribers', async () => {
        const seen = [];
        const { subscribePlayerProfile } = await import('./playerProfile');
        const unsub = subscribePlayerProfile((p) => seen.push(p.username));
        await savePlayerProfile({ username: 'Mei' });
        unsub();
        expect(seen).toContain('Mei');
    });
});
