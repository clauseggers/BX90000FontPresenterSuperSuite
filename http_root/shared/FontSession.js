// =============================================================================
// shared/FontSession.js
// Persists the loaded font binary across page navigations via sessionStorage.
// =============================================================================

const STORAGE_KEY = 'bx90000_font';
const INSTANCE_KEY = 'bx90000_instance';

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
