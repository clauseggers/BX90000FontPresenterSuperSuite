// =============================================================================
// shared/FontSession.js
// Persists the loaded font binary across page navigations via sessionStorage.
// =============================================================================

const STORAGE_KEY      = 'bx90000_font';
const INSTANCE_KEY     = 'bx90000_instance';
const AXIS_KEY         = 'bx90000_axes';
const LAST_CHANGED_KEY = 'bx90000_last_changed';
const HYPERFLIP_KEY    = 'bx90000_hyperflip';

/**
 * Saves the selected named instance index to sessionStorage.
 * Pass null to clear any saved instance.
 * @param {number|null} index
 */
export function saveInstanceIndex(index) {
    if (index === null || index === undefined) {
        sessionStorage.removeItem(INSTANCE_KEY);
    } else {
        sessionStorage.setItem(INSTANCE_KEY, String(index));
    }
}

/**
 * Retrieves the saved named instance index, or null if none saved.
 * @returns {number|null}
 */
export function getSavedInstanceIndex() {
    const val = sessionStorage.getItem(INSTANCE_KEY);
    if (val === null) return null;
    const idx = parseInt(val, 10);
    return isNaN(idx) ? null : idx;
}

/**
 * Saves the current axis settings object (tag → value map) to sessionStorage.
 * @param {Object} settings - e.g. { wght: 400, wdth: 100 }
 */
export function saveAxisSettings(settings) {
    if (settings === null || settings === undefined) {
        sessionStorage.removeItem(AXIS_KEY);
        return;
    }
    try {
        sessionStorage.setItem(AXIS_KEY, JSON.stringify(settings));
    } catch (e) {
        // Ignore storage errors
    }
}

/**
 * Retrieves the saved axis settings object, or null if none saved.
 * @returns {Object|null}
 */
export function getSavedAxisSettings() {
    try {
        const val = sessionStorage.getItem(AXIS_KEY);
        return val ? JSON.parse(val) : null;
    } catch (e) {
        return null;
    }
}

/**
 * Records which control was most recently changed.
 * @param {'instance'|'sliders'} source
 */
export function saveLastChanged(source) {
    if (source === null || source === undefined) {
        sessionStorage.removeItem(LAST_CHANGED_KEY);
    } else {
        sessionStorage.setItem(LAST_CHANGED_KEY, source);
    }
}

/**
 * Returns which control was most recently changed, or null if nothing was recorded.
 * @returns {'instance'|'sliders'|null}
 */
export function getSavedLastChanged() {
    return sessionStorage.getItem(LAST_CHANGED_KEY) || null;
}

/**
 * Saves a font buffer and filename to sessionStorage.
 * Silently skips if the font is too large or storage is unavailable.
 * @param {ArrayBuffer} buffer
 * @param {string} filename
 */
export function saveFont(buffer, filename) {
    try {
        const bytes = new Uint8Array(buffer);
        // Convert binary to base64 in chunks to avoid stack overflow on large fonts
        const chunkSize = 0x8000;
        let binary = '';
        for (let i = 0; i < bytes.length; i += chunkSize) {
            binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
        }
        const b64 = btoa(binary);
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ b64, filename: filename || '' }));
    } catch (e) {
        // Storage full or unavailable — fail silently
        console.warn('Could not save font to session:', e.message);
    }
}

/**
 * Retrieves the saved font from sessionStorage.
 * @returns {{ buffer: ArrayBuffer, filename: string } | null}
 */
export function getSavedFont() {
    try {
        const item = sessionStorage.getItem(STORAGE_KEY);
        if (!item) return null;
        const { b64, filename } = JSON.parse(item);
        const binary = atob(b64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return { buffer: bytes.buffer, filename };
    } catch (e) {
        return null;
    }
}
/**
 * Saves HyperFlip UI state (toggle settings + glyph position) to sessionStorage.
 * Pass null to clear any saved state.
 * @param {{ isRandomOrder: boolean, isMetricsVisible: boolean, isGlyphInfoVisible: boolean, glyphIndex: number } | null} state
 */
export function saveHyperFlipState(state) {
    if (state === null || state === undefined) {
        sessionStorage.removeItem(HYPERFLIP_KEY);
        return;
    }
    try {
        sessionStorage.setItem(HYPERFLIP_KEY, JSON.stringify(state));
    } catch (e) {
        // Ignore storage errors
    }
}

/**
 * Retrieves the saved HyperFlip UI state, or null if none saved.
 * @returns {{ isRandomOrder: boolean, isMetricsVisible: boolean, isGlyphInfoVisible: boolean, glyphIndex: number } | null}
 */
export function getSavedHyperFlipState() {
    try {
        const val = sessionStorage.getItem(HYPERFLIP_KEY);
        return val ? JSON.parse(val) : null;
    } catch (e) {
        return null;
    }
}