// =============================================================================
// shared/FontSession.ts
// Persists the loaded font binary and UI state across page navigations via
// sessionStorage.
// =============================================================================
const STORAGE_KEY = 'bx90000_font';
const INSTANCE_KEY = 'bx90000_instance';
const AXIS_KEY = 'bx90000_axes';
const LAST_CHANGED_KEY = 'bx90000_last_changed';
const HYPERFLIP_KEY = 'bx90000_hyperflip';
// ---------------------------------------------------------------------------
// Named instance index
// ---------------------------------------------------------------------------
/** Persists the selected named-instance index. Pass null to clear. */
export function saveInstanceIndex(index) {
    if (index === null || index === undefined) {
        sessionStorage.removeItem(INSTANCE_KEY);
    }
    else {
        sessionStorage.setItem(INSTANCE_KEY, String(index));
    }
}
/** Returns the saved named-instance index, or null when none is stored. */
export function getSavedInstanceIndex() {
    const val = sessionStorage.getItem(INSTANCE_KEY);
    if (val === null)
        return null;
    const idx = parseInt(val, 10);
    return isNaN(idx) ? null : idx;
}
// ---------------------------------------------------------------------------
// Axis settings
// ---------------------------------------------------------------------------
/** Persists axis settings (tag → value). Pass null to clear. */
export function saveAxisSettings(settings) {
    if (settings === null || settings === undefined) {
        sessionStorage.removeItem(AXIS_KEY);
        return;
    }
    try {
        sessionStorage.setItem(AXIS_KEY, JSON.stringify(settings));
    }
    catch {
        // Storage full — fail silently
    }
}
/** Returns the saved axis settings, or null when none are stored. */
export function getSavedAxisSettings() {
    try {
        const val = sessionStorage.getItem(AXIS_KEY);
        return val !== null ? JSON.parse(val) : null;
    }
    catch {
        return null;
    }
}
/** Records which control was most recently changed. Pass null to clear. */
export function saveLastChanged(source) {
    if (source === null || source === undefined) {
        sessionStorage.removeItem(LAST_CHANGED_KEY);
    }
    else {
        sessionStorage.setItem(LAST_CHANGED_KEY, source);
    }
}
/** Returns the most-recently-changed source, or null. */
export function getSavedLastChanged() {
    const val = sessionStorage.getItem(LAST_CHANGED_KEY);
    if (val === 'instance' || val === 'sliders')
        return val;
    return null;
}
/**
 * Encodes the font as base-64 and persists it in sessionStorage.
 * Silently skips on quota errors.
 */
export function saveFont(buffer, filename) {
    try {
        const bytes = new Uint8Array(buffer);
        const chunk = 0x8000;
        let binary = '';
        for (let i = 0; i < bytes.length; i += chunk) {
            binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
        }
        const b64 = btoa(binary);
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ b64, filename: filename ?? '' }));
    }
    catch (err) {
        console.warn('Could not save font to session:', err.message);
    }
}
/** Decodes and returns the saved font, or null when none is stored. */
export function getSavedFont() {
    try {
        const item = sessionStorage.getItem(STORAGE_KEY);
        if (!item)
            return null;
        const { b64, filename } = JSON.parse(item);
        const binary = atob(b64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return { buffer: bytes.buffer, filename };
    }
    catch {
        return null;
    }
}
/** Persists HyperFlip UI state. Pass null to clear. */
export function saveHyperFlipState(state) {
    if (state === null || state === undefined) {
        sessionStorage.removeItem(HYPERFLIP_KEY);
        return;
    }
    try {
        sessionStorage.setItem(HYPERFLIP_KEY, JSON.stringify(state));
    }
    catch {
        // Ignore
    }
}
/** Returns the saved HyperFlip state, or null. */
export function getSavedHyperFlipState() {
    try {
        const val = sessionStorage.getItem(HYPERFLIP_KEY);
        return val !== null ? JSON.parse(val) : null;
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=FontSession.js.map