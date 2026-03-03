/** Persists the selected named-instance index. Pass null to clear. */
export declare function saveInstanceIndex(index: number | null): void;
/** Returns the saved named-instance index, or null when none is stored. */
export declare function getSavedInstanceIndex(): number | null;
/** Persists axis settings (tag → value). Pass null to clear. */
export declare function saveAxisSettings(settings: Record<string, number> | null): void;
/** Returns the saved axis settings, or null when none are stored. */
export declare function getSavedAxisSettings(): Record<string, number> | null;
export type LastChangedSource = 'instance' | 'sliders';
/** Records which control was most recently changed. Pass null to clear. */
export declare function saveLastChanged(source: LastChangedSource | null): void;
/** Returns the most-recently-changed source, or null. */
export declare function getSavedLastChanged(): LastChangedSource | null;
export interface SavedFont {
    buffer: ArrayBuffer;
    filename: string;
}
/**
 * Encodes the font as base-64 and persists it in sessionStorage.
 * Silently skips on quota errors.
 */
export declare function saveFont(buffer: ArrayBuffer, filename: string): void;
/** Decodes and returns the saved font, or null when none is stored. */
export declare function getSavedFont(): SavedFont | null;
export interface HyperFlipState {
    isRandomOrder: boolean;
    isMetricsVisible: boolean;
    isGlyphInfoVisible: boolean;
    glyphIndex: number;
    fontSize: number | null;
    verticalPosition: number | null;
    animationDelay: number | null;
}
/** Persists HyperFlip UI state. Pass null to clear. */
export declare function saveHyperFlipState(state: HyperFlipState | null): void;
/** Returns the saved HyperFlip state, or null. */
export declare function getSavedHyperFlipState(): HyperFlipState | null;
//# sourceMappingURL=FontSession.d.ts.map