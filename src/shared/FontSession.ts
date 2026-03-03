// =============================================================================
// shared/FontSession.ts
// Persists the loaded font binary and UI state across page navigations via
// sessionStorage.
// =============================================================================

const STORAGE_KEY       = 'bx90000_font';
const INSTANCE_KEY      = 'bx90000_instance';
const AXIS_KEY          = 'bx90000_axes';
const LAST_CHANGED_KEY  = 'bx90000_last_changed';
const HYPERFLIP_KEY     = 'bx90000_hyperflip';

// ---------------------------------------------------------------------------
// Named instance index
// ---------------------------------------------------------------------------

/** Persists the selected named-instance index. Pass null to clear. */
export function saveInstanceIndex(index: number | null): void {
  if (index === null || index === undefined) {
    sessionStorage.removeItem(INSTANCE_KEY);
  } else {
    sessionStorage.setItem(INSTANCE_KEY, String(index));
  }
}

/** Returns the saved named-instance index, or null when none is stored. */
export function getSavedInstanceIndex(): number | null {
  const val = sessionStorage.getItem(INSTANCE_KEY);
  if (val === null) return null;
  const idx = parseInt(val, 10);
  return isNaN(idx) ? null : idx;
}

// ---------------------------------------------------------------------------
// Axis settings
// ---------------------------------------------------------------------------

/** Persists axis settings (tag → value). Pass null to clear. */
export function saveAxisSettings(settings: Record<string, number> | null): void {
  if (settings === null || settings === undefined) {
    sessionStorage.removeItem(AXIS_KEY);
    return;
  }
  try {
    sessionStorage.setItem(AXIS_KEY, JSON.stringify(settings));
  } catch {
    // Storage full — fail silently
  }
}

/** Returns the saved axis settings, or null when none are stored. */
export function getSavedAxisSettings(): Record<string, number> | null {
  try {
    const val = sessionStorage.getItem(AXIS_KEY);
    return val !== null ? (JSON.parse(val) as Record<string, number>) : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Last-changed source
// ---------------------------------------------------------------------------

export type LastChangedSource = 'instance' | 'sliders';

/** Records which control was most recently changed. Pass null to clear. */
export function saveLastChanged(source: LastChangedSource | null): void {
  if (source === null || source === undefined) {
    sessionStorage.removeItem(LAST_CHANGED_KEY);
  } else {
    sessionStorage.setItem(LAST_CHANGED_KEY, source);
  }
}

/** Returns the most-recently-changed source, or null. */
export function getSavedLastChanged(): LastChangedSource | null {
  const val = sessionStorage.getItem(LAST_CHANGED_KEY);
  if (val === 'instance' || val === 'sliders') return val;
  return null;
}

// ---------------------------------------------------------------------------
// Font binary
// ---------------------------------------------------------------------------

export interface SavedFont {
  buffer:   ArrayBuffer;
  filename: string;
}

/**
 * Encodes the font as base-64 and persists it in sessionStorage.
 * Silently skips on quota errors.
 */
export function saveFont(buffer: ArrayBuffer, filename: string): void {
  try {
    const bytes    = new Uint8Array(buffer);
    const chunk    = 0x8000;
    let   binary   = '';
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    const b64 = btoa(binary);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ b64, filename: filename ?? '' }));
  } catch (err) {
    console.warn('Could not save font to session:', (err as Error).message);
  }
}

/** Decodes and returns the saved font, or null when none is stored. */
export function getSavedFont(): SavedFont | null {
  try {
    const item = sessionStorage.getItem(STORAGE_KEY);
    if (!item) return null;
    const { b64, filename } = JSON.parse(item) as { b64: string; filename: string };
    const binary = atob(b64);
    const bytes  = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return { buffer: bytes.buffer, filename };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// HyperFlip UI state
// ---------------------------------------------------------------------------

export interface HyperFlipState {
  isRandomOrder:      boolean;
  isMetricsVisible:   boolean;
  isGlyphInfoVisible: boolean;
  glyphIndex:         number;
  fontSize:           number | null;
  verticalPosition:   number | null;
  animationDelay:     number | null;
}

/** Persists HyperFlip UI state. Pass null to clear. */
export function saveHyperFlipState(state: HyperFlipState | null): void {
  if (state === null || state === undefined) {
    sessionStorage.removeItem(HYPERFLIP_KEY);
    return;
  }
  try {
    sessionStorage.setItem(HYPERFLIP_KEY, JSON.stringify(state));
  } catch {
    // Ignore
  }
}

/** Returns the saved HyperFlip state, or null. */
export function getSavedHyperFlipState(): HyperFlipState | null {
  try {
    const val = sessionStorage.getItem(HYPERFLIP_KEY);
    return val !== null ? (JSON.parse(val) as HyperFlipState) : null;
  } catch {
    return null;
  }
}
