export function createDirector({ animatePlay, commitPlay, watchdogMs = 8000 } = {}) {
    let locked = false;
    let destroyed = false;

    function isLocked() {
        return locked;
    }

    function destroy() {
        destroyed = true;
        locked = false;
    }

    async function runPlayCard(intent) {
        let settled = false;
        const finish = () => {
            if (settled || destroyed) return;
            settled = true;
            try {
                commitPlay(intent);
            } finally {
                locked = false;
            }
        };

        const fly = Promise.resolve()
            .then(() => animatePlay(intent))
            .then(() => {
                finish();
            });

        const watchdog = new Promise((resolve) => {
            const timer = setTimeout(() => {
                if (!settled) {
                    console.warn('PresentationDirector: watchdog fired');
                    finish();
                }
                resolve();
            }, watchdogMs);
            fly.finally(() => clearTimeout(timer));
        });

        await Promise.race([fly, watchdog]);
        if (!settled && !destroyed) finish();
    }

    function enqueue(intent) {
        if (destroyed || locked || !intent || intent.type !== 'PlayCard') {
            return false;
        }
        locked = true;
        return runPlayCard(intent);
    }

    return { enqueue, isLocked, destroy };
}
