// Simple bus to draw a line/arrow from a source element (card) to the cursor

const listeners = new Set();
let arrowSourceId = null; // element id to originate from

export function subscribe(listener) {
    listeners.add(listener);
    try { listener(arrowSourceId); } catch (e) {}
    return () => listeners.delete(listener);
}

export function setArrowSource(elementId) {
    arrowSourceId = elementId;
    for (const l of listeners) {
        try { l(arrowSourceId); } catch (e) {}
    }
}

export function clearArrow() {
    setArrowSource(null);
}

export default { subscribe, setArrowSource, clearArrow };


