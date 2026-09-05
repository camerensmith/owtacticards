export function usesEnemyTargetCursor(options = {}) {
    if (options.isHeal === true || options.isBuff === true) return false;
    return true;
}

export function enemyTargetCursorCss(crosshairUrl) {
    if (!crosshairUrl) return 'crosshair';
    return `url(${crosshairUrl}) 5 5, crosshair`;
}
