// Central damage bus: decouples hero modules from UI/components.
// Publish a damage intent; HeroAbilities subscribes and applies real damage.

const listeners = new Set();

export function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

export function publish(event) {
    // Expected shape: { type: 'damage', targetCardId, targetRow, amount, ignoreShields }
    for (const l of listeners) {
        try { l(event); } catch (e) {}
    }
}

export function dealDamage(targetCardId, targetRow, amount, ignoreShields = false) {
    const damageEvent = { type: 'damage', targetCardId, targetRow, amount, ignoreShields };
    console.log('DamageBus - Publishing damage event:', damageEvent);
    publish(damageEvent);
}

export default { subscribe, publish, dealDamage };


