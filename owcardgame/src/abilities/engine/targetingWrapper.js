// Wrapper to add defensive checks to targeting functions
import { selectCardTarget as originalSelectCardTarget, selectRowTarget as originalSelectRowTarget } from './targeting';

export async function selectCardTarget(options = {}) {
    const result = await originalSelectCardTarget(options);
    
    if (!result) {
        console.warn('selectCardTarget returned null/undefined');
        return null;
    }
    
    if (!result.cardId) {
        console.error('selectCardTarget returned object without cardId:', result);
        return null;
    }
    
    return result;
}

export async function selectRowTarget(options = {}) {
    const result = await originalSelectRowTarget(options);
    
    if (!result) {
        console.warn('selectRowTarget returned null/undefined');
        return null;
    }
    
    if (!result.rowId) {
        console.error('selectRowTarget returned object without rowId:', result);
        return null;
    }
    
    return result;
}
